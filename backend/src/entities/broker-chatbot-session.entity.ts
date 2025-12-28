import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    UpdateDateColumn,
    ManyToOne,
    JoinColumn,
    Index,
    Unique,
} from 'typeorm';
import { Broker } from './broker.entity';
import { Request } from './request.entity';

@Entity('broker_chatbot_sessions')
@Unique(['brokerId', 'requestId'])
@Index('idx_broker_chatbot_sessions_broker', ['brokerId'])
@Index('idx_broker_chatbot_sessions_request', ['requestId'])
export class BrokerChatbotSession {
    @PrimaryGeneratedColumn({ name: 'session_id' })
    sessionId: number;

    @Column({ type: 'varchar', length: 21, name: 'broker_id' })
    brokerId: string;

    @Column({ type: 'varchar', length: 21, name: 'request_id' })
    requestId: string;

    @Column({ type: 'jsonb', nullable: true, name: 'session_state' })
    sessionState: Record<string, any>;

    @Column({ type: 'jsonb', nullable: true, name: 'last_analysis' })
    lastAnalysis: Record<string, any>;

    @Column({ type: 'jsonb', nullable: true, name: 'last_strategy' })
    lastStrategy: Record<string, any>;

    @CreateDateColumn({ name: 'created_at' })
    createdAt: Date;

    @UpdateDateColumn({ name: 'updated_at' })
    updatedAt: Date;

    @ManyToOne(() => Broker, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'broker_id' })
    broker: Broker;

    @ManyToOne(() => Request, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'request_id' })
    request: Request;
}
