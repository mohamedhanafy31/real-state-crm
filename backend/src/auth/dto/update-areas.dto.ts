import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsInt, ArrayMinSize } from 'class-validator';

export class UpdateAreasDto {
    @ApiProperty({ example: [1, 2, 3], description: 'Array of area IDs' })
    @IsArray()
    @ArrayMinSize(1, { message: 'At least one area must be selected' })
    @IsInt({ each: true })
    areaIds: number[];
}
