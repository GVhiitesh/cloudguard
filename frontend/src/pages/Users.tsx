import { useMemo, useState } from 'react';
import { Trash2, Download, Plus, ShieldCheck, KeyRound } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/Card';
import { Select } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { LoadingState, ErrorState, EmptyState } from '@/components/common/states';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import { useUsers, useUpdateUser, useDeleteUser } from '@/hooks/useDashboard';
import { useToast } from '@/components/common/Toast';
import { apiErrorMessage } from '@/api/client';
import { relativeTime } from '@/lib/format';
import { useAuthStore } from '@/store/authStore';
import { cn } from '@/lib/utils';
import type { Role, User } from '@/types/api';

type Tab = 'ALL' | Role;

const TABS: { key: Tab; label: string }[] = [
  { key: 'ALL', label: 'All Users' },
  { key: 'ADMIN', label: 'Admins' },
  { key: 'EDITOR', label: 'Editors' },
  { key: 'VIEWER', label: 'Viewers' },
];

const ROLE_STYLE: Record<Role, string> = {
  ADMIN: 'bg-ink text-white',
  EDITOR: 'bg-info-bg text-info',
  VIEWER: 'bg-panel text-muted border border-line',
};

const AVATAR_HUES = ['#111315', '#059669', '#D97706', '#2563EB', '#7C3AED', '#0891B2'];
const avatarColor = (name: string) =>
  AVATAR_HUES[[...name].reduce((a, c) => a + c.charCodeAt(0), 0) % AVATAR_HUES.length];

