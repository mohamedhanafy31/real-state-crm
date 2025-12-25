import {
    Controller,
    Get,
    Post,
    Body,
    Query,
    Param,
    HttpCode,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { RequestsService } from '../requests/requests.service';
import { ProjectsService } from '../projects/projects.service';
import { AreasService } from '../areas/areas.service';
import { CreateCustomerDto } from '../requests/dto/create-customer.dto';
import { CreateRequestDto } from '../requests/dto/create-request.dto';

/**
 * Public API endpoints for AI chatbot integration.
 * These endpoints do not require authentication.
 */
@ApiTags('chatbot')
@Controller('chatbot')
export class ChatbotController {
    constructor(
        private readonly requestsService: RequestsService,
        private readonly projectsService: ProjectsService,
        private readonly areasService: AreasService,
    ) { }

    @Post('customers')
    @HttpCode(200)
    @ApiOperation({ summary: 'Get or create customer by phone (chatbot)' })
    @ApiResponse({ status: 200, description: 'Customer retrieved or created' })
    async getOrCreateCustomer(@Body() body: { phone: string; name?: string }) {
        // Try to find existing customer by phone
        const existingCustomers = await this.requestsService.findAllCustomers(body.phone);

        if (existingCustomers && existingCustomers.length > 0) {
            return existingCustomers[0]; // Return first match
        }

        // Create new customer
        const createDto: CreateCustomerDto = {
            name: body.name || `Customer ${body.phone}`,
            phone: body.phone,
        };

        return this.requestsService.createCustomer(createDto);
    }

    @Get('units/search')
    @ApiOperation({ summary: 'Search units (chatbot)' })
    @ApiQuery({ name: 'area', required: false })
    @ApiQuery({ name: 'project', required: false })
    @ApiQuery({ name: 'area_id', required: false, type: Number })
    @ApiQuery({ name: 'project_id', required: false, type: Number })
    @ApiQuery({ name: 'unit_type', required: false })
    @ApiQuery({ name: 'budget_max', required: false, type: Number })
    @ApiQuery({ name: 'budget_min', required: false, type: Number })
    @ApiQuery({ name: 'size_min', required: false, type: Number })
    @ApiQuery({ name: 'bedrooms', required: false, type: Number })
    @ApiQuery({ name: 'description', required: false })
    @ApiQuery({ name: 'sort_by', required: false, enum: ['price', 'size'] })
    @ApiQuery({ name: 'sort_order', required: false, enum: ['ASC', 'DESC'] })
    @ApiQuery({ name: 'limit', required: false, type: Number })
    @ApiQuery({ name: 'status', required: false })
    @ApiResponse({ status: 200, description: 'Matching units' })
    searchUnits(
        @Query('area') area?: string,
        @Query('project') project?: string,
        @Query('area_id') areaId?: number,
        @Query('project_id') projectId?: number,
        @Query('unit_type') unitType?: string,
        @Query('budget_max') budgetMax?: number,
        @Query('budget_min') budgetMin?: number,
        @Query('size_min') sizeMin?: number,
        @Query('bedrooms') bedrooms?: number,
        @Query('description') description?: string,
        @Query('sort_by') sortBy?: 'price' | 'size',
        @Query('sort_order') sortOrder?: 'ASC' | 'DESC',
        @Query('limit') limit?: number,
        @Query('status') status?: string,
    ) {
        return this.projectsService.searchUnits({
            area,
            project,
            areaId: areaId ? Number(areaId) : undefined,
            projectId: projectId ? Number(projectId) : undefined,
            unitType,
            budgetMax: budgetMax ? Number(budgetMax) : undefined,
            budgetMin: budgetMin ? Number(budgetMin) : undefined,
            sizeMin: sizeMin ? Number(sizeMin) : undefined,
            bedrooms: bedrooms ? Number(bedrooms) : undefined,
            description,
            sortBy,
            sortOrder,
            limit: limit ? Number(limit) : undefined,
            status,
        });
    }

    @Get('projects')
    @ApiOperation({ summary: 'Search projects (chatbot)' })
    @ApiQuery({ name: 'area', required: false })
    @ApiQuery({ name: 'area_id', required: false })
    @ApiResponse({ status: 200, description: 'Matching projects' })
    searchProjects(
        @Query('area') area?: string,
        @Query('area_id') areaId?: number,
    ) {
        return this.projectsService.searchProjects(area, areaId ? Number(areaId) : undefined);
    }

    @Post('requests')
    @ApiOperation({ summary: 'Create request (chatbot)' })
    @ApiResponse({ status: 201, description: 'Request created' })
    async createRequest(@Body() body: CreateRequestDto) {
        return this.requestsService.createRequest(body);
    }

    // ========== New Chatbot Endpoints ==========

    @Get('areas/search')
    @ApiOperation({ summary: 'Fuzzy search areas (chatbot)' })
    @ApiQuery({ name: 'q', required: true, description: 'Search query' })
    @ApiResponse({ status: 200, description: 'Matching areas with suggestions' })
    async searchAreas(@Query('q') query: string) {
        return this.areasService.findByNameFuzzy(query);
    }

    @Get('areas')
    @ApiOperation({ summary: 'Get all areas (chatbot)' })
    @ApiResponse({ status: 200, description: 'All areas' })
    async getAllAreas() {
        return this.areasService.findAll();
    }

    @Get('projects/search')
    @ApiOperation({ summary: 'Fuzzy search projects (chatbot)' })
    @ApiQuery({ name: 'q', required: true, description: 'Search query' })
    @ApiQuery({ name: 'area_id', required: false, type: Number })
    @ApiResponse({ status: 200, description: 'Matching projects' })
    async searchProjectsFuzzy(
        @Query('q') query: string,
        @Query('area_id') areaId?: number,
    ) {
        return this.projectsService.fuzzySearchProjects(query, areaId);
    }

    @Get('units/price-range')
    @ApiOperation({ summary: 'Get price range for filters (chatbot)' })
    @ApiQuery({ name: 'project', required: false })
    @ApiQuery({ name: 'area', required: false })
    @ApiQuery({ name: 'unit_type', required: false })
    @ApiResponse({ status: 200, description: 'Price range statistics' })
    async getPriceRange(
        @Query('project') project?: string,
        @Query('area') area?: string,
        @Query('unit_type') unitType?: string,
    ) {
        return this.projectsService.getPriceRange({
            projectName: project,
            areaName: area,
            unitType,
        });
    }

    @Get('units/types')
    @ApiOperation({ summary: 'Get distinct unit types (chatbot)' })
    @ApiResponse({ status: 200, description: 'List of unit types from DB' })
    async getUnitTypes() {
        return this.projectsService.getDistinctUnitTypes();
    }

    @Post('projects/compare')
    @ApiOperation({ summary: 'Compare multiple projects (chatbot)' })
    @ApiResponse({ status: 200, description: 'Project comparison data' })
    async compareProjects(@Body() body: { projects: string[] }) {
        return this.projectsService.compareProjects(body.projects);
    }

    // ========== Broker Chatbot Endpoints ==========

    @Get('broker/requests/:requestId')
    @ApiOperation({ summary: 'Get request with conversations for broker chatbot' })
    @ApiQuery({ name: 'broker_id', required: true, type: Number, description: 'Broker ID for access verification' })
    @ApiResponse({ status: 200, description: 'Request with conversations' })
    @ApiResponse({ status: 403, description: 'Access denied - broker not assigned to request' })
    @ApiResponse({ status: 404, description: 'Request not found' })
    async getRequestWithConversations(
        @Param('requestId') requestId: number,
        @Query('broker_id') brokerId: number,
    ) {
        return this.requestsService.getRequestWithConversationsForBroker(
            Number(requestId),
            Number(brokerId),
        );
    }

    @Get('broker/requests/:requestId/conversations')
    @ApiOperation({ summary: 'Get conversations for a request (broker chatbot)' })
    @ApiResponse({ status: 200, description: 'List of conversations' })
    async getRequestConversations(
        @Param('requestId') requestId: number,
    ) {
        return this.requestsService.getRequestConversations(Number(requestId));
    }
}
