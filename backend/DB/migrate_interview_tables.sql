-- Supplementary Migration: Interview Tables
-- Truncates data to resolve broken detailed mapping from previous migration steps.
BEGIN;
-- 1. Truncate tables to remove orphaned data
TRUNCATE TABLE "interview_responses" CASCADE;
TRUNCATE TABLE "interview_sessions" CASCADE;
-- 2. Migrate Interview Sessions
-- Drop old PK and FK columns
ALTER TABLE "interview_sessions" DROP CONSTRAINT IF EXISTS "interview_sessions_pkey" CASCADE;
ALTER TABLE "interview_sessions" DROP COLUMN "session_id" CASCADE;
ALTER TABLE "interview_sessions" DROP COLUMN "application_id" CASCADE;
-- Add new columns
ALTER TABLE "interview_sessions"
ADD COLUMN "session_id" VARCHAR(21) PRIMARY KEY;
ALTER TABLE "interview_sessions"
ADD COLUMN "application_id" VARCHAR(21);
ALTER TABLE "interview_sessions"
ADD CONSTRAINT "FK_session_application" FOREIGN KEY ("application_id") REFERENCES "broker_applications"("application_id");
-- 3. Migrate Interview Responses
ALTER TABLE "interview_responses" DROP CONSTRAINT IF EXISTS "interview_responses_pkey" CASCADE;
ALTER TABLE "interview_responses" DROP COLUMN "response_id" CASCADE;
ALTER TABLE "interview_responses" DROP COLUMN "session_id" CASCADE;
-- Add new columns
ALTER TABLE "interview_responses"
ADD COLUMN "response_id" VARCHAR(21) PRIMARY KEY;
ALTER TABLE "interview_responses"
ADD COLUMN "session_id" VARCHAR(21);
ALTER TABLE "interview_responses"
ADD CONSTRAINT "FK_response_session" FOREIGN KEY ("session_id") REFERENCES "interview_sessions"("session_id");
COMMIT;