-- Migration: Create customer_sessions table for chatbot state persistence
-- Purpose: Store accumulated customer requirements across conversation turns
CREATE TABLE IF NOT EXISTS customer_sessions (
    session_id SERIAL PRIMARY KEY,
    phone_number VARCHAR(50) UNIQUE NOT NULL,
    extracted_requirements JSONB DEFAULT '{}',
    last_intent VARCHAR(50),
    is_complete BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
-- Index for fast phone number lookup
CREATE INDEX IF NOT EXISTS idx_customer_sessions_phone ON customer_sessions(phone_number);
-- Index for querying complete sessions
CREATE INDEX IF NOT EXISTS idx_customer_sessions_complete ON customer_sessions(is_complete);
-- Optional: Add detailed requirement fields to requests table
-- Uncomment if you want to store requirements in the main CRM as well
/*
 ALTER TABLE requests 
 ADD COLUMN IF NOT EXISTS unit_type VARCHAR(50),
 ADD COLUMN IF NOT EXISTS budget_min FLOAT,
 ADD COLUMN IF NOT EXISTS budget_max FLOAT,
 ADD COLUMN IF NOT EXISTS size_min FLOAT,
 ADD COLUMN IF NOT EXISTS size_max FLOAT,
 ADD COLUMN IF NOT EXISTS bedrooms INT,
 ADD COLUMN IF NOT EXISTS bathrooms INT,
 ADD COLUMN IF NOT EXISTS additional_notes TEXT;
 */