import { SubscriptionServiceClient } from '@proto/generated/subscription/v1/subscription';
import { credentials } from '@grpc/grpc-js';
import type { IScannerSubscriptionRepository } from './interface/scanner-subscription.repository.interface';
export class SubscriptionGrpcClient implements IScannerSubscriptionRepository {
    private client: SubscriptionServiceClient;

    constructor(address: string) {
        this.client = new SubscriptionServiceClient(address, credentials.createInsecure());
    }

    findAllDistinctReposConfirmed(): Promise<{ owner: string; repo: string }[]> {
        return new Promise((resolve, reject) => {
            this.client.getDistinctRepos({}, (err, response) => {
                if (err) return reject(err);
                resolve(response.repos);
            });
        });
    }

    findConfirmedSubscribersByRepo(params: {
        owner: string;
        repo: string;
    }): Promise<{ email: string; unsub_token: string; last_seen_tag: string | null }[]> {
        return new Promise((resolve, reject) => {
            this.client.getConfirmedSubscribersByRepo(params, (err, response) => {
                if (err) return reject(err);
                resolve(
                    response.confirmedSubscribers.map((s) => ({
                        email: s.email,
                        unsub_token: s.unsubToken,
                        last_seen_tag: s.lastSeenTag ?? null,
                    })),
                );
            });
        });
    }

    updateLastSeenTag(params: { owner: string; repo: string; tag: string }): Promise<void> {
        return new Promise((resolve, reject) => {
            this.client.updateLastSeenTag(params, (err) => {
                if (err) return reject(err);
                resolve();
            });
        });
    }

    countConfirmed(): Promise<number> {
        return new Promise((resolve, reject) => {
            this.client.countConfirmedSubscriptions({}, (err, response) => {
                if (err) return reject(err);
                resolve(response.count);
            });
        });
    }
}
