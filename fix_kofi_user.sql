-- ============================================
-- QUICK FIX: Single user with package_pending but no upgrade_request
-- User: kofi Lartey (kofilartey12@gmail.com)
-- ID: 086bebfb-2628-4ef9-9fac-af7fcf85f5e7
-- ============================================

-- Step 1: Create the missing upgrade request
WITH new_request AS (
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
    VALUES (
        '086bebfb-2628-4ef9-9fac-af7fcf85f5e7',
        'kofilartey12@gmail.com',
        'kofi Lartey',
        'premium',              -- from current tier
        'enterprise',           -- to desired tier
        (SELECT id FROM packages WHERE tier = 'enterprise' AND is_active = true LIMIT 1),
        0,                      -- amount (admin will update later if needed)
        'momo',                 -- payment method
        'pending',
        'PENDING-' || UPPER(SUBSTRING('086bebfb-2628-4ef9-9fac-af7fcf85f5e7' FROM 1 FOR 6)),
        NOW(),
        NOW()
    )
    RETURNING id
)
-- Step 2: Link user to this request
UPDATE users 
SET pending_upgrade_id = (SELECT id FROM new_request),
    updated_at = NOW()
WHERE id = '086bebfb-2628-4ef9-9fac-af7fcf85f5e7';

-- Step 3: Verify
SELECT 
    u.id,
    u.email,
    u.package_tier,
    u.package_pending,
    u.pending_upgrade_id,
    ur.id as request_id,
    ur.status as request_status,
    ur.to_package_tier
FROM users u
LEFT JOIN upgrade_requests ur ON u.pending_upgrade_id = ur.id
WHERE u.id = '086bebfb-2628-4ef9-9fac-af7fcf85f5e7';
