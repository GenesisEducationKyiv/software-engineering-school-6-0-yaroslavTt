import type { IGithubService } from '@domains/github/interface/github.service.interface';
import type { INotifierService } from '@domains/notification/interface/notifier.service.interface';
import type { ISubscriptionRepository } from '@domains/subscription/interface/subscription.repository.interface';
import type { ICacheService } from '@utilities/redis/interface/cache.service.interface';
import type { ITokenGenerator } from '@utilities/token/interface/token-generator.interface';

export function createMockCacheService(): jest.Mocked<ICacheService> {
    return {
        cacheGet: jest.fn().mockResolvedValue(null),
        cacheSet: jest.fn().mockResolvedValue(undefined),
    };
}

export function createMockGithubService(): jest.Mocked<IGithubService> {
    return {
        repoExists: jest.fn(),
        getLatestRelease: jest.fn(),
    };
}

export function createMockNotifierService(): jest.Mocked<INotifierService> {
    return {
        sendConfirmationEmail: jest.fn(),
        sendReleaseEmail: jest.fn(),
    };
}

export function createMockTokenGenerator(): jest.Mocked<ITokenGenerator> {
    return { generate: jest.fn().mockReturnValue('test-token') };
}

export function createMockSubscriptionRepository(): jest.Mocked<ISubscriptionRepository> {
    return {
        create: jest.fn(),
        findByConfirmToken: jest.fn(),
        findByUnsubToken: jest.fn(),
        setConfirmed: jest.fn(),
        deleteByUnsubToken: jest.fn(),
        findConfirmedByEmail: jest.fn(),
        findAllDistinctReposConfirmed: jest.fn(),
        findConfirmedSubscribersByRepo: jest.fn(),
        updateLastSeenTag: jest.fn(),
    };
}
