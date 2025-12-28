import { IsString, IsInt, IsBoolean, IsNotEmpty, IsOptional, MinLength, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateProjectDto {
    @ApiProperty({ example: 'Palm Hills' })
    @IsString()
    @MinLength(1, { message: 'Project name cannot be empty' })
    @IsNotEmpty()
    name: string;

    @ApiProperty({ example: 'area-123' })
    @IsString()
    @IsNotEmpty()
    areaId: string;

    @ApiProperty({ example: true, required: false })
    @IsBoolean()
    @IsOptional()
    isActive?: boolean;

    @ApiProperty({ example: '/uploads/projects/image.jpg', required: false })
    @IsString()
    @IsOptional()
    @MaxLength(500)
    imageUrl?: string;
}
