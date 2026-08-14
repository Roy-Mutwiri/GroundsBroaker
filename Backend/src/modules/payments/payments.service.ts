import { BadRequestException, ForbiddenException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Prisma } from '@prisma/client';
import { randomBytes } from 'crypto';
import { PrismaService } from '../../common/prisma/prisma.service';
import { D, money } from '../../common/money/decimal';
import { WalletService } from '../wallet/wallet.service';
import { AuditService } from '../audit/audit.service';
import { PaymentProvider, StkCallback } from './provider';
import { SimulatedMpesaProvider } from './simulated-mpesa.provider';
import { MpesaDarajaProvider } from './mpesa-daraja.provider';
import { DepositDto, WithdrawDto } from './dto';

const MIN_WITHDRAW_USD = 5;

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger('Payments');
  private readonly provider: PaymentProvider;
  private readonly rate: number;

  constructor(
    private readonly prisma: PrismaService,
    private readonly wallet: WalletService,
    private readonly audit: AuditService,
    private readonly config: ConfigService,
  ) {
    this.rate = config.get<number>('USD_KES_RATE', 130);
    const live = config.get<boolean>('LIVE_PAYMENTS');
    const hasKeys = !!config.get<string>('MPESA_CONSUMER_KEY');
    this.provider = live && hasKeys ? new MpesaDarajaProvider(config) : new SimulatedMpesaProvider();
    this.logger.log(`Payments provider: ${this.provider.name}`);
  }

  get providerName(): string {
    return this.provider.name;
  }

  // ── Deposit (STK Push) ──
  async initiateDeposit(userId: string, dto: DepositDto) {
    const deposit = await this.prisma.deposit.create({
      data: { userId, method: 'MPESA', status: 'INITIATED', amount: new Prisma.Decimal(dto.amountKes), currency: 'KES' },
    });
    const { providerRef, customerMessage } = await this.provider.initiateDeposit({
      depositId: deposit.id,
      amountKes: dto.amountKes,
      phone: dto.phone,
      accountRef: deposit.id.slice(0, 12),
    });
    await this.prisma.deposit.update({ where: { id: deposit.id }, data: { providerRef, status: 'PENDING' } });
    await this.audit.write({ actorId: userId, action: 'payments.deposit.initiate', targetId: deposit.id, metadata: { amountKes: dto.amountKes } });

    // Demo: self-deliver a successful callback shortly after (as if the PIN was entered).
    if (this.provider.simulated) {
      setTimeout(() => {
        this.handleStkCallback({
          checkoutRequestId: providerRef,
          resultCode: 0,
          resultDesc: 'The service request is processed successfully.',
          amount: dto.amountKes,
          mpesaReceipt: 'SIM' + randomBytes(4).toString('hex').toUpperCase(),
          phone: dto.phone,
        }).catch((e) => this.logger.error(`simulated callback: ${(e as Error).message}`));
      }, 4000);
    }

    return { depositId: deposit.id, status: 'PENDING' as const, providerRef, customerMessage, usdEquivalent: money(D(dto.amountKes).div(this.rate)).toNumber() };
  }

  /** Idempotent STK callback handler. Same callback ×N → exactly one credit (payment_events unique key). */
  async handleStkCallback(cb: StkCallback): Promise<{ result: string }> {
    const existing = await this.prisma.paymentEvent.findUnique({ where: { idempotencyKey: cb.checkoutRequestId } });
    if (existing) return { result: 'duplicate' };

    const deposit = await this.prisma.deposit.findUnique({ where: { providerRef: cb.checkoutRequestId } });
    if (!deposit) {
      await this.recordEvent(cb, null);
      return { result: 'unknown_deposit' };
    }
    if (deposit.status === 'CONFIRMED') return { result: 'already_confirmed' };

    if (cb.resultCode !== 0) {
      await this.prisma.$transaction([
        this.prisma.paymentEvent.create({ data: this.eventData(cb, new Date()) }),
        this.prisma.deposit.update({ where: { id: deposit.id }, data: { status: 'FAILED' } }),
      ]);
      return { result: 'failed' };
    }

    const usd = D(deposit.amount.toString()).div(this.rate);
    const receipt = cb.mpesaReceipt ?? cb.checkoutRequestId;
    try {
      await this.prisma.$transaction(async (tx) => {
        // Unique idempotencyKey guards against concurrent/duplicate callbacks.
        await tx.paymentEvent.create({ data: this.eventData(cb, new Date()) });
        await tx.deposit.update({ where: { id: deposit.id }, data: { status: 'CONFIRMED', receipt } });
        await this.wallet.creditWalletFromDeposit(deposit.userId, usd, receipt, tx);
        await tx.notification.create({
          data: { userId: deposit.userId, title: 'Deposit received', body: `KES ${deposit.amount} confirmed (~${money(usd)} USD).` },
        });
      });
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') return { result: 'duplicate' };
      throw e;
    }
    await this.audit.write({ actorId: deposit.userId, action: 'payments.deposit.confirm', targetId: deposit.id, metadata: { receipt, usd: money(usd).toNumber() } });
    return { result: 'confirmed' };
  }

  private eventData(cb: StkCallback, processedAt: Date | null): Prisma.PaymentEventCreateInput {
    return {
      provider: 'mpesa',
      kind: 'stk_callback',
      idempotencyKey: cb.checkoutRequestId,
      payload: cb as unknown as Prisma.InputJsonValue,
      processedAt,
    };
  }

  private async recordEvent(cb: StkCallback, processedAt: Date | null): Promise<void> {
    try {
      await this.prisma.paymentEvent.create({ data: this.eventData(cb, processedAt) });
    } catch {
      /* duplicate */
    }
  }

  async getDeposit(userId: string, depositId: string) {
    const deposit = await this.prisma.deposit.findFirst({ where: { id: depositId, userId } });
    if (!deposit) throw new NotFoundException({ code: 'deposit_not_found', message: 'Deposit not found.' });
    return {
      id: deposit.id,
      status: deposit.status,
      amountKes: Number(deposit.amount),
      receipt: deposit.receipt,
      createdAt: deposit.createdAt,
    };
  }

  async listDeposits(userId: string) {
    return this.prisma.deposit.findMany({ where: { userId }, orderBy: { createdAt: 'desc' }, take: 100 });
  }

  // ── Withdrawal (request → locks funds; admin approval + payout in Phase 5) ──
  async requestWithdrawal(userId: string, dto: WithdrawDto) {
    const kyc = await this.prisma.kycProfile.findUnique({ where: { userId } });
    if (!kyc || kyc.status !== 'APPROVED' || kyc.tier < 1) {
      throw new ForbiddenException({ code: 'kyc_required', message: 'Complete identity verification before withdrawing.' });
    }
    const amt = D(dto.amountUsd);
    if (amt.lt(MIN_WITHDRAW_USD)) throw new BadRequestException({ code: 'below_minimum', message: `Minimum withdrawal is $${MIN_WITHDRAW_USD}.` });

    const balance = await this.wallet.walletBalance(userId);
    if (balance.lt(amt)) throw new BadRequestException({ code: 'insufficient_wallet', message: 'Not enough wallet balance.' });

    const masked = dto.phone.replace(/(\d{4})\d{4}(\d{2})/, '$1****$2');
    const withdrawal = await this.prisma.$transaction(async (tx) => {
      const w = await tx.withdrawal.create({
        data: {
          userId,
          method: 'MPESA',
          status: 'REQUESTED',
          amount: money(amt, 10).toString(),
          fee: '0',
          currency: 'USD',
          destination: masked,
          requestedBy: userId,
        },
      });
      // Lock funds out of the wallet into payable:withdrawals (return-to-source: M-Pesa in → M-Pesa out).
      await this.wallet.lockForWithdrawal(userId, amt, `wd:${w.id}`, tx);
      return w;
    });
    await this.audit.write({ actorId: userId, action: 'payments.withdrawal.request', targetId: withdrawal.id, metadata: { amountUsd: dto.amountUsd } });
    return { id: withdrawal.id, status: withdrawal.status, amountUsd: dto.amountUsd, kesEquivalent: money(amt.mul(this.rate)).toNumber() };
  }

  async listWithdrawals(userId: string) {
    return this.prisma.withdrawal.findMany({ where: { userId }, orderBy: { createdAt: 'desc' }, take: 100 });
  }
}
