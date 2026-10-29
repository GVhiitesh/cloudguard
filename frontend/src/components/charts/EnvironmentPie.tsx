import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';
import type { ByEnvironmentResponse } from '@/types/api';
import { currencyCompact, number } from '@/lib/format';

const COLORS: Record<string, string> = { PROD: '#6366F1', STAGING: '#D7FB38', DEV: '#10B981' };

/** Donut for the dashboard "Environments" card: slices by resource count. */
export function EnvironmentPie({ data }: { data: ByEnvironmentResponse }) {
  const rows = data.data.map((e) => ({
    name: e.environment,
    value: e.resourceCount,
    cost: e.actualCost,
    color: COLORS[e.environment] ?? '#9CA3AF',
  }));
  const total = rows.reduce((a, r) => a + r.value, 0);

  return (
    <div className="flex items-center gap-6">
      <div className="relative h-[180px] w-[180px] shrink-0">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={rows}
              dataKey="value"
              innerRadius={55}
              outerRadius={85}
              paddingAngle={2}
              stroke="none"
            >
              {rows.map((r, i) => (
                <Cell key={i} fill={r.color} />
              ))}
            </Pie>
            <Tooltip
              formatter={(v: number, _n, entry) => [
                `${v} · ${currencyCompact((entry.payload as { cost: number }).cost)}`,
                entry.payload?.name as string,
              ]}
              contentStyle={{
                borderRadius: 12,
                border: '1px solid var(--color-line)',
                background: 'var(--color-surface)',
                color: 'var(--color-ink)',
                fontSize: 12,
              }}
            />
          </PieChart>
        </ResponsiveContainer>
        {/* Centre label */}
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <div className="font-display text-2xl font-bold">{number(total)}</div>
          <div className="eyebrow">resources</div>
        </div>
      </div>

      {/* Legend */}
      <div className="flex-1 space-y-3">
        {rows.map((r) => (
          <div key={r.name} className="flex items-center justify-between text-sm">
            <span className="flex items-center gap-2 font-medium">
              <span className="h-2.5 w-2.5 rounded-full" style={{ background: r.color }} />
              {r.name}
            </span>
            <span className="font-mono text-xs text-muted">
              {r.value} · {currencyCompact(r.cost)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
