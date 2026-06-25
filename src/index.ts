import Redis from 'ioredis';
import axios from 'axios';
import { dbPool, runMigrations } from '@db/index';
import { RedisService } from '@utilities/redis';
import { GithubService } from '@domains/github';
import { createApp } from './app';
import { environmentConfig } from '@config/environment';
import { RabbitMQService } from '@utilities/rabbitmq';
import { SubscriptionRepository, SubscriptionService, SubscriptionUrlBuilder } from '@domains/subscription';
import { SagaRepository, SubscribeSagaOrchestrator } from '@domains/saga';
import type { SagaEmailReply } from '@domains/saga';
import { SAGA_EMAIL_REPLIES_QUEUE_NAME } from '@constants/queues';
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

    // 4. Initialize RabbitMQ
    const rabbitMQ = new RabbitMQService(environmentConfig.rabbitmqUrl);
    rabbitMQ.connect().catch((err) => {
        logger.error({ err }, '[RabbitMQ]: Initial connection failed. Publish calls will fail until reconnected.');
    });

    // 5. Initialize Subscription repository
    const subscriptionRepository = new SubscriptionRepository(dbPool);

    // 6. Initialize Saga orchestrator
    const sagaRepository = new SagaRepository(dbPool);
    const sagaOrchestrator = new SubscribeSagaOrchestrator(sagaRepository, subscriptionRepository, rabbitMQ);

    // 7. Consume saga replies
    rabbitMQ
        .consume<SagaEmailReply>(SAGA_EMAIL_REPLIES_QUEUE_NAME, async (reply) => {
            await sagaOrchestrator.handleReply(reply.sagaId, reply.success);
        })
        .catch((err) => {
            logger.error({ err }, '[RabbitMQ]: Failed to start saga reply consumer.');
        });

    // 8. Initialize Subscription service
    const subscriptionUrlBuilder = new SubscriptionUrlBuilder();
    const cryptoTokenGenerator = new CryptoTokenGenerator();
    const subscriptionService = new SubscriptionService(
        subscriptionRepository,
        githubService,
        sagaOrchestrator,
        cryptoTokenGenerator,
        subscriptionUrlBuilder,
    );

    // 9. Start HTTP server
    const app = createApp(subscriptionService);
    app.listen(environmentConfig.port, () => {
        logger.info({ port: environmentConfig.port }, `[server] Listening`);
    });
}

main().catch((err) => {
    logger.error({ err }, '[startup] Fatal error');
    process.exit(1);
});
