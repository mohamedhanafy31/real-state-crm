import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import * as bcrypt from 'bcrypt';
import { BrokerApplication } from '../entities/broker-application.entity';
import { InterviewSession } from '../entities/interview-session.entity';
import { InterviewResponse } from '../entities/interview-response.entity';
import { User } from '../entities/user.entity';
import { Broker } from '../entities/broker.entity';
import { BrokerArea } from '../entities/broker-area.entity';
import { AppLoggerService } from '../logger/logger.service';

@Injectable()
export class ApplicationsService {
    private readonly AI_INTERVIEWER_URL = process.env.AI_INTERVIEWER_URL || 'http://localhost:8004';
    
    constructor(
        @InjectRepository(BrokerApplication)
        private readonly applicationRepository: Repository<BrokerApplication>,
        @InjectRepository(InterviewSession)
        private readonly sessionRepository: Repository<InterviewSession>,
        @InjectRepository(InterviewResponse)
        private readonly responseRepository: Repository<InterviewResponse>,
        @InjectRepository(User)
        private readonly userRepository: Repository<User>,
        @InjectRepository(Broker)
        private readonly brokerRepository: Repository<Broker>,
        @InjectRepository(BrokerArea)
        private readonly brokerAreaRepository: Repository<BrokerArea>,
        private readonly logger: AppLoggerService,
        private readonly httpService: HttpService,
    ) {}

    // ========== Application Creation (called from auth.service) ==========

    async createApplication(data: {
        phone: string;
        name: string;
        email?: string;
        password: string;
        areaIds?: string[];
    }): Promise<BrokerApplication> {
        this.logger.log(`Creating broker application for phone: ${data.phone}`, 'ApplicationsService');

        // Check if application already exists
        const existing = await this.applicationRepository.findOne({
            where: { applicantPhone: data.phone },
        });
        if (existing) {
            throw new BadRequestException('Application with this phone already exists');
        }

        // Hash password
        const passwordHash = await bcrypt.hash(data.password, 10);

        const application = this.applicationRepository.create({
            applicantPhone: data.phone,
            applicantName: data.name,
            applicantEmail: data.email,
            passwordHash,
            requestedAreaIds: data.areaIds || [],
            status: 'pending_interview',
        });

        const saved = await this.applicationRepository.save(application);
        this.logger.log(`Application created: applicationId=${saved.applicationId}`, 'ApplicationsService');

        return saved;
    }

    // ========== Application Status ==========

    async getApplicationStatus(applicationId: string) {
        const application = await this.applicationRepository.findOne({
            where: { applicationId },
        });

        if (!application) {
            throw new NotFoundException(`Application ${applicationId} not found`);
        }

        return {
            applicationId: application.applicationId,
            status: application.status,
            score: application.interviewScore,
            result: application.interviewResult,
            createdAt: application.createdAt,
            interviewStartedAt: application.interviewStartedAt,
            interviewCompletedAt: application.interviewCompletedAt,
        };
    }

    // ========== Supervisor Endpoints ==========

    async listApplications(status?: string) {
        const where: any = {};
        if (status) {
            where.status = status;
        }

        return this.applicationRepository.find({
            where,
            order: { createdAt: 'DESC' },
        });
    }

    async getApplicationDetails(applicationId: string) {
        const application = await this.applicationRepository.findOne({
            where: { applicationId },
            relations: ['interviewSessions', 'interviewSessions.responses'],
        });

        if (!application) {
            throw new NotFoundException(`Application ${applicationId} not found`);
        }

        return application;
    }

    // ========== Interview Session Management ==========

    async startInterview(applicationId: string) {
        const application = await this.applicationRepository.findOne({
            where: { applicationId },
        });

        if (!application) {
            throw new NotFoundException(`Application ${applicationId} not found`);
        }

        // Check if already has an active session
        let session = await this.sessionRepository.findOne({
            where: { applicationId, isComplete: false },
        });

        let initialMessage: string | undefined;

        if (!session) {
            // Create new session
            session = this.sessionRepository.create({
                applicationId,
                currentPhase: 1,
                phaseQuestionIndex: 0,
                conversationContext: [],
            });
            session = await this.sessionRepository.save(session);

            // Update application status
            application.status = 'interview_in_progress';
            application.interviewStartedAt = new Date();
            await this.applicationRepository.save(application);

            this.logger.log(
                `Interview started: applicationId=${applicationId}, sessionId=${session.sessionId}`,
                'ApplicationsService',
            );

            // Call AI service to get initial greeting
            try {
                const aiResponse = await firstValueFrom(
                    this.httpService.post(`${this.AI_INTERVIEWER_URL}/api/interview/start`, {
                        application_id: applicationId,
                    }),
                );

                initialMessage = aiResponse.data.message;

                // Update conversation context with AI's initial message
                session.conversationContext = [
                    { role: 'assistant', content: initialMessage, timestamp: new Date().toISOString() },
                ];
                await this.sessionRepository.save(session);

                this.logger.log(
                    `AI initial greeting sent for sessionId=${session.sessionId}`,
                    'ApplicationsService',
                );
            } catch (error) {
                this.logger.error(
                    `Failed to get AI initial greeting: ${error.message}`,
                    'ApplicationsService',
                );
                // Don't fail the whole request, just log the error
                initialMessage = 'Welcome! Let\'s start your interview. Please tell me about yourself.';
            }
        }

        return {
            sessionId: session.sessionId,
            currentPhase: session.currentPhase,
            phaseQuestionIndex: session.phaseQuestionIndex,
            isComplete: session.isComplete,
            conversationContext: session.conversationContext,
            message: initialMessage,
        };
    }

