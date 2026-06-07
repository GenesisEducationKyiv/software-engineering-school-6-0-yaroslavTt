// Classes
export { NotifierService } from './notifier.service';
export { RabbitMQNotifierService } from './rabbitmq-notifier.service';
export { EmailTemplateBuilder } from './email-template-builder';

// DTOs
export type { NotificationMessage } from './dto/notification-message.dto';

// Interfaces
export type { INotifierService } from './interface/notifier.service.interface';
export type { IEmailTemplateBuilder } from './interface/email-template-builder.interface';

// Constants
export { NOTIFICATIONS_QUEUE_NAME } from './constants';
