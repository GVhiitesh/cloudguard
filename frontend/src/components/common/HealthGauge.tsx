import { cn } from '@/lib/utils';

/** Circular 0–100 health ring, as on the twin header. Colour follows the score. */
export function HealthGauge({ score, size = 56 }: { score: number; size?: number }) {
  const stroke = 5;
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const pct = Math.max(0, Math.min(100, score)) / 100;
  const color = score >= 80 ? '#10B981' : score >= 50 ? '#D97706' : '#DC2626';

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--color-line)" strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circ}
          strokeDashoffset={circ * (1 - pct)}
        />
      </svg>
      <span className={cn('absolute font-display font-bold', size > 44 ? 'text-base' : 'text-xs')}>
        {Math.round(score)}
      </span>
    </div>
  );
}
