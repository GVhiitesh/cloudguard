import { forwardRef } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink/20 disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        // Dark pill — the primary action ("+ Add Resource", "Resolve")
        primary: 'bg-ink text-white hover:bg-ink-2',
        // Lime — the standout affirmative ("Apply Recommendation")
        lime: 'bg-lime text-ink hover:bg-lime-bright font-semibold',
        outline: 'border border-line bg-surface text-ink hover:bg-panel',
        ghost: 'text-ink hover:bg-panel',
        danger: 'bg-danger text-white hover:bg-danger/90',
        subtle: 'bg-panel text-ink hover:bg-panel-2',
      },
      size: {
        sm: 'h-8 px-3 text-[13px] rounded-full',
        md: 'h-10 px-4 text-sm rounded-full',
        lg: 'h-11 px-5 text-sm rounded-full',
        icon: 'h-9 w-9 rounded-full',
      },
    },
    defaultVariants: { variant: 'primary', size: 'md' },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  loading?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, loading, children, disabled, ...props }, ref) => (
    <button
      ref={ref}
      className={cn(buttonVariants({ variant, size }), className)}
      disabled={disabled || loading}
      {...props}
    >
      {loading && <Loader2 className="h-4 w-4 animate-spin" />}
      {children}
    </button>
  ),
);
Button.displayName = 'Button';
