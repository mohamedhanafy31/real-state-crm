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
import { User } from './user.entity';
import { InterviewSession } from './interview-session.entity';
import { generateId } from '../utils/id-generator';

@Entity('broker_applications')
export class BrokerApplication {
    @PrimaryColumn({ name: 'application_id', type: 'varchar', length: 21 })
    applicationId: string;

    @BeforeInsert()
    generateId() {
        if (!this.applicationId) {
            this.applicationId = generateId();
        }
    }

    @Column({ type: 'varchar', length: 50, unique: true, name: 'applicant_phone' })
    applicantPhone: string;

    @Column({ type: 'varchar', length: 255, name: 'applicant_name' })
    applicantName: string;

    @Column({ type: 'varchar', length: 255, nullable: true, name: 'applicant_email' })
    applicantEmail: string;

    @Column({ type: 'varchar', length: 255, name: 'password_hash', select: false })
    passwordHash: string;

    @Column({ type: 'simple-array', nullable: true, name: 'requested_area_ids' })
    requestedAreaIds: string[];

    @Column({
        type: 'varchar',
        length: 30,
        default: 'pending_interview',
    })
    status: 'pending_interview' | 'interview_in_progress' | 'approved' | 'rejected';

    @Column({ type: 'float', nullable: true, name: 'interview_score' })
    interviewScore: number;

    @Column({ type: 'varchar', length: 20, nullable: true, name: 'interview_result' })
    interviewResult: 'approved' | 'rejected';

    @CreateDateColumn({ name: 'created_at' })
    createdAt: Date;

    @Column({ type: 'timestamp', nullable: true, name: 'interview_started_at' })
    interviewStartedAt: Date;

    @Column({ type: 'timestamp', nullable: true, name: 'interview_completed_at' })
    interviewCompletedAt: Date;

    @Column({ type: 'text', nullable: true })
    notes: string;

    // Converted to user/broker after approval
    @Column({ nullable: true, name: 'converted_user_id', type: 'varchar', length: 21 })
    convertedUserId: string;

    @ManyToOne(() => User, { nullable: true })
    @JoinColumn({ name: 'converted_user_id' })
    convertedUser: User;

    @OneToMany(() => InterviewSession, (session) => session.application)
    interviewSessions: InterviewSession[];
}
