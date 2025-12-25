import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    ManyToOne,
    JoinColumn,
} from 'typeorm';
import { Reservation } from './reservation.entity';
import { Broker } from './broker.entity';

@Entity('payment_records')
export class PaymentRecord {
    @PrimaryGeneratedColumn({ name: 'payment_id' })
    paymentId: number;

    @Column({ name: 'reservation_id' })
    reservationId: number;

    @Column({ type: 'float', name: 'paid_amount' })
    paidAmount: number;

    @Column({ type: 'date', name: 'payment_date' })
    paymentDate: Date;

    @Column({ type: 'varchar', length: 50, name: 'payment_method' })
    paymentMethod: string;

    @Column({ name: 'recorded_by_broker_id', nullable: true })
    recordedByBrokerId: number | null;

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
