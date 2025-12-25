import { IsString, IsInt, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateRequestDto {
    @ApiProperty({ example: 'contacted', required: false })
    @IsString()
    @IsOptional()
    status?: string;

    @ApiProperty({ example: 1, required: false })
    @IsInt()
    @IsOptional()
    assignedBrokerId?: number;

    @ApiProperty({ example: 1, required: false })
    @IsInt()
    @IsOptional()
    areaId?: number;

    @ApiProperty({ example: 'apartment', required: false })
    @IsString()
    @IsOptional()
    unitType?: string;

    @ApiProperty({ example: 3000000, required: false })
    @IsOptional()
    budgetMin?: number;

    @ApiProperty({ example: 7000000, required: false })
    @IsOptional()
    budgetMax?: number;

    @ApiProperty({ example: 100, required: false })
    @IsOptional()
    sizeMin?: number;

    @ApiProperty({ example: 200, required: false })
    @IsOptional()
    sizeMax?: number;

    @ApiProperty({ example: 3, required: false })
    @IsOptional()
    bedrooms?: number;

    @ApiProperty({ example: 2, required: false })
    @IsOptional()
    bathrooms?: number;

    @ApiProperty({ example: 'Updated client notes', required: false })
    @IsString()
    @IsOptional()
    notes?: string;
}
