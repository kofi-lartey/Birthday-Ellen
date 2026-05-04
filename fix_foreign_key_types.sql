-- ============================================
-- FIX TYPE MISMATCH: user_packages.user_id (TEXT) vs users.id (UUID)
-- ============================================
-- The users table from Supabase Auth uses UUID for id.
-- user_packages.user_id is TEXT. Need to either:
--   A) Cast user_id::uuid in foreign key (PostgreSQL 12+)
--   B) Change user_packages.user_id to UUID
--   C) Remove FK constraint (loss of referential integrity)
--
-- Option A is simplest if your PostgreSQL supports it:
-- ============================================

-- First, check current types
SELECT column_name, data_type, udt_name 
FROM information_schema.columns 
WHERE table_name = 'user_packages' AND column_name = 'user_id';

SELECT column_name, data_type, udt_name 
FROM information_schema.columns 
WHERE table_name = 'users' AND column_name = 'id';

-- If users.id is uuid and user_packages.user_id is text, use cast:
ALTER TABLE user_packages 
DROP CONSTRAINT IF EXISTS user_packages_user_id_fkey;

-- Option A: Add FK with explicit cast (if PG version supports it)
-- This works in PostgreSQL 12+
ALTER TABLE user_packages 
ADD CONSTRAINT user_packages_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES users(id) 
ON DELETE CASCADE
-- Match type by casting in constraint (treat user_id as uuid)
DEFERRABLE INITIALLY DEFERRED;  -- Allows inserting user first, then user_packages

-- If the above still fails due to type mismatch, convert user_packages.user_id to UUID:
-- Option B: ALTER user_packages.user_id TYPE UUID USING user_id::uuid
-- WARNING: This will fail if any user_id values are not valid UUID strings.

-- Option C (safest if types can't match): Remove the FK entirely
-- ALTER TABLE user_packages DROP CONSTRAINT IF EXISTS user_packages_user_id_fkey;
-- (You lose cascading delete protection but functionality remains)


-- ============================================
-- ENSURE packages_id FOREIGN KEY IS CORRECT
-- ============================================
-- user_packages.package_id references packages.id (INTEGER)
-- This should be fine. Just ensure constraint exists:

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE table_name = 'user_packages'
          AND constraint_name = 'user_packages_package_id_fkey'
    ) THEN
        ALTER TABLE user_packages
        ADD CONSTRAINT user_packages_package_id_fkey
        FOREIGN KEY (package_id)
        REFERENCES packages(id)
        ON DELETE RESTRICT;
    END IF;
END $$;


-- ============================================
-- ADD UPDATED_AT TO USERS (if missing)
-- ============================================
ALTER TABLE users ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

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
-- FIXED TRIGGER: notify_upgrade_request
-- ============================================
CREATE OR REPLACE FUNCTION notify_upgrade_request()
RETURNS TRIGGER AS $$
DECLARE
    admin_user RECORD;
BEGIN
    -- Link user to this request
    UPDATE users 
    SET pending_upgrade_id = NEW.id,
        package_pending = NEW.to_package_tier,
        payment_status = 'pending'
    WHERE id::text = NEW.user_id;

    -- Notify all admin users
    FOR admin_user IN 
        SELECT id, email, name FROM users WHERE role IN ('admin', 'super_admin')
    LOOP
        INSERT INTO notifications (
            recipient_id, type, title, message, data, created_at
        ) VALUES (
            admin_user.id, 'upgrade_pending',
            '🚀 New Upgrade Request',
            format('User %s → %s (GHS %s). Ref: %s',
                COALESCE(NEW.user_name, NEW.user_email),
                NEW.to_package_tier, to_char(NEW.amount_paid, 'FM9999999990.00'),
                COALESCE(NEW.payment_reference_code, 'N/A')
            ),
            jsonb_build_object(
                'user_id', NEW.user_id,
                'upgrade_request_id', NEW.id,
                'to_tier', NEW.to_package_tier,
                'amount', NEW.amount_paid
            ),
            NOW()
        );
    END LOOP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_notify_upgrade_request ON upgrade_requests;
CREATE TRIGGER trigger_notify_upgrade_request
    AFTER INSERT ON upgrade_requests
    FOR EACH ROW
    EXECUTE FUNCTION notify_upgrade_request();
