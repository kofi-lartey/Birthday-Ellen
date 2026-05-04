-- ============================================
-- PACKAGE APPROVAL WORKFLOW
-- ============================================
-- This module implements a complete backend logic workflow for admin approval
-- of package payments with transaction integrity, error handling, and audit logging.
--
-- USAGE:
-- CALL approve_package_payment(
--   request_id INT,
--   approved_by TEXT,
--   approval_notes TEXT DEFAULT NULL
-- );
-- ============================================

-- 1. Ensure user_packages table has proper structure and constraints
ALTER TABLE user_packages 
ADD COLUMN IF NOT EXISTS package_tier TEXT NOT NULL DEFAULT 'free',
ADD COLUMN IF NOT EXISTS upgrade_request_id INTEGER REFERENCES upgrade_requests(id);

-- Add unique constraint to prevent duplicate active packages per user
CREATE UNIQUE INDEX IF NOT EXISTS idx_user_packages_unique_active 
ON user_packages(user_id, is_active) 
WHERE is_active = true;

-- Improve foreign key relationship with users
ALTER TABLE user_packages
DROP CONSTRAINT IF EXISTS user_packages_user_id_fkey;

ALTER TABLE user_packages
ADD CONSTRAINT user_packages_user_id_fkey 
FOREIGN KEY (user_id) 
REFERENCES users(id) 
ON DELETE CASCADE;

