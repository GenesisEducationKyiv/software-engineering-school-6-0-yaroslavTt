import axios, { AxiosInstance } from 'axios';
import { environmentConfig } from '@config/environment.js';
import * as redisService from '@utilities/redis/redis.service.js';
import type { GithubRelease } from './dto/github-release.dto.js';
import { RateLimitException } from '@exceptions/rate-limit.exception.js';

// Lazily created so tests can inject a mock via setHttpClient before first call
let httpClient: AxiosInstance | null = null;

export function setHttpClient(client: AxiosInstance | null): void {
    httpClient = client;
}

function getHttpClient(): AxiosInstance {
    if (!httpClient) {
        httpClient = axios.create({
            baseURL: environmentConfig.githubApiBase,
            timeout: 10_000,
            headers: {
                Accept: 'application/vnd.github+json',
                ...(environmentConfig.githubToken ? { Authorization: `Bearer ${environmentConfig.githubToken}` } : {}),
            },
        });
    }
    return httpClient;
}

function handleRateLimit(err: unknown): never {
    if (axios.isAxiosError(err) && err.response?.status === 429) {
        const reset = err.response.headers['x-ratelimit-reset'];
        const retryAfter = reset ? parseInt(reset, 10) : null;
        throw new RateLimitException('GitHub API rate limit exceeded', retryAfter);
    }
    throw err;
}

export async function repoExists(owner: string, repo: string): Promise<boolean> {
    const cacheKey = `gh:repo:${owner}:${repo}`;
    const cached = await redisService.cacheGet<boolean>(cacheKey);
    if (cached !== null) return cached;

    try {
        await getHttpClient().get(`/repos/${owner}/${repo}`);
        await redisService.cacheSet(cacheKey, true);
        return true;
    } catch (err) {
        if (axios.isAxiosError(err) && err.response?.status === 404) return false;
        handleRateLimit(err);
    }
}

export async function getLatestRelease(owner: string, repo: string): Promise<GithubRelease | null> {
    const cacheKey = `gh:release:${owner}:${repo}`;
    const cached = await redisService.cacheGet<GithubRelease>(cacheKey);
    if (cached !== null) return cached;

    try {
        const { data } = await getHttpClient().get<GithubRelease>(`/repos/${owner}/${repo}/releases/latest`);
        await redisService.cacheSet(cacheKey, data);
        return data;
    } catch (err) {
        if (axios.isAxiosError(err) && err.response?.status === 404) return null;
        handleRateLimit(err);
    }
}
