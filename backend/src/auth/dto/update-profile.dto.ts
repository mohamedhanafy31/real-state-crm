import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsEmail, IsOptional, Matches } from 'class-validator';

export class UpdateProfileDto {
    @ApiProperty({ example: 'Ahmed Ali', required: false })
    @IsString()
    @IsOptional()
    name?: string;

    @ApiProperty({ example: 'ahmed.ali@example.com', required: false })
    @IsEmail()
    @IsOptional()
    email?: string;

    @ApiProperty({ example: '01012345678', required: false })
    @IsString()
    @Matches(/^01[0-9]{9}$/, { message: 'Phone must be a valid Egyptian number (11 digits starting with 01)' })
    @IsOptional()
    phone?: string;
}
