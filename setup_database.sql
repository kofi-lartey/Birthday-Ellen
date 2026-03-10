-- Complete Database Setup - Run this in Supabase SQL Editor
-- This creates all tables and fixes RLS policies

-- =====================
-- CREATE USERS TABLE
-- =====================
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    name TEXT,
    email TEXT UNIQUE,
    phone TEXT,
    password TEXT,
    role TEXT DEFAULT 'user',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add created_at if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'created_at') THEN
        ALTER TABLE users ADD COLUMN created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
    END IF;
END $$;

-- Enable RLS
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "Allow public read users" ON users;
DROP POLICY IF EXISTS "Allow anon read users" ON users;
DROP POLICY IF EXISTS "Allow public insert users" ON users;
DROP POLICY IF EXISTS "Allow anon insert users" ON users;
DROP POLICY IF EXISTS "Allow public update users" ON users;
DROP POLICY IF EXISTS "Allow anon update users" ON users;

-- Create new policies
CREATE POLICY "Allow public read users" ON users FOR SELECT TO public USING (true);
CREATE POLICY "Allow anon read users" ON users FOR SELECT TO anon USING (true);
CREATE POLICY "Allow public insert users" ON users FOR INSERT TO public WITH CHECK (true);
CREATE POLICY "Allow anon insert users" ON users FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "Allow public update users" ON users FOR UPDATE TO public USING (true);
CREATE POLICY "Allow anon update users" ON users FOR UPDATE TO anon USING (true);

-- =====================
-- CREATE ORDERS TABLE
-- =====================
CREATE TABLE IF NOT EXISTS orders (
    id SERIAL PRIMARY KEY,
    code TEXT UNIQUE NOT NULL,
    recipient_name TEXT,
    birthday_date DATE,
    giver_name TEXT,
    giver_phone TEXT,
    package TEXT DEFAULT 'free',
    status TEXT DEFAULT 'pending',
    price INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    background_image TEXT,
    heart_message TEXT,
    date_of_birth DATE,
    letter TEXT,
    nickname TEXT,
    audio_url TEXT,
    photos JSONB,
    user_id TEXT
);

-- Add created_at if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'created_at') THEN
        ALTER TABLE orders ADD COLUMN created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
    END IF;
END $$;

-- Enable RLS
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "Allow public read orders" ON orders;
DROP POLICY IF EXISTS "Allow anon read orders" ON orders;
DROP POLICY IF EXISTS "Allow public insert orders" ON orders;
DROP POLICY IF EXISTS "Allow anon insert orders" ON orders;
DROP POLICY IF EXISTS "Allow public update orders" ON orders;
DROP POLICY IF EXISTS "Allow anon update orders" ON orders;

-- Create new policies
CREATE POLICY "Allow public read orders" ON orders FOR SELECT TO public USING (true);
CREATE POLICY "Allow anon read orders" ON orders FOR SELECT TO anon USING (true);
CREATE POLICY "Allow public insert orders" ON orders FOR INSERT TO public WITH CHECK (true);
CREATE POLICY "Allow anon insert orders" ON orders FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "Allow public update orders" ON orders FOR UPDATE TO public USING (true);
CREATE POLICY "Allow anon update orders" ON orders FOR UPDATE TO anon USING (true);

-- =====================
-- CREATE PHOTOS TABLE
-- =====================
CREATE TABLE IF NOT EXISTS photos (
    id SERIAL PRIMARY KEY,
    order_code TEXT,
    image_url TEXT,
    public_id TEXT,
    tag TEXT,
    name TEXT,
    message TEXT,
    uploaded_by TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add created_at if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'photos' AND column_name = 'created_at') THEN
        ALTER TABLE photos ADD COLUMN created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
    END IF;
END $$;

-- Enable RLS
ALTER TABLE photos ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "Allow public read photos" ON photos;
DROP POLICY IF EXISTS "Allow anon read photos" ON photos;
DROP POLICY IF EXISTS "Allow public insert photos" ON photos;
DROP POLICY IF EXISTS "Allow anon insert photos" ON photos;
DROP POLICY IF EXISTS "Allow public update photos" ON photos;
DROP POLICY IF EXISTS "Allow anon update photos" ON photos;
DROP POLICY IF EXISTS "Allow public delete photos" ON photos;
DROP POLICY IF EXISTS "Allow anon delete photos" ON photos;

-- Create new policies
CREATE POLICY "Allow public read photos" ON photos FOR SELECT TO public USING (true);
CREATE POLICY "Allow anon read photos" ON photos FOR SELECT TO anon USING (true);
CREATE POLICY "Allow public insert photos" ON photos FOR INSERT TO public WITH CHECK (true);
CREATE POLICY "Allow anon insert photos" ON photos FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "Allow public update photos" ON photos FOR UPDATE TO public USING (true);
CREATE POLICY "Allow anon update photos" ON photos FOR UPDATE TO anon USING (true);
CREATE POLICY "Allow public delete photos" ON photos FOR DELETE TO public USING (true);
CREATE POLICY "Allow anon delete photos" ON photos FOR DELETE TO anon USING (true);

-- =====================
-- VERIFY TABLES
-- =====================
SELECT 'Tables created successfully!' as status;
SELECT tablename FROM pg_tables WHERE schemaname = 'public';
