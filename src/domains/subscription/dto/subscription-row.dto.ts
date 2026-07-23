export interface SubscriptionRow {
    email: string;
    repo: string; // owner/repo combined
    confirmed: boolean;
    last_seen_tag: string | null;
}
