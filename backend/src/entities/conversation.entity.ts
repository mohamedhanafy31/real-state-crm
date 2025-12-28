import {
    Entity,
    PrimaryColumn,
    Column,
    CreateDateColumn,
    ManyToOne,
    JoinColumn,
    BeforeInsert,
} from 'typeorm';
import { Request } from './request.entity';
import { generateId } from '../utils/id-generator';

@Entity('conversations')
export class Conversation {
    @PrimaryColumn({ name: 'conversation_id', type: 'varchar', length: 21 })
    conversationId: string;

    @BeforeInsert()
    generateId() {
        if (!this.conversationId) {
            this.conversationId = generateId();
        }
    }

    @Column({ name: 'related_request_id', type: 'varchar', length: 21, nullable: true })
    relatedRequestId: string;

    @Column({
        type: 'varchar',
        length: 20,
        name: 'actor_type',
        enum: ['customer', 'broker', 'ai'],
    })
    actorType: string;

    @Column({ name: 'actor_id', type: 'varchar', length: 21 })
    actorId: string;

    @Column({ type: 'text' })
    message: string;

    @Column({
        type: 'varchar',
        length: 20,
        name: 'context_type',
        default: 'customer',
    })
    contextType: string;

    @CreateDateColumn({ name: 'created_at' })
    createdAt: Date;

    @ManyToOne(() => Request, (request) => request.conversations, { nullable: true })
    @JoinColumn({ name: 'related_request_id' })
    request: Request;
}
