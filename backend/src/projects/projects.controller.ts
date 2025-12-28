import {
    Controller,
    Get,
    Post,
    Body,
    Patch,
    Param,
    Delete,
    ParseIntPipe,
    Query,
    UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { ProjectsService } from './projects.service';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { CreateUnitDto } from './dto/create-unit.dto';
import { UpdateUnitDto } from './dto/update-unit.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@ApiTags('projects', 'units')
@Controller()
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class ProjectsController {
    constructor(private readonly projectsService: ProjectsService) { }

    // Project endpoints
    @Post('projects')
    @Roles('supervisor', 'admin')
    @ApiOperation({ summary: 'Create a new project (supervisor only)' })
    @ApiResponse({ status: 201, description: 'Project created successfully' })
    createProject(@Body() createProjectDto: CreateProjectDto) {
        return this.projectsService.createProject(createProjectDto);
    }

    @Get('projects')
    @ApiOperation({ summary: 'Get all projects' })
    @ApiResponse({ status: 200, description: 'Projects retrieved successfully' })
    findAllProjects() {
        return this.projectsService.findAllProjects();
    }

    @Get('projects/:id')
    @ApiOperation({ summary: 'Get project by ID' })
    @ApiResponse({ status: 200, description: 'Project retrieved successfully' })
    @ApiResponse({ status: 404, description: 'Project not found' })
    findProject(@Param('id') id: string) {
        return this.projectsService.findProject(id);
    }

    @Patch('projects/:id')
    @Roles('supervisor', 'admin')
    @ApiOperation({ summary: 'Update project (supervisor only)' })
    @ApiResponse({ status: 200, description: 'Project updated successfully' })
    @ApiResponse({ status: 404, description: 'Project not found' })
    updateProject(
        @Param('id') id: string,
        @Body() updateProjectDto: UpdateProjectDto,
    ) {
        return this.projectsService.updateProject(id, updateProjectDto);
    }

    // Unit endpoints
    @Post('projects/:projectId/units')
    @Roles('supervisor', 'admin')
    @ApiOperation({ summary: 'Create a new unit in a project (supervisor only)' })
    @ApiResponse({ status: 201, description: 'Unit created successfully' })
    @ApiResponse({ status: 404, description: 'Project not found' })
    createUnit(
        @Param('projectId') projectId: string,
        @Body() createUnitDto: CreateUnitDto,
    ) {
        return this.projectsService.createUnit(projectId, createUnitDto);
    }

    @Get('units')
    @ApiOperation({ summary: 'Get all units with optional filters' })
    @ApiQuery({ name: 'status', required: false })
    @ApiQuery({ name: 'projectId', required: false, type: String })
    @ApiQuery({ name: 'areaId', required: false, type: String })
    @ApiQuery({ name: 'minPrice', required: false, type: Number })
    @ApiQuery({ name: 'maxPrice', required: false, type: Number })
    @ApiQuery({ name: 'unitType', required: false })
    @ApiResponse({ status: 200, description: 'Units retrieved successfully' })
    findAllUnits(
        @Query('status') status?: string,
        @Query('projectId') projectId?: string,
        @Query('areaId') areaId?: string,
        @Query('minPrice') minPrice?: number,
        @Query('maxPrice') maxPrice?: number,
        @Query('unitType') unitType?: string,
    ) {
        return this.projectsService.findAllUnits({
            status,
            projectId,
            areaId,
            minPrice,
            maxPrice,
            unitType,
        });
    }

    @Get('units/search')
    @ApiOperation({ summary: 'Search units for chatbot integration (public)' })
    @ApiQuery({ name: 'area', required: false, description: 'Area name' })
    @ApiQuery({ name: 'unit_type', required: false, description: 'Unit type (شقة, فيلا, etc.)' })
    @ApiQuery({ name: 'budget_max', required: false, type: Number, description: 'Maximum budget' })
    @ApiQuery({ name: 'size_min', required: false, type: Number, description: 'Minimum size in sqm' })
    @ApiQuery({ name: 'bedrooms', required: false, type: Number, description: 'Number of bedrooms' })
    @ApiResponse({ status: 200, description: 'Matching units retrieved successfully' })
    searchUnits(
        @Query('area') area?: string,
        @Query('unit_type') unitType?: string,
        @Query('budget_max') budgetMax?: number,
        @Query('size_min') sizeMin?: number,
        @Query('bedrooms') bedrooms?: number,
    ) {
        return this.projectsService.searchUnits({
            area,
            unitType,
            budgetMax,
            sizeMin,
            bedrooms,
        });
    }

    @Get('units/available')
    @ApiOperation({ summary: 'Get all available units' })
    @ApiResponse({ status: 200, description: 'Available units retrieved successfully' })
    getAvailableUnits() {
        return this.projectsService.getAvailableUnits();
    }

    @Get('units/:id')
    @ApiOperation({ summary: 'Get unit by ID' })
    @ApiResponse({ status: 200, description: 'Unit retrieved successfully' })
    @ApiResponse({ status: 404, description: 'Unit not found' })
    findUnit(@Param('id') id: string) {
        return this.projectsService.findUnit(id);
    }

    @Patch('units/:id')
    @Roles('supervisor', 'broker', 'admin')
    @ApiOperation({ summary: 'Update unit' })
    @ApiResponse({ status: 200, description: 'Unit updated successfully' })
    @ApiResponse({ status: 404, description: 'Unit not found' })
    updateUnit(@Param('id') id: string, @Body() updateUnitDto: UpdateUnitDto) {
        return this.projectsService.updateUnit(id, updateUnitDto);
    }

    @Delete('units/:id')
    @Roles('supervisor', 'admin')
    @ApiOperation({ summary: 'Delete unit (supervisor only)' })
    @ApiResponse({ status: 200, description: 'Unit deleted successfully' })
    @ApiResponse({ status: 404, description: 'Unit not found or reserved' })
    deleteUnit(@Param('id') id: string) {
        return this.projectsService.deleteUnit(id);
    }
}
