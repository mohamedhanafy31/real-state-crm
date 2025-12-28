import { IsNotEmpty, IsNumber, IsString, IsOptional, IsArray } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateApplicationDto {
    @ApiProperty({ description: 'Phone number' })
    @IsNotEmpty()
    @IsString()
    phone: string;

    @ApiProperty({ description: 'Full name' })
    @IsNotEmpty()
    @IsString()
    name: string;

    @ApiPropertyOptional({ description: 'Email address' })
    @IsOptional()
    @IsString()
    email?: string;

    @ApiProperty({ description: 'Password' })
    @IsNotEmpty()
    @IsString()
    password: string;

    @ApiPropertyOptional({ description: 'Requested area IDs', type: [String] })
    @IsOptional()
    @IsArray()
    @IsString({ each: true })
    areaIds?: string[];
}
