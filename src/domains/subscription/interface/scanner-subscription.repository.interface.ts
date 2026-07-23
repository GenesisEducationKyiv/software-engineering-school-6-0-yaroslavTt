export interface IScannerSubscriptionRepository {
    findAllDistinctReposConfirmed(): Promise<{ owner: string; repo: string }[]>;

    findConfirmedSubscribersByRepo(params: {
        owner: string;
        repo: string;
    }): Promise<{ email: string; unsub_token: string; last_seen_tag: string | null }[]>;

    updateLastSeenTag(params: { owner: string; repo: string; tag: string }): Promise<void>;

    countConfirmed(): Promise<number>;
}
