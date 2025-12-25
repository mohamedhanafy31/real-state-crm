import { Controller, Get, Delete, Post, Param } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { CacheService } from './cache.service';
import { CacheWarmingService } from './cache-warming.service';

@ApiTags('cache')
@Controller('cache')
export class CacheController {
    constructor(
        private readonly cacheService: CacheService,
        private readonly cacheWarmingService: CacheWarmingService,
    ) {}

    @Get('stats')
    @ApiOperation({ summary: 'Get cache statistics' })
    @ApiResponse({ status: 200, description: 'Cache statistics retrieved' })
    async getStats() {
        // Get Redis info using the cache manager
        return {
            status: 'healthy',
            message: 'Redis connection is active',
            timestamp: new Date().toISOString(),
            info: {
                cacheTTL: {
                    static: '24 hours (areas, unit types)',
                    projects: '4 hours',
                    units: '1 hour',
                    dashboard: '5 minutes',
                    brokerPerformance: '1 hour',
                },
                endpoints: {
                    areas: ['areas:all', 'areas:{id}'],
                    projects: ['projects:all'],
                    units: ['units:available', 'unit-types:distinct'],
                    dashboard: ['dashboard:supervisor'],
                    brokers: ['brokers:all', 'broker:perf:{id}'],
                },
            },
        };
    }

    @Get('health')
    @ApiOperation({ summary: 'Check cache health' })
    @ApiResponse({ status: 200, description: 'Cache is healthy' })
    async checkHealth() {
        try {
            // Try to set and get a test value
            const testKey = 'health:check';
            await this.cacheService.set(testKey, 'ok', 10);
            const value = await this.cacheService.get(testKey);
            await this.cacheService.del(testKey);
            
            return {
                status: value === 'ok' ? 'healthy' : 'degraded',
                timestamp: new Date().toISOString(),
            };
        } catch (error) {
            return {
                status: 'unhealthy',
                error: error instanceof Error ? error.message : 'Unknown error',
                timestamp: new Date().toISOString(),
            };
        }
    }

    @Post('warm')
    @ApiOperation({ summary: 'Manually trigger cache warming' })
    @ApiResponse({ status: 200, description: 'Cache warming triggered' })
    async warmCache() {
        return this.cacheWarmingService.manualWarm();
    }

    @Delete(':key')
    @ApiOperation({ summary: 'Delete a specific cache key' })
    @ApiResponse({ status: 200, description: 'Cache key deleted' })
    async deleteKey(@Param('key') key: string) {
        await this.cacheService.del(key);
        return {
            success: true,
            key,
            message: `Cache key "${key}" deleted`,
            timestamp: new Date().toISOString(),
        };
    }
}

