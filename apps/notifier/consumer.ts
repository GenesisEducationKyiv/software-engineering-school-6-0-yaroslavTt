import { createTransport } from 'nodemailer';
import { environmentConfig } from '@config/environment';
import { logger } from '@config/logger';
import { NotifierService, EmailTemplateBuilder, NOTIFICATIONS_QUEUE_NAME } from '@domains/notification';
import type { NotificationMessage } from '@domains/notification';
import { RabbitMQService } from '@utilities/rabbitmq';

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

    logger.info('[Notifier]: Consumer started.');
}
