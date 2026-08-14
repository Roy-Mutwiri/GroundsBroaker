import { Controller, Get } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/** Public metadata: health + the demo-mode flags the frontend uses to render banners. */
@Controller()
export class MetaController {
  constructor(private readonly config: ConfigService) {}

  @Get('health')
  health() {
    return { status: 'ok', ts: new Date().toISOString() };
  }

  @Get('config')
  publicConfig() {
    return {
      brand: 'Aurum Markets',
      liveTrading: this.config.get<boolean>('LIVE_TRADING') ?? false,
      livePayments: this.config.get<boolean>('LIVE_PAYMENTS') ?? false,
      demoMode: !(this.config.get<boolean>('LIVE_TRADING') ?? false),
    };
  }
}
