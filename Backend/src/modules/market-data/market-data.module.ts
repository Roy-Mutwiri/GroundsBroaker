import { Module } from '@nestjs/common';
import { MarketDataService } from './market-data.service';
import { CandleService } from './candle.service';
import { InstrumentsController } from './instruments.controller';
import { CandlesController } from './candles.controller';

@Module({
  controllers: [InstrumentsController, CandlesController],
  providers: [MarketDataService, CandleService],
  exports: [MarketDataService, CandleService],
})
export class MarketDataModule {}
