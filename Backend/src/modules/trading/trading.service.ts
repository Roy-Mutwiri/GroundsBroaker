import { BadRequestException, ForbiddenException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { EventEmitter } from 'events';
import { Instrument, Position, Prisma, TradingAccount } from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';
import { D, Decimal, money, price as roundPrice } from '../../common/money/decimal';
import { MarketDataService } from '../market-data/market-data.service';
import { LedgerService } from '../ledger/ledger.service';
import { AuditService } from '../audit/audit.service';
import {
  accountMetrics,
  floatingPnl,
  marginRequired,
  pipValue,
  PositionMath,
  settlementLines,
  stopOutPlan,
  swapCharge,
} from './engine';
import { PlaceOrderDto } from './dto';

export const MARGIN_CALL_LEVEL = 100;
export const STOP_OUT_LEVEL = 50;

const accountCode = (userId: string, accountId: string) => `client:${userId}:account:${accountId}`;

export interface PositionSnapshot {
  id: string;
  symbol: string;
  side: 'BUY' | 'SELL';
  lots: number;
  openPrice: number;
  markPrice: number;
  stopLoss: number | null;
  takeProfit: number | null;
  swap: number;
  margin: number;
  pnl: number;
}

export interface AccountSnapshot {
  accountId: string;
  currency: string;
  balance: number;
  equity: number;
  usedMargin: number;
  freeMargin: number;
  floatingPnl: number;
  marginLevel: number | null;
  marginCall: boolean;
  positions: PositionSnapshot[];
}

@Injectable()
export class TradingService {
  private readonly logger = new Logger('Trading');
  /** Emits 'snapshot' {accountId, snapshot} and 'event' {accountId, event, data}. */
  readonly events = new EventEmitter();
  private readonly locks = new Map<string, Promise<unknown>>();

  constructor(
    private readonly prisma: PrismaService,
    private readonly market: MarketDataService,
    private readonly ledger: LedgerService,
    private readonly audit: AuditService,
  ) {}

  // ── per-account serialization (margin checks must not race) ──
  private async withLock<T>(accountId: string, fn: () => Promise<T>): Promise<T> {
    const prev = this.locks.get(accountId) ?? Promise.resolve();
    let release!: () => void;
    const gate = new Promise<void>((r) => (release = r));
    this.locks.set(accountId, prev.then(() => gate));
    try {
      await prev;
      return await fn();
    } finally {
      release();
      if (this.locks.get(accountId) === prev.then(() => gate)) this.locks.delete(accountId);
    }
  }

  // ── helpers ──
  private specOf(inst: Instrument) {
    return {
      contractSize: D(inst.contractSize.toString()),
      pointSize: D(inst.pointSize.toString()),
      pipSize: D(inst.pipSize.toString()),
      digits: inst.digits,
      minLot: D(inst.minLot.toString()),
      maxLot: D(inst.maxLot.toString()),
      lotStep: D(inst.lotStep.toString()),
      swapLong: D(inst.swapLong.toString()),
      swapShort: D(inst.swapShort.toString()),
      tripleSwapDay: inst.tripleSwapDay,
      quoteCurrency: inst.quoteCurrency,
    };
  }

  private async loadAccount(accountId: string, userId?: string): Promise<TradingAccount> {
    const acc = await this.prisma.tradingAccount.findUnique({ where: { id: accountId } });
    if (!acc) throw new NotFoundException({ code: 'account_not_found', message: 'Trading account not found.' });
    if (userId && acc.userId !== userId) throw new ForbiddenException({ code: 'forbidden', message: 'Not your account.' });
    if (acc.status !== 'ACTIVE') throw new BadRequestException({ code: 'account_inactive', message: 'Account is not active.' });
    return acc;
  }

  async balance(userId: string, accountId: string): Promise<Decimal> {
    return this.ledger.balance(accountCode(userId, accountId));
  }

  private async positionMath(acc: TradingAccount, positions: Position[]): Promise<PositionMath[]> {
    const out: PositionMath[] = [];
    for (const p of positions) {
      const inst = this.market.getInstrument(await this.symbolOf(p.instrumentId));
      if (!inst) continue;
      const quote = await this.market.getQuote(inst.symbol);
      if (!quote) continue;
      const convRate = D(await this.market.getConvRate(inst.quoteCurrency, acc.currency));
      const mark = p.side === 'BUY' ? quote.bid : quote.ask;
      const spec = this.specOf(inst);
      const margin = marginRequired(D(p.lots.toString()), spec.contractSize, D(p.openPrice.toString()), acc.leverage, convRate);
      out.push({
        id: p.id,
        side: p.side,
        lots: D(p.lots.toString()),
        openPrice: D(p.openPrice.toString()),
        contractSize: spec.contractSize,
        margin,
        markPrice: D(mark),
        convRate,
      });
    }
    return out;
  }

  private symbolCache = new Map<string, string>();
  private async symbolOf(instrumentId: string): Promise<string> {
    const cached = this.symbolCache.get(instrumentId);
    if (cached) return cached;
    const inst = this.market.listInstruments().find((i) => i.id === instrumentId);
    if (inst) {
      this.symbolCache.set(instrumentId, inst.symbol);
      return inst.symbol;
    }
    return '';
  }

  // ── snapshot ──
  async snapshot(userId: string, accountId: string): Promise<AccountSnapshot> {
    const acc = await this.loadAccount(accountId, userId);
    return this.buildSnapshot(acc);
  }

  private async buildSnapshot(acc: TradingAccount): Promise<AccountSnapshot> {
    const positions = await this.prisma.position.findMany({ where: { accountId: acc.id, status: 'OPEN' } });
    const balance = await this.ledger.balance(accountCode(acc.userId, acc.id));
    const pm = await this.positionMath(acc, positions);
    const metrics = accountMetrics(balance, pm);

    const posSnaps: PositionSnapshot[] = positions.map((p, idx) => {
      const m = pm.find((x) => x.id === p.id) ?? pm[idx];
      const pnl = m ? floatingPnl(m.side, m.openPrice, m.markPrice, m.lots, m.contractSize, m.convRate) : new Decimal(0);
      return {
        id: p.id,
        symbol: this.symbolCache.get(p.instrumentId) ?? '',
        side: p.side,
        lots: Number(p.lots),
        openPrice: Number(p.openPrice),
        markPrice: m ? m.markPrice.toNumber() : Number(p.openPrice),
        stopLoss: p.stopLoss ? Number(p.stopLoss) : null,
        takeProfit: p.takeProfit ? Number(p.takeProfit) : null,
        swap: Number(p.swapAccrued),
        margin: m ? money(m.margin).toNumber() : 0,
        pnl: money(pnl).toNumber(),
      };
    });

    return {
      accountId: acc.id,
      currency: acc.currency,
      balance: money(balance).toNumber(),
      equity: money(metrics.equity).toNumber(),
      usedMargin: money(metrics.usedMargin).toNumber(),
      freeMargin: money(metrics.freeMargin).toNumber(),
      floatingPnl: money(metrics.floatingPnl).toNumber(),
      marginLevel: metrics.marginLevel ? metrics.marginLevel.toDecimalPlaces(2).toNumber() : null,
      marginCall: metrics.marginLevel ? metrics.marginLevel.lte(MARGIN_CALL_LEVEL) : false,
      positions: posSnaps,
    };
  }

  private emitSnapshot(acc: TradingAccount): void {
    void this.buildSnapshot(acc)
      .then((s) => this.events.emit('snapshot', { accountId: acc.id, snapshot: s }))
      .catch(() => undefined);
  }

  // ── place order ──
  async placeOrder(userId: string, dto: PlaceOrderDto) {
    return this.withLock(dto.accountId, async () => {
      const acc = await this.loadAccount(dto.accountId, userId);
      const inst = this.market.getInstrument(dto.symbol);
      if (!inst || !inst.enabled) throw new BadRequestException({ code: 'instrument_unavailable', message: 'Instrument unavailable.' });
      this.symbolCache.set(inst.id, inst.symbol);
      const spec = this.specOf(inst);
      const lots = D(dto.lots);
      this.validateLots(lots, spec);

      const quote = await this.market.getQuote(inst.symbol);
      if (!quote) throw new BadRequestException({ code: 'market_closed', message: 'No live price for this instrument.' });
      const convRate = D(await this.market.getConvRate(inst.quoteCurrency, acc.currency));

      if (dto.kind !== 'MARKET') {
        if (!dto.price) throw new BadRequestException({ code: 'price_required', message: 'Limit/stop orders need a price.' });
        const order = await this.prisma.order.create({
          data: {
            accountId: acc.id,
            instrumentId: inst.id,
            side: dto.side,
            kind: dto.kind,
            status: 'PENDING',
            lots: new Prisma.Decimal(dto.lots),
            price: new Prisma.Decimal(dto.price),
            stopLoss: dto.stopLoss ? new Prisma.Decimal(dto.stopLoss) : null,
            takeProfit: dto.takeProfit ? new Prisma.Decimal(dto.takeProfit) : null,
            slippagePoints: dto.slippagePoints,
          },
        });
        await this.audit.write({ actorId: userId, action: 'trade.order.place', targetId: order.id, metadata: { kind: dto.kind } });
        return { orderId: order.id, status: 'PENDING' as const };
      }

      // MARKET: fill BUY at ask, SELL at bid, apply adverse slippage.
      const slip = D(dto.slippagePoints ?? 0).mul(spec.pointSize);
      const raw = dto.side === 'BUY' ? D(quote.ask).plus(slip) : D(quote.bid).minus(slip);
      const fillPrice = roundPrice(raw, spec.digits);
      const margin = marginRequired(lots, spec.contractSize, fillPrice, acc.leverage, convRate);

      // Free-margin check against current book.
      const snap = await this.buildSnapshot(acc);
      if (D(snap.freeMargin).lt(margin)) {
        throw new BadRequestException({
          code: 'insufficient_margin',
          message: `Not enough free margin. Need ${money(margin)}, have ${snap.freeMargin}.`,
        });
      }

      const position = await this.prisma.$transaction(async (tx) => {
        const pos = await tx.position.create({
          data: {
            accountId: acc.id,
            instrumentId: inst.id,
            side: dto.side,
            status: 'OPEN',
            lots: new Prisma.Decimal(dto.lots),
            openPrice: fillPrice.toString(),
            stopLoss: dto.stopLoss ? new Prisma.Decimal(dto.stopLoss) : null,
            takeProfit: dto.takeProfit ? new Prisma.Decimal(dto.takeProfit) : null,
          },
        });
        await tx.trade.create({
          data: {
            accountId: acc.id,
            instrumentId: inst.id,
            positionId: pos.id,
            kind: 'OPEN',
            side: dto.side,
            lots: new Prisma.Decimal(dto.lots),
            price: fillPrice.toString(),
          },
        });
        return pos;
      });

      await this.audit.write({ actorId: userId, action: 'trade.position.open', targetId: position.id, metadata: { symbol: inst.symbol, lots: dto.lots } });
      this.events.emit('event', { accountId: acc.id, event: 'fill', data: { positionId: position.id, symbol: inst.symbol, side: dto.side, lots: dto.lots, price: fillPrice.toNumber() } });
      this.emitSnapshot(acc);
      return { positionId: position.id, status: 'FILLED' as const, price: fillPrice.toNumber(), margin: money(margin).toNumber() };
    });
  }

  private validateLots(lots: Decimal, spec: ReturnType<TradingService['specOf']>): void {
    if (lots.lt(spec.minLot)) throw new BadRequestException({ code: 'lots_too_small', message: `Minimum ${spec.minLot} lots.` });
    if (lots.gt(spec.maxLot)) throw new BadRequestException({ code: 'lots_too_large', message: `Maximum ${spec.maxLot} lots.` });
    const steps = lots.div(spec.lotStep);
    if (!steps.equals(steps.floor())) throw new BadRequestException({ code: 'lots_step', message: `Lots must be a multiple of ${spec.lotStep}.` });
  }

  // ── close position ──
  async closePosition(userId: string, accountId: string, positionId: string, closeLots?: number, reason = 'manual') {
    return this.withLock(accountId, async () => {
      const acc = await this.loadAccount(accountId, userId);
      const result = await this.closeInternal(acc, positionId, closeLots, reason);
      this.emitSnapshot(acc);
      return result;
    });
  }

  /** Core close logic (no lock). Used by the manual path and the engine loop. */
  private async closeInternal(acc: TradingAccount, positionId: string, closeLots: number | undefined, reason: string) {
    const pos = await this.prisma.position.findFirst({ where: { id: positionId, accountId: acc.id, status: 'OPEN' } });
    if (!pos) throw new NotFoundException({ code: 'position_not_found', message: 'Open position not found.' });
    const symbol = await this.symbolOf(pos.instrumentId);
    const inst = this.market.getInstrument(symbol);
    if (!inst) throw new BadRequestException({ code: 'instrument_unavailable', message: 'Instrument unavailable.' });
    const spec = this.specOf(inst);
    const quote = await this.market.getQuote(symbol);
    if (!quote) throw new BadRequestException({ code: 'market_closed', message: 'No live price to close against.' });
    const convRate = D(await this.market.getConvRate(inst.quoteCurrency, acc.currency));

    const totalLots = D(pos.lots.toString());
    const lots = closeLots ? D(closeLots) : totalLots;
    if (lots.gt(totalLots)) throw new BadRequestException({ code: 'lots_exceed', message: 'Cannot close more than the position size.' });
    const isFull = lots.equals(totalLots);

    // Close BUY by selling at bid; close SELL by buying at ask.
    const closePrice = roundPrice(pos.side === 'BUY' ? D(quote.bid) : D(quote.ask), spec.digits);
    const pnlPortion = floatingPnl(pos.side, D(pos.openPrice.toString()), closePrice, lots, spec.contractSize, convRate);
    // Settle the proportional share of accrued swap.
    const swapPortion = totalLots.isZero() ? new Decimal(0) : D(pos.swapAccrued.toString()).mul(lots).div(totalLots);

    const code = accountCode(acc.userId, acc.id);
    await this.prisma.$transaction(async (tx) => {
      await tx.trade.create({
        data: {
          accountId: acc.id,
          instrumentId: inst.id,
          positionId: pos.id,
          kind: isFull ? 'CLOSE' : 'PARTIAL_CLOSE',
          side: pos.side === 'BUY' ? 'SELL' : 'BUY',
          lots: lots.toString(),
          price: closePrice.toString(),
          pnl: money(pnlPortion, 10).toString(),
        },
      });

      // Balanced ledger entry: price P&L ↔ pnl:trading, swap ↔ revenue:swap, net to client account.
      await this.ledger.post(
        { description: `Close ${symbol} (${reason})`, reference: `pos:${pos.id}`, lines: settlementLines(code, pnlPortion, swapPortion) },
        tx,
      );

      if (isFull) {
        await tx.position.update({
          where: { id: pos.id },
          data: { status: 'CLOSED', closePrice: closePrice.toString(), realizedPnl: money(pnlPortion, 10).toString(), swapAccrued: '0', closedAt: new Date() },
        });
      } else {
        await tx.position.update({
          where: { id: pos.id },
          data: { lots: totalLots.minus(lots).toString(), swapAccrued: D(pos.swapAccrued.toString()).minus(swapPortion).toString() },
        });
      }
    });

    await this.audit.write({ actorId: acc.userId, action: 'trade.position.close', targetId: pos.id, metadata: { symbol, lots: lots.toNumber(), pnl: money(pnlPortion).toNumber(), reason } });
    this.events.emit('event', { accountId: acc.id, event: reason === 'manual' ? 'closed' : reason, data: { positionId: pos.id, symbol, pnl: money(pnlPortion).toNumber(), reason } });
    return { positionId: pos.id, closed: isFull, lots: lots.toNumber(), closePrice: closePrice.toNumber(), pnl: money(pnlPortion).toNumber() };
  }

  // ── modify SL/TP ──
  async modifyPosition(userId: string, accountId: string, positionId: string, sl: number | null | undefined, tp: number | null | undefined) {
    return this.withLock(accountId, async () => {
      const acc = await this.loadAccount(accountId, userId);
      const pos = await this.prisma.position.findFirst({ where: { id: positionId, accountId: acc.id, status: 'OPEN' } });
      if (!pos) throw new NotFoundException({ code: 'position_not_found', message: 'Open position not found.' });
      const data: Prisma.PositionUpdateInput = {};
      if (sl !== undefined) data.stopLoss = sl === null ? null : new Prisma.Decimal(sl);
      if (tp !== undefined) data.takeProfit = tp === null ? null : new Prisma.Decimal(tp);
      await this.prisma.position.update({ where: { id: pos.id }, data });
      await this.audit.write({ actorId: userId, action: 'trade.position.modify', targetId: pos.id, metadata: { sl, tp } });
      this.emitSnapshot(acc);
      return { positionId: pos.id, stopLoss: sl ?? null, takeProfit: tp ?? null };
    });
  }

  async listPositions(userId: string, accountId: string) {
    await this.loadAccount(accountId, userId);
    return this.prisma.position.findMany({ where: { accountId, status: 'OPEN' }, orderBy: { openedAt: 'desc' } });
  }

  async history(userId: string, accountId: string) {
    await this.loadAccount(accountId, userId);
    return this.prisma.trade.findMany({ where: { accountId }, orderBy: { executedAt: 'desc' }, take: 200 });
  }

  /** Pip value + margin preview for the order ticket. */
  async preview(userId: string, accountId: string, symbol: string, lots: number) {
    const acc = await this.loadAccount(accountId, userId);
    const inst = this.market.getInstrument(symbol);
    if (!inst) throw new BadRequestException({ code: 'instrument_unavailable', message: 'Instrument unavailable.' });
    const spec = this.specOf(inst);
    const quote = await this.market.getQuote(symbol);
    const convRate = D(await this.market.getConvRate(inst.quoteCurrency, acc.currency));
    const mid = quote ? D((quote.bid + quote.ask) / 2) : D(inst.contractSize.toString()).mul(0);
    const margin = quote ? marginRequired(D(lots), spec.contractSize, mid, acc.leverage, convRate) : new Decimal(0);
    const pip = pipValue(D(lots), spec.contractSize, spec.pipSize, convRate);
    return { margin: money(margin).toNumber(), pipValue: money(pip, 4).toNumber(), leverage: acc.leverage };
  }

  // ── engine tick: pending triggers, SL/TP, stop-out, swaps handled by AccountEngine ──
  async evaluate(acc: TradingAccount): Promise<void> {
    await this.withLock(acc.id, async () => {
      await this.triggerPendingOrders(acc);
      await this.applyStopsAndTargets(acc);
      await this.applyStopOut(acc);
    });
    this.emitSnapshot(acc);
  }

  private async triggerPendingOrders(acc: TradingAccount): Promise<void> {
    const orders = await this.prisma.order.findMany({ where: { accountId: acc.id, status: 'PENDING' } });
    for (const o of orders) {
      const symbol = await this.symbolOf(o.instrumentId);
      const quote = await this.market.getQuote(symbol);
      if (!quote || !o.price) continue;
      const trigger = Number(o.price);
      const px = o.side === 'BUY' ? quote.ask : quote.bid;
      const hit =
        o.kind === 'LIMIT'
          ? o.side === 'BUY'
            ? px <= trigger
            : px >= trigger
          : o.side === 'BUY'
            ? px >= trigger
            : px <= trigger; // STOP
      if (!hit) continue;
      try {
        await this.fillFromOrder(acc, o.id);
      } catch (e) {
        this.logger.warn(`pending fill ${o.id}: ${(e as Error).message}`);
      }
    }
  }

  private async fillFromOrder(acc: TradingAccount, orderId: string): Promise<void> {
    const o = await this.prisma.order.findUnique({ where: { id: orderId } });
    if (!o || o.status !== 'PENDING') return;
    const symbol = await this.symbolOf(o.instrumentId);
    const inst = this.market.getInstrument(symbol)!;
    const spec = this.specOf(inst);
    const quote = await this.market.getQuote(symbol);
    if (!quote) return;
    const fill = roundPrice(o.side === 'BUY' ? D(quote.ask) : D(quote.bid), spec.digits);
    await this.prisma.$transaction(async (tx) => {
      const pos = await tx.position.create({
        data: {
          accountId: acc.id,
          instrumentId: o.instrumentId,
          side: o.side,
          status: 'OPEN',
          lots: o.lots,
          openPrice: fill.toString(),
          stopLoss: o.stopLoss,
          takeProfit: o.takeProfit,
        },
      });
      await tx.trade.create({
        data: { accountId: acc.id, instrumentId: o.instrumentId, positionId: pos.id, orderId: o.id, kind: 'OPEN', side: o.side, lots: o.lots, price: fill.toString() },
      });
      await tx.order.update({ where: { id: o.id }, data: { status: 'FILLED', filledPrice: fill.toString(), filledAt: new Date() } });
    });
    this.events.emit('event', { accountId: acc.id, event: 'fill', data: { symbol, side: o.side, price: fill.toNumber(), fromOrder: true } });
  }

  private async applyStopsAndTargets(acc: TradingAccount): Promise<void> {
    const positions = await this.prisma.position.findMany({ where: { accountId: acc.id, status: 'OPEN' } });
    for (const p of positions) {
      const symbol = await this.symbolOf(p.instrumentId);
      const quote = await this.market.getQuote(symbol);
      if (!quote) continue;
      const mark = p.side === 'BUY' ? quote.bid : quote.ask;
      const sl = p.stopLoss ? Number(p.stopLoss) : null;
      const tp = p.takeProfit ? Number(p.takeProfit) : null;
      const slHit = sl !== null && (p.side === 'BUY' ? mark <= sl : mark >= sl);
      const tpHit = tp !== null && (p.side === 'BUY' ? mark >= tp : mark <= tp);
      if (slHit || tpHit) {
        try {
          await this.closeInternal(acc, p.id, undefined, slHit ? 'stop_loss' : 'take_profit');
        } catch (e) {
          this.logger.warn(`SL/TP close ${p.id}: ${(e as Error).message}`);
        }
      }
    }
  }

  private async applyStopOut(acc: TradingAccount): Promise<void> {
    const positions = await this.prisma.position.findMany({ where: { accountId: acc.id, status: 'OPEN' } });
    if (positions.length === 0) return;
    const balance = await this.ledger.balance(accountCode(acc.userId, acc.id));
    const pm = await this.positionMath(acc, positions);
    const metrics = accountMetrics(balance, pm);
    if (metrics.marginLevel === null || metrics.marginLevel.gt(STOP_OUT_LEVEL)) return;

    const plan = stopOutPlan(balance, pm, STOP_OUT_LEVEL);
    for (const positionId of plan) {
      try {
        await this.closeInternal(acc, positionId, undefined, 'stop_out');
      } catch (e) {
        this.logger.warn(`stop-out close ${positionId}: ${(e as Error).message}`);
      }
    }
    if (plan.length) {
      await this.audit.write({ actorId: acc.userId, action: 'trade.stop_out', targetId: acc.id, metadata: { closed: plan.length } });
    }
  }

  /** Apply overnight swap to all open positions (called by the rollover job). */
  async applySwaps(): Promise<number> {
    const positions = await this.prisma.position.findMany({ where: { status: 'OPEN' }, include: { account: true } });
    const isTriple = new Date().getUTCDay() === 3; // Wednesday
    let count = 0;
    for (const p of positions) {
      const symbol = await this.symbolOf(p.instrumentId);
      const inst = this.market.getInstrument(symbol);
      if (!inst) continue;
      const spec = this.specOf(inst);
      const convRate = D(await this.market.getConvRate(inst.quoteCurrency, p.account.currency));
      const points = p.side === 'BUY' ? spec.swapLong : spec.swapShort;
      const charge = swapCharge(points, D(p.lots.toString()), spec.contractSize, spec.pointSize, convRate, isTriple && inst.tripleSwapDay === 3);
      await this.prisma.position.update({ where: { id: p.id }, data: { swapAccrued: D(p.swapAccrued.toString()).plus(charge).toString() } });
      count++;
    }
    this.logger.log(`Applied swaps to ${count} positions (triple=${isTriple})`);
    return count;
  }

  async listOpenAccountIds(): Promise<string[]> {
    const rows = await this.prisma.position.findMany({ where: { status: 'OPEN' }, select: { accountId: true }, distinct: ['accountId'] });
    return rows.map((r) => r.accountId);
  }

  async getAccount(accountId: string): Promise<TradingAccount | null> {
    return this.prisma.tradingAccount.findUnique({ where: { id: accountId } });
  }
}
