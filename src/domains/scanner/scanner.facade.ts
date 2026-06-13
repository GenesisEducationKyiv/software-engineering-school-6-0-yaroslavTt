import type { IGithubReleaseService } from '@domains/github';
import type { INotifierService } from '@domains/notification';
import type { ISubscriptionRepository, ISubscriptionUrlBuilder } from '@domains/subscription';
import { ScannerService } from './scanner.service';
import { ScannerScheduler } from './scanner.scheduler';

export class Scanner {
    private readonly scheduler: ScannerScheduler;

    constructor(
        subscriptionRepository: ISubscriptionRepository,
        githubService: IGithubReleaseService,
        notifierService: INotifierService,
        urlBuilder: ISubscriptionUrlBuilder,
    ) {
        const service = new ScannerService(subscriptionRepository, githubService, notifierService, urlBuilder);
        this.scheduler = new ScannerScheduler(service);
    }

    start(): void {
        this.scheduler.start();
    }
}
