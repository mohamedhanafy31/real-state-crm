import { Entity, PrimaryColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Broker } from './broker.entity';
import { Area } from './area.entity';

@Entity('broker_areas')
export class BrokerArea {
    @PrimaryColumn({ name: 'broker_id', type: 'varchar', length: 21 })
    brokerId: string;

    @PrimaryColumn({ name: 'area_id', type: 'varchar', length: 21 })
    areaId: string;

    @ManyToOne(() => Broker, (broker) => broker.brokerAreas, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'broker_id' })
    broker: Broker;

    @ManyToOne(() => Area, (area) => area.brokerAreas)
    @JoinColumn({ name: 'area_id' })
    area: Area;
}
