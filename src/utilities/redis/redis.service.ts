import type Redis from 'ioredis';
import { environmentConfig } from '@config/environment';
import type { ICacheService } from './interface/cache.service.interface';

export class RedisService implements ICacheService {
    constructor(private readonly client: Redis) {}

    async cacheGet<T>(key: string): Promise<T | null> {
        try {
            const val = await this.client.get(key);
            return val ? (JSON.parse(val) as T) : null;
        } catch {
            return null;
        }
    }

    async cacheSet(key: string, value: unknown): Promise<void> {
        await this.client.setex(key, environmentConfig.redisTtl, JSON.stringify(value));
    }
}
