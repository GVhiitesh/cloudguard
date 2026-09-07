import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { chartDate, currency } from '@/lib/format';
import type { CostTrendResponse } from '@/types/api';

/** Lime area chart of daily spend, matching the dashboard "Cost Trend" card. */
export function CostTrendChart({ data }: { data: CostTrendResponse }) {
  return (
    <ResponsiveContainer width="100%" height={240}>
      <AreaChart data={data.series} margin={{ top: 10, right: 8, left: 8, bottom: 0 }}>
        <defs>
          <linearGradient id="costFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#D7FB38" stopOpacity={0.5} />
            <stop offset="100%" stopColor="#D7FB38" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--color-line)" vertical={false} />
        <XAxis
          dataKey="date"
          tickFormatter={chartDate}
          tick={{ fontSize: 11, fill: 'var(--color-muted-2)' }}
          axisLine={false}
          tickLine={false}
          minTickGap={40}
        />
        <YAxis
          tickFormatter={(v) => `₹${v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v}`}
          tick={{ fontSize: 11, fill: 'var(--color-muted-2)' }}
          axisLine={false}
          tickLine={false}
          width={44}
        />
        <Tooltip
          formatter={(v: number) => [currency(v), 'Cost']}
          labelFormatter={(l) => chartDate(l as string)}
          contentStyle={{
            borderRadius: 12,
            background: 'var(--color-surface)',
            color: 'var(--color-ink)',
            border: '1px solid var(--color-line)',
            fontSize: 12,
            boxShadow: '0 8px 30px rgba(17,19,21,0.12)',
          }}
        />
        <Area
          type="monotone"
          dataKey="cost"
          stroke="#A3C614"
          strokeWidth={2.5}
          fill="url(#costFill)"
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
