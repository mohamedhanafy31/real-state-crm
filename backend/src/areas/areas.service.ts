import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Area } from '../entities/area.entity';
import { CacheService } from '../cache/cache.service';
import { EmbeddingService } from '../embedding/embedding.service';

export interface CreateAreaDto {
    name: string;
}

export interface UpdateAreaDto {
    name?: string;
}

@Injectable()
export class AreasService {
    private readonly CACHE_TTL_AREAS = 86400; // 24 hours
    private readonly CACHE_KEY_ALL = 'areas:all';
    private readonly CACHE_KEY_PREFIX = 'areas:';

    constructor(
        @InjectRepository(Area)
        private readonly areaRepository: Repository<Area>,
        private readonly cacheService: CacheService,
        private readonly embeddingService: EmbeddingService,
    ) { }

    async findAll(): Promise<Area[]> {
        return this.cacheService.wrap(
            this.CACHE_KEY_ALL,
            async () => {
                return this.areaRepository.find({
                    order: { name: 'ASC' },
                });
            },
            this.CACHE_TTL_AREAS,
        );
    }

    async findOne(id: number): Promise<Area> {
        return this.cacheService.wrap(
            `${this.CACHE_KEY_PREFIX}${id}`,
            async () => {
                const area = await this.areaRepository.findOne({ where: { areaId: id } });
                if (!area) {
                    throw new NotFoundException(`Area with ID ${id} not found`);
                }
                return area;
            },
            this.CACHE_TTL_AREAS,
        );
    }

    async create(createAreaDto: CreateAreaDto): Promise<Area> {
        const existing = await this.areaRepository.findOne({
            where: { name: createAreaDto.name },
        });
        if (existing) {
            throw new ConflictException(`Area with name "${createAreaDto.name}" already exists`);
        }

        const area = this.areaRepository.create(createAreaDto);
        const saved = await this.areaRepository.save(area);
        
        // Invalidate cache
        await this.cacheService.del(this.CACHE_KEY_ALL);
        
        // Sync embedding (parallel, fire-and-forget)
        this.embeddingService.syncArea(saved.areaId, saved.name, saved.nameAr).catch(err => 
            console.warn(`Embedding sync failed for area ${saved.areaId}: ${err.message}`)
        );
        
        return saved;
    }

    async update(id: number, updateAreaDto: UpdateAreaDto): Promise<Area> {
        const area = await this.findOne(id);

        if (updateAreaDto.name && updateAreaDto.name !== area.name) {
            const existing = await this.areaRepository.findOne({
                where: { name: updateAreaDto.name },
            });
            if (existing) {
                throw new ConflictException(`Area with name "${updateAreaDto.name}" already exists`);
            }
        }

        Object.assign(area, updateAreaDto);
        const updated = await this.areaRepository.save(area);
        
        // Invalidate cache
        await this.cacheService.del(this.CACHE_KEY_ALL);
        await this.cacheService.del(`${this.CACHE_KEY_PREFIX}${id}`);
        
        // Sync embedding (parallel, fire-and-forget)
        this.embeddingService.syncArea(updated.areaId, updated.name, updated.nameAr).catch(err => 
            console.warn(`Embedding sync failed for area ${updated.areaId}: ${err.message}`)
        );
        
        return updated;
    }

    async delete(id: number): Promise<void> {
        const area = await this.findOne(id);
        await this.areaRepository.remove(area);
        
        // Invalidate cache
        await this.cacheService.del(this.CACHE_KEY_ALL);
        await this.cacheService.del(`${this.CACHE_KEY_PREFIX}${id}`);
        
        // Delete embedding (parallel, fire-and-forget)
        this.embeddingService.deleteArea(id).catch(err => 
            console.warn(`Embedding delete failed for area ${id}: ${err.message}`)
        );
    }

    /**
     * Fuzzy search areas by name (case-insensitive LIKE).
     * Used by chatbot for area matching.
     */
    async fuzzySearch(query: string, limit: number = 5): Promise<Area[]> {
        return this.areaRepository
            .createQueryBuilder('area')
            .where('LOWER(area.name) LIKE LOWER(:query)', { query: `%${query}%` })
            .orderBy('area.name', 'ASC')
            .limit(limit)
            .getMany();
    }

    /**
     * Find area by exact or fuzzy name match.
     * Returns the matched area or suggestions if no exact match.
     * Used by chatbot for name correction.
     */
    async findByNameFuzzy(name: string): Promise<{ area: Area | null; suggestions: Area[] }> {
        // Try exact match first
        const exactMatch = await this.areaRepository.findOne({
            where: { name },
        });

        if (exactMatch) {
            return { area: exactMatch, suggestions: [] };
        }

        // Try case-insensitive exact match
        const caseInsensitive = await this.areaRepository
            .createQueryBuilder('area')
            .where('LOWER(area.name) = LOWER(:name)', { name })
            .getOne();

        if (caseInsensitive) {
            return { area: caseInsensitive, suggestions: [] };
        }

        // Return fuzzy suggestions
        const suggestions = await this.fuzzySearch(name, 5);
        return { area: null, suggestions };
    }
}
