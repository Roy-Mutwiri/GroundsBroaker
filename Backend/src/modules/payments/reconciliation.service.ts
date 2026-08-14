import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';
import { LedgerService } from '../ledger/ledger.service';
import { AuditService } from '../audit/audit.service';

export interface ReconReport {
  at: string;
  invariant: { balanced: boolean; debits: string; credits: string };
  confirmedDeposits: number;
  unmatchedDeposits: number;
}

const INTERVAL_MS = 60 * 60 * 1000; // hourly

/**
 * Daily/periodic reconciliation: verifies the global ledger invariant (Σdebits==Σcredits)
 * and that every CONFIRMED deposit has a matching balanced journal entry. Mismatches are
 * audited (and surfaced to the admin backoffice in Phase 5).
 */
@Injectable()
export class ReconciliationService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger('Reconciliation');
  private timer: NodeJS.Timeout | null = null;

  constructor(
    private readonly prisma: PrismaService,
    private readonly ledger: LedgerService,
    private readonly audit: AuditService,
  ) {}

  onModuleInit(): void {
    const safe = () => this.run().catch((e) => this.logger.warn(`run: ${(e as Error).message}`));
    this.timer = setInterval(() => void safe(), INTERVAL_MS);
    setTimeout(() => void safe(), 15_000); // one pass shortly after boot
  }

  onModuleDestroy(): void {
    if (this.timer) clearInterval(this.timer);
  }

  async run(): Promise<ReconReport> {
    const invariant = await this.ledger.globalInvariant();
    const confirmed = await this.prisma.deposit.findMany({ where: { status: 'CONFIRMED' }, select: { id: true, receipt: true } });
    let unmatched = 0;
    for (const d of confirmed) {
      if (!d.receipt) {
        unmatched++;
        continue;
      }
      const entry = await this.prisma.journalEntry.findFirst({ where: { reference: d.receipt } });
      if (!entry) unmatched++;
    }

    const report: ReconReport = {
      at: new Date().toISOString(),
      invariant,
      confirmedDeposits: confirmed.length,
      unmatchedDeposits: unmatched,
    };

    if (!invariant.balanced || unmatched > 0) {
      this.logger.error(`Reconciliation MISMATCH: ${JSON.stringify(report)}`);
      await this.audit.write({ action: 'reconciliation.mismatch', metadata: report as unknown as Prisma.InputJsonValue });
    } else {
      this.logger.log(`Reconciliation ok — ledger balanced, ${confirmed.length} deposits matched`);
    }
    return report;
  }
}
