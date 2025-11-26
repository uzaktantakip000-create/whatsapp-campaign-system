-- Migration 006: Engagement Tracking and Account Health
-- Adds columns for engagement scoring, reply tracking, number validation, and health monitoring

-- Track schema version
INSERT INTO schema_version (version, description)
VALUES (6, 'Engagement tracking, reply tracking, number validation, account health')
ON CONFLICT (version) DO NOTHING;

-- =============================================
-- 1. CONTACTS TABLE ENHANCEMENTS
-- =============================================

-- Engagement score (0-100)
ALTER TABLE contacts
ADD COLUMN IF NOT EXISTS engagement_score INTEGER DEFAULT 0;

-- Reply tracking
ALTER TABLE contacts
ADD COLUMN IF NOT EXISTS reply_count INTEGER DEFAULT 0;

ALTER TABLE contacts
ADD COLUMN IF NOT EXISTS last_reply_at TIMESTAMP;

-- Number validation
ALTER TABLE contacts
ADD COLUMN IF NOT EXISTS whatsapp_valid BOOLEAN DEFAULT NULL;

ALTER TABLE contacts
ADD COLUMN IF NOT EXISTS validated_at TIMESTAMP;

-- Create indexes for new columns
CREATE INDEX IF NOT EXISTS idx_contacts_engagement ON contacts(engagement_score DESC);
CREATE INDEX IF NOT EXISTS idx_contacts_whatsapp_valid ON contacts(whatsapp_valid);
CREATE INDEX IF NOT EXISTS idx_contacts_last_reply ON contacts(last_reply_at DESC);

-- =============================================
-- 2. MESSAGES TABLE ENHANCEMENTS
-- =============================================

-- Reply tracking
ALTER TABLE messages
ADD COLUMN IF NOT EXISTS replied BOOLEAN DEFAULT false;

ALTER TABLE messages
ADD COLUMN IF NOT EXISTS reply_text TEXT;

-- Create index for reply tracking
CREATE INDEX IF NOT EXISTS idx_messages_replied ON messages(replied);

-- =============================================
-- 3. CAMPAIGNS TABLE ENHANCEMENTS
-- =============================================

-- Reply count tracking
ALTER TABLE campaigns
ADD COLUMN IF NOT EXISTS reply_count INTEGER DEFAULT 0;

-- =============================================
-- 4. CONSULTANTS TABLE ENHANCEMENTS
-- =============================================

-- Account health tracking
ALTER TABLE consultants
ADD COLUMN IF NOT EXISTS health_score INTEGER DEFAULT 100;

ALTER TABLE consultants
ADD COLUMN IF NOT EXISTS last_health_check TIMESTAMP;

ALTER TABLE consultants
ADD COLUMN IF NOT EXISTS block_count INTEGER DEFAULT 0;

-- Create index for health monitoring
CREATE INDEX IF NOT EXISTS idx_consultants_health ON consultants(health_score);
CREATE INDEX IF NOT EXISTS idx_consultants_status_health ON consultants(status, health_score);

-- =============================================
-- 5. ENGAGEMENT TIERS VIEW
-- =============================================

CREATE OR REPLACE VIEW v_contact_engagement_tiers AS
SELECT
    c.consultant_id,
    COUNT(*) as total_contacts,
    COUNT(*) FILTER (WHERE COALESCE(c.engagement_score, 0) >= 70) as hot_leads,
    COUNT(*) FILTER (WHERE COALESCE(c.engagement_score, 0) >= 40 AND COALESCE(c.engagement_score, 0) < 70) as warm_leads,
    COUNT(*) FILTER (WHERE COALESCE(c.engagement_score, 0) >= 10 AND COALESCE(c.engagement_score, 0) < 40) as cold_leads,
    COUNT(*) FILTER (WHERE COALESCE(c.engagement_score, 0) < 10) as inactive_leads,
    AVG(COALESCE(c.engagement_score, 0))::numeric(5,2) as avg_engagement_score,
    SUM(COALESCE(c.reply_count, 0)) as total_replies,
    COUNT(*) FILTER (WHERE c.whatsapp_valid = true) as valid_numbers,
    COUNT(*) FILTER (WHERE c.whatsapp_valid = false) as invalid_numbers,
    COUNT(*) FILTER (WHERE c.whatsapp_valid IS NULL) as unvalidated_numbers
FROM contacts c
WHERE c.is_deleted = false
GROUP BY c.consultant_id;

-- =============================================
-- 6. DELIVERY STATS VIEW
-- =============================================

CREATE OR REPLACE VIEW v_delivery_stats_24h AS
SELECT
    c.consultant_id,
    COUNT(m.*) as total_messages,
    COUNT(*) FILTER (WHERE m.status = 'sent') as sent,
    COUNT(*) FILTER (WHERE m.status = 'delivered') as delivered,
    COUNT(*) FILTER (WHERE m.status = 'read') as read,
    COUNT(*) FILTER (WHERE m.status = 'failed') as failed,
    COUNT(*) FILTER (WHERE m.status = 'pending') as pending,
    COUNT(*) FILTER (WHERE m.replied = true) as replied,
    CASE WHEN COUNT(m.*) > 0
        THEN (COUNT(*) FILTER (WHERE m.status IN ('delivered', 'read'))::numeric / COUNT(m.*)::numeric * 100)::numeric(5,2)
        ELSE 100
    END as delivery_rate,
    CASE WHEN COUNT(*) FILTER (WHERE m.status IN ('delivered', 'read')) > 0
        THEN (COUNT(*) FILTER (WHERE m.status = 'read')::numeric / COUNT(*) FILTER (WHERE m.status IN ('delivered', 'read'))::numeric * 100)::numeric(5,2)
        ELSE 0
    END as read_rate
