-- Broker Chatbot Sessions Table
-- Stores session state and cached analysis for broker chatbot interactions
CREATE TABLE IF NOT EXISTS broker_chatbot_sessions (
    session_id SERIAL PRIMARY KEY,
    broker_id VARCHAR(21) REFERENCES brokers(broker_id) ON DELETE CASCADE,
    request_id VARCHAR(21) REFERENCES requests(request_id) ON DELETE CASCADE,
    -- Session state
    session_state JSONB,
    -- LangGraph conversation state
    -- Cached analysis (to avoid re-analyzing on every message)
    last_analysis JSONB,
    -- Client personality analysis
    last_strategy JSONB,
    -- Strategy recommendations
    -- Timestamps
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    -- One session per broker-request pair
    UNIQUE(broker_id, request_id)
);
-- Indexes for efficient lookups
CREATE INDEX IF NOT EXISTS idx_broker_chatbot_sessions_broker ON broker_chatbot_sessions(broker_id);
CREATE INDEX IF NOT EXISTS idx_broker_chatbot_sessions_request ON broker_chatbot_sessions(request_id);
-- Trigger to auto-update updated_at
CREATE OR REPLACE FUNCTION update_broker_session_timestamp() RETURNS TRIGGER AS $$ BEGIN NEW.updated_at = NOW();
RETURN NEW;
END;
$$ LANGUAGE plpgsql;
DROP TRIGGER IF EXISTS broker_session_update_trigger ON broker_chatbot_sessions;
CREATE TRIGGER broker_session_update_trigger BEFORE
UPDATE ON broker_chatbot_sessions FOR EACH ROW EXECUTE FUNCTION update_broker_session_timestamp();
-- Comments
COMMENT ON TABLE broker_chatbot_sessions IS 'Stores session state for broker chatbot interactions';
COMMENT ON COLUMN broker_chatbot_sessions.session_state IS 'LangGraph conversation state JSON';
COMMENT ON COLUMN broker_chatbot_sessions.last_analysis IS 'Cached client personality analysis';
COMMENT ON COLUMN broker_chatbot_sessions.last_strategy IS 'Cached strategy recommendations';