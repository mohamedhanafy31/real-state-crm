-- ============================================================================
-- Real Estate CRM - Final Database Schema
-- Generated from live database on 2025-12-28
-- PostgreSQL with pgvector extension
-- ============================================================================
-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS vector;
-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================
-- Function: Update timestamp on broker chatbot session update
CREATE OR REPLACE FUNCTION update_broker_session_timestamp() RETURNS TRIGGER AS $$ BEGIN NEW.updated_at = NOW();
RETURN NEW;
END;
$$ LANGUAGE plpgsql;
-- Function: Update embedding timestamp
CREATE OR REPLACE FUNCTION update_embedding_timestamp() RETURNS TRIGGER AS $$ BEGIN NEW.updated_at = CURRENT_TIMESTAMP;
RETURN NEW;
END;
$$ LANGUAGE plpgsql;
-- ============================================================================
-- CORE BUSINESS TABLES
-- ============================================================================
-- Users table (brokers and supervisors)
CREATE TABLE users (
    user_id VARCHAR(21) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    phone VARCHAR(50) NOT NULL UNIQUE,
    email VARCHAR(255),
    role VARCHAR(20) NOT NULL CHECK (role IN ('broker', 'supervisor')),
    password_hash VARCHAR(255),
    image_url VARCHAR(500),
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);
-- Brokers table (extends users with broker-specific metrics)
CREATE TABLE brokers (
    broker_id VARCHAR(21) PRIMARY KEY REFERENCES users(user_id) ON DELETE CASCADE,
    overall_rate DOUBLE PRECISION NOT NULL DEFAULT 0,
    response_speed_score DOUBLE PRECISION NOT NULL DEFAULT 0,
    closing_rate DOUBLE PRECISION NOT NULL DEFAULT 0,
    lost_requests_count INTEGER NOT NULL DEFAULT 0,
    withdrawn_requests_count INTEGER NOT NULL DEFAULT 0
);
-- Customers table
CREATE TABLE customers (
    customer_id VARCHAR(21) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    phone VARCHAR(50) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);
-- ============================================================================
-- GEOGRAPHY TABLES
-- ============================================================================
-- Areas table (with Arabic name support)
CREATE TABLE areas (
    area_id VARCHAR(21) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    name_ar VARCHAR(255)
);
-- Broker-Area assignments (many-to-many)
CREATE TABLE broker_areas (
    broker_id VARCHAR(21) NOT NULL REFERENCES brokers(broker_id) ON DELETE CASCADE,
    area_id VARCHAR(21) NOT NULL REFERENCES areas(area_id),
    PRIMARY KEY (broker_id, area_id)
);
-- ============================================================================
-- PROPERTY TABLES
-- ============================================================================
-- Projects table
CREATE TABLE projects (
    project_id VARCHAR(21) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    area_id VARCHAR(21) REFERENCES areas(area_id),
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);
-- Units table (real estate units within projects)
CREATE TABLE units (
    unit_id VARCHAR(21) PRIMARY KEY,
    project_id VARCHAR(21) NOT NULL REFERENCES projects(project_id),
    code VARCHAR(100) NOT NULL UNIQUE,
    unit_name VARCHAR(50),
    unit_type VARCHAR(50) NOT NULL,
    building VARCHAR(50),
    floor VARCHAR(20),
    size DOUBLE PRECISION NOT NULL,
    price DOUBLE PRECISION NOT NULL,
    garden_size DOUBLE PRECISION NOT NULL DEFAULT 0,
    roof_size DOUBLE PRECISION NOT NULL DEFAULT 0,
    down_payment_10_percent DOUBLE PRECISION,
    installment_4_years DOUBLE PRECISION,
    installment_5_years DOUBLE PRECISION,
    status VARCHAR(20) NOT NULL DEFAULT 'available' CHECK (status IN ('available', 'reserved')),
    image_url VARCHAR(500),
    description TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);
