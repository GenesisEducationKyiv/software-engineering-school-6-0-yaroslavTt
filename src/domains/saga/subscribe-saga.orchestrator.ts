import type { ISubscriptionRepository } from '@domains/subscription';
import type { ISagaRepository } from './interface/saga.repository.interface';
import type { IRabbitMQService } from '@utilities/rabbitmq';
import type { SubscribeSagaPayload } from './dto/subscribe-saga-payload.dto';
import { SagaStatus, SagaType } from './types';
import { SAGA_EMAIL_COMMANDS_QUEUE_NAME } from '@constants/queues';
import type { SagaEmailCommand } from './dto/saga-email-command.dto';

export class SubscribeSagaOrchestrator {
    constructor(
        private readonly sagaRepository: ISagaRepository,
        private readonly subscriptionRepository: ISubscriptionRepository,
        private readonly rabbitMQService: IRabbitMQService,
    ) {}

    async start(payload: SubscribeSagaPayload): Promise<string> {
        const { email, owner, repo, confirmUrl, unsubscribeUrl } = payload;
        const createdSaga = await this.sagaRepository.create({
            type: SagaType.SUBSCRIBE,
            status: SagaStatus.STARTED,
            payload,
        });
        const sagaId = createdSaga.id;

        const messagePayload: SagaEmailCommand = {
            sagaId,
            type: 'confirmation',
            to: email,
            confirmUrl,
            unsubscribeUrl,
            repo,
            owner,
        };

        await this.rabbitMQService.publish(SAGA_EMAIL_COMMANDS_QUEUE_NAME, messagePayload);

        await this.sagaRepository.updateStatus({
            id: sagaId,
            status: SagaStatus.EMAIL_REQUESTED,
        });

        return sagaId;
    }

    async handleReply(sagaId: string, success: boolean): Promise<void> {
        // !success → updateStatus COMPENSATING
        //            delete subscription (use email+owner+repo from saga.payload)
        //            updateStatus FAILED
        if (success) {
            await this.sagaRepository.updateStatus({
                id: sagaId,
                status: SagaStatus.COMPLETED,
            });
        } else {
            const saga = await this.sagaRepository.findById<SubscribeSagaPayload>(sagaId);
            if (!saga) {
                throw new Error(`[SubscribeSagaOrchestrator]: Saga not found: ${sagaId}`);
            }
            await this.sagaRepository.updateStatus({
                id: sagaId,
                status: SagaStatus.COMPENSATING,
            });

            await this.subscriptionRepository.deleteByUnsubToken(saga.payload.unsubToken);
            await this.sagaRepository.updateStatus({
                id: sagaId,
                status: SagaStatus.FAILED,
            });
        }
    }
}
