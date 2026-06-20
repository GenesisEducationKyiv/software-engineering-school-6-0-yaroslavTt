import type { ConfirmationNotificationMessage } from '@domains/notification';

export interface SagaEmailCommand extends ConfirmationNotificationMessage {
    sagaId: string;
}
