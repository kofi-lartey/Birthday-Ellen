-- ============================================
-- DIAGNOSTIC & FIX: Package not found or inactive
-- ============================================
-- Run these queries in Supabase SQL Editor to diagnose and fix the issue
-- ============================================

-- STEP 1: Check current packages
-- Expected: 4 active packages (free, basic, premium, enterprise)
SELECT id, name, tier, is_active, display_order 
FROM packages 
WHERE is_active = true 
ORDER BY display_order;

-- STEP 2: Check pending upgrade requests and their package references
SELECT 
    ur.id,
    ur.user_email,
    ur.to_package_tier,
    ur.to_package_id,
    p.id AS package_matches_by_id,
    p2.id AS package_matches_by_tier,
    p.is_active AS package_active_by_id,
    p2.is_active AS package_active_by_tier
FROM upgrade_requests ur
LEFT JOIN packages p ON ur.to_package_id = p.id AND p.is_active = true
LEFT JOIN packages p2 ON ur.to_package_tier = p2.tier AND p2.is_active = true
WHERE ur.status = 'pending'
ORDER BY ur.created_at DESC;

-- STEP 3: Check if packages match any pending request (the actual diagnostic)
-- This will show which requests would fail
SELECT 
    ur.id,
    ur.user_email,
    ur.to_package_tier,
    ur.to_package_id,
    CASE 
        WHEN p.id IS NULL AND p2.id IS NULL THEN 'FAILS: No matching active package'
        WHEN p.id IS NULL AND p2.id IS NOT NULL THEN 'Would use tier lookup (to_package_id is NULL)'
        WHEN p.id IS NOT NULL THEN 'OK: Found by to_package_id'
        ELSE 'UNKNOWN'
    END AS status_check
FROM upgrade_requests ur
LEFT JOIN packages p ON ur.to_package_id = p.id AND p.is_active = true
LEFT JOIN packages p2 ON ur.to_package_tier = p2.tier AND p2.is_active = true
WHERE ur.status = 'pending';

-- STEP 4: Check RLS on packages table
SELECT 
    relname,
    relrowsecurity as rls_enabled
FROM pg_class 
WHERE relname = 'packages';

-- STEP 5: Check policies on packages
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE tablename = 'packages';

-- STEP 6: Get the actual stored procedure code
SELECT pg_get_functiondef(p.oid) as function_definition
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public' 
  AND p.proname = 'approve_package_payment';

-- STEP 7: Check if function has SECURITY DEFINER
SELECT
    proname,
    prosecdef as is_security_definer,
    pg_get_userbyid(proowner) as owner
FROM pg_proc
WHERE proname = 'approve_package_payment';

-- ============================================
-- FIXES
-- ============================================

-- FIX A: Ensure packages table has correct data (run if packages are missing)
-- This inserts the default packages if they don't exist
INSERT INTO packages (name, tier, description, price, allow_birthday_pages, max_photos_per_page, max_pages, allow_music_player, allow_gift_registry, display_order, is_featured, is_active)
VALUES 
    ('Free', 'free', 'Perfect for trying out our platform.', 0.00, true, 5, 1, false, false, 1, false, true)
ON CONFLICT (tier) DO UPDATE SET 
    name = EXCLUDED.name,
    is_active = true,
    display_order = EXCLUDED.display_order;

INSERT INTO packages (name, tier, description, price, allow_birthday_pages, allow_wedding_pages, max_photos_per_page, max_videos_per_page, max_pages, allow_music_player, allow_gift_registry, display_order, is_featured, is_active)
VALUES 
    ('Basic', 'basic', 'Great for personal use.', 9.99, true, true, 15, 1, 3, true, true, 2, false, true)
ON CONFLICT (tier) DO UPDATE SET 
    name = EXCLUDED.name,
    is_active = true,
    display_order = EXCLUDED.display_order;

