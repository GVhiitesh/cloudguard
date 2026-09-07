import {
  CartesianGrid,
  Line,
  ComposedChart,
  ReferenceDot,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { chartDate, currency, percent } from '@/lib/format';
import type { MetricPoint, TwinAnomaly } from '@/types/api';

/** Dual-line CPU + cost telemetry with anomaly points marked, for the twin. */
export function HistoryChart({
  history,
  anomalies,
}: {
  history: MetricPoint[];
  anomalies: TwinAnomaly[];
}) {
  const data = history.map((h) => ({ ...h, ts: h.timestamp }));

  // Map each anomaly to the nearest history point so it sits on the line.
  const marks = anomalies
    .map((a) => {
      const t = new Date(a.detectedAt).getTime();
      let nearest = data[0];
      let best = Infinity;
      for (const d of data) {
        const diff = Math.abs(new Date(d.ts).getTime() - t);
        if (diff < best) {
          best = diff;
          nearest = d;
        }
      }
      return nearest ? { x: nearest.ts, y: nearest.cost, severity: a.severity } : null;
    })
    .filter(Boolean) as Array<{ x: string; y: number; severity: string }>;

  return (
    <ResponsiveContainer width="100%" height={300}>
      <ComposedChart data={data} margin={{ top: 10, right: 8, left: 8, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--color-line)" vertical={false} />
        <XAxis
          dataKey="ts"
          tickFormatter={chartDate}
          tick={{ fontSize: 11, fill: 'var(--color-muted-2)' }}
          axisLine={false}
          tickLine={false}
          minTickGap={40}
        />
        <YAxis yAxisId="cpu" orientation="left" tick={{ fontSize: 11, fill: 'var(--color-muted-2)' }} axisLine={false} tickLine={false} width={34} />
        <YAxis yAxisId="cost" orientation="right" tick={{ fontSize: 11, fill: 'var(--color-muted-2)' }} axisLine={false} tickLine={false} width={44} />
        <Tooltip
          labelFormatter={(l) => chartDate(l as string)}
          formatter={(v: number, name) =>
            name === 'cpu' ? [percent(v), 'CPU'] : [currency(v), 'Cost']
          }
          contentStyle={{ borderRadius: 12, border: '1px solid var(--color-line)', background: 'var(--color-surface)', color: 'var(--color-ink)', fontSize: 12 }}
        />
        <Line yAxisId="cpu" type="monotone" dataKey="cpu" stroke="#10B981" strokeWidth={2} dot={false} />
        <Line yAxisId="cost" type="monotone" dataKey="cost" stroke="#A3C614" strokeWidth={2} dot={false} />
        {marks.map((m, i) => (
          <ReferenceDot
            key={i}
            yAxisId="cost"
            x={m.x}
            y={m.y}
            r={5}
            fill={m.severity === 'HIGH' ? '#DC2626' : m.severity === 'MEDIUM' ? '#D97706' : '#2563EB'}
            stroke="#fff"
            strokeWidth={2}
          />
        ))}
      </ComposedChart>
    </ResponsiveContainer>
  );
}
