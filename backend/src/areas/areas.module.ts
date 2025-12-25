import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AreasController } from './areas.controller';
import { AreasService } from './areas.service';
import { Area } from '../entities/area.entity';
import { CacheModule } from '../cache/cache.module';

@Module({
    imports: [
        TypeOrmModule.forFeature([Area]),
        forwardRef(() => CacheModule),
    ],
    controllers: [AreasController],
    providers: [AreasService],
    exports: [AreasService],
})
export class AreasModule { }
