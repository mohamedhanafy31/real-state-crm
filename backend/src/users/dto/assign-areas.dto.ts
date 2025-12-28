import { IsArray, ArrayMinSize, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class AssignAreasDto {
    @ApiProperty({ example: ['area_1', 'area_2'], description: 'Array of area IDs' })
    @IsArray()
    @ArrayMinSize(1)
    @IsString({ each: true })
    areaIds: string[];
}
