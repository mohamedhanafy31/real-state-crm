import { Entity, PrimaryColumn, Column, OneToMany, BeforeInsert } from 'typeorm';
import { BrokerArea } from './broker-area.entity';
import { Request } from './request.entity';
import { Project } from './project.entity';
import { generateId } from '../utils/id-generator';

@Entity('areas')
export class Area {
    @PrimaryColumn({ name: 'area_id', type: 'varchar', length: 21 })
    areaId: string;

    @BeforeInsert()
    generateId() {
        if (!this.areaId) {
            this.areaId = generateId();
        }
    }

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
