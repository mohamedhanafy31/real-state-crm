import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { CacheService } from './cache.service';
import { AreasService } from '../areas/areas.service';
import { ProjectsService } from '../projects/projects.service';

@Injectable()
export class CacheWarmingService implements OnModuleInit {
    private readonly logger = new Logger(CacheWarmingService.name);
    private readonly WARM_ON_STARTUP = process.env.CACHE_WARM_ON_STARTUP !== 'false';

    constructor(
        private readonly cacheService: CacheService,
        private readonly areasService: AreasService,
        private readonly projectsService: ProjectsService,
    ) {}

    async onModuleInit() {
        if (this.WARM_ON_STARTUP) {
            this.logger.log('Starting cache warming...');
            await this.warmCriticalCaches();
            this.logger.log('Cache warming completed!');
        } else {
            this.logger.log('Cache warming disabled (CACHE_WARM_ON_STARTUP=false)');
        }
    }

    /**
     * Warm critical caches on application startup.
     * This pre-populates frequently accessed data to avoid cold cache misses.
     */
    async warmCriticalCaches(): Promise<void> {
        const startTime = Date.now();
        const results: { key: string; success: boolean; time: number }[] = [];

        // 1. Warm Areas cache (most critical - used everywhere)
        try {
            const areasStart = Date.now();
            await this.areasService.findAll();
            results.push({ 
                key: 'areas:all', 
                success: true, 
                time: Date.now() - areasStart 
            });
        } catch (error) {
            this.logger.error('Failed to warm areas cache:', error);
            results.push({ key: 'areas:all', success: false, time: 0 });
        }

        // 2. Warm Projects cache
        try {
            const projectsStart = Date.now();
            await this.projectsService.findAllProjects();
            results.push({ 
                key: 'projects:all', 
                success: true, 
                time: Date.now() - projectsStart 
            });
        } catch (error) {
            this.logger.error('Failed to warm projects cache:', error);
            results.push({ key: 'projects:all', success: false, time: 0 });
        }

        // 3. Warm Unit Types cache
        try {
            const unitTypesStart = Date.now();
            await this.projectsService.getDistinctUnitTypes();
            results.push({ 
                key: 'unit-types:distinct', 
                success: true, 
                time: Date.now() - unitTypesStart 
            });
        } catch (error) {
            this.logger.error('Failed to warm unit types cache:', error);
            results.push({ key: 'unit-types:distinct', success: false, time: 0 });
        }

        // 4. Warm Available Units cache
        try {
            const unitsStart = Date.now();
            await this.projectsService.getAvailableUnits();
            results.push({ 
                key: 'units:available', 
                success: true, 
                time: Date.now() - unitsStart 
            });
        } catch (error) {
            this.logger.error('Failed to warm available units cache:', error);
            results.push({ key: 'units:available', success: false, time: 0 });
        }

        const totalTime = Date.now() - startTime;
        const successCount = results.filter(r => r.success).length;
        
        this.logger.log(`Cache warming summary: ${successCount}/${results.length} caches warmed in ${totalTime}ms`);
        results.forEach(r => {
            if (r.success) {
                this.logger.debug(`  ✓ ${r.key} (${r.time}ms)`);
            } else {
                this.logger.warn(`  ✗ ${r.key} (failed)`);
            }
        });
    }

    /**
     * Manually trigger cache warming (can be called via API)
     */
    async manualWarm(): Promise<{ success: boolean; message: string; duration: number }> {
        const startTime = Date.now();
        try {
            await this.warmCriticalCaches();
            return {
                success: true,
                message: 'Cache warming completed successfully',
                duration: Date.now() - startTime,
            };
        } catch (error) {
            return {
                success: false,
                message: error instanceof Error ? error.message : 'Unknown error',
                duration: Date.now() - startTime,
            };
        }
    }
}
