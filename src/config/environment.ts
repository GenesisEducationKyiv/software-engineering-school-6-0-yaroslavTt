import 'dotenv/config';

const environmentConfig = Object.freeze({
    port: parseInt(process.env.PORT ?? '3000', 10),
    nodeEnv: process.env.NODE_ENV ?? 'development',

    databaseUrl: process.env.DATABASE_URL ?? 'postgresql://postgres:postgres@localhost:5432/ghnotify',

    githubToken: process.env.GITHUB_TOKEN ?? '',
    githubApiBase: 'https://api.github.com',

    redisUrl: process.env.REDIS_URL ?? 'redis://localhost:6379',
    redisTtl: parseInt(process.env.REDIS_TTL ?? '600', 10),

    smtpHost: process.env.SMTP_HOST ?? 'smtp.mailtrap.io',
    smtpPort: parseInt(process.env.SMTP_PORT ?? '587', 10),
    smtpUser: process.env.SMTP_USER ?? '',
    smtpPass: process.env.SMTP_PASS ?? '',
    emailFrom: process.env.EMAIL_FROM ?? 'GitHub Notifier <noreply@example.com>',

    appBaseUrl: process.env.APP_BASE_URL ?? 'http://localhost:3000',

    cronSchedule: process.env.CRON_SCHEDULE ?? '*/5 * * * *',

    apiKey: process.env.API_KEY ?? '',
});

export type Config = typeof environmentConfig;
export { environmentConfig };
