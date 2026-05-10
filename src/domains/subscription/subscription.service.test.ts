import { ValidationException } from '@exceptions/validation.exception';
import { NotFoundException } from '@exceptions/not-found.exception';
import { ConflictException } from '@exceptions/conflict.exception';
import { RateLimitException } from '@exceptions/rate-limit.exception';
import { SubscriptionService } from './subscription.service';
import { createMockGithubService, createMockNotifierService, createMockSubscriptionRepository } from '@test/mock-utils';
import { SubscriptionValidator } from './validators/subscription.validator';
import { EmailValidator } from './validators/email.validator';

const mockSubscriptionRepository = createMockSubscriptionRepository();
const mockGithubService = createMockGithubService();
const mockNotifierService = createMockNotifierService();

const subscriptionValidator = new SubscriptionValidator();
const emailValidator = new EmailValidator();
let subscriptionService: SubscriptionService;

const validSubscription = {
    id: 'uuid',
    email: 'u@e.com',
    owner: 'a',
    repo: 'b',
    confirmed: false,
    confirm_token: 'ct',
    unsub_token: 'ut',
    last_seen_tag: null,
    created_at: new Date(),
};

beforeEach(() => {
    jest.resetAllMocks();
    subscriptionService = new SubscriptionService(
        mockSubscriptionRepository,
        mockGithubService,
        mockNotifierService,
        subscriptionValidator,
        emailValidator,
    );
});

describe('subscribe', () => {
    const validSubscriptionParams = { email: 'u@e.com', repo: 'golang/go' };

    it('creates a subscription and sends confirmation email', async () => {
        mockGithubService.repoExists.mockResolvedValue(true);
        mockSubscriptionRepository.create.mockResolvedValue(validSubscription);

        const actualResult = await subscriptionService.subscribe(validSubscriptionParams);

        expect(actualResult).toBeUndefined();
        expect(mockNotifierService.sendConfirmationEmail).toHaveBeenCalledTimes(1);
    });

    it('throws ValidationException for invalid email', async () => {
        await expect(subscriptionService.subscribe({ email: 'bad', repo: 'golang/go' })).rejects.toBeInstanceOf(
            ValidationException,
        );
    });

    it('throws ValidationException for invalid repo format', async () => {
        await expect(subscriptionService.subscribe({ email: 'u@e.com', repo: 'golang' })).rejects.toBeInstanceOf(
            ValidationException,
        );
    });

    it('throws NotFoundException when repo does not exist on GitHub', async () => {
        mockGithubService.repoExists.mockResolvedValue(false);
        await expect(subscriptionService.subscribe(validSubscriptionParams)).rejects.toBeInstanceOf(NotFoundException);
    });

    it('throws ConflictException when subscription already exists', async () => {
        mockGithubService.repoExists.mockResolvedValue(true);
        mockSubscriptionRepository.create.mockResolvedValue(null);
        await expect(subscriptionService.subscribe(validSubscriptionParams)).rejects.toBeInstanceOf(ConflictException);
    });

    it('re-throws RateLimitException from GitHub', async () => {
        mockGithubService.repoExists.mockRejectedValue(new RateLimitException('rate limit'));
        await expect(subscriptionService.subscribe(validSubscriptionParams)).rejects.toBeInstanceOf(RateLimitException);
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

    it('throws ValidationException for invalid email', async () => {
        await expect(subscriptionService.getSubscriptions('bad')).rejects.toBeInstanceOf(ValidationException);
    });
});
