-- ============================================
-- PACKAGE APPROVAL WORKFLOW - COMPLETE DATABASE SETUP
-- ============================================
-- Execute this entire file in Supabase SQL Editor
-- ============================================

-- 1. Ensure user_packages table structure and constraints
-- Add missing columns to users table
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS package_name TEXT,
ADD COLUMN IF NOT EXISTS payment_pending TEXT;

-- user_packages enhancements: add columns with safe defaults
ALTER TABLE user_packages 
ADD COLUMN IF NOT EXISTS package_tier TEXT NOT NULL DEFAULT 'free',
ADD COLUMN IF NOT EXISTS upgrade_request_id INTEGER REFERENCES upgrade_requests(id);

-- Convert user_packages.user_id from TEXT to UUID to match users.id
-- This is required for the foreign key to work properly
DO $$
BEGIN
    -- Check if user_id is still TEXT
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'user_packages' 
          AND column_name = 'user_id' 
          AND data_type = 'character varying'
    ) THEN
        -- Convert TEXT to UUID using cast (assumes TEXT values are valid UUID strings)
        ALTER TABLE user_packages 
        ALTER COLUMN user_id TYPE UUID 
        USING user_id::UUID;
    END IF;
END $$;

-- Add foreign key to users (check existence first)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE table_name = 'user_packages' 
          AND constraint_name = 'user_packages_user_id_fkey'
    ) THEN
        ALTER TABLE user_packages
        ADD CONSTRAINT user_packages_user_id_fkey 
        FOREIGN KEY (user_id) 
        REFERENCES users(id) 
        ON DELETE CASCADE;
    END IF;
END $$;

-- Add foreign key to packages (check existence first)
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

-- Create/ensure unique index for active packages per user
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes 
        WHERE tablename = 'user_packages' 
          AND indexname = 'idx_user_packages_unique_active'
    ) THEN
        CREATE UNIQUE INDEX idx_user_packages_unique_active 
        ON user_packages(user_id, is_active) 
        WHERE is_active = true;
    END IF;
END $$;

-- 2. AUDIT LOG TABLE
CREATE TABLE IF NOT EXISTS audit_logs (
    id BIGSERIAL PRIMARY KEY,
    table_name TEXT NOT NULL,
    record_id TEXT NOT NULL,
    action TEXT NOT NULL CHECK (action IN ('INSERT', 'UPDATE', 'DELETE', 'APPROVE', 'REJECT', 'ERROR', 'LOGIN', 'LOGOUT')),
    field_name TEXT,
    old_value JSONB,
    new_value JSONB,
    changed_by TEXT NOT NULL,
    reason TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Ensure all required columns exist (in case table was created earlier with fewer columns)
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS ip_address INET;
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS user_agent TEXT;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_audit_logs_table_record ON audit_logs(table_name, record_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_desc ON audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_changed_by ON audit_logs(changed_by);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_changes ON audit_logs(record_id, action) 
WHERE table_name = 'users';

-- Row Level Security
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admin read audit logs" ON audit_logs;
DROP POLICY IF EXISTS "Admin insert audit logs" ON audit_logs;

CREATE POLICY "Admin read audit logs" ON audit_logs 
    FOR SELECT TO authenticated USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE id::text = auth.uid()::text 
            AND role IN ('admin', 'super_admin')
        )
    );

CREATE POLICY "Admin insert audit logs" ON audit_logs 
    FOR INSERT TO authenticated WITH CHECK (
        EXISTS (
            SELECT 1 FROM users 
            WHERE id::text = auth.uid()::text 
            AND role IN ('admin', 'super_admin')
        )
    );

-- Disable RLS for system functions (triggers, etc.)
ALTER TABLE audit_logs DISABLE ROW LEVEL SECURITY;

-- Drop any conflicting log_audit_event definitions to avoid ambiguity
DROP FUNCTION IF EXISTS log_audit_event(TEXT, TEXT, TEXT, TEXT, JSONB, JSONB, TEXT, TEXT, JSONB, INET, TEXT);
DROP FUNCTION IF EXISTS log_audit_event(TEXT, TEXT, TEXT, TEXT, JSONB, JSONB, TEXT, TEXT, JSONB);

