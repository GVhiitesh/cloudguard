import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Server,
  Clock,
  Activity,
  Star,
  Bell,
  DollarSign,
  Users,
  ScrollText,
  Settings,
  Cloud,
  MapPin,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/store/authStore';
import { can } from '@/lib/rbac';

interface NavItem {
  to: string;
  label: string;
  icon: typeof LayoutDashboard;
  adminOnly?: boolean;
}

interface NavGroup {
  heading: string;
  items: NavItem[];
}

const GROUPS: NavGroup[] = [
  { heading: 'Overview', items: [{ to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard }] },
  {
    heading: 'Infrastructure',
    items: [
      { to: '/resources', label: 'Resources', icon: Server },
      { to: '/idle', label: 'Idle Resources', icon: Clock },
      { to: '/topology', label: 'Topology Map', icon: MapPin },
    ],
  },
  {
    heading: 'Operations',
    items: [
      { to: '/anomalies', label: 'Anomalies', icon: Activity },
      { to: '/recommendations', label: 'Recommendations', icon: Star },
      { to: '/alerts', label: 'Alerts', icon: Bell },
    ],
  },
  { heading: 'FinOps', items: [{ to: '/budgets', label: 'Budgets', icon: DollarSign }] },
  {
    heading: 'Management',
    items: [
      { to: '/users', label: 'Users', icon: Users, adminOnly: true },
      { to: '/audit', label: 'Audit Logs', icon: ScrollText, adminOnly: true },
      { to: '/settings', label: 'Settings', icon: Settings },
    ],
  },
];

export function Sidebar() {
  const role = useAuthStore((s) => s.user?.role);

  return (
    <aside
      className="group/sb m-3 flex w-[72px] shrink-0 flex-col rounded-[28px] text-white transition-all duration-300 ease-in-out hover:w-60"
      style={{ height: 'calc(100% - 24px)', background: 'var(--color-sidebar-bg)' }}
    >
      {/* Brand */}
      <div className="flex items-center gap-3 px-5 py-5">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-card bg-white/5">
          <Cloud className="h-5 w-5 text-lime" />
        </div>
        <div className="min-w-0 overflow-hidden opacity-0 transition-opacity duration-200 group-hover/sb:opacity-100">
          <div className="flex items-center gap-1.5 whitespace-nowrap font-display font-bold">
            CloudGuard <span className="h-1.5 w-1.5 rounded-full bg-lime" />
          </div>
          <div className="whitespace-nowrap font-mono text-[10px] uppercase tracking-wider text-white/40">
            v2.4 Enterprise
          </div>
        </div>
      </div>

      <nav className="flex-1 space-y-6 overflow-y-auto overflow-x-hidden px-3 py-2">
        {GROUPS.map((group) => {
          const items = group.items.filter((i) => !i.adminOnly || can(role, 'MANAGE_USERS'));
          if (items.length === 0) return null;
          return (
            <div key={group.heading}>
              <div className="h-5 overflow-hidden px-3 pb-2 font-mono text-[10px] uppercase tracking-[0.12em] text-white/35 opacity-0 transition-opacity duration-200 group-hover/sb:opacity-100">
                {group.heading}
              </div>
              <div className="space-y-0.5">
                {items.map((item) => (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    title={item.label}
                    className={({ isActive }) =>
                      cn(
                        'flex items-center gap-3 rounded-card px-3 py-2 text-sm font-medium transition-colors',
                        isActive
                          ? 'bg-white/10 text-white'
                          : 'text-white/60 hover:bg-white/5 hover:text-white',
                      )
                    }
                  >
                    <item.icon className="h-[18px] w-[18px] shrink-0" />
                    <span className="overflow-hidden whitespace-nowrap opacity-0 transition-opacity duration-200 group-hover/sb:opacity-100">
                      {item.label}
                    </span>
                  </NavLink>
                ))}
              </div>
            </div>
          );
        })}
      </nav>

      {/* Status footer */}
      <div className="m-3 overflow-hidden rounded-card bg-white/5 p-3">
        <div className="flex items-center gap-2 text-sm font-medium">
          <span className="h-2 w-2 shrink-0 rounded-full bg-healthy" />
          <span className="overflow-hidden whitespace-nowrap opacity-0 transition-opacity duration-200 group-hover/sb:opacity-100">
            All Systems Operational
          </span>
        </div>
        <div className="mt-0.5 whitespace-nowrap font-mono text-[10px] text-white/40 opacity-0 transition-opacity duration-200 group-hover/sb:opacity-100">
          Last updated 2 mins ago
        </div>
      </div>
    </aside>
  );
}
