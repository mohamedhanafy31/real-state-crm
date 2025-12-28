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

@Entity('request_status_history')
export class RequestStatusHistory {
    @PrimaryColumn({ type: 'varchar', length: 21 })
    id: string;

    @BeforeInsert()
    generateId() {
        if (!this.id) {
            this.id = generateId();
        }
    }

    @Column({ name: 'request_id', type: 'varchar', length: 21 })
    requestId: string;

    @Column({ type: 'varchar', length: 50, name: 'old_status', nullable: true })
    oldStatus: string | null;

    @Column({ type: 'varchar', length: 50, name: 'new_status' })
    newStatus: string;

    @Column({ type: 'varchar', length: 20, name: 'changed_by' })
    changedBy: string;

    @Column({ type: 'varchar', length: 21, name: 'from_broker_id', nullable: true })
    fromBrokerId: string | null;

    @Column({ type: 'varchar', length: 21, name: 'to_broker_id', nullable: true })
    toBrokerId: string | null;

    @Column({ type: 'text', nullable: true })
    notes: string;

    @CreateDateColumn({ name: 'created_at' })
    createdAt: Date;

    @ManyToOne(() => Request, (request) => request.statusHistory)
    @JoinColumn({ name: 'request_id' })
    request: Request;
}
