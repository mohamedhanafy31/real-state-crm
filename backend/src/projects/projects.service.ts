import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Project } from '../entities/project.entity';
import { Unit } from '../entities/unit.entity';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { CreateUnitDto } from './dto/create-unit.dto';
import { UpdateUnitDto } from './dto/update-unit.dto';
import { CacheService } from '../cache/cache.service';
import { EmbeddingService } from '../embedding/embedding.service';

@Injectable()
export class ProjectsService {
    private readonly CACHE_TTL_PROJECTS = 14400; // 4 hours
    private readonly CACHE_TTL_UNITS = 3600; // 1 hour  
    private readonly CACHE_TTL_STATIC = 86400; // 24 hours
    
    constructor(
        @InjectRepository(Project)
        private readonly projectRepository: Repository<Project>,
        @InjectRepository(Unit)
        private readonly unitRepository: Repository<Unit>,
        private readonly cacheService: CacheService,
        private readonly embeddingService: EmbeddingService,
    ) { }

    // Project operations
    async createProject(createProjectDto: CreateProjectDto): Promise<Project> {
        const project = this.projectRepository.create(createProjectDto);
        const saved = await this.projectRepository.save(project);
        
        // Sync embedding (parallel, fire-and-forget)
        this.embeddingService.syncProject(saved.projectId, saved.name, saved.nameAr, saved.areaId).catch(err => 
            console.warn(`Embedding sync failed for project ${saved.projectId}: ${err.message}`)
        );
        
        return saved;
    }

    async findAllProjects(): Promise<Project[]> {
        return this.cacheService.wrap(
            'projects:all',
            async () => {
                return this.projectRepository.find({
                    relations: ['area', 'units'],
                    order: { createdAt: 'DESC' },
                });
            },
            this.CACHE_TTL_PROJECTS,
        );
    }

    async findProject(projectId: number): Promise<Project> {
        const project = await this.projectRepository.findOne({
            where: { projectId },
            relations: ['area', 'units'],
        });

        if (!project) {
            throw new NotFoundException(`Project with ID ${projectId} not found`);
        }

        return project;
    }

    async updateProject(projectId: number, updateProjectDto: UpdateProjectDto): Promise<Project> {
        const project = await this.findProject(projectId);
        Object.assign(project, updateProjectDto);
        const updated = await this.projectRepository.save(project);
        
        // Invalidate caches
        await this.cacheService.del('projects: all');
        await this.cacheService.del(`projects:${projectId}`);
        
        // Sync embedding (parallel, fire-and-forget)
        this.embeddingService.syncProject(updated.projectId, updated.name, updated.nameAr, updated.areaId).catch(err => 
            console.warn(`Embedding sync failed for project ${updated.projectId}: ${err.message}`)
        );
        
        return updated;
    }

    // Unit operations
    async createUnit(projectId: number, createUnitDto: CreateUnitDto): Promise<Unit> {
        await this.findProject(projectId); // Verify project exists

        const unit = this.unitRepository.create({
            status: 'available',
            ...createUnitDto,
            projectId,
        });

        return this.unitRepository.save(unit);
    }

    async findAllUnits(filters?: any): Promise<Unit[]> {
        const query = this.unitRepository
            .createQueryBuilder('unit')
            .leftJoinAndSelect('unit.project', 'project')
            .leftJoinAndSelect('project.area', 'area');

        if (filters?.status) {
            query.andWhere('unit.status = :status', { status: filters.status });
        }

        if (filters?.projectId) {
            query.andWhere('unit.projectId = :projectId', { projectId: filters.projectId });
        }

        if (filters?.areaId) {
            query.andWhere('project.areaId = :areaId', { areaId: filters.areaId });
        }

        if (filters?.minPrice) {
            query.andWhere('unit.price >= :minPrice', { minPrice: filters.minPrice });
        }

        if (filters?.maxPrice) {
            query.andWhere('unit.price <= :maxPrice', { maxPrice: filters.maxPrice });
        }

        if (filters?.unitType) {
            query.andWhere('unit.unitType = :unitType', { unitType: filters.unitType });
        }

        query.orderBy('unit.createdAt', 'DESC');

        return query.getMany();
    }

    async findUnit(unitId: number): Promise<Unit> {
        const unit = await this.unitRepository.findOne({
            where: { unitId },
            relations: ['project', 'project.area'],
        });

        if (!unit) {
            throw new NotFoundException(`Unit with ID ${unitId} not found`);
        }

        return unit;
    }

