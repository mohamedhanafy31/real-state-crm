import {
    Entity,
    PrimaryColumn,
    Column,
    CreateDateColumn,
    UpdateDateColumn,
    Index,
} from 'typeorm';

/**
 * Entity for areas_embeddings table.
 * Note: The 'embedding' columns are vector(1024) type from pgvector extension.
 * TypeORM doesn't natively support vector types, so they're typed as 'any'.
 * Direct SQL queries should be used for vector operations.
 */
@Entity('areas_embeddings')
@Index('idx_areas_embeddings_name', ['name'])
export class AreaEmbedding {
    @PrimaryColumn({ name: 'area_id', type: 'int' })
    areaId: number;

    @Column({ type: 'varchar', length: 255 })
    name: string;

    @Column({ type: 'varchar', length: 255, nullable: true, name: 'name_ar' })
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

    @UpdateDateColumn({ name: 'updated_at' })
    updatedAt: Date;
}
