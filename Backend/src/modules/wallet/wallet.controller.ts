import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { ZodValidationPipe } from '../../common/zod/zod-validation.pipe';
import { SessionGuard } from '../auth/session.guard';
import { CurrentUser } from '../auth/decorators';
import { AuthedUser } from '../auth/auth.types';
import { WalletService } from './wallet.service';
import { transferSchema, TransferDto } from '../payments/dto';

@Controller('wallet')
@UseGuards(SessionGuard)
export class WalletController {
  constructor(private readonly wallet: WalletService) {}

  @Get('summary')
  summary(@CurrentUser() user: AuthedUser) {
    return this.wallet.summary(user.id);
  }

  @Get('statement')
  statement(@CurrentUser() user: AuthedUser) {
    return this.wallet.statement(user.id);
  }

  @Post('transfer')
  transfer(@CurrentUser() user: AuthedUser, @Body(new ZodValidationPipe(transferSchema)) dto: TransferDto) {
    return this.wallet.transfer(user.id, dto.accountId, dto.direction, dto.amount);
  }
}