-- 3. HELPER FUNCTION: Audit logging
CREATE OR REPLACE FUNCTION log_audit_event(
    p_table_name TEXT,
    p_record_id TEXT,
    p_action TEXT,
    p_changed_by TEXT,
    p_old_value JSONB DEFAULT NULL,
    p_new_value JSONB DEFAULT NULL,
    p_field_name TEXT DEFAULT NULL,
    p_reason TEXT DEFAULT NULL,
    p_metadata JSONB DEFAULT '{}'::jsonb,
    p_ip_address INET DEFAULT NULL,
    p_user_agent TEXT DEFAULT NULL
) RETURNS VOID AS $$
BEGIN
    INSERT INTO audit_logs (
        table_name,
        record_id,
        action,
        field_name,
        old_value,
        new_value,
        changed_by,
        reason,
        metadata,
        ip_address,
        user_agent,
        created_at
    ) VALUES (
        p_table_name,
        p_record_id,
        p_action,
        p_field_name,
        p_old_value,
        p_new_value,
        p_changed_by,
        p_reason,
        p_metadata,
        p_ip_address,
        p_user_agent,
        NOW()
    );
EXCEPTION
    WHEN OTHERS THEN
        -- Silent fail - audit should not break main transaction
        RAISE WARNING 'Audit log failed: % %', SQLERRM, SQLSTATE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. MAIN APPROVAL STORED PROCEDURE
CREATE OR REPLACE FUNCTION approve_package_payment(
    p_request_id INTEGER,
    p_approved_by TEXT,
    p_notes TEXT DEFAULT NULL
) RETURNS JSONB AS $$
DECLARE
    v_request RECORD;
    v_user RECORD;
    v_package RECORD;
    v_old_tier TEXT;
    v_new_tier TEXT;
    v_old_package_name TEXT;
    v_new_package_name TEXT;
    v_user_package_id INTEGER;
    v_error_message TEXT;
    v_result JSONB;
