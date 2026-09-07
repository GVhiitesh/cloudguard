import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';
import { Card, CardContent } from '@/components/ui/Card';
import { useCostForecast } from '@/hooks/useDashboard';
import { Skeleton } from '@/components/common/states';

export function ForecastChart({ days = 30 }: { days?: number }) {
  const { data, isLoading } = useCostForecast(days);

  if (isLoading) return <Skeleton className="h-80" />;
  if (!data) return null;

  const combined = [
    ...data.historySeries.map((d: any) => ({ date: d.date, actual: d.cost, forecast: null })),
    ...data.forecastSeries.map((d: any) => ({ date: d.date, actual: null, forecast: d.cost })),
  ];

  // Bridge: last history point also gets forecast value for continuity
  if (data.historySeries.length > 0 && combined.length > data.historySeries.length) {
    const bridgeIdx = data.historySeries.length - 1;
    combined[bridgeIdx].forecast = combined[bridgeIdx].actual;
  }

  return (
    <Card>
      <CardContent className="p-5">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h3 className="font-display text-lg font-bold text-ink">Cost Forecast</h3>
            <p className="text-xs text-muted">
              {days}-day history + {days}-day projection
            </p>
          </div>
          <div className="flex gap-4 text-xs">
            <div className="flex items-center gap-1.5">
              <span className="h-2 w-6 rounded-full" style={{ background: 'var(--color-lime)' }} />
              <span className="text-muted">Actual</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="h-2 w-6 rounded-full opacity-50" style={{ background: 'var(--color-lime)' }} />
              <span className="text-muted">Forecast</span>
            </div>
          </div>
        </div>

        <div className="flex gap-6 mb-4">
          <div>
            <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-2">Past {days}d</div>
            <div className="font-display text-xl font-bold text-ink">₹{data.historyTotal.toLocaleString()}</div>
          </div>
          <div>
            <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-2">Projected {days}d</div>
            <div className="font-display text-xl font-bold text-lime">₹{data.forecastTotal.toLocaleString()}</div>
          </div>
          <div>
            <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-2">Avg/Day</div>
            <div className="font-display text-xl font-bold text-ink">₹{data.avgPerDay.toLocaleString()}</div>
          </div>
        </div>

        <ResponsiveContainer width="100%" height={260}>
          <AreaChart data={combined} margin={{ top: 5, right: 10, left: 10, bottom: 0 }}>
            <defs>
              <linearGradient id="actualGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="var(--color-lime)" stopOpacity={0.3} />
                <stop offset="95%" stopColor="var(--color-lime)" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="forecastGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="var(--color-lime)" stopOpacity={0.15} />
                <stop offset="95%" stopColor="var(--color-lime)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--color-line)" vertical={false} />
            <XAxis
              dataKey="date"
              tick={{ fill: 'var(--color-muted-2)', fontSize: 10 }}
              tickFormatter={(v) => v.slice(5)}
              interval="preserveStartEnd"
            />
            <YAxis
              tick={{ fill: 'var(--color-muted-2)', fontSize: 10 }}
              tickFormatter={(v) => `₹${v}`}
              width={60}
            />
            <Tooltip
              contentStyle={{
                background: 'var(--color-surface)',
                border: '1px solid var(--color-line)',
                borderRadius: 8,
                color: 'var(--color-ink)',
                fontSize: 12,
              }}
              formatter={(val: number, name: string) => [`₹${val.toLocaleString()}`, name === 'actual' ? 'Actual' : 'Forecast']}
              labelFormatter={(label) => label}
            />
            <ReferenceLine
              x={data.historySeries[data.historySeries.length - 1]?.date}
              stroke="var(--color-muted-2)"
              strokeDasharray="3 3"
              label={{ value: 'Today', fill: 'var(--color-muted-2)', fontSize: 10 }}
            />
            <Area
              type="monotone"
              dataKey="actual"
              stroke="var(--color-lime)"
              strokeWidth={2}
              fill="url(#actualGrad)"
              connectNulls={false}
            />
            <Area
              type="monotone"
              dataKey="forecast"
              stroke="var(--color-lime)"
              strokeWidth={2}
              strokeDasharray="6 3"
              fill="url(#forecastGrad)"
              connectNulls={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
