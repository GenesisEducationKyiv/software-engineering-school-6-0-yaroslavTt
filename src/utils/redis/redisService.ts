import Redis from 'ioredis';
import { environmentConfig } from '../../config/environment.js';

let redis: Redis | null = null;

export function setRedisClient(client: Redis | null): void {
    redis = client;
}

export async function cacheGet<T>(key: string): Promise<T | null> {
    if (!redis) return null;
    try {
        const val = await redis.get(key);
        return val ? (JSON.parse(val) as T) : null;
    } catch {
        return null;
    }
}

export async function cacheSet(key: string, value: unknown): Promise<void> {
    if (!redis) return;
    try {
        await redis.setex(key, environmentConfig.redisTtl, JSON.stringify(value));
    } catch {
        // Redis is a soft dependency — ignore write failures
    }
}
