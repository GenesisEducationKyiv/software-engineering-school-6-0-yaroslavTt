import type { ServerUnaryCall, sendUnaryData } from '@grpc/grpc-js';
import { status } from '@grpc/grpc-js';
import { SubscriptionGrpcServer } from './subscription.grpc-server';
import { createMockSubscriptionRepository } from '@test/mock-utils';
import type {
    GetDistinctReposRequest,
    GetDistinctReposResponse,
    GetConfirmedSubscribersByRepoRequest,
    GetConfirmedSubscribersByRepoResponse,
    UpdateLastSeenTagRequest,
    UpdateLastSeenTagResponse,
    CountConfirmedSubscriptionsRequest,
    CountConfirmedSubscriptionsResponse,
} from '@proto/generated/subscription/v1/subscription';

const mockRepo = createMockSubscriptionRepository();
let server: SubscriptionGrpcServer;

function makeCall<T>(request: T): ServerUnaryCall<T, unknown> {
    return { request } as ServerUnaryCall<T, unknown>;
}

describe('SubscriptionGrpcServer', () => {
    beforeEach(() => {
        jest.resetAllMocks();
        server = new SubscriptionGrpcServer(mockRepo);
    });

    describe('getDistinctRepos', () => {
        it('returns repos on success', async () => {
            mockRepo.findAllDistinctReposConfirmed.mockResolvedValue([{ owner: 'a', repo: 'b' }]);
            const callback = jest.fn() as sendUnaryData<GetDistinctReposResponse>;

            await server.getDistinctRepos(makeCall<GetDistinctReposRequest>({}), callback);

            expect(callback).toHaveBeenCalledWith(null, { repos: [{ owner: 'a', repo: 'b' }] });
        });

        it('calls callback with INTERNAL status on error', async () => {
            mockRepo.findAllDistinctReposConfirmed.mockRejectedValue(new Error('db error'));
            const callback = jest.fn() as sendUnaryData<GetDistinctReposResponse>;

            await server.getDistinctRepos(makeCall<GetDistinctReposRequest>({}), callback);

            expect(callback).toHaveBeenCalledWith(expect.objectContaining({ code: status.INTERNAL }));
        });
    });

    describe('getConfirmedSubscribersByRepo', () => {
        it('returns mapped subscribers on success', async () => {
            mockRepo.findConfirmedSubscribersByRepo.mockResolvedValue([
                { email: 'u@e.com', unsub_token: 'tok', last_seen_tag: 'v1.0' },
            ]);
            const callback = jest.fn() as sendUnaryData<GetConfirmedSubscribersByRepoResponse>;

            await server.getConfirmedSubscribersByRepo(
                makeCall<GetConfirmedSubscribersByRepoRequest>({ owner: 'a', repo: 'b' }),
                callback,
            );

            expect(callback).toHaveBeenCalledWith(null, {
                confirmedSubscribers: [{ email: 'u@e.com', unsubToken: 'tok', lastSeenTag: 'v1.0' }],
            });
        });

        it('maps null last_seen_tag to undefined', async () => {
            mockRepo.findConfirmedSubscribersByRepo.mockResolvedValue([
                { email: 'u@e.com', unsub_token: 'tok', last_seen_tag: null },
            ]);
            const callback = jest.fn() as sendUnaryData<GetConfirmedSubscribersByRepoResponse>;

            await server.getConfirmedSubscribersByRepo(
                makeCall<GetConfirmedSubscribersByRepoRequest>({ owner: 'a', repo: 'b' }),
                callback,
            );

            expect(callback).toHaveBeenCalledWith(null, {
                confirmedSubscribers: [{ email: 'u@e.com', unsubToken: 'tok', lastSeenTag: undefined }],
            });
        });

        it('calls callback with INTERNAL status on error', async () => {
            mockRepo.findConfirmedSubscribersByRepo.mockRejectedValue(new Error('db error'));
            const callback = jest.fn() as sendUnaryData<GetConfirmedSubscribersByRepoResponse>;

            await server.getConfirmedSubscribersByRepo(
                makeCall<GetConfirmedSubscribersByRepoRequest>({ owner: 'a', repo: 'b' }),
                callback,
            );

            expect(callback).toHaveBeenCalledWith(expect.objectContaining({ code: status.INTERNAL }));
        });
    });

    describe('updateLastSeenTag', () => {
        it('calls repo and returns empty response on success', async () => {
            mockRepo.updateLastSeenTag.mockResolvedValue(undefined);
            const callback = jest.fn() as sendUnaryData<UpdateLastSeenTagResponse>;

            await server.updateLastSeenTag(
                makeCall<UpdateLastSeenTagRequest>({ owner: 'a', repo: 'b', tag: 'v2.0' }),
                callback,
            );

            expect(mockRepo.updateLastSeenTag).toHaveBeenCalledWith({ owner: 'a', repo: 'b', tag: 'v2.0' });
            expect(callback).toHaveBeenCalledWith(null, {});
        });

        it('calls callback with INTERNAL status on error', async () => {
            mockRepo.updateLastSeenTag.mockRejectedValue(new Error('db error'));
            const callback = jest.fn() as sendUnaryData<UpdateLastSeenTagResponse>;

            await server.updateLastSeenTag(
                makeCall<UpdateLastSeenTagRequest>({ owner: 'a', repo: 'b', tag: 'v2.0' }),
                callback,
            );

            expect(callback).toHaveBeenCalledWith(expect.objectContaining({ code: status.INTERNAL }));
        });
    });

    describe('countConfirmedSubscriptions', () => {
        it('returns count on success', async () => {
            mockRepo.countConfirmed.mockResolvedValue(42);
            const callback = jest.fn() as sendUnaryData<CountConfirmedSubscriptionsResponse>;

            await server.countConfirmedSubscriptions(makeCall<CountConfirmedSubscriptionsRequest>({}), callback);

            expect(callback).toHaveBeenCalledWith(null, { count: 42 });
        });

        it('calls callback with INTERNAL status on error', async () => {
            mockRepo.countConfirmed.mockRejectedValue(new Error('db error'));
            const callback = jest.fn() as sendUnaryData<CountConfirmedSubscriptionsResponse>;

            await server.countConfirmedSubscriptions(makeCall<CountConfirmedSubscriptionsRequest>({}), callback);

            expect(callback).toHaveBeenCalledWith(expect.objectContaining({ code: status.INTERNAL }));
        });
    });
});
