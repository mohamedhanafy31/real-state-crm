import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    ManyToOne,
    JoinColumn,
    OneToMany,
} from 'typeorm';
import { Request } from './request.entity';
import { Unit } from './unit.entity';
import { Broker } from './broker.entity';
import { PaymentRecord } from './payment-record.entity';

@Entity('reservations')
export class Reservation {
    @PrimaryGeneratedColumn({ name: 'reservation_id' })
    reservationId: number;

    @Column({ name: 'request_id' })
    requestId: number;

    @Column({ name: 'unit_id' })
    unitId: number;

    @Column({ name: 'broker_id', nullable: true })
    brokerId: number | null;

    @Column({ type: 'float', name: 'total_unit_price' })
    totalUnitPrice: number;

    @Column({ type: 'float', name: 'customer_pay_amount' })
    customerPayAmount: number;

    @Column({ type: 'float', name: 'broker_commission_amount' })
    brokerCommissionAmount: number;

    @Column({ type: 'varchar', length: 20, name: 'reservation_status' })
    reservationStatus: string;

    @CreateDateColumn({ name: 'created_at' })
    createdAt: Date;

    @ManyToOne(() => Request, (request) => request.reservations)
    @JoinColumn({ name: 'request_id' })
    request: Request;

    @ManyToOne(() => Unit, (unit) => unit.reservations)
    @JoinColumn({ name: 'unit_id' })
    unit: Unit;

    @ManyToOne(() => Broker, { onDelete: 'SET NULL' })
    @JoinColumn({ name: 'broker_id' })
    broker: Broker;

    @OneToMany(() => PaymentRecord, (payment) => payment.reservation)
    payments: PaymentRecord[];
}
