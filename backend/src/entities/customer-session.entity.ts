import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    UpdateDateColumn,
    Index,
} from 'typeorm';

@Entity('customer_sessions')
@Index('idx_customer_sessions_phone', ['phoneNumber'])
@Index('idx_customer_sessions_complete', ['isComplete'])
export class CustomerSession {
    @PrimaryGeneratedColumn({ name: 'session_id' })
    sessionId: number;

    @Column({ type: 'varchar', length: 50, unique: true, name: 'phone_number' })
    phoneNumber: string;

    @Column({ type: 'jsonb', default: '{}', name: 'extracted_requirements' })
    extractedRequirements: Record<string, any>;

    @Column({ type: 'varchar', length: 50, nullable: true, name: 'last_intent' })
    lastIntent: string;

    @Column({ type: 'boolean', default: false, name: 'is_complete' })
    isComplete: boolean;

    @Column({ type: 'boolean', default: false })
    confirmed: boolean;

    @Column({ type: 'boolean', default: false, name: 'awaiting_confirmation' })
    awaitingConfirmation: boolean;

    @Column({ type: 'int', default: 0, name: 'confirmation_attempt' })
    confirmationAttempt: number;

    @CreateDateColumn({ name: 'created_at' })
    createdAt: Date;

    @UpdateDateColumn({ name: 'updated_at' })
    updatedAt: Date;
}
