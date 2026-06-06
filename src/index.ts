import Redis from 'ioredis';
import axios from 'axios';
import { dbPool, runMigrations } from '@db/index';
import { RedisService } from '@utilities/redis';
import { GithubService } from '@domains/github';
import { ScannerService, ScannerScheduler } from '@domains/scanner';
import { createApp } from './app';
import { environmentConfig } from '@config/environment';
import nodemailer from 'nodemailer';
import { NotifierService, EmailTemplateBuilder } from '@domains/notification';
import { SubscriptionRepository, SubscriptionService, SubscriptionUrlBuilder } from '@domains/subscription';
import { CryptoTokenGenerator } from '@utilities/token';
import { logger } from '@config/logger';

async function main(): Promise<void> {
    // 1. Run DB migrations
    await runMigrations(dbPool);

    // 2. Initialize Redis
    const redisClient = new Redis(environmentConfig.redisUrl);
    redisClient.on('error', (err) => logger.warn({ err }, '[redis] Connection error'));
    const cacheService = new RedisService(redisClient);
    logger.info('[redis] Connected');

    // 3. Initialize GitHub service
    const githubHttpClient = axios.create({
        baseURL: environmentConfig.githubApiBase,
        timeout: 10_000,
        headers: {
            Accept: 'application/vnd.github+json',
            ...(environmentConfig.githubToken ? { Authorization: `Bearer ${environmentConfig.githubToken}` } : {}),
        },
    });
    const githubService = new GithubService(githubHttpClient, cacheService);

    // 4. Initialize Notifier service
    const transporter = nodemailer.createTransport({
        host: environmentConfig.smtpHost,
        port: environmentConfig.smtpPort,
        auth: {
            user: environmentConfig.smtpUser,
            pass: environmentConfig.smtpPass,
        },
    });
    const emailTemplateBuilder = new EmailTemplateBuilder();
    const notifierService = new NotifierService(transporter, emailTemplateBuilder);

    // 5. Initialize Subscription repository
    const subscriptionRepository = new SubscriptionRepository(dbPool);

    // 6. Initialize Subscription service
    const subscriptionUrlBuilder = new SubscriptionUrlBuilder();
    const cryptoTokenGenerator = new CryptoTokenGenerator();
    const subscriptionService = new SubscriptionService(
        subscriptionRepository,
        githubService,
        notifierService,
        cryptoTokenGenerator,
        subscriptionUrlBuilder,
    );

    // 7. Start scanner cron
    const scannerService = new ScannerService(
        subscriptionRepository,
        githubService,
        notifierService,
        subscriptionUrlBuilder,
    );
    const scannerScheduler = new ScannerScheduler(scannerService);
    scannerScheduler.start();

    // 8. Start HTTP server
    const app = createApp(subscriptionService);
    app.listen(environmentConfig.port, () => {
        logger.info({ port: environmentConfig.port }, `[server] Listening`);
    });
}

main().catch((err) => {
    logger.error({ err }, '[startup] Fatal error');
    process.exit(1);
});
