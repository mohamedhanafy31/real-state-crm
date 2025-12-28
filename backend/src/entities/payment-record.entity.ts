import {
    Entity,
    PrimaryColumn,
    Column,
    CreateDateColumn,
    ManyToOne,
    JoinColumn,
    BeforeInsert,
} from 'typeorm';
import { Reservation } from './reservation.entity';
import { Broker } from './broker.entity';
import { generateId } from '../utils/id-generator';

@Entity('payment_records')
export class PaymentRecord {
    @PrimaryColumn({ name: 'payment_id', type: 'varchar', length: 21 })
    paymentId: string;

    @BeforeInsert()
    generateId() {
        if (!this.paymentId) {
            this.paymentId = generateId();
        }
    }

    @Column({ name: 'reservation_id', type: 'varchar', length: 21 })
    reservationId: string;

    @Column({ type: 'float', name: 'paid_amount' })
    paidAmount: number;

    @Column({ type: 'date', name: 'payment_date' })
    paymentDate: Date;

    @Column({ type: 'varchar', length: 50, name: 'payment_method' })
    paymentMethod: string;

    @Column({ name: 'recorded_by_broker_id', type: 'varchar', length: 21, nullable: true })
    recordedByBrokerId: string | null;

    @Column({ type: 'text', nullable: true })
    notes: string;

    @CreateDateColumn({ name: 'created_at' })
    createdAt: Date;

    @ManyToOne(() => Reservation, (reservation) => reservation.payments)
    @JoinColumn({ name: 'reservation_id' })
    reservation: Reservation;

    @ManyToOne(() => Broker, { onDelete: 'SET NULL' })
    @JoinColumn({ name: 'recorded_by_broker_id' })
    recordedByBroker: Broker;
}