    async updateUnit(unitId: number, updateUnitDto: UpdateUnitDto): Promise<Unit> {
        const unit = await this.findUnit(unitId);
        Object.assign(unit, updateUnitDto);
        const updated = await this.unitRepository.save(unit);
        
        // Invalidate units cache
        await this.cacheService.del('units:available');
        await this.cacheService.del('projects:all');
        
        return updated;
    }

    async deleteUnit(unitId: number): Promise<void> {
        const unit = await this.findUnit(unitId);

        if (unit.status === 'reserved') {
            throw new NotFoundException('Cannot delete a reserved unit');
        }

        await this.unitRepository.remove(unit);
        
        // Invalidate caches
        await this.cacheService.del('units:available');
        await this.cacheService.del('projects:all');
    }

    async searchUnits(searchParams: {
        area?: string;
        project?: string;
        areaId?: number;           // NEW: Accept area ID
        projectId?: number;        // NEW: Accept project ID
        unitType?: string;
        budgetMax?: number;
        budgetMin?: number;        // NEW: Minimum budget
        sizeMin?: number;
        bedrooms?: number;
        description?: string;
        sortBy?: 'price' | 'size'; // NEW: Sort field
        sortOrder?: 'ASC' | 'DESC';// NEW: Sort direction
        limit?: number;            // NEW: Result limit
        status?: string;           // NEW: Filter by status
    }): Promise<Unit[]> {
        const query = this.unitRepository
            .createQueryBuilder('unit')
            .leftJoinAndSelect('unit.project', 'project')
            .leftJoinAndSelect('project.area', 'area');

        // ALWAYS filter by status (default: available)
        const statusFilter = searchParams.status || 'available';
        query.where('unit.status = :status', { status: statusFilter });

        // PRIORITY 1: Search by area ID (most reliable)
        if (searchParams.areaId) {
            query.andWhere('project.areaId = :areaId', {
                areaId: searchParams.areaId,
            });
        }
        // Fallback: Search by area name (for backwards compatibility)
        else if (searchParams.area) {
            query.andWhere('LOWER(area.name) LIKE LOWER(:area)', {
                area: `%${searchParams.area}%`,
            });
        }

        // PRIORITY 2: Search by project ID (most reliable)
        if (searchParams.projectId) {
            query.andWhere('unit.projectId = :projectId', {
                projectId: searchParams.projectId,
            });
        }
        // Fallback: Search by project name
        else if (searchParams.project) {
            query.andWhere('LOWER(project.name) LIKE LOWER(:project)', {
                project: `%${searchParams.project}%`,
            });
        }

        // Filter by unit type (case-insensitive)
        if (searchParams.unitType) {
            query.andWhere('LOWER(unit.unitType) = LOWER(:unitType)', {
                unitType: searchParams.unitType,
            });
        }

        // Filter by budget range
        if (searchParams.budgetMax) {
            query.andWhere('unit.price <= :budgetMax', {
                budgetMax: searchParams.budgetMax,
            });
        }
        if (searchParams.budgetMin) {
            query.andWhere('unit.price >= :budgetMin', {
                budgetMin: searchParams.budgetMin,
            });
        }

        // Filter by minimum size
        if (searchParams.sizeMin) {
            query.andWhere('unit.size >= :sizeMin', {
                sizeMin: searchParams.sizeMin,
            });
        }

        // Filter by bedrooms (if specified)
        if (searchParams.bedrooms) {
            query.andWhere('unit.bedrooms >= :bedrooms', {
                bedrooms: searchParams.bedrooms,
            });
        }

        // Filter by description (bilingual support)
        if (searchParams.description) {
            query.andWhere('LOWER(unit.description) LIKE LOWER(:description)', {
                description: `%${searchParams.description}%`,
            });
        }

        // Sorting
        const sortField = searchParams.sortBy === 'size' ? 'unit.size' : 'unit.price';
        const sortOrder = searchParams.sortOrder || 'ASC';
        query.orderBy(sortField, sortOrder);

        // Limit
        const limit = searchParams.limit || 20;
        query.limit(limit);

        return query.getMany();
    }

    async getAvailableUnits(): Promise<Unit[]> {
        return this.cacheService.wrap(
            'units:available',
            async () => {
                return this.findAllUnits({ status: 'available' });
            },
            this.CACHE_TTL_UNITS,
        );
    }

