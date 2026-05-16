import { RateLimitException } from '@exceptions/rate-limit.exception';
import { createMockGithubService, createMockNotifierService, createMockSubscriptionRepository } from '@test/mock-utils';
import { ScannerService } from './scanner.service';

import { SubscriptionUrlBuilder } from '@domains/subscription/subscription-url-builder';

const mockSubscriptionRepository = createMockSubscriptionRepository();
const mockGithubService = createMockGithubService();
const mockNotifierService = createMockNotifierService();

const subscriptionUrlBuilder = new SubscriptionUrlBuilder();
let scannerService: ScannerService;

const release = { tag_name: 'v2.0', name: 'Release 2.0', html_url: 'http://github.com/r', published_at: '' };
const subscriber = { email: 'u@e.com', unsub_token: 'tok', last_seen_tag: 'v1.0' };
const repoConfirmed = { owner: 'a', repo: 'b' };

beforeEach(() => {
    jest.resetAllMocks();
    mockSubscriptionRepository.countConfirmed.mockResolvedValue(0);
    scannerService = new ScannerService(
        mockSubscriptionRepository,
        mockGithubService,
        mockNotifierService,
        subscriptionUrlBuilder,
    );
});

describe('scan', () => {
    it('sends email and updates tag when new release detected', async () => {
        mockSubscriptionRepository.findAllDistinctReposConfirmed.mockResolvedValue([repoConfirmed]);
        mockGithubService.getLatestRelease.mockResolvedValue(release);
        mockSubscriptionRepository.findConfirmedSubscribersByRepo.mockResolvedValue([subscriber]);
        mockSubscriptionRepository.updateLastSeenTag.mockResolvedValue(undefined);

        await scannerService.scan();

        expect(mockNotifierService.sendReleaseEmail).toHaveBeenCalledTimes(1);
        expect(mockSubscriptionRepository.updateLastSeenTag).toHaveBeenCalledWith({
            owner: repoConfirmed.owner,
            repo: repoConfirmed.repo,
            tag: release.tag_name,
        });
    });

    it('does not send email when tag is unchanged', async () => {
        mockSubscriptionRepository.findAllDistinctReposConfirmed.mockResolvedValue([repoConfirmed]);
        mockGithubService.getLatestRelease.mockResolvedValue({ ...release, tag_name: 'v1.0' });
        mockSubscriptionRepository.findConfirmedSubscribersByRepo.mockResolvedValue([subscriber]); // last_seen_tag: 'v1.0'

        await scannerService.scan();

        expect(mockNotifierService.sendReleaseEmail).not.toHaveBeenCalled();
        expect(mockSubscriptionRepository.updateLastSeenTag).not.toHaveBeenCalled();
    });

    it('bootstraps last_seen_tag without sending email when null', async () => {
        mockSubscriptionRepository.findAllDistinctReposConfirmed.mockResolvedValue([repoConfirmed]);
        mockGithubService.getLatestRelease.mockResolvedValue(release);
        mockSubscriptionRepository.findConfirmedSubscribersByRepo.mockResolvedValue([
            { ...subscriber, last_seen_tag: null },
        ]);
        mockSubscriptionRepository.updateLastSeenTag.mockResolvedValue(undefined);

        await scannerService.scan();

        expect(mockNotifierService.sendReleaseEmail).not.toHaveBeenCalled();
        expect(mockSubscriptionRepository.updateLastSeenTag).toHaveBeenCalledWith({
            owner: repoConfirmed.owner,
            repo: repoConfirmed.repo,
            tag: release.tag_name,
        });
    });

    it('skips repo when no releases available', async () => {
        mockSubscriptionRepository.findAllDistinctReposConfirmed.mockResolvedValue([repoConfirmed]);
        mockGithubService.getLatestRelease.mockResolvedValue(null);

        await scannerService.scan();

        expect(mockSubscriptionRepository.findConfirmedSubscribersByRepo).not.toHaveBeenCalled();
        expect(mockNotifierService.sendReleaseEmail).not.toHaveBeenCalled();
    });

    it('aborts remaining repos on RateLimitError', async () => {
        mockSubscriptionRepository.findAllDistinctReposConfirmed.mockResolvedValue([
            repoConfirmed,
            { owner: 'c', repo: 'd' },
        ]);
        mockGithubService.getLatestRelease
            .mockRejectedValueOnce(new RateLimitException('rate limit', 9999999999))
            .mockResolvedValueOnce(release);

        await scannerService.scan();

        // Second repo should never be reached
        expect(mockGithubService.getLatestRelease).toHaveBeenCalledTimes(1);
        expect(mockNotifierService.sendReleaseEmail).not.toHaveBeenCalled();
    });

    it('logs error and continues to next repo on non-RateLimit error', async () => {
        mockSubscriptionRepository.findAllDistinctReposConfirmed.mockResolvedValue([
            repoConfirmed,
            { owner: 'c', repo: 'd' },
        ]);
        mockGithubService.getLatestRelease
            .mockRejectedValueOnce(new Error('Network failure'))
            .mockResolvedValueOnce(release);
        mockSubscriptionRepository.findConfirmedSubscribersByRepo.mockResolvedValue([subscriber]);
        mockSubscriptionRepository.updateLastSeenTag.mockResolvedValue(undefined);

        await scannerService.scan();

        expect(mockGithubService.getLatestRelease).toHaveBeenCalledTimes(2);
        expect(mockNotifierService.sendReleaseEmail).toHaveBeenCalledTimes(1);
    });

    it('skips repo when no confirmed subscribers found after release check', async () => {
        mockSubscriptionRepository.findAllDistinctReposConfirmed.mockResolvedValue([repoConfirmed]);
        mockGithubService.getLatestRelease.mockResolvedValue(release);
        mockSubscriptionRepository.findConfirmedSubscribersByRepo.mockResolvedValue([]);

        await scannerService.scan();

        expect(mockNotifierService.sendReleaseEmail).not.toHaveBeenCalled();
        expect(mockSubscriptionRepository.updateLastSeenTag).not.toHaveBeenCalled();
    });

    it('aborts scan when rate limited with null retryAfter', async () => {
        mockSubscriptionRepository.findAllDistinctReposConfirmed.mockResolvedValue([repoConfirmed]);
        mockGithubService.getLatestRelease.mockRejectedValueOnce(new RateLimitException('rate limit', null));

        await scannerService.scan();

        expect(mockNotifierService.sendReleaseEmail).not.toHaveBeenCalled();
    });
});
