import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RequestsController } from './requests.controller';
import { RequestsService } from './requests.service';
import { Customer } from '../entities/customer.entity';
import { Request } from '../entities/request.entity';
import { RequestStatusHistory } from '../entities/request-status-history.entity';
import { BrokerArea } from '../entities/broker-area.entity';
import { Conversation } from '../entities/conversation.entity';

import { AuthModule } from '../auth/auth.module';

@Module({
    imports: [TypeOrmModule.forFeature([Customer, Request, RequestStatusHistory, BrokerArea, Conversation]), AuthModule],
    controllers: [RequestsController],
    providers: [RequestsService],
    exports: [RequestsService],
})
export class RequestsModule { }
