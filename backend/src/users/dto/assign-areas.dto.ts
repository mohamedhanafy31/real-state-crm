import { IsArray, IsInt, ArrayMinSize } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class AssignAreasDto {
    @ApiProperty({ example: [1, 2, 3], description: 'Array of area IDs' })
    @IsArray()
    @ArrayMinSize(1)
    @IsInt({ each: true })
    areaIds: number[];
}
