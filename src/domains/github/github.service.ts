import axios, { AxiosInstance } from 'axios';
import type { GithubRelease } from './dto/github-release.dto';
import { RateLimitException } from '@exceptions/rate-limit.exception';
import type { IGithubService } from './interface/github.service.interface';
import type { ICacheService } from '@utilities/redis/interface/cache.service.interface';

export class GithubService implements IGithubService {
    constructor(
        private readonly httpClient: AxiosInstance,
        private readonly cacheService: ICacheService,
    ) {}

    async repoExists(owner: string, repo: string): Promise<boolean> {
        const cacheKey = `gh:repo:${owner}:${repo}`;
        const cached = await this.cacheService.cacheGet<boolean>(cacheKey);
        if (cached !== null) return cached;

        try {
            await this.httpClient.get(`/repos/${owner}/${repo}`);
            await this.cacheService.cacheSet(cacheKey, true);
            return true;
        } catch (err) {
            if (axios.isAxiosError(err) && err.response?.status === 404) return false;
            this.handleRateLimit(err);
        }
    }

    async getLatestRelease(owner: string, repo: string): Promise<GithubRelease | null> {
        const cacheKey = `gh:release:${owner}:${repo}`;
        const cached = await this.cacheService.cacheGet<GithubRelease>(cacheKey);
        if (cached !== null) return cached;

        try {
            const { data } = await this.httpClient.get<GithubRelease>(`/repos/${owner}/${repo}/releases/latest`);
            await this.cacheService.cacheSet(cacheKey, data);
            return data;
        } catch (err) {
            if (axios.isAxiosError(err) && err.response?.status === 404) return null;
            this.handleRateLimit(err);
        }
    }

    private handleRateLimit(err: unknown): never {
        if (axios.isAxiosError(err) && err.response?.status === 429) {
            const reset = err.response.headers['x-ratelimit-reset'];
            throw new RateLimitException('GitHub API rate limit exceeded', reset ? parseInt(reset, 10) : null);
        }
        throw err;
    }
}
