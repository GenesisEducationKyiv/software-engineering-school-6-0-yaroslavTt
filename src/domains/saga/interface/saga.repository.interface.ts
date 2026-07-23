import type { Saga } from '../dto/saga.dto';
import type { SagaStatus, SagaType } from '../types';

export interface ISagaRepository {
    create(params: { type: SagaType; status: SagaStatus; payload: unknown }): Promise<Saga>;

    updateStatus(params: { id: string; status: SagaStatus }): Promise<void>;

    findById<T = Record<string, unknown>>(id: string): Promise<Saga<T> | null>;
}
