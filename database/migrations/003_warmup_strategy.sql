-- ============================================
-- WARM-UP STRATEGY MIGRATION
-- Adds fields to support gradual message volume increase
-- ============================================

-- Add warm-up related fields to consultants table
ALTER TABLE consultants
ADD COLUMN IF NOT EXISTS warmup_start_date DATE DEFAULT CURRENT_DATE,
ADD COLUMN IF NOT EXISTS warmup_stage VARCHAR(20) DEFAULT 'new', -- new, warming, active, veteran
ADD COLUMN IF NOT EXISTS warmup_enabled BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS account_age_days INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS current_daily_limit INTEGER DEFAULT 20;

-- Create comments
COMMENT ON COLUMN consultants.warmup_start_date IS 'Date when WhatsApp account started being used for campaigns';
COMMENT ON COLUMN consultants.warmup_stage IS 'Current warm-up stage: new (0-7 days), warming (8-21 days), active (22-60 days), veteran (60+ days)';
COMMENT ON COLUMN consultants.warmup_enabled IS 'Whether warm-up limits should be applied (can be disabled for established accounts)';
COMMENT ON COLUMN consultants.account_age_days IS 'Number of days since warmup_start_date';
COMMENT ON COLUMN consultants.current_daily_limit IS 'Current calculated daily message limit based on warm-up stage';

-- ============================================
-- FUNCTION: Calculate account age
-- ============================================
CREATE OR REPLACE FUNCTION calculate_account_age()
RETURNS TRIGGER AS $$
BEGIN
    -- Calculate account age in days
    NEW.account_age_days := CURRENT_DATE - NEW.warmup_start_date;

    -- Determine warm-up stage based on age
    IF NEW.account_age_days < 8 THEN
        NEW.warmup_stage := 'new';
    ELSIF NEW.account_age_days < 22 THEN
        NEW.warmup_stage := 'warming';
    ELSIF NEW.account_age_days < 61 THEN
        NEW.warmup_stage := 'active';
    ELSE
        NEW.warmup_stage := 'veteran';
    END IF;

    -- Calculate current daily limit based on warm-up stage
    -- Only if warm-up is enabled
    IF NEW.warmup_enabled THEN
        CASE NEW.warmup_stage
            WHEN 'new' THEN
                -- Days 0-7: Start at 20, increase by 5 each day
                NEW.current_daily_limit := LEAST(20 + (NEW.account_age_days * 5), 50);
            WHEN 'warming' THEN
                -- Days 8-21: 50-100 messages
                NEW.current_daily_limit := LEAST(50 + ((NEW.account_age_days - 7) * 4), 100);
            WHEN 'active' THEN
                -- Days 22-60: 100-150 messages
                NEW.current_daily_limit := LEAST(100 + ((NEW.account_age_days - 21) * 1), 150);
            WHEN 'veteran' THEN
                -- Days 60+: Full limit (200 messages)
                NEW.current_daily_limit := NEW.daily_limit;
        END CASE;
    ELSE
        -- Warm-up disabled, use full limit
        NEW.current_daily_limit := NEW.daily_limit;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- TRIGGER: Auto-calculate on insert/update
-- ============================================
CREATE TRIGGER trigger_calculate_account_age
BEFORE INSERT OR UPDATE OF warmup_start_date, warmup_enabled, daily_limit
ON consultants
FOR EACH ROW
EXECUTE FUNCTION calculate_account_age();

-- ============================================
-- Initial update: Calculate for existing consultants
-- ============================================
UPDATE consultants
SET warmup_start_date = CURRENT_DATE - INTERVAL '30 days'
WHERE warmup_start_date IS NULL;

-- Run the trigger to calculate initial values
UPDATE consultants SET updated_at = CURRENT_TIMESTAMP;

-- ============================================
-- INDEX: Improve query performance
-- ============================================
CREATE INDEX IF NOT EXISTS idx_consultants_warmup_stage ON consultants(warmup_stage);
CREATE INDEX IF NOT EXISTS idx_consultants_warmup_enabled ON consultants(warmup_enabled);

-- ============================================
-- Warm-up milestones view
-- ============================================
CREATE OR REPLACE VIEW warmup_milestones AS
SELECT
    id,
    name,
    instance_name,
    warmup_start_date,
    account_age_days,
    warmup_stage,
    current_daily_limit,
    daily_limit as max_daily_limit,
    warmup_enabled,
    CASE
        WHEN warmup_stage = 'new' THEN 7 - account_age_days
        WHEN warmup_stage = 'warming' THEN 21 - account_age_days
        WHEN warmup_stage = 'active' THEN 60 - account_age_days
        ELSE 0
    END as days_to_next_stage,
    CASE
        WHEN warmup_stage = 'new' THEN 'warming'
        WHEN warmup_stage = 'warming' THEN 'active'
        WHEN warmup_stage = 'active' THEN 'veteran'
        ELSE 'veteran'
    END as next_stage,
    created_at
FROM consultants
ORDER BY account_age_days ASC;

COMMENT ON VIEW warmup_milestones IS 'Shows warm-up progress and milestones for all consultants';
