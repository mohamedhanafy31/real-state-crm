import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    UpdateDateColumn,
    ManyToOne,
    JoinColumn,
    OneToMany,
    PrimaryColumn,
    BeforeInsert,
} from 'typeorm';
import { Customer } from './customer.entity';
import { Broker } from './broker.entity';
import { Area } from './area.entity';
import { RequestStatusHistory } from './request-status-history.entity';
import { Conversation } from './conversation.entity';
import { Reservation } from './reservation.entity';
import { generateId } from '../utils/id-generator';

@Entity('requests')
export class Request {
    @PrimaryColumn({ name: 'request_id', type: 'varchar', length: 21 })
    requestId: string;

    @BeforeInsert()
    generateId() {
        if (!this.requestId) {
            this.requestId = generateId();
        }
    }

    @Column({ name: 'customer_id', type: 'varchar', length: 21 })
    customerId: string;

    @Column({ name: 'assigned_broker_id', type: 'varchar', length: 21, nullable: true })
    assignedBrokerId: string | null;

    @Column({ name: 'area_id', type: 'varchar', length: 21 })
    areaId: string;

    @Column({ type: 'varchar', length: 50 })
    status: string;

    @Column({ type: 'text', nullable: true })
    notes: string;

    @Column({ name: 'unit_type', type: 'varchar', length: 50, nullable: true })
    unitType: string;

    @Column({ name: 'budget_min', type: 'float', nullable: true })
    budgetMin: number;

    @Column({ name: 'budget_max', type: 'float', nullable: true })
    budgetMax: number;

    @Column({ name: 'size_min', type: 'float', nullable: true })
    sizeMin: number;

    @Column({ name: 'size_max', type: 'float', nullable: true })
    sizeMax: number;

    @Column({ name: 'bedrooms', type: 'int', nullable: true })
    bedrooms: number;

    @Column({ name: 'bathrooms', type: 'int', nullable: true })
    bathrooms: number;

    @CreateDateColumn({ name: 'created_at' })
    createdAt: Date;

    @UpdateDateColumn({ name: 'updated_at' })
    updatedAt: Date;

    @ManyToOne(() => Customer, (customer) => customer.requests)
    @JoinColumn({ name: 'customer_id' })
    customer: Customer;

    @ManyToOne(() => Broker, (broker) => broker.requests, { onDelete: 'SET NULL' })
    @JoinColumn({ name: 'assigned_broker_id' })
    assignedBroker: Broker;

    @ManyToOne(() => Area, (area) => area.requests)
    @JoinColumn({ name: 'area_id' })
    area: Area;

    @OneToMany(() => RequestStatusHistory, (history) => history.request)
    statusHistory: RequestStatusHistory[];

    @OneToMany(() => Conversation, (conversation) => conversation.request)
    conversations: Conversation[];

    @OneToMany(() => Reservation, (reservation) => reservation.request)
    reservations: Reservation[];
}
