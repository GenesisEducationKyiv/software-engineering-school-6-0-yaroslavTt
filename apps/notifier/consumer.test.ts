import { startNotifierConsumer } from './consumer';
import { RabbitMQService } from '@utilities/rabbitmq';
import { NotifierService, EmailTemplateBuilder } from '@domains/notification';
import {
    NOTIFICATIONS_QUEUE_NAME,
    SAGA_EMAIL_COMMANDS_QUEUE_NAME,
    SAGA_EMAIL_REPLIES_QUEUE_NAME,
} from '@constants/queues';
import type { NotificationMessage } from '@domains/notification';
import type { SagaEmailCommand } from '@domains/saga';

jest.mock('@utilities/rabbitmq');
jest.mock('@domains/notification', () => ({
    ...jest.requireActual('@domains/notification'),
    NotifierService: jest.fn(),
    EmailTemplateBuilder: jest.fn(),
}));
jest.mock('nodemailer', () => ({ createTransport: jest.fn(() => ({})) }));
jest.mock('@config/environment', () => ({
    environmentConfig: { smtpHost: '', smtpPort: 0, smtpUser: '', smtpPass: '', rabbitmqUrl: '' },
}));
jest.mock('@config/logger', () => ({ logger: { info: jest.fn(), error: jest.fn() } }));

