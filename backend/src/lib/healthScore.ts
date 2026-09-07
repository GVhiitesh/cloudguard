export interface HealthInputs {
  openAnomalies: number;
  isIdle: boolean;
  costTrendUp: boolean;
}

/**
 * Health score per BACKEND.md §6.4. Deliberately simple and explainable —
 * every deduction can be pointed at in the UI.
 */
export function healthScore({ openAnomalies, isIdle, costTrendUp }: HealthInputs): number {
  const score = 100 - openAnomalies * 15 - (isIdle ? 25 : 0) - (costTrendUp ? 10 : 0);
  return Math.max(0, Math.min(100, Math.round(score)));
}

/** The same deductions, itemised, so the twin endpoint can show its working. */
export function healthBreakdown(inputs: HealthInputs): Array<{ reason: string; delta: number }> {
  const items: Array<{ reason: string; delta: number }> = [];
  if (inputs.openAnomalies > 0) {
    items.push({
      reason: `${inputs.openAnomalies} open anomal${inputs.openAnomalies === 1 ? 'y' : 'ies'}`,
      delta: -inputs.openAnomalies * 15,
    });
  }
  if (inputs.isIdle) items.push({ reason: 'Resource is idle', delta: -25 });
  if (inputs.costTrendUp) items.push({ reason: 'Cost trending up', delta: -10 });
  return items;
}
