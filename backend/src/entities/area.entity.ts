import { Entity, PrimaryGeneratedColumn, Column, OneToMany } from 'typeorm';
import { BrokerArea } from './broker-area.entity';
import { Request } from './request.entity';
import { Project } from './project.entity';

@Entity('areas')
export class Area {
    @PrimaryGeneratedColumn({ name: 'area_id' })
    areaId: number;

    @Column({ type: 'varchar', length: 255 })
    name: string;

    @Column({ type: 'varchar', length: 255, nullable: true, name: 'name_ar' })
    nameAr: string;

    @OneToMany(() => BrokerArea, (brokerArea) => brokerArea.area)
    brokerAreas: BrokerArea[];

    @OneToMany(() => Request, (request) => request.area)
    requests: Request[];

    @OneToMany(() => Project, (project) => project.area)
    projects: Project[];
}