INSERT INTO packages (name, tier, description, price, allow_birthday_pages, allow_wedding_pages, allow_anniversary_pages, allow_graduation_pages, max_photos_per_page, max_videos_per_page, max_audio_files, max_storage_mb, max_pages, allow_music_player, allow_video_player, allow_gift_registry, allow_rsvp, allow_guestbook, allow_qr_codes, allow_custom_themes, allow_analytics, display_order, is_featured, is_active)
VALUES 
    ('Premium', 'premium', 'The complete experience.', 24.99, true, true, true, true, 50, 3, 2, 500, 10, true, true, true, true, true, true, true, true, 3, true, true)
ON CONFLICT (tier) DO UPDATE SET 
    name = EXCLUDED.name,
    is_active = true,
    display_order = EXCLUDED.display_order;

INSERT INTO packages (name, tier, description, price, billing_period, allow_birthday_pages, allow_wedding_pages, allow_anniversary_pages, allow_graduation_pages, allow_custom_pages, max_photos_per_page, max_videos_per_page, max_audio_files, max_storage_mb, max_pages, max_collaborators, allow_music_player, allow_video_player, allow_gift_registry, allow_rsvp, allow_guestbook, allow_qr_codes, allow_custom_themes, allow_analytics, allow_custom_domain, allow_remove_branding, display_order, is_featured, is_active)
VALUES 
    ('Enterprise', 'enterprise', 'For professionals and businesses.', 99.99, 'yearly', true, true, true, true, true, 999999, 999999, 999999, 999999, 999999, 999999, true, true, true, true, true, true, true, true, true, true, 4, false, true)
ON CONFLICT (tier) DO UPDATE SET 
    name = EXCLUDED.name,
    is_active = true,
    display_order = EXCLUDED.display_order;

-- Ensure user_packages has the necessary columns for the stored procedure
ALTER TABLE user_packages 
ADD COLUMN IF NOT EXISTS package_tier TEXT NOT NULL DEFAULT 'free',
ADD COLUMN IF NOT EXISTS upgrade_request_id INTEGER REFERENCES upgrade_requests(id);

-- Convert user_packages.user_id from TEXT to UUID to match users.id type
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'user_packages' 
          AND column_name = 'user_id' 
          AND data_type = 'character varying'
    ) THEN
        ALTER TABLE user_packages 
        ALTER COLUMN user_id TYPE UUID 
        USING user_id::UUID;
    END IF;
END $$;

-- FIX B: Disable RLS on packages (since package data should be publicly readable)
-- This is safe because packages are public pricing info
ALTER TABLE packages DISABLE ROW LEVEL SECURITY;

-- FIX C: Grant EXECUTE on the function to authenticated role
-- This allows logged-in admins to call the function
GRANT EXECUTE ON FUNCTION approve_package_payment(INTEGER, TEXT, TEXT) TO authenticated;

-- Also grant to anon if you're not using Supabase Auth (not recommended for production)
-- GRANT EXECUTE ON FUNCTION approve_package_payment(INTEGER, TEXT, TEXT) TO anon;

-- FIX D: Ensure function has SECURITY DEFINER (recreate if needed)
-- Drop and recreate with SECURITY DEFINER to ensure proper privileges
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
    -- Lock the upgrade request row
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
    
    -- Get user with row lock
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
    
    -- Get package: by ID if provided, else by tier
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
    
    -- Store old/new values
    v_old_tier := COALESCE(v_user.package_tier, 'free');
    v_new_tier := v_package.tier;
    v_old_package_name := COALESCE(v_user.package_name, v_old_tier);
    v_new_package_name := v_package.name;
    
    -- Atomic transaction
    BEGIN
        -- Update upgrade request
        UPDATE upgrade_requests SET
            status = 'approved',
            approved_by = p_approved_by,
            approved_at = NOW(),
            notes = COALESCE(p_notes, notes),
            updated_at = NOW()
        WHERE id = p_request_id;
        
        -- Update user
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
        
        -- Deactivate old packages
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
        
        -- Build success result
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
            RETURN jsonb_build_object(
                'success', false,
                'error', v_error_message,
                'code', 'TRANSACTION_ERROR'
            );
    END;
    
    RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Ensure sync_user_package_tier function exists (required by trigger)