    async getInterviewSession(sessionId: string) {
        const session = await this.sessionRepository.findOne({
            where: { sessionId },
            relations: ['responses'],
        });

        if (!session) {
            throw new NotFoundException(`Session ${sessionId} not found`);
        }

        return session;
    }

    async submitResponse(sessionId: string, responseText: string) {
        const session = await this.sessionRepository.findOne({
            where: { sessionId },
        });

        if (!session) {
            throw new NotFoundException(`Session ${sessionId} not found`);
        }

        if (session.isComplete) {
            throw new BadRequestException('Interview session is already complete');
        }

        // Save the applicant's response
        const response = this.responseRepository.create({
            sessionId,
            phase: session.currentPhase,
            questionKey: `phase${session.currentPhase}_q${session.phaseQuestionIndex}`,
            responseText,
        });
        await this.responseRepository.save(response);

        // Update conversation context with user message
        session.conversationContext = [
            ...session.conversationContext,
            { role: 'user', content: responseText, timestamp: new Date().toISOString() },
        ];
        await this.sessionRepository.save(session);

        // Call AI interviewer service to process the response
        try {
            const aiResponse = await firstValueFrom(
                this.httpService.post(`${this.AI_INTERVIEWER_URL}/api/interview/respond`, {
                    session_state: {
                        sessionId: session.sessionId,
                        currentPhase: session.currentPhase,
                        phaseQuestionIndex: session.phaseQuestionIndex,
                        conversationContext: session.conversationContext,
                        phase1Score: session.phase1Score,
                        phase2Score: session.phase2Score,
                        phase3Score: session.phase3Score,
                        phase4Score: session.phase4Score,
                        phase5Score: session.phase5Score,
                        phase6Score: session.phase6Score,
                        redFlags: session.redFlags,
                    },
                    response_text: responseText,
                }),
            );

            const aiData = aiResponse.data;

            // Update session with AI's response and updated state
            if (aiData.updated_state) {
                session.currentPhase = aiData.updated_state.currentPhase || session.currentPhase;
                session.phaseQuestionIndex = aiData.updated_state.phaseQuestionIndex || session.phaseQuestionIndex;
                session.conversationContext = aiData.updated_state.conversationContext || session.conversationContext;
                
                // Update phase scores
                if (aiData.updated_state.phase1Score !== undefined) session.phase1Score = aiData.updated_state.phase1Score;
                if (aiData.updated_state.phase2Score !== undefined) session.phase2Score = aiData.updated_state.phase2Score;
                if (aiData.updated_state.phase3Score !== undefined) session.phase3Score = aiData.updated_state.phase3Score;
                if (aiData.updated_state.phase4Score !== undefined) session.phase4Score = aiData.updated_state.phase4Score;
                if (aiData.updated_state.phase5Score !== undefined) session.phase5Score = aiData.updated_state.phase5Score;
                if (aiData.updated_state.phase6Score !== undefined) session.phase6Score = aiData.updated_state.phase6Score;
                
                if (aiData.updated_state.redFlags) session.redFlags = aiData.updated_state.redFlags;
                
                await this.sessionRepository.save(session);
            }

            let finalResult: string | undefined;
            let finalScore: number | undefined;

            // If interview is complete, handle completion
            if (aiData.is_complete) {
                // Calculate total score from phase scores (sum of all phases)
                const calculatedScore = 
                    (session.phase1Score || 0) +
                    (session.phase2Score || 0) +
                    (session.phase3Score || 0) +
                    (session.phase4Score || 0) +
                    (session.phase5Score || 0) +
                    (session.phase6Score || 0);
                
                // Use AI's total score if provided, otherwise use calculated score
                finalScore = aiData.updated_state?.totalScore || calculatedScore;
                
                await this.completeInterview(
                    session.sessionId,
                    finalScore!,
                    aiData.updated_state?.redFlags || [],
                );
                
                // Reload session to get the final result
                const completedSession = await this.sessionRepository.findOne({
                    where: { sessionId: session.sessionId }
                });
                finalResult = completedSession?.finalResult || (finalScore! >= 75 ? 'approved' : 'rejected');
            }

            return {
                sessionId,
                responseId: response.responseId,
                aiMessage: aiData.message,
                currentPhase: session.currentPhase,
                phaseQuestionIndex: session.phaseQuestionIndex,
                isComplete: aiData.is_complete || false,
                finalResult,
                finalScore,
            };
        } catch (error) {
            this.logger.error(`Failed to get AI response: ${error.message}`, 'ApplicationsService');
            throw new BadRequestException(`AI interviewer service unavailable: ${error.message}`);
        }
    }

