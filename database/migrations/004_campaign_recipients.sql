-- ============================================
-- Campaign Recipients Table Migration
-- Version: 1.0.0
-- Date: 2025-01-15
-- Description: Adds campaign_recipients table and template_id to campaigns
-- ============================================

-- ============================================
-- CAMPAIGN RECIPIENTS TABLE
-- Stores which contacts are targeted for each campaign
-- ============================================
CREATE TABLE IF NOT EXISTS campaign_recipients (
    id SERIAL PRIMARY KEY,
    campaign_id INTEGER NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
    contact_id INTEGER NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
    status VARCHAR(20) DEFAULT 'pending', -- pending, sent, delivered, read, failed
    sent_at TIMESTAMP,
    delivered_at TIMESTAMP,
    read_at TIMESTAMP,
    error_message TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(campaign_id, contact_id)
);

-- Indexes for performance
CREATE INDEX idx_campaign_recipients_campaign ON campaign_recipients(campaign_id);
CREATE INDEX idx_campaign_recipients_contact ON campaign_recipients(contact_id);
CREATE INDEX idx_campaign_recipients_status ON campaign_recipients(status);

-- ============================================
-- ADD TEMPLATE SUPPORT TO CAMPAIGNS
-- ============================================
ALTER TABLE campaigns
ADD COLUMN IF NOT EXISTS template_id INTEGER REFERENCES message_templates(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS use_ai_variations BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS segment_filter VARCHAR(10); -- 'A', 'B', 'C', 'A,B', 'B,C', 'A,B,C', null (all)

-- Index for template lookups
CREATE INDEX IF NOT EXISTS idx_campaigns_template ON campaigns(template_id);

-- ============================================
-- TRIGGER FOR AUTO-UPDATE
-- ============================================
CREATE TRIGGER update_campaign_recipients_updated_at
    BEFORE UPDATE ON campaign_recipients
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- UPDATE CAMPAIGNS TOTAL_RECIPIENTS FUNCTION
-- ============================================
CREATE OR REPLACE FUNCTION update_campaign_recipients_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' OR TG_OP = 'DELETE' THEN
        UPDATE campaigns
        SET total_recipients = (
            SELECT COUNT(*)
            FROM campaign_recipients
            WHERE campaign_id = COALESCE(NEW.campaign_id, OLD.campaign_id)
        )
        WHERE id = COALESCE(NEW.campaign_id, OLD.campaign_id);
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update total_recipients count
CREATE TRIGGER update_campaign_total_recipients
    AFTER INSERT OR DELETE ON campaign_recipients
    FOR EACH ROW EXECUTE FUNCTION update_campaign_recipients_count();

-- ============================================
-- MIGRATION COMPLETE
-- ============================================
