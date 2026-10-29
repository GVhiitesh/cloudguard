/**
 * One-shot backfill: `npm run seed:metrics`.
 * Generates 30 days of history, then runs both detectors once so the API has
 * anomalies, idle resources and recommendations to serve immediately.
 */
import { prisma } from '../config/db';
import { logger } from '../config/logger';
import { backfill } from './simulator';
import { detectAnomalies } from './detectAnomalies';
import { detectIdle } from './detectIdle';

async function main() {
  const days = Number(process.argv[2] ?? 30);
  const filled = await backfill(days);
  const idle = await detectIdle();
  const anomalies = await detectAnomalies();
  logger.info({ filled, idle, anomalies }, 'Backfill + detection complete');
}

main()
  .catch((err) => {
    logger.error({ err }, 'Backfill failed');
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
