import { Entity, PrimaryColumn, Column, CreateDateColumn, OneToMany, BeforeInsert } from 'typeorm';
import { Request } from './request.entity';
import { generateId } from '../utils/id-generator';

@Entity('customers')
export class Customer {
    @PrimaryColumn({ name: 'customer_id', type: 'varchar', length: 21 })
    customerId: string;

    @BeforeInsert()
    generateId() {
        if (!this.customerId) {
            this.customerId = generateId();
        }
    }

    @Column({ type: 'varchar', length: 255 })
    name: string;

    @Column({ type: 'varchar', length: 50 })
    phone: string;

    @CreateDateColumn({ name: 'created_at' })
    createdAt: Date;

    @OneToMany(() => Request, (request) => request.customer)
    requests: Request[];
}
