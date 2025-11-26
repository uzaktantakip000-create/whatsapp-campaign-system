const logger = require('../utils/logger');
const spamScoreManager = require('./spamScoreManager');

/**
 * Scheduler Service
 * Handles scheduled tasks like spam score decay
 */

class Scheduler {
  constructor() {
    this.jobs = new Map();
    this.isRunning = false;
  }

  /**
   * Start the scheduler
   */
  start() {
    if (this.isRunning) {
      logger.warn('[Scheduler] Already running');
      return;
    }

    logger.info('[Scheduler] Starting scheduler service...');
    this.isRunning = true;

    // Schedule daily spam decay (run at 3:00 AM every day)
    this.scheduleJob('spamDecay', this.calculateNextRun(3, 0), async () => {
      logger.info('[Scheduler] Running daily spam decay job...');
      try {
        const result = await spamScoreManager.applyDailyDecay();
        logger.info(`[Scheduler] Spam decay completed: ${result.consultantsUpdated} consultants updated`);
      } catch (error) {
        logger.error(`[Scheduler] Spam decay failed: ${error.message}`);
      }
    }, 24 * 60 * 60 * 1000); // Repeat every 24 hours

    // Schedule hourly health check
    this.scheduleJob('healthCheck', Date.now() + 60000, () => {
      logger.debug('[Scheduler] Health check: All systems operational');
    }, 60 * 60 * 1000); // Repeat every hour

    logger.info('[Scheduler] Scheduler service started');
  }

  /**
   * Stop the scheduler
   */
  stop() {
    if (!this.isRunning) {
      return;
    }

    logger.info('[Scheduler] Stopping scheduler service...');
    this.isRunning = false;

    // Clear all scheduled jobs
    for (const [name, job] of this.jobs.entries()) {
      if (job.timeoutId) {
        clearTimeout(job.timeoutId);
      }
      if (job.intervalId) {
        clearInterval(job.intervalId);
      }
      logger.info(`[Scheduler] Job '${name}' stopped`);
    }

    this.jobs.clear();
    logger.info('[Scheduler] Scheduler service stopped');
  }

  /**
   * Schedule a job
   * @param {string} name - Job name
   * @param {number} nextRun - Timestamp for next run
   * @param {Function} callback - Job callback
   * @param {number} interval - Repeat interval in ms (optional)
   */
  scheduleJob(name, nextRun, callback, interval = null) {
    const delay = Math.max(nextRun - Date.now(), 0);

    const job = {
      name,
      nextRun,
      interval,
      callback
    };

    // Schedule first run
    job.timeoutId = setTimeout(async () => {
      try {
        await callback();
      } catch (error) {
        logger.error(`[Scheduler] Job '${name}' failed: ${error.message}`);
      }

      // Schedule repeat if interval is set
      if (interval && this.isRunning) {
        job.intervalId = setInterval(async () => {
          try {
            await callback();
          } catch (error) {
            logger.error(`[Scheduler] Job '${name}' failed: ${error.message}`);
          }
        }, interval);
      }
    }, delay);

    this.jobs.set(name, job);

    const nextRunDate = new Date(nextRun);
    logger.info(`[Scheduler] Job '${name}' scheduled for ${nextRunDate.toLocaleString()}`);
  }

  /**
   * Run a job immediately
   * @param {string} name - Job name
   */
  async runJobNow(name) {
    const job = this.jobs.get(name);

    if (!job) {
      throw new Error(`Job '${name}' not found`);
    }

    logger.info(`[Scheduler] Running job '${name}' immediately...`);
    await job.callback();
  }

  /**
   * Calculate next run time for a daily job
   * @param {number} hour - Hour (0-23)
   * @param {number} minute - Minute (0-59)
   * @returns {number} Timestamp
   */
  calculateNextRun(hour, minute) {
    const now = new Date();
    const nextRun = new Date(now);

    nextRun.setHours(hour, minute, 0, 0);

    // If the time has passed today, schedule for tomorrow
    if (nextRun <= now) {
      nextRun.setDate(nextRun.getDate() + 1);
    }

    return nextRun.getTime();
  }

  /**
   * Get all scheduled jobs
   * @returns {Array} List of jobs
   */
  getJobs() {
    const jobs = [];

    for (const [name, job] of this.jobs.entries()) {
      jobs.push({
        name,
        nextRun: new Date(job.nextRun).toISOString(),
        interval: job.interval ? `${job.interval / 1000}s` : 'one-time'
      });
    }

    return jobs;
  }
}

// Create singleton instance
const scheduler = new Scheduler();

module.exports = scheduler;
