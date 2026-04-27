import { Registry, Counter, Gauge, Histogram, collectDefaultMetrics } from 'prom-client';

export const register = new Registry();

collectDefaultMetrics({ register });

export const githubRequestsTotal = new Counter({
  name: 'github_api_requests_total',
  help: 'Total GitHub API requests',
  labelNames: ['status'] as const,
  registers: [register],
});

export const emailsSentTotal = new Counter({
  name: 'emails_sent_total',
  help: 'Total emails sent',
  labelNames: ['type'] as const, // confirmation | release
  registers: [register],
});

export const activeSubscriptions = new Gauge({
  name: 'active_subscriptions',
  help: 'Number of confirmed subscriptions',
  registers: [register],
});

export const scanDurationSeconds = new Histogram({
  name: 'scan_duration_seconds',
  help: 'Duration of each scanner cron tick in seconds',
  buckets: [0.1, 0.5, 1, 2, 5, 10, 30],
  registers: [register],
});
