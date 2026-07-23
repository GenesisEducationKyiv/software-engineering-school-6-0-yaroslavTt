export interface ISubscriptionUrlBuilder {
    confirmUrl(token: string): string;
    unsubscribeUrl(token: string): string;
}