BEGIN
    -- Lock the upgrade request row to prevent concurrent approvals
    SELECT * INTO v_request
    FROM upgrade_requests 
    WHERE id = p_request_id
    FOR UPDATE;
    
    IF v_request IS NULL THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Upgrade request not found',
            'code', 'NOT_FOUND'
        );
    END IF;
    
    IF v_request.status != 'pending' THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', format('Request already %s', v_request.status),
            'code', 'ALREADY_PROCESSED'
        );
    END IF;
    
    -- Get user details with row lock
    SELECT * INTO v_user
    FROM users 
    WHERE id = v_request.user_id::uuid
    FOR UPDATE;
    
    IF v_user IS NULL THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'User not found',
            'code', 'USER_NOT_FOUND'
        );
    END IF;
    
    -- Get package details (by ID if available, else by tier)
    IF v_request.to_package_id IS NOT NULL THEN
        SELECT * INTO v_package
        FROM packages 
        WHERE id = v_request.to_package_id
        AND is_active = true;
    ELSE
        SELECT * INTO v_package
        FROM packages 
        WHERE tier = v_request.to_package_tier
        AND is_active = true;
    END IF;
    
    IF v_package IS NULL THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Package not found or inactive',
            'code', 'PACKAGE_INVALID'
        );
    END IF;
    
    -- Store old and new values
    v_old_tier := COALESCE(v_user.package_tier, 'free');
    v_new_tier := v_package.tier;
    v_old_package_name := COALESCE(v_user.package_name, v_old_tier);
    v_new_package_name := v_package.name;
    
    -- ATOMIC OPERATIONS (wrapped in implicit transaction)
    BEGIN
        -- A. Update upgrade request
        UPDATE upgrade_requests SET
            status = 'approved',
            approved_by = p_approved_by,
            approved_at = NOW(),
            notes = COALESCE(p_notes, notes),
            updated_at = NOW()
        WHERE id = p_request_id;
        
         -- B. Update user record
         UPDATE users SET
             package_tier = v_new_tier,
             package_id = v_package.id,
             package_name = v_new_package_name,
             payment_status = 'confirmed',
             payment_confirmed_at = NOW(),
             payment_confirmed_by = p_approved_by,
             package_expires_at = CASE 
                 WHEN v_package.billing_period = 'lifetime' THEN NULL
                 WHEN v_package.billing_period = 'yearly' THEN NOW() + INTERVAL '1 year'
                 ELSE NOW() + INTERVAL '1 month'
             END,
             pending_upgrade_id = NULL,
             package_pending = NULL,
             updated_at = NOW()
         WHERE id = v_user.id;
        
         -- C. Deactivate old packages and insert new one
         UPDATE user_packages
         SET is_active = false,
             expires_at = NOW()
         WHERE user_id = v_user.id
           AND is_active = true;
         
          -- Insert new package activation
          INSERT INTO user_packages (
              user_id,
              package_id,
              package_tier,
              started_at,
              expires_at,
              is_active,
              auto_renew,
              upgrade_request_id
           ) VALUES (
               v_user.id,
               v_package.id,
               v_new_tier,
               NOW(),
               CASE 
                   WHEN v_package.billing_period = 'lifetime' THEN NULL
                   WHEN v_package.billing_period = 'yearly' THEN NOW() + INTERVAL '1 year'
                   ELSE NOW() + INTERVAL '1 month'
               END,
               true,
               false,
               p_request_id
           ) RETURNING id INTO v_user_package_id;
        
        -- D. Audit: user tier change
        PERFORM log_audit_event(
            'users',
            v_user.id::TEXT,
            'UPDATE',
            p_approved_by,
            jsonb_build_object('package_tier', v_old_tier, 'payment_status', COALESCE(v_user.payment_status, 'pending')),
            jsonb_build_object('package_tier', v_new_tier, 'payment_status', 'confirmed'),
            'package_tier,payment_status',
            format('Upgrade #%s: %s → %s (GHS %s)', 
                p_request_id, v_old_tier, v_new_tier, to_char(v_request.amount_paid, 'FM9999999990.00')),
            jsonb_build_object(
                'upgrade_request_id', p_request_id,
                'package_id', v_request.to_package_id,
                'package_name', v_new_package_name,
                'old_tier', v_old_tier,
                'new_tier', v_new_tier,
                'amount_paid', v_request.amount_paid,
                'payment_method', v_request.payment_method
            )
        );
        
        -- E. Audit: request approval
        PERFORM log_audit_event(
            'upgrade_requests',
            p_request_id::TEXT,
            'APPROVE',
            p_approved_by,
            jsonb_build_object('status', 'pending', 'from_tier', v_request.from_package_tier),
            jsonb_build_object('status', 'approved', 'to_tier', v_new_tier),
            'status',
            COALESCE(p_notes, 'Payment verified'),
            jsonb_build_object('user_id', v_request.user_id)
        );
        
        -- F. Build success result
        v_result := jsonb_build_object(
            'success', true,
            'user_id', v_user.id,
            'user_email', v_request.user_email,
            'old_tier', v_old_tier,
            'new_tier', v_new_tier,
            'old_package_name', v_old_package_name,
            'new_package_name', v_new_package_name,
            'package_id', v_request.to_package_id,
            'user_package_id', v_user_package_id,
            'message', format('Approved: %s upgraded to %s', v_request.user_email, v_new_tier)
        );
        
    EXCEPTION
        WHEN OTHERS THEN
            v_error_message := SQLERRM;
            
            -- Attempt secondary audit log (non-critical)
            BEGIN
                PERFORM log_audit_event(
                    'upgrade_requests',
                    p_request_id::TEXT,
                    'ERROR',
                    p_approved_by,
                    NULL,
                    NULL,
                    NULL,
                    v_error_message,
                    jsonb_build_object('failed_at', NOW())
                );
            EXCEPTION
                WHEN OTHERS THEN
                    -- Ignore secondary errors
                    NULL;
            END;
            
            -- Re-raise to trigger rollback
            RAISE;
    END;
    
    RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. REJECTION PROCEDURE
