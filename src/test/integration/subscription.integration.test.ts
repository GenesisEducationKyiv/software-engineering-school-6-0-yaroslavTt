import type { StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import type { Pool } from 'pg';
import type { Express } from 'express';
import { startTestDb } from './helpers/db';
import { createApp } from '../../app';
import { SubscriptionRepository } from '@domains/subscription/subscription.repository';
import { SubscriptionService } from '@domains/subscription/subscription.service';
import { SubscriptionUrlBuilder } from '@domains/subscription/subscription-url-builder';
import { createMockGithubService, createMockNotifierService } from '@test/mock-utils';
import { CryptoTokenGenerator } from '@utilities/token/crypto-token-generator';
import request from 'supertest';
import type { SubscribePayload } from '@domains/subscription/dto/subscribe-payload.dto';
import type { IGithubService } from '@domains/github/interface/github.service.interface';

describe('Subscription Integration Tests', () => {
    // one container for the whole suite
    let app: Express;
    let pool: Pool;
    let container: StartedPostgreSqlContainer;
    let mockGithubService: jest.Mocked<IGithubService>;

    beforeAll(async () => {
        ({ pool, container } = await startTestDb());
        const subscriptionRepository = new SubscriptionRepository(pool);
        mockGithubService = createMockGithubService();
        const mockNotifierService = createMockNotifierService();

        mockGithubService.repoExists.mockResolvedValue(true); // default: repo exists

        const service = new SubscriptionService(
            subscriptionRepository,
            mockGithubService,
            mockNotifierService,
            new CryptoTokenGenerator(),
            new SubscriptionUrlBuilder(),
        );
        app = createApp(service);
    }, 60_000); // container pull can take time

    afterAll(async () => {
        await pool.end();
        await container.stop();
    });

    afterEach(async () => {
        await pool.query('TRUNCATE subscriptions RESTART IDENTITY CASCADE'); // clean up after each test
    });

    describe('POST /subscribe', () => {
        const endpoint = '/api/subscribe';
        const validPayload: SubscribePayload = {
            email: 'test@example.com',
            repo: 'owner/repo',
        };

        it('Success flow - should create subscription and return 200', async () => {
            const response = await request(app).post(endpoint).send(validPayload);

            expect(response.status).toBe(200);
            expect(response.body).toEqual({
                message: 'Subscription successful. Confirmation email sent.',
            });

            const subscriptionsFromDb = await pool.query('SELECT * FROM subscriptions WHERE email = $1', [
                validPayload.email,
            ]);

            expect(subscriptionsFromDb.rowCount).toBe(1);
            const subscription = subscriptionsFromDb.rows[0];
            expect(subscription.email).toBe(validPayload.email);
            expect(subscription.owner).toBe('owner');
            expect(subscription.repo).toBe('repo');
            expect(subscription.confirmed).toBe(false);
            expect(subscription.confirm_token).toBeTruthy();
            expect(subscription.unsub_token).toBeTruthy();
        });

        it('Invalid email flow - should not create subscription and return 400', async () => {
            const payload: SubscribePayload = {
                ...validPayload,
                email: 'invalid-email',
            };

            const response = await request(app).post(endpoint).send(payload);

            expect(response.status).toBe(400);
            expect(response.body).toEqual({
                error: 'Invalid email address',
            });

            const subscriptionsFromDb = await pool.query('SELECT * FROM subscriptions WHERE email = $1', [
                payload.email,
            ]);

            expect(subscriptionsFromDb.rowCount).toBe(0);
        });

        it('Invalid repo flow - should not create subscription and return 400', async () => {
            const payload: SubscribePayload = {
                ...validPayload,
                repo: 'invalid-repo-format',
            };

            const response = await request(app).post(endpoint).send(payload);

            expect(response.status).toBe(400);
            expect(response.body).toEqual({
                error: 'Invalid repo format — expected owner/repo',
            });

            const subscriptionsFromDb = await pool.query('SELECT * FROM subscriptions WHERE email = $1', [
                payload.email,
            ]);

            expect(subscriptionsFromDb.rowCount).toBe(0);
        });

        it('Non-existent repo flow - should not create subscription and return 404', async () => {
            mockGithubService.repoExists.mockResolvedValueOnce(false);
            const response = await request(app).post(endpoint).send(validPayload);

            expect(response.status).toBe(404);
            expect(response.body).toEqual({
                error: 'Repository owner/repo not found on GitHub',
            });

            const subscriptionsFromDb = await pool.query('SELECT * FROM subscriptions WHERE email = $1', [
                validPayload.email,
            ]);

            expect(subscriptionsFromDb.rowCount).toBe(0);
        });

        it('Duplicate subscription flow - should create subscription on first call and return 409 on subsequent calls', async () => {
            const firstResponse = await request(app).post(endpoint).send(validPayload);

            expect(firstResponse.status).toBe(200);
            expect(firstResponse.body).toEqual({
                message: 'Subscription successful. Confirmation email sent.',
            });

            const subscriptionsAfterFirstCall = await pool.query('SELECT * FROM subscriptions WHERE email = $1', [
                validPayload.email,
            ]);

            expect(subscriptionsAfterFirstCall.rowCount).toBe(1);

            const secondResponse = await request(app).post(endpoint).send(validPayload);
            expect(secondResponse.status).toBe(409);
            expect(secondResponse.body).toEqual({
                error: 'This email is already subscribed to that repository',
            });

            const subscriptionsAfterSecondCall = await pool.query('SELECT * FROM subscriptions WHERE email = $1', [
                validPayload.email,
            ]);

            expect(subscriptionsAfterSecondCall.rowCount).toBe(1); // still only 1 subscription in DB
        });
    });

    describe('GET /confirm/:token', () => {
        const token = 'confirm-token';
        const endpoint = `/api/confirm/${token}`;
        const mockUnconfirmedSubscription = {
            email: 'mock-email@email.com',
            owner: 'owner',
            repo: 'repo',
            confirm_token: token,
            unsub_token: 'unsub-token',
            confirmed: false,
        };

        it('Success flow - should set subscription as confirmed for existing token and return 200', async () => {
            const { email, owner, repo, unsub_token } = mockUnconfirmedSubscription;
            // First, create a subscription with the confirm token
            await pool.query(
                `INSERT INTO subscriptions (email, owner, repo, confirm_token, unsub_token, confirmed)
                VALUES ($1, $2, $3, $4, $5, FALSE)`,
                [email, owner, repo, token, unsub_token],
            );

            const response = await request(app).get(endpoint);

            expect(response.status).toBe(200);
            expect(response.body).toEqual({
                message: 'Subscription confirmed successfully',
            });

            const subscriptionsFromDb = await pool.query('SELECT * FROM subscriptions WHERE email = $1', [email]);

            expect(subscriptionsFromDb.rowCount).toBe(1);
            const subscription = subscriptionsFromDb.rows[0];
            expect(subscription.email).toBe(email);
            expect(subscription.owner).toBe(owner);
            expect(subscription.repo).toBe(repo);
            expect(subscription.confirmed).toBe(true);
            expect(subscription.confirm_token).toBe(token);
            expect(subscription.unsub_token).toBe(unsub_token);
        });

        it('Non-existent subscription flow - should return 404', async () => {
            const response = await request(app).get(endpoint);

            expect(response.status).toBe(404);
            expect(response.body).toEqual({
                error: 'Confirmation token not found',
            });
        });
    });

    describe('GET /unsubscribe/:token', () => {
        const token = 'unsub-token';
        const endpoint = `/api/unsubscribe/${token}`;
        const mockSubscription = {
            email: 'mock-email@email.com',
            owner: 'owner',
            repo: 'repo',
            confirm_token: 'confirm-token',
            unsub_token: token,
            confirmed: true,
        };

        it('Success flow - should delete subscription for existing token and return 200', async () => {
            const { email, owner, repo, confirm_token } = mockSubscription;
            // First, create a subscription with the unsubscribe token
            await pool.query(
                `INSERT INTO subscriptions (email, owner, repo, confirm_token, unsub_token, confirmed)
                VALUES ($1, $2, $3, $4, $5, TRUE)`,
                [email, owner, repo, confirm_token, token],
            );

            const response = await request(app).get(endpoint);

            expect(response.status).toBe(200);
            expect(response.body).toEqual({
                message: 'Unsubscribed successfully',
            });

            const subscriptionsFromDb = await pool.query('SELECT * FROM subscriptions WHERE email = $1', [email]);

            expect(subscriptionsFromDb.rowCount).toBe(0); // subscription should be deleted
        });

        it('Non-existent subscription flow - should return 404', async () => {
            const response = await request(app).get(endpoint);

            expect(response.status).toBe(404);
            expect(response.body).toEqual({
                error: 'Unsubscribe token not found',
            });
        });
    });

    describe('GET /subscriptions?email=:email', () => {
        it('Success flow - if email is provided in query params, returns 200', async () => {
            const email = 'mock-email@email.com';
            const mockSubscription = {
                email: email,
                owner: 'owner',
                repo: 'repo',
                confirm_token: 'confirm-token',
                unsub_token: 'unsub-token',
                confirmed: true,
            };
            const { owner, repo, confirm_token, unsub_token } = mockSubscription;

            const endpoint = `/api/subscriptions?email=${email}`;

            // First, create a subscription with the unsubscribe token
            await pool.query(
                `INSERT INTO subscriptions (email, owner, repo, confirm_token, unsub_token, confirmed)
                VALUES ($1, $2, $3, $4, $5, TRUE)`,
                [email, owner, repo, confirm_token, unsub_token],
            );

            const response = await request(app).get(endpoint);

            expect(response.status).toBe(200);
            expect(response.body).toEqual([
                expect.objectContaining({
                    email: email,
                    repo: `${owner}/${repo}`,
                    confirmed: true,
                    last_seen_tag: null,
                }),
            ]);
        });

        it('Unconfirmed subscription - should not appear in results', async () => {
            const email = 'mock-email@email.com';
            const endpoint = `/api/subscriptions?email=${email}`;

            await pool.query(
                `INSERT INTO subscriptions (email, owner, repo, confirm_token, unsub_token, confirmed)
                VALUES ($1, $2, $3, $4, $5, FALSE)`,
                [email, 'owner', 'repo', 'confirm-token', 'unsub-token'],
            );

            const response = await request(app).get(endpoint);

            expect(response.status).toBe(200);
            expect(response.body).toEqual([]);
        });

        it('Email missing from query params - should return 400', async () => {
            const endpoint = '/api/subscriptions';

            const response = await request(app).get(endpoint);

            expect(response.status).toBe(400);
            expect(response.body).toEqual({
                error: 'email query parameter is required',
            });
        });

        it('Invalid format email in query params - should return 400', async () => {
            const invalidEmail = 'invalid-email';
            const endpoint = `/api/subscriptions?email=${invalidEmail}`;

            const response = await request(app).get(endpoint);

            expect(response.status).toBe(400);
            expect(response.body).toEqual({
                error: 'Invalid email format',
            });
        });
    });

    describe('GET /health', () => {
        it('returns 200 with status ok', async () => {
            const response = await request(app).get('/health');

            expect(response.status).toBe(200);
            expect(response.body.status).toBe('ok');
            expect(typeof response.body.uptime).toBe('number');
        });
    });
});