-- ============================================================================
-- SALES PIPELINE TABLES
-- ============================================================================
-- Requests table (customer inquiries and leads)
CREATE TABLE requests (
    request_id VARCHAR(21) PRIMARY KEY,
    customer_id VARCHAR(21) NOT NULL REFERENCES customers(customer_id),
    assigned_broker_id VARCHAR(21) REFERENCES brokers(broker_id) ON DELETE
    SET NULL,
        area_id VARCHAR(21) NOT NULL REFERENCES areas(area_id),
        status VARCHAR(50) NOT NULL CHECK (
            status IN (
                'new',
                'contacted',
                'reserved',
                'paid',
                'lost',
                'reassigned'
            )
        ),
        unit_type VARCHAR(50),
        budget_min DOUBLE PRECISION,
        budget_max DOUBLE PRECISION,
        size_min DOUBLE PRECISION,
        size_max DOUBLE PRECISION,
        bedrooms INTEGER,
        bathrooms INTEGER,
        notes TEXT,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);
-- Request status history (audit trail)
CREATE TABLE request_status_history (
    id VARCHAR(21) PRIMARY KEY,
    request_id VARCHAR(21) NOT NULL REFERENCES requests(request_id),
    old_status VARCHAR(50),
    new_status VARCHAR(50) NOT NULL,
    changed_by VARCHAR(20) NOT NULL,
    from_broker_id VARCHAR(21),
    to_broker_id VARCHAR(21),
    notes TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);
-- Reservations table (when customer reserves a unit)
CREATE TABLE reservations (
    reservation_id VARCHAR(21) PRIMARY KEY,
    request_id VARCHAR(21) NOT NULL REFERENCES requests(request_id),
    unit_id VARCHAR(21) NOT NULL REFERENCES units(unit_id),
    broker_id VARCHAR(21) REFERENCES brokers(broker_id) ON DELETE
    SET NULL,
        total_unit_price DOUBLE PRECISION NOT NULL,
        customer_pay_amount DOUBLE PRECISION NOT NULL,
        broker_commission_amount DOUBLE PRECISION NOT NULL,
        reservation_status VARCHAR(20) NOT NULL,
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
);
-- Payment records table
CREATE TABLE payment_records (
    payment_id VARCHAR(21) PRIMARY KEY,
    reservation_id VARCHAR(21) NOT NULL REFERENCES reservations(reservation_id),
    recorded_by_broker_id VARCHAR(21) REFERENCES brokers(broker_id) ON DELETE
    SET NULL,
        paid_amount DOUBLE PRECISION NOT NULL,
        payment_date DATE NOT NULL,
        payment_method VARCHAR(50) NOT NULL,
        notes TEXT,
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
);
-- ============================================================================
-- COMMUNICATION TABLES
-- ============================================================================
-- Conversations table (chat history between customers, brokers, and AI)
CREATE TABLE conversations (
    conversation_id VARCHAR(21) PRIMARY KEY,
    related_request_id VARCHAR(21) REFERENCES requests(request_id),
    actor_type VARCHAR(20) NOT NULL CHECK (actor_type IN ('customer', 'broker', 'ai')),
    actor_id VARCHAR(21) NOT NULL,
    context_type VARCHAR(20) NOT NULL DEFAULT 'customer' CHECK (context_type IN ('customer', 'broker')),
    message TEXT NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);