CREATE OR REPLACE FUNCTION reject_package_payment(
    p_request_id INTEGER,
    p_rejected_by TEXT,
    p_reason TEXT DEFAULT NULL
) RETURNS JSONB AS $$
DECLARE
    v_request RECORD;
    v_user RECORD;
    v_result JSONB;
BEGIN
    SELECT * INTO v_request
    FROM upgrade_requests 
    WHERE id = p_request_id
    FOR UPDATE;
    
    IF v_request IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Upgrade request not found', 'code', 'NOT_FOUND');
    END IF;
    
    IF v_request.status != 'pending' THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', format('Request already %s', v_request.status),
            'code', 'ALREADY_PROCESSED'
        );
    END IF;
    
    SELECT * INTO v_user
    FROM users 
    WHERE id = v_request.user_id::uuid
    FOR UPDATE;
    
    BEGIN
        UPDATE upgrade_requests SET
            status = 'rejected',
            reviewed_by = p_rejected_by,
            reviewed_at = NOW(),
            notes = COALESCE(p_reason, notes),
            updated_at = NOW()
        WHERE id = p_request_id;
        
        -- Keep user's current package, just clear pending flag
        IF v_user IS NOT NULL THEN
            UPDATE users SET
                pending_upgrade_id = NULL,
                package_pending = NULL,
                payment_status = COALESCE(v_user.payment_status, 'pending'),
                updated_at = NOW()
            WHERE id = v_user.id;
        END IF;
        
        -- Audit
        PERFORM log_audit_event(
            'upgrade_requests',
            p_request_id::TEXT,
            'REJECT',
            p_rejected_by,
            jsonb_build_object('status', 'pending', 'from_tier', v_request.from_package_tier),
            jsonb_build_object('status', 'rejected'),
            'status',
            COALESCE(p_reason, 'Payment verification failed'),
            jsonb_build_object('user_id', v_request.user_id, 'attempted_tier', v_request.to_package_tier)
        );
        
        v_result := jsonb_build_object('success', true, 'message', 'Request rejected');
        
    EXCEPTION
        WHEN OTHERS THEN
            PERFORM log_audit_event(
                'upgrade_requests',
                p_request_id::TEXT,
                'ERROR',
                p_rejected_by,
                NULL,
                NULL,
                NULL,
                SQLERRM,
                '{}'::jsonb
            );
            RETURN jsonb_build_object('success', false, 'error', SQLERRM, 'code', 'TRANSACTION_ERROR');
    END;
    
    RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. SYNC FUNCTION
CREATE OR REPLACE FUNCTION sync_user_package_tier(
    p_user_id UUID
) RETURNS JSONB AS $$
DECLARE
    v_user RECORD;
    v_active_package RECORD;
    v_result JSONB;
BEGIN
    SELECT * INTO v_user
    FROM users 
    WHERE id = p_user_id;
    
    IF v_user IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'User not found', 'code', 'NOT_FOUND');
    END IF;
    
    -- Get active subscription
    SELECT p.* INTO v_active_package
    FROM user_packages up
    JOIN packages p ON up.package_id = p.id
    WHERE up.user_id = p_user_id
      AND up.is_active = true
    ORDER BY up.started_at DESC
    LIMIT 1;
    
    IF v_active_package IS NULL THEN
        -- No active package - ensure user is on free
        IF v_user.package_tier != 'free' OR v_user.package_id IS NOT NULL THEN
            UPDATE users 
            SET package_tier = 'free',
                package_id = NULL,
                package_name = 'Free',
                updated_at = NOW()
            WHERE id = p_user_id;
            
            v_result := jsonb_build_object(
                'success', true,
                'action', 'reset_to_free',
                'message', 'User reset to free tier (no active subscription)'
            );
        ELSE
            v_result := jsonb_build_object(
                'success', true,
                'action', 'no_change',
                'message', 'User already on free tier'
            );
        END IF;
    ELSE
        -- Sync to active package
        IF v_user.package_tier != v_active_package.tier THEN
            PERFORM log_audit_event(
                'users',
                p_user_id::TEXT,
                'SYNC',
                'system',
                jsonb_build_object('package_tier', v_user.package_tier),
                jsonb_build_object('package_tier', v_active_package.tier),
                'package_tier',
                'Auto-sync from active subscription'
            );
            
            UPDATE users 
            SET package_tier = v_active_package.tier,
                package_id = v_active_package.id,
                package_name = v_active_package.name,
                updated_at = NOW()
            WHERE id = p_user_id;
        END IF;
        
        v_result := jsonb_build_object(
            'success', true,
            'action', 'synced',
            'tier', v_active_package.tier
        );
    END IF;
    
    RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. AUDIT LOG RETRIEVAL FUNCTION
