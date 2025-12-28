/**
 * Interview API client
 * Handles communication with backend interview endpoints
 */

import { apiClient } from './client';

// Types
export interface ApplicationStatus {
    applicationId: string;
    applicantName: string;
    status: 'pending_interview' | 'interview_in_progress' | 'approved' | 'rejected';
    interviewScore?: number;
    createdAt: string;
}

export interface InterviewSession {
    sessionId: string;
    applicationId: string;
    currentPhase: number;
    phaseQuestionIndex: number;
    isComplete: boolean;
    phase1Score?: number;
    phase2Score?: number;
    phase3Score?: number;
    phase4Score?: number;
    phase5Score?: number;
    phase6Score?: number;
    totalScore?: number;
    redFlags?: string[];
    conversationContext?: ConversationMessage[];
}

export interface ConversationMessage {
    role: 'assistant' | 'user';
    content: string;
    timestamp?: string;
    phase?: number;
    questionKey?: string;
}

export interface StartInterviewResponse {
    sessionId: string;
    currentPhase: number;
    phaseQuestionIndex: number;
    conversationContext: ConversationMessage[];
    message?: string;
}

export interface SubmitResponseResult {
    sessionId: string;
    responseId: string;
    aiMessage?: string;           // Changed from 'message' to match backend
    currentPhase: number;         // Changed from 'phase' to match backend
    phaseQuestionIndex: number;   // Added to match backend
    isComplete: boolean;          // Changed from 'interviewComplete' to match backend
    phase?: number;               // Keep for compatibility
    phaseName?: string;
    phaseComplete?: boolean;
    phaseScore?: number;
    nextPhase?: number;
    interviewComplete?: boolean;  // Keep for compatibility
    finalResult?: 'approved' | 'rejected';
    finalScore?: number;
}

/**
 * Get application status by ID
 */
export async function getApplicationStatus(applicationId: string): Promise<ApplicationStatus> {
    const response = await apiClient.get(`/applications/${applicationId}/status`);
    return response.data;
}

/**
 * Start or resume an interview session
 */
export async function startInterview(applicationId: string): Promise<StartInterviewResponse> {
    const response = await apiClient.post('/chatbot/interview/start', { applicationId });
    return response.data;
}

/**
 * Submit a response to the current question
 */
export async function submitInterviewResponse(
    sessionId: string,
    responseText: string
): Promise<SubmitResponseResult> {
    const response = await apiClient.post('/chatbot/interview/respond', {
        sessionId,
        responseText
    });
    return response.data;
}

/**
 * Get current interview session state
 */
export async function getInterviewSession(sessionId: string): Promise<InterviewSession> {
    const response = await apiClient.get(`/chatbot/interview/${sessionId}`);
    return response.data;
}

/**
 * Phase information for display
 */
export const PHASE_INFO: Record<number, { name: string; nameAr: string }> = {
    1: { name: 'Ice-Breaking & Identity', nameAr: 'التعارف والمعلومات الأساسية' },
    2: { name: 'Real-World Experience', nameAr: 'خبرة العمل الفعلية' },
    3: { name: 'Professional Terminology', nameAr: 'المصطلحات المهنية' },
    4: { name: 'Scenario-Based Decision Making', nameAr: 'سيناريوهات واتخاذ القرار' },
    5: { name: 'Numbers & Financial Awareness', nameAr: 'الأرقام والوعي المالي' },
    6: { name: 'Credibility & Self-Awareness', nameAr: 'المصداقية والوعي الذاتي' }
};
