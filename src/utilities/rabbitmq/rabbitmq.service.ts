import { logger } from '@config/logger';
import type { IRabbitMQService } from './interface/rabbitmq.service.interface';
import type { Channel, ChannelModel } from 'amqplib';
import { connect as amqpConnect } from 'amqplib';
export class RabbitMQService implements IRabbitMQService {
    private connectUrl: string;
    private connection: ChannelModel | null;
    private channel: Channel | null;

    constructor(connectUrl: string) {
        this.connectUrl = connectUrl;
        this.connection = null;
        this.channel = null;
    }

    async connect(): Promise<void> {
        const conn = await amqpConnect(this.connectUrl, {});

        this.connection = conn;
        this.channel = await conn.createChannel();

        conn.on('error', (err: Error) => {
            logger.error({ err }, '[RabbitMQService]: Connection error.');
        });

        conn.on('close', () => {
            logger.warn('[RabbitMQService]: Connection closed.');
        });

        conn.on('handler-error', (err: Error, event: string) => {
            logger.error({ err, event }, '[RabbitMQService]: Uncaught exception in connection event listener.');
        });
    }

    async publish<T>(queue: string, message: T): Promise<void> {
        const channel = await this.getChannel(queue);

        channel.sendToQueue(queue, Buffer.from(JSON.stringify(message)), { persistent: true });
    }

    async consume<T>(queue: string, handler: (message: T) => Promise<void>): Promise<void> {
        const channel = await this.getChannel(queue);

        await channel.consume(queue, async (msg) => {
            if (!msg) {
                return;
            }

            try {
                const parsedMessage = JSON.parse(msg.content.toString()) as T;

                await handler(parsedMessage);

                channel.ack(msg);
            } catch (err) {
                logger.error({ err, msg }, '[RabbitMQService]: Failed to process message.');

                channel.nack(msg, false, true);
            }
        });
    }

    private async getChannel(queue: string): Promise<Channel> {
        if (!this.channel) {
            throw new Error('[RabbitMQService]: RabbitMQ channel is not initialized. Call connect() first.');
        }

        await this.channel.assertQueue(queue, { durable: true });

        return this.channel;
    }
}
