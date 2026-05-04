-- ============================================
-- ADD ALL MISSING COLUMNS TO USERS TABLE
-- ============================================

-- Core package tracking
ALTER TABLE users ADD COLUMN IF NOT EXISTS package_id INTEGER REFERENCES packages(id);
ALTER TABLE users ADD COLUMN IF NOT EXISTS package_tier TEXT DEFAULT 'free';
ALTER TABLE users ADD COLUMN IF NOT EXISTS package_name TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS package_expires_at TIMESTAMP WITH TIME ZONE;

-- Upgrade flow
ALTER TABLE users ADD COLUMN IF NOT EXISTS package_pending TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS pending_upgrade_id INTEGER REFERENCES upgrade_requests(id);

-- Payment tracking
ALTER TABLE users ADD COLUMN IF NOT EXISTS payment_status TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS payment_method TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS payment_reference TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS payment_reference_code TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS payment_confirmed_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS payment_confirmed_by TEXT;

-- Audit timestamp
ALTER TABLE users ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- ============================================
-- TRIGGER: Auto-update updated_at
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $func$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$func$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_users_updated_at ON users;
CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- DONE
-- ============================================
-- Now run the fixed notify_upgrade_request() from fix_foreign_key_types.sql
-- Then backfill with fix_kofi_user.sql

