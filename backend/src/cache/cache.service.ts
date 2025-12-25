import { Injectable, Inject, Logger } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';

@Injectable()
export class CacheService {
    private readonly logger = new Logger(CacheService.name);
    private readonly locks = new Map<string, Promise<any>>();

    constructor(
        @Inject(CACHE_MANAGER)
        private readonly cacheManager: Cache,
    ) {}

    /**
     * Get a value from cache
     */
    async get<T>(key: string): Promise<T | undefined> {
        try {
            const value = await this.cacheManager.get<T>(key);
            if (value) {
                this.logger.debug(`Cache HIT: ${key}`);
            } else {
                this.logger.debug(`Cache MISS: ${key}`);
            }
            return value;
        } catch (error) {
            this.logger.error(`Cache GET error for key ${key}:`, error);
            return undefined;
        }
    }

    /**
     * Set a value in cache with optional TTL (in seconds)
     */
    async set<T>(key: string, value: T, ttl?: number): Promise<void> {
        try {
            const ttlMs = ttl ? ttl * 1000 : undefined; // Convert to milliseconds
            await this.cacheManager.set(key, value, ttlMs);
            this.logger.debug(`Cache SET: ${key} (TTL: ${ttl || 'default'}s)`);
        } catch (error) {
            this.logger.error(`Cache SET error for key ${key}:`, error);
        }
    }

    /**
     * Delete a value from cache
     */
    async del(key: string): Promise<void> {
        try {
            await this.cacheManager.del(key);
            this.logger.debug(`Cache DEL: ${key}`);
        } catch (error) {
            this.logger.error(`Cache DEL error for key ${key}:`, error);
        }
    }

    /**
     * Delete multiple keys matching a pattern
     */
    async delPattern(pattern: string): Promise<void> {
        try {
            // Note: This requires redis store to expose the keys method
            // For now, we'll log a warning and implement this later
            this.logger.warn(`Pattern deletion not yet implemented: ${pattern}`);
        } catch (error) {
            this.logger.error(`Cache DEL pattern error for ${pattern}:`, error);
        }
    }

    /**
     * Clear all cache (not supported in cache-manager-redis-yet)
     */
    async reset(): Promise<void> {
        this.logger.warn('Cache RESET: Not supported in current cache-manager version');
        // Note: reset() is not available in cache-manager v5+
        // Would need to implement using Redis FLUSHDB command directly
    }

    /**
     * Wrap a function with cache - get from cache or execute and cache result
     * Includes stampede prevention via mutex locks
     */
    async wrap<T>(
        key: string,
        fn: () => Promise<T>,
        ttl?: number,
    ): Promise<T> {
        try {
            // Try to get from cache first
            const cached = await this.get<T>(key);
            if (cached !== undefined) {
                return cached;
            }

            // Check if there's already a lock for this key (stampede prevention)
            const existingLock = this.locks.get(key);
            if (existingLock) {
                this.logger.debug(`Cache LOCK WAIT: ${key} (stampede prevention)`);
                return await existingLock;
            }

            // Create a new lock for this key
            const lockPromise = (async () => {
                try {
                    this.logger.debug(`Cache WRAP executing function for: ${key}`);
                    const result = await fn();

                    // Cache the result
                    await this.set(key, result, ttl);

                    return result;
                } finally {
                    // Remove the lock when done
                    this.locks.delete(key);
                }
            })();

            // Store the lock
            this.locks.set(key, lockPromise);

            return await lockPromise;
        } catch (error) {
            this.logger.error(`Cache WRAP error for key ${key}:`, error);
            // On error, just execute the function without caching
            this.locks.delete(key);
            return await fn();
        }
    }

    /**
     * Generate a hash from an object for use in cache keys
     */
    hashObject(obj: any): string {
        const crypto = require('crypto');
        const str = JSON.stringify(obj, Object.keys(obj).sort());
        return crypto.createHash('md5').update(str).digest('hex');
    }
}