DROP FUNCTION IF EXISTS get_audit_log_for_user(TEXT, INTEGER);
CREATE OR REPLACE FUNCTION get_audit_log_for_user(
    p_user_id TEXT,
    p_limit INTEGER DEFAULT 50
) RETURNS TABLE (
    id BIGINT,
    table_name TEXT,
    action TEXT,
    field_name TEXT,
    old_value JSONB,
    new_value JSONB,
    reason TEXT,
    changed_by TEXT,
    created_at TIMESTAMP WITH TIME ZONE,
    metadata JSONB
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        a.id,
        a.table_name,
        a.action,
        a.field_name,
        a.old_value,
        a.new_value,
        a.reason,
        a.changed_by,
        a.created_at,
        a.metadata
    FROM audit_logs a
    WHERE 
        a.record_id = p_user_id
         OR EXISTS (
             SELECT 1 FROM upgrade_requests ur 
             WHERE ur.id::TEXT = a.record_id 
               AND ur.user_id::TEXT = p_user_id
         )
    ORDER BY a.created_at DESC
    LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 8. USER PACKAGE HISTORY FUNCTION
CREATE OR REPLACE FUNCTION get_user_package_history(
    p_user_id UUID
) RETURNS TABLE (
    package_tier TEXT,
    started_at TIMESTAMP WITH TIME ZONE,
    expires_at TIMESTAMP WITH TIME ZONE,
    is_active BOOLEAN,
    package_name TEXT,
    upgrade_request_id INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        up.package_tier,
        up.started_at,
        up.expires_at,
        up.is_active,
        p.name as package_name,
        up.upgrade_request_id
    FROM user_packages up
    JOIN packages p ON up.package_id = p.id
    WHERE up.user_id = p_user_id
    ORDER BY up.started_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 9. ENHANCE EXISTING TRIGGER (add audit logging)
-- This augments the existing notify_approval_details trigger
CREATE OR REPLACE FUNCTION notify_approval_details()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.status = 'approved' AND OLD.status != 'approved' THEN
        -- Main notification trigger still works
        -- Additional audit is logged via our stored procedure also
        PERFORM log_audit_event(
            'upgrade_requests',
            NEW.id::TEXT,
            'APPROVE_TRIGGER',
            NEW.approved_by,
            jsonb_build_object('status', OLD.status, 'tier', NEW.from_package_tier),
            jsonb_build_object('status', NEW.status, 'tier', NEW.to_package_tier),
            'status',
            'Auto-approved via trigger (should use RPC instead)',
            jsonb_build_object('trigger_source', 'database_trigger')
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 10. PERFORMANCE INDEXES
CREATE INDEX IF NOT EXISTS idx_upgrade_requests_user_status 
ON upgrade_requests(user_id, status);
CREATE INDEX IF NOT EXISTS idx_upgrade_requests_approval 
ON upgrade_requests(status, approved_at) 
WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_users_package_lookup 
ON users(package_tier, package_id);
CREATE INDEX IF NOT EXISTS idx_user_packages_lookup 
ON user_packages(user_id, is_active, started_at DESC);

-- 11. AUTOMATIC SYNC TRIGGER
-- Keep users.package_tier in sync with active user_packages automatically
CREATE OR REPLACE FUNCTION sync_user_on_package_change()
RETURNS TRIGGER AS $$
BEGIN
    IF (TG_OP = 'UPDATE' AND OLD.is_active IS DISTINCT FROM NEW.is_active)
       OR TG_OP = 'INSERT' THEN
        PERFORM sync_user_package_tier(NEW.user_id);
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_sync_user_on_package_change ON user_packages;
CREATE TRIGGER trigger_sync_user_on_package_change
    AFTER INSERT OR UPDATE OF is_active ON user_packages
    FOR EACH ROW
    EXECUTE FUNCTION sync_user_on_package_change();

-- 12. CLEANUP EXPIRED PACKAGES (run periodically via cron or manual)
-- This function can be scheduled daily
CREATE OR REPLACE FUNCTION cleanup_expired_packages()
RETURNS INTEGER AS $$
DECLARE
    v_count INTEGER;
BEGIN
    -- Deactivate expired packages
    UPDATE user_packages
    SET is_active = false
    WHERE is_active = true
      AND expires_at IS NOT NULL
      AND expires_at < NOW();
      
    GET DIAGNOSTICS v_count = ROW_COUNT;
    
    -- For each affected user, sync to free tier if no other active package
    WITH affected_users AS (
        SELECT DISTINCT user_id
        FROM user_packages
        WHERE is_active = false
    )
    UPDATE users u
    SET package_tier = 'free',
        package_id = NULL,
        package_name = 'Free',
        payment_status = 'expired',
        updated_at = NOW()
    FROM affected_users au
    WHERE u.id = au.user_id
      AND NOT EXISTS (
          SELECT 1 FROM user_packages up 
          WHERE up.user_id = au.user_id 
            AND up.is_active = true
      );
    
    -- Log cleanup
    PERFORM log_audit_event(
        'user_packages',
        'system',
        'CLEANUP',
        'system_cron',
        NULL,
        NULL,
        NULL,
        format('Expired %s packages', v_count)
    );
    
    RETURN v_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 13. PERMISSIONS (GRANT TO ROLES)
-- ============================================
-- IMPORTANT: Grant EXECUTE on RPC functions to appropriate roles.
-- By default, only table owner can execute.
-- 
-- If you are NOT using Supabase Auth for admins, you may need to allow 'anon' role.
-- WARNING: Granting to 'anon' gives ANY visitor ability to call these functions.
-- Only do this if you have frontend auth (as this app does) or you understand risks.
--
-- UNCOMMENT the following lines if needed:

-- GRANT EXECUTE ON FUNCTION approve_package_payment(INTEGER, TEXT, TEXT) TO anon;
-- GRANT EXECUTE ON FUNCTION reject_package_payment(INTEGER, TEXT, TEXT) TO anon;
-- GRANT EXECUTE ON FUNCTION sync_user_package_tier(UUID) TO anon;
-- GRANT EXECUTE ON FUNCTION sync_user_package_tier(UUID) TO authenticated;
-- GRANT EXECUTE ON FUNCTION sync_user_package_tier(UUID) TO service_role;

-- Test: SELECT sync_user_package_tier('00000000-0000-0000-0000-000000000000'::uuid);

-- 11. PERMISSIONS (run as superuser if needed)
-- GRANT USAGE ON SCHEMA public TO service_role;
-- GRANT EXECUTE ON FUNCTION approve_package_payment(INTEGER, TEXT, TEXT) TO service_role;
-- GRANT EXECUTE ON FUNCTION reject_package_payment(INTEGER, TEXT, TEXT) TO service_role;
-- GRANT EXECUTE ON FUNCTION sync_user_package_tier(UUID) TO service_role;
-- GRANT EXECUTE ON FUNCTION get_audit_log_for_user(TEXT, INTEGER) TO service_role;
-- GRANT EXECUTE ON FUNCTION get_user_package_history(UUID) TO service_role;

-- ============================================
-- VERIFICATION QUERIES
-- ============================================
-- test: SELECT * FROM approve_package_payment(1, 'admin_test', 'Test approval');
-- test: SELECT * FROM reject_package_payment(1, 'admin_test', 'Test rejection');
-- test: SELECT * FROM sync_user_package_tier('user123');
-- test: SELECT * FROM get_audit_log_for_user('user123', 10);
