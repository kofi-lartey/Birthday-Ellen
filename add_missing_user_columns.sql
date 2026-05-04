-- ============================================
-- ADD MISSING COLUMNS TO USERS TABLE
-- ============================================
-- Run this in Supabase SQL Editor
-- ============================================

-- Ensure package-related columns exist (from packages_database.sql)
ALTER TABLE users ADD COLUMN IF NOT EXISTS package_id INTEGER REFERENCES packages(id);
ALTER TABLE users ADD COLUMN IF NOT EXISTS package_tier TEXT DEFAULT 'free';
ALTER TABLE users ADD COLUMN IF NOT EXISTS package_expires_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS package_name TEXT;

-- Upgrade/pending columns (from add_user_columns_full.sql)
ALTER TABLE users ADD COLUMN IF NOT EXISTS package_pending TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS pending_upgrade_id INTEGER REFERENCES upgrade_requests(id);

-- Payment tracking columns
ALTER TABLE users ADD COLUMN IF NOT EXISTS payment_status TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS payment_method TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS payment_reference TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS payment_reference_code TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS payment_confirmed_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS payment_confirmed_by TEXT;

-- Add updated_at timestamp for tracking modifications
ALTER TABLE users ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Backfill default values for existing rows
UPDATE users SET package_tier = 'free' WHERE package_tier IS NULL;
UPDATE users SET package_name = 'Free' WHERE package_name IS NULL AND (package_tier = 'free' OR package_tier IS NULL);

-- Add trigger to auto-update updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_users_updated_at ON users;
CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- FIX THE notify_upgrade_request TRIGGER
-- ============================================
-- Replace with version that doesn't assume updated_at exists (but now it does)
CREATE OR REPLACE FUNCTION notify_upgrade_request()
RETURNS TRIGGER AS $$
DECLARE
    admin_user RECORD;
BEGIN
    -- Link user to this request
    UPDATE users 
    SET pending_upgrade_id = NEW.id,
        package_pending = NEW.to_package_tier,
        payment_status = 'pending',
        updated_at = NOW()
    WHERE id::text = NEW.user_id;

    -- Notify all admin users
    FOR admin_user IN 
        SELECT id, email, name FROM users WHERE role IN ('admin', 'super_admin')
    LOOP
        INSERT INTO notifications (
            recipient_id,
            type,
            title,
            message,
            data,
            created_at
        ) VALUES (
            admin_user.id,
            'upgrade_pending',
            '🚀 New Upgrade Request',
            format('User %s has requested to upgrade from %s to %s package (GHS %s). Reference: %s',
                COALESCE(NEW.user_name, NEW.user_email),
                COALESCE(NEW.from_package_tier, 'free'),
                NEW.to_package_tier,
                to_char(NEW.amount_paid, 'FM9999999990.00'),
                COALESCE(NEW.payment_reference_code, 'N/A')
            ),
            jsonb_build_object(
                'user_id', NEW.user_id,
                'user_name', NEW.user_name,
                'user_email', NEW.user_email,
                'from_tier', NEW.from_package_tier,
                'to_tier', NEW.to_package_tier,
                'amount', NEW.amount_paid,
                'reference_code', NEW.payment_reference_code,
                'upgrade_request_id', NEW.id,
                'transaction_id', NEW.transaction_id,
                'payment_method', NEW.payment_method
            ),
            NOW()
        );
    END LOOP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- VERIFY
-- ============================================
-- Check columns added:
-- SELECT column_name, data_type 
-- FROM information_schema.columns 
-- WHERE table_name = 'users' 
--   AND column_name IN ('updated_at', 'payment_confirmed_by', 'package_name', 'package_pending', 'pending_upgrade_id', 'payment_status');
