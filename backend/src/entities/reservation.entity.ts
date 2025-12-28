import {
    Entity,
    PrimaryColumn,
    Column,
    CreateDateColumn,
    ManyToOne,
    JoinColumn,
    OneToMany,
    BeforeInsert,
} from 'typeorm';
import { Request } from './request.entity';
import { Unit } from './unit.entity';
import { Broker } from './broker.entity';
import { PaymentRecord } from './payment-record.entity';
import { generateId } from '../utils/id-generator';

@Entity('reservations')
export class Reservation {
    @PrimaryColumn({ name: 'reservation_id', type: 'varchar', length: 21 })
    reservationId: string;

    @BeforeInsert()
    generateId() {
        if (!this.reservationId) {
            this.reservationId = generateId();
        }
    }

    @Column({ name: 'request_id', type: 'varchar', length: 21 })
    requestId: string;

    @Column({ name: 'unit_id', type: 'varchar', length: 21 })
    unitId: string;

    @Column({ name: 'broker_id', type: 'varchar', length: 21, nullable: true })
    brokerId: string | null;

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
