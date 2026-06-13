import type { IGithubService } from '@domains/github';
import type { ICacheService } from '@common/interface/cache.service.interface';
import type { ITokenGenerator } from '@common/interface/token-generator.interface';
import type { INotifierService, IEmailTemplateBuilder } from '@domains/notification';
import type { ISubscriptionRepository, ISubscriptionService, Subscription } from '@domains/subscription';

export function createValidSubscription(overrides: Partial<Subscription> = {}): Subscription {
    return {
        id: 'uuid',
        email: 'u@e.com',
        owner: 'a',
        repo: 'b',
        confirmed: false,
        confirm_token: 'ct',
        unsub_token: 'ut',
        last_seen_tag: null,
        created_at: new Date(),
        ...overrides,
    };
}

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

export function createMockEmailTemplateBuilder(): jest.Mocked<IEmailTemplateBuilder> {
    return {
        confirmationEmail: jest.fn().mockReturnValue({ subject: 'confirmation subject', html: '<p>confirmation</p>' }),
        releaseEmail: jest.fn().mockReturnValue({ subject: 'release subject', html: '<p>release</p>' }),
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
        countConfirmed: jest.fn().mockResolvedValue(0),
    };
}

export function createMockSubscriptionService(): jest.Mocked<ISubscriptionService> {
    return {
        subscribe: jest.fn(),
        confirmSubscription: jest.fn(),
        unsubscribe: jest.fn(),
        getSubscriptions: jest.fn(),
    };
}
