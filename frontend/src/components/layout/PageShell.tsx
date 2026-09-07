import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';
import { CommandPalette } from '@/components/common/CommandPalette';
import { ToastContainer } from '@/components/common/ToastContainer';
import { OnboardingTour } from '@/components/common/OnboardingTour';

/**
 * The persistent frame: sidebar + topbar + scrolling body.
 *
 * The design was authored at 1440×900. We reserve a min-w so the console
 * layout is never squeezed narrower than intended, and cap max-w so ultra-wide
 * monitors do not stretch the whole thing into a wall of whitespace.
 */
export function PageShell() {
  return (
    <div className="h-screen w-screen overflow-hidden bg-canvas">
      <CommandPalette />
      <ToastContainer />
      <OnboardingTour />
      <div className="flex h-screen w-full overflow-hidden">
        <Sidebar />
        <div className="flex flex-1 flex-col overflow-hidden">
          <Topbar />
          <main className="flex-1 overflow-y-auto px-6 py-6">
            <Outlet />
          </main>
        </div>
      </div>
    </div>
  );
}

export function PageHeader({
  title,
  subtitle,
  actions,
}: {
  title: React.ReactNode;
  subtitle?: string;
  actions?: React.ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
      <div>
        <h1 className="font-display text-2xl font-bold text-ink">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-muted">{subtitle}</p>}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}
