/**
 * Application constants
 */

// Cron schedule for counter reset job
// Default: First of the month at 1 AM (0 1 1 * *)
// Can be overridden via CRON_SCHEDULE environment variable
export const CRON_SCHEDULE = process.env.CRON_SCHEDULE || '0 1 1 * *';

// Timezone for cron jobs
// Default: UTC
// Can be overridden via TZ environment variable
export const TIMEZONE = process.env.TZ || 'UTC';

