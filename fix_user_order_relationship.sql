-- Migration: Fix user-order relationship
-- This script aligns orders.user_id with users.id (both UUID)
-- WARNING: Run this ONLY after backing up your data!

BEGIN;

-- ============================================================================
-- DIAGNOSTIC: Check current types before making changes
-- ============================================================================
-- Run these queries first to understand your current schema:
-- SELECT column_name, data_type, udt_name 
-- FROM information_schema.columns 
-- WHERE table_name = 'users' AND column_name = 'id';
-- 
-- SELECT column_name, data_type, udt_name 
-- FROM information_schema.columns 
-- WHERE table_name = 'orders' AND column_name = 'user_id';
--
-- Expected after fix_users_table.sql:
--   users.id        -> UUID  (or character varying if not converted yet)
--   orders.user_id  -> TEXT/character varying (currently storing UUID as text)
-- ============================================================================

-- ============================================================================
-- STEP 1: Ensure users.id is UUID (if not already)
-- ============================================================================
-- Check if users.id needs conversion
DO $$ 
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'users' 
          AND column_name = 'id' 
          AND data_type = 'character varying'
    ) THEN
        -- Convert users.id from VARCHAR to UUID
        ALTER TABLE users 
        ALTER COLUMN id TYPE UUID 
        USING id::uuid;
    END IF;
END $$;

-- ============================================================================
-- STEP 2: Ensure orders.user_id is UUID (convert from TEXT/VARCHAR)
-- ============================================================================
-- Check current type and convert
DO $$ 
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'orders' 
          AND column_name = 'user_id' 
          AND data_type = 'character varying'
    ) THEN
        -- Convert user_id from TEXT/VARCHAR to UUID
        -- This will fail if any values are not valid UUIDs
        ALTER TABLE orders 
        ALTER COLUMN user_id TYPE UUID 
        USING user_id::uuid;
    ELSIF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'orders' 
          AND column_name = 'user_id' 
          AND data_type = 'integer'
    ) THEN
        -- If previously converted to INTEGER, convert to UUID
        -- This scenario means data was lost - check your data!
        RAISE NOTICE 'WARNING: orders.user_id is INTEGER. This suggests previous migration corrupted data.';
    END IF;
END $$;

-- ============================================================================
-- STEP 3: Add foreign key constraint (enforces referential integrity)
-- ============================================================================
-- Drop existing FK if it exists (from INTEGER conversion attempt)
ALTER TABLE orders 
DROP CONSTRAINT IF EXISTS fk_orders_user;

-- Add proper UUID foreign key
ALTER TABLE orders 
ADD CONSTRAINT fk_orders_user 
FOREIGN KEY (user_id) 
REFERENCES users(id) 
ON DELETE SET NULL;

-- ============================================================================
-- STEP 4: Create performance indexes
-- ============================================================================
-- Index for JOINs on user_id
CREATE INDEX IF NOT EXISTS idx_orders_user_id ON orders(user_id);

-- Composite index for common query: user's active/paid orders
CREATE INDEX IF NOT EXISTS idx_orders_user_status 
ON orders(user_id, status) 
WHERE status IN ('active', 'paid', 'pending');

-- Index for code lookup (order retrieval by code)
CREATE INDEX IF NOT EXISTS idx_orders_code ON orders(code);

-- ============================================================================
-- STEP 5: Link orphaned orders to users by phone number matching
-- ============================================================================
-- Orders created before user login have user_id=NULL but giver_phone filled.
-- Match them to user accounts where phone numbers align.
-- IMPORTANT: Normalize phone numbers first if they have different formats!
-- 
-- Example normalization: remove non-digits
-- UPDATE users SET phone = regexp_replace(phone, '\D', '', 'g') WHERE phone IS NOT NULL;
-- UPDATE orders SET giver_phone = regexp_replace(giver_phone, '\D', '', 'g') WHERE giver_phone IS NOT NULL;
--
UPDATE orders o
SET user_id = u.id
FROM users u
WHERE o.user_id IS NULL
  AND o.giver_phone IS NOT NULL
  AND u.phone IS NOT NULL
  AND o.giver_phone = u.phone;

-- Log how many orders were linked
-- SELECT count(*) FROM orders WHERE user_id IS NOT NULL; -- Should increase

-- ============================================================================
-- STEP 6: Create materialized view for optimized dashboard queries
-- ============================================================================
-- This view pre-aggregates order data with the user profile
-- Refresh it when orders change (see trigger below)
DROP MATERIALIZED VIEW IF EXISTS user_dashboard_view;

