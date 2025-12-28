import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    Index,
} from 'typeorm';

/**
 * Entity for conversation_embeddings table.
 * Note: The 'embedding' column is vector(1024) type from pgvector extension.
 * TypeORM doesn't natively support vector types, so it's typed as 'any'.
 * Direct SQL queries should be used for vector operations.
 */
@Entity('conversation_embeddings')
@Index('idx_conversation_embeddings_phone', ['phoneNumber'])
export class ConversationEmbedding {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({ type: 'varchar', length: 50, name: 'phone_number' })
    phoneNumber: string;

    @Column({ type: 'varchar', length: 20, name: 'message_type' })
    messageType: string;

    @Column({ type: 'text', name: 'message_text' })
    messageText: string;

    // Vector column - pgvector type, use raw SQL for vector operations
    @Column({ type: 'simple-array', nullable: true })
    embedding: number[];

    @Column({ type: 'jsonb', default: '{}' })
    metadata: Record<string, any>;

    @CreateDateColumn({ name: 'created_at' })
    createdAt: Date;
}
