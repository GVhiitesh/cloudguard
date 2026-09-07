import { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search,
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
  MapPin,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/store/authStore';
import { can } from '@/lib/rbac';

interface PaletteItem {
  id: string;
  label: string;
  section: string;
  icon: React.ReactNode;
  path: string;
  keywords?: string;
  adminOnly?: boolean;
}

const ITEMS: PaletteItem[] = [
  { id: 'dashboard', label: 'Dashboard', section: 'Pages', icon: <LayoutDashboard className="h-4 w-4" />, path: '/dashboard', keywords: 'home overview' },
  { id: 'resources', label: 'Resources', section: 'Pages', icon: <Server className="h-4 w-4" />, path: '/resources', keywords: 'servers instances' },
  { id: 'idle', label: 'Idle Resources', section: 'Pages', icon: <Clock className="h-4 w-4" />, path: '/idle', keywords: 'unused waste' },
  { id: 'anomalies', label: 'Anomalies', section: 'Pages', icon: <Activity className="h-4 w-4" />, path: '/anomalies', keywords: 'alerts issues problems' },
  { id: 'recommendations', label: 'Recommendations', section: 'Pages', icon: <Star className="h-4 w-4" />, path: '/recommendations', keywords: 'optimize suggestions' },
  { id: 'alerts', label: 'Alerts', section: 'Pages', icon: <Bell className="h-4 w-4" />, path: '/alerts', keywords: 'notifications warnings' },
  { id: 'budgets', label: 'Budgets', section: 'Pages', icon: <DollarSign className="h-4 w-4" />, path: '/budgets', keywords: 'cost spend money' },
  { id: 'topology', label: 'Topology Map', section: 'Pages', icon: <MapPin className="h-4 w-4" />, path: '/topology', keywords: 'graph network connections' },
  { id: 'users', label: 'Users', section: 'Management', icon: <Users className="h-4 w-4" />, path: '/users', keywords: 'team members', adminOnly: true },
  { id: 'audit', label: 'Audit Logs', section: 'Management', icon: <ScrollText className="h-4 w-4" />, path: '/audit', keywords: 'history activity', adminOnly: true },
  { id: 'settings', label: 'Settings', section: 'Management', icon: <Settings className="h-4 w-4" />, path: '/settings', keywords: 'preferences dark mode theme' },
];

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();
  const role = useAuthStore((s) => s.user?.role);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setOpen((o) => !o);
      }
      if (e.key === 'Escape') setOpen(false);
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  useEffect(() => {
    if (open) {
      setQuery('');
      setActive(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  const filtered = useMemo(() => {
    const items = ITEMS.filter((i) => !i.adminOnly || can(role, 'MANAGE_USERS'));
    if (!query.trim()) return items;
    const q = query.toLowerCase();
    return items.filter(
      (i) =>
        i.label.toLowerCase().includes(q) ||
        i.section.toLowerCase().includes(q) ||
        i.keywords?.toLowerCase().includes(q),
    );
  }, [query, role]);

  function go(item: PaletteItem) {
    setOpen(false);
    navigate(item.path);
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActive((a) => Math.min(a + 1, filtered.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive((a) => Math.max(a - 1, 0));
    } else if (e.key === 'Enter' && filtered[active]) {
      go(filtered[active]);
    }
  }

  if (!open) return null;

  const sections = [...new Set(filtered.map((i) => i.section))];

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[20vh]" onClick={() => setOpen(false)}>
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" />
      <div
        className="relative w-full max-w-lg rounded-xl2 border border-line bg-surface shadow-pop"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 border-b border-line px-4 py-3">
          <Search className="h-5 w-5 shrink-0 text-muted-2" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => { setQuery(e.target.value); setActive(0); }}
            onKeyDown={onKeyDown}
            placeholder="Search pages, actions…"
            className="flex-1 bg-transparent text-sm text-ink outline-none placeholder:text-muted-2"
          />
          <kbd className="hidden rounded border border-line bg-panel px-1.5 py-0.5 font-mono text-[10px] text-muted-2 sm:inline">
            ESC
          </kbd>
        </div>

        <div className="max-h-72 overflow-y-auto p-2">
          {filtered.length === 0 && (
            <div className="px-3 py-8 text-center text-sm text-muted">No results found</div>
          )}
          {sections.map((section) => (
            <div key={section}>
              <div className="px-3 pb-1 pt-2 font-mono text-[10px] uppercase tracking-wider text-muted-2">
                {section}
              </div>
              {filtered
                .filter((i) => i.section === section)
                .map((item) => {
                  const idx = filtered.indexOf(item);
                  return (
                    <button
                      key={item.id}
                      onClick={() => go(item)}
                      onMouseEnter={() => setActive(idx)}
                      className={cn(
                        'flex w-full items-center gap-3 rounded-card px-3 py-2.5 text-left text-sm transition-colors',
                        idx === active ? 'bg-lime text-ink' : 'text-ink hover:bg-panel',
                      )}
                    >
                      <span className={idx === active ? 'text-ink' : 'text-muted-2'}>{item.icon}</span>
                      {item.label}
                    </button>
                  );
                })}
            </div>
          ))}
        </div>

        <div className="flex items-center gap-4 border-t border-line px-4 py-2 text-[10px] text-muted-2">
          <span><kbd className="rounded border border-line bg-panel px-1 py-0.5 font-mono">↑↓</kbd> navigate</span>
          <span><kbd className="rounded border border-line bg-panel px-1 py-0.5 font-mono">↵</kbd> open</span>
          <span><kbd className="rounded border border-line bg-panel px-1 py-0.5 font-mono">esc</kbd> close</span>
        </div>
      </div>
    </div>
  );
}