export function UsersPage() {
  const me = useAuthStore((s) => s.user);
  const toast = useToast();
  const { data, isLoading, isError, error, refetch } = useUsers();
  const updateUser = useUpdateUser();
  const deleteUser = useDeleteUser();
  const [tab, setTab] = useState<Tab>('ALL');
  const [sort, setSort] = useState<'recent' | 'name'>('recent');
  const [deleting, setDeleting] = useState<User | undefined>();

  const stats = useMemo(() => {
    const users = data?.data ?? [];
    return {
      total: users.length,
      admins: users.filter((u) => u.role === 'ADMIN').length,
      editors: users.filter((u) => u.role === 'EDITOR').length,
      viewers: users.filter((u) => u.role === 'VIEWER').length,
    };
  }, [data]);

  const rows = useMemo(() => {
    const users = data?.data ?? [];
    const filtered = tab === 'ALL' ? users : users.filter((u) => u.role === tab);
    return sort === 'name'
      ? [...filtered].sort((a, b) => a.name.localeCompare(b.name))
      : [...filtered].sort(
          (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
        );
  }, [data, tab, sort]);

  async function changeRole(id: string, role: Role) {
    try {
      await updateUser.mutateAsync({ id, input: { role } });
      toast.success('Role updated');
    } catch (err) {
      toast.error(apiErrorMessage(err));
    }
  }

  async function confirmDelete() {
    if (!deleting) return;
    try {
      await deleteUser.mutateAsync(deleting.id);
      toast.success('User deleted');
      setDeleting(undefined);
    } catch (err) {
      toast.error(apiErrorMessage(err));
    }
  }

  if (isLoading) return <LoadingState />;
  if (isError) return <ErrorState error={error} onRetry={refetch} />;

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="mb-2 flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-lime" />
            <span className="eyebrow">Workspace Access & Identity · RBAC Governance</span>
          </div>
          <h1 className="font-display text-3xl font-bold text-ink">Users</h1>
          <p className="mt-1 text-sm text-muted">
            Manage access to your CloudGuard workspace, provision roles, and enforce security
            policies.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline">
            <Download className="h-4 w-4" /> Export Access Directory
          </Button>
          <Button
            variant="lime"
            onClick={() => toast.info('New users self-register at /register')}
          >
            <Plus className="h-4 w-4" /> Add User
          </Button>
        </div>
      </div>

      {/* Stat row */}
      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatTile
          eyebrow="Total Seats"
          value={String(stats.total).padStart(2, '0')}
          suffix={<span className="font-mono text-sm text-muted-2">/ 25 Seats</span>}
          badge={
            <Badge variant="healthy" size="sm">
              {25 - stats.total} Available
            </Badge>
          }
          footnote={`${Math.round((stats.total / 25) * 100)}% seat allocation used across teams`}
        />
        <StatTile
          eyebrow="Active Admins"
          value={String(stats.admins)}
          suffix={<span className="text-sm text-muted-2">Admins</span>}
          footnote={
            <span className="flex items-center gap-1.5">
              <ShieldCheck className="h-3.5 w-3.5 text-healthy-deep" />
              Privileged Access Monitored
            </span>
          }
        />
        <StatTile
          eyebrow="Active Editors"
          value={String(stats.editors)}
          suffix={<span className="text-sm text-muted-2">Editors</span>}
          footnote={
            <span className="flex items-center gap-1.5">
              <ShieldCheck className="h-3.5 w-3.5 text-info" />
              Standard Deploy Access
            </span>
          }
        />
        <StatTile
          eyebrow="Viewers & Audit"
          value={String(stats.viewers)}
          suffix={<span className="text-sm text-muted-2">Viewers</span>}
          footnote={
            <span className="flex items-center gap-1.5">
              <ShieldCheck className="h-3.5 w-3.5 text-muted" />
              Audit & Financial Visibility
            </span>
          }
        />
      </div>

      {/* Filter bar */}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="flex gap-1 rounded-full bg-panel p-1">
          {TABS.map((t) => {
            const count =
              t.key === 'ALL'
                ? stats.total
                : t.key === 'ADMIN'
                  ? stats.admins
                  : t.key === 'EDITOR'
                    ? stats.editors
                    : stats.viewers;
            return (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={cn(
                  'flex items-center gap-2 rounded-full px-4 py-1.5 text-sm font-medium transition-colors',
                  tab === t.key ? 'bg-ink text-white' : 'text-muted hover:text-ink',
                )}
              >
                {t.label}
                <span
                  className={cn(
                    'font-mono text-[10px]',
                    tab === t.key ? 'text-white/60' : 'text-muted-2',
                  )}
                >
                  ({count})
                </span>
              </button>
            );
          })}
        </div>

        <div className="ml-auto flex items-center gap-2">
          <Select value="ALL" onChange={() => {}}>
            <option value="ALL">All Cost Centers / Teams</option>
          </Select>
          <Select value={sort} onChange={(e) => setSort(e.target.value as 'recent' | 'name')}>
            <option value="recent">Sort: Recent Activity</option>
            <option value="name">Sort: Name (A–Z)</option>
          </Select>
        </div>
      </div>

      {!rows.length ? (
        <Card className="p-0">
          <EmptyState title="No users match this filter" />
        </Card>
      ) : (
        <Card className="overflow-hidden p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-line text-left">
                  <th className="w-10 px-4 py-3">
                    <input type="checkbox" className="h-4 w-4 rounded border-line" />
                  </th>
                  {['User & Workspace ID', 'Role', 'Status', '2FA Security', 'Last Active', ''].map(
                    (h) => (
                      <th key={h} className="eyebrow px-4 py-3 font-medium">
                        {h}
                      </th>
                    ),
                  )}
                </tr>
              </thead>
              <tbody>
                {rows.map((u) => {
                  const isSelf = u.id === me?.id;
                  return (
                    <tr key={u.id} className="border-b border-line last:border-0 hover:bg-panel">
                      <td className="px-4 py-3">
                        <input type="checkbox" className="h-4 w-4 rounded border-line" />
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <span
                            className="flex h-9 w-9 items-center justify-center rounded-full text-sm font-semibold text-white"
                            style={{ background: avatarColor(u.name) }}
                          >
                            {u.name[0]?.toUpperCase()}
                          </span>
                          <div>
                            <div className="flex items-center gap-2 font-medium">
                              {u.name}
                              {isSelf && (
                                <Badge variant="lime" size="sm">
                                  You
                                </Badge>
                              )}
                            </div>
                            <div className="font-mono text-xs text-muted-2">{u.email}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        {isSelf ? (
                          <span
                            className={cn(
                              'inline-flex items-center rounded-full px-3 py-1 text-xs font-medium',
                              ROLE_STYLE[u.role],
                            )}
                          >
                            {u.role}
                          </span>
                        ) : (
                          <Select
                            value={u.role}
                            onChange={(e) => changeRole(u.id, e.target.value as Role)}
                            className={cn('h-8 border-none text-xs font-medium', ROLE_STYLE[u.role])}
                          >
                            <option value="ADMIN">ADMIN</option>
                            <option value="EDITOR">EDITOR</option>
                            <option value="VIEWER">VIEWER</option>
                          </Select>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant="healthy" dot>
                          Active
                        </Badge>
                      </td>
                      <td className="px-4 py-3">
                        <span className="flex items-center gap-1.5 text-xs text-muted">
                          <KeyRound className="h-3.5 w-3.5" /> Password
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-muted">
                        {relativeTime(u.createdAt)}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {!isSelf && (
                          <button
                            onClick={() => setDeleting(u)}
                            className="rounded-full p-2 text-muted hover:bg-danger-bg hover:text-danger"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      <ConfirmDialog
        open={Boolean(deleting)}
        onClose={() => setDeleting(undefined)}
        onConfirm={confirmDelete}
        title="Delete user?"
        description={`Remove "${deleting?.name}" from the workspace. They must own no resources.`}
        confirmLabel="Delete"
        danger
        loading={deleteUser.isPending}
      />
    </div>
  );
}

function StatTile({
  eyebrow,
  value,
  suffix,
  badge,
  footnote,
}: {
  eyebrow: string;
  value: string;
  suffix?: React.ReactNode;
  badge?: React.ReactNode;
  footnote?: React.ReactNode;
}) {
  return (
    <Card>
      <CardContent className="space-y-3">
        <div className="flex items-start justify-between">
          <span className="eyebrow">{eyebrow}</span>
          {badge}
        </div>
        <div className="flex items-baseline gap-2">
          <span className="font-display text-3xl font-bold text-ink">{value}</span>
          {suffix}
        </div>
        <div className="border-t border-line pt-3 text-xs text-muted">{footnote}</div>
      </CardContent>
    </Card>
  );
}
