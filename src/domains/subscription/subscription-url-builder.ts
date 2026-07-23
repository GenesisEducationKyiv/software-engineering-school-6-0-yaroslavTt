import { environmentConfig } from '@config/environment';
import type { ISubscriptionUrlBuilder } from './interface/subscription-url-builder.interface';

export class SubscriptionUrlBuilder implements ISubscriptionUrlBuilder {
    confirmUrl(token: string): string {
        return `${environmentConfig.appBaseUrl}/confirm?token=${token}`;
    }
    unsubscribeUrl(token: string): string {
        return `${environmentConfig.appBaseUrl}/unsubscribe?token=${token}`;
    }
}
