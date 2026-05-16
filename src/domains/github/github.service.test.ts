import type { AxiosInstance } from 'axios';
import axios from 'axios';
import { RateLimitException } from '@exceptions/rate-limit.exception';
import { GithubService } from './github.service';
import { createMockCacheService } from '@test/mock-utils';

const mockCacheService = createMockCacheService();
let mockGet: jest.Mock;
let githubService: GithubService;

describe('GithubService', () => {
    beforeEach(() => {
        jest.resetAllMocks();
        mockCacheService.cacheGet.mockResolvedValue(null);
        mockGet = jest.fn();
        githubService = new GithubService({ get: mockGet } as unknown as AxiosInstance, mockCacheService);
    });

    describe('repoExists', () => {
        it('returns true when GitHub responds 200', async () => {
            mockGet.mockResolvedValueOnce({ status: 200, data: {} });
            const result = await githubService.repoExists('golang', 'go');
            expect(result).toBe(true);
        });

        it('returns false when GitHub responds 404', async () => {
            const mockAxiosError = { isAxiosError: true, response: { status: 404 } };
            jest.spyOn(axios, 'isAxiosError').mockReturnValue(true);
            mockGet.mockRejectedValueOnce(mockAxiosError);
            const result = await githubService.repoExists('no', 'repo');
            expect(result).toBe(false);
        });

        it('throws RateLimitException on GitHub 429', async () => {
            const mockAxiosError = {
                isAxiosError: true,
                response: { status: 429, headers: { 'x-ratelimit-reset': '9999999999' } },
            };
            jest.spyOn(axios, 'isAxiosError').mockReturnValue(true);
            mockGet.mockRejectedValueOnce(mockAxiosError);
            await expect(githubService.repoExists('a', 'b')).rejects.toBeInstanceOf(RateLimitException);
        });

        it('uses Redis cache on cache hit and skips HTTP call', async () => {
            mockCacheService.cacheGet.mockResolvedValueOnce(true);
            const result = await githubService.repoExists('golang', 'go');
            expect(result).toBe(true);
            expect(mockGet).not.toHaveBeenCalled();
        });

        it('re-throws unexpected errors from repoExists', async () => {
            const networkError = new Error('Network failure');
            mockGet.mockRejectedValueOnce(networkError);
            await expect(githubService.repoExists('a', 'b')).rejects.toThrow('Network failure');
        });
    });

    describe('getLatestRelease', () => {
        const release = {
            tag_name: 'v1.0',
            name: 'Release 1.0',
            html_url: 'http://...',
            published_at: '',
        };

        it('returns release data on 200', async () => {
            mockGet.mockResolvedValueOnce({ data: release });
            const result = await githubService.getLatestRelease('golang', 'go');
            expect(result).toEqual(release);
        });

        it('returns null when no releases (GitHub 404)', async () => {
            const mockAxiosError = { isAxiosError: true, response: { status: 404 } };
            jest.spyOn(axios, 'isAxiosError').mockReturnValue(true);
            mockGet.mockRejectedValueOnce(mockAxiosError);
            const result = await githubService.getLatestRelease('empty', 'repo');
            expect(result).toBeNull();
        });

        it('throws RateLimitException on 429', async () => {
            const mockAxiosError = { isAxiosError: true, response: { status: 429, headers: {} } };
            jest.spyOn(axios, 'isAxiosError').mockReturnValue(true);
            mockGet.mockRejectedValueOnce(mockAxiosError);
            await expect(githubService.getLatestRelease('a', 'b')).rejects.toBeInstanceOf(RateLimitException);
        });

        it('re-throws unexpected errors from getLatestRelease', async () => {
            const networkError = new Error('Network failure');
            mockGet.mockRejectedValueOnce(networkError);
            await expect(githubService.getLatestRelease('a', 'b')).rejects.toThrow('Network failure');
        });

        it('returns cached release and skips HTTP call', async () => {
            mockCacheService.cacheGet.mockResolvedValueOnce(release);
            const result = await githubService.getLatestRelease('golang', 'go');
            expect(result).toEqual(release);
            expect(mockGet).not.toHaveBeenCalled();
        });
    });
});
