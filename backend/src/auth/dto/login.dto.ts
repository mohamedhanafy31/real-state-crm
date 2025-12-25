import { IsString, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class LoginDto {
    @ApiProperty({ example: '01012345678' })
    @IsString()
    @IsNotEmpty()
    phone: string;

    @ApiProperty({ example: 'SecurePassword123' })
    @IsString()
    @IsNotEmpty()
    password: string;
}
