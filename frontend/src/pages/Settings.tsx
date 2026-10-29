import { useState } from 'react';
import { Zap, Play, RadioTower, Moon, Sun, RotateCcw } from 'lucide-react';
import { PageHeader } from '@/components/layout/PageShell';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input, Label } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { useInjectSpike, useRunDetection } from '@/hooks/useDashboard';
import { useToast } from '@/components/common/Toast';
import { apiErrorMessage } from '@/api/client';
import { useAuthStore } from '@/store/authStore';
import { useThemeStore } from '@/store/themeStore';
import { can } from '@/lib/rbac';
import { resetOnboarding } from '@/components/common/OnboardingTour';

export function Settings() {
  const user = useAuthStore((s) => s.user);
  const toast = useToast();
  const [resourceId, setResourceId] = useState('');
  const [multiplier, setMultiplier] = useState('3.5');
  const inject = useInjectSpike();
  const detect = useRunDetection();
  const { dark, toggle } = useThemeStore();

  const isAdmin = can(user?.role, 'RUN_SIMULATOR');

  async function fireSpike() {
    if (!resourceId.trim()) return toast.error('Paste a resource ID first');
    try {
      const res = await inject.mutateAsync({
        resourceId: resourceId.trim(),
        costMultiplier: Number(multiplier),
      });
      toast.success(
        res.detection ? `Injected — ${res.detection.created} anomaly created` : 'Spike injected',
      );
    } catch (err) {
      toast.error(apiErrorMessage(err));
    }
  }

  async function runDetect() {
    try {
      await detect.mutateAsync();
      toast.success('Detection run complete');
    } catch (err) {
      toast.error(apiErrorMessage(err));
    }
  }

  return (
    <div>
      <PageHeader title="Settings" subtitle="Account, appearance, and demo controls." />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <div className="p-5 pb-0">
            <h3 className="font-display text-lg font-bold">Profile</h3>
          </div>
          <CardContent className="space-y-3">
            <Row label="Name" value={user?.name ?? '—'} />
            <Row label="Email" value={user?.email ?? '—'} />
            <Row label="Role" value={<Badge variant="ink">{user?.role}</Badge>} />
          </CardContent>
        </Card>

        <Card>
          <div className="p-5 pb-0">
            <h3 className="font-display text-lg font-bold">Appearance</h3>
          </div>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-medium">Dark Mode</div>
                <div className="text-xs text-muted">Switch between light and dark theme</div>
              </div>
              <button
                onClick={toggle}
                className="relative flex h-10 w-20 items-center rounded-full border border-line p-1 transition-colors"
                style={{ background: dark ? 'var(--color-lime)' : 'var(--color-panel)' }}
              >
                <span
                  className="flex h-8 w-8 items-center justify-center rounded-full bg-ink shadow-card transition-transform"
                  style={{ transform: dark ? 'translateX(38px)' : 'translateX(0)' }}
                >
                  {dark ? <Moon className="h-4 w-4 text-lime" /> : <Sun className="h-4 w-4 text-white" />}
                </span>
              </button>
            </div>
            <div className="flex items-center justify-between border-t border-line pt-4">
              <div>
                <div className="text-sm font-medium">Onboarding Tour</div>
                <div className="text-xs text-muted">Replay the welcome walkthrough</div>
              </div>
              <button
                onClick={() => { resetOnboarding(); window.location.reload(); }}
                className="inline-flex h-9 items-center gap-2 rounded-full border border-line bg-surface px-3 text-xs font-medium text-ink hover:bg-panel"
              >
                <RotateCcw className="h-3.5 w-3.5" /> Restart Tour
              </button>
            </div>
          </CardContent>
        </Card>

        {isAdmin && (
          <Card className="border-lime/40">
            <div className="flex items-center justify-between p-5 pb-0">
              <h3 className="font-display text-lg font-bold">Demo Controls</h3>
              <Badge variant="lime">Admin</Badge>
            </div>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted">
                Inject a live cost spike into a resource, then run detection — the anomaly appears
                on that resource's twin immediately.
              </p>
              <div>
                <Label>Resource ID</Label>
                <Input
                  value={resourceId}
                  onChange={(e) => setResourceId(e.target.value)}
                  placeholder="Paste a resource UUID"
                  className="font-mono text-xs"
                />
              </div>
              <div>
                <Label>Cost multiplier</Label>
                <Input
                  type="number"
                  step="0.5"
                  min="1"
                  value={multiplier}
                  onChange={(e) => setMultiplier(e.target.value)}
                />
              </div>
              <div className="flex gap-2">
                <Button variant="lime" className="flex-1" loading={inject.isPending} onClick={fireSpike}>
                  <Zap className="h-4 w-4" /> Inject spike
                </Button>
                <Button variant="outline" loading={detect.isPending} onClick={runDetect}>
                  <Play className="h-4 w-4" /> Run detection
                </Button>
              </div>
              <div className="flex items-center gap-2 rounded-card bg-panel p-3 text-xs text-muted">
                <RadioTower className="h-4 w-4" /> The simulator also ticks automatically on the
                backend cron.
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between border-b border-line py-2 last:border-0">
      <span className="text-sm text-muted">{label}</span>
      <span className="text-sm font-medium">{value}</span>
    </div>
  );
}
