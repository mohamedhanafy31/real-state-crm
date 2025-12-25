import { PartialType, ApiProperty } from '@nestjs/swagger';
import { CreateUnitDto } from './create-unit.dto';
import { IsString, IsOptional } from 'class-validator';

export class UpdateUnitDto extends PartialType(CreateUnitDto) {
    @ApiProperty({ example: 'A101', required: false })
    @IsString()
    @IsOptional()
    unitCode?: string;
}
