-- ============================================
-- SIMPLIFIED PACKAGE APPROVAL WORKFLOW
-- Safe for all PostgreSQL versions (including Supabase)
-- ============================================

-- 1. AUDIT LOGS TABLE (Required for tracking)
CREATE TABLE IF NOT EXISTS audit_logs (
    id BIGSERIAL PRIMARY KEY,
    table_name TEXT NOT NULL,
    record_id TEXT NOT NULL,
    action TEXT NOT NULL,
    field_name TEXT,
    old_value JSONB,
    new_value JSONB,
    changed_by TEXT NOT NULL,
    reason TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for audit queries
CREATE INDEX IF NOT EXISTS idx_audit_logs_table_record ON audit_logs(table_name, record_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created ON audit_logs(created_at DESC);

-- Row Level Security (admins only)
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admin read audit logs" ON audit_logs;
CREATE POLICY "Admin read audit logs" ON audit_logs 
    FOR SELECT TO authenticated USING (
        EXISTS (SELECT 1 FROM users WHERE id::text = auth.uid()::text AND role IN ('admin','super_admin'))
    );
ALTER TABLE audit_logs DISABLE ROW LEVEL SECURITY;  -- allow triggers to write


-- 2. HELPER: Audit logging function
DROP FUNCTION IF EXISTS log_audit_event(TEXT, TEXT, TEXT, TEXT, JSONB, JSONB, TEXT, TEXT, JSONB, INET, TEXT);
DROP FUNCTION IF EXISTS log_audit_event(TEXT, TEXT, TEXT, TEXT, JSONB, JSONB, TEXT, TEXT, JSONB);
CREATE OR REPLACE FUNCTION log_audit_event(
    p_table_name TEXT, p_record_id TEXT, p_action TEXT, p_changed_by TEXT,
    p_old_value JSONB DEFAULT NULL, p_new_value JSONB DEFAULT NULL,
    p_field_name TEXT DEFAULT NULL, p_reason TEXT DEFAULT NULL, p_metadata JSONB DEFAULT '{}'::jsonb,
    p_ip_address INET DEFAULT NULL, p_user_agent TEXT DEFAULT NULL
) RETURNS VOID AS $$
BEGIN
    INSERT INTO audit_logs (
        table_name, record_id, action, field_name,
        old_value, new_value, changed_by, reason,
        metadata, ip_address, user_agent, created_at
    ) VALUES (
        p_table_name, p_record_id, p_action, p_field_name,
        p_old_value, p_new_value, p_changed_by, p_reason,
        p_metadata, p_ip_address, p_user_agent, NOW()
    );
EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'Audit log failed: %', SQLERRM;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- 3. MAIN APPROVAL FUNCTION (Atomic, with error handling)
CREATE OR REPLACE FUNCTION approve_package_payment(
    p_request_id INTEGER, p_approved_by TEXT, p_notes TEXT DEFAULT NULL
) RETURNS JSONB AS $$
DECLARE
    v_req RECORD; v_usr RECORD; v_pkg RECORD;
    v_old_tier TEXT; v_new_tier TEXT; v_pkg_name TEXT;
BEGIN
    -- Lock request row
    SELECT * INTO v_req FROM upgrade_requests WHERE id = p_request_id FOR UPDATE;
    IF v_req IS NULL OR v_req.status != 'pending' THEN
        RETURN jsonb_build_object('success', false, 'error', 'Invalid or already processed request');
    END IF;

    -- Lock user row
    SELECT * INTO v_usr FROM users WHERE id::text = v_req.user_id FOR UPDATE;
    IF v_usr IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'User not found');
    END IF;

    -- Get package (by ID if available, else by tier)
    IF v_req.to_package_id IS NOT NULL THEN
        SELECT * INTO v_pkg FROM packages WHERE id = v_req.to_package_id AND is_active = true;
    ELSE
        SELECT * INTO v_pkg FROM packages WHERE tier = v_req.to_package_tier AND is_active = true;
    END IF;
    IF v_pkg IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Package not found or inactive');
    END IF;

    v_old_tier := COALESCE(v_usr.package_tier, 'free');
    v_new_tier := v_pkg.tier;
    v_pkg_name := v_pkg.name;

    -- ATOMIC transaction
    BEGIN
        -- A. Mark request approved
        UPDATE upgrade_requests SET
            status = 'approved', approved_by = p_approved_by,
            approved_at = NOW(), notes = COALESCE(p_notes, notes), updated_at = NOW()
        WHERE id = p_request_id;

        -- B. Update user
        UPDATE users SET
            package_tier = v_new_tier, package_id = v_req.to_package_id,
            package_name = v_pkg_name, payment_status = 'confirmed',
            payment_confirmed_at = NOW(), payment_confirmed_by = p_approved_by,
            pending_upgrade_id = NULL, package_pending = NULL,
            package_expires_at = CASE v_pkg.billing_period
                WHEN 'lifetime' THEN NULL
                WHEN 'yearly' THEN NOW() + INTERVAL '1 year'
                ELSE NOW() + INTERVAL '1 month'
            END,
            updated_at = NOW()
        WHERE id::text = v_req.user_id;

        -- C. Deactivate old subscriptions
        UPDATE user_packages SET is_active = false, expires_at = NOW()
        WHERE user_id = v_usr.id AND is_active = true;

        -- D. Insert new active subscription
        INSERT INTO user_packages (
            user_id, package_id, package_tier, started_at, expires_at, is_active, upgrade_request_id
        ) VALUES (
            v_usr.id, v_req.to_package_id, v_new_tier, NOW(),
            CASE v_pkg.billing_period
                WHEN 'lifetime' THEN NULL
                WHEN 'yearly' THEN NOW() + INTERVAL '1 year'
                ELSE NOW() + INTERVAL '1 month'
            END,
            true, p_request_id
        );

        -- E. Audit: user tier change
        PERFORM log_audit_event(
            'users', v_usr.id, 'UPDATE', p_approved_by,
            jsonb_build_object('package_tier', v_old_tier, 'payment_status', COALESCE(v_usr.payment_status, 'pending')),
            jsonb_build_object('package_tier', v_new_tier, 'payment_status', 'confirmed'),
            'package_tier,payment_status',
            format('Approved #%s: %s → %s (GHS %s)', p_request_id, v_old_tier, v_new_tier, to_char(v_req.amount_paid, 'FM9999999990.00')),
            jsonb_build_object('upgrade_request_id', p_request_id, 'amount', v_req.amount_paid)
        );

        -- F. Audit: request approval
        PERFORM log_audit_event(
            'upgrade_requests', p_request_id::TEXT, 'APPROVE', p_approved_by,
            jsonb_build_object('status', 'pending'),
            jsonb_build_object('status', 'approved', 'to_tier', v_new_tier),
            'status', COALESCE(p_notes, 'Payment verified'),
            jsonb_build_object('user_id', v_req.user_id)
        );

        RETURN jsonb_build_object(
            'success', true, 'user_id', v_usr.id,
            'old_tier', v_old_tier, 'new_tier', v_new_tier,
            'package_name', v_pkg_name,
            'message', format('Approved: %s upgraded to %s', v_req.user_email, v_new_tier)
        );
    EXCEPTION
        WHEN OTHERS THEN
            PERFORM log_audit_event('upgrade_requests', p_request_id::TEXT, 'ERROR', p_approved_by, NULL, NULL, NULL, SQLERRM);
            RETURN jsonb_build_object('success', false, 'error', SQLERRM, 'code', 'TRANSACTION_ERROR');
    END;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- 4. REJECTION FUNCTION
CREATE OR REPLACE FUNCTION reject_package_payment(
    p_request_id INTEGER, p_rejected_by TEXT, p_reason TEXT DEFAULT NULL
) RETURNS JSONB AS $$
DECLARE
    v_req RECORD; v_usr RECORD;
BEGIN
    SELECT * INTO v_req FROM upgrade_requests WHERE id = p_request_id FOR UPDATE;
    IF v_req IS NULL OR v_req.status != 'pending' THEN
        RETURN jsonb_build_object('success', false, 'error', 'Invalid request');
    END IF;

    SELECT * INTO v_usr FROM users WHERE id::text = v_req.user_id FOR UPDATE;

    BEGIN
        UPDATE upgrade_requests SET
            status = 'rejected', reviewed_by = p_rejected_by, reviewed_at = NOW(),
            notes = COALESCE(p_reason, notes), updated_at = NOW()
        WHERE id = p_request_id;

        IF v_usr IS NOT NULL THEN
            UPDATE users SET pending_upgrade_id = NULL, package_pending = NULL, updated_at = NOW()
            WHERE id = v_usr.id;
        END IF;

        PERFORM log_audit_event(
            'upgrade_requests', p_request_id::TEXT, 'REJECT', p_rejected_by,
            jsonb_build_object('status', 'pending'),
            jsonb_build_object('status', 'rejected'),
            'status', COALESCE(p_reason, 'Payment verification failed'),
            jsonb_build_object('user_id', v_req.user_id)
        );

        RETURN jsonb_build_object('success', true, 'message', 'Request rejected');
    EXCEPTION
        WHEN OTHERS THEN
            RETURN jsonb_build_object('success', false, 'error', SQLERRM);
    END;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- 5. SYNC FUNCTION
CREATE OR REPLACE FUNCTION sync_user_package_tier(p_user_id TEXT) RETURNS JSONB AS $$
DECLARE
    v_usr RECORD; v_active RECORD;
BEGIN
    SELECT * INTO v_usr FROM users WHERE id::text = p_user_id;
    IF v_usr IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'User not found');
    END IF;

    SELECT p.* INTO v_active
    FROM user_packages up JOIN packages p ON up.package_id = p.id
    WHERE up.user_id = p_user_id AND up.is_active = true
    ORDER BY up.started_at DESC LIMIT 1;

    IF v_active IS NULL THEN
        IF v_usr.package_tier != 'free' THEN
            UPDATE users SET package_tier = 'free', package_id = NULL, package_name = 'Free', updated_at = NOW()
            WHERE id::text = p_user_id;
            RETURN jsonb_build_object('success', true, 'action', 'reset_to_free');
        ELSE
            RETURN jsonb_build_object('success', true, 'action', 'no_change');
        END IF;
    ELSE
        IF v_usr.package_tier != v_active.tier THEN
            PERFORM log_audit_event('users', p_user_id, 'SYNC', 'system',
                jsonb_build_object('package_tier', v_usr.package_tier),
                jsonb_build_object('package_tier', v_active.tier),
                'package_tier', 'Auto-sync from active subscription');
            UPDATE users SET package_tier = v_active.tier, package_id = v_active.id, package_name = v_active.name, updated_at = NOW()
            WHERE id::text = p_user_id;
            RETURN jsonb_build_object('success', true, 'action', 'synced', 'new_tier', v_active.tier);
        ELSE
            RETURN jsonb_build_object('success', true, 'action', 'already_synced');
        END IF;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- 6. AUDIT RETRIEVAL
