import {
    Controller,
    Get,
    Post,
    Body,
    Patch,
    Param,
    ParseIntPipe,
    Query,
    UseGuards,
    HttpCode,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { RequestsService } from './requests.service';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { CreateRequestDto } from './dto/create-request.dto';
import { UpdateRequestDto } from './dto/update-request.dto';
import { ReassignRequestDto } from './dto/reassign-request.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@ApiTags('customers', 'requests')
@Controller()
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class RequestsController {
    constructor(private readonly requestsService: RequestsService) { }

    // Customer endpoints
    @Post('customers')
    @ApiOperation({ summary: 'Create a new customer' })
    @ApiResponse({ status: 201, description: 'Customer created successfully' })
    createCustomer(@Body() createCustomerDto: CreateCustomerDto) {
        return this.requestsService.createCustomer(createCustomerDto);
    }

    @Get('customers')
    @ApiOperation({ summary: 'Get all customers or find by phone' })
    @ApiQuery({ name: 'phone', required: false, description: 'Filter by phone number' })
    @ApiResponse({ status: 200, description: 'Customers retrieved successfully' })
    findAllCustomers(@Query('phone') phone?: string) {
        return this.requestsService.findAllCustomers(phone);
    }

    @Get('customers/:id')
    @ApiOperation({ summary: 'Get customer by ID with all requests' })
    @ApiResponse({ status: 200, description: 'Customer retrieved successfully' })
    @ApiResponse({ status: 404, description: 'Customer not found' })
    findCustomer(@Param('id', ParseIntPipe) id: number) {
        return this.requestsService.findCustomer(id);
    }

    // Request endpoints
    @Post('requests')
    @ApiOperation({ summary: 'Create a new request' })
    @ApiResponse({ status: 201, description: 'Request created successfully' })
    @ApiResponse({ status: 404, description: 'Customer not found' })
    createRequest(@Body() createRequestDto: CreateRequestDto) {
        return this.requestsService.createRequest(createRequestDto);
    }

    @Get('requests')
    @ApiOperation({ summary: 'Get all requests with optional filters' })
    @ApiQuery({ name: 'status', required: false })
    @ApiQuery({ name: 'assignedBrokerId', required: false, type: Number })
    @ApiQuery({ name: 'areaId', required: false, type: Number })
    @ApiResponse({ status: 200, description: 'Requests retrieved successfully' })
    findAllRequests(
        @Query('status') status?: string,
        @Query('assignedBrokerId') assignedBrokerId?: number,
        @Query('areaId') areaId?: number,
    ) {
        return this.requestsService.findAllRequests({ status, assignedBrokerId, areaId });
    }

    @Get('requests/:id')
    @ApiOperation({ summary: 'Get request by ID with full details' })
    @ApiResponse({ status: 200, description: 'Request retrieved successfully' })
    @ApiResponse({ status: 404, description: 'Request not found' })
    findRequest(@Param('id', ParseIntPipe) id: number) {
        return this.requestsService.findRequest(id);
    }

    @Patch('requests/:id')
    @ApiOperation({ summary: 'Update request' })
    @ApiResponse({ status: 200, description: 'Request updated successfully' })
    @ApiResponse({ status: 404, description: 'Request not found' })
    updateRequest(
        @Param('id', ParseIntPipe) id: number,
        @Body() updateRequestDto: UpdateRequestDto,
    ) {
        return this.requestsService.updateRequest(id, updateRequestDto);
    }

    @Patch('requests/:id/reassign')
    @Roles('supervisor')
    @HttpCode(200)
    @ApiOperation({ summary: 'Reassign request to another broker (supervisor only)' })
    @ApiResponse({ status: 200, description: 'Request reassigned successfully' })
    @ApiResponse({ status: 404, description: 'Request not found' })
    @ApiResponse({ status: 403, description: 'Forbidden - supervisor role required' })
    reassignRequest(
        @Param('id', ParseIntPipe) id: number,
        @Body() reassignDto: ReassignRequestDto,
    ) {
        return this.requestsService.reassignRequest(id, reassignDto);
    }

    @Get('requests/:id/history')
    @ApiOperation({ summary: 'Get request status history' })
    @ApiResponse({ status: 200, description: 'History retrieved successfully' })
    getRequestHistory(@Param('id', ParseIntPipe) id: number) {
        return this.requestsService.getRequestHistory(id);
    }
}
