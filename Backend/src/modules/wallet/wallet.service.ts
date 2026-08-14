import { BadRequestException, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';
import { D, Decimal, money } from '../../common/money/decimal';
import { LedgerService, tradingAccountCode, walletCode } from '../ledger/ledger.service';
import { AuditService } from '../audit/audit.service';

export type TransferDirection = 'TO_ACCOUNT' | 'TO_WALLET';

@Injectable()
export class WalletService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly ledger: LedgerService,
    private readonly audit: AuditService,
  ) {}

  async walletBalance(userId: string): Promise<Decimal> {
    return this.ledger.balance(walletCode(userId));
  }

  /** Wallet + per-account balances for the portal wallet summary. */
  async summary(userId: string) {
    const accounts = await this.prisma.tradingAccount.findMany({
      where: { userId },
      orderBy: { createdAt: 'asc' },
      select: { id: true, login: true, type: true, currency: true, leverage: true },
    });
    const accountBalances = await Promise.all(
      accounts.map(async (a) => ({
        ...a,
        balance: money(await this.ledger.balance(tradingAccountCode(userId, a.id))).toNumber(),
      })),
    );
    return {
      wallet: { currency: 'USD', balance: money(await this.walletBalance(userId)).toNumber() },
      accounts: accountBalances,
    };
  }

  /** Move funds between the wallet and a trading account (internal, free, instant). */
  async transfer(userId: string, accountId: string, direction: TransferDirection, amount: number) {
    const amt = D(amount);
    if (amt.lte(0)) throw new BadRequestException({ code: 'invalid_amount', message: 'Enter a positive amount.' });

    const account = await this.prisma.tradingAccount.findFirst({ where: { id: accountId, userId } });
    if (!account) throw new BadRequestException({ code: 'account_not_found', message: 'Account not found.' });

    const wCode = walletCode(userId);
    const aCode = tradingAccountCode(userId, accountId);
    const rounded = money(amt);

    if (direction === 'TO_ACCOUNT') {
      const bal = await this.ledger.balance(wCode);
      if (bal.lt(rounded)) throw new BadRequestException({ code: 'insufficient_wallet', message: 'Not enough wallet balance.' });
      await this.ledger.post({
        description: 'Transfer wallet → trading account',
        reference: `xfer:${accountId}`,
        lines: [
          { code: wCode, debit: rounded.toString() },
          { code: aCode, credit: rounded.toString() },
        ],
      });
    } else {
      const bal = await this.ledger.balance(aCode);
      if (bal.lt(rounded)) throw new BadRequestException({ code: 'insufficient_account', message: 'Not enough account balance.' });
      await this.ledger.post({
        description: 'Transfer trading account → wallet',
        reference: `xfer:${accountId}`,
        lines: [
          { code: aCode, debit: rounded.toString() },
          { code: wCode, credit: rounded.toString() },
        ],
      });
    }
    await this.audit.write({ actorId: userId, action: 'wallet.transfer', metadata: { accountId, direction, amount } });
    return this.summary(userId);
  }

  /** Unified ledger statement across the client's wallet + trading accounts (deposits, transfers, trade P&L, withdrawals). */
  async statement(userId: string, limit = 200) {
    const accounts = await this.prisma.ledgerAccount.findMany({
      where: { code: { startsWith: `client:${userId}:` } },
      select: { id: true, code: true },
    });
    const codeById = new Map(accounts.map((a) => [a.id, a.code]));
    const lines = await this.prisma.journalLine.findMany({
      where: { accountId: { in: accounts.map((a) => a.id) } },
      include: { entry: { select: { description: true, reference: true, createdAt: true } } },
      orderBy: { entry: { createdAt: 'desc' } },
      take: limit,
    });
    return lines.map((l) => {
      const signed = D(l.credit.toString()).minus(l.debit.toString()); // + = money in
      const code = codeById.get(l.accountId) ?? '';
      return {
        id: l.id,
        date: l.entry.createdAt,
        description: l.entry.description,
        reference: l.entry.reference,
        target: code.endsWith(':wallet') ? 'Wallet' : 'Account',
        amount: money(signed).toNumber(),
        currency: l.currency,
      };
    });
  }

  // ── used by PaymentsService (within its transactions) ──
  async creditWalletFromDeposit(userId: string, amountUsd: Decimal, receipt: string, tx: Prisma.TransactionClient): Promise<void> {
    await this.ledger.post(
      {
        description: 'M-Pesa deposit',
        reference: receipt,
        lines: [
          { code: 'psp:mpesa:clearing', debit: money(amountUsd, 10).toString() },
          { code: walletCode(userId), credit: money(amountUsd, 10).toString() },
        ],
      },
      tx,
    );
  }

  async lockForWithdrawal(userId: string, amountUsd: Decimal, ref: string, tx: Prisma.TransactionClient): Promise<void> {
    await this.ledger.post(
      {
        description: 'Withdrawal requested (funds locked)',
        reference: ref,
        lines: [
          { code: walletCode(userId), debit: money(amountUsd, 10).toString() },
          { code: 'payable:withdrawals', credit: money(amountUsd, 10).toString() },
        ],
      },
      tx,
    );
  }
}
