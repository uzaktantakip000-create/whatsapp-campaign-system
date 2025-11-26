-- Migration 005: Anti-Spam Enhancements
-- Adds columns for duplicate detection, content analysis, and spam score decay

-- Track schema version
INSERT INTO schema_version (version, description)
VALUES (5, 'Anti-spam enhancements: message_hash, is_deleted, severity')
ON CONFLICT (version) DO NOTHING;

-- 1. Add message_hash column to messages table for duplicate detection
ALTER TABLE messages
ADD COLUMN IF NOT EXISTS message_hash VARCHAR(32);

-- Create index for fast hash lookups
CREATE INDEX IF NOT EXISTS idx_messages_hash ON messages(message_hash);
CREATE INDEX IF NOT EXISTS idx_messages_hash_created ON messages(message_hash, created_at);

-- 2. Add is_deleted column to contacts table for soft delete
ALTER TABLE contacts
ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT false;

-- Create index for filtering deleted contacts
CREATE INDEX IF NOT EXISTS idx_contacts_deleted ON contacts(is_deleted);

-- 3. Add severity column to spam_logs if not exists
ALTER TABLE spam_logs
ADD COLUMN IF NOT EXISTS severity VARCHAR(20) DEFAULT 'low';

-- Create index for severity filtering
CREATE INDEX IF NOT EXISTS idx_spam_logs_severity ON spam_logs(severity);

-- 4. Add content_spam_score to messages for tracking
ALTER TABLE messages
ADD COLUMN IF NOT EXISTS content_spam_score INTEGER DEFAULT 0;

-- 5. Add last_decay_at column to consultants for tracking decay
ALTER TABLE consultants
ADD COLUMN IF NOT EXISTS last_decay_at TIMESTAMP;

-- 6. Create spam_decay_log table for tracking decay history
CREATE TABLE IF NOT EXISTS spam_decay_log (
    id SERIAL PRIMARY KEY,
    consultant_id INTEGER REFERENCES consultants(id) ON DELETE CASCADE,
    previous_score INTEGER NOT NULL,
    new_score INTEGER NOT NULL,
    decay_amount INTEGER NOT NULL,
    decay_type VARCHAR(50) DEFAULT 'daily', -- 'daily', 'weekly_bonus', 'admin_reset'
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create index for decay log queries
CREATE INDEX IF NOT EXISTS idx_spam_decay_log_consultant ON spam_decay_log(consultant_id);
CREATE INDEX IF NOT EXISTS idx_spam_decay_log_created ON spam_decay_log(created_at);

-- 7. Add ai_variation_used flag to messages
ALTER TABLE messages
ADD COLUMN IF NOT EXISTS ai_variation_used BOOLEAN DEFAULT false;

-- 8. Update existing messages with hash (optional - for existing data)
-- This will be done by the application on next message send

-- 9. Add composite index for duplicate detection queries
CREATE INDEX IF NOT EXISTS idx_messages_consultant_hash_date
ON messages(campaign_id, message_hash, created_at)
WHERE message_hash IS NOT NULL;

-- 10. Create view for daily spam statistics
CREATE OR REPLACE VIEW v_consultant_spam_summary AS
SELECT
    c.id as consultant_id,
    c.name as consultant_name,
    c.spam_risk_score,
    c.last_decay_at,
    COUNT(DISTINCT sl.id) FILTER (WHERE sl.created_at >= NOW() - INTERVAL '24 hours') as events_24h,
    COUNT(DISTINCT sl.id) FILTER (WHERE sl.created_at >= NOW() - INTERVAL '7 days') as events_7d,
    MAX(sl.created_at) as last_spam_event,
    CASE
        WHEN c.spam_risk_score >= 70 THEN 'CRITICAL'
        WHEN c.spam_risk_score >= 50 THEN 'HIGH'
        WHEN c.spam_risk_score >= 30 THEN 'MEDIUM'
        WHEN c.spam_risk_score >= 10 THEN 'LOW'
        ELSE 'SAFE'
    END as risk_level
FROM consultants c
LEFT JOIN spam_logs sl ON c.id = sl.consultant_id
GROUP BY c.id, c.name, c.spam_risk_score, c.last_decay_at;

-- Success message
DO $$
BEGIN
    RAISE NOTICE 'Migration 005 completed successfully: Anti-spam enhancements added';
END $$;
