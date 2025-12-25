import {
    Controller,
    Get,
    Post,
    Body,
    Patch,
    Param,
    ParseIntPipe,
    UseGuards,
    Query,
    Delete,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { AssignAreasDto } from './dto/assign-areas.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@ApiTags('users')
@Controller('users')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class UsersController {
    constructor(private readonly usersService: UsersService) { }

    @Post()
    @Roles('supervisor', 'admin')
    @ApiOperation({ summary: 'Create a new user (supervisor only)' })
    @ApiResponse({ status: 201, description: 'User created successfully' })
    @ApiResponse({ status: 400, description: 'Bad request' })
    @ApiResponse({ status: 403, description: 'Forbidden - supervisor role required' })
    create(@Body() createUserDto: CreateUserDto) {
        return this.usersService.createUser(createUserDto);
    }

    @Get()
    @ApiOperation({ summary: 'Get all users' })
    @ApiResponse({ status: 200, description: 'Users retrieved successfully' })
    @ApiQuery({ name: 'role', required: false, enum: ['broker', 'supervisor', 'admin'] })
    findAll(@Query('role') role?: string) {
        return this.usersService.findAll(role);
    }

    @Get('brokers')
    @ApiOperation({ summary: 'Get all brokers with details' })
    @ApiResponse({ status: 200, description: 'Brokers retrieved successfully' })
    getAllBrokers() {
        return this.usersService.getAllBrokers();
    }

    @Get(':id')
    @ApiOperation({ summary: 'Get user by ID' })
    @ApiResponse({ status: 200, description: 'User retrieved successfully' })
    @ApiResponse({ status: 404, description: 'User not found' })
    findOne(@Param('id', ParseIntPipe) id: number) {
        return this.usersService.findOne(id);
    }

    @Patch(':id')
    @Roles('supervisor', 'admin')
    @ApiOperation({ summary: 'Update user (supervisor only)' })
    @ApiResponse({ status: 200, description: 'User updated successfully' })
    @ApiResponse({ status: 404, description: 'User not found' })
    @ApiResponse({ status: 403, description: 'Forbidden - supervisor role required' })
    update(@Param('id', ParseIntPipe) id: number, @Body() updateUserDto: UpdateUserDto) {
        return this.usersService.updateUser(id, updateUserDto);
    }

    @Patch(':id/status')
    @Roles('supervisor', 'admin')
    @ApiOperation({ summary: 'Block/unblock user (supervisor only)' })
    @ApiResponse({ status: 200, description: 'User status updated successfully' })
    @ApiResponse({ status: 404, description: 'User not found' })
    updateStatus(
        @Param('id', ParseIntPipe) id: number,
        @Body('isActive') isActive: boolean,
    ) {
        return this.usersService.updateUserStatus(id, isActive);
    }

    @Post('brokers/:id/areas')
    @Roles('supervisor', 'admin')
    @ApiOperation({ summary: 'Assign areas to broker (supervisor only)' })
    @ApiResponse({ status: 200, description: 'Areas assigned successfully' })
    @ApiResponse({ status: 404, description: 'Broker not found' })
    assignAreas(
        @Param('id', ParseIntPipe) id: number,
        @Body() assignAreasDto: AssignAreasDto,
    ) {
        return this.usersService.assignAreas(id, assignAreasDto);
    }

    @Get('brokers/:id/performance')
    @ApiOperation({ summary: 'Get broker performance metrics' })
    @ApiResponse({ status: 200, description: 'Performance metrics retrieved successfully' })
    @ApiResponse({ status: 404, description: 'Broker not found' })
    getBrokerPerformance(@Param('id', ParseIntPipe) id: number) {
        return this.usersService.getBrokerPerformance(id);
    }

    @Delete(':id')
    @Roles('supervisor', 'admin')
    @ApiOperation({ summary: 'Delete user (supervisor and admin only)' })
    @ApiResponse({ status: 200, description: 'User deleted successfully' })
    @ApiResponse({ status: 404, description: 'User not found' })
    delete(@Param('id', ParseIntPipe) id: number) {
        return this.usersService.deleteUser(id);
    }
}