    async updateSessionProgress(
        sessionId: string,
        updates: {
            currentPhase?: number;
            phaseQuestionIndex?: number;
            phaseScores?: { [key: string]: number };
            redFlags?: string[];
            conversationContext?: any[];
        },
    ) {
        const session = await this.sessionRepository.findOne({
            where: { sessionId },
        });

        if (!session) {
            throw new NotFoundException(`Session ${sessionId} not found`);
        }

        if (updates.currentPhase !== undefined) session.currentPhase = updates.currentPhase;
        if (updates.phaseQuestionIndex !== undefined) session.phaseQuestionIndex = updates.phaseQuestionIndex;
        if (updates.redFlags) session.redFlags = updates.redFlags;
        if (updates.conversationContext) session.conversationContext = updates.conversationContext;

        if (updates.phaseScores) {
            if (updates.phaseScores.phase1 !== undefined) session.phase1Score = updates.phaseScores.phase1;
            if (updates.phaseScores.phase2 !== undefined) session.phase2Score = updates.phaseScores.phase2;
            if (updates.phaseScores.phase3 !== undefined) session.phase3Score = updates.phaseScores.phase3;
            if (updates.phaseScores.phase4 !== undefined) session.phase4Score = updates.phaseScores.phase4;
            if (updates.phaseScores.phase5 !== undefined) session.phase5Score = updates.phaseScores.phase5;
            if (updates.phaseScores.phase6 !== undefined) session.phase6Score = updates.phaseScores.phase6;
        }

        return this.sessionRepository.save(session);
    }

    async completeInterview(sessionId: string, totalScore: number, redFlags: string[]) {
        const session = await this.sessionRepository.findOne({
            where: { sessionId },
        });

        if (!session) {
            throw new NotFoundException(`Session ${sessionId} not found`);
        }

        // Calculate final result: ≥75 approved, <75 rejected
        const adjustedScore = Math.max(0, totalScore - redFlags.length * 2);
        const finalResult = adjustedScore >= 75 ? 'approved' : 'rejected';

        // Update session
        session.isComplete = true;
        session.completedAt = new Date();
        session.totalScore = adjustedScore;
        session.finalResult = finalResult;
        session.redFlags = redFlags;
        await this.sessionRepository.save(session);

        // Update application
        const application = await this.applicationRepository.findOne({
            where: { applicationId: session.applicationId },
        });

        if (application) {
            application.status = finalResult;
            application.interviewScore = adjustedScore;
            application.interviewResult = finalResult;
            application.interviewCompletedAt = new Date();
            await this.applicationRepository.save(application);

            // If approved, create user and broker
            if (finalResult === 'approved') {
                await this.convertToUserAndBroker(application);
            }
        }

        this.logger.log(
            `Interview completed: sessionId=${sessionId}, score=${adjustedScore}, result=${finalResult}`,
            'ApplicationsService',
        );

        return {
            sessionId,
            totalScore: adjustedScore,
            finalResult,
            redFlags,
        };
    }

    // ========== Conversion Logic ==========

    private async convertToUserAndBroker(application: BrokerApplication) {
        this.logger.log(
            `Converting application ${application.applicationId} to user and broker`,
            'ApplicationsService',
        );

        // Get the password hash from the application (need to re-fetch with select)
        const appWithPassword = await this.applicationRepository
            .createQueryBuilder('app')
            .addSelect('app.passwordHash')
            .where('app.applicationId = :id', { id: application.applicationId })
            .getOne();

        if (!appWithPassword) {
            throw new NotFoundException('Application not found');
        }

        // Create user
        const user = this.userRepository.create({
            phone: application.applicantPhone,
            name: application.applicantName,
            email: application.applicantEmail,
            passwordHash: appWithPassword.passwordHash,
            role: 'broker',
            isActive: true,
        });

        const savedUser = await this.userRepository.save(user);

        // Create broker
        const broker = this.brokerRepository.create({
            brokerId: savedUser.userId,
        });
        await this.brokerRepository.save(broker);

        // Create area assignments
        if (application.requestedAreaIds && application.requestedAreaIds.length > 0) {
            const brokerAreas = application.requestedAreaIds.map((areaId) =>
                this.brokerAreaRepository.create({
                    brokerId: savedUser.userId,
                    areaId: areaId,
                }),
            );
            await this.brokerAreaRepository.save(brokerAreas);
        }

        // Update application with converted user ID
        application.convertedUserId = savedUser.userId;
        await this.applicationRepository.save(application);

        this.logger.log(
            `Broker created: userId=${savedUser.userId} from applicationId=${application.applicationId}`,
            'ApplicationsService',
        );

        return savedUser;
    }
}
