import * as scanner from '../../src/services/scannerService';
import * as repository from '../../src/repositories/subscriptionRepository';
import * as github from '../../src/services/githubService';
import * as notifier from '../../src/services/notifierService';
import { RateLimitError } from '../../src/errors';

jest.mock('../../src/repositories/subscriptionRepository');
jest.mock('../../src/services/githubService');
jest.mock('../../src/services/notifierService');

const mockRepos = repository.findAllDistinctReposConfirmed as jest.MockedFunction<
    typeof repository.findAllDistinctReposConfirmed
>;
const mockSubscribers = repository.findConfirmedSubscribersByRepo as jest.MockedFunction<
    typeof repository.findConfirmedSubscribersByRepo
>;
const mockUpdateTag = repository.updateLastSeenTag as jest.MockedFunction<typeof repository.updateLastSeenTag>;
const mockGetRelease = github.getLatestRelease as jest.MockedFunction<typeof github.getLatestRelease>;
const mockSendRelease = notifier.sendReleaseEmail as jest.MockedFunction<typeof notifier.sendReleaseEmail>;

const release = { tag_name: 'v2.0', name: 'Release 2.0', html_url: 'http://github.com/r', published_at: '' };
const subscriber = { email: 'u@e.com', unsub_token: 'tok', last_seen_tag: 'v1.0' };

beforeEach(() => jest.clearAllMocks());

describe('scan', () => {
    it('sends email and updates tag when new release detected', async () => {
        mockRepos.mockResolvedValue([{ owner: 'a', repo: 'b' }]);
        mockGetRelease.mockResolvedValue(release);
        mockSubscribers.mockResolvedValue([subscriber]);
        mockUpdateTag.mockResolvedValue(undefined);
        mockSendRelease.mockResolvedValue(undefined);

        await scanner.scan();

        expect(mockSendRelease).toHaveBeenCalledTimes(1);
        expect(mockUpdateTag).toHaveBeenCalledWith({ owner: 'a', repo: 'b', tag: 'v2.0' });
    });

    it('does not send email when tag is unchanged', async () => {
        mockRepos.mockResolvedValue([{ owner: 'a', repo: 'b' }]);
        mockGetRelease.mockResolvedValue({ ...release, tag_name: 'v1.0' });
        mockSubscribers.mockResolvedValue([subscriber]); // last_seen_tag: 'v1.0'

        await scanner.scan();

        expect(mockSendRelease).not.toHaveBeenCalled();
        expect(mockUpdateTag).not.toHaveBeenCalled();
    });

    it('bootstraps last_seen_tag without sending email when null', async () => {
        mockRepos.mockResolvedValue([{ owner: 'a', repo: 'b' }]);
        mockGetRelease.mockResolvedValue(release);
        mockSubscribers.mockResolvedValue([{ ...subscriber, last_seen_tag: null }]);
        mockUpdateTag.mockResolvedValue(undefined);

        await scanner.scan();

        expect(mockSendRelease).not.toHaveBeenCalled();
        expect(mockUpdateTag).toHaveBeenCalledWith({ owner: 'a', repo: 'b', tag: 'v2.0' });
    });

    it('skips repo when no releases available', async () => {
        mockRepos.mockResolvedValue([{ owner: 'a', repo: 'b' }]);
        mockGetRelease.mockResolvedValue(null);

        await scanner.scan();

        expect(mockSubscribers).not.toHaveBeenCalled();
        expect(mockSendRelease).not.toHaveBeenCalled();
    });

    it('aborts remaining repos on RateLimitError', async () => {
        mockRepos.mockResolvedValue([
            { owner: 'a', repo: 'b' },
            { owner: 'c', repo: 'd' },
        ]);
        mockGetRelease
            .mockRejectedValueOnce(new RateLimitError('rate limit', 9999999999))
            .mockResolvedValueOnce(release);

        await scanner.scan();

        // Second repo should never be reached
        expect(mockGetRelease).toHaveBeenCalledTimes(1);
        expect(mockSendRelease).not.toHaveBeenCalled();
    });
});
