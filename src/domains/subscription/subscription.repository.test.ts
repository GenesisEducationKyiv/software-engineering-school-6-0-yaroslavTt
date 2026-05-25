import type { Subscription } from './dto/subscription.dto';
import type { Pool, QueryResult } from 'pg';
import type { ISubscriptionRepository } from './interface/subscription.repository.interface';
import { SubscriptionRepository } from './subscription.repository';
import { createValidSubscription } from '@test/mock-utils';

const validSubscription = createValidSubscription();

const mockQuery = jest.fn();
const mockPool = {
    query: mockQuery,
} as unknown as jest.Mocked<Pool>;

let subscriptionRepository: ISubscriptionRepository;

describe('SubscriptionRepository', () => {
    beforeEach(() => {
        jest.resetAllMocks();
        subscriptionRepository = new SubscriptionRepository(mockPool);
    });

    describe('create', () => {
        it('returns null when subscription already exists (ON CONFLICT DO NOTHING)', async () => {
            mockQuery.mockResolvedValue({ rows: [] });
            const result = await subscriptionRepository.create({
                email: 'test@example.com',
                owner: 'owner',
                repo: 'repo',
                confirmToken: 'ct',
                unsubToken: 'ut',
            });
            expect(result).toBeNull();
        });

        it('calls appropriate repository method and returns correct value', async () => {
            const mockParams: {
                email: string;
                owner: string;
                repo: string;
                confirmToken: string;
                unsubToken: string;
            } = {
                email: 'test@example.com',
                owner: 'owner',
                repo: 'repo',
                confirmToken: 'confirm-token',
                unsubToken: 'unsub-token',
            };

            const mockResult: QueryResult<Subscription> = {
                rows: [validSubscription],
            } as unknown as QueryResult<Subscription>;

            mockQuery.mockResolvedValue(mockResult);

            const actualResult = await subscriptionRepository.create(mockParams);

            expect(actualResult).toEqual(validSubscription);
            expect(mockQuery).toHaveBeenCalledWith(expect.any(String), [
                mockParams.email,
                mockParams.owner,
                mockParams.repo,
                mockParams.confirmToken,
                mockParams.unsubToken,
            ]);
        });
    });

    describe('findByConfirmToken', () => {
        it('returns null when token not found', async () => {
            mockQuery.mockResolvedValue({ rows: [] });
            const result = await subscriptionRepository.findByConfirmToken('unknown');
            expect(result).toBeNull();
        });

        it('calls appropriate repository method and returns correct value', async () => {
            const mockConfirmToken = 'confirm-token';

            const mockResult: QueryResult<Subscription> = {
                rows: [validSubscription],
            } as unknown as QueryResult<Subscription>;

            mockQuery.mockResolvedValue(mockResult);

            const actualResult = await subscriptionRepository.findByConfirmToken(mockConfirmToken);

            expect(actualResult).toEqual(validSubscription);
            expect(mockQuery).toHaveBeenCalledWith(expect.any(String), [mockConfirmToken]);
        });
    });

    describe('findByUnsubToken', () => {
        it('returns null when token not found', async () => {
            mockQuery.mockResolvedValue({ rows: [] });
            const result = await subscriptionRepository.findByUnsubToken('unknown');
            expect(result).toBeNull();
        });

        it('calls appropriate repository method and returns correct value', async () => {
            const mockUnsubToken = 'unsub-token';

            const mockResult: QueryResult<Subscription> = {
                rows: [validSubscription],
            } as unknown as QueryResult<Subscription>;

            mockQuery.mockResolvedValue(mockResult);

            const actualResult = await subscriptionRepository.findByUnsubToken(mockUnsubToken);

            expect(actualResult).toEqual(validSubscription);
            expect(mockQuery).toHaveBeenCalledWith(expect.any(String), [mockUnsubToken]);
        });
    });

    describe('setConfirmed', () => {
        it('calls appropriate repository method and returns correct value', async () => {
            const mockConfirmToken = 'confirm-token';

            await subscriptionRepository.setConfirmed(mockConfirmToken);

            expect(mockQuery).toHaveBeenCalledWith(expect.any(String), [mockConfirmToken]);
        });
    });

    describe('deleteByUnsubToken', () => {
        it('returns 0 when rowCount is null', async () => {
            mockQuery.mockResolvedValue({ rows: [], rowCount: null });
            const result = await subscriptionRepository.deleteByUnsubToken('unknown');
            expect(result).toBe(0);
        });

        it('calls appropriate repository method and returns correct value', async () => {
            const mockUnsubToken = 'unsub-token';

            const mockResult: QueryResult<Subscription> = {
                rows: [validSubscription],
                rowCount: 1,
            } as unknown as QueryResult<Subscription>;

            mockQuery.mockResolvedValue(mockResult);

            const actualResult = await subscriptionRepository.deleteByUnsubToken(mockUnsubToken);

            expect(actualResult).toEqual(mockResult.rowCount);
            expect(mockQuery).toHaveBeenCalledWith(expect.any(String), [mockUnsubToken]);
        });
    });

    describe('findConfirmedByEmail', () => {
        it('calls appropriate repository method and returns correct value', async () => {
            const mockEmail = 'user@example.com';

            const mockResult: QueryResult<Subscription> = {
                rows: [validSubscription],
            } as unknown as QueryResult<Subscription>;

            mockQuery.mockResolvedValue(mockResult);

            const actualResult = await subscriptionRepository.findConfirmedByEmail(mockEmail);

            expect(actualResult).toEqual(mockResult.rows);
            expect(mockQuery).toHaveBeenCalledWith(expect.any(String), [mockEmail]);
        });
    });

    describe('findAllDistinctReposConfirmed', () => {
        it('calls appropriate repository method and returns correct value', async () => {
            const mockResult: QueryResult<Subscription> = {
                rows: [validSubscription],
            } as unknown as QueryResult<Subscription>;

            mockQuery.mockResolvedValue(mockResult);

            const actualResult = await subscriptionRepository.findAllDistinctReposConfirmed();

            expect(actualResult).toEqual(mockResult.rows);
            expect(mockQuery).toHaveBeenCalledWith(expect.any(String));
        });
    });

    describe('findConfirmedSubscribersByRepo', () => {
        it('calls appropriate repository method and returns correct value', async () => {
            const mockParams: {
                owner: string;
                repo: string;
            } = {
                owner: 'owner',
                repo: 'repo',
            };

            const mockResult: QueryResult<Subscription> = {
                rows: [validSubscription],
            } as unknown as QueryResult<Subscription>;

            mockQuery.mockResolvedValue(mockResult);

            const actualResult = await subscriptionRepository.findConfirmedSubscribersByRepo(mockParams);

            expect(actualResult).toEqual(mockResult.rows);
            expect(mockQuery).toHaveBeenCalledWith(expect.any(String), [mockParams.owner, mockParams.repo]);
        });
    });

    describe('updateLastSeenTag', () => {
        it('calls appropriate repository method and returns correct value', async () => {
            const mockParams: { owner: string; repo: string; tag: string } = {
                owner: 'owner',
                repo: 'repo',
                tag: 'tag',
            };

            await subscriptionRepository.updateLastSeenTag(mockParams);

            expect(mockQuery).toHaveBeenCalledWith(expect.any(String), [
                mockParams.owner,
                mockParams.repo,
                mockParams.tag,
            ]);
        });
    });

    describe('countConfirmed', () => {
        it('calls appropriate repository method and returns correct value', async () => {
            const mockResult = { rows: [{ count: '5' }] };

            mockQuery.mockResolvedValue(mockResult);

            const actualResult = await subscriptionRepository.countConfirmed();

            expect(actualResult).toEqual(parseInt(mockResult.rows[0].count));
            expect(mockQuery).toHaveBeenCalledWith(expect.any(String));
        });
    });
});
