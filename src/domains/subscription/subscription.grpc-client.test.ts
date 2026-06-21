import { SubscriptionGrpcClient } from './subscription.grpc-client';

jest.mock('@proto/generated/subscription/v1/subscription', () => ({
    SubscriptionServiceClient: jest.fn().mockImplementation(() => mockGrpcClient),
}));

jest.mock('@grpc/grpc-js', () => ({
    credentials: { createInsecure: jest.fn().mockReturnValue({}) },
}));

const mockGrpcClient = {
    getDistinctRepos: jest.fn(),
    getConfirmedSubscribersByRepo: jest.fn(),
    updateLastSeenTag: jest.fn(),
    countConfirmedSubscriptions: jest.fn(),
};

let client: SubscriptionGrpcClient;

describe('SubscriptionGrpcClient', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        client = new SubscriptionGrpcClient('localhost:50051');
    });

    describe('findAllDistinctReposConfirmed', () => {
        it('resolves with repos on success', async () => {
            mockGrpcClient.getDistinctRepos.mockImplementation((_req: unknown, cb: (...args: unknown[]) => void) =>
                cb(null, { repos: [{ owner: 'a', repo: 'b' }] }),
            );

            const result = await client.findAllDistinctReposConfirmed();

            expect(result).toEqual([{ owner: 'a', repo: 'b' }]);
        });

        it('rejects on gRPC error', async () => {
            mockGrpcClient.getDistinctRepos.mockImplementation((_req: unknown, cb: (...args: unknown[]) => void) =>
                cb(new Error('grpc error')),
            );

            await expect(client.findAllDistinctReposConfirmed()).rejects.toThrow('grpc error');
        });
    });

    describe('findConfirmedSubscribersByRepo', () => {
        it('resolves with mapped subscribers', async () => {
            mockGrpcClient.getConfirmedSubscribersByRepo.mockImplementation(
                (_req: unknown, cb: (...args: unknown[]) => void) =>
                    cb(null, {
                        confirmedSubscribers: [{ email: 'u@e.com', unsubToken: 'tok', lastSeenTag: 'v1.0' }],
                    }),
            );

            const result = await client.findConfirmedSubscribersByRepo({ owner: 'a', repo: 'b' });

            expect(result).toEqual([{ email: 'u@e.com', unsub_token: 'tok', last_seen_tag: 'v1.0' }]);
        });

        it('maps undefined lastSeenTag to null', async () => {
            mockGrpcClient.getConfirmedSubscribersByRepo.mockImplementation(
                (_req: unknown, cb: (...args: unknown[]) => void) =>
                    cb(null, {
                        confirmedSubscribers: [{ email: 'u@e.com', unsubToken: 'tok', lastSeenTag: undefined }],
                    }),
            );

            const result = await client.findConfirmedSubscribersByRepo({ owner: 'a', repo: 'b' });

            expect(result[0].last_seen_tag).toBeNull();
        });

        it('rejects on gRPC error', async () => {
            mockGrpcClient.getConfirmedSubscribersByRepo.mockImplementation(
                (_req: unknown, cb: (...args: unknown[]) => void) => cb(new Error('grpc error')),
            );

            await expect(client.findConfirmedSubscribersByRepo({ owner: 'a', repo: 'b' })).rejects.toThrow(
                'grpc error',
            );
        });
    });

    describe('updateLastSeenTag', () => {
        it('resolves on success', async () => {
            mockGrpcClient.updateLastSeenTag.mockImplementation((_req: unknown, cb: (...args: unknown[]) => void) =>
                cb(null),
            );

            await expect(client.updateLastSeenTag({ owner: 'a', repo: 'b', tag: 'v2.0' })).resolves.toBeUndefined();
        });

        it('rejects on gRPC error', async () => {
            mockGrpcClient.updateLastSeenTag.mockImplementation((_req: unknown, cb: (...args: unknown[]) => void) =>
                cb(new Error('grpc error')),
            );

            await expect(client.updateLastSeenTag({ owner: 'a', repo: 'b', tag: 'v2.0' })).rejects.toThrow(
                'grpc error',
            );
        });
    });

    describe('countConfirmed', () => {
        it('resolves with count', async () => {
            mockGrpcClient.countConfirmedSubscriptions.mockImplementation(
                (_req: unknown, cb: (...args: unknown[]) => void) => cb(null, { count: 7 }),
            );

            const result = await client.countConfirmed();

            expect(result).toBe(7);
        });

        it('rejects on gRPC error', async () => {
            mockGrpcClient.countConfirmedSubscriptions.mockImplementation(
                (_req: unknown, cb: (...args: unknown[]) => void) => cb(new Error('grpc error')),
            );

            await expect(client.countConfirmed()).rejects.toThrow('grpc error');
        });
    });
});