DROP FUNCTION IF EXISTS get_audit_log_for_user(TEXT, INTEGER);
CREATE OR REPLACE FUNCTION get_audit_log_for_user(p_user_id TEXT, p_limit INTEGER DEFAULT 50)
RETURNS TABLE (
    id BIGINT, table_name TEXT, action TEXT, field_name TEXT,
    old_value JSONB, new_value JSONB, reason TEXT, changed_by TEXT, created_at TIMESTAMPTZ, metadata JSONB
) AS $$
BEGIN
    RETURN QUERY
    SELECT a.* FROM audit_logs a
    WHERE a.record_id = p_user_id
       OR EXISTS (SELECT 1 FROM upgrade_requests ur WHERE ur.id::TEXT = a.record_id AND ur.user_id = p_user_id)
    ORDER BY a.created_at DESC LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- 7. TRIGGER FOR NOTIFICATION (compatible with existing system)
-- This augments the existing trigger from packages_database.sql
CREATE OR REPLACE FUNCTION notify_and_audit_approval()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.status = 'approved' AND OLD.status != 'approved' THEN
        -- Add audit entry
        PERFORM log_audit_event(
            'upgrade_requests', NEW.id::TEXT, 'APPROVED', NEW.approved_by,
            jsonb_build_object('status', OLD.status, 'from_tier', NEW.from_package_tier),
            jsonb_build_object('status', NEW.status, 'to_tier', NEW.to_package_tier),
            'status', format('User %s upgraded from %s to %s', NEW.user_email, NEW.from_package_tier, NEW.to_package_tier),
            jsonb_build_object('user_id', NEW.user_id)
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_audit_approval ON upgrade_requests;
CREATE TRIGGER trigger_audit_approval
    AFTER UPDATE ON upgrade_requests
    FOR EACH ROW
    WHEN (OLD.status IS DISTINCT FROM NEW.status)
    EXECUTE FUNCTION notify_and_audit_approval();


-- 8. PERFORMANCE INDEXES
CREATE INDEX IF NOT EXISTS idx_upgrade_requests_user_status ON upgrade_requests(user_id, status);
CREATE INDEX IF NOT EXISTS idx_upgrade_requests_pending ON upgrade_requests(status) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_users_package_lookup ON users(package_tier, package_id);
CREATE INDEX IF NOT EXISTS idx_user_packages_active ON user_packages(user_id, is_active) WHERE is_active = true;


-- 9. PERMISSIONS (UNCOMMENT AS NEEDED)
-- If your frontend uses the 'anon' key and you need to call RPC from client:
-- GRANT EXECUTE ON FUNCTION approve_package_payment TO anon;
-- GRANT EXECUTE ON FUNCTION reject_package_payment TO anon;
-- GRANT EXECUTE ON FUNCTION sync_user_package_tier TO anon;
-- GRANT EXECUTE ON FUNCTION get_audit_log_for_user TO anon;
--
-- If using Supabase Auth (recommended), grant to 'authenticated':
-- GRANT EXECUTE ON FUNCTION approve_package_payment TO authenticated;
-- (same for other functions)


-- ============================================
-- TESTS
-- ============================================
-- After running this script, test:
-- 1. SELECT approve_package_payment(1, 'admin_test', 'test');
-- 2. SELECT * FROM audit_logs ORDER BY created_at DESC LIMIT 5;
-- 3. In Supabase Dashboard → Replication → confirm "Realtime" is ON
