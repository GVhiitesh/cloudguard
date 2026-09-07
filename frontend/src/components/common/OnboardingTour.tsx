import { useState, useEffect } from 'react';
import { X, ChevronRight, ChevronLeft, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TourStep {
  title: string;
  description: string;
  icon: string;
}

const STEPS: TourStep[] = [
  {
    title: 'Welcome to CloudGuard',
    description: 'Your command center for cloud infrastructure monitoring, anomaly detection, and cost optimization. Let\'s take a quick tour.',
    icon: '☁️',
  },
  {
    title: 'Dashboard Overview',
    description: 'The dashboard shows real-time stats: resource counts, monthly costs, open anomalies, and idle resources. Charts below show trends over time.',
    icon: '📊',
  },
  {
    title: 'Resource Digital Twins',
    description: 'Click any resource to view its Digital Twin — a live mirror showing health score, CPU/memory metrics, cost history, and lifecycle state.',
    icon: '🔮',
  },
  {
    title: 'Anomaly Detection',
    description: 'CloudGuard automatically detects cost spikes and usage anomalies. Admins can also trigger manual scans from the Anomalies page.',
    icon: '⚡',
  },
  {
    title: 'Topology Map',
    description: 'Visualize all your resources grouped by environment. Click nodes to jump to their details. Color indicates health status.',
    icon: '🗺️',
  },
  {
    title: 'Cost Forecasting',
    description: 'The dashboard includes a cost forecast chart that projects your next 30 days of spend based on historical trends.',
    icon: '📈',
  },
  {
    title: 'Dark Mode & Settings',
    description: 'Toggle dark mode in Settings → Appearance. Use Ctrl+K anytime to quickly search and navigate across all pages.',
    icon: '🌙',
  },
  {
    title: 'You\'re all set!',
    description: 'Start exploring your cloud infrastructure. You can always find this tour again in Settings.',
    icon: '🚀',
  },
];

const STORAGE_KEY = 'cloudguard-onboarding-done';

export function OnboardingTour() {
  const [active, setActive] = useState(false);
  const [step, setStep] = useState(0);

  useEffect(() => {
    try {
      if (!localStorage.getItem(STORAGE_KEY)) {
        setActive(true);
      }
    } catch {}
  }, []);

  function dismiss() {
    setActive(false);
    try { localStorage.setItem(STORAGE_KEY, '1'); } catch {}
  }

  function next() {
    if (step < STEPS.length - 1) setStep(step + 1);
    else dismiss();
  }

  function prev() {
    if (step > 0) setStep(step - 1);
  }

  if (!active) return null;

  const s = STEPS[step];
  const isLast = step === STEPS.length - 1;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" onClick={dismiss}>
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" />
      <div
        className="relative w-full max-w-md rounded-xl2 border border-line bg-surface p-0 shadow-pop"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Progress bar */}
        <div className="flex gap-1 px-6 pt-5">
          {STEPS.map((_, i) => (
            <div
              key={i}
              className={cn(
                'h-1 flex-1 rounded-full transition-colors',
                i <= step ? 'bg-lime' : 'bg-line',
              )}
            />
          ))}
        </div>

        {/* Close button */}
        <button
          onClick={dismiss}
          className="absolute right-4 top-4 rounded-full p-1 text-muted-2 hover:bg-panel hover:text-ink"
        >
          <X className="h-4 w-4" />
        </button>

        {/* Content */}
        <div className="px-6 pb-2 pt-6">
          <div className="mb-4 text-4xl">{s.icon}</div>
          <h3 className="font-display text-xl font-bold text-ink">{s.title}</h3>
          <p className="mt-2 text-sm leading-relaxed text-muted">{s.description}</p>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-line px-6 py-4">
          <span className="text-xs text-muted-2">
            {step + 1} of {STEPS.length}
          </span>
          <div className="flex gap-2">
            {step > 0 && (
              <button
                onClick={prev}
                className="inline-flex h-9 items-center gap-1 rounded-full border border-line bg-surface px-3 text-sm font-medium text-ink hover:bg-panel"
              >
                <ChevronLeft className="h-4 w-4" /> Back
              </button>
            )}
            <button
              onClick={next}
              className="inline-flex h-9 items-center gap-1 rounded-full bg-lime px-4 text-sm font-semibold text-ink hover:brightness-95"
            >
              {isLast ? 'Get Started' : 'Next'} {!isLast && <ChevronRight className="h-4 w-4" />}
            </button>
          </div>
        </div>

        {/* Skip link */}
        <div className="border-t border-line px-6 py-2.5 text-center">
          <button onClick={dismiss} className="text-xs text-muted-2 hover:text-ink">
            Skip tour
          </button>
        </div>
      </div>
    </div>
  );
}

export function resetOnboarding() {
  try { localStorage.removeItem(STORAGE_KEY); } catch {}
}
