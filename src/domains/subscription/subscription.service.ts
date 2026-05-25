import { NotFoundException } from '@exceptions/not-found.exception';
import { ConflictException } from '@exceptions/conflict.exception';
import type { SubscriptionRow } from './dto/subscription-row.dto';
import type { ISubscriptionRepository } from './interface/subscription.repository.interface';
import type { IGithubService } from '@domains/github/interface/github.service.interface';
import type { INotifierService } from '@domains/notification/interface/notifier.service.interface';
import type { SubscribePayload } from './dto/subscribe-payload.dto';
import type { ITokenGenerator } from '@common/interface/token-generator.interface';
import type { ISubscriptionUrlBuilder } from './interface/subscription-url-builder.interface';
import type { ISubscriptionService } from './interface/subscription.service.interface';

export class SubscriptionService implements ISubscriptionService {
    constructor(
        private readonly subscriptionRepository: ISubscriptionRepository,
        private readonly githubService: IGithubService,
        private readonly notifierService: INotifierService,
        private readonly tokenGenerator: ITokenGenerator,
        private readonly urlBuilder: ISubscriptionUrlBuilder,
    ) {}

    async subscribe(params: SubscribePayload): Promise<void> {
        const { email, repo } = params;

        const [owner, repoName] = repo.split('/');

        const exists = await this.githubService.repoExists(owner, repoName);
        if (!exists) {
            throw new NotFoundException(`Repository ${repo} not found on GitHub`);
        }

        const confirmToken = this.tokenGenerator.generate();
        const unsubToken = this.tokenGenerator.generate();

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

        const confirmUrl = this.urlBuilder.confirmUrl(confirmToken);
        const unsubscribeUrl = this.urlBuilder.unsubscribeUrl(unsubToken);
        await this.notifierService.sendConfirmationEmail({
            to: email,
            owner,
            repo: repoName,
            confirmUrl,
            unsubscribeUrl,
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
        return this.subscriptionRepository.findConfirmedByEmail(email);
    }
}
