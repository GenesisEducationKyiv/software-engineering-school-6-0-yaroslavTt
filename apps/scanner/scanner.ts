import { environmentConfig } from '@config/environment';
import { logger } from '@config/logger';
import { GithubService } from '@domains/github';
import { RabbitMQNotifierService } from '@domains/notification';
import { Scanner } from '@domains/scanner';
import { SubscriptionGrpcClient, SubscriptionUrlBuilder } from '@domains/subscription';
import { RabbitMQService } from '@utilities/rabbitmq';
import { RedisService } from '@utilities/redis';
import axios from 'axios';
import Redis from 'ioredis';

export async function startScanner(): Promise<void> {
    const redisClient = new Redis(environmentConfig.redisUrl);
    redisClient.on('error', (err) => logger.warn({ err }, '[redis] Connection error'));
    const cacheService = new RedisService(redisClient);

    const githubHttpClient = axios.create({
        baseURL: environmentConfig.githubApiBase,
        timeout: 10_000,
        headers: {
            Accept: 'application/vnd.github+json',
            ...(environmentConfig.githubToken ? { Authorization: `Bearer ${environmentConfig.githubToken}` } : {}),
        },
    });
    const githubService = new GithubService(githubHttpClient, cacheService);

    const rabbitMQ = new RabbitMQService(environmentConfig.rabbitmqUrl);
    await rabbitMQ.connect();
    const notifierService = new RabbitMQNotifierService(rabbitMQ);

    const shutdown = async () => {
        logger.info('[Scanner]: Shutting down.');
        await rabbitMQ.close();
        process.exit(0);
    };

    process.on('SIGTERM', shutdown);
    process.on('SIGINT', shutdown);

    const subscriptionGrpcClient = new SubscriptionGrpcClient(environmentConfig.grpcAddress);
    const subscriptionUrlBuilder = new SubscriptionUrlBuilder();

    const scanner = new Scanner(subscriptionGrpcClient, githubService, notifierService, subscriptionUrlBuilder);
    scanner.start();

    logger.info('[Scanner]: Scheduler started.');
}
