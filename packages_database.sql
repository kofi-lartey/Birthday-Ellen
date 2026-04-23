-- Package Selection System Database Schema
-- Run this in Supabase SQL Editor

-- =====================
-- CREATE PACKAGES TABLE
-- =====================
CREATE TABLE IF NOT EXISTS packages (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    tier TEXT NOT NULL UNIQUE, -- 'free', 'basic', 'premium', 'enterprise'
    description TEXT,
    price DECIMAL(10,2) DEFAULT 0,
    currency TEXT DEFAULT 'USD',
    billing_period TEXT DEFAULT 'monthly', -- 'monthly', 'yearly', 'lifetime'
    
    -- Page Type Access
    allow_birthday_pages BOOLEAN DEFAULT true,
    allow_wedding_pages BOOLEAN DEFAULT false,
    allow_anniversary_pages BOOLEAN DEFAULT false,
    allow_graduation_pages BOOLEAN DEFAULT false,
    allow_custom_pages BOOLEAN DEFAULT false,
    
    -- Media Upload Limits
    max_photos_per_page INTEGER DEFAULT 5,
    max_videos_per_page INTEGER DEFAULT 0,
    max_audio_files INTEGER DEFAULT 0,
    max_storage_mb INTEGER DEFAULT 50,
    
    -- Feature Availability
    allow_music_player BOOLEAN DEFAULT false,
    allow_video_player BOOLEAN DEFAULT false,
    allow_gift_registry BOOLEAN DEFAULT false,
    allow_rsvp BOOLEAN DEFAULT false,
    allow_guestbook BOOLEAN DEFAULT false,
    allow_qr_codes BOOLEAN DEFAULT false,
    allow_custom_themes BOOLEAN DEFAULT false,
    allow_analytics BOOLEAN DEFAULT false,
    allow_custom_domain BOOLEAN DEFAULT false,
    allow_remove_branding BOOLEAN DEFAULT false,
    
    -- Page Limits
    max_pages INTEGER DEFAULT 1,
    max_collaborators INTEGER DEFAULT 1,
    
    -- Display Settings
    is_active BOOLEAN DEFAULT true,
    is_featured BOOLEAN DEFAULT false,
    display_order INTEGER DEFAULT 0,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE packages ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "Allow public read packages" ON packages;
DROP POLICY IF EXISTS "Allow anon read packages" ON packages;

-- Create policies
CREATE POLICY "Allow public read packages" ON packages FOR SELECT TO public USING (true);
CREATE POLICY "Allow anon read packages" ON packages FOR SELECT TO anon USING (true);

-- =====================
-- INSERT DEFAULT PACKAGES
-- =====================

-- Free Tier
INSERT INTO packages (name, tier, description, price, allow_birthday_pages, max_photos_per_page, max_pages, allow_music_player, allow_gift_registry, display_order, is_featured)
VALUES (
    'Free',
    'free',
    'Perfect for trying out our platform. Create simple birthday pages for your loved ones.',
    0.00,
    true,
    5,
    1,
    false,
    false,
    1,
    false
) ON CONFLICT (tier) DO NOTHING;

-- Basic Tier
INSERT INTO packages (name, tier, description, price, allow_birthday_pages, allow_wedding_pages, max_photos_per_page, max_videos_per_page, max_pages, allow_music_player, allow_gift_registry, display_order, is_featured)
VALUES (
    'Basic',
    'basic',
    'Great for personal use. More photos and basic features for special occasions.',
    9.99,
    true,
    true,
    15,
    1,
    3,
    true,
    true,
    2,
    false
) ON CONFLICT (tier) DO NOTHING;

-- Premium Tier
INSERT INTO packages (name, tier, description, price, allow_birthday_pages, allow_wedding_pages, allow_anniversary_pages, allow_graduation_pages, max_photos_per_page, max_videos_per_page, max_audio_files, max_storage_mb, max_pages, allow_music_player, allow_video_player, allow_gift_registry, allow_rsvp, allow_guestbook, allow_custom_themes, allow_qr_codes, allow_analytics, display_order, is_featured)
VALUES (
    'Premium',
    'premium',
    'The complete experience. All page types, unlimited features, and priority support.',
    24.99,
    true,
    true,
    true,
    true,
    50,
    3,
    2,
    500,
    10,
    true,
    true,
    true,
    true,
    true,
    true,
    true,
    true,
    3,
    true
) ON CONFLICT (tier) DO NOTHING;

-- Enterprise Tier
INSERT INTO packages (name, tier, description, price, billing_period, allow_birthday_pages, allow_wedding_pages, allow_anniversary_pages, allow_graduation_pages, allow_custom_pages, max_photos_per_page, max_videos_per_page, max_audio_files, max_storage_mb, max_pages, max_collaborators, allow_music_player, allow_video_player, allow_gift_registry, allow_rsvp, allow_guestbook, allow_qr_codes, allow_custom_themes, allow_analytics, allow_custom_domain, allow_remove_branding, display_order, is_featured)
VALUES (
    'Enterprise',
    'enterprise',
    'For professionals and businesses. Unlimited everything with white-label options.',
    99.99,
    'yearly',
    true,
    true,
    true,
    true,
    true,
    999999,
    999999,
    999999,
    999999,
    999999,
    999999,
    true,
    true,
    true,
    true,
    true,
    true,
    true,
    true,
    true,
    true,
    4,
    false
) ON CONFLICT (tier) DO NOTHING;

-- =====================
-- ADD PACKAGE_ID TO USERS TABLE
-- =====================
-- Add package_id column to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS package_id INTEGER REFERENCES packages(id);
ALTER TABLE users ADD COLUMN IF NOT EXISTS package_tier TEXT DEFAULT 'free';
ALTER TABLE users ADD COLUMN IF NOT EXISTS package_expires_at TIMESTAMP WITH TIME ZONE;

-- Update existing users to have free package
UPDATE users SET package_tier = 'free' WHERE package_tier IS NULL;

-- =====================
-- CREATE USER PACKAGES TABLE (for subscription tracking)
-- =====================
CREATE TABLE IF NOT EXISTS user_packages (
    id SERIAL PRIMARY KEY,
    user_id TEXT NOT NULL,
    package_id INTEGER NOT NULL REFERENCES packages(id),
    started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE,
    is_active BOOLEAN DEFAULT true,
    auto_renew BOOLEAN DEFAULT false,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE user_packages ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "Allow public read user_packages" ON user_packages;
DROP POLICY IF EXISTS "Allow anon read user_packages" ON user_packages;
DROP POLICY IF EXISTS "Allow public insert user_packages" ON user_packages;
DROP POLICY IF EXISTS "Allow anon insert user_packages" ON user_packages;

-- Create policies
CREATE POLICY "Allow public read user_packages" ON user_packages FOR SELECT TO public USING (true);
CREATE POLICY "Allow anon read user_packages" ON user_packages FOR SELECT TO anon USING (true);
CREATE POLICY "Allow public insert user_packages" ON user_packages FOR INSERT TO public WITH CHECK (true);
CREATE POLICY "Allow anon insert user_packages" ON user_packages FOR INSERT TO anon WITH CHECK (true);

 -- =====================
 -- ADD PAGE TYPE COLUMN TO ORDERS
 -- =====================
 ALTER TABLE orders ADD COLUMN IF NOT EXISTS page_type TEXT DEFAULT 'birthday';

 -- =====================
 -- CREATE UPGRADE_REQUESTS TABLE
 -- =====================
 CREATE TABLE IF NOT EXISTS upgrade_requests (
     id SERIAL PRIMARY KEY,
     user_id TEXT NOT NULL,
     user_email TEXT NOT NULL,
     user_name TEXT,
     
     -- Package change details
     from_package_tier TEXT DEFAULT 'free',
     to_package_tier TEXT NOT NULL,
     to_package_id INTEGER REFERENCES packages(id),
     
     -- Payment details
     amount_paid DECIMAL(10,2) NOT NULL,
     payment_method TEXT, -- 'momo', 'bank', 'card'
     momo_number TEXT,
     transaction_id TEXT,
     payment_reference_code TEXT UNIQUE, -- e.g., B2476, P1234
     payment_proof_url TEXT,
     
     -- Status tracking
     status TEXT DEFAULT 'pending', -- 'pending', 'approved', 'rejected'
     notes TEXT,
     
     -- Approval metadata
     reviewed_by TEXT,
     reviewed_at TIMESTAMP WITH TIME ZONE,
     approved_at TIMESTAMP WITH TIME ZONE,
     
     -- Timestamps
     created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
     updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
 );

 -- Enable RLS
 ALTER TABLE upgrade_requests ENABLE ROW LEVEL SECURITY;

 -- Drop existing policies
 DROP POLICY IF EXISTS "Users read own upgrade requests" ON upgrade_requests;
 DROP POLICY IF EXISTS "Admin manage upgrade requests" ON upgrade_requests;

 -- Policies: Users can read their own (cast auth.uid() to text for comparison)
 CREATE POLICY "Users read own upgrade requests" ON upgrade_requests 
     FOR SELECT TO public USING (
         auth.uid()::text = user_id 
         OR user_id = current_setting('app.current_user_id', true)
     );
     
 CREATE POLICY "Admin manage upgrade requests" ON upgrade_requests 
     FOR ALL TO authenticated USING (
         EXISTS (
             SELECT 1 FROM users 
             WHERE id::text = auth.uid()::text 
             AND role IN ('admin', 'super_admin')
         )
     );

  -- Indexes for performance
  CREATE INDEX IF NOT EXISTS idx_upgrade_requests_user_id ON upgrade_requests(user_id);
  CREATE INDEX IF NOT EXISTS idx_upgrade_requests_status ON upgrade_requests(status);
  CREATE INDEX IF NOT EXISTS idx_upgrade_requests_pending ON upgrade_requests(status) WHERE status = 'pending';
  CREATE INDEX IF NOT EXISTS idx_upgrade_requests_ref_code ON upgrade_requests(payment_reference_code);

 -- =====================
 -- ADD MISSING COLUMNS (for existing tables)
 -- =====================
 -- Add payment_reference_code to upgrade_requests if not exists
 ALTER TABLE upgrade_requests ADD COLUMN IF NOT EXISTS payment_reference_code TEXT UNIQUE;
 
   -- Add package_pending and pending_upgrade_id to users if not exists
  ALTER TABLE users ADD COLUMN IF NOT EXISTS package_pending TEXT;
  ALTER TABLE users ADD COLUMN IF NOT EXISTS pending_upgrade_id INTEGER REFERENCES upgrade_requests(id);
  ALTER TABLE users ADD COLUMN IF NOT EXISTS payment_reference_code TEXT;
  ALTER TABLE users ADD COLUMN IF NOT EXISTS payment_method TEXT;
  ALTER TABLE users ADD COLUMN IF NOT EXISTS payment_reference TEXT;

 -- =====================
 -- CREATE NOTIFICATIONS TABLE
 -- =====================
 CREATE TABLE IF NOT EXISTS notifications (
     id SERIAL PRIMARY KEY,
     recipient_id TEXT NOT NULL, -- Admin user ID
     type TEXT NOT NULL, -- 'upgrade_pending', 'upgrade_approved', 'upgrade_rejected'
     title TEXT NOT NULL,
     message TEXT NOT NULL,
     data JSONB, -- {user_id, user_name, user_email, tier, amount, reference_code, ...}
     read BOOLEAN DEFAULT false,
     read_at TIMESTAMP WITH TIME ZONE,
     created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
 );

 -- Enable RLS
 ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

 -- Drop existing policies
 DROP POLICY IF EXISTS "Admin read own notifications" ON notifications;
 DROP POLICY IF EXISTS "Admin insert notifications" ON notifications;

 -- Admin can read their own notifications
 CREATE POLICY "Admin read own notifications" ON notifications 
     FOR SELECT TO authenticated USING (
         auth.uid()::text = recipient_id OR
         EXISTS (
             SELECT 1 FROM users 
             WHERE id::text = auth.uid()::text 
             AND role IN ('admin', 'super_admin')
         )
     );
     
 CREATE POLICY "Admin insert notifications" ON notifications 
     FOR INSERT TO authenticated WITH CHECK (
         EXISTS (
             SELECT 1 FROM users 
             WHERE id::text = auth.uid()::text 
             AND role IN ('admin', 'super_admin')
         )
     );

  -- Indexes
  CREATE INDEX IF NOT EXISTS idx_notifications_recipient ON notifications(recipient_id);
  CREATE INDEX IF NOT EXISTS idx_notifications_unread ON notifications(read) WHERE read = false;
  CREATE INDEX IF NOT EXISTS idx_notifications_created ON notifications(created_at DESC);

  -- Temporarily disable RLS for admin access (remove in production)
  ALTER TABLE upgrade_requests DISABLE ROW LEVEL SECURITY;
  ALTER TABLE notifications DISABLE ROW LEVEL SECURITY;

 -- =====================
 -- TRIGGERS FOR NOTIFICATIONS
 -- =====================

 -- Trigger function: Create notification when upgrade request is submitted
 CREATE OR REPLACE FUNCTION notify_upgrade_request()
 RETURNS TRIGGER AS $$
 DECLARE
     admin_user RECORD;
 BEGIN
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
             format('User %s has requested to upgrade from %s to %s package (GHS %.2f). Reference: %s',
                 COALESCE(NEW.user_name, NEW.user_email),
                 COALESCE(NEW.from_package_tier, 'free'),
                 NEW.to_package_tier,
                 NEW.amount_paid,
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

 DROP TRIGGER IF EXISTS trigger_notify_upgrade_request ON upgrade_requests;
 CREATE TRIGGER trigger_notify_upgrade_request
     AFTER INSERT ON upgrade_requests
     FOR EACH ROW
     EXECUTE FUNCTION notify_upgrade_request();

 -- Trigger function: Notify user when upgrade is approved
 CREATE OR REPLACE FUNCTION notify_upgrade_approved()
 RETURNS TRIGGER AS $$
 BEGIN
     IF NEW.status = 'approved' AND OLD.status != 'approved' THEN
         INSERT INTO notifications (
             recipient_id,
             type,
             title,
             message,
             data,
             created_at
         ) VALUES (
             NEW.user_id,
             'upgrade_approved',
             '✅ Upgrade Approved!',
             format('Your upgrade to %s package has been approved. Enjoy your new features!', NEW.to_package_tier),
             jsonb_build_object(
                 'user_id', NEW.user_id,
                 'to_tier', NEW.to_package_tier,
                 'upgrade_request_id', NEW.id,
                 'approved_by', NEW.reviewed_by,
                 'approved_at', NEW.approved_at
             ),
             NOW()
         );
     END IF;
     RETURN NEW;
 END;
 $$ LANGUAGE plpgsql;

 DROP TRIGGER IF EXISTS trigger_notify_upgrade_approved ON upgrade_requests;
 CREATE TRIGGER trigger_notify_upgrade_approved
     AFTER UPDATE ON upgrade_requests
     FOR EACH ROW
     WHEN (OLD.status IS DISTINCT FROM NEW.status)
     EXECUTE FUNCTION notify_upgrade_approved();

 -- Trigger function: Notify user when upgrade is rejected
 CREATE OR REPLACE FUNCTION notify_upgrade_rejected()
 RETURNS TRIGGER AS $$
 BEGIN
     IF NEW.status = 'rejected' AND OLD.status != 'rejected' THEN
         INSERT INTO notifications (
             recipient_id,
             type,
             title,
             message,
             data,
             created_at
         ) VALUES (
             NEW.user_id,
             'upgrade_rejected',
             '❌ Upgrade Request Rejected',
             format('Your upgrade to %s package could not be approved. Reason: %s. Contact admin for more info.',
                 NEW.to_package_tier,
                 COALESCE(NEW.notes, 'Not specified')
             ),
             jsonb_build_object(
                 'user_id', NEW.user_id,
                 'to_tier', NEW.to_package_tier,
                 'upgrade_request_id', NEW.id,
                 'rejected_by', NEW.reviewed_by,
                 'reason', NEW.notes
             ),
             NOW()
         );
     END IF;
     RETURN NEW;
 END;
 $$ LANGUAGE plpgsql;

 DROP TRIGGER IF EXISTS trigger_notify_upgrade_rejected ON upgrade_requests;
 CREATE TRIGGER trigger_notify_upgrade_rejected
     AFTER UPDATE ON upgrade_requests
     FOR EACH ROW
     WHEN (OLD.status IS DISTINCT FROM NEW.status)
     EXECUTE FUNCTION notify_upgrade_rejected();

