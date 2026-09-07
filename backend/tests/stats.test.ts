import { describe, expect, it } from 'vitest';
import {
  detectSpike,
  mean,
  movingAvg,
  round,
  severityForZ,
  stddev,
  trend,
  zScore,
} from '../src/lib/stats';

describe('mean', () => {
  it('averages a series', () => {
    expect(mean([1, 2, 3, 4])).toBe(2.5);
  });

  it('returns 0 for an empty series rather than NaN', () => {
    expect(mean([])).toBe(0);
  });
});

describe('stddev', () => {
  it('is zero for a flat series', () => {
    expect(stddev([5, 5, 5, 5])).toBe(0);
  });

  it('computes the population standard deviation', () => {
    // mean 4, deviations [-2,-1,0,1,2], variance 10/5 = 2
    expect(round(stddev([2, 3, 4, 5, 6]), 4)).toBe(round(Math.sqrt(2), 4));
  });
});

describe('zScore', () => {
  it('measures distance from the window mean in standard deviations', () => {
    expect(zScore(6, [2, 3, 4, 5, 6])).toBeCloseTo(2 / Math.sqrt(2), 5);
  });

  it('returns 0 on a zero-variance window instead of Infinity', () => {
    expect(zScore(500, [10, 10, 10, 10])).toBe(0);
  });
});

describe('movingAvg', () => {
  it('produces one point per full window', () => {
    expect(movingAvg([1, 2, 3, 4, 5], 3)).toEqual([2, 3, 4]);
  });

  it('returns empty when the series is shorter than the window', () => {
    expect(movingAvg([1, 2], 5)).toEqual([]);
  });
});

describe('severityForZ', () => {
  it.each([
    [3.5, 'HIGH'],
    [3, 'HIGH'],
    [2.4, 'MEDIUM'],
    [2, 'MEDIUM'],
    [1.7, 'LOW'],
    [1.5, 'LOW'],
    [1.4, null],
    [0, null],
    [-4, null],
  ])('maps z=%s to %s', (z, expected) => {
    expect(severityForZ(z as number)).toBe(expected);
  });
});

describe('detectSpike', () => {
  /** The spec's worked example: a resource averaging ~Rs 80 jumps to Rs 250. */
  const costWindow = [78, 82, 80, 79, 84, 81, 77, 83, 80, 79, 82, 80, 78, 81];

  it('flags the Rs 80 -> Rs 250 cost spike as HIGH', () => {
    const result = detectSpike(250, costWindow, { minAbsDelta: 20 });
    expect(result.isSpike).toBe(true);
    expect(result.severity).toBe('HIGH');
    expect(result.mean).toBeGreaterThan(75);
    expect(result.mean).toBeLessThan(85);
  });

  it('does not fire on a normal day', () => {
    const result = detectSpike(83, costWindow, { minAbsDelta: 20 });
    expect(result.isSpike).toBe(false);
    expect(result.reason).toMatch(/below 1.5/);
  });

  it('rejects a statistically extreme but financially trivial jump', () => {
    // z is enormous, but the absolute delta is Rs 0.3 — the guard must catch it.
    const tiny = [0.1, 0.1, 0.11, 0.09, 0.1, 0.1, 0.1];
    const result = detectSpike(0.4, tiny, { minAbsDelta: 20 });
    expect(result.isSpike).toBe(false);
    expect(result.reason).toMatch(/absolute delta/);
  });

  it('rejects a jump that fails the ratio guard', () => {
    // Low-variance window: z clears 1.5 but the value is only 1.2x the mean.
    const window = [100, 100.5, 99.5, 100, 100.2, 99.8, 100.1];
    const result = detectSpike(120, window, { ratioGuard: 1.5, minAbsDelta: 5 });
    expect(result.isSpike).toBe(false);
    expect(result.reason).toMatch(/1.5x mean/);
  });

  it('refuses to judge on too little history', () => {
    const result = detectSpike(500, [10, 12], { minWindowSize: 5 });
    expect(result.isSpike).toBe(false);
    expect(result.reason).toMatch(/window too small/);
  });

  it('never fires on a drop, however large', () => {
    const result = detectSpike(1, costWindow, { minAbsDelta: 20 });
    expect(result.isSpike).toBe(false);
    expect(result.z).toBeLessThan(0);
  });

  it('reports the numbers an operator needs to see', () => {
    const result = detectSpike(250, costWindow, { minAbsDelta: 20 });
    expect(result.actual).toBe(250);
    expect(round(result.mean)).toBeCloseTo(80.29, 1);
    expect(result.z).toBeGreaterThan(3);
  });
});

describe('trend', () => {
  it('detects a rising series', () => {
    expect(trend([10, 12, 14, 16, 18])).toBe('up');
  });

  it('detects a falling series', () => {
    expect(trend([18, 16, 14, 12, 10])).toBe('down');
  });

  it('calls a flat series flat', () => {
    expect(trend([50, 50, 50, 50])).toBe('flat');
  });

  it('treats sub-1% drift as flat rather than a trend', () => {
    expect(trend([1000, 1000.5, 1001, 1001.5])).toBe('flat');
  });

  it('is flat for fewer than two points', () => {
    expect(trend([42])).toBe('flat');
    expect(trend([])).toBe('flat');
  });
});

describe('round', () => {
  it('rounds to two places by default', () => {
    expect(round(3.14159)).toBe(3.14);
  });

  it('honours an explicit precision', () => {
    expect(round(3.14159, 4)).toBe(3.1416);
  });
});
