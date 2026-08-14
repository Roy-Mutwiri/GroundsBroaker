import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { ZodValidationPipe } from '../../common/zod/zod-validation.pipe';
import { SessionGuard } from '../auth/session.guard';
import { CurrentUser } from '../auth/decorators';
import { AuthedUser } from '../auth/auth.types';
import { PaymentsService } from './payments.service';
import { StkCallback } from './provider';
import { DepositDto, depositSchema, WithdrawDto, withdrawSchema } from './dto';

@Controller('payments')
export class PaymentsController {
  constructor(private readonly payments: PaymentsService) {}

  @Post('deposit')
  @UseGuards(SessionGuard)
  deposit(@CurrentUser() user: AuthedUser, @Body(new ZodValidationPipe(depositSchema)) dto: DepositDto) {
    return this.payments.initiateDeposit(user.id, dto);
  }

  @Get('deposit/:id')
  @UseGuards(SessionGuard)
  depositStatus(@CurrentUser() user: AuthedUser, @Param('id') id: string) {
    return this.payments.getDeposit(user.id, id);
  }

  @Get('deposits')
  @UseGuards(SessionGuard)
  deposits(@CurrentUser() user: AuthedUser) {
    return this.payments.listDeposits(user.id);
  }

  @Post('withdraw')
  @UseGuards(SessionGuard)
  withdraw(@CurrentUser() user: AuthedUser, @Body(new ZodValidationPipe(withdrawSchema)) dto: WithdrawDto) {
    return this.payments.requestWithdrawal(user.id, dto);
  }

  @Get('withdrawals')
  @UseGuards(SessionGuard)
  withdrawals(@CurrentUser() user: AuthedUser) {
    return this.payments.listWithdrawals(user.id);
  }

  /**
   * PUBLIC M-Pesa STK callback (called by Safaricom Daraja). Parses the Daraja envelope
   * and hands it to the idempotent handler. In demo mode the simulated provider calls the
   * handler internally instead.
   */
  @Post('mpesa/callback')
  async mpesaCallback(@Body() body: unknown) {
    const cb = parseDarajaStkCallback(body);
    if (!cb) return { ResultCode: 0, ResultDesc: 'Ignored' };
    await this.payments.handleStkCallback(cb);
    return { ResultCode: 0, ResultDesc: 'Accepted' };
  }
}

function parseDarajaStkCallback(body: unknown): StkCallback | null {
  const b = body as { Body?: { stkCallback?: Record<string, unknown> } };
  const cb = b?.Body?.stkCallback;
  if (!cb || typeof cb.CheckoutRequestID !== 'string') return null;
  const items = ((cb.CallbackMetadata as { Item?: { Name: string; Value: unknown }[] } | undefined)?.Item ?? []);
  const pick = (name: string) => items.find((i) => i.Name === name)?.Value;
  return {
    checkoutRequestId: cb.CheckoutRequestID,
    resultCode: Number(cb.ResultCode ?? 1),
    resultDesc: String(cb.ResultDesc ?? ''),
    amount: pick('Amount') !== undefined ? Number(pick('Amount')) : undefined,
    mpesaReceipt: pick('MpesaReceiptNumber') !== undefined ? String(pick('MpesaReceiptNumber')) : undefined,
    phone: pick('PhoneNumber') !== undefined ? String(pick('PhoneNumber')) : undefined,
  };
}
