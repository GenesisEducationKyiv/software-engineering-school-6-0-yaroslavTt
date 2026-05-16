export interface Subscription {
    id: string;
    email: string;
    owner: string;
    repo: string;
    confirmed: boolean;
    confirm_token: string;
    unsub_token: string;
    last_seen_tag: string | null;
    created_at: Date;
}
