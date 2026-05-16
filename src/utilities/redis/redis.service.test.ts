jest.mock('@config/environment', () => ({
    environmentConfig: { redisTtl: 0 },
}));

import { environmentConfig } from '@config/environment';
import { RedisService } from './redis.service';
import type { Redis } from 'ioredis';

const mutableConfig = environmentConfig as { redisTtl: number };

const mockRedisClient = {
    get: jest.fn(),
    setex: jest.fn(),
} as unknown as jest.Mocked<Redis>;

let redisService: RedisService;

describe('RedisService', () => {
    beforeEach(() => {
        jest.resetAllMocks();
        mutableConfig.redisTtl = 0;
        redisService = new RedisService(mockRedisClient);
    });

    const mockCachedValue = { mock: 'value' };
    const mockKey = 'mock-key';

    describe('cacheGet', () => {
        it('if value is present in cache and is parsed, returns it', async () => {
            mockRedisClient.get.mockResolvedValue(JSON.stringify(mockCachedValue));

            const actualResult = await redisService.cacheGet(mockKey);

            expect(actualResult).toEqual(mockCachedValue);
            expect(mockRedisClient.get).toHaveBeenCalledWith(mockKey);
        });

        it('if value is not present in cache, returns null', async () => {
            mockRedisClient.get.mockResolvedValue(null);

            const actualResult = await redisService.cacheGet(mockKey);

            expect(actualResult).toBeNull();
            expect(mockRedisClient.get).toHaveBeenCalledWith(mockKey);
        });

        it('if error is thrown, returns null', async () => {
            mockRedisClient.get.mockRejectedValue(new Error('Redis error'));

            const actualResult = await redisService.cacheGet(mockKey);

            expect(actualResult).toBeNull();
            expect(mockRedisClient.get).toHaveBeenCalledWith(mockKey);
        });
    });

    describe('cacheSet', () => {
        it('sets cache value', async () => {
            const mockKey = 'mock-key';
            const mockValue = { mock: 'value' };
            await redisService.cacheSet(mockKey, mockValue);

            expect(mockRedisClient.setex).toHaveBeenCalledWith(
                mockKey,
                mutableConfig.redisTtl,
                JSON.stringify(mockValue),
            );
        });
    });
});
