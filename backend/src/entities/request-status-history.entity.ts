import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    ManyToOne,
    JoinColumn,
} from 'typeorm';
import { Request } from './request.entity';

@Entity('request_status_history')
export class RequestStatusHistory {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({ name: 'request_id' })
    requestId: number;

    @Column({ type: 'varchar', length: 50, name: 'old_status', nullable: true })
    oldStatus: string | null;

    @Column({ type: 'varchar', length: 50, name: 'new_status' })
    newStatus: string;

    @Column({ type: 'varchar', length: 20, name: 'changed_by' })
    changedBy: string;

    @Column({ type: 'int', name: 'from_broker_id', nullable: true })
    fromBrokerId: number | null;

    @Column({ type: 'int', name: 'to_broker_id', nullable: true })
    toBrokerId: number | null;

    @Column({ type: 'text', nullable: true })
    notes: string;

    @CreateDateColumn({ name: 'created_at' })
    createdAt: Date;

    @ManyToOne(() => Request, (request) => request.statusHistory)
    @JoinColumn({ name: 'request_id' })
    request: Request;
}
