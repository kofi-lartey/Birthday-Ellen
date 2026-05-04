-- ============================================
-- BACKFILL: Fix users with package_pending but missing upgrade_requests
-- ============================================
-- Run this in Supabase SQL Editor
-- ============================================

-- Step 1: Create missing upgrade_requests for affected users
INSERT INTO upgrade_requests (
    user_id,
    user_email,
    user_name,
    from_package_tier,
    to_package_tier,
    to_package_id,
    amount_paid,
    payment_method,
    status,
    payment_reference_code,
    created_at,
    updated_at
)
SELECT 
    u.id as user_id,
    u.email as user_email,
    u.name as user_name,
    COALESCE(u.package_tier, 'free') as from_package_tier,
    u.package_pending as to_package_tier,
    -- Look up package ID
    (SELECT id FROM packages WHERE tier = u.package_pending AND is_active = true LIMIT 1) as to_package_id,
    -- Amount: try to get from existing upgrade_requests or use default pricing
    COALESCE(
        (SELECT amount_paid FROM upgrade_requests ur 
         WHERE ur.user_id = u.id AND ur.to_package_tier = u.package_pending 
         ORDER BY created_at DESC LIMIT 1),
        CASE u.package_pending
            WHEN 'basic' THEN 5
            WHEN 'premium' THEN 10
            WHEN 'enterprise' THEN 20
            ELSE 0
        END
    ) as amount_paid,
    COALESCE(u.payment_method, 'momo') as payment_method,
    'pending' as status,
    -- Generate a reference code if missing
    COALESCE(
        u.payment_reference_code, 
        'BCK-' || UPPER(SUBSTRING(u.id::text FROM 1 FOR 6))
    ) as payment_reference_code,
    NOW() as created_at,
    NOW() as updated_at
FROM users u
WHERE u.package_pending IS NOT NULL
  AND u.pending_upgrade_id IS NULL
  -- Exclude if they already have a pending upgrade request
  AND NOT EXISTS (
      SELECT 1 FROM upgrade_requests ur 
      WHERE ur.user_id = u.id 
        AND ur.status = 'pending' 
        AND ur.to_package_tier = u.package_pending
  )
RETURNING id, user_id;

-- Step 2: Link users to the newly created upgrade_requests
-- Use a CTE to capture inserted IDs
WITH inserted_requests AS (
    INSERT INTO upgrade_requests (
        user_id,
        user_email,
        user_name,
        from_package_tier,
        to_package_tier,
        to_package_id,
        amount_paid,
        payment_method,
        status,
        payment_reference_code,
        created_at,
        updated_at
    )
    SELECT 
        u.id as user_id,
        u.email as user_email,
        u.name as user_name,
        COALESCE(u.package_tier, 'free') as from_package_tier,
        u.package_pending as to_package_tier,
        (SELECT id FROM packages WHERE tier = u.package_pending AND is_active = true LIMIT 1) as to_package_id,
        COALESCE(
            (SELECT amount_paid FROM upgrade_requests ur 
             WHERE ur.user_id = u.id AND ur.to_package_tier = u.package_pending 
             ORDER BY created_at DESC LIMIT 1),
            CASE u.package_pending
                WHEN 'basic' THEN 5
                WHEN 'premium' THEN 10
                WHEN 'enterprise' THEN 20
                ELSE 0
            END
        ) as amount_paid,
        COALESCE(u.payment_method, 'momo') as payment_method,
        'pending' as status,
        COALESCE(
            u.payment_reference_code, 
            'BCK-' || UPPER(SUBSTRING(u.id::text FROM 1 FOR 6))
        ) as payment_reference_code,
        NOW() as created_at,
        NOW() as updated_at
    FROM users u
    WHERE u.package_pending IS NOT NULL
      AND u.pending_upgrade_id IS NULL
      AND NOT EXISTS (
          SELECT 1 FROM upgrade_requests ur 
          WHERE ur.user_id = u.id 
            AND ur.status = 'pending' 
            AND ur.to_package_tier = u.package_pending
      )
    RETURNING id, user_id
)
-- Update users table with the new pending_upgrade_id
UPDATE users u
SET pending_upgrade_id = ir.id,
    updated_at = NOW()
FROM inserted_requests ir
WHERE u.id = ir.user_id;

-- Step 3: Verify
DO $$
DECLARE
    v_count INT;
BEGIN
    SELECT COUNT(*) INTO v_count 
    FROM users 
    WHERE pending_upgrade_id IS NOT NULL 
      AND package_pending IS NOT NULL;
    
    RAISE NOTICE 'Backfill complete. Users with pending_upgrade_id set: %', v_count;
END $$;

-- ============================================
-- VERIFY
-- ============================================
-- Check for any users still mismatched:
-- SELECT id, email, package_pending, pending_upgrade_id 
-- FROM users 
-- WHERE package_pending IS NOT NULL 
--   AND pending_upgrade_id IS NULL;

-- ============================================
-- OPTIONAL: Clean up duplicate or stale pending requests
-- ============================================
-- If a user has multiple pending upgrade_requests, keep the latest and mark others as 'obsolete'
-- (not needed if you trust the backfill, but useful for cleanup)

-- WITH ranked AS (
--   SELECT id, user_id, created_at,
--          ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY created_at DESC) as rn
--   FROM upgrade_requests
--   WHERE status = 'pending'
-- )
-- UPDATE upgrade_requests ur
-- SET status = 'obsolete',
--     notes = COALESCE(notes, '') || ' [Automatically superseded by newer request]'
-- FROM ranked r
-- WHERE ur.id = r.id
--   AND r.rn > 1;