-- ============================================================================
-- AI/ML SESSION TABLES
-- ============================================================================
-- Customer sessions (WhatsApp chatbot state)
CREATE TABLE customer_sessions (
    session_id SERIAL PRIMARY KEY,
    phone_number VARCHAR(50) NOT NULL UNIQUE,
    extracted_requirements JSONB DEFAULT '{}'::jsonb,
    last_intent VARCHAR(50),
    is_complete BOOLEAN DEFAULT false,
    confirmed BOOLEAN DEFAULT false,
    awaiting_confirmation BOOLEAN DEFAULT false,
    confirmation_attempt INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
-- Broker chatbot sessions (AI assistant state for brokers)
CREATE TABLE broker_chatbot_sessions (
    session_id SERIAL PRIMARY KEY,
    broker_id VARCHAR(21) REFERENCES brokers(broker_id) ON DELETE CASCADE,
    request_id VARCHAR(21) REFERENCES requests(request_id) ON DELETE CASCADE,
    session_state JSONB,
    -- LangGraph conversation state JSON
    last_analysis JSONB,
    -- Cached client personality analysis
    last_strategy JSONB,
    -- Cached strategy recommendations
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE (broker_id, request_id)
);
-- ============================================================================
-- BROKER APPLICATION & INTERVIEW TABLES
-- ============================================================================
-- Broker applications (new broker signup requests)
CREATE TABLE broker_applications (
    application_id VARCHAR(21) PRIMARY KEY,
    applicant_phone VARCHAR(50) NOT NULL UNIQUE,
    applicant_name VARCHAR(255) NOT NULL,
    applicant_email VARCHAR(255),
    password_hash VARCHAR(255) NOT NULL,
    requested_area_ids TEXT,
    -- Comma-separated area IDs
    status VARCHAR(30) NOT NULL DEFAULT 'pending_interview' CHECK (
        status IN (
            'pending_interview',
            'interview_in_progress',
            'passed',
            'failed',
            'approved',
            'rejected'
        )
    ),
    interview_score DOUBLE PRECISION,
    interview_result VARCHAR(20),
    notes TEXT,
    converted_user_id VARCHAR(21) REFERENCES users(user_id),
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    interview_started_at TIMESTAMP,
    interview_completed_at TIMESTAMP
);
-- Interview sessions (AI-powered broker interviews)
CREATE TABLE interview_sessions (
    session_id VARCHAR(21) PRIMARY KEY,
    application_id VARCHAR(21) NOT NULL REFERENCES broker_applications(application_id),
    current_phase INTEGER NOT NULL DEFAULT 1,
    phase_question_index INTEGER NOT NULL DEFAULT 0,
    is_complete BOOLEAN NOT NULL DEFAULT false,
    -- Phase scores (6 phases)
    phase_1_score DOUBLE PRECISION NOT NULL DEFAULT 0,
    phase_2_score DOUBLE PRECISION NOT NULL DEFAULT 0,
    phase_3_score DOUBLE PRECISION NOT NULL DEFAULT 0,
    phase_4_score DOUBLE PRECISION NOT NULL DEFAULT 0,
    phase_5_score DOUBLE PRECISION NOT NULL DEFAULT 0,
    phase_6_score DOUBLE PRECISION NOT NULL DEFAULT 0,
    red_flags JSONB NOT NULL DEFAULT '[]'::jsonb,
    total_score DOUBLE PRECISION,
    final_result VARCHAR(20),
    conversation_context JSONB NOT NULL DEFAULT '[]'::jsonb,
    started_at TIMESTAMP NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMP
);
-- Interview responses (individual Q&A in interviews)
CREATE TABLE interview_responses (
    response_id VARCHAR(21) PRIMARY KEY,
    session_id VARCHAR(21) NOT NULL REFERENCES interview_sessions(session_id),
    phase INTEGER NOT NULL,
    question_key VARCHAR(50),
    question_text TEXT,
    response_text TEXT,
    score DOUBLE PRECISION,
    evaluation_notes TEXT,
    red_flags_detected JSONB NOT NULL DEFAULT '[]'::jsonb,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);
-- ============================================================================
-- VECTOR EMBEDDING TABLES (pgvector)
-- ============================================================================
-- Areas embeddings (for semantic search)
CREATE TABLE areas_embeddings (
    area_id INTEGER PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    name_ar VARCHAR(255),
    embedding VECTOR(1024),
    -- Legacy unified embedding
    embedding_en VECTOR(1024),
    -- English embedding
    embedding_ar VECTOR(1024),
    -- Arabic embedding
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
-- Projects embeddings
CREATE TABLE projects_embeddings (
    project_id INTEGER PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    area_id INTEGER,
    embedding VECTOR(1024),
    embedding_en VECTOR(1024),
    embedding_ar VECTOR(1024),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
-- Unit types embeddings
CREATE TABLE unit_types_embeddings (
    unit_type_id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    name_ar VARCHAR(100),
    embedding VECTOR(1024),
    embedding_en VECTOR(1024),
    embedding_ar VECTOR(1024),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
-- Conversation embeddings (for RAG in customer chatbot)
CREATE TABLE conversation_embeddings (
    id SERIAL PRIMARY KEY,
    phone_number VARCHAR(50) NOT NULL,
    message_type VARCHAR(20) NOT NULL,
    message_text TEXT NOT NULL,
    embedding VECTOR(1024),
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP DEFAULT NOW()
);
-- ============================================================================
-- INDEXES
-- ============================================================================
-- Performance indexes
CREATE INDEX idx_areas_embeddings_name ON areas_embeddings(name);
CREATE INDEX idx_projects_embeddings_area_id ON projects_embeddings(area_id);
CREATE INDEX idx_projects_embeddings_name ON projects_embeddings(name);
CREATE INDEX idx_unit_types_embeddings_name ON unit_types_embeddings(name);
-- Session indexes
CREATE INDEX idx_customer_sessions_phone ON customer_sessions(phone_number);
CREATE INDEX idx_customer_sessions_complete ON customer_sessions(is_complete);
CREATE INDEX idx_customer_sessions_awaiting ON customer_sessions(awaiting_confirmation)
WHERE awaiting_confirmation = true;
CREATE INDEX idx_broker_chatbot_sessions_broker ON broker_chatbot_sessions(broker_id);
CREATE INDEX idx_broker_chatbot_sessions_request ON broker_chatbot_sessions(request_id);
-- Conversation embedding indexes
CREATE INDEX idx_conversation_embeddings_phone ON conversation_embeddings(phone_number);
-- Vector similarity search indexes (IVFFlat)
CREATE INDEX areas_embedding_idx ON areas_embeddings USING ivfflat (embedding vector_cosine_ops) WITH (lists = 10);
CREATE INDEX projects_embedding_idx ON projects_embeddings USING ivfflat (embedding vector_cosine_ops) WITH (lists = 10);
CREATE INDEX unit_types_embedding_idx ON unit_types_embeddings USING ivfflat (embedding vector_cosine_ops) WITH (lists = 10);
CREATE INDEX idx_conversation_embeddings_vector ON conversation_embeddings USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);
-- ============================================================================
-- TRIGGERS
-- ============================================================================
-- Auto-update timestamp on broker chatbot session
CREATE TRIGGER broker_session_update_trigger BEFORE
UPDATE ON broker_chatbot_sessions FOR EACH ROW EXECUTE FUNCTION update_broker_session_timestamp();
-- Auto-update timestamp on areas embeddings
CREATE TRIGGER trigger_areas_embeddings_updated_at BEFORE
UPDATE ON areas_embeddings FOR EACH ROW EXECUTE FUNCTION update_embedding_timestamp();
-- Auto-update timestamp on projects embeddings
CREATE TRIGGER trigger_projects_embeddings_updated_at BEFORE
UPDATE ON projects_embeddings FOR EACH ROW EXECUTE FUNCTION update_embedding_timestamp();
-- ============================================================================
-- SCHEMA DOCUMENTATION
-- ============================================================================
/*
 TABLE SUMMARY (21 tables):
 
 CORE BUSINESS:
 - users: System users (brokers & supervisors) with authentication
 - brokers: Extended user info with performance metrics
 - customers: Customer contact information
 
 GEOGRAPHY:
 - areas: Geographic regions (bilingual EN/AR)
 - broker_areas: Many-to-many broker-area assignments
 
 PROPERTIES:
 - projects: Real estate developments
 - units: Individual units with pricing & payment plans
 
 SALES PIPELINE:
 - requests: Customer inquiries with requirements
 - request_status_history: Audit trail for status changes
 - reservations: Unit reservations
 - payment_records: Payment tracking
 
 COMMUNICATION:
 - conversations: Chat history (customer/broker/AI)
 
 AI/ML SESSIONS:
 - customer_sessions: WhatsApp chatbot state
 - broker_chatbot_sessions: Broker AI assistant state
 
 HIRING:
 - broker_applications: New broker signup requests
 - interview_sessions: AI interview tracking (6 phases)
 - interview_responses: Individual Q&A records
 
 VECTOR EMBEDDINGS (pgvector):
 - areas_embeddings: Area semantic embeddings
 - projects_embeddings: Project semantic embeddings
 - unit_types_embeddings: Unit type embeddings
 - conversation_embeddings: RAG conversation embeddings
 
 All tables use VARCHAR(21) NanoID for primary keys (except serial IDs for sessions/embeddings).
 Vector embeddings use 1024 dimensions with IVFFlat indexing for similarity search.
 */