import type { handleUnaryCall, ServiceError } from '@grpc/grpc-js';
import type {
    CountConfirmedSubscriptionsRequest,
    CountConfirmedSubscriptionsResponse,
    GetConfirmedSubscribersByRepoRequest,
    GetConfirmedSubscribersByRepoResponse,
    GetDistinctReposRequest,
    GetDistinctReposResponse,
    SubscriptionServiceServer,
    UpdateLastSeenTagRequest,
    UpdateLastSeenTagResponse,
} from '@proto/generated/subscription/v1/subscription';
import type { ISubscriptionRepository } from './interface/subscription.repository.interface';
import { status } from '@grpc/grpc-js';
import { logger } from '@config/logger';

export class SubscriptionGrpcServer implements SubscriptionServiceServer {
    // Required by UntypedServiceImplementation
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    [name: string]: any;

    constructor(private readonly subscriptionRepository: ISubscriptionRepository) {}

    getDistinctRepos: handleUnaryCall<GetDistinctReposRequest, GetDistinctReposResponse> = async (_call, callback) => {
        try {
            const repos = await this.subscriptionRepository.findAllDistinctReposConfirmed();
            callback(null, { repos });
        } catch (err) {
            logger.error({ err }, 'gRPC handler failed');
            callback({ code: status.INTERNAL, message: 'failed' } as ServiceError);
        }
    };
    getConfirmedSubscribersByRepo: handleUnaryCall<
        GetConfirmedSubscribersByRepoRequest,
        GetConfirmedSubscribersByRepoResponse
    > = async (call, callback) => {
        try {
            const { owner, repo } = call.request;
            const rows = await this.subscriptionRepository.findConfirmedSubscribersByRepo({ owner, repo });
            callback(null, {
                confirmedSubscribers: rows.map((r) => ({
                    email: r.email,
                    unsubToken: r.unsub_token,
                    lastSeenTag: r.last_seen_tag ?? undefined,
                })),
            });
        } catch (err) {
            logger.error({ err }, 'gRPC handler failed');
            callback({ code: status.INTERNAL, message: 'failed' } as ServiceError);
        }
    };

    updateLastSeenTag: handleUnaryCall<UpdateLastSeenTagRequest, UpdateLastSeenTagResponse> = async (
        call,
        callback,
    ) => {
        try {
            const { owner, repo, tag } = call.request;
            await this.subscriptionRepository.updateLastSeenTag({ owner, repo, tag });
            callback(null, {});
        } catch (err) {
            logger.error({ err }, 'gRPC handler failed');
            callback({ code: status.INTERNAL, message: 'failed' } as ServiceError);
        }
    };

    countConfirmedSubscriptions: handleUnaryCall<
        CountConfirmedSubscriptionsRequest,
        CountConfirmedSubscriptionsResponse
    > = async (_call, callback) => {
        try {
            const count = await this.subscriptionRepository.countConfirmed();
            callback(null, { count });
        } catch (err) {
            logger.error({ err }, 'gRPC handler failed');
            callback({ code: status.INTERNAL, message: 'failed' } as ServiceError);
        }
    };
}
