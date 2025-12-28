-- Migration 003: Make related_request_id Nullable in conversations
-- Run with: psql -U admin -d real_estate_crm -f migration_003_conversation_nullable_request.sql
ALTER TABLE conversations
ALTER COLUMN related_request_id DROP NOT NULL;
-- Verify
\ d conversations