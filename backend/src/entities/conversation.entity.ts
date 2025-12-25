import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    ManyToOne,
    JoinColumn,
} from 'typeorm';
import { Request } from './request.entity';

@Entity('conversations')
export class Conversation {
    @PrimaryGeneratedColumn({ name: 'conversation_id' })
    conversationId: number;

    @Column({ name: 'related_request_id' })
    relatedRequestId: number;

    @Column({
        type: 'varchar',
        length: 20,
        name: 'actor_type',
        enum: ['customer', 'broker', 'ai'],
    })
    actorType: string;

    @Column({ name: 'actor_id' })
    actorId: number;

    @Column({ type: 'text' })
    message: string;

    @CreateDateColumn({ name: 'created_at' })
    createdAt: Date;

    @ManyToOne(() => Request, (request) => request.conversations)
    @JoinColumn({ name: 'related_request_id' })
    request: Request;
}
