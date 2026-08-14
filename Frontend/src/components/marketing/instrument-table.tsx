'use client';
import { useSimulatedQuote } from '@/lib/useSimulatedQuote';
import { DEMO_INSTRUMENTS, type DemoInstrument } from '@/lib/demo-instruments';
import { Table, THead, Th, TRow, Td } from '@/components/ui/table';
import { FlashNumber } from '@/components/ui/flash-number';
import { formatPercent, formatPrice } from '@/lib/format';

export function InstrumentTable() {
  return (
    <Table>
      <THead>
        <tr>
          <Th>Instrument</Th>
          <Th numeric>Sell</Th>
          <Th numeric>Buy</Th>
          <Th numeric>Spread</Th>
          <Th numeric>Change</Th>
        </tr>
      </THead>
      <tbody>
        {DEMO_INSTRUMENTS.map((i) => (
          <InstrumentRow key={i.symbol} instrument={i} />
        ))}
      </tbody>
    </Table>
  );
}

function InstrumentRow({ instrument }: { instrument: DemoInstrument }) {
  const q = useSimulatedQuote(instrument.anchor, instrument.digits, instrument.spreadPoints, instrument.volatility);
  const spread = ((q.ask - q.bid) * Math.pow(10, instrument.digits)).toFixed(0);
  return (
    <TRow>
      <Td>
        <div className="flex items-center gap-2">
          <span className="font-medium text-text">{instrument.symbol}</span>
          <span className="text-text-faint">{instrument.name}</span>
        </div>
      </Td>
      <Td numeric>
        <FlashNumber value={q.bid} digits={instrument.digits} dir={q.dir} className="text-down" />
      </Td>
      <Td numeric>
        <FlashNumber value={q.ask} digits={instrument.digits} dir={q.dir} className="text-up" />
      </Td>
      <Td numeric className="text-text-dim">{spread}</Td>
      <Td numeric className={q.changePct >= 0 ? 'text-up' : 'text-down'}>
        {formatPercent(q.changePct)}
      </Td>
    </TRow>
  );
}
