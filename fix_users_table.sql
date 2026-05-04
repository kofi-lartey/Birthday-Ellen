-- Fix users table to use UUID like Supabase Auth
-- Run this in your Supabase SQL Editor

-- Drop dependent user-based policies first so the users table can be recreated safely
DROP POLICY IF EXISTS "Admin read audit logs" ON audit_logs;
DROP POLICY IF EXISTS "Admin manage upgrade requests" ON upgrade_requests;
DROP POLICY IF EXISTS "Admin read own notifications" ON notifications;
DROP POLICY IF EXISTS "Admin insert notifications" ON notifications;
DROP POLICY IF EXISTS "Allow admin manage payments" ON payments;

-- Drop and recreate users table with UUID support
DROP TABLE IF EXISTS users;

CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    phone TEXT,
    role TEXT DEFAULT 'user',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    package_id INTEGER REFERENCES packages(id),
    package_tier TEXT DEFAULT 'free',
    package_name TEXT,
    package_expires_at TIMESTAMP WITH TIME ZONE,
    package_pending TEXT,
    pending_upgrade_id INTEGER REFERENCES upgrade_requests(id),
    payment_status TEXT,
    payment_method TEXT,
    payment_reference TEXT,
    payment_reference_code TEXT,
    payment_confirmed_at TIMESTAMP WITH TIME ZONE,
    payment_confirmed_by TEXT,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Create policies for public access
DROP POLICY IF EXISTS "Allow public read access to users" ON users;
DROP POLICY IF EXISTS "Allow anon read access to users" ON users;
DROP POLICY IF EXISTS "Allow authenticated users to insert users" ON users;
DROP POLICY IF EXISTS "Allow anon insert users" ON users;
DROP POLICY IF EXISTS "Allow authenticated users to update own profile" ON users;

CREATE POLICY "Allow public read access to users" ON users FOR SELECT TO public USING (true);
CREATE POLICY "Allow anon read access to users" ON users FOR SELECT TO anon USING (true);
CREATE POLICY "Allow authenticated users to insert users" ON users FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Allow anon insert users" ON users FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "Allow authenticated users to update own profile" ON users FOR UPDATE TO authenticated USING (auth.uid()::text = id::text);

-- Backfill default values
UPDATE users SET package_tier = 'free' WHERE package_tier IS NULL;
UPDATE users SET package_name = 'Free' WHERE package_name IS NULL AND (package_tier = 'free' OR package_tier IS NULL);
