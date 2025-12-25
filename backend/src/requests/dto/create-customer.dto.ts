import { IsString, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateCustomerDto {
    @ApiProperty({ example: 'Ahmed Ali' })
    @IsString()
    @IsNotEmpty()
    name: string;

    @ApiProperty({ example: '01023456789' })
    @IsString()
    @IsNotEmpty()
    phone: string;
}
