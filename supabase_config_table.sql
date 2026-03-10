-- Create the config table for storing application configuration
CREATE TABLE IF NOT EXISTS config (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security (optional - adjust as needed)
ALTER TABLE config ENABLE ROW LEVEL SECURITY;

-- Create a policy to allow public read access to config
CREATE POLICY "Allow public read access to config"
ON config FOR SELECT
TO public
USING (true);

-- Create a policy to allow authenticated users to update config
CREATE POLICY "Allow authenticated users to update config"
ON config FOR UPDATE
TO authenticated
USING (true);

-- Create a policy to allow authenticated users to insert config
CREATE POLICY "Allow authenticated users to insert config"
ON config FOR INSERT
TO authenticated
WITH CHECK (true);

-- Insert the initial momo_number value (replace with your actual number)
INSERT INTO config (key, value) 
VALUES ('momo_number', '0551234567')
ON CONFLICT (key) DO NOTHING;

-- Create orders table with all birthday details fields
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
    -- Birthday Details fields
    background_image TEXT,
    heart_message TEXT,
    date_of_birth DATE,
    letter TEXT,
    nickname TEXT,
    audio_url TEXT,
    photos JSONB,
    user_id TEXT
);

-- Enable RLS on orders
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

-- Policy for orders - Allow public read access
CREATE POLICY "Allow public read access to orders"
ON orders FOR SELECT
TO public
USING (true);

-- Allow anon (unauthenticated) users to read orders
CREATE POLICY "Allow anon read access to orders"
ON orders FOR SELECT
TO anon
USING (true);

-- Allow authenticated users to insert orders
CREATE POLICY "Allow authenticated users to insert orders"
ON orders FOR INSERT
TO authenticated
WITH CHECK (true);

-- Allow anon users to insert orders
CREATE POLICY "Allow anon insert orders"
ON orders FOR INSERT
TO anon
WITH CHECK (true);

-- Allow authenticated users to update orders
CREATE POLICY "Allow authenticated users to update orders"
ON orders FOR UPDATE
TO authenticated
USING (true);

-- Allow anon users to update orders
CREATE POLICY "Allow anon update orders"
ON orders FOR UPDATE
TO anon
USING (true);

-- Create photos table with tagging support
-- Note: Using image_url to match the code queries
CREATE TABLE IF NOT EXISTS photos (
    id SERIAL PRIMARY KEY,
    order_code TEXT NOT NULL,
    image_url TEXT NOT NULL,
    public_id TEXT,
    tag TEXT,
    name TEXT,
    message TEXT,
    uploaded_by TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on photos
ALTER TABLE photos ENABLE ROW LEVEL SECURITY;

-- Policy for photos - Allow public read access
CREATE POLICY "Allow public read access to photos"
ON photos FOR SELECT
TO public
USING (true);

-- Allow anon users to read photos
CREATE POLICY "Allow anon read access to photos"
ON photos FOR SELECT
TO anon
USING (true);

-- Allow authenticated users to insert photos
CREATE POLICY "Allow authenticated users to insert photos"
ON photos FOR INSERT
TO authenticated
WITH CHECK (true);

-- Allow anon users to insert photos for orders
CREATE POLICY "Allow anon insert photos"
ON photos FOR INSERT
TO anon
WITH CHECK (true);

-- Allow authenticated users to delete photos
CREATE POLICY "Allow authenticated users to delete photos"
ON photos FOR DELETE
TO authenticated
USING (true);

-- Allow anon users to delete photos
CREATE POLICY "Allow anon delete photos"
ON photos FOR DELETE
TO anon
USING (true);

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

-- Enable RLS on users
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Policy for users - Allow public read access
CREATE POLICY "Allow public read access to users"
ON users FOR SELECT
TO public
USING (true);

-- Allow anon users to read users
CREATE POLICY "Allow anon read access to users"
ON users FOR SELECT
TO anon
USING (true);

-- Allow authenticated users to insert users
CREATE POLICY "Allow authenticated users to insert users"
ON users FOR INSERT
TO authenticated
WITH CHECK (true);

-- Allow anon users to insert users (for registration)
CREATE POLICY "Allow anon insert users"
ON users FOR INSERT
TO anon
WITH CHECK (true);
