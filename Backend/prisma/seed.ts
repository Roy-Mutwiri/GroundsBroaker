/**
 * Aurum Markets — seed script.
 *
 * Creates: instruments (7 majors, 8 minors, XAUUSD+XAGUSD, US500+NAS100, BTCUSD+ETHUSD),
 * a system chart of accounts, an ADMIN (with TOTP), and a KYC-approved demo CLIENT whose
 * demo trading account is funded with $10,000 via a balanced double-entry opening journal
 * entry (Σdebits == Σcredits). Balances are always derived from the ledger — never a column.
 *
 * Run: npm run seed   (after `docker compose up -d` and `npm run prisma:migrate`)
 */
import { PrismaClient, InstrumentCategory, Prisma } from '@prisma/client';
import * as argon2 from 'argon2';
import { authenticator } from 'otplib';

const prisma = new PrismaClient();

type InstrumentSeed = {
  symbol: string;
  displayName: string;
  category: InstrumentCategory;
  digits: number;
  contractSize: string;
  pipSize: string;
  pointSize: string;
  base: string;
  quote: string;
  leverageCap: number;
  spreadMarkupPoints: number;
  swapLong: string;
  swapShort: string;
};

const FX5 = { digits: 5, pipSize: '0.0001', pointSize: '0.00001', contractSize: '100000' };
const FX3 = { digits: 3, pipSize: '0.01', pointSize: '0.001', contractSize: '100000' }; // JPY quote

function fxMajor(symbol: string, name: string, base: string, quote: string, markup = 4): InstrumentSeed {
  const jpy = quote === 'JPY';
  const f = jpy ? FX3 : FX5;
  return {
    symbol, displayName: name, category: InstrumentCategory.FX_MAJOR,
    ...f, base, quote, leverageCap: 400, spreadMarkupPoints: markup,
    swapLong: '-3.5', swapShort: '0.8',
  };
}
function fxMinor(symbol: string, name: string, base: string, quote: string, markup = 8): InstrumentSeed {
  const jpy = quote === 'JPY';
  const f = jpy ? FX3 : FX5;
  return {
    symbol, displayName: name, category: InstrumentCategory.FX_MINOR,
    ...f, base, quote, leverageCap: 200, spreadMarkupPoints: markup,
    swapLong: '-4.2', swapShort: '0.5',
  };
}