-- ============================================
-- 2. AUDIT LOG TABLE FOR TIER CHANGES
-- ============================================
CREATE TABLE IF NOT EXISTS audit_logs (
    id BIGSERIAL PRIMARY KEY,
    table_name TEXT NOT NULL,
    record_id TEXT NOT NULL,
    action TEXT NOT NULL CHECK (action IN ('INSERT', 'UPDATE', 'DELETE', 'APPROVE', 'REJECT')),
    field_name TEXT, -- NULL means entire record
    old_value JSONB,
    new_value JSONB,
    changed_by TEXT NOT NULL,
    reason TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for audit queries
CREATE INDEX IF NOT EXISTS idx_audit_logs_table_record 
ON audit_logs(table_name, record_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created 
ON audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_changed_by 
ON audit_logs(changed_by);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action 
ON audit_logs(action);

-- RLS policies
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

-- Temporarily disable RLS for triggers
ALTER TABLE audit_logs DISABLE ROW LEVEL SECURITY;

-- ============================================
-- 3. HELPER FUNCTION: Log audit events
-- ============================================
DROP FUNCTION IF EXISTS log_audit_event(TEXT, TEXT, TEXT, TEXT, JSONB, JSONB, TEXT, TEXT, JSONB, INET, TEXT);
DROP FUNCTION IF EXISTS log_audit_event(TEXT, TEXT, TEXT, TEXT, JSONB, JSONB, TEXT, TEXT, JSONB);
CREATE OR REPLACE FUNCTION log_audit_event(
    p_table_name TEXT,
    p_record_id TEXT,
    p_action TEXT,
    p_changed_by TEXT,
    p_old_value JSONB DEFAULT NULL,
    p_new_value JSONB DEFAULT NULL,
    p_field_name TEXT DEFAULT NULL,
    p_reason TEXT DEFAULT NULL,
    p_metadata JSONB DEFAULT '{}',
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
        -- Log error but don't fail the transaction
        RAISE WARNING 'Audit log failed: %', SQLERRM;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- 4. PACKAGE APPROVAL STORED PROCEDURE
-- ============================================
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
    -- Start transaction (in PostgreSQL, functions run in transaction context)
    
    -- 1. Lock the upgrade request row to prevent concurrent approvals
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
    
    -- 2. Get user details with row lock
    SELECT * INTO v_user
    FROM users 
    WHERE id::text = v_request.user_id
    FOR UPDATE;
    
    IF v_user IS NULL THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'User not found',
            'code', 'USER_NOT_FOUND'
        );
    END IF;
    
    -- 3. Get package details (by ID if available, else by tier)
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
    
    -- Store old and new tier values
    v_old_tier := COALESCE(v_user.package_tier, 'free');
    v_new_tier := v_package.tier;
    v_old_package_name := COALESCE(v_user.package_name, v_old_tier);
    v_new_package_name := v_package.name;
    
    -- 4. BEGIN ATOMIC OPERATIONS
    BEGIN
        -- A. Update upgrade request status
        UPDATE upgrade_requests SET
            status = 'approved',
            approved_by = p_approved_by,
            approved_at = NOW(),
            notes = COALESCE(p_notes, notes),
            updated_at = NOW()
        WHERE id = p_request_id;
        
        -- B. Update user's package tier and payment status
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
            payment_pending = NULL,
            updated_at = NOW()
        WHERE id::text = v_request.user_id;
        
        -- C. Create/update user_packages entry (subscription tracking)
        -- Deactivate existing packages
        UPDATE user_packages
        SET is_active = false,
            expires_at = NOW(),
            updated_at = NOW()
        WHERE user_id = v_user.id
          AND is_active = true;
        
        -- Insert new active package
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
        
        -- D. Audit log for user tier change (comprehensive)
        PERFORM log_audit_event(
            p_table_name := 'users',
            p_record_id := v_user.id::TEXT,
            p_action := 'UPDATE',
            p_changed_by := p_approved_by,
            p_old_value := jsonb_build_object(
                'package_tier', v_old_tier,
                'package_name', v_old_package_name,
                'payment_status', v_user.payment_status
            ),
            p_new_value := jsonb_build_object(
                'package_tier', v_new_tier,
                'package_name', v_new_package_name,
                'payment_status', 'confirmed'
            ),
            p_field_name := 'package_tier,package_name,payment_status',
            p_reason := format('Approved upgrade request #%s: %s → %s (GHS %s)', 
                p_request_id, v_old_tier, v_new_tier, to_char(v_request.amount_paid, 'FM9999999990.00')),
            p_metadata := jsonb_build_object(
                'upgrade_request_id', p_request_id,
                'package_id', v_request.to_package_id,
                'package_name', v_new_package_name,
                'from_tier', v_old_tier,
                'to_tier', v_new_tier,
                'amount_paid', v_request.amount_paid,
                'payment_method', v_request.payment_method,
                'transaction_id', v_request.transaction_id,
                'payment_reference_code', v_request.payment_reference_code,
                'user_package_id', v_user_package_id,
                'billing_period', v_package.billing_period
            )
        );
        
        -- E. Audit log for upgrade request status change
        PERFORM log_audit_event(
            p_table_name := 'upgrade_requests',
            p_record_id := p_request_id::TEXT,
            p_action := 'APPROVE',
            p_changed_by := p_approved_by,
            p_old_value := jsonb_build_object('status', 'pending'),
            p_new_value := jsonb_build_object(
                'status', 'approved',
                'approved_by', p_approved_by,
                'approved_at', NOW()
            ),
            p_field_name := 'status',
            p_reason := COALESCE(p_notes, 'Payment verified and package activated'),
            p_metadata := jsonb_build_object(
                'user_id', v_request.user_id,
                'user_email', v_request.user_email,
                'user_name', v_request.user_name,
                'from_tier', v_request.from_package_tier,
                'to_tier', v_new_tier,
                'amount', v_request.amount_paid,
                'payment_method', v_request.payment_method
            )
        );
        
        -- F. Create user notification (also done by trigger, explicit is safe)
        INSERT INTO notifications (
            recipient_id,
            type,
            title,
            message,
            data,
            created_at
        ) VALUES (
            v_request.user_id,
            'upgrade_approved',
            '✅ Package Upgrade Approved!',
            format('Your package has been upgraded from %s to %s. Enjoy your new features!', 
                v_old_tier, v_new_tier),
            jsonb_build_object(
                'upgrade_request_id', p_request_id,
                'old_tier', v_old_tier,
                'new_tier', v_new_tier,
                'package_name', v_new_package_name,
                'approved_by', p_approved_by,
                'approved_at', NOW()
            ),
            NOW()
        ) ON CONFLICT DO NOTHING;
        
        -- G. Return comprehensive result
        v_result := jsonb_build_object(
            'success', true,
            'user_id', v_user.id,
            'old_tier', v_old_tier,
            'new_tier', v_new_tier,
            'old_package_name', v_old_package_name,
            'new_package_name', v_new_package_name,
            'package_id', v_request.to_package_id,
            'package_name', v_new_package_name,
            'user_package_id', v_user_package_id,
            'message', format('User %s upgraded from %s to %s successfully', 
                v_request.user_email, v_old_tier, v_new_tier),
            'audit_log_created', true
        );
        
    EXCEPTION
        WHEN OTHERS THEN
            -- Capture error details
            v_error_message := SQLERRM;
            
            -- Rollback happens automatically
            
            -- Log the error in audit (will be rolled back too, but let's try)
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
                    jsonb_build_object('failed_at', NOW(), 'request_id', p_request_id)
                );
            EXCEPTION
                WHEN OTHERS THEN
                    -- Silent fail for audit log
                    RAISE WARNING 'Secondary audit log failed: %', SQLERRM;
            END;
            
            -- Return error
            v_result := jsonb_build_object(
                'success', false,
                'error', v_error_message,
                'code', 'TRANSACTION_ERROR'
            );
            
            RAISE;
    END;
    
    RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 5. REJECTION WORKFLOW FUNCTION
-- ============================================
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
    -- Lock the request
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
    
    -- Get user
    SELECT * INTO v_user
    FROM users 
    WHERE id::text = v_request.user_id
    FOR UPDATE;
    
    BEGIN
        -- Update request status
        UPDATE upgrade_requests SET
            status = 'rejected',
            reviewed_by = p_rejected_by,
            reviewed_at = NOW(),
            notes = COALESCE(p_reason, notes),
            updated_at = NOW()
        WHERE id = p_request_id;
        
        -- Don't downgrade user - keep current package
        -- Just ensure payment_status stays pending/failed
        IF v_user IS NOT NULL THEN
            UPDATE users SET
                payment_status = 'rejected',
                package_pending = NULL,
                pending_upgrade_id = NULL,
                updated_at = NOW()
            WHERE id = v_user.id;
        END IF;
        
        -- Audit log
        PERFORM log_audit_event(
            'upgrade_requests',
            p_request_id::TEXT,
            'REJECT',
            p_rejected_by,
            jsonb_build_object('status', 'pending'),
            jsonb_build_object('status', 'rejected'),
            'status',
            COALESCE(p_reason, 'Payment verification failed'),
            jsonb_build_object('user_id', v_request.user_id)
        );
        
        v_result := jsonb_build_object(
            'success', true,
            'message', 'Upgrade request rejected'
        );
        
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
                '{}'
            );
            RETURN jsonb_build_object(
                'success', false,
                'error', SQLERRM,
                'code', 'TRANSACTION_ERROR'
            );
    END;
    
    RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 6. REAL-TIME NOTIFICATION TRIGGER (Enhanced)
-- ============================================
CREATE OR REPLACE FUNCTION notify_approval_details()
RETURNS TRIGGER AS $$
DECLARE
    user_record RECORD;
    package_record RECORD;
    old_tier TEXT;
    notification_data JSONB;
BEGIN
    -- Only trigger on status change to 'approved'
    IF NEW.status = 'approved' AND OLD.status != 'approved' THEN
        
        -- Get user details
        SELECT * INTO user_record
        FROM users 
        WHERE id::text = NEW.user_id;
        
        -- Get package details
        SELECT * INTO package_record
        FROM packages 
        WHERE id = NEW.to_package_id;
        
        -- Build comprehensive notification data
        notification_data := jsonb_build_object(
            'user_id', NEW.user_id,
            'user_name', NEW.user_name,
            'user_email', NEW.user_email,
            'from_tier', NEW.from_package_tier,
            'to_tier', NEW.to_package_tier,
            'package_id', NEW.to_package_id,
            'amount', NEW.amount_paid,
            'payment_method', NEW.payment_method,
            'transaction_id', NEW.transaction_id,
            'payment_reference_code', NEW.payment_reference_code,
            'approved_by', NEW.approved_by,
            'approved_at', NEW.approved_at,
            'upgrade_request_id', NEW.id
        );
        
        -- Create notification for the user (they already have a trigger for this)
        -- This trigger adds extra metadata
        
        -- Also log to audit
        PERFORM log_audit_event(
            'upgrade_requests',
            NEW.id::TEXT,
            'APPROVE',
            NEW.approved_by,
            jsonb_build_object('from_tier', NEW.from_package_tier),
            jsonb_build_object('to_tier', NEW.to_package_tier, 'status', 'approved'),
            'status',
            format('Payment verified. User upgraded from %s to %s', 
                NEW.from_package_tier, NEW.to_package_tier),
            notification_data
        );
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop and recreate trigger
DROP TRIGGER IF EXISTS trigger_audit_approval ON upgrade_requests;
CREATE TRIGGER trigger_audit_approval
    AFTER UPDATE ON upgrade_requests
    FOR EACH ROW
    WHEN (OLD.status IS DISTINCT FROM NEW.status)
    EXECUTE FUNCTION notify_approval_details();

-- ============================================
-- 7. RETRIEVE AUDIT LOG FUNCTION
-- ============================================
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
    created_at TIMESTAMP WITH TIME ZONE
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
        a.created_at
    FROM audit_logs a
    WHERE 
        -- Direct user changes
        a.record_id = p_user_id
        OR
        -- Via upgrade request
        EXISTS (
            SELECT 1 FROM upgrade_requests ur 
            WHERE ur.id::TEXT = a.record_id 
            AND ur.user_id = p_user_id
        )
    ORDER BY a.created_at DESC
    LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 8. SYNC FUNCTION FOR REAL-TIME INTEGRATION
-- ============================================
CREATE OR REPLACE FUNCTION sync_user_package_tier(
    p_user_id TEXT
) RETURNS JSONB AS $$
DECLARE
    v_user RECORD;
    v_active_package RECORD;
    v_result JSONB;
BEGIN
    -- Get user
    SELECT * INTO v_user
    FROM users 
    WHERE id::text = p_user_id;
    
    IF v_user IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'User not found');
    END IF;
    
    -- Get active package from user_packages
    SELECT p.* INTO v_active_package
    FROM user_packages up
    JOIN packages p ON up.package_id = p.id
    WHERE up.user_id = p_user_id
      AND up.is_active = true
    ORDER BY up.started_at DESC
    LIMIT 1;
    
    -- If no active package, set to 'free'
    IF v_active_package IS NULL THEN
        IF v_user.package_tier != 'free' THEN
            UPDATE users 
            SET package_tier = 'free', updated_at = NOW()
            WHERE id::text = p_user_id;
            
            v_result := jsonb_build_object(
                'success', true,
                'action', 'reset_to_free',
                'message', 'User package tier reset to free'
            );
        ELSE
            v_result := jsonb_build_object(
                'success', true,
                'action', 'no_change',
                'message', 'User already on free tier'
            );
        END IF;
    ELSE
        -- Sync with active package
        IF v_user.package_tier != v_active_package.tier THEN
            UPDATE users 
            SET package_tier = v_active_package.tier,
                package_id = v_active_package.id,
                updated_at = NOW()
            WHERE id::text = p_user_id;
            
            v_result := jsonb_build_object(
                'success', true,
                'action', 'synced',
                'old_tier', v_user.package_tier,
                'new_tier', v_active_package.tier
            );
        ELSE
            v_result := jsonb_build_object(
                'success', true,
                'action', 'already_synced'
            );
        END IF;
    END IF;
    
    RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 9. CLEANUP AND FINAL INDEXES
