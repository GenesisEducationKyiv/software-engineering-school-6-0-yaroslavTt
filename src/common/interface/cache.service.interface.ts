export interface ICacheService {
    cacheGet<T>(key: string): Promise<T | null>;
    cacheSet(key: string, value: unknown): Promise<void>;
}
