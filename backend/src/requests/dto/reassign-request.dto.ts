import { IsInt, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ReassignRequestDto {
    @ApiProperty({ example: 2 })
    @IsInt()
    @IsNotEmpty()
    brokerId: number;
}
