-- Run this SQL to fix/create your Supabase tables
-- This handles both new tables and adding missing columns to existing tables

-- Create orders table if not exists
CREATE TABLE IF NOT EXISTS orders (
    id SERIAL PRIMARY KEY,
    code TEXT UNIQUE NOT NULL,
    recipient_name TEXT NOT NULL,
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

-- Add created_at column if it doesn't exist (for existing tables)
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'created_at') THEN
        ALTER TABLE orders ADD COLUMN created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
    END IF;
END $$;

-- Enable RLS
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS "Allow public read access to orders" ON orders;
DROP POLICY IF EXISTS "Allow anon read access to orders" ON orders;
DROP POLICY IF EXISTS "Allow authenticated users to insert orders" ON orders;
DROP POLICY IF EXISTS "Allow anon insert orders" ON orders;
DROP POLICY IF EXISTS "Allow authenticated users to update orders" ON orders;
DROP POLICY IF EXISTS "Allow anon update orders" ON orders;

-- Create policies
CREATE POLICY "Allow public read access to orders" ON orders FOR SELECT TO public USING (true);
CREATE POLICY "Allow anon read access to orders" ON orders FOR SELECT TO anon USING (true);
CREATE POLICY "Allow authenticated users to insert orders" ON orders FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Allow anon insert orders" ON orders FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "Allow authenticated users to update orders" ON orders FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Allow anon update orders" ON orders FOR UPDATE TO anon USING (true);

-- Create photos table
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

-- Add created_at column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'photos' AND column_name = 'created_at') THEN
        ALTER TABLE photos ADD COLUMN created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
    END IF;
END $$;

-- Add image_url column if it doesn't exist (for existing tables)
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'photos' AND column_name = 'image_url') THEN
        ALTER TABLE photos ADD COLUMN image_url TEXT;
    END IF;
END $$;

-- Enable RLS
ALTER TABLE photos ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "Allow public read access to photos" ON photos;
DROP POLICY IF EXISTS "Allow anon read access to photos" ON photos;
DROP POLICY IF EXISTS "Allow authenticated users to insert photos" ON photos;
DROP POLICY IF EXISTS "Allow anon insert photos" ON photos;
DROP POLICY IF EXISTS "Allow authenticated users to delete photos" ON photos;
DROP POLICY IF EXISTS "Allow anon delete photos" ON photos;

-- Create policies
CREATE POLICY "Allow public read access to photos" ON photos FOR SELECT TO public USING (true);
CREATE POLICY "Allow anon read access to photos" ON photos FOR SELECT TO anon USING (true);
CREATE POLICY "Allow authenticated users to insert photos" ON photos FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Allow anon insert photos" ON photos FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "Allow authenticated users to delete photos" ON photos FOR DELETE TO authenticated USING (true);
CREATE POLICY "Allow anon delete photos" ON photos FOR DELETE TO anon USING (true);

-- Create config table
CREATE TABLE IF NOT EXISTS config (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE config ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "Allow public read access to config" ON config;
DROP POLICY IF EXISTS "Allow authenticated users to update config" ON config;
DROP POLICY IF EXISTS "Allow authenticated users to insert config" ON config;

-- Create policies
CREATE POLICY "Allow public read access to config" ON config FOR SELECT TO public USING (true);
CREATE POLICY "Allow authenticated users to update config" ON config FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Allow authenticated users to insert config" ON config FOR INSERT TO authenticated WITH CHECK (true);

-- Insert default momo number if not exists
INSERT INTO config (key, value) 
VALUES ('momo_number', '0551234567')
ON CONFLICT (key) DO NOTHING;

-- Create users table
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    phone TEXT,
    password TEXT NOT NULL,
    role TEXT DEFAULT 'user',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "Allow public read access to users" ON users;
DROP POLICY IF EXISTS "Allow anon read access to users" ON users;
DROP POLICY IF EXISTS "Allow authenticated users to insert users" ON users;
DROP POLICY IF EXISTS "Allow anon insert users" ON users;

-- Create policies
CREATE POLICY "Allow public read access to users" ON users FOR SELECT TO public USING (true);
CREATE POLICY "Allow anon read access to users" ON users FOR SELECT TO anon USING (true);
CREATE POLICY "Allow authenticated users to insert users" ON users FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Allow anon insert users" ON users FOR INSERT TO anon WITH CHECK (true);
