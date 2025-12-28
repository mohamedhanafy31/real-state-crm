import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HttpModule } from '@nestjs/axios';
import { ApplicationsController } from './applications.controller';
import { ApplicationsService } from './applications.service';
import { BrokerApplication } from '../entities/broker-application.entity';
import { InterviewSession } from '../entities/interview-session.entity';
import { InterviewResponse } from '../entities/interview-response.entity';
import { User } from '../entities/user.entity';
import { Broker } from '../entities/broker.entity';
import { BrokerArea } from '../entities/broker-area.entity';

@Module({
    imports: [
        TypeOrmModule.forFeature([
            BrokerApplication,
            InterviewSession,
            InterviewResponse,
            User,
            Broker,
            BrokerArea,
        ]),
        HttpModule,
    ],
    controllers: [ApplicationsController],
    providers: [ApplicationsService],
    exports: [ApplicationsService],
})
export class ApplicationsModule {}
