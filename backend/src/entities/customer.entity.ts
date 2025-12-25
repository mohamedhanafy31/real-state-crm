import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, OneToMany } from 'typeorm';
import { Request } from './request.entity';

@Entity('customers')
export class Customer {
    @PrimaryGeneratedColumn({ name: 'customer_id' })
    customerId: number;

    @Column({ type: 'varchar', length: 255 })
    name: string;

    @Column({ type: 'varchar', length: 50 })
    phone: string;

    @CreateDateColumn({ name: 'created_at' })
    createdAt: Date;

    @OneToMany(() => Request, (request) => request.customer)
    requests: Request[];
}
