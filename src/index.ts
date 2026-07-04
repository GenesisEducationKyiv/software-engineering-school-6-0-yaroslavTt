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
import { Server, ServerCredentials } from '@grpc/grpc-js';
import { SubscriptionServiceService } from '@proto/generated/subscription/v1/subscription';
import { SubscriptionGrpcServer } from '@domains/subscription';

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
    await rabbitMQ.connect();

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

    // 10. Start gRPC server
    const grpcServer = new Server();
    grpcServer.addService(SubscriptionServiceService, new SubscriptionGrpcServer(subscriptionRepository));
    grpcServer.bindAsync(`0.0.0.0:${environmentConfig.grpcPort}`, ServerCredentials.createInsecure(), (err, port) => {
        if (err) {
            logger.error({ err }, '[gRPC] Failed to bind');
            return;
        }
        logger.info({ port }, '[gRPC] Listening');
    });
}

main().catch((err) => {
    logger.error({ err }, '[startup] Fatal error');
    process.exit(1);
});
