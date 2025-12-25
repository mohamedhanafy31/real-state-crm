import { IsString, IsNumber, IsNotEmpty, IsOptional, IsEnum, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateUnitDto {
    @ApiProperty({ example: 'شقة' })
    @IsString()
    @IsNotEmpty()
    unitType: string;

    @ApiProperty({ example: 120.5 })
    @IsNumber()
    @Min(0.1, { message: 'Size must be greater than 0' })
    @IsNotEmpty()
    size: number;

    @ApiProperty({ example: 3000000 })
    @IsNumber()
    @Min(1, { message: 'Price must be greater than 0' })
    @IsNotEmpty()
    price: number;

    @ApiProperty({ example: 'available', enum: ['available', 'reserved'], required: false })
    @IsEnum(['available', 'reserved'])
    @IsOptional()
    status?: string;

    @ApiProperty({ example: 'A101' })
    @IsString()
    @IsNotEmpty()
    unitCode: string;

    @ApiProperty({ example: 'Apartment 101', required: false })
    @IsString()
    @IsOptional()
    unitName?: string;

    @ApiProperty({ example: 'Building A', required: false })
    @IsString()
    @IsOptional()
    building?: string;

    @ApiProperty({ example: '1st Floor', required: false })
    @IsString()
    @IsOptional()
    floor?: string;

    @ApiProperty({ example: 50, required: false })
    @IsNumber()
    @IsOptional()
    gardenSize?: number;

    @ApiProperty({ example: 30, required: false })
    @IsNumber()
    @IsOptional()
    roofSize?: number;

    @ApiProperty({ example: 300000, required: false })
    @IsNumber()
    @IsOptional()
    downPayment10Percent?: number;

    @ApiProperty({ example: 25000, required: false })
    @IsNumber()
    @IsOptional()
    installment4Years?: number;

    @ApiProperty({ example: 20000, required: false })
    @IsNumber()
    @IsOptional()
    installment5Years?: number;

    @ApiProperty({ example: '/uploads/units/image.jpg', required: false })
    @IsString()
    @IsOptional()
    imageUrl?: string;

    @ApiProperty({ example: 'Stunning sea view apartment', required: false })
    @IsString()
    @IsOptional()
    description?: string;
}