describe('startNotifierConsumer', () => {
    let mockNotifierService: { sendConfirmationEmail: jest.Mock; sendReleaseEmail: jest.Mock };
    let mockConnect: jest.Mock;
    let mockConsume: jest.Mock;
    let mockClose: jest.Mock;
    let mockPublish: jest.Mock;
    let capturedHandlers: Record<string, (message: unknown) => Promise<void>>;

    beforeEach(async () => {
        jest.clearAllMocks();

        mockNotifierService = {
            sendConfirmationEmail: jest.fn().mockResolvedValue(undefined),
            sendReleaseEmail: jest.fn().mockResolvedValue(undefined),
        };

        (NotifierService as jest.MockedClass<typeof NotifierService>).mockImplementation(
            () => mockNotifierService as never,
        );
        (EmailTemplateBuilder as jest.MockedClass<typeof EmailTemplateBuilder>).mockImplementation(() => ({}) as never);

        mockConnect = jest.fn().mockResolvedValue(undefined);
        mockClose = jest.fn().mockResolvedValue(undefined);
        mockPublish = jest.fn().mockResolvedValue(undefined);
        capturedHandlers = {};
        mockConsume = jest.fn().mockImplementation(async (queue: string, handler: (msg: unknown) => Promise<void>) => {
            capturedHandlers[queue] = handler;
        });

        (RabbitMQService as jest.MockedClass<typeof RabbitMQService>).mockImplementation(
            () =>
                ({
                    connect: mockConnect,
                    consume: mockConsume,
                    close: mockClose,
                    publish: mockPublish,
                }) as never,
        );

        await startNotifierConsumer();
    });

    it('connects to RabbitMQ and registers consumer on correct queue', () => {
        expect(mockConnect).toHaveBeenCalledTimes(1);
        expect(mockConsume).toHaveBeenCalledWith(NOTIFICATIONS_QUEUE_NAME, expect.any(Function));
    });

    it('registers consumers on both queues', () => {
        expect(mockConsume).toHaveBeenCalledWith(NOTIFICATIONS_QUEUE_NAME, expect.any(Function));
        expect(mockConsume).toHaveBeenCalledWith(SAGA_EMAIL_COMMANDS_QUEUE_NAME, expect.any(Function));
    });

    it('routes confirmation message to sendConfirmationEmail', async () => {
        const message: NotificationMessage = {
            type: 'confirmation',
            to: 'u@e.com',
            owner: 'owner',
            repo: 'repo',
            confirmUrl: 'http://confirm',
            unsubscribeUrl: 'http://unsub',
        };

        await capturedHandlers[NOTIFICATIONS_QUEUE_NAME](message);

        expect(mockNotifierService.sendConfirmationEmail).toHaveBeenCalledWith(message);
        expect(mockNotifierService.sendReleaseEmail).not.toHaveBeenCalled();
    });

    it('routes release message to sendReleaseEmail', async () => {
        const message: NotificationMessage = {
            type: 'release',
            to: 'u@e.com',
            owner: 'owner',
            repo: 'repo',
            tagName: 'v1.0.0',
            releaseName: 'v1.0.0',
            releaseUrl: 'http://release',
            unsubscribeUrl: 'http://unsub',
        };

        await capturedHandlers[NOTIFICATIONS_QUEUE_NAME](message);

        expect(mockNotifierService.sendReleaseEmail).toHaveBeenCalledWith(message);
        expect(mockNotifierService.sendConfirmationEmail).not.toHaveBeenCalled();
    });

    it('sends saga confirmation email and publishes ACK reply on success', async () => {
        const command: SagaEmailCommand = {
            sagaId: 'saga-1',
            type: 'confirmation',
            to: 'u@e.com',
            owner: 'owner',
            repo: 'repo',
            confirmUrl: 'http://confirm',
            unsubscribeUrl: 'http://unsub',
        };

        await capturedHandlers[SAGA_EMAIL_COMMANDS_QUEUE_NAME](command);

        expect(mockNotifierService.sendConfirmationEmail).toHaveBeenCalledWith(command);
        expect(mockPublish).toHaveBeenCalledWith(SAGA_EMAIL_REPLIES_QUEUE_NAME, { sagaId: 'saga-1', success: true });
    });

    it('publishes NACK reply when saga email fails', async () => {
        mockNotifierService.sendConfirmationEmail.mockRejectedValue(new Error('SMTP error'));
        const command: SagaEmailCommand = {
            sagaId: 'saga-2',
            type: 'confirmation',
            to: 'u@e.com',
            owner: 'owner',
            repo: 'repo',
            confirmUrl: 'http://confirm',
            unsubscribeUrl: 'http://unsub',
        };

        await capturedHandlers[SAGA_EMAIL_COMMANDS_QUEUE_NAME](command);

        expect(mockPublish).toHaveBeenCalledWith(SAGA_EMAIL_REPLIES_QUEUE_NAME, { sagaId: 'saga-2', success: false });
    });

    describe('shutdown handler', () => {
        let exitSpy: jest.SpyInstance;
        let processOnSpy: jest.SpyInstance;
        let capturedShutdown: () => Promise<void>;

        beforeEach(async () => {
            jest.clearAllMocks();

            processOnSpy = jest.spyOn(process, 'on').mockImplementation((event, handler) => {
                if (event === 'SIGTERM' || event === 'SIGINT') {
                    capturedShutdown = handler as () => Promise<void>;
                }
                return process;
            });

            exitSpy = jest.spyOn(process, 'exit').mockImplementation(() => undefined as never);

            mockNotifierService = {
                sendConfirmationEmail: jest.fn(),
                sendReleaseEmail: jest.fn(),
            };
            (NotifierService as jest.MockedClass<typeof NotifierService>).mockImplementation(
                () => mockNotifierService as never,
            );
            (EmailTemplateBuilder as jest.MockedClass<typeof EmailTemplateBuilder>).mockImplementation(
                () => ({}) as never,
            );

            mockConnect = jest.fn().mockResolvedValue(undefined);
            mockClose = jest.fn().mockResolvedValue(undefined);
            mockConsume = jest.fn().mockResolvedValue(undefined);

            (RabbitMQService as jest.MockedClass<typeof RabbitMQService>).mockImplementation(
                () => ({ connect: mockConnect, consume: mockConsume, close: mockClose, publish: jest.fn() }) as never,
            );

            await startNotifierConsumer();
        });

        afterEach(() => {
            processOnSpy.mockRestore();
            exitSpy.mockRestore();
        });

        it('closes RabbitMQ connection and exits on SIGTERM/SIGINT', async () => {
            await capturedShutdown();

            expect(mockClose).toHaveBeenCalledTimes(1);
            expect(exitSpy).toHaveBeenCalledWith(0);
        });
    });
});
