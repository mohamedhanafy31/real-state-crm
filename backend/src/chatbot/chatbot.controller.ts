import {
    Controller,
    Get,
    Post,
    Body,
    Query,
    Param,
    HttpCode,
    UseGuards,
    HttpException,
    HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery, ApiBearerAuth } from '@nestjs/swagger';
import axios from 'axios';
import { RequestsService } from '../requests/requests.service';
import { ProjectsService } from '../projects/projects.service';
import { AreasService } from '../areas/areas.service';
import { CreateCustomerDto } from '../requests/dto/create-customer.dto';
import { CreateRequestDto } from '../requests/dto/create-request.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

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
        @Query('area_id') areaId?: string,
        @Query('project_id') projectId?: string,
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
            areaId,
            projectId,
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
        @Query('area_id') areaId?: string,
    ) {
        return this.projectsService.searchProjects(area, areaId);
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
        @Query('area_id') areaId?: string,
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
        @Param('requestId') requestId: string,
        @Query('broker_id') brokerId: string,
    ) {
        return this.requestsService.getRequestWithConversationsForBroker(
            requestId,
            brokerId,
        );
    }

    @Get('broker/requests/:requestId/conversations')
    @ApiOperation({ summary: 'Get conversations for a request (broker chatbot)' })
    @ApiQuery({ name: 'context_type', required: false, enum: ['customer', 'broker'], description: 'Filter by conversation context' })
    @ApiResponse({ status: 200, description: 'List of conversations' })
    async getRequestConversations(
        @Param('requestId') requestId: string,
        @Query('context_type') contextType?: 'customer' | 'broker',
    ) {
        return this.requestsService.getRequestConversations(requestId, contextType);
    }

    @Post('conversations')
    @ApiOperation({ summary: 'Save a conversation message (broker chatbot)' })
    @ApiResponse({ status: 201, description: 'Conversation saved' })
    async saveConversation(
        @Body() body: {
            related_request_id: string;
            actor_type: 'broker' | 'ai' | 'customer';
            message: string;
            actor_id?: string;
            context_type?: 'customer' | 'broker';
        },
    ) {
        // Auto-detect context_type if not provided
        const contextType = body.context_type || (body.actor_type === 'broker' ? 'broker' : 'customer');
        return this.requestsService.saveConversation(
            body.related_request_id,
            body.actor_type,
            body.message,
            body.actor_id,
            contextType,
        );
    }

    @Get('broker/all-requests')
    @ApiOperation({ summary: 'Get all requests for broker selection (broker chatbot)' })
    @ApiQuery({ name: 'broker_id', required: false, type: Number })
    @ApiResponse({ status: 200, description: 'List of requests' })
    async getAllRequestsForBroker(
        @Query('broker_id') brokerId?: string,
    ) {
        return this.requestsService.getAllRequestsForBrokerUI(brokerId);
    }

    @Get('broker/requests-with-conversations')
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Get only requests that have broker-AI conversations' })
    @ApiResponse({ status: 200, description: 'List of requests with conversations' })
    async getRequestsWithConversations(
        @CurrentUser() user: any,
    ) {
        return this.requestsService.getRequestsWithBrokerConversations(user.userId);
    }

    // ========== Broker Chatbot Proxy Endpoints (Authenticated) ==========

    @Post('broker/chat')
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    @HttpCode(200)
    @ApiOperation({ summary: 'Chat with AI about a request (proxied to broker chatbot)' })
    @ApiResponse({ status: 200, description: 'AI response' })
    @ApiResponse({ status: 503, description: 'Chatbot service unavailable' })
    async chatWithAI(
        @CurrentUser() user: any,
        @Body() body: {
            request_id: string;
            message: string;
        },
    ) {
        const chatbotUrl = process.env.BROKER_CHATBOT_URL || 'http://localhost:8002';

        try {
            // Send string IDs - chatbot schema expects strings, not integers
            const payload = {
                broker_id: user.userId,
                request_id: body.request_id,
                message: body.message,
            };
            
            console.log('Sending to broker chatbot:', JSON.stringify(payload, null, 2));
            
            const response = await axios.post(`${chatbotUrl}/api/chat`, payload);

            return response.data;
        } catch (error) {
            console.error('Error communicating with broker chatbot:', error.message);
            if (error.response) {
                console.error('Chatbot response status:', error.response.status);
                console.error('Chatbot response data:', JSON.stringify(error.response.data, null, 2));
            }
            throw new HttpException(
                'Failed to communicate with AI chatbot',
                HttpStatus.SERVICE_UNAVAILABLE,
            );
        }
    }

    @Get('broker/requests/:requestId/analysis')
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Get AI analysis summary for a request' })
    @ApiResponse({ status: 200, description: 'AI analysis' })
    @ApiResponse({ status: 503, description: 'Chatbot service unavailable' })
    async getRequestAnalysis(
        @CurrentUser() user: any,
        @Param('requestId') requestId: string,
    ) {
        const chatbotUrl = process.env.BROKER_CHATBOT_URL || 'http://localhost:8002';

        try {
            console.log(`Getting AI analysis for request ${requestId}, broker ${user.userId}`);
            
            const response = await axios.get(
                `${chatbotUrl}/api/requests/${requestId}/summary`,
                {
                    params: { broker_id: user.userId }, // Send as string, not parseInt
                },
            );

            return response.data;
        } catch (error) {
            console.error('Error getting AI analysis:', error.message);
            if (error.response) {
                console.error('Chatbot response:', JSON.stringify(error.response.data, null, 2));
            }
            throw new HttpException(
                'Failed to get AI analysis',
                HttpStatus.SERVICE_UNAVAILABLE,
            );
        }
    }

}
