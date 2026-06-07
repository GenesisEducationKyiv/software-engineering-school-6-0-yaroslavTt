import type { IRabbitMQService } from '@utilities/rabbitmq';
import type { INotifierService } from './interface/notifier.service.interface';
import type { NotificationMessage } from './dto/notification-message.dto';
import { NOTIFICATIONS_QUEUE_NAME } from './constants';

export class RabbitMQNotifierService implements INotifierService {
    constructor(private readonly rabbitMQService: IRabbitMQService) {}

    async sendConfirmationEmail(params: {
        to: string;
        owner: string;
        repo: string;
        confirmUrl: string;
        unsubscribeUrl: string;
    }): Promise<void> {
        const message: NotificationMessage = { type: 'confirmation', ...params };
        await this.rabbitMQService.publish(NOTIFICATIONS_QUEUE_NAME, message);
    }

    async sendReleaseEmail(params: {
        to: string;
        owner: string;
        repo: string;
        tagName: string;
        releaseName: string;
        releaseUrl: string;
        unsubscribeUrl: string;
    }): Promise<void> {
        const message: NotificationMessage = { type: 'release', ...params };
        await this.rabbitMQService.publish(NOTIFICATIONS_QUEUE_NAME, message);
    }
}
