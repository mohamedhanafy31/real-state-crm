import {
    Entity,
    PrimaryColumn,
    Column,
    CreateDateColumn,
    ManyToOne,
    JoinColumn,
    BeforeInsert,
} from 'typeorm';
import { InterviewSession } from './interview-session.entity';
import { generateId } from '../utils/id-generator';

@Entity('interview_responses')
export class InterviewResponse {
    @PrimaryColumn({ name: 'response_id', type: 'varchar', length: 21 })
    responseId: string;

    @BeforeInsert()
    generateId() {
        if (!this.responseId) {
            this.responseId = generateId();
        }
    }

    @Column({ name: 'session_id', type: 'varchar', length: 21 })
    sessionId: string;

    @Column({ type: 'int' })
    phase: number;

    @Column({ type: 'varchar', length: 50, nullable: true, name: 'question_key' })
    questionKey: string;

    @Column({ type: 'text', nullable: true, name: 'question_text' })
    questionText: string;

    @Column({ type: 'text', nullable: true, name: 'response_text' })
    responseText: string;

    // AI evaluation
    @Column({ type: 'float', nullable: true })
    score: number;

    @Column({ type: 'text', nullable: true, name: 'evaluation_notes' })
    evaluationNotes: string;

    @Column({ type: 'jsonb', default: '[]', name: 'red_flags_detected' })
    redFlagsDetected: string[];

    @CreateDateColumn({ name: 'created_at' })
    createdAt: Date;

    // Relations
    @ManyToOne(() => InterviewSession, (session) => session.responses)
    @JoinColumn({ name: 'session_id' })
    session: InterviewSession;
}