CREATE OR REPLACE FUNCTION sync_user_package_tier(
    p_user_id UUID
) RETURNS JSONB AS $$
DECLARE
    v_user RECORD;
    v_active_package RECORD;
    v_result JSONB;
BEGIN
    SELECT * INTO v_user FROM users WHERE id = p_user_id;
    IF v_user IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'User not found', 'code', 'NOT_FOUND');
    END IF;
    
    SELECT p.* INTO v_active_package
    FROM user_packages up
    JOIN packages p ON up.package_id = p.id
    WHERE up.user_id = p_user_id AND up.is_active = true
    ORDER BY up.started_at DESC LIMIT 1;
    
    IF v_active_package IS NULL THEN
        UPDATE users SET package_tier = 'free', package_id = NULL, package_name = 'Free'
        WHERE id = p_user_id;
        RETURN jsonb_build_object('success', true, 'action', 'reset_to_free');
    ELSE
        IF v_user.package_tier != v_active_package.tier THEN
            UPDATE users SET package_tier = v_active_package.tier, package_id = v_active_package.id, package_name = v_active_package.name
            WHERE id = p_user_id;
        END IF;
        RETURN jsonb_build_object('success', true, 'action', 'synced');
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Ensure sync_user_on_package_change function exists
CREATE OR REPLACE FUNCTION sync_user_on_package_change()
RETURNS TRIGGER AS $$
BEGIN
    IF (TG_OP = 'UPDATE' AND OLD.is_active IS DISTINCT FROM NEW.is_active) OR TG_OP = 'INSERT' THEN
        PERFORM sync_user_package_tier(NEW.user_id);
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Ensure audit_logs table exists with all required columns
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
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS ip_address INET;
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS user_agent TEXT;

-- 3. HELPER FUNCTION: Audit logging
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
    p_metadata JSONB DEFAULT '{}'::jsonb,
    p_ip_address INET DEFAULT NULL,
    p_user_agent TEXT DEFAULT NULL
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
EXCEPTION
    WHEN OTHERS THEN
        RAISE WARNING 'Audit log failed: % %', SQLERRM, SQLSTATE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- FIX D: Recreate sync trigger (removed invalid WHEN condition; function handles logic internally)
DROP TRIGGER IF EXISTS trigger_sync_user_on_package_change ON user_packages;
CREATE TRIGGER trigger_sync_user_on_package_change
    AFTER INSERT OR UPDATE OF is_active ON user_packages
    FOR EACH ROW
    EXECUTE FUNCTION sync_user_on_package_change();

-- FIX E: Grant execute to authenticated (admin users)
GRANT EXECUTE ON FUNCTION approve_package_payment(INTEGER, TEXT, TEXT) TO authenticated;

-- Also grant to anon if using anon key (less secure)
-- GRANT EXECUTE ON FUNCTION approve_package_payment(INTEGER, TEXT, TEXT) TO anon;

-- FIX F: Ensure packages RLS doesn't interfere (since function is SECURITY DEFINER it should bypass, but just in case)
-- Check if packages RLS is causing issues by temporarily disabling
-- ALTER TABLE packages DISABLE ROW LEVEL SECURITY;

-- ============================================
-- VERIFICATION
-- ============================================
-- After running fixes, test:
-- 1. Reload Supabase dashboard
-- 2. Try approving a pending request again
-- 3. If still fails, check browser console for exact error details

-- To see which requests are still pending after fix:
-- SELECT id, user_email, to_package_tier, status FROM upgrade_requests WHERE status = 'pending';
