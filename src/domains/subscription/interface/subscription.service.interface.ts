import type { SubscribePayload } from '../dto/subscribe-payload.dto';
import type { SubscriptionRow } from '../dto/subscription-row.dto';

export interface ISubscriptionService {
    subscribe(params: SubscribePayload): Promise<void>;
    confirmSubscription(token: string): Promise<void>;
    unsubscribe(token: string): Promise<void>;
    getSubscriptions(email: string): Promise<SubscriptionRow[]>;
}