CREATE MATERIALIZED VIEW user_dashboard_view AS
SELECT 
    u.id AS user_id,
    u.name,
    u.email,
    u.phone,
    u.package_tier,
    u.package_name,
    u.payment_status,
    -- Aggregated stats
    COUNT(o.id) AS total_orders,
    COUNT(o.id) FILTER (WHERE o.status = 'active') AS active_orders,
    COUNT(o.id) FILTER (WHERE o.status = 'paid') AS paid_orders,
    COUNT(o.id) FILTER (WHERE o.status = 'pending') AS pending_orders,
    MAX(o.created_at) AS latest_order_at,
    -- Nested orders array (avoid circular reference by not including user in each order)
    COALESCE(JSONB_AGG(
        JSONB_BUILD_OBJECT(
            'id', o.id,
            'code', o.code,
            'recipient_name', o.recipient_name,
            'status', o.status,
            'package', o.package,
            'page_type', o.page_type,
            'created_at', o.created_at,
            'background_image', o.background_image,
            'heart_message', o.heart_message,
            'letter', o.letter,
            'nickname', o.nickname,
            'audio_url', o.audio_url,
            'has_photos', (o.photos IS NOT NULL AND jsonb_array_length(o.photos) > 0)
        )
    ) FILTER (WHERE o.id IS NOT NULL), '[]'::jsonb) AS orders
FROM users u
LEFT JOIN orders o ON u.id = o.user_id
GROUP BY u.id;

-- Unique index for fast single-user lookups
CREATE UNIQUE INDEX IF NOT EXISTS idx_user_dashboard_view_id 
ON user_dashboard_view(user_id);

-- Index for querying by package tier (admin dashboard)
CREATE INDEX IF NOT EXISTS idx_user_dashboard_package 
ON user_dashboard_view(package_tier);

-- ============================================================================
-- STEP 7: Create realtime subscription helper function
-- ============================================================================
-- This RPC function allows frontend to fetch user + orders in ONE call
DROP FUNCTION IF EXISTS get_user_profile_with_orders(UUID);

