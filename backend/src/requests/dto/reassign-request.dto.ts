import { IsInt, IsNotEmpty, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ReassignRequestDto {
    @ApiProperty({ example: 'broker-123' })
    @IsString()
    @IsNotEmpty()
    brokerId: string;
}