-- ============================================
-- Add foreign key from upgrade_requests to user_packages
ALTER TABLE upgrade_requests
ADD COLUMN IF NOT EXISTS user_package_id INTEGER REFERENCES user_packages(id);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_user_packages_user_active 
ON user_packages(user_id, is_active) 
WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_audit_logs_user_changes 
ON audit_logs(record_id, action) 
WHERE table_name = 'users';

-- ============================================
-- 10. GRANT PERMISSIONS (if using separate service role)
-- ============================================
-- GRANT EXECUTE ON FUNCTION approve_package_payment(INTEGER, TEXT, TEXT) TO service_role;
-- GRANT EXECUTE ON FUNCTION reject_package_payment(INTEGER, TEXT, TEXT) TO service_role;
-- GRANT EXECUTE ON FUNCTION sync_user_package_tier(TEXT) TO service_role;
-- GRANT EXECUTE ON FUNCTION log_audit_event(...) TO service_role;

-- ============================================
-- USAGE EXAMPLE:
-- ============================================
-- -- Approve a payment
-- SELECT approve_package_payment(
--     request_id := 1,
--     approved_by := 'admin_123',
--     p_notes := 'Payment verified via MoMo. Reference: B2476'
-- );

-- -- Reject a payment  
-- SELECT reject_package_payment(
--     request_id := 2,
--     rejected_by := 'admin_123',
--     p_reason := 'Invalid payment proof'
-- );

-- -- View audit log for user
-- SELECT * FROM get_audit_log_for_user('user_abc123', 20);
