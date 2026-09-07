import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const badgeVariants = cva(
  'inline-flex items-center gap-1.5 rounded-full font-medium whitespace-nowrap',
  {
    variants: {
      variant: {
        neutral: 'bg-panel text-muted border border-line',
        lime: 'bg-lime text-ink',
        healthy: 'bg-healthy-bg text-healthy-deep',
        warning: 'bg-warning-bg text-warning',
        danger: 'bg-danger-bg text-danger',
        info: 'bg-info-bg text-info',
        ink: 'bg-ink text-white',
        outline: 'border border-line text-muted',
      },
      size: {
        sm: 'px-2 py-0.5 text-[10px]',
        md: 'px-2.5 py-1 text-xs',
      },
    },
    defaultVariants: { variant: 'neutral', size: 'md' },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {
  dot?: boolean;
}

export function Badge({ className, variant, size, dot, children, ...props }: BadgeProps) {
  return (
    <span className={cn(badgeVariants({ variant, size }), className)} {...props}>
      {dot && <span className="h-1.5 w-1.5 rounded-full bg-current" />}
      {children}
    </span>
  );
}
