-- ============================================
-- AUTHENTICATION FIELDS MIGRATION
-- Adds authentication-related fields to consultants table
-- ============================================

-- Add authentication fields to consultants table
ALTER TABLE consultants
ADD COLUMN IF NOT EXISTS password_hash VARCHAR(255),
ADD COLUMN IF NOT EXISTS role VARCHAR(20) DEFAULT 'consultant',
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMP;

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_consultants_email ON consultants(email);
CREATE INDEX IF NOT EXISTS idx_consultants_role ON consultants(role);
CREATE INDEX IF NOT EXISTS idx_consultants_is_active ON consultants(is_active);

-- Add unique constraint on email (if not already exists)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'consultants_email_unique'
    ) THEN
        ALTER TABLE consultants ADD CONSTRAINT consultants_email_unique UNIQUE (email);
    END IF;
END $$;

-- Add comments
COMMENT ON COLUMN consultants.password_hash IS 'Bcrypt hashed password for authentication';
COMMENT ON COLUMN consultants.role IS 'User role: consultant, admin';
COMMENT ON COLUMN consultants.is_active IS 'Whether the consultant account is active';
COMMENT ON COLUMN consultants.last_login_at IS 'Timestamp of last successful login';
