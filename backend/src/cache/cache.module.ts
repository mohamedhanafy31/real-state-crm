import { Module, forwardRef } from '@nestjs/common';
import { CacheModule as NestCacheModule } from '@nestjs/cache-manager';
import { redisStore } from 'cache-manager-redis-yet';
import { CacheService } from './cache.service';
import { CacheController } from './cache.controller';
import { CacheWarmingService } from './cache-warming.service';
import { AreasModule } from '../areas/areas.module';
import { ProjectsModule } from '../projects/projects.module';

@Module({
    imports: [
        NestCacheModule.registerAsync({
            isGlobal: true,
            useFactory: async () => {
                const store = await redisStore({
                    socket: {
                        host: process.env.REDIS_HOST || 'localhost',
                        port: parseInt(process.env.REDIS_PORT || '6379', 10),
                    },
                    ttl: parseInt(process.env.CACHE_TTL_DEFAULT || '3600', 10) * 1000, // Convert to milliseconds
                });

                return {
                    store,
                };
            },
        }),
        forwardRef(() => AreasModule),
        forwardRef(() => ProjectsModule),
    ],
    controllers: [CacheController],
    providers: [CacheService, CacheWarmingService],
    exports: [CacheService, CacheWarmingService, NestCacheModule],
})
export class CacheModule {}

