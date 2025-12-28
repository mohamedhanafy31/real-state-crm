import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { User } from '../entities/user.entity';
import { Broker } from '../entities/broker.entity';
import { Area } from '../entities/area.entity';
import { BrokerArea } from '../entities/broker-area.entity';
import { Customer } from '../entities/customer.entity';
import { Request } from '../entities/request.entity';
import { RequestStatusHistory } from '../entities/request-status-history.entity';
import { Project } from '../entities/project.entity';
import { Unit } from '../entities/unit.entity';
import { Reservation } from '../entities/reservation.entity';
import { PaymentRecord } from '../entities/payment-record.entity';
import { Conversation } from '../entities/conversation.entity';
import { BrokerApplication } from '../entities/broker-application.entity';
import { InterviewSession } from '../entities/interview-session.entity';
import { InterviewResponse } from '../entities/interview-response.entity';

export const typeOrmConfig = (): TypeOrmModuleOptions => ({
    type: 'postgres',
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5433', 10),
    username: process.env.DB_USERNAME || 'admin',
    password: process.env.DB_PASSWORD || 'password',
    database: process.env.DB_DATABASE || 'real_estate_crm',
    entities: [
        User,
        Broker,
        Area,
        BrokerArea,
        Customer,
        Request,
        RequestStatusHistory,
        Project,
        Unit,
        Reservation,
        PaymentRecord,
        Conversation,
        BrokerApplication,
        InterviewSession,
        InterviewResponse,
    ],
    synchronize: process.env.NODE_ENV === 'development', // Auto-sync in dev mode only
    logging: process.env.NODE_ENV === 'development',
});
