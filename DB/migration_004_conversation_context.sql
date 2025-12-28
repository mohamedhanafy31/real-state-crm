-- Migration 004: Add context_type to conversations table
-- Separates customer-AI conversations from broker-AI conversations
-- Created: 2025-12-26
-- Add context_type column: 'customer' for customer-AI chats, 'broker' for broker-AI chats
ALTER TABLE conversations
ADD COLUMN IF NOT EXISTS context_type VARCHAR(20) DEFAULT 'customer';
-- Add check constraint
ALTER TABLE conversations
ADD CONSTRAINT chk_context_type CHECK (context_type IN ('customer', 'broker'));
-- Backfill: Set broker context for broker messages
UPDATE conversations
SET context_type = 'broker'
WHERE actor_type = 'broker'
    AND context_type = 'customer';
-- Backfill: Set broker context for AI responses to brokers
-- AI messages that immediately follow a broker message (within same request)
-- and don't have a customer message between them
WITH broker_ai_pairs AS (
    SELECT c1.conversation_id
    FROM conversations c1
    WHERE c1.actor_type = 'ai'
        AND c1.context_type = 'customer' -- Only update ones not already set
        AND EXISTS (
            -- There's a broker message before this AI message
            SELECT 1
            FROM conversations c2
            WHERE c2.related_request_id = c1.related_request_id
                AND c2.actor_type = 'broker'
                AND c2.created_at < c1.created_at
        )
        AND NOT EXISTS (
            -- No customer message between the broker message and this AI message
            SELECT 1
            FROM conversations c3
            WHERE c3.related_request_id = c1.related_request_id
                AND c3.actor_type = 'customer'
                AND c3.created_at > (
                    SELECT MAX(c4.created_at)
                    FROM conversations c4
                    WHERE c4.related_request_id = c1.related_request_id
                        AND c4.actor_type = 'broker'
                        AND c4.created_at < c1.created_at
                )
                AND c3.created_at < c1.created_at
        )
)
UPDATE conversations
SET context_type = 'broker'
WHERE conversation_id IN (
        SELECT conversation_id
        FROM broker_ai_pairs
    );
-- Create index for filtering by context
CREATE INDEX IF NOT EXISTS idx_conversations_context ON conversations(related_request_id, context_type);
-- Verify migration
DO $$ BEGIN RAISE NOTICE 'Migration complete. Context type distribution:';
END $$;
SELECT context_type,
    COUNT(*) as count
FROM conversations
GROUP BY context_type;