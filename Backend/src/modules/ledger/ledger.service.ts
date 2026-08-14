import { BadRequestException, Injectable } from '@nestjs/common';
import { LedgerAccountKind, Prisma } from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';
import { D, Decimal } from '../../common/money/decimal';

export interface JournalLineInput {
  code: string;
  debit?: Prisma.Decimal.Value;
  credit?: Prisma.Decimal.Value;
  currency?: string;
}

export interface JournalEntryInput {
  description: string;
  reference?: string;
  reversalOf?: string;
  lines: JournalLineInput[];
}

/** Infer a ledger account's kind from its code prefix (used when auto-creating accounts). */
export function kindForCode(code: string): LedgerAccountKind {
  if (code.startsWith('client:')) return 'LIABILITY';
  if (code.startsWith('payable:')) return 'LIABILITY';
  if (code.startsWith('psp:') || code === 'company:cash') return 'ASSET';
  if (code.startsWith('revenue:')) return 'REVENUE';
  if (code.startsWith('equity:') || code.startsWith('pnl:')) return 'EQUITY';
  return 'EQUITY';
}

/**
 * Double-entry ledger core (Phase 3 minimal; Phase 4 adds wallet ops, invariant jobs,
 * reconciliation, and the explorer). Every entry is balanced (Σdebits == Σcredits),
 * enforced in the write transaction. Entries are immutable; corrections are reversing entries.
 * Balances are DERIVED by summing lines — never stored on a column.
 */
@Injectable()
export class LedgerService {
  constructor(private readonly prisma: PrismaService) {}

  /** Post a balanced journal entry. Pass a transaction client to make it atomic with other writes. */
  async post(input: JournalEntryInput, tx?: Prisma.TransactionClient): Promise<string> {
    const client = tx ?? this.prisma;

    let debits = new Decimal(0);
    let credits = new Decimal(0);
    for (const l of input.lines) {
      debits = debits.plus(D(l.debit ?? 0));
      credits = credits.plus(D(l.credit ?? 0));
    }
    if (!debits.equals(credits)) {
      throw new BadRequestException({
        code: 'ledger_unbalanced',
        message: `Journal entry not balanced: debits ${debits} ≠ credits ${credits}`,
      });
    }
    if (input.lines.length < 2) {
      throw new BadRequestException({ code: 'ledger_too_few_lines', message: 'An entry needs ≥2 lines.' });
    }

    const accountIds = new Map<string, string>();
    for (const l of input.lines) {
      if (accountIds.has(l.code)) continue;
      const acc = await client.ledgerAccount.upsert({
        where: { code: l.code },
        update: {},
        create: { code: l.code, kind: kindForCode(l.code), currency: l.currency ?? 'USD' },
      });
      accountIds.set(l.code, acc.id);
    }

    const entry = await client.journalEntry.create({
      data: {
        description: input.description,
        reference: input.reference,
        reversalOf: input.reversalOf,
        lines: {
          create: input.lines.map((l) => ({
            accountId: accountIds.get(l.code)!,
            debit: new Prisma.Decimal(l.debit ?? 0),
            credit: new Prisma.Decimal(l.credit ?? 0),
            currency: l.currency ?? 'USD',
          })),
        },
      },
    });
    return entry.id;
  }

  /**
   * Balance of an account = Σcredit − Σdebit (natural for the credit-normal client
   * liability accounts we read as "how much we owe the client / their balance").
   */
  async balance(code: string, tx?: Prisma.TransactionClient): Promise<Decimal> {
    const client = tx ?? this.prisma;
    const agg = await client.journalLine.aggregate({
      where: { account: { code } },
      _sum: { debit: true, credit: true },
    });
    const debit = D(agg._sum.debit ?? 0);
    const credit = D(agg._sum.credit ?? 0);
    return credit.minus(debit);
  }
}
