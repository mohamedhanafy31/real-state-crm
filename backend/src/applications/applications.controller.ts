import {
    Controller,
    Get,
    Post,
    Patch,
    Param,
    Body,
    Query,
    ParseIntPipe,
    UseGuards,
    HttpCode,
    HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { ApplicationsService } from './applications.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CreateApplicationDto } from './dto/create-application.dto';
import { StartInterviewDto, SubmitResponseDto } from './dto/interview.dto';

@ApiTags('applications')
@Controller()
export class ApplicationsController {
    constructor(private readonly applicationsService: ApplicationsService) {}

    // ========== Public Endpoints ==========

    @Get('applications/:id/status')
    @ApiOperation({ summary: 'Get application status (for applicant)' })
    @ApiResponse({ status: 200, description: 'Application status retrieved' })
    @ApiResponse({ status: 404, description: 'Application not found' })
    async getApplicationStatus(@Param('id') id: string) {
        return this.applicationsService.getApplicationStatus(id);
    }

    // ========== Supervisor Endpoints ==========

    @Get('applications')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles('supervisor')
    @ApiBearerAuth()
    @ApiOperation({ summary: 'List all applications (supervisor only)' })
    @ApiQuery({ name: 'status', required: false, description: 'Filter by status' })
    @ApiResponse({ status: 200, description: 'Applications retrieved' })
    async listApplications(
        @Query('status') status?: string,
    ) {
        return this.applicationsService.listApplications(status);
    }

    @Get('applications/:id')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles('supervisor')
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Get application details with interview transcript (supervisor only)' })
    @ApiResponse({ status: 200, description: 'Application details retrieved' })
    @ApiResponse({ status: 404, description: 'Application not found' })
    async getApplicationDetails(@Param('id') id: string) {
        return this.applicationsService.getApplicationDetails(id);
    }

    // ========== Interview Endpoints (for AI Service / Frontend) ==========

    @Post('chatbot/interview/start')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Start or resume interview session' })
    @ApiResponse({ status: 200, description: 'Interview session started/resumed' })
    @ApiResponse({ status: 404, description: 'Application not found' })
    async startInterview(@Body() dto: StartInterviewDto) {
        return this.applicationsService.startInterview(dto.applicationId);
    }

    @Post('chatbot/interview/respond')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Submit answer and get next question' })
    @ApiResponse({ status: 200, description: 'Response processed' })
    async submitResponse(@Body() dto: SubmitResponseDto) {
        return this.applicationsService.submitResponse(dto.sessionId, dto.responseText);
    }

    @Get('chatbot/interview/:sessionId')
    @ApiOperation({ summary: 'Get interview session state' })
    @ApiResponse({ status: 200, description: 'Session state retrieved' })
    @ApiResponse({ status: 404, description: 'Session not found' })
    async getInterviewSession(@Param('sessionId') sessionId: string) {
        return this.applicationsService.getInterviewSession(sessionId);
    }

    @Post('chatbot/interview/complete')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Complete interview with final score (called by AI service)' })
    @ApiResponse({ status: 200, description: 'Interview completed' })
    async completeInterview(
        @Body() body: { sessionId: string; totalScore: number; redFlags: string[] },
    ) {
        return this.applicationsService.completeInterview(
            body.sessionId,
            body.totalScore,
            body.redFlags,
        );
    }
}
