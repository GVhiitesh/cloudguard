import { Check } from 'lucide-react';
import { LIFECYCLES } from '@/types/api';
import type { Lifecycle } from '@/types/api';
import { cn } from '@/lib/utils';

/** Horizontal ACTIVE → IDLE → FLAGGED → REVIEWED → ARCHIVED strip. */
export function LifecycleStrip({ current }: { current: Lifecycle }) {
  const currentIndex = LIFECYCLES.indexOf(current);

  return (
    <div className="flex items-center gap-2 overflow-x-auto">
      <span className="eyebrow shrink-0 pr-2">Lifecycle State</span>
      {LIFECYCLES.map((stage, i) => {
        const done = i < currentIndex;
        const active = i === currentIndex;
        return (
          <div key={stage} className="flex items-center gap-2">
            <span
              className={cn(
                'inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-colors',
                active && 'bg-lime text-ink',
                done && 'bg-panel text-ink',
                !active && !done && 'text-muted-2',
              )}
            >
              {done ? (
                <Check className="h-3 w-3" />
              ) : (
                <span className={cn('h-1.5 w-1.5 rounded-full', active ? 'bg-ink' : 'bg-muted-2')} />
              )}
              {stage}
              {active && (
                <span className="ml-1 rounded-full bg-ink/10 px-1.5 py-0.5 text-[9px] font-bold uppercase">
                  Current
                </span>
              )}
            </span>
            {i < LIFECYCLES.length - 1 && <span className="text-line-2">→</span>}
          </div>
        );
      })}
    </div>
  );
}
