import { Controller, Get, NotFoundException, Param } from '@nestjs/common';
import { Instrument } from '@prisma/client';
import { MarketDataService } from './market-data.service';

function toDto(i: Instrument) {
  return {
    symbol: i.symbol,
    displayName: i.displayName,
    category: i.category,
    digits: i.digits,
    contractSize: i.contractSize.toNumber(),
    pipSize: i.pipSize.toNumber(),
    pointSize: i.pointSize.toNumber(),
    minLot: i.minLot.toNumber(),
    maxLot: i.maxLot.toNumber(),
    lotStep: i.lotStep.toNumber(),
    leverageCap: i.leverageCap,
    baseCurrency: i.baseCurrency,
    quoteCurrency: i.quoteCurrency,
    spreadMarkupPoints: i.spreadMarkupPoints,
    swapLong: i.swapLong.toNumber(),
    swapShort: i.swapShort.toNumber(),
  };
}

@Controller('instruments')
export class InstrumentsController {
  constructor(private readonly market: MarketDataService) {}

  @Get()
  list() {
    return this.market.listInstruments().map(toDto);
  }

  @Get(':symbol')
  one(@Param('symbol') symbol: string) {
    const found = this.market.listInstruments().find((i) => i.symbol === symbol.toUpperCase());
    if (!found) throw new NotFoundException({ code: 'instrument_not_found', message: 'Unknown instrument.' });
    return toDto(found);
  }
}
