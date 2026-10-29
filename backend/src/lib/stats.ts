/**
 * Pure statistics helpers. No I/O, no Prisma — this file is the unit-test target.
 */

export function mean(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

/** Population standard deviation (divides by n, not n-1). */
export function stddev(values: number[]): number {
  if (values.length === 0) return 0;
  const m = mean(values);
  const variance = mean(values.map((v) => (v - m) ** 2));
  return Math.sqrt(variance);
}

/**
 * Z-score of `value` against a baseline window.
 * Returns 0 when the window has no spread — a flat window cannot express surprise,
 * and dividing by ~0 would manufacture an infinite z.
 */
export function zScore(value: number, window: number[]): number {
  const sd = stddev(window);
  if (sd < 1e-9) return 0;
  return (value - mean(window)) / sd;
}

/** Trailing moving average; returns one point per window-sized slice. */
export function movingAvg(values: number[], size: number): number[] {
  if (size <= 0 || values.length < size) return [];
  const out: number[] = [];
  for (let i = size; i <= values.length; i++) out.push(mean(values.slice(i - size, i)));
  return out;
}

export type Severity = 'LOW' | 'MEDIUM' | 'HIGH';

export function severityForZ(z: number): Severity | null {
  if (z >= 3) return 'HIGH';
  if (z >= 2) return 'MEDIUM';
  if (z >= 1.5) return 'LOW';
  return null;
}

export interface SpikeOptions {
  /** Multiplicative guard: today must be at least this many times the mean. */
  ratioGuard?: number;
  /** Additive guard: today - mean must be at least this, in the metric's own unit. */
  minAbsDelta?: number;
  /** Minimum window points before we trust the baseline at all. */
  minWindowSize?: number;
}

export interface SpikeResult {
  isSpike: boolean;
  z: number;
  mean: number;
  stddev: number;
  actual: number;
  severity: Severity | null;
  /** Present when isSpike is false, explaining which gate rejected it. */
  reason?: string;
}

/**
 * Spike test combining a z-score with ratio and absolute-delta guards.
 *
 * Both guards exist to stop tiny-magnitude noise from firing: a resource whose
 * cost wobbles between 0.10 and 0.30 can post a z of 4 while being irrelevant.
 * All three conditions must hold.
 */
export function detectSpike(
  actual: number,
  window: number[],
  opts: SpikeOptions = {},
): SpikeResult {
  const { ratioGuard = 1.5, minAbsDelta = 0, minWindowSize = 5 } = opts;

  const m = mean(window);
  const sd = stddev(window);
  const z = zScore(actual, window);
  const base: SpikeResult = { isSpike: false, z, mean: m, stddev: sd, actual, severity: null };

  if (window.length < minWindowSize) {
    return { ...base, reason: `window too small (${window.length} < ${minWindowSize})` };
  }
  const severity = severityForZ(z);
  if (!severity) return { ...base, reason: `z-score ${z.toFixed(2)} below 1.5` };
  if (actual < ratioGuard * m) {
    return { ...base, severity, reason: `actual below ${ratioGuard}x mean` };
  }
  if (actual - m < minAbsDelta) {
    return { ...base, severity, reason: `absolute delta below ${minAbsDelta}` };
  }
  return { ...base, isSpike: true, severity };
}

/** Slope sign of a simple least-squares fit over evenly spaced points. */
export function trend(values: number[]): 'up' | 'down' | 'flat' {
  if (values.length < 2) return 'flat';
  const n = values.length;
  const xs = values.map((_, i) => i);
  const mx = mean(xs);
  const my = mean(values);
  let num = 0;
  let den = 0;
  for (let i = 0; i < n; i++) {
    num += (xs[i] - mx) * (values[i] - my);
    den += (xs[i] - mx) ** 2;
  }
  if (den === 0) return 'flat';
  const slope = num / den;
  // Scale the deadband to the series magnitude so "flat" means flat relatively.
  const deadband = Math.max(Math.abs(my) * 0.01, 1e-9);
  if (slope > deadband) return 'up';
  if (slope < -deadband) return 'down';
  return 'flat';
}

export function round(value: number, places = 2): number {
  const f = 10 ** places;
  return Math.round(value * f) / f;
}
