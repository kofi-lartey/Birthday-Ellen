-- Fix users table to use UUID like Supabase Auth
-- Run this in your Supabase SQL Editor

-- Drop and recreate users table with UUID support
DROP TABLE IF EXISTS users;

CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    phone TEXT,
    role TEXT DEFAULT 'user',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
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
CREATE POLICY "Allow authenticated users to update own profile" ON users FOR UPDATE TO authenticated USING (auth.uid() = id);
