import crypto from 'crypto';
import { environmentConfig } from '@config/environment';
import { SubscriptionRow } from './dto/subscription-row.dto';
import { ValidationException } from '@exceptions/validation.exception';
import { NotFoundException } from '@exceptions/not-found.exception';
import { ConflictException } from '@exceptions/conflict.exception';
import type { ISubscriptionRepository } from './interface/subscription.repository.interface';
import type { IGithubService } from '@domains/github/interface/github.service.interface';
import type { INotifierService } from '@domains/notification/interface/notifier.service.interface';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const REPO_RE = /^[a-zA-Z0-9._-]+\/[a-zA-Z0-9._-]+$/;

export class SubscriptionService {
    constructor(
        private readonly subscriptionRepository: ISubscriptionRepository,
        private readonly githubService: IGithubService,
        private readonly notifierService: INotifierService,
    ) {}

    async subscribe(params: { email: string; repo: string }): Promise<void> {
        const { email, repo } = params;

        if (!EMAIL_RE.test(email)) {
            throw new ValidationException('Invalid email address');
        }
        if (!REPO_RE.test(repo)) {
            throw new ValidationException('Invalid repo format — expected owner/repo');
        }

        const [owner, repoName] = repo.split('/');

        const exists = await this.githubService.repoExists(owner, repoName);
        if (!exists) {
            throw new NotFoundException(`Repository ${repo} not found on GitHub`);
        }

        const confirmToken = crypto.randomBytes(32).toString('hex');
        const unsubToken = crypto.randomBytes(32).toString('hex');

        const created = await this.subscriptionRepository.create({
            email,
            owner,
            repo: repoName,
            confirmToken,
            unsubToken,
        });

        if (!created) {
            throw new ConflictException('This email is already subscribed to that repository');
        }

        const confirmUrl = `${environmentConfig.appBaseUrl}/api/confirm/${confirmToken}`;
        await this.notifierService.sendConfirmationEmail({
            to: email,
            owner,
            repo: repoName,
            confirmUrl,
        });
    }

    async confirmSubscription(token: string): Promise<void> {
        const sub = await this.subscriptionRepository.findByConfirmToken(token);
        if (!sub) {
            throw new NotFoundException('Confirmation token not found');
        }
        await this.subscriptionRepository.setConfirmed(token);
    }

    async unsubscribe(token: string): Promise<void> {
        const sub = await this.subscriptionRepository.findByUnsubToken(token);
        if (!sub) {
            throw new NotFoundException('Unsubscribe token not found');
        }
        await this.subscriptionRepository.deleteByUnsubToken(token);
    }

    async getSubscriptions(email: string): Promise<SubscriptionRow[]> {
        if (!EMAIL_RE.test(email)) {
            throw new ValidationException('Invalid email address');
        }
        return this.subscriptionRepository.findConfirmedByEmail(email);
    }
}
