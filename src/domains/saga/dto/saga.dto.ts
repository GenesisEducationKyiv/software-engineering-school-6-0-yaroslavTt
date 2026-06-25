import type { SagaType, SagaStatus } from '../types';

export interface Saga<T = Record<string, unknown>> {
    id: string;
    type: SagaType;
    status: SagaStatus;
    payload: T;
    created_at: Date;
    updated_at: Date;
}
