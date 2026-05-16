import type { SubscriptionRow } from './dto/subscription-row.dto';
import type { Subscription } from './dto/subscription.dto';
import type { ISubscriptionRepository } from './interface/subscription.repository.interface';
import type { Pool } from 'pg';

export class SubscriptionRepository implements ISubscriptionRepository {
    constructor(private readonly pool: Pool) {}

    async create(params: {
        email: string;
        owner: string;
        repo: string;
        confirmToken: string;
        unsubToken: string;
    }): Promise<Subscription | null> {
        const { email, owner, repo, confirmToken, unsubToken } = params;
        const result = await this.pool.query<Subscription>(
            `INSERT INTO subscriptions (email, owner, repo, confirm_token, unsub_token)
            VALUES ($1, $2, $3, $4, $5)
            ON CONFLICT (email, owner, repo) DO NOTHING
            RETURNING *`,
            [email, owner, repo, confirmToken, unsubToken],
        );
        return result.rows[0] ?? null;
    }

    async findByConfirmToken(token: string): Promise<Subscription | null> {
        const result = await this.pool.query<Subscription>('SELECT * FROM subscriptions WHERE confirm_token = $1', [
            token,
        ]);
        return result.rows[0] ?? null;
    }

    async findByUnsubToken(token: string): Promise<Subscription | null> {
        const result = await this.pool.query<Subscription>('SELECT * FROM subscriptions WHERE unsub_token = $1', [
            token,
        ]);
        return result.rows[0] ?? null;
    }

    async setConfirmed(confirmToken: string): Promise<void> {
        await this.pool.query('UPDATE subscriptions SET confirmed = TRUE WHERE confirm_token = $1', [confirmToken]);
    }

    async deleteByUnsubToken(token: string): Promise<number> {
        const result = await this.pool.query('DELETE FROM subscriptions WHERE unsub_token = $1', [token]);
        return result.rowCount ?? 0;
    }

    async findConfirmedByEmail(email: string): Promise<SubscriptionRow[]> {
        const result = await this.pool.query<SubscriptionRow>(
            `SELECT email, owner || '/' || repo AS repo, confirmed, last_seen_tag
            FROM subscriptions
            WHERE email = $1 AND confirmed = TRUE`,
            [email],
        );
        return result.rows;
    }

    async findAllDistinctReposConfirmed(): Promise<{ owner: string; repo: string }[]> {
        const result = await this.pool.query<{ owner: string; repo: string }>(
            'SELECT DISTINCT owner, repo FROM subscriptions WHERE confirmed = TRUE',
        );
        return result.rows;
    }

    async findConfirmedSubscribersByRepo(params: {
        owner: string;
        repo: string;
    }): Promise<{ email: string; unsub_token: string; last_seen_tag: string | null }[]> {
        const result = await this.pool.query(
            `SELECT email, unsub_token, last_seen_tag
            FROM subscriptions
            WHERE owner = $1 AND repo = $2 AND confirmed = TRUE`,
            [params.owner, params.repo],
        );
        return result.rows;
    }

    async updateLastSeenTag(params: { owner: string; repo: string; tag: string }): Promise<void> {
        await this.pool.query('UPDATE subscriptions SET last_seen_tag = $3 WHERE owner = $1 AND repo = $2', [
            params.owner,
            params.repo,
            params.tag,
        ]);
    }

    async countConfirmed(): Promise<number> {
        const result = await this.pool.query('SELECT COUNT(*) FROM subscriptions WHERE confirmed = TRUE');
        return parseInt(result.rows[0].count, 10);
    }
}
