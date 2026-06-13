import type { IRabbitMQService } from '@utilities/rabbitmq';
import { RabbitMQNotifierService } from './rabbitmq-notifier.service';
import { NOTIFICATIONS_QUEUE_NAME } from '@constants/queues';

let mockRabbitMQ: jest.Mocked<IRabbitMQService>;
let service: RabbitMQNotifierService;

describe('RabbitMQNotifierService', () => {
    beforeEach(() => {
        mockRabbitMQ = {
            connect: jest.fn(),
            close: jest.fn(),
            publish: jest.fn().mockResolvedValue(undefined),
            consume: jest.fn(),
        };
        service = new RabbitMQNotifierService(mockRabbitMQ);
    });

    describe('sendConfirmationEmail', () => {
        it('publishes confirmation message to queue', async () => {
            const params = {
                to: 'u@e.com',
                owner: 'a',
                repo: 'b',
                confirmUrl: 'http://c',
                unsubscribeUrl: 'http://u',
            };

            await service.sendConfirmationEmail(params);

            expect(mockRabbitMQ.publish).toHaveBeenCalledWith(NOTIFICATIONS_QUEUE_NAME, {
                type: 'confirmation',
                ...params,
            });
        });
    });

    describe('sendReleaseEmail', () => {
        it('publishes release message to queue', async () => {
            const params = {
                to: 'u@e.com',
                owner: 'a',
                repo: 'b',
                tagName: 'v1.0',
                releaseName: 'Release',
                releaseUrl: 'http://r',
                unsubscribeUrl: 'http://u',
            };

            await service.sendReleaseEmail(params);

            expect(mockRabbitMQ.publish).toHaveBeenCalledWith(NOTIFICATIONS_QUEUE_NAME, {
                type: 'release',
                ...params,
            });
        });
    });
});
