export interface SubscribeSagaPayload {
    email: string;
    owner: string;
    repo: string;
    confirmToken: string;
    unsubToken: string;
    confirmUrl: string;
    unsubscribeUrl: string;
}
