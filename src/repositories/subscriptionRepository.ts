import { pool } from '../db/index.js';
import type { Subscription, SubscriptionRow } from '../types/subscription.js';

export async function create(params: {
    email: string;
    owner: string;
    repo: string;
    confirmToken: string;
    unsubToken: string;
}): Promise<Subscription | null> {
    const { email, owner, repo, confirmToken, unsubToken } = params;
    const result = await pool.query<Subscription>(
        `INSERT INTO subscriptions (email, owner, repo, confirm_token, unsub_token)
     VALUES ($1, $2, $3, $4, $5)
     ON CONFLICT (email, owner, repo) DO NOTHING
     RETURNING *`,
        [email, owner, repo, confirmToken, unsubToken],
    );
    return result.rows[0] ?? null;
}

export async function findByConfirmToken(token: string): Promise<Subscription | null> {
    const result = await pool.query<Subscription>('SELECT * FROM subscriptions WHERE confirm_token = $1', [token]);
    return result.rows[0] ?? null;
}

export async function findByUnsubToken(token: string): Promise<Subscription | null> {
    const result = await pool.query<Subscription>('SELECT * FROM subscriptions WHERE unsub_token = $1', [token]);
    return result.rows[0] ?? null;
}

export async function setConfirmed(confirmToken: string): Promise<void> {
    await pool.query('UPDATE subscriptions SET confirmed = TRUE WHERE confirm_token = $1', [confirmToken]);
}

export async function deleteByUnsubToken(token: string): Promise<number> {
    const result = await pool.query('DELETE FROM subscriptions WHERE unsub_token = $1', [token]);
    return result.rowCount ?? 0;
}

export async function findConfirmedByEmail(email: string): Promise<SubscriptionRow[]> {
    const result = await pool.query<SubscriptionRow>(
        `SELECT email, owner || '/' || repo AS repo, confirmed, last_seen_tag
     FROM subscriptions
     WHERE email = $1 AND confirmed = TRUE`,
        [email],
    );
    return result.rows;
}

export async function findAllDistinctReposConfirmed(): Promise<{ owner: string; repo: string }[]> {
    const result = await pool.query<{ owner: string; repo: string }>(
        'SELECT DISTINCT owner, repo FROM subscriptions WHERE confirmed = TRUE',
    );
    return result.rows;
}

export async function findConfirmedSubscribersByRepo(params: {
    owner: string;
    repo: string;
}): Promise<{ email: string; unsub_token: string; last_seen_tag: string | null }[]> {
    const result = await pool.query(
        `SELECT email, unsub_token, last_seen_tag
     FROM subscriptions
     WHERE owner = $1 AND repo = $2 AND confirmed = TRUE`,
        [params.owner, params.repo],
    );
    return result.rows;
}

export async function updateLastSeenTag(params: { owner: string; repo: string; tag: string }): Promise<void> {
    await pool.query('UPDATE subscriptions SET last_seen_tag = $3 WHERE owner = $1 AND repo = $2', [
        params.owner,
        params.repo,
        params.tag,
    ]);
}