const INSTRUMENTS: InstrumentSeed[] = [
  // 7 majors
  fxMajor('EURUSD', 'Euro vs US Dollar', 'EUR', 'USD', 2),
  fxMajor('GBPUSD', 'Pound vs US Dollar', 'GBP', 'USD', 4),
  fxMajor('USDJPY', 'US Dollar vs Yen', 'USD', 'JPY', 4),
  fxMajor('USDCHF', 'US Dollar vs Franc', 'USD', 'CHF', 5),
  fxMajor('USDCAD', 'US Dollar vs Loonie', 'USD', 'CAD', 5),
  fxMajor('AUDUSD', 'Aussie vs US Dollar', 'AUD', 'USD', 4),
  fxMajor('NZDUSD', 'Kiwi vs US Dollar', 'NZD', 'USD', 5),
  // 8 minors
  fxMinor('EURGBP', 'Euro vs Pound', 'EUR', 'GBP'),
  fxMinor('EURJPY', 'Euro vs Yen', 'EUR', 'JPY'),
  fxMinor('GBPJPY', 'Pound vs Yen', 'GBP', 'JPY'),
  fxMinor('EURCHF', 'Euro vs Franc', 'EUR', 'CHF'),
  fxMinor('AUDJPY', 'Aussie vs Yen', 'AUD', 'JPY'),
  fxMinor('EURAUD', 'Euro vs Aussie', 'EUR', 'AUD'),
  fxMinor('GBPAUD', 'Pound vs Aussie', 'GBP', 'AUD'),
  fxMinor('CADJPY', 'Loonie vs Yen', 'CAD', 'JPY'),
  // Metals — XAUUSD contract size 100 (troy oz); the hero instrument.
  {
    symbol: 'XAUUSD', displayName: 'Gold vs US Dollar', category: InstrumentCategory.METAL,
    digits: 2, contractSize: '100', pipSize: '0.1', pointSize: '0.01',
    base: 'XAU', quote: 'USD', leverageCap: 200, spreadMarkupPoints: 20,
    swapLong: '-8.5', swapShort: '2.1',
  },
  {
    symbol: 'XAGUSD', displayName: 'Silver vs US Dollar', category: InstrumentCategory.METAL,
    digits: 3, contractSize: '5000', pipSize: '0.01', pointSize: '0.001',
    base: 'XAG', quote: 'USD', leverageCap: 200, spreadMarkupPoints: 30,
    swapLong: '-6.0', swapShort: '1.2',
  },
  // Indices (CFD, 1 contract = $1/point here)
  {
    symbol: 'US500', displayName: 'S&P 500 Index', category: InstrumentCategory.INDEX,
    digits: 1, contractSize: '1', pipSize: '0.1', pointSize: '0.1',
    base: 'US500', quote: 'USD', leverageCap: 100, spreadMarkupPoints: 4,
    swapLong: '-2.0', swapShort: '-1.0',
  },
  {
    symbol: 'NAS100', displayName: 'Nasdaq 100 Index', category: InstrumentCategory.INDEX,
    digits: 1, contractSize: '1', pipSize: '0.1', pointSize: '0.1',
    base: 'NAS100', quote: 'USD', leverageCap: 100, spreadMarkupPoints: 10,
    swapLong: '-2.5', swapShort: '-1.2',
  },
  // Crypto
  {
    symbol: 'BTCUSD', displayName: 'Bitcoin vs US Dollar', category: InstrumentCategory.CRYPTO,
    digits: 2, contractSize: '1', pipSize: '0.01', pointSize: '0.01',
    base: 'BTC', quote: 'USD', leverageCap: 20, spreadMarkupPoints: 5000,
    swapLong: '-20.0', swapShort: '-20.0',
  },
  {
    symbol: 'ETHUSD', displayName: 'Ethereum vs US Dollar', category: InstrumentCategory.CRYPTO,
    digits: 2, contractSize: '1', pipSize: '0.01', pointSize: '0.01',
    base: 'ETH', quote: 'USD', leverageCap: 20, spreadMarkupPoints: 300,
    swapLong: '-18.0', swapShort: '-18.0',
  },
];

const SYSTEM_LEDGER_ACCOUNTS: { code: string; kind: 'ASSET' | 'LIABILITY' | 'REVENUE' | 'EQUITY' | 'EXPENSE' }[] = [
  { code: 'company:cash', kind: 'ASSET' },
  { code: 'psp:mpesa:clearing', kind: 'ASSET' },
  { code: 'psp:card:clearing', kind: 'ASSET' },
  { code: 'equity:demo_funding', kind: 'EQUITY' },
  { code: 'revenue:spread', kind: 'REVENUE' },
  { code: 'revenue:commission', kind: 'REVENUE' },
  { code: 'revenue:swap', kind: 'REVENUE' },
  { code: 'pnl:trading', kind: 'EQUITY' }, // B-book counterparty P&L
  { code: 'payable:withdrawals', kind: 'LIABILITY' },
];

