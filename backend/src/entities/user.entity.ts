import { Entity, PrimaryColumn, Column, CreateDateColumn, OneToOne, BeforeInsert } from 'typeorm';
import { Broker } from './broker.entity';
import { generateId } from '../utils/id-generator';

@Entity('users')
export class User {
    @PrimaryColumn({ name: 'user_id', type: 'varchar', length: 21 })
    userId: string;

    @BeforeInsert()
    generateId() {
        if (!this.userId) {
            this.userId = generateId();
        }
    }

    @Column({ type: 'varchar', length: 255 })
    name: string;

    @Column({ type: 'varchar', length: 50, unique: true })
    phone: string;

    @Column({ type: 'varchar', length: 255, nullable: true })
    email: string;

    @Column({ type: 'varchar', length: 255, nullable: true, select: false, name: 'password_hash' })
    passwordHash: string;

    @Column({
        type: 'varchar',
        length: 20,
        enum: ['broker', 'supervisor'],
    })
    role: string;

    @Column({ type: 'boolean', default: true, name: 'is_active' })
    isActive: boolean;

    @Column({ type: 'varchar', length: 500, nullable: true, name: 'image_url' })
    imageUrl: string;

    @CreateDateColumn({ name: 'created_at' })
    createdAt: Date;

    @OneToOne(() => Broker, (broker) => broker.user, { cascade: true })
    broker?: Broker;
}
