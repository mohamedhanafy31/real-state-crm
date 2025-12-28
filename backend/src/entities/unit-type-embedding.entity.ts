import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    Index,
} from 'typeorm';

/**
 * Entity for unit_types_embeddings table.
 * Note: The 'embedding' columns are vector(1024) type from pgvector extension.
 * TypeORM doesn't natively support vector types, so they're typed as 'any'.
 * Direct SQL queries should be used for vector operations.
 */
@Entity('unit_types_embeddings')
@Index('idx_unit_types_embeddings_name', ['name'])
export class UnitTypeEmbedding {
    @PrimaryGeneratedColumn({ name: 'unit_type_id' })
    unitTypeId: number;

    @Column({ type: 'varchar', length: 100, unique: true })
    name: string;

    @Column({ type: 'varchar', length: 100, nullable: true, name: 'name_ar' })
    nameAr: string;

    // Vector columns - pgvector type, use raw SQL for vector operations
    @Column({ type: 'simple-array', nullable: true })
    embedding: number[];

    @Column({ type: 'simple-array', nullable: true, name: 'embedding_en' })
    embeddingEn: number[];

    @Column({ type: 'simple-array', nullable: true, name: 'embedding_ar' })
    embeddingAr: number[];

    @CreateDateColumn({ name: 'created_at' })
    createdAt: Date;
}
