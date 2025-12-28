import {
    Controller,
    Get,
    Post,
    Patch,
    Delete,
    Body,
    Param,
    ParseIntPipe,
    UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { AreasService, CreateAreaDto, UpdateAreaDto } from './areas.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@ApiTags('areas')
@Controller('areas')
export class AreasController {
    constructor(private readonly areasService: AreasService) { }

    @Get()
    @ApiOperation({ summary: 'Get all available areas (public)' })
    @ApiResponse({ status: 200, description: 'Areas retrieved successfully' })
    findAll() {
        return this.areasService.findAll();
    }

    @Get(':id')
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Get area by ID' })
    @ApiResponse({ status: 200, description: 'Area retrieved successfully' })
    @ApiResponse({ status: 404, description: 'Area not found' })
    findOne(@Param('id') id: string) {
        return this.areasService.findOne(id);
    }

    @Post()
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles('supervisor', 'admin')
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Create a new area (supervisor only)' })
    @ApiResponse({ status: 201, description: 'Area created successfully' })
    @ApiResponse({ status: 409, description: 'Area with this name already exists' })
    create(@Body() createAreaDto: CreateAreaDto) {
        return this.areasService.create(createAreaDto);
    }

    @Patch(':id')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles('supervisor', 'admin')
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Update an area (supervisor only)' })
    @ApiResponse({ status: 200, description: 'Area updated successfully' })
    @ApiResponse({ status: 404, description: 'Area not found' })
    update(
        @Param('id') id: string,
        @Body() updateAreaDto: UpdateAreaDto,
    ) {
        return this.areasService.update(id, updateAreaDto);
    }

    @Delete(':id')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles('supervisor', 'admin')
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Delete an area (supervisor only)' })
    @ApiResponse({ status: 200, description: 'Area deleted successfully' })
    @ApiResponse({ status: 404, description: 'Area not found' })
    delete(@Param('id') id: string) {
        return this.areasService.delete(id);
    }
}
