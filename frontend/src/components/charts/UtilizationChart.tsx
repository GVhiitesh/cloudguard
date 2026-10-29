import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { UtilizationResponse } from '@/types/api';

// Idle band (0–5%) shows amber; healthy mid-range lime; very high amber again.
const COLORS = ['#D97706', '#D7FB38', '#10B981', '#10B981', '#D97706'];

export function UtilizationChart({ data }: { data: UtilizationResponse }) {
  const chartData = data.buckets.map((b, i) => ({ ...b, color: COLORS[i] ?? '#9CA3AF' }));
  return (
    <ResponsiveContainer width="100%" height={240}>
      <BarChart data={chartData} margin={{ top: 10, right: 8, left: 8, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--color-line)" vertical={false} />
        <XAxis dataKey="label" tick={{ fontSize: 11, fill: 'var(--color-muted-2)' }} axisLine={false} tickLine={false} />
        <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: 'var(--color-muted-2)' }} axisLine={false} tickLine={false} width={28} />
        <Tooltip
          formatter={(v: number) => [`${v} resources`, 'Count']}
          contentStyle={{ borderRadius: 12, border: '1px solid var(--color-line)', background: 'var(--color-surface)', color: 'var(--color-ink)', fontSize: 12 }}
        />
        <Bar dataKey="count" radius={[6, 6, 0, 0]}>
          {chartData.map((d, i) => (
            <Cell key={i} fill={d.color} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
