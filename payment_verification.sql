-- Payment Verification System Database Schema
-- Run this in Supabase SQL Editor

-- =====================
-- ADD PAYMENT STATUS TO USERS TABLE
-- =====================
ALTER TABLE users ADD COLUMN IF NOT EXISTS payment_status TEXT DEFAULT 'pending';
ALTER TABLE users ADD COLUMN IF NOT EXISTS payment_confirmed_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS payment_confirmed_by TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS payment_method TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS payment_reference TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS package_pending TEXT;

-- Update existing users with default payment status
UPDATE users SET payment_status = 'confirmed' WHERE package_tier = 'free' OR package_tier IS NULL;
UPDATE users SET payment_status = 'pending' WHERE package_tier IN ('basic', 'premium', 'enterprise') AND payment_status IS NULL;

-- =====================
-- ADD PAYMENT TRACKING TO USER_PACKAGES TABLE
-- =====================
ALTER TABLE user_packages ADD COLUMN IF NOT EXISTS payment_status TEXT DEFAULT 'pending';
ALTER TABLE user_packages ADD COLUMN IF NOT EXISTS payment_confirmed_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE user_packages ADD COLUMN IF NOT EXISTS payment_confirmed_by TEXT;
ALTER TABLE user_packages ADD COLUMN IF NOT EXISTS payment_method TEXT;
ALTER TABLE user_packages ADD COLUMN IF NOT EXISTS payment_reference TEXT;
ALTER TABLE user_packages ADD COLUMN IF NOT EXISTS payment_amount DECIMAL(10,2);
ALTER TABLE user_packages ADD COLUMN IF NOT EXISTS payment_currency TEXT DEFAULT 'USD';

-- =====================
-- CREATE PAYMENTS TABLE (for comprehensive tracking)
-- =====================
CREATE TABLE IF NOT EXISTS payments (
    id SERIAL PRIMARY KEY,
    user_id TEXT NOT NULL,
    package_id INTEGER REFERENCES packages(id),
    amount DECIMAL(10,2) NOT NULL,
    currency TEXT DEFAULT 'USD',
    payment_method TEXT,
    payment_reference TEXT,
    status TEXT DEFAULT 'pending', -- 'pending', 'confirmed', 'rejected', 'refunded'
    notes TEXT,
    confirmed_by TEXT,
    confirmed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

-- Create policies for payments
DROP POLICY IF EXISTS "Allow public read payments" ON payments;
DROP POLICY IF EXISTS "Allow anon read payments" ON payments;
DROP POLICY IF EXISTS "Allow admin manage payments" ON payments;

CREATE POLICY "Allow public read payments" ON payments FOR SELECT TO public USING (true);
CREATE POLICY "Allow anon read payments" ON payments FOR SELECT TO anon USING (true);
CREATE POLICY "Allow admin manage payments" ON payments FOR ALL TO authenticated USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin', 'super_admin'))
);

-- =====================
-- UPDATE USER_PACKAGES TO LINK TO PAYMENTS
-- =====================
ALTER TABLE user_packages ADD COLUMN IF NOT EXISTS payment_id INTEGER REFERENCES payments(id);
