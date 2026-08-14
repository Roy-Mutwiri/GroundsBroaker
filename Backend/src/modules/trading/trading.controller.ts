import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { ZodValidationPipe } from '../../common/zod/zod-validation.pipe';
import { SessionGuard } from '../auth/session.guard';
import { CurrentUser } from '../auth/decorators';
import { AuthedUser } from '../auth/auth.types';
import { TradingService } from './trading.service';
import {
  closePositionSchema,
  ClosePositionDto,
  modifyPositionSchema,
  ModifyPositionDto,
  placeOrderSchema,
  PlaceOrderDto,
} from './dto';

@Controller('trading')
@UseGuards(SessionGuard)
export class TradingController {
  constructor(
    private readonly trading: TradingService,
    private readonly prisma: PrismaService,
  ) {}

  @Get('accounts')
  async accounts(@CurrentUser() user: AuthedUser) {
    const accounts = await this.prisma.tradingAccount.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'asc' },
      select: { id: true, login: true, type: true, currency: true, leverage: true, status: true },
    });
    return accounts;
  }

  @Get('accounts/:id/snapshot')
  snapshot(@CurrentUser() user: AuthedUser, @Param('id') id: string) {
    return this.trading.snapshot(user.id, id);
  }

  @Get('accounts/:id/positions')
  positions(@CurrentUser() user: AuthedUser, @Param('id') id: string) {
    return this.trading.listPositions(user.id, id);
  }

  @Get('accounts/:id/history')
  history(@CurrentUser() user: AuthedUser, @Param('id') id: string) {
    return this.trading.history(user.id, id);
  }

  @Get('accounts/:id/preview')
  preview(
    @CurrentUser() user: AuthedUser,
    @Param('id') id: string,
    @Query('symbol') symbol: string,
    @Query('lots') lots: string,
  ) {
    return this.trading.preview(user.id, id, symbol, Number(lots));
  }

  @Post('orders')
  place(@CurrentUser() user: AuthedUser, @Body(new ZodValidationPipe(placeOrderSchema)) dto: PlaceOrderDto) {
    return this.trading.placeOrder(user.id, dto);
  }

  @Post('positions/:id/close')
  close(
    @CurrentUser() user: AuthedUser,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(closePositionSchema)) dto: ClosePositionDto,
    @Query('accountId') accountId: string,
  ) {
    return this.trading.closePosition(user.id, accountId, id, dto.lots);
  }

  @Patch('positions/:id')
  modify(
    @CurrentUser() user: AuthedUser,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(modifyPositionSchema)) dto: ModifyPositionDto,
    @Query('accountId') accountId: string,
  ) {
    return this.trading.modifyPosition(user.id, accountId, id, dto.stopLoss, dto.takeProfit);
  }
}
