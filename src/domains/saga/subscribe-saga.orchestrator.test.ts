import { SubscribeSagaOrchestrator } from './subscribe-saga.orchestrator';
import { SagaStatus, SagaType } from './types';
import { SAGA_EMAIL_COMMANDS_QUEUE_NAME } from '@constants/queues';
import type { ISagaRepository } from './interface/saga.repository.interface';
import type { ISubscriptionRepository } from '@domains/subscription';
import type { IRabbitMQService } from '@utilities/rabbitmq';
import type { SubscribeSagaPayload } from './dto/subscribe-saga-payload.dto';
import type { Saga } from './dto/saga.dto';

const SAGA_ID = 'saga-uuid';

const validPayload: SubscribeSagaPayload = {
    email: 'u@e.com',
    owner: 'golang',
    repo: 'go',
    confirmToken: 'ct',
    unsubToken: 'ut',
    confirmUrl: 'http://confirm/ct',
    unsubscribeUrl: 'http://unsub/ut',
};

function makeSagaRow(overrides: Partial<Saga<SubscribeSagaPayload>> = {}): Saga<SubscribeSagaPayload> {
    return {
        id: SAGA_ID,
        type: SagaType.SUBSCRIBE,
        status: SagaStatus.STARTED,
        payload: validPayload,
        created_at: new Date(),
        updated_at: new Date(),
        ...overrides,
    };
}

function makeMocks() {
    const sagaRepository: jest.Mocked<ISagaRepository> = {
        create: jest.fn().mockResolvedValue(makeSagaRow()),
        updateStatus: jest.fn().mockResolvedValue(undefined),
        findById: jest.fn().mockResolvedValue(makeSagaRow()),
    };

    const subscriptionRepository: jest.Mocked<Pick<ISubscriptionRepository, 'deleteByUnsubToken'>> = {
        deleteByUnsubToken: jest.fn().mockResolvedValue(1),
    };

    const rabbitMQService: jest.Mocked<Pick<IRabbitMQService, 'publish'>> = {
        publish: jest.fn().mockResolvedValue(undefined),
    };

    const orchestrator = new SubscribeSagaOrchestrator(
        sagaRepository,
        subscriptionRepository as never,
        rabbitMQService as never,
    );

    return { orchestrator, sagaRepository, subscriptionRepository, rabbitMQService };
}

describe('SubscribeSagaOrchestrator', () => {
    describe('start()', () => {
        it('creates saga with STARTED status', async () => {
            const { orchestrator, sagaRepository } = makeMocks();

            await orchestrator.start(validPayload);

            expect(sagaRepository.create).toHaveBeenCalledWith({
                type: SagaType.SUBSCRIBE,
                status: SagaStatus.STARTED,
                payload: validPayload,
            });
        });

        it('publishes email command to correct queue', async () => {
            const { orchestrator, rabbitMQService } = makeMocks();

            await orchestrator.start(validPayload);

            expect(rabbitMQService.publish).toHaveBeenCalledWith(SAGA_EMAIL_COMMANDS_QUEUE_NAME, {
                sagaId: SAGA_ID,
                type: 'confirmation',
                to: validPayload.email,
                owner: validPayload.owner,
                repo: validPayload.repo,
                confirmUrl: validPayload.confirmUrl,
                unsubscribeUrl: validPayload.unsubscribeUrl,
            });
        });

        it('updates saga status to EMAIL_REQUESTED after publish', async () => {
            const { orchestrator, sagaRepository, rabbitMQService } = makeMocks();

            await orchestrator.start(validPayload);

            const publishOrder = rabbitMQService.publish.mock.invocationCallOrder[0];
            const updateOrder = sagaRepository.updateStatus.mock.invocationCallOrder[0];
            expect(publishOrder).toBeLessThan(updateOrder);

            expect(sagaRepository.updateStatus).toHaveBeenCalledWith({
                id: SAGA_ID,
                status: SagaStatus.EMAIL_REQUESTED,
            });
        });

        it('returns the saga id', async () => {
            const { orchestrator } = makeMocks();

            const sagaId = await orchestrator.start(validPayload);

            expect(sagaId).toBe(SAGA_ID);
        });
    });

    describe('handleReply()', () => {
        it('marks saga COMPLETED on success', async () => {
            const { orchestrator, sagaRepository } = makeMocks();

            await orchestrator.handleReply(SAGA_ID, true);

            expect(sagaRepository.updateStatus).toHaveBeenCalledWith({
                id: SAGA_ID,
                status: SagaStatus.COMPLETED,
            });
        });

        it('does not touch subscription repository on success', async () => {
            const { orchestrator, subscriptionRepository } = makeMocks();

            await orchestrator.handleReply(SAGA_ID, true);

            expect(subscriptionRepository.deleteByUnsubToken).not.toHaveBeenCalled();
        });

        it('marks saga COMPENSATING then FAILED on failure', async () => {
            const { orchestrator, sagaRepository } = makeMocks();

            await orchestrator.handleReply(SAGA_ID, false);

            expect(sagaRepository.updateStatus).toHaveBeenCalledWith({
                id: SAGA_ID,
                status: SagaStatus.COMPENSATING,
            });
            expect(sagaRepository.updateStatus).toHaveBeenCalledWith({
                id: SAGA_ID,
                status: SagaStatus.FAILED,
            });
        });

        it('deletes subscription using unsubToken from saga payload on failure', async () => {
            const { orchestrator, subscriptionRepository } = makeMocks();

            await orchestrator.handleReply(SAGA_ID, false);

            expect(subscriptionRepository.deleteByUnsubToken).toHaveBeenCalledWith(validPayload.unsubToken);
        });

        it('throws if saga not found on failure', async () => {
            const { orchestrator, sagaRepository } = makeMocks();
            sagaRepository.findById.mockResolvedValue(null);

            await expect(orchestrator.handleReply(SAGA_ID, false)).rejects.toThrow(
                `[SubscribeSagaOrchestrator]: Saga not found: ${SAGA_ID}`,
            );
        });
    });
});
