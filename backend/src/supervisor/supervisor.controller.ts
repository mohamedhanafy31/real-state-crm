import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { SupervisorService, SupervisorDashboardMetrics } from './supervisor.service';

@ApiTags('supervisor')
@Controller('supervisor')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class SupervisorController {
    constructor(private readonly supervisorService: SupervisorService) { }

    @Get('dashboard')
    @Roles('supervisor')
    @ApiOperation({ summary: 'Get supervisor dashboard metrics (supervisor only)' })
    @ApiResponse({ status: 200, description: 'Dashboard metrics retrieved successfully' })
    @ApiResponse({ status: 403, description: 'Forbidden - supervisor role required' })
    async getDashboardMetrics(): Promise<SupervisorDashboardMetrics> {
        return this.supervisorService.getDashboardMetrics();
    }
}
