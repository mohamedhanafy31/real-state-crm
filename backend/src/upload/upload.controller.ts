import {
    Controller,
    Post,
    Param,
    UseInterceptors,
    UploadedFile,
    UseGuards,
    BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiConsumes, ApiBody } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { UploadService } from './upload.service';

@ApiTags('upload')
@Controller('upload')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class UploadController {
    constructor(private readonly uploadService: UploadService) { }

    @Post(':type')
    @UseInterceptors(FileInterceptor('file'))
    @ApiOperation({ summary: 'Upload an image file' })
    @ApiConsumes('multipart/form-data')
    @ApiBody({
        schema: {
            type: 'object',
            properties: {
                file: {
                    type: 'string',
                    format: 'binary',
                },
            },
        },
    })
    @ApiResponse({ status: 201, description: 'File uploaded successfully' })
    @ApiResponse({ status: 400, description: 'Invalid file type or size' })
    uploadFile(
        @Param('type') type: string,
        @UploadedFile() file: Express.Multer.File,
    ) {
        if (!file) {
            throw new BadRequestException('No file uploaded');
        }

        const validTypes = ['users', 'units', 'projects'];
        if (!validTypes.includes(type)) {
            throw new BadRequestException(`Invalid upload type. Must be one of: ${validTypes.join(', ')}`);
        }

        const url = this.uploadService.getFileUrl(file.filename, type);

        return {
            success: true,
            url,
            filename: file.filename,
            originalName: file.originalname,
            size: file.size,
        };
    }
}
