import { NotFoundException } from '@exceptions/not-found.exception';
import { ConflictException } from '@exceptions/conflict.exception';
import { RateLimitException } from '@exceptions/rate-limit.exception';
import { SubscriptionService } from './subscription.service';
import {
    createMockGithubService,
    createMockNotifierService,
    createMockSubscriptionRepository,
    createMockTokenGenerator,
    createValidSubscription,
} from '@test/mock-utils';
import { SubscriptionUrlBuilder } from './subscription-url-builder';

const mockSubscriptionRepository = createMockSubscriptionRepository();
const mockGithubService = createMockGithubService();
const mockNotifierService = createMockNotifierService();
const mockTokenGenerator = createMockTokenGenerator();

const subscriptionUrlBuilder = new SubscriptionUrlBuilder();
let subscriptionService: SubscriptionService;

const validSubscription = createValidSubscription();

describe('SubscriptionService', () => {
    beforeEach(() => {
        jest.resetAllMocks();
        subscriptionService = new SubscriptionService(
            mockSubscriptionRepository,
            mockGithubService,
            mockNotifierService,
            mockTokenGenerator,
            subscriptionUrlBuilder,
        );
    });

    describe('subscribe', () => {
        const validSubscriptionParams = { email: 'u@e.com', repo: 'golang/go' };

        it('creates a subscription and sends confirmation email', async () => {
            mockGithubService.repoExists.mockResolvedValue(true);
            mockSubscriptionRepository.create.mockResolvedValue(validSubscription);
            mockTokenGenerator.generate.mockReturnValueOnce('confirm-token').mockReturnValueOnce('unsub-token');

            await subscriptionService.subscribe(validSubscriptionParams);

            expect(mockSubscriptionRepository.create).toHaveBeenCalledWith({
                email: validSubscriptionParams.email,
                owner: 'golang',
                repo: 'go',
                confirmToken: 'confirm-token',
                unsubToken: 'unsub-token',
            });
            expect(mockNotifierService.sendConfirmationEmail).toHaveBeenCalledWith({
                to: validSubscriptionParams.email,
                owner: 'golang',
                repo: 'go',
                confirmUrl: expect.stringContaining('confirm-token'),
                unsubscribeUrl: expect.stringContaining('unsub-token'),
            });
        });

        it('throws NotFoundException when repo does not exist on GitHub', async () => {
            mockGithubService.repoExists.mockResolvedValue(false);
            await expect(subscriptionService.subscribe(validSubscriptionParams)).rejects.toBeInstanceOf(
                NotFoundException,
            );
        });

        it('throws ConflictException when subscription already exists', async () => {
            mockGithubService.repoExists.mockResolvedValue(true);
            mockSubscriptionRepository.create.mockResolvedValue(null);
            await expect(subscriptionService.subscribe(validSubscriptionParams)).rejects.toBeInstanceOf(
                ConflictException,
            );
        });

        it('re-throws RateLimitException from GitHub', async () => {
            mockGithubService.repoExists.mockRejectedValue(new RateLimitException('rate limit'));
            await expect(subscriptionService.subscribe(validSubscriptionParams)).rejects.toBeInstanceOf(
                RateLimitException,
            );
        });
    });

    describe('confirmSubscription', () => {
        it('confirms subscription for valid token', async () => {
            mockSubscriptionRepository.findByConfirmToken.mockResolvedValue(validSubscription);

            const actualResult = await subscriptionService.confirmSubscription('ct');

            expect(actualResult).toBeUndefined();
        });

        it('throws NotFoundException for unknown token', async () => {
            mockSubscriptionRepository.findByConfirmToken.mockResolvedValue(null);
            await expect(subscriptionService.confirmSubscription('bad')).rejects.toBeInstanceOf(NotFoundException);
        });
    });

    describe('unsubscribe', () => {
        it('deletes subscription for valid token', async () => {
            mockSubscriptionRepository.findByUnsubToken.mockResolvedValue(validSubscription);
            mockSubscriptionRepository.deleteByUnsubToken.mockResolvedValue(1);

            const actualResult = await subscriptionService.unsubscribe('ut');

            expect(actualResult).toBeUndefined();
        });

        it('throws NotFoundException for unknown token', async () => {
            mockSubscriptionRepository.findByUnsubToken.mockResolvedValue(null);
            await expect(subscriptionService.unsubscribe('bad')).rejects.toBeInstanceOf(NotFoundException);
        });
    });

    describe('getSubscriptions', () => {
        it('returns subscriptions for valid email', async () => {
            const rows = [{ email: 'u@e.com', repo: 'golang/go', confirmed: true, last_seen_tag: 'v1.0' }];
            mockSubscriptionRepository.findConfirmedByEmail.mockResolvedValue(rows);
            const result = await subscriptionService.getSubscriptions('u@e.com');
            expect(result).toEqual(rows);
        });
    });
});
