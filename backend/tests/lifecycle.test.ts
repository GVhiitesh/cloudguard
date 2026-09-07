import { describe, expect, it } from 'vitest';
import { allowedTransitions, assertTransition, canTransition } from '../src/lib/lifecycle';
import { healthScore, healthBreakdown } from '../src/lib/healthScore';
import { AppError } from '../src/lib/errors';

describe('lifecycle state machine', () => {
  it('allows the documented forward path', () => {
    expect(canTransition('ACTIVE', 'IDLE')).toBe(true);
    expect(canTransition('IDLE', 'FLAGGED')).toBe(true);
    expect(canTransition('FLAGGED', 'REVIEWED')).toBe(true);
    expect(canTransition('REVIEWED', 'ARCHIVED')).toBe(true);
  });

  it('allows recovery from IDLE back to ACTIVE', () => {
    expect(canTransition('IDLE', 'ACTIVE')).toBe(true);
  });

  it('rejects skipping states', () => {
    expect(canTransition('ACTIVE', 'ARCHIVED')).toBe(false);
    expect(canTransition('IDLE', 'REVIEWED')).toBe(false);
    expect(canTransition('FLAGGED', 'ARCHIVED')).toBe(false);
  });

  it('treats ARCHIVED as terminal on the normal path', () => {
    expect(allowedTransitions('ARCHIVED')).toEqual([]);
  });

  it('throws on an illegal jump, naming what is allowed', () => {
    expect(() => assertTransition('ACTIVE', 'ARCHIVED', 'ADMIN')).toThrow(AppError);
    try {
      assertTransition('ACTIVE', 'REVIEWED', 'ADMIN');
    } catch (err) {
      expect((err as AppError).status).toBe(400);
      expect((err as AppError).message).toContain('IDLE');
    }
  });

  it('rejects a no-op transition', () => {
    expect(() => assertTransition('IDLE', 'IDLE', 'ADMIN')).toThrow(/already IDLE/);
  });

  describe('restore to ACTIVE', () => {
    it('lets an ADMIN restore an archived resource', () => {
      expect(() => assertTransition('ARCHIVED', 'ACTIVE', 'ADMIN')).not.toThrow();
    });

    it('refuses the same restore for an EDITOR with 403', () => {
      try {
        assertTransition('ARCHIVED', 'ACTIVE', 'EDITOR');
        throw new Error('should have thrown');
      } catch (err) {
        expect((err as AppError).status).toBe(403);
      }
    });

    it('still lets an EDITOR do the ordinary IDLE -> ACTIVE recovery', () => {
      expect(() => assertTransition('IDLE', 'ACTIVE', 'EDITOR')).not.toThrow();
    });
  });
});

describe('healthScore', () => {
  it('is 100 for a clean resource', () => {
    expect(healthScore({ openAnomalies: 0, isIdle: false, costTrendUp: false })).toBe(100);
  });

  it('deducts 15 per open anomaly', () => {
    expect(healthScore({ openAnomalies: 2, isIdle: false, costTrendUp: false })).toBe(70);
  });

  it('applies every deduction together', () => {
    // 100 - 15 - 25 - 10
    expect(healthScore({ openAnomalies: 1, isIdle: true, costTrendUp: true })).toBe(50);
  });

  it('clamps at 0 instead of going negative', () => {
    expect(healthScore({ openAnomalies: 20, isIdle: true, costTrendUp: true })).toBe(0);
  });

  it('explains each deduction', () => {
    const items = healthBreakdown({ openAnomalies: 1, isIdle: true, costTrendUp: false });
    expect(items).toHaveLength(2);
    expect(items.reduce((a, i) => a + i.delta, 0)).toBe(-40);
    expect(items[0].reason).toBe('1 open anomaly');
  });

  it('lists nothing for a healthy resource', () => {
    expect(healthBreakdown({ openAnomalies: 0, isIdle: false, costTrendUp: false })).toEqual([]);
  });
});
