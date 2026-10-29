import { useNavigate } from 'react-router-dom';
import { Search, ChevronDown } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { NotificationDropdown } from '@/components/common/NotificationDropdown';

export function Topbar() {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  return (
    <header className="flex h-16 shrink-0 items-center gap-4 border-b border-line bg-canvas px-6">
      {/* Search — opens command palette */}
      <button
        onClick={() => window.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', ctrlKey: true }))}
        className="relative flex h-10 w-full max-w-md items-center gap-2 rounded-full border border-line bg-surface pl-11 pr-4 text-left text-sm text-muted-2 hover:border-ink/30"
      >
        <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-2" />
        Search resources, anomalies, users…
        <kbd className="ml-auto hidden rounded border border-line bg-panel px-1.5 py-0.5 font-mono text-[10px] sm:inline">
          Ctrl+K
        </kbd>
      </button>

      {/* Cluster status pill */}
      <div className="ml-auto hidden items-center gap-2 rounded-full border border-line bg-surface px-4 py-2 md:flex">
        <span className="h-2 w-2 rounded-full bg-healthy" />
        <span className="font-mono text-xs text-muted">Cluster us-east-k8s</span>
        <span className="font-mono text-xs font-semibold text-ink">99.99%</span>
      </div>

      {/* Notifications */}
      <NotificationDropdown />

      {/* User menu */}
      <div className="group relative">
        <button className="flex items-center gap-2.5 rounded-full border border-line bg-surface py-1.5 pl-1.5 pr-3 hover:bg-panel">
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-ink text-sm font-semibold text-white">
            {user?.name?.[0]?.toUpperCase() ?? '?'}
          </span>
          <span className="text-left">
            <span className="block text-sm font-semibold leading-tight">{user?.name}</span>
            <span className="block font-mono text-[10px] uppercase text-muted-2">
              {user?.role}
            </span>
          </span>
          <ChevronDown className="h-4 w-4 text-muted-2" />
        </button>
        <div className="invisible absolute right-0 top-full z-20 mt-2 w-44 rounded-card border border-line bg-surface p-1 opacity-0 shadow-pop transition-all group-hover:visible group-hover:opacity-100">
          <button
            onClick={() => {
              logout();
              navigate('/login');
            }}
            className="w-full rounded-lg px-3 py-2 text-left text-sm text-danger hover:bg-panel"
          >
            Sign out
          </button>
        </div>
      </div>
    </header>
  );
}
