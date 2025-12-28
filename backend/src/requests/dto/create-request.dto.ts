import { IsInt, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateRequestDto {
    @ApiProperty({ example: 'customer-123' })
    @IsString()
    @IsNotEmpty()
    customerId: string;

    @ApiProperty({ example: 'area-123' })
    @IsString()
    @IsNotEmpty()
    areaId: string;

    @ApiProperty({ example: 'broker-123', required: false })
    @IsString()
    @IsOptional()
    assignedBrokerId?: string;

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

    @ApiProperty({ example: 'Client is in a hurry', required: false })
    @IsString()
    @IsOptional()
    notes?: string;
}
