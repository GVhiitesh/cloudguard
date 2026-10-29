import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Sparkles, Check } from 'lucide-react';
import { PageHeader } from '@/components/layout/PageShell';
import { Card, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { LoadingState, ErrorState, EmptyState } from '@/components/common/states';
import { useRecommendations, useApplyRecommendation } from '@/hooks/useAnomalies';
import { useToast } from '@/components/common/Toast';
import { apiErrorMessage } from '@/api/client';
import { currency, currencyCompact } from '@/lib/format';
import { useAuthStore } from '@/store/authStore';
import { can } from '@/lib/rbac';

export function Recommendations() {
  const role = useAuthStore((s) => s.user?.role);
  const toast = useToast();
  const [showApplied, setShowApplied] = useState(false);

  const { data, isLoading, isError, error, refetch } = useRecommendations(
    showApplied ? {} : { applied: false },
  );
  const applyReco = useApplyRecommendation();

  async function apply(id: string) {
    try {
      await applyReco.mutateAsync({ id, input: {} });
      toast.success('Recommendation applied');
    } catch (err) {
      toast.error(apiErrorMessage(err));
    }
  }

  if (isLoading) return <LoadingState />;
  if (isError) return <ErrorState error={error} onRetry={refetch} />;

  return (
    <div>
      <PageHeader
        title="Recommendations"
        subtitle="Optimization center — act on these to recover committed spend."
        actions={
          <label className="flex cursor-pointer items-center gap-2 text-sm text-muted">
            <input
              type="checkbox"
              checked={showApplied}
              onChange={(e) => setShowApplied(e.target.checked)}
              className="h-4 w-4 rounded border-line"
            />
            Show applied
          </label>
        }
      />

      {/* Headline saving */}
      <Card className="mb-4 border-lime bg-lime">
        <CardContent className="flex items-center justify-between">
          <div>
            <div className="eyebrow text-ink/60">Total potential monthly saving</div>
            <div className="mt-1 font-display text-4xl font-extrabold">
              {currency(data?.potentialMonthlySaving ?? 0)}
            </div>
          </div>
          <Sparkles className="h-10 w-10 text-ink/30" />
        </CardContent>
      </Card>

      {!data?.data.length ? (
        <Card className="p-0">
          <EmptyState
            icon={Check}
            title="Nothing to optimize"
            description="No open recommendations. Everything is already right-sized."
          />
        </Card>
      ) : (
        <div className="space-y-3">
          {data.data.map((rec) => (
            <Card key={rec.id}>
              <CardContent className="flex flex-wrap items-center justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <Badge variant={rec.applied ? 'healthy' : 'lime'} className="font-mono">
                      {String(rec.type)}
                    </Badge>
                    <Link
                      to={`/resources/${rec.resourceId}`}
                      className="font-display font-semibold hover:underline"
                    >
                      {rec.resource.name}
                    </Link>
                    {rec.applied && <Badge variant="healthy" size="sm">Applied</Badge>}
                  </div>
                  <p className="mt-1 text-sm text-muted">{rec.reason}</p>
                </div>

                <div className="text-right">
                  <div className="eyebrow">Est. saving</div>
                  <div className="font-display text-xl font-bold text-healthy-deep">
                    {currencyCompact(rec.estSaving)}/mo
                  </div>
                </div>

                {!rec.applied && can(role, 'APPLY_RECOMMENDATION') && (
                  <Button
                    variant="lime"
                    loading={applyReco.isPending}
                    onClick={() => apply(rec.id)}
                  >
                    Apply
                  </Button>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
