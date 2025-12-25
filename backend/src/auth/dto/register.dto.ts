import { IsString, IsNotEmpty, IsEmail, IsOptional, IsEnum, MinLength, Matches, IsArray, IsInt } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RegisterDto {
    @ApiProperty({ example: '01012345678' })
    @IsString()
    @Matches(/^01[0-9]{9}$/, { message: 'Phone must be a valid Egyptian number (11 digits starting with 01)' })
    @IsNotEmpty()
    phone: string;

    @ApiProperty({ example: 'SecurePassword123' })
    @IsString()
    @MinLength(6, { message: 'Password must be at least 6 characters' })
    @IsNotEmpty()
    password: string;

    @ApiProperty({ example: 'Ahmed Ali' })
    @IsString()
    @MinLength(1, { message: 'Name cannot be empty' })
    @IsNotEmpty()
    name: string;

    @ApiProperty({ example: 'ahmed.ali@example.com', required: false })
    @IsEmail()
    @IsOptional()
    email?: string;

    @ApiProperty({ example: 'broker', enum: ['broker', 'supervisor'] })
    @IsEnum(['broker', 'supervisor'])
    @IsNotEmpty()
    role: string;

    @ApiProperty({ example: [1, 2], description: 'Area IDs for broker registration', required: false })
    @IsArray()
    @IsInt({ each: true })
    @IsOptional()
    areaIds?: number[];
}