CREATE OR REPLACE FUNCTION get_user_profile_with_orders(p_user_id UUID)
RETURNS TABLE (
    user_id UUID,
    user_name TEXT,
    user_email TEXT,
    user_phone TEXT,
    package_tier TEXT,
    package_name TEXT,
    payment_status TEXT,
    total_orders BIGINT,
    active_orders BIGINT,
    paid_orders BIGINT,
    pending_orders BIGINT,
    orders_json JSONB
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        u.id,
        u.name,
        u.email,
        u.phone,
        u.package_tier,
        u.package_name,
        u.payment_status,
        COUNT(o.id)::BIGINT,
        COUNT(o.id) FILTER (WHERE o.status = 'active')::BIGINT,
        COUNT(o.id) FILTER (WHERE o.status = 'paid')::BIGINT,
        COUNT(o.id) FILTER (WHERE o.status = 'pending')::BIGINT,
        COALESCE(JSONB_AGG(
            JSONB_BUILD_OBJECT(
                'id', o.id,
                'code', o.code,
                'recipient_name', o.recipient_name,
                'status', o.status,
                'package', o.package,
                'page_type', o.page_type,
                'created_at', o.created_at,
                'background_image', o.background_image,
                'heart_message', o.heart_message,
                'letter', o.letter,
                'nickname', o.nickname,
                'audio_url', o.audio_url,
                'photos', o.photos
            )
        ) FILTER (WHERE o.id IS NOT NULL), '[]'::jsonb)
    FROM users u
    LEFT JOIN orders o ON u.id = o.user_id
    WHERE u.id = p_user_id
    GROUP BY u.id;
END;
$$ LANGUAGE plpgsql STABLE;

-- Grant execute permission to authenticated and anon roles
GRANT EXECUTE ON FUNCTION get_user_profile_with_orders TO authenticated, anon;

-- ============================================================================
-- STEP 8: Create a simpler function for frontend (returns JSONB directly)
-- ============================================================================
DROP FUNCTION IF EXISTS get_user_with_orders(UUID);

CREATE OR REPLACE FUNCTION get_user_with_orders(p_user_id UUID)
RETURNS JSONB AS $$
DECLARE
    result JSONB;
BEGIN
    SELECT jsonb_build_object(
        'user', jsonb_build_object(
            'id', u.id,
            'name', u.name,
            'email', u.email,
            'phone', u.phone,
            'package_tier', u.package_tier,
            'package_name', u.package_name,
            'payment_status', u.payment_status,
            'order_count', u.order_count,
            'active_order_count', u.active_order_count,
            'created_at', u.created_at
        ),
        'orders', COALESCE(JSONB_AGG(
            JSONB_BUILD_OBJECT(
                'id', o.id,
                'code', o.code,
                'recipient_name', o.recipient_name,
                'status', o.status,
                'package', o.package,
                'page_type', o.page_type,
                'created_at', o.created_at,
                'background_image', o.background_image,
                'heart_message', o.heart_message,
                'letter', o.letter,
                'nickname', o.nickname,
                'audio_url', o.audio_url,
                'date_of_birth', o.date_of_birth,
                'photos', o.photos
            )
        ) FILTER (WHERE o.id IS NOT NULL), '[]'::jsonb),
        'summary', jsonb_build_object(
            'total', COUNT(o.id),
            'active', COUNT(o.id) FILTER (WHERE o.status IN ('active', 'paid')),
            'pending', COUNT(o.id) FILTER (WHERE o.status = 'pending'),
            'latest', MAX(o.created_at)
        )
    ) INTO result
    FROM users u
    LEFT JOIN orders o ON u.id = o.user_id
    WHERE u.id = p_user_id
    GROUP BY u.id;
    
    RETURN result;
END;
$$ LANGUAGE plpgsql STABLE;

GRANT EXECUTE ON FUNCTION get_user_with_orders TO authenticated, anon;

-- ============================================================================
-- STEP 9: Create trigger to auto-refresh materialized view
-- ============================================================================
-- Function to refresh view on order changes
CREATE OR REPLACE FUNCTION refresh_user_dashboard_trigger()
RETURNS TRIGGER AS $$
BEGIN
    -- Use CONCURRENTLY to avoid locking (requires unique index)
    -- In high-traffic, consider batching refreshes or using pg_cron
    REFRESH MATERIALIZED VIEW CONCURRENTLY user_dashboard_view;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Create trigger on orders changes
-- Note: This fires AFTER each statement, not per-row, for efficiency
CREATE TRIGGER trg_refresh_user_dashboard
AFTER INSERT OR UPDATE OR DELETE ON orders
FOR EACH STATEMENT 
EXECUTE FUNCTION refresh_user_dashboard_trigger();

-- ============================================================================
-- STEP 10: Enable realtime for the materialized view (optional)
-- ============================================================================
-- In Supabase Dashboard: Settings -> Replication -> Add user_dashboard_view
-- Or use SQL:
-- INSERT INTO supabase_realtime.meta (id, name) 
-- VALUES ('user_dashboard_view', 'user_dashboard_view') 
-- ON CONFLICT DO NOTHING;

-- ============================================================================
-- STEP 11: Update RLS policies to work with UUID auth.uid()
-- ============================================================================
-- Ensure orders RLS policy uses correct UUID comparison
-- (Assuming Supabase Auth is enabled and users are authenticated via auth.users)
DROP POLICY IF EXISTS "Users can read own orders via user_id" ON orders;
CREATE POLICY "Users can read own orders via user_id" ON orders 
FOR SELECT TO authenticated 
USING (auth.uid()::text = user_id::text);

-- Allow public read for active orders (visible on birthday pages)
DROP POLICY IF EXISTS "Public can read active orders" ON orders;
CREATE POLICY "Public can read active orders" ON orders 
FOR SELECT TO public 
USING (status IN ('active', 'paid'));

-- ============================================================================
-- STEP 12: Insert sample data for testing (optional, remove in production)
-- ============================================================================
-- Only run this if you need test data:
-- INSERT INTO users (id, name, email, phone, package_tier) VALUES
-- ('11111111-1111-1111-1111-111111111111', 'Test User', 'test@example.com', '+233241234567', 'premium')
-- ON CONFLICT (id) DO NOTHING;
--
-- INSERT INTO orders (user_id, code, recipient_name, status, package, page_type) VALUES
-- ('11111111-1111-1111-1111-111111111111', 'TES0001', 'Test Recipient', 'active', 'free', 'birthday')
-- ON CONFLICT (code) DO NOTHING;

-- ============================================================================
-- FINAL: Commit the transaction
-- ============================================================================
COMMIT;

-- ============================================================================
-- POST-MIGRATION VERIFICATION
-- ============================================================================
-- Run these checks after migration:
-- 
-- -- 1. Verify UUID conversion
-- SELECT column_name, data_type 
-- FROM information_schema.columns 
-- WHERE table_name IN ('users', 'orders') 
--   AND column_name IN ('id', 'user_id');
-- 
-- -- 2. Test the RPC function
-- SELECT * FROM get_user_with_orders('your-user-uuid-here');
-- 
-- -- 3. Check the materialized view
-- SELECT * FROM user_dashboard_view LIMIT 5;
-- 
-- -- 4. Verify foreign key constraint
-- SELECT conname, confdeltype 
-- FROM pg_constraint 
-- WHERE conname = 'fk_orders_user';
-- 
-- -- 5. Check indexes
-- SELECT indexname, indexdef 
-- FROM pg_indexes 
-- WHERE tablename IN ('orders', 'user_dashboard_view');
-- ============================================================================