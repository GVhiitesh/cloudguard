import cron from 'node-cron';
import { env } from '../config/env';
import { logger } from '../config/logger';
import { detectAnomalies } from './detectAnomalies';
import { detectIdle } from './detectIdle';
import { tick } from './simulator';

const tasks: cron.ScheduledTask[] = [];

/**
 * Guards against overlap: a slow sweep must not have a second copy start on top
 * of it, which would double-create anomalies before the first run's suppression
 * check has committed.
 */
function guarded(name: string, fn: () => Promise<unknown>): () => Promise<void> {
  let running = false;
  return async () => {
    if (running) {
      logger.warn({ job: name }, 'Previous run still in progress, skipping this tick');
      return;
    }
    running = true;
    try {
      await fn();
    } catch (err) {
      logger.error({ err, job: name }, 'Scheduled job failed');
    } finally {
      running = false;
    }
  };
}

export function startScheduler(): void {
  if (env.NODE_ENV === 'test') return;

  if (env.SIMULATOR_ENABLED) {
    // Every 5 minutes: refresh today's metric point so the dashboard keeps moving.
    tasks.push(cron.schedule('*/5 * * * *', guarded('simulator', tick)));
    logger.info('Simulator scheduled: every 5 minutes');
  }

  // Detection runs on a schedule over stored metrics, never on the request path.
  tasks.push(cron.schedule('*/10 * * * *', guarded('detectAnomalies', detectAnomalies)));
  tasks.push(cron.schedule('*/15 * * * *', guarded('detectIdle', detectIdle)));

  logger.info('Detection scheduled: anomalies every 10 min, idle every 15 min');
}

export function stopScheduler(): void {
  for (const task of tasks) task.stop();
  tasks.length = 0;
}
