-- =====================================================
-- AI Broker Interview System - Database Migration
-- =====================================================
-- This migration adds tables for the broker interview process.
-- Run with: docker exec -i real_estate_crm_db psql -U admin -d real_estate_crm < DB/add_broker_interview_tables.sql
-- =====================================================
-- 1. Broker Applications Table
-- Tracks broker applications through the interview process
CREATE TABLE IF NOT EXISTS broker_applications (
    application_id SERIAL PRIMARY KEY,
    applicant_phone VARCHAR(50) UNIQUE NOT NULL,
    applicant_name VARCHAR(255) NOT NULL,
    applicant_email VARCHAR(255),
    password_hash VARCHAR(255) NOT NULL,
    requested_area_ids TEXT,
    -- Comma-separated area IDs
    -- Interview tracking
    status VARCHAR(30) DEFAULT 'pending_interview' CHECK (
        status IN (
            'pending_interview',
            'interview_in_progress',
            'approved',
            'rejected'
        )
    ),
    interview_score FLOAT,
    interview_result VARCHAR(20) CHECK (interview_result IN ('approved', 'rejected')),
    -- Timestamps
    created_at TIMESTAMP DEFAULT NOW(),
    interview_started_at TIMESTAMP,
    interview_completed_at TIMESTAMP,
    -- Converted to user/broker after approval
    converted_user_id INT REFERENCES users(user_id),
    notes TEXT
);
CREATE INDEX IF NOT EXISTS idx_applications_status ON broker_applications(status);
CREATE INDEX IF NOT EXISTS idx_applications_phone ON broker_applications(applicant_phone);
-- 2. Interview Sessions Table
-- Tracks interview state and progress
CREATE TABLE IF NOT EXISTS interview_sessions (
    session_id SERIAL PRIMARY KEY,
    application_id INT REFERENCES broker_applications(application_id) ON DELETE CASCADE,
    -- Session state
    current_phase INT DEFAULT 1,
    -- Phases 1-6
    phase_question_index INT DEFAULT 0,
    -- Current question in phase
    is_complete BOOLEAN DEFAULT FALSE,
    -- Scoring per phase (total = 100)
    phase_1_score FLOAT DEFAULT 0,
    -- Ice-breaking (10 pts)
    phase_2_score FLOAT DEFAULT 0,
    -- Experience (30 pts)
    phase_3_score FLOAT DEFAULT 0,
    -- Terminology (20 pts)
    phase_4_score FLOAT DEFAULT 0,
    -- Scenarios (25 pts)
    phase_5_score FLOAT DEFAULT 0,
    -- Numbers (15 pts)
    phase_6_score FLOAT DEFAULT 0,
    -- Credibility (10 pts)
    -- Red flags detected
    red_flags JSONB DEFAULT '[]',
    -- Total
    total_score FLOAT,
    final_result VARCHAR(20) CHECK (final_result IN ('approved', 'rejected')),
    -- Timestamps
    started_at TIMESTAMP DEFAULT NOW(),
    completed_at TIMESTAMP,
    -- LLM conversation context
    conversation_context JSONB DEFAULT '[]'
);
CREATE INDEX IF NOT EXISTS idx_sessions_application ON interview_sessions(application_id);
-- 3. Interview Responses Table
-- Stores individual Q&A pairs for audit
CREATE TABLE IF NOT EXISTS interview_responses (
    response_id SERIAL PRIMARY KEY,
    session_id INT REFERENCES interview_sessions(session_id) ON DELETE CASCADE,
    phase INT NOT NULL,
    question_key VARCHAR(50),
    -- e.g., 'phase1_q1', 'phase3_random_2'
    question_text TEXT,
    response_text TEXT,
    -- AI evaluation
    score FLOAT,
    evaluation_notes TEXT,
    red_flags_detected JSONB DEFAULT '[]',
    created_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_responses_session ON interview_responses(session_id);
-- =====================================================
-- Success message
-- =====================================================
DO $$ BEGIN RAISE NOTICE 'AI Broker Interview tables created successfully!';
RAISE NOTICE 'Tables: broker_applications, interview_sessions, interview_responses';
END $$;