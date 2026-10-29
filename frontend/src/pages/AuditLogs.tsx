import { useQuery } from '@tanstack/react-query';
import { PageHeader } from '@/components/layout/PageShell';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { LoadingState, ErrorState, EmptyState } from '@/components/common/states';
import { ExportButton } from '@/components/common/ExportButton';
import { listAudit } from '@/api/audit';
import { dateTime } from '@/lib/format';

export function AuditLogs() {
  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['audit', 'list'],
    queryFn: () => listAudit({ pageSize: 100 }),
  });

  if (isLoading) return <LoadingState />;
  if (isError) return <ErrorState error={error} onRetry={refetch} />;

  return (
    <div>
      <PageHeader
        title="Audit Logs"
        subtitle="Every write across the platform, most recent first."
        actions={<ExportButton endpoint="audit.csv" filename="cloudguard-audit.csv" />}
      />

      {!data?.data.length ? (
        <Card className="p-0">
          <EmptyState title="No audit entries" />
        </Card>
      ) : (
        <Card className="overflow-hidden p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-line text-left">
                  {['When', 'Actor', 'Action', 'Entity', 'Entity ID'].map((h) => (
                    <th key={h} className="eyebrow px-4 py-3 font-medium">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.data.map((row) => (
                  <tr key={row.id} className="border-b border-line last:border-0 hover:bg-panel">
                    <td className="whitespace-nowrap px-4 py-3 text-xs text-muted">
                      {dateTime(row.createdAt)}
                    </td>
                    <td className="px-4 py-3">
                      {row.actor?.name ?? row.actorId}
                      {row.actorId === 'SYSTEM' && (
                        <Badge variant="lime" size="sm" className="ml-2">
                          system
                        </Badge>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant="neutral" className="font-mono">
                        {row.action}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-muted">{row.entity}</td>
                    <td className="px-4 py-3 font-mono text-xs text-muted-2">
                      {row.entityId.slice(0, 12)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}
