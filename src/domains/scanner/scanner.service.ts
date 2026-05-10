import { RateLimitException } from '@exceptions/rate-limit.exception';
import type { ISubscriptionRepository } from '@domains/subscription/interface/subscription.repository.interface';
import type { IGithubService } from '@domains/github/interface/github.service.interface';
import type { INotifierService } from '@domains/notification/interface/notifier.service.interface';
import type { ISubscriptionUrlBuilder } from '@domains/subscription/interface/subscription-url-builder.interface';
import type { IScannerService } from './interface/scanner.service.interface';

export class ScannerService implements IScannerService {
    constructor(
        private readonly subscriptionRepository: ISubscriptionRepository,
        private readonly githubService: IGithubService,
        private readonly notifierService: INotifierService,
        private readonly urlBuilder: ISubscriptionUrlBuilder,
    ) {}

    async scan(): Promise<void> {
        const repos = await this.subscriptionRepository.findAllDistinctReposConfirmed();

        for (const { owner, repo } of repos) {
            try {
                const release = await this.githubService.getLatestRelease(owner, repo);
                if (!release) continue;

                const subscribers = await this.subscriptionRepository.findConfirmedSubscribersByRepo({
                    owner,
                    repo,
                });

                // All subscribers for a repo share the same last_seen_tag (updated atomically).
                // We read it from the first row; if no subscribers, skip.
                if (subscribers.length === 0) continue;

                const lastSeenTag = subscribers[0].last_seen_tag;

                if (lastSeenTag === null) {
                    // Bootstrap: record current tag without notifying
                    await this.subscriptionRepository.updateLastSeenTag({
                        owner,
                        repo,
                        tag: release.tag_name,
                    });
                    continue;
                }

                if (release.tag_name === lastSeenTag) continue;

                // New release detected — notify all subscribers
                for (const subscriber of subscribers) {
                    const unsubscribeUrl = this.urlBuilder.unsubscribeUrl(subscriber.unsub_token);
                    await this.notifierService.sendReleaseEmail({
                        to: subscriber.email,
                        owner,
                        repo,
                        tagName: release.tag_name,
                        releaseName: release.name,
                        releaseUrl: release.html_url,
                        unsubscribeUrl,
                    });
                }

                await this.subscriptionRepository.updateLastSeenTag({
                    owner,
                    repo,
                    tag: release.tag_name,
                });
            } catch (err) {
                if (err instanceof RateLimitException) {
                    const retryTime = err.retryAfter ? new Date(err.retryAfter * 1000).toISOString() : 'unknown';
                    console.warn(`[scanner] GitHub rate limit hit. Retry after: ${retryTime}. Aborting scan.`);
                    return;
                }
                console.error(`[scanner] Error processing ${owner}/${repo}:`, err);
            }
        }
    }
}
