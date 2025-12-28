import { ApiProperty } from '@nestjs/swagger';
import { IsArray, ArrayMinSize, IsString } from 'class-validator';

export class UpdateAreasDto {
    @ApiProperty({ example: ['area_1', 'area_2'], description: 'Array of area IDs' })
    @IsArray()
    @ArrayMinSize(1, { message: 'At least one area must be selected' })
    @IsString({ each: true })
    areaIds: string[];
}
