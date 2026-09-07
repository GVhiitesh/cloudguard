import { Router, Response } from 'express';
import { auth } from '../../middleware/auth';
import { asyncHandler } from '../../lib/async';
import { prisma } from '../../config/db';
import { toCsv } from '../../lib/csv';

export const exportRouter = Router();

exportRouter.use(auth);

function sendCsv(res: Response, filename: string, csv: string): void {
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  // Excel needs a BOM to read UTF-8 CSV correctly.
  res.send('\uFEFF' + csv);
}

exportRouter.get(
  '/resources.csv',
  asyncHandler(async (_req, res) => {
    const resources = await prisma.resource.findMany({
      include: { owner: { select: { name: true, email: true } }, tags: true },
      orderBy: { createdAt: 'desc' },
    });

    const rows = resources.map((r) => ({
      id: r.id,
      name: r.name,
      type: r.type,
      provider: r.provider,
      region: r.region,
      environment: r.environment,
      status: r.status,
      lifecycle: r.lifecycle,
      owner: r.owner.name,
      ownerEmail: r.owner.email,
      estCostPerDay: r.estCostPerDay,
      estCostPerMonth: Math.round(r.estCostPerDay * 30 * 100) / 100,
      healthScore: r.healthScore,
      tags: r.tags.map((t) => `${t.key}=${t.value}`).join(' | '),
      idleSince: r.idleSince,
      createdAt: r.createdAt,
    }));

    sendCsv(res, 'cloudguard-resources.csv', toCsv(rows));
  }),
);

exportRouter.get(
  '/audit.csv',
  asyncHandler(async (_req, res) => {
    const logs = await prisma.auditLog.findMany({
      include: { user: { select: { name: true, email: true } } },
      orderBy: { createdAt: 'desc' },
      take: 5000,
    });

    const rows = logs.map((l) => ({
      id: l.id,
      action: l.action,
      entity: l.entity,
      entityId: l.entityId,
      user: l.user.name,
      userEmail: l.user.email,
      details: JSON.stringify(l.details),
      createdAt: l.createdAt,
    }));

    sendCsv(res, 'cloudguard-audit.csv', toCsv(rows));
  }),
);

exportRouter.get(
  '/anomalies.csv',
  asyncHandler(async (_req, res) => {
    const anomalies = await prisma.anomaly.findMany({
      include: { resource: { select: { name: true, type: true, environment: true } } },
      orderBy: { detectedAt: 'desc' },
    });

    const rows = anomalies.map((a) => ({
      id: a.id,
      resourceId: a.resourceId,
      resourceName: a.resource.name,
      resourceType: a.resource.type,
      environment: a.resource.environment,
      kind: a.kind,
      severity: a.severity,
      status: a.status,
      expected: Math.round(a.expected * 100) / 100,
      actual: Math.round(a.actual * 100) / 100,
      deviation: Math.round(a.deviation * 100) / 100,
      message: a.message,
      detectedAt: a.detectedAt,
    }));

    sendCsv(res, 'cloudguard-anomalies.csv', toCsv(rows));
  }),
);