async function main() {
  console.log('› Seeding instruments…');
  for (const i of INSTRUMENTS) {
    await prisma.instrument.upsert({
      where: { symbol: i.symbol },
      update: {},
      create: {
        symbol: i.symbol,
        displayName: i.displayName,
        category: i.category,
        digits: i.digits,
        contractSize: new Prisma.Decimal(i.contractSize),
        pipSize: new Prisma.Decimal(i.pipSize),
        pointSize: new Prisma.Decimal(i.pointSize),
        leverageCap: i.leverageCap,
        marginCurrency: 'USD',
        baseCurrency: i.base,
        quoteCurrency: i.quote,
        spreadMarkupPoints: i.spreadMarkupPoints,
        swapLong: new Prisma.Decimal(i.swapLong),
        swapShort: new Prisma.Decimal(i.swapShort),
        tripleSwapDay: 3,
      },
    });
  }
  console.log(`  ✓ ${INSTRUMENTS.length} instruments`);

  console.log('› Seeding system chart of accounts…');
  for (const a of SYSTEM_LEDGER_ACCOUNTS) {
    await prisma.ledgerAccount.upsert({
      where: { code: a.code },
      update: {},
      create: { code: a.code, kind: a.kind, currency: 'USD' },
    });
  }

  // ── Admin (staff → TOTP required) ──
  console.log('› Seeding admin…');
  const adminEmail = 'admin@aurum.markets';
  const adminSecret = authenticator.generateSecret();
  const adminPassword = 'Aurum#Admin1';
  await prisma.user.upsert({
    where: { email: adminEmail },
    update: {},
    create: {
      email: adminEmail,
      passwordHash: await argon2.hash(adminPassword, { type: argon2.argon2id }),
      role: 'ADMIN',
      firstName: 'Aurum',
      lastName: 'Admin',
      totpSecret: adminSecret,
      totpEnabledAt: new Date(),
    },
  });
  const adminOtpAuth = authenticator.keyuri(adminEmail, 'Aurum Markets', adminSecret);

  // ── KYC-approved demo client with a funded demo account ──
  console.log('› Seeding demo client + funded demo account…');
  const clientEmail = 'demo@aurum.markets';
  const clientPassword = 'Aurum#Demo1';
  const client = await prisma.user.upsert({
    where: { email: clientEmail },
    update: {},
    create: {
      email: clientEmail,
      passwordHash: await argon2.hash(clientPassword, { type: argon2.argon2id }),
      role: 'CLIENT',
      firstName: 'Demo',
      lastName: 'Trader',
      phone: '+254712345678',
      kycProfile: {
        create: { tier: 2, status: 'APPROVED', reviewedAt: new Date(), reviewNote: 'Seeded demo client.' },
      },
    },
  });

  const account = await prisma.tradingAccount.create({
    data: { userId: client.id, type: 'DEMO', currency: 'USD', leverage: 200 },
  });

  // Per-client ledger accounts
  const walletCode = `client:${client.id}:wallet`;
  const acctCode = `client:${client.id}:account:${account.id}`;
  await prisma.ledgerAccount.createMany({
    data: [
      { code: walletCode, kind: 'LIABILITY', currency: 'USD', userId: client.id },
      { code: acctCode, kind: 'LIABILITY', currency: 'USD', userId: client.id },
    ],
    skipDuplicates: true,
  });
  const acctLedger = await prisma.ledgerAccount.findUniqueOrThrow({ where: { code: acctCode } });
  const demoFunding = await prisma.ledgerAccount.findUniqueOrThrow({ where: { code: 'equity:demo_funding' } });

  // Balanced opening entry: DR equity:demo_funding 10,000 / CR client account 10,000
  await prisma.journalEntry.create({
    data: {
      description: 'Demo account opening balance',
      reference: `seed:${account.id}`,
      lines: {
        create: [
          { accountId: demoFunding.id, debit: new Prisma.Decimal('10000'), credit: new Prisma.Decimal('0') },
          { accountId: acctLedger.id, debit: new Prisma.Decimal('0'), credit: new Prisma.Decimal('10000') },
        ],
      },
    },
  });

  console.log('\n─────────────────────────────────────────────');
  console.log('Seed complete. Demo credentials:');
  console.log(`  ADMIN   ${adminEmail}  /  ${adminPassword}`);
  console.log(`          TOTP (add to your authenticator app):`);
  console.log(`          ${adminOtpAuth}`);
  console.log(`  CLIENT  ${clientEmail}  /  ${clientPassword}  (KYC tier 2, demo account funded $10,000)`);
  console.log('─────────────────────────────────────────────\n');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
