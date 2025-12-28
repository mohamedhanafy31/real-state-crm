import { Entity, Column, PrimaryColumn, OneToOne, JoinColumn, OneToMany } from 'typeorm';
import { User } from './user.entity';
import { BrokerArea } from './broker-area.entity';
import { Request } from './request.entity';

@Entity('brokers')
export class Broker {
    @PrimaryColumn({ name: 'broker_id', type: 'varchar', length: 21 })
    brokerId: string;

    @Column({ type: 'float', default: 0, name: 'overall_rate' })
    overallRate: number;

    @Column({ type: 'float', default: 0, name: 'response_speed_score' })
    responseSpeedScore: number;

    @Column({ type: 'float', default: 0, name: 'closing_rate' })
    closingRate: number;

    @Column({ type: 'int', default: 0, name: 'lost_requests_count' })
    lostRequestsCount: number;

    @Column({ type: 'int', default: 0, name: 'withdrawn_requests_count' })
    withdrawnRequestsCount: number;

    @OneToOne(() => User, (user) => user.broker, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'broker_id' })
    user: User;

    @OneToMany(() => BrokerArea, (brokerArea) => brokerArea.broker, { cascade: true })
    brokerAreas: BrokerArea[];

    @OneToMany(() => Request, (request) => request.assignedBroker)
    requests: Request[];
}
