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
import { Area } from './area.entity';
import { Unit } from './unit.entity';
import { generateId } from '../utils/id-generator';

@Entity('projects')
export class Project {
    @PrimaryColumn({ name: 'project_id', type: 'varchar', length: 21 })
    projectId: string;

    @BeforeInsert()
    generateId() {
        if (!this.projectId) {
            this.projectId = generateId();
        }
    }

    @Column({ type: 'varchar', length: 255 })
    name: string;

    @Column({ type: 'varchar', length: 255, nullable: true, name: 'name_ar' })
    nameAr: string;

    @Column({ name: 'area_id', type: 'varchar', length: 21 })
    areaId: string;

    @Column({ type: 'boolean', default: true, name: 'is_active' })
    isActive: boolean;

    @CreateDateColumn({ name: 'created_at' })
    createdAt: Date;

    @Column({ type: 'varchar', length: 500, nullable: true, name: 'image_url' })
    imageUrl: string;

    @ManyToOne(() => Area, (area) => area.projects)
    @JoinColumn({ name: 'area_id' })
    area: Area;

    @OneToMany(() => Unit, (unit) => unit.project)
    units: Unit[];
}
