import { PageHeader } from '@/components/layout/PageShell';
import { Card, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { LoadingState, ErrorState, EmptyState } from '@/components/common/states';
import { useBudgetStatus } from '@/hooks/useDashboard';
import { currency, percent } from '@/lib/format';
import type { BudgetState } from '@/types/api';
import { cn } from '@/lib/utils';

const STATE_STYLE: Record<BudgetState, { bar: string; badge: 'healthy' | 'warning' | 'danger'; label: string }> = {
  OK: { bar: 'bg-healthy', badge: 'healthy', label: 'On track' },
  WARNING: { bar: 'bg-warning', badge: 'warning', label: 'Warning' },
  PROJECTED_TO_EXCEED: { bar: 'bg-warning', badge: 'warning', label: 'Projected over' },
  EXCEEDED: { bar: 'bg-danger', badge: 'danger', label: 'Exceeded' },
};

export function Budgets() {
  const { data, isLoading, isError, error, refetch } = useBudgetStatus();

  if (isLoading) return <LoadingState />;
  if (isError) return <ErrorState error={error} onRetry={refetch} />;

  return (
    <div>
      <PageHeader
        title="Budgets"
        subtitle="Financial governance — spend against limits, month to date."
      />

      {!data?.data.length ? (
        <Card className="p-0">
          <EmptyState
            title="No budgets set"
            description="An admin can create budgets scoped to global, an environment, or an owner."
          />
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {data.data.map((entry) => {
            const style = STATE_STYLE[entry.state];
            const scopeLabel =
              entry.budget.scope === 'GLOBAL'
                ? 'Global'
                : `${entry.budget.scope} · ${entry.budget.scopeValue}`;
            return (
              <Card key={entry.budget.id}>
                <CardContent className="space-y-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="font-display font-bold">{scopeLabel}</div>
                      <div className="text-sm text-muted">
                        Limit {currency(entry.limitPerMonth)}/mo
                      </div>
                    </div>
                    <Badge variant={style.badge}>{style.label}</Badge>
                  </div>

                  <div>
                    <div className="mb-1.5 flex items-center justify-between text-sm">
                      <span className="font-mono font-semibold">
                        {currency(entry.spendToDate)}
                      </span>
                      <span className="text-muted">{percent(entry.utilizationPct)}</span>
                    </div>
                    <div className="h-2.5 overflow-hidden rounded-full bg-panel">
                      <div
                        className={cn('h-full rounded-full transition-all', style.bar)}
                        style={{ width: `${Math.min(100, entry.utilizationPct)}%` }}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 border-t border-line pt-3 text-sm">
                    <div>
                      <div className="eyebrow">Projected month-end</div>
                      <div className="mt-0.5 font-mono font-semibold">
                        {currency(entry.projectedMonthEnd)}
                      </div>
                    </div>
                    <div>
                      <div className="eyebrow">Remaining</div>
                      <div
                        className={cn(
                          'mt-0.5 font-mono font-semibold',
                          entry.remaining < 0 ? 'text-danger' : 'text-ink',
                        )}
                      >
                        {currency(entry.remaining)}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
