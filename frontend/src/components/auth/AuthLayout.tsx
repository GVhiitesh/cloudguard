import { Cloud } from 'lucide-react';

/** Split-screen auth frame: dark marketing panel + form panel, per the design. */
export function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen w-full bg-canvas p-3">
      {/* Left — dark hero */}
      <div className="relative hidden w-1/2 flex-col justify-between overflow-hidden rounded-xl2 p-10 text-white lg:flex" style={{ background: '#111315' }}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-card bg-white/5">
              <Cloud className="h-6 w-6 text-lime" />
            </div>
            <div>
              <div className="flex items-center gap-1.5 font-display text-lg font-bold">
                CloudGuard <span className="h-1.5 w-1.5 rounded-full bg-lime" />
              </div>
              <div className="font-mono text-[10px] uppercase tracking-wider text-white/40">
                v2.4 Enterprise
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 rounded-full border border-white/10 px-3 py-1.5">
            <span className="h-2 w-2 rounded-full bg-lime" />
            <span className="font-mono text-xs">99.99%</span>
            <span className="text-xs text-white/60">Telemetry Active</span>
          </div>
        </div>

        <div>
          <h1 className="font-display text-5xl font-extrabold leading-[1.05]">
            See your cloud
            <br />
            clearly
            <span className="text-lime">.</span>
          </h1>
          <p className="mt-5 max-w-md text-lg text-white/60">
            Monitor infrastructure, detect anomalies, and optimize cloud spending from one place.
          </p>
        </div>

        <div className="flex items-center gap-4 font-display text-sm font-semibold">
          <span>Secure.</span>
          <span className="text-lime">Optimize.</span>
          <span>Scale.</span>
          <span className="ml-auto font-mono text-xs font-normal text-white/40">
            SOC2 Type II · ISO 27001
          </span>
        </div>
      </div>

      {/* Right — form */}
      <div className="flex flex-1 items-center justify-center px-6 py-10">
        <div className="w-full max-w-md">{children}</div>
      </div>
    </div>
  );
}
