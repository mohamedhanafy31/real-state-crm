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
import { BrokerApplication } from './broker-application.entity';
import { InterviewResponse } from './interview-response.entity';
import { generateId } from '../utils/id-generator';

@Entity('interview_sessions')
export class InterviewSession {
    @PrimaryColumn({ name: 'session_id', type: 'varchar', length: 21 })
    sessionId: string;

    @BeforeInsert()
    generateId() {
        if (!this.sessionId) {
            this.sessionId = generateId();
        }
    }

    @Column({ name: 'application_id', type: 'varchar', length: 21 })
    applicationId: string;

    // Session state
    @Column({ type: 'int', default: 1, name: 'current_phase' })
    currentPhase: number;

    @Column({ type: 'int', default: 0, name: 'phase_question_index' })
    phaseQuestionIndex: number;

    @Column({ type: 'boolean', default: false, name: 'is_complete' })
    isComplete: boolean;

    // Scoring per phase (total = 100)
    @Column({ type: 'float', default: 0, name: 'phase_1_score' })
    phase1Score: number; // Ice-breaking (10 pts)

    @Column({ type: 'float', default: 0, name: 'phase_2_score' })
    phase2Score: number; // Experience (30 pts)

    @Column({ type: 'float', default: 0, name: 'phase_3_score' })
    phase3Score: number; // Terminology (20 pts)

    @Column({ type: 'float', default: 0, name: 'phase_4_score' })
    phase4Score: number; // Scenarios (25 pts)

    @Column({ type: 'float', default: 0, name: 'phase_5_score' })
    phase5Score: number; // Numbers (15 pts)

    @Column({ type: 'float', default: 0, name: 'phase_6_score' })
    phase6Score: number; // Credibility (10 pts)

    // Red flags detected
    @Column({ type: 'jsonb', default: '[]', name: 'red_flags' })
    redFlags: string[];

    // Total score
    @Column({ type: 'float', nullable: true, name: 'total_score' })
    totalScore: number;

    @Column({ type: 'varchar', length: 20, nullable: true, name: 'final_result' })
    finalResult: 'approved' | 'rejected';

    // Timestamps
    @CreateDateColumn({ name: 'started_at' })
    startedAt: Date;

    @Column({ type: 'timestamp', nullable: true, name: 'completed_at' })
    completedAt: Date;

    // LLM conversation context for continuity
    @Column({ type: 'jsonb', default: '[]', name: 'conversation_context' })
    conversationContext: any[];

    // Relations
    @ManyToOne(() => BrokerApplication, (app) => app.interviewSessions)
    @JoinColumn({ name: 'application_id' })
    application: BrokerApplication;

    @OneToMany(() => InterviewResponse, (response) => response.session)
    responses: InterviewResponse[];
}