FROM campaigns c
LEFT JOIN messages m ON c.id = m.campaign_id AND m.created_at >= NOW() - INTERVAL '24 hours'
GROUP BY c.consultant_id;

-- =============================================
-- 7. ACCOUNT HEALTH VIEW
-- =============================================

CREATE OR REPLACE VIEW v_account_health AS
SELECT
    cons.id as consultant_id,
    cons.name,
    cons.status,
    cons.spam_risk_score,
    cons.health_score,
    cons.connected_at,
    cons.last_active_at,
    COALESCE(ds.delivery_rate, 100) as delivery_rate_24h,
    COALESCE(ds.total_messages, 0) as messages_24h,
    COALESCE(et.total_replies, 0) as total_replies,
    COALESCE(et.hot_leads, 0) as hot_leads,
    CASE
        WHEN cons.status = 'suspended' THEN 'SUSPENDED'
        WHEN cons.spam_risk_score >= 70 THEN 'CRITICAL'
        WHEN cons.spam_risk_score >= 50 OR COALESCE(ds.delivery_rate, 100) < 50 THEN 'WARNING'
        WHEN cons.spam_risk_score >= 30 OR COALESCE(ds.delivery_rate, 100) < 75 THEN 'CAUTION'
        ELSE 'HEALTHY'
    END as health_status
FROM consultants cons
LEFT JOIN v_delivery_stats_24h ds ON cons.id = ds.consultant_id
LEFT JOIN v_contact_engagement_tiers et ON cons.id = et.consultant_id;

-- =============================================
-- 8. BLOCK EVENTS TABLE
-- =============================================

CREATE TABLE IF NOT EXISTS block_events (
    id SERIAL PRIMARY KEY,
    consultant_id INTEGER REFERENCES consultants(id) ON DELETE CASCADE,
    event_type VARCHAR(50) NOT NULL, -- 'warning', 'suspected', 'confirmed', 'temporary'
    error_code INTEGER,
    error_message TEXT,
    action_taken VARCHAR(100),
    metadata JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_block_events_consultant ON block_events(consultant_id);
CREATE INDEX IF NOT EXISTS idx_block_events_type ON block_events(event_type);
CREATE INDEX IF NOT EXISTS idx_block_events_created ON block_events(created_at DESC);

-- =============================================
-- 9. NUMBER VALIDATION LOG
-- =============================================

CREATE TABLE IF NOT EXISTS number_validation_log (
    id SERIAL PRIMARY KEY,
    consultant_id INTEGER REFERENCES consultants(id) ON DELETE CASCADE,
    phone_number VARCHAR(20) NOT NULL,
    is_valid BOOLEAN NOT NULL,
    validation_source VARCHAR(50) DEFAULT 'evolution_api',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_validation_log_consultant ON number_validation_log(consultant_id);
CREATE INDEX IF NOT EXISTS idx_validation_log_number ON number_validation_log(phone_number);

-- =============================================
-- 10. FUNCTIONS FOR ENGAGEMENT CALCULATION
-- =============================================

-- Function to recalculate engagement score for a contact
CREATE OR REPLACE FUNCTION recalculate_engagement_score(p_contact_id INTEGER)
RETURNS INTEGER AS $$
DECLARE
    v_score INTEGER := 0;
    v_reply_count INTEGER;
    v_read_count INTEGER;
    v_delivered_count INTEGER;
    v_last_reply TIMESTAMP;
    v_complaint_count INTEGER;
BEGIN
    -- Get contact stats
    SELECT
        COALESCE(reply_count, 0),
        COALESCE(complaint_count, 0),
        last_reply_at
    INTO v_reply_count, v_complaint_count, v_last_reply
    FROM contacts WHERE id = p_contact_id;

    -- Get message stats
    SELECT
        COUNT(*) FILTER (WHERE status = 'read'),
        COUNT(*) FILTER (WHERE status IN ('delivered', 'read'))
    INTO v_read_count, v_delivered_count
    FROM messages WHERE contact_id = p_contact_id;

    -- Calculate score components
    -- Reply score (30 points per reply, max 60)
    v_score := v_score + LEAST(v_reply_count * 30, 60);

    -- Read rate score (max 20)
    IF v_delivered_count > 0 THEN
        v_score := v_score + (v_read_count::numeric / v_delivered_count::numeric * 20)::integer;
    END IF;

    -- Recent activity bonus (10 points if replied in last 7 days)
    IF v_last_reply IS NOT NULL AND v_last_reply >= NOW() - INTERVAL '7 days' THEN
        v_score := v_score + 10;
    END IF;

    -- Complaint penalty (-50 per complaint)
    v_score := v_score - (v_complaint_count * 50);

    -- Ensure score is within bounds
    v_score := GREATEST(0, LEAST(100, v_score));

    -- Update contact
    UPDATE contacts SET engagement_score = v_score WHERE id = p_contact_id;

    RETURN v_score;
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- SUCCESS MESSAGE
-- =============================================

DO $$
BEGIN
    RAISE NOTICE 'Migration 006 completed successfully: Engagement and Health tracking added';
END $$;