    async searchProjects(areaName?: string, areaId?: number): Promise<Project[]> {
        const query = this.projectRepository
            .createQueryBuilder('project')
            .leftJoinAndSelect('project.area', 'area')
            .leftJoinAndSelect('project.units', 'units')
            .where('project.isActive = :isActive', { isActive: true });

        // CRITICAL FIX: Filter by area_id if provided (takes priority)
        if (areaId) {
            query.andWhere('project.area_id = :areaId', { areaId });
        } else if (areaName) {
            query.andWhere('LOWER(area.name) LIKE LOWER(:area)', {
                area: `%${areaName}%`,
            });
        }

        query.orderBy('project.name', 'ASC');

        return query.getMany();
    }

    // ========== Chatbot API Methods ==========

    /**
     * Fuzzy search projects by name, optionally filtered by area.
     * Used by chatbot for project matching.
     */
    async fuzzySearchProjects(
        query: string,
        areaId?: number,
        limit: number = 5
    ): Promise<Project[]> {
        const qb = this.projectRepository
            .createQueryBuilder('project')
            .leftJoinAndSelect('project.area', 'area')
            .where('project.isActive = :isActive', { isActive: true })
            .andWhere('LOWER(project.name) LIKE LOWER(:query)', { query: `%${query}%` });

        if (areaId) {
            qb.andWhere('project.areaId = :areaId', { areaId });
        }

        return qb
            .orderBy('project.name', 'ASC')
            .limit(limit)
            .getMany();
    }

    /**
     * Get price range for units matching given filters.
     * Used by chatbot for price inquiries.
     */
    async getPriceRange(filters: {
        projectName?: string;
        areaName?: string;
        unitType?: string;
    }): Promise<{ min: number | null; max: number | null; count: number }> {
        const qb = this.unitRepository
            .createQueryBuilder('unit')
            .leftJoin('unit.project', 'project')
            .leftJoin('project.area', 'area')
            .where('unit.status = :status', { status: 'available' });

        if (filters.projectName) {
            qb.andWhere('LOWER(project.name) LIKE LOWER(:projectName)', {
                projectName: `%${filters.projectName}%`,
            });
        }

        if (filters.areaName) {
            qb.andWhere('LOWER(area.name) LIKE LOWER(:areaName)', {
                areaName: `%${filters.areaName}%`,
            });
        }

        if (filters.unitType) {
            qb.andWhere('LOWER(unit.unitType) = LOWER(:unitType)', {
                unitType: filters.unitType,
            });
        }

        const result = await qb
            .select('MIN(unit.price)', 'min')
            .addSelect('MAX(unit.price)', 'max')
            .addSelect('COUNT(unit.unitId)', 'count')
            .getRawOne();

        return {
            min: result?.min ? parseFloat(result.min) : null,
            max: result?.max ? parseFloat(result.max) : null,
            count: parseInt(result?.count || '0', 10),
        };
    }

    /**
     * Compare multiple projects - returns summary data for each.
     * Used by chatbot for project comparison queries.
     */
    async compareProjects(projectNames: string[]): Promise<any[]> {
        const results = [];

        for (const name of projectNames) {
            const project = await this.projectRepository
                .createQueryBuilder('project')
                .leftJoinAndSelect('project.area', 'area')
                .where('LOWER(project.name) LIKE LOWER(:name)', { name: `%${name}%` })
                .getOne();

            if (project) {
                const priceRange = await this.getPriceRange({ projectName: name });
                const unitTypes = await this.unitRepository
                    .createQueryBuilder('unit')
                    .select('DISTINCT unit.unitType', 'unitType')
                    .where('unit.projectId = :projectId', { projectId: project.projectId })
                    .getRawMany();

                results.push({
                    name: project.name,
                    area: project.area?.name,
                    unitTypes: unitTypes.map(u => u.unitType),
                    priceRange,
                    isActive: project.isActive,
                });
            }
        }

        return results;
    }

    /**
     * Get distinct unit types from all units in database.
     * Used by chatbot for dynamic unit type matching (no hardcoded list).
     */
    async getDistinctUnitTypes(): Promise<string[]> {
        return this.cacheService.wrap(
            'unit-types:distinct',
            async () => {
                const results = await this.unitRepository
                    .createQueryBuilder('unit')
                    .select('DISTINCT unit.unitType', 'unitType')
                    .where('unit.unitType IS NOT NULL')
                    .orderBy('unit.unitType', 'ASC')
                    .getRawMany();

                return results.map(r => r.unitType);
            },
            this.CACHE_TTL_STATIC,
        );
    }
}
