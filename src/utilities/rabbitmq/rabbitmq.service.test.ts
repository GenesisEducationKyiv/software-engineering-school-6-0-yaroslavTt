import { RabbitMQService } from './rabbitmq.service';
import { connect as amqpConnect } from 'amqplib';

jest.mock('amqplib');
jest.mock('@config/logger', () => ({
    logger: { info: jest.fn(), error: jest.fn(), warn: jest.fn() },
}));

describe('RabbitMQService', () => {
    let mockChannel: {
        assertQueue: jest.Mock;
        sendToQueue: jest.Mock;
        consume: jest.Mock;
        close: jest.Mock;
        ack: jest.Mock;
        nack: jest.Mock;
    };
    let mockConnection: {
        createChannel: jest.Mock;
        close: jest.Mock;
        on: jest.Mock;
    };
    let service: RabbitMQService;

    beforeEach(async () => {
        jest.clearAllMocks();

        mockChannel = {
            assertQueue: jest.fn().mockResolvedValue(undefined),
            sendToQueue: jest.fn().mockReturnValue(true),
            consume: jest.fn().mockResolvedValue(undefined),
            close: jest.fn().mockResolvedValue(undefined),
            ack: jest.fn(),
            nack: jest.fn(),
        };
        mockConnection = {
            createChannel: jest.fn().mockResolvedValue(mockChannel),
            close: jest.fn().mockResolvedValue(undefined),
            on: jest.fn(),
        };

        (amqpConnect as jest.Mock).mockResolvedValue(mockConnection);
        service = new RabbitMQService('amqp://localhost');
    });

    describe('connect', () => {
        it('creates connection and channel with provided url', async () => {
            await service.connect();

            expect(amqpConnect).toHaveBeenCalledWith('amqp://localhost', {});
            expect(mockConnection.createChannel).toHaveBeenCalledTimes(1);
        });

        it('registers error, close, and handler-error listeners on connection', async () => {
            await service.connect();

            const registeredEvents = mockConnection.on.mock.calls.map(([event]) => event);
            expect(registeredEvents).toContain('error');
            expect(registeredEvents).toContain('close');
            expect(registeredEvents).toContain('handler-error');
        });
    });

    describe('close', () => {
        it('closes channel and connection', async () => {
            await service.connect();
            await service.close();

            expect(mockChannel.close).toHaveBeenCalled();
            expect(mockConnection.close).toHaveBeenCalled();
        });

        it('does not throw when called before connect', async () => {
            await expect(service.close()).resolves.not.toThrow();
        });
    });

    describe('publish', () => {
        beforeEach(() => service.connect());

        it('sends message serialized as JSON buffer with persistent flag', async () => {
            const message = { type: 'release', repo: 'foo' };
            await service.publish('my-queue', message);

            expect(mockChannel.sendToQueue).toHaveBeenCalledWith('my-queue', Buffer.from(JSON.stringify(message)), {
                persistent: true,
            });
        });

        it('asserts main queue and DLQ before sending', async () => {
            await service.publish('my-queue', {});

            expect(mockChannel.assertQueue).toHaveBeenCalledWith(
                'my-queue',
                expect.objectContaining({ durable: true }),
            );
            expect(mockChannel.assertQueue).toHaveBeenCalledWith('my-queue_dlq', { durable: true });
        });

        it('throws when write buffer is full', async () => {
            mockChannel.sendToQueue.mockReturnValue(false);

            await expect(service.publish('my-queue', {})).rejects.toThrow(
                'Failed to enqueue message to "my-queue" — write buffer full.',
            );
        });

        it('throws when channel is not initialized', async () => {
            const disconnected = new RabbitMQService('amqp://localhost');

            await expect(disconnected.publish('q', {})).rejects.toThrow('RabbitMQ channel is not initialized');
        });
    });

    describe('consume', () => {
        let capturedMsgHandler: (msg: unknown) => Promise<void>;

        beforeEach(async () => {
            await service.connect();
            mockChannel.consume.mockImplementation(async (_queue: string, handler: typeof capturedMsgHandler) => {
                capturedMsgHandler = handler;
            });
        });

        it('asserts main queue with dead-letter config and DLQ', async () => {
            await service.consume('my-queue', jest.fn());

            expect(mockChannel.assertQueue).toHaveBeenCalledWith(
                'my-queue',
                expect.objectContaining({
                    durable: true,
                    arguments: expect.objectContaining({ 'x-dead-letter-exchange': '' }),
                }),
            );
            expect(mockChannel.assertQueue).toHaveBeenCalledWith('my-queue_dlq', { durable: true });
        });

        it('parses JSON and calls handler, then acks on success', async () => {
            const handler = jest.fn().mockResolvedValue(undefined);
            await service.consume('my-queue', handler);

            const payload = { type: 'release', repo: 'bar' };
            const msg = {
                content: Buffer.from(JSON.stringify(payload)),
                properties: { headers: {} },
            };
            await capturedMsgHandler(msg);

            expect(handler).toHaveBeenCalledWith(payload);
            expect(mockChannel.ack).toHaveBeenCalledWith(msg);
        });

        it('ignores null message from broker', async () => {
            const handler = jest.fn();
            await service.consume('my-queue', handler);

            await capturedMsgHandler(null);

            expect(handler).not.toHaveBeenCalled();
        });

        it('re-enqueues with incremented retry count when handler throws and retries remain', async () => {
            const handler = jest.fn().mockRejectedValue(new Error('transient'));
            await service.consume('my-queue', handler);

            const msg = {
                content: Buffer.from(JSON.stringify({})),
                properties: { headers: { 'x-retry-count': 1 } },
            };
            await capturedMsgHandler(msg);

            expect(mockChannel.sendToQueue).toHaveBeenCalledWith(
                'my-queue',
                msg.content,
                expect.objectContaining({ headers: { 'x-retry-count': 2 } }),
            );
            expect(mockChannel.ack).toHaveBeenCalledWith(msg);
            expect(mockChannel.nack).not.toHaveBeenCalled();
        });

        it('uses 0 as default retry count when header is absent', async () => {
            const handler = jest.fn().mockRejectedValue(new Error('fail'));
            await service.consume('my-queue', handler);

            const msg = {
                content: Buffer.from(JSON.stringify({})),
                properties: { headers: {} },
            };
            await capturedMsgHandler(msg);

            expect(mockChannel.sendToQueue).toHaveBeenCalledWith(
                'my-queue',
                msg.content,
                expect.objectContaining({ headers: { 'x-retry-count': 1 } }),
            );
        });

        it('moves message to DLQ after max retries exceeded', async () => {
            const handler = jest.fn().mockRejectedValue(new Error('persistent'));
            await service.consume('my-queue', handler);

            const msg = {
                content: Buffer.from(JSON.stringify({})),
                properties: { headers: { 'x-retry-count': 3 } },
            };
            await capturedMsgHandler(msg);

            expect(mockChannel.sendToQueue).toHaveBeenCalledWith('my-queue_dlq', msg.content, expect.anything());
            expect(mockChannel.ack).toHaveBeenCalledWith(msg);
        });

        it('nacks retry message when write buffer is full during retry', async () => {
            const handler = jest.fn().mockRejectedValue(new Error('fail'));
            await service.consume('my-queue', handler);
            mockChannel.sendToQueue.mockReturnValue(false);

            const msg = {
                content: Buffer.from(JSON.stringify({})),
                properties: { headers: { 'x-retry-count': 0 } },
            };
            await capturedMsgHandler(msg);

            expect(mockChannel.nack).toHaveBeenCalledWith(msg, false, true);
            expect(mockChannel.ack).not.toHaveBeenCalled();
        });

        it('nacks DLQ move when write buffer is full at max retries', async () => {
            const handler = jest.fn().mockRejectedValue(new Error('fail'));
            await service.consume('my-queue', handler);
            mockChannel.sendToQueue.mockReturnValue(false);

            const msg = {
                content: Buffer.from(JSON.stringify({})),
                properties: { headers: { 'x-retry-count': 3 } },
            };
            await capturedMsgHandler(msg);

            expect(mockChannel.nack).toHaveBeenCalledWith(msg, false, true);
            expect(mockChannel.ack).not.toHaveBeenCalled();
        });
    });
});
