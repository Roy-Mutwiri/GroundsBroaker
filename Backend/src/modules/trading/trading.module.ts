import { Module } from '@nestjs/common';
import { MarketDataModule } from '../market-data/market-data.module';
import { AuthModule } from '../auth/auth.module';
import { TradingService } from './trading.service';
import { AccountEngine } from './account-engine.service';
import { TradingController } from './trading.controller';

@Module({
  imports: [MarketDataModule, AuthModule],
  controllers: [TradingController],
  providers: [TradingService, AccountEngine],
  exports: [TradingService],
})
export class TradingModule {}
