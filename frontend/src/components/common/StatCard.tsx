import { ArrowUp, ArrowDown } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StatCardProps {
  label: string;
  value: React.ReactNode;
  icon: React.ReactNode;
  /** Small trend chip, e.g. "+12%". */
  delta?: { value: string; direction: 'up' | 'down'; good?: boolean };
  footnote?: React.ReactNode;
  /** The design highlights the cost card in lime. */
  highlight?: boolean;
}

export function StatCard({ label, value, icon, delta, footnote, highlight }: StatCardProps) {
  return (
    <div
      className={cn(
        'flex flex-col gap-3 rounded-panel border p-5',
        highlight ? 'border-lime bg-lime shadow-card' : 'border-line bg-surface shadow-card',
      )}
    >
      <div className="flex items-start justify-between">
        <span className={cn('eyebrow', highlight && 'text-ink/60')}>{label}</span>
        <span
          className={cn(
            'flex h-8 w-8 items-center justify-center rounded-full',
            highlight ? 'bg-ink text-lime' : 'bg-panel text-ink',
          )}
        >
          {icon}
        </span>
      </div>

      <div className={cn('font-display text-3xl font-bold', highlight ? 'text-ink' : 'text-ink')}>{value}</div>

      <div className={cn('flex items-center gap-2 border-t pt-3 text-xs', highlight ? 'border-black/10' : 'border-line')}>
        {delta && (
          <span
            className={cn(
              'inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 font-medium',
              delta.good === false
                ? 'bg-danger-bg text-danger'
                : delta.good
                  ? 'bg-healthy-bg text-healthy-deep'
                  : 'bg-panel text-muted',
              highlight && 'bg-ink/10 text-ink',
            )}
          >
            {delta.direction === 'up' ? (
              <ArrowUp className="h-3 w-3" />
            ) : (
              <ArrowDown className="h-3 w-3" />
            )}
            {delta.value}
          </span>
        )}
        {footnote && <span className={cn('text-muted', highlight && 'text-ink/60')}>{footnote}</span>}
      </div>
    </div>
  );
}
