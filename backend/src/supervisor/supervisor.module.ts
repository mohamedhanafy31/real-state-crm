import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SupervisorController } from './supervisor.controller';
import { SupervisorService } from './supervisor.service';
import { User } from '../entities/user.entity';
import { Request } from '../entities/request.entity';
import { Project } from '../entities/project.entity';
import { Unit } from '../entities/unit.entity';
import { Area } from '../entities/area.entity';
import { Broker } from '../entities/broker.entity';
import { RequestStatusHistory } from '../entities/request-status-history.entity';
import { CacheModule } from '../cache/cache.module';

@Module({
    imports: [
        TypeOrmModule.forFeature([User, Request, Project, Unit, Area, Broker, RequestStatusHistory]),
        CacheModule,
    ],
    controllers: [SupervisorController],
    providers: [SupervisorService],
    exports: [SupervisorService],
})
export class SupervisorModule { }
