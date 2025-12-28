-- Migration: Add workflow state columns to customer_sessions
-- Purpose: Persist confirmation flow state across requests
-- Add new columns with defaults
ALTER TABLE customer_sessions
ADD COLUMN IF NOT EXISTS confirmed BOOLEAN DEFAULT FALSE;
ALTER TABLE customer_sessions
ADD COLUMN IF NOT EXISTS awaiting_confirmation BOOLEAN DEFAULT FALSE;
ALTER TABLE customer_sessions
ADD COLUMN IF NOT EXISTS confirmation_attempt INTEGER DEFAULT 0;
-- Add index for quick lookup of sessions awaiting confirmation
CREATE INDEX IF NOT EXISTS idx_customer_sessions_awaiting ON customer_sessions (awaiting_confirmation)
WHERE awaiting_confirmation = TRUE;