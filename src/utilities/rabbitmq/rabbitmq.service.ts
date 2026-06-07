import { logger } from '@config/logger';
import type { IRabbitMQService } from './interface/rabbitmq.service.interface';
import type { Channel, ChannelModel } from 'amqplib';
import { connect as amqpConnect } from 'amqplib';
export class RabbitMQService implements IRabbitMQService {
    private connectUrl: string;
    private connection: ChannelModel | null;
    private channel: Channel | null;
    private consumers: Map<string, (message: unknown) => Promise<void>>;
    private isReconnecting: boolean;

    constructor(connectUrl: string) {
        this.connectUrl = connectUrl;
        this.connection = null;
        this.channel = null;
        this.isReconnecting = false;
        this.consumers = new Map();
    }

    async connect(): Promise<void> {
        const conn = await amqpConnect(this.connectUrl, {});

        this.connection = conn;
        this.channel = await conn.createChannel();

        conn.on('error', (err: Error) => {
            logger.error({ err }, '[RabbitMQService]: Connection error.');
        });

        conn.on('close', () => {
            logger.warn('[RabbitMQService]: Connection closed. Reconnecting...');
            this.scheduleReconnect();
        });

        conn.on('handler-error', (err: Error, event: string) => {
            logger.error({ err, event }, '[RabbitMQService]: Uncaught exception in connection event listener.');
        });
    }

    async publish<T>(queue: string, message: T): Promise<void> {
        const channel = await this.getChannel(queue);

        const sendResult = channel.sendToQueue(queue, Buffer.from(JSON.stringify(message)), { persistent: true });
        if (!sendResult) {
            throw new Error(`[RabbitMQService]: Failed to enqueue message to "${queue}" — write buffer full.`);
        }
    }

    async consume<T>(queue: string, handler: (message: T) => Promise<void>): Promise<void> {
        const channel = await this.getChannel(queue);

        this.consumers.set(queue, handler as (message: unknown) => Promise<void>);

        await channel.consume(queue, async (msg) => {
            if (!msg) {
                return;
            }

            try {
                const parsedMessage = JSON.parse(msg.content.toString()) as T;

                await handler(parsedMessage);

                channel.ack(msg);
            } catch (err) {
                const retries = (msg.properties.headers?.['x-retry-count'] as number) ?? 0;
                const maxRetries = 3;

                logger.error({ err, retries }, '[RabbitMQService]: Failed to process message.');

                channel.ack(msg);

                if (retries >= maxRetries) {
                    logger.error({ msg }, '[RabbitMQService]: Max retries reached, moving to dead letter queue.');
                    channel.sendToQueue(`${queue}_dlq`, msg.content, {
                        ...msg.properties,
                        headers: { ...msg.properties.headers, 'x-retry-count': retries },
                        persistent: true,
                    });
                } else {
                    channel.sendToQueue(queue, msg.content, {
                        ...msg.properties,
                        headers: { ...msg.properties.headers, 'x-retry-count': retries + 1 },
                        persistent: true,
                    });
                }
            }
        });
    }

    private async getChannel(queue: string): Promise<Channel> {
        if (!this.channel) {
            throw new Error('[RabbitMQService]: RabbitMQ channel is not initialized. Call connect() first.');
        }

        const dlqName = `${queue}_dlq`;

        await this.channel.assertQueue(queue, {
            durable: true,
            arguments: {
                'x-dead-letter-exchange': '',
                'x-dead-letter-routing-key': dlqName,
            },
        });

        await this.channel.assertQueue(dlqName, { durable: true });

        return this.channel;
    }

    private scheduleReconnect(attempt: number = 1): void {
        if (this.isReconnecting) return;
        this.isReconnecting = true;

        const delay = Math.min(1000 * 2 ** (attempt - 1), 30_000);
        setTimeout(async () => {
            try {
                this.connection = null;
                this.channel = null;
                await this.connect();

                for (const [queue, handler] of this.consumers) {
                    await this.consume(queue, handler);
                }

                this.isReconnecting = false;
                logger.info('[RabbitMQService]: Reconnected successfully.');
            } catch (err) {
                this.isReconnecting = false;
                logger.error({ err, attempt }, '[RabbitMQService]: Reconnect failed.');
                this.scheduleReconnect(attempt + 1);
            }
        }, delay);
    }
}
