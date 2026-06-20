import { createTransport } from 'nodemailer';
import { environmentConfig } from '@config/environment';
import { logger } from '@config/logger';
import { NotifierService, EmailTemplateBuilder } from '@domains/notification';
import {
    NOTIFICATIONS_QUEUE_NAME,
    SAGA_EMAIL_COMMANDS_QUEUE_NAME,
    SAGA_EMAIL_REPLIES_QUEUE_NAME,
} from '@constants/queues';
import type { NotificationMessage } from '@domains/notification';
import { RabbitMQService } from '@utilities/rabbitmq';
import type { SagaEmailCommand } from '@domains/saga';
import type { SagaEmailReply } from '@domains/saga';

export async function startNotifierConsumer(): Promise<void> {
    const transporter = createTransport({
        host: environmentConfig.smtpHost,
        port: environmentConfig.smtpPort,
        auth: { user: environmentConfig.smtpUser, pass: environmentConfig.smtpPass },
    });

    const notifierService = new NotifierService(transporter, new EmailTemplateBuilder());
    const rabbitMQ = new RabbitMQService(environmentConfig.rabbitmqUrl);

    await rabbitMQ.connect();

    const shutdown = async () => {
        logger.info('[Notifier]: Shutting down.');
        await rabbitMQ.close();
        process.exit(0);
    };

    process.on('SIGTERM', shutdown);
    process.on('SIGINT', shutdown);

    await rabbitMQ.consume<NotificationMessage>(NOTIFICATIONS_QUEUE_NAME, async (message) => {
        if (message.type === 'confirmation') {
            await notifierService.sendConfirmationEmail(message);
        } else {
            await notifierService.sendReleaseEmail(message);
        }
    });

    await rabbitMQ.consume<SagaEmailCommand>(SAGA_EMAIL_COMMANDS_QUEUE_NAME, async (message) => {
        const reply: SagaEmailReply = { sagaId: message.sagaId, success: false };
        try {
            await notifierService.sendConfirmationEmail(message);
            reply.success = true;
        } catch (err) {
            logger.error({ err, sagaId: message.sagaId }, '[Notifier]: Failed to send saga confirmation email.');
        }
        await rabbitMQ.publish(SAGA_EMAIL_REPLIES_QUEUE_NAME, reply);
    });

    logger.info('[Notifier]: Consumer started.');
}
