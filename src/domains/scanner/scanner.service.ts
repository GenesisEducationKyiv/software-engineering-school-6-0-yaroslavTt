import cron from 'node-cron';
import * as subscriptionRepository from '@domains/subscription/subscription.repository.js';
import * as githubService from '@domains/github/github.service.js';
import * as notifierService from '@domains/notification/notifier.service.js';
import { environmentConfig } from '@config/environment.js';
import { RateLimitException } from '@exceptions/rate-limit.exception';

export async function scan(): Promise<void> {
    const repos = await subscriptionRepository.findAllDistinctReposConfirmed();

    for (const { owner, repo } of repos) {
        try {
            const release = await githubService.getLatestRelease(owner, repo);
            if (!release) continue;

            const subscribers = await subscriptionRepository.findConfirmedSubscribersByRepo({
                owner,
                repo,
            });

            // All subscribers for a repo share the same last_seen_tag (updated atomically).
            // We read it from the first row; if no subscribers, skip.
            if (subscribers.length === 0) continue;

            const lastSeenTag = subscribers[0].last_seen_tag;

            if (lastSeenTag === null) {
                // Bootstrap: record current tag without notifying
                await subscriptionRepository.updateLastSeenTag({
                    owner,
                    repo,
                    tag: release.tag_name,
                });
                continue;
            }

            if (release.tag_name === lastSeenTag) continue;

            // New release detected — notify all subscribers
            for (const subscriber of subscribers) {
                const unsubscribeUrl = `${environmentConfig.appBaseUrl}/api/unsubscribe/${subscriber.unsub_token}`;
                await notifierService.sendReleaseEmail({
                    to: subscriber.email,
                    owner,
                    repo,
                    tagName: release.tag_name,
                    releaseName: release.name,
                    releaseUrl: release.html_url,
                    unsubscribeUrl,
                });
            }

            await subscriptionRepository.updateLastSeenTag({
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

export function start(): void {
    console.log(`[scanner] Starting cron: ${environmentConfig.cronSchedule}`);
    cron.schedule(environmentConfig.cronSchedule, async () => {
        console.log('[scanner] Scan started');
        try {
            await scan();
            console.log('[scanner] Scan complete');
        } catch (err) {
            console.error('[scanner] Unexpected error during scan:', err);
        }
    });
}
