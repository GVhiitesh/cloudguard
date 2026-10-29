import { z } from 'zod';
import { prisma } from '../../config/db';
import { badRequest, conflict, notFound } from '../../lib/errors';
import { writeAudit } from '../../lib/audit';
import { round } from '../../lib/stats';
import type { AuthUser } from '../../middleware/auth';
import { createBudgetSchema } from './budgets.schema';

type CreateInput = z.infer<typeof createBudgetSchema>;

export function list() {
  return prisma.budget.findMany({ orderBy: [{ scope: 'asc' }, { scopeValue: 'asc' }] });
}

export async function create(input: CreateInput, actor: AuthUser) {
  if (input.scope === 'OWNER') {
    const owner = await prisma.user.findUnique({ where: { id: input.scopeValue! } });
    if (!owner) throw badRequest('scopeValue must be an existing user id for OWNER budgets');
  }

  // Postgres treats NULLs as distinct, so the (scope, scopeValue) unique index
  // does not stop a second GLOBAL budget. Check for it explicitly.
  const duplicate = await prisma.budget.findFirst({
    where: { scope: input.scope, scopeValue: input.scope === 'GLOBAL' ? null : input.scopeValue },
  });
  if (duplicate) {
    throw conflict(
      `A ${input.scope} budget${input.scopeValue ? ` for ${input.scopeValue}` : ''} already exists`,
    );
  }

  const budget = await prisma.budget.create({
    data: {
      scope: input.scope,
      scopeValue: input.scope === 'GLOBAL' ? null : input.scopeValue!,
      limitPerMonth: input.limitPerMonth,
    },
  });

  await writeAudit({
    actorId: actor.id,
    action: 'CREATE_BUDGET',
    entity: 'Budget',
    entityId: budget.id,
    after: budget,
  });
  return budget;
}

export async function update(id: string, limitPerMonth: number, actor: AuthUser) {
  const before = await prisma.budget.findUnique({ where: { id } });
  if (!before) throw notFound('Budget not found');

  const after = await prisma.budget.update({ where: { id }, data: { limitPerMonth } });
  await writeAudit({
    actorId: actor.id,
    action: 'UPDATE_BUDGET',
    entity: 'Budget',
    entityId: id,
    before,
    after,
  });
  return after;
}

export async function remove(id: string, actor: AuthUser) {
  const before = await prisma.budget.findUnique({ where: { id } });
  if (!before) throw notFound('Budget not found');
  await prisma.budget.delete({ where: { id } });
  await writeAudit({
    actorId: actor.id,
    action: 'DELETE_BUDGET',
    entity: 'Budget',
    entityId: id,
    before,
  });
}

/** Start of the current calendar month, UTC. */
function monthStart(): Date {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
}

export type BudgetState = 'OK' | 'WARNING' | 'PROJECTED_TO_EXCEED' | 'EXCEEDED';

/**
 * Spend vs limit for every budget.
 *
 * Spend is actual month-to-date cost from UsageMetric, not the estCostPerDay
 * estimate, so the number reflects what was really recorded.
 */
export async function status() {
  const budgets = await list();
  const from = monthStart();
  if (budgets.length === 0) return { asOf: new Date(), monthStart: from, data: [] };

  const metrics = await prisma.usageMetric.findMany({
    where: { timestamp: { gte: from } },
    select: {
      cost: true,
      resource: { select: { environment: true, ownerId: true } },
    },
  });

  let globalTotal = 0;
  const byEnvironment = new Map<string, number>();
  const byOwner = new Map<string, number>();

  for (const m of metrics) {
    globalTotal += m.cost;
    const envKey = m.resource.environment;
    const ownerKey = m.resource.ownerId;
    byEnvironment.set(envKey, (byEnvironment.get(envKey) ?? 0) + m.cost);
    byOwner.set(ownerKey, (byOwner.get(ownerKey) ?? 0) + m.cost);
  }

  // Project month-end spend by extrapolating the run rate so far.
  const now = new Date();
  const dayOfMonth = Math.max(1, now.getUTCDate());
  const daysInMonth = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 0),
  ).getUTCDate();

  const data = budgets.map((b) => {
    let spend: number;
    if (b.scope === 'GLOBAL') spend = globalTotal;
    else if (b.scope === 'ENVIRONMENT') spend = byEnvironment.get(b.scopeValue ?? '') ?? 0;
    else spend = byOwner.get(b.scopeValue ?? '') ?? 0;

    const projected = (spend / dayOfMonth) * daysInMonth;
    const utilization = (spend / b.limitPerMonth) * 100;

    let state: BudgetState = 'OK';
    if (utilization >= 100) state = 'EXCEEDED';
    else if (projected >= b.limitPerMonth) state = 'PROJECTED_TO_EXCEED';
    else if (utilization >= 80) state = 'WARNING';

    return {
      budget: b,
      spendToDate: round(spend),
      projectedMonthEnd: round(projected),
      limitPerMonth: b.limitPerMonth,
      remaining: round(b.limitPerMonth - spend),
      utilizationPct: round(utilization),
      projectedUtilizationPct: round((projected / b.limitPerMonth) * 100),
      state,
    };
  });

  return { asOf: new Date(), monthStart: from, data };
}
