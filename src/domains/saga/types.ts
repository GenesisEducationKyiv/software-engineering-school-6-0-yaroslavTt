export enum SagaStatus {
    STARTED = 'STARTED',
    EMAIL_REQUESTED = 'EMAIL_REQUESTED',
    COMPLETED = 'COMPLETED',
    COMPENSATING = 'COMPENSATING',
    FAILED = 'FAILED',
}

export enum SagaType {
    SUBSCRIBE = 'subscribe',
}
