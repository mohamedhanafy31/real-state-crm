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
import { Project } from './project.entity';
import { Reservation } from './reservation.entity';
import { generateId } from '../utils/id-generator';

@Entity('units')
export class Unit {
    @PrimaryColumn({ name: 'unit_id', type: 'varchar', length: 21 })
    unitId: string;

    @BeforeInsert()
    generateId() {
        if (!this.unitId) {
            this.unitId = generateId();
        }
    }

    @Column({ name: 'project_id', type: 'varchar', length: 21 })
    projectId: string;

    @Column({ type: 'varchar', length: 50, name: 'unit_type' })
    unitType: string;

    @Column({ type: 'float' })
    size: number;

    @Column({ type: 'float' })
    price: number;

    @Column({ default: 'available' })
    status: string;

    @Column({ type: 'varchar', length: 100, unique: true, name: 'code' })
    unitCode: string;

    @Column({ type: 'varchar', length: 50, name: 'unit_name', nullable: true })
    unitName: string;

    @Column({ type: 'varchar', length: 50, nullable: true })
    building: string;

    @Column({ type: 'varchar', length: 20, nullable: true })
    floor: string;

    @Column({ type: 'float', default: 0, name: 'garden_size' })
    gardenSize: number;

    @Column({ type: 'float', default: 0, name: 'roof_size' })
    roofSize: number;

    @Column({ type: 'float', name: 'down_payment_10_percent', nullable: true })
    downPayment10Percent: number;

    @Column({ type: 'float', name: 'installment_4_years', nullable: true })
    installment4Years: number;

    @Column({ type: 'float', name: 'installment_5_years', nullable: true })
    installment5Years: number;

    @CreateDateColumn({ name: 'created_at' })
    createdAt: Date;

    @Column({ type: 'varchar', length: 500, nullable: true, name: 'image_url' })
    imageUrl: string;

    @Column({ type: 'text', nullable: true })
    description: string;

    @ManyToOne(() => Project, (project) => project.units)
    @JoinColumn({ name: 'project_id' })
    project: Project;

    @OneToMany(() => Reservation, (reservation) => reservation.unit)
    reservations: Reservation[];
}
