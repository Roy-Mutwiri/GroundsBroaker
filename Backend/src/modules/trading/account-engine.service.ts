import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { TradingService } from './trading.service';

const TICK_MS = 1000; // evaluate accounts at ~1 Hz
const SWAP_ROLLOVER_UTC_HOUR = 22; // apply overnight swaps at 22:00 UTC

/**
 * Drives the server-side margin loop: every ~1s it re-evaluates each account with open
 * positions (pending-order triggers, SL/TP, stop-out) and pushes a snapshot. Also runs the
 * daily swap rollover once at 22:00 UTC.
 */
@Injectable()
export class AccountEngine implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger('AccountEngine');
  private timer: NodeJS.Timeout | null = null;
  private running = false;
  private lastSwapDay = -1;

  constructor(private readonly trading: TradingService) {}

  onModuleInit(): void {
    this.timer = setInterval(() => void this.tick(), TICK_MS);
    this.logger.log(`Margin loop started (~${TICK_MS}ms)`);
  }

  onModuleDestroy(): void {
    if (this.timer) clearInterval(this.timer);
  }

  private async tick(): Promise<void> {
    if (this.running) return; // never overlap runs
    this.running = true;
    try {
      const ids = await this.trading.listOpenAccountIds();
      for (const id of ids) {
        const acc = await this.trading.getAccount(id);
        if (acc && acc.status === 'ACTIVE') await this.trading.evaluate(acc);
      }
      await this.maybeRollSwaps();
    } catch (e) {
      this.logger.warn(`tick: ${(e as Error).message}`);
    } finally {
      this.running = false;
    }
  }

  private async maybeRollSwaps(): Promise<void> {
    const now = new Date();
    const day = now.getUTCDate();
    if (now.getUTCHours() === SWAP_ROLLOVER_UTC_HOUR && this.lastSwapDay !== day) {
      this.lastSwapDay = day;
      await this.trading.applySwaps();
    }
  }
}
