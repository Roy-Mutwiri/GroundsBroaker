import { Module } from '@nestjs/common';
import { TradingModule } from '../modules/trading/trading.module';
import { QuotesGateway } from './quotes.gateway';

@Module({
  imports: [TradingModule],
  providers: [QuotesGateway],
  exports: [QuotesGateway],
})
export class GatewayModule {}
