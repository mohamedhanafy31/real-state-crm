import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    ManyToOne,
    JoinColumn,
    OneToMany,
} from 'typeorm';
import { Area } from './area.entity';
import { Unit } from './unit.entity';

@Entity('projects')
export class Project {
    @PrimaryGeneratedColumn({ name: 'project_id' })
    projectId: number;

    @Column({ type: 'varchar', length: 255 })
    name: string;

    @Column({ type: 'varchar', length: 255, nullable: true, name: 'name_ar' })
    nameAr: string;

    @Column({ name: 'area_id' })
    areaId: number;

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
