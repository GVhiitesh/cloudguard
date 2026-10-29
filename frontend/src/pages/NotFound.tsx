import { Link } from 'react-router-dom';
import { Cloud } from 'lucide-react';

export function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-canvas text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-card bg-ink">
        <Cloud className="h-7 w-7 text-lime" />
      </div>
      <h1 className="font-display text-6xl font-extrabold">404</h1>
      <p className="text-muted">This page drifted out of the fleet.</p>
      <Link
        to="/dashboard"
        className="inline-flex h-10 items-center rounded-full bg-ink px-5 text-sm font-medium text-white hover:bg-ink-2"
      >
        Back to dashboard
      </Link>
    </div>
  );
}
