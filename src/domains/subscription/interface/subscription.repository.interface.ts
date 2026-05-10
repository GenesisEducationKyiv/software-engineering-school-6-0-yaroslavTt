import type { Subscription } from '../dto/subscription.dto';
import type { SubscriptionRow } from '../dto/subscription-row.dto';

export interface ISubscriptionRepository {
    create(params: {
        email: string;
        owner: string;
        repo: string;
        confirmToken: string;
        unsubToken: string;
    }): Promise<Subscription | null>;

    findByConfirmToken(token: string): Promise<Subscription | null>;

    findByUnsubToken(token: string): Promise<Subscription | null>;

    setConfirmed(confirmToken: string): Promise<void>;

    deleteByUnsubToken(token: string): Promise<number>;

    findConfirmedByEmail(email: string): Promise<SubscriptionRow[]>;

    findAllDistinctReposConfirmed(): Promise<{ owner: string; repo: string }[]>;

    findConfirmedSubscribersByRepo(params: {
        owner: string;
        repo: string;
    }): Promise<{ email: string; unsub_token: string; last_seen_tag: string | null }[]>;

    updateLastSeenTag(params: { owner: string; repo: string; tag: string }): Promise<void>;

    countConfirmed(): Promise<number>;
}
