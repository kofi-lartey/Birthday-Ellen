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
