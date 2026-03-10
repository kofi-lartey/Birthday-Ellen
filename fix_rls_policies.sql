-- Fix RLS policies to allow public insert/update (idempotent version)
-- Run this in Supabase SQL Editor

-- Drop existing policies on orders (ignore errors if they don't exist)
DROP POLICY IF EXISTS "Allow public read access to orders" ON orders;
DROP POLICY IF EXISTS "Allow anon read access to orders" ON orders;
DROP POLICY IF EXISTS "Allow authenticated users to insert orders" ON orders;
DROP POLICY IF EXISTS "Allow anon insert orders" ON orders;
DROP POLICY IF EXISTS "Allow authenticated users to update orders" ON orders;
DROP POLICY IF EXISTS "Allow anon update orders" ON orders;
DROP POLICY IF EXISTS "Allow public read orders" ON orders;
DROP POLICY IF EXISTS "Allow anon read orders" ON orders;
DROP POLICY IF EXISTS "Allow public insert orders" ON orders;
DROP POLICY IF EXISTS "Allow anon insert orders" ON orders;
DROP POLICY IF EXISTS "Allow public update orders" ON orders;
DROP POLICY IF EXISTS "Allow anon update orders" ON orders;

-- Create policies that allow everything (for development)
CREATE POLICY "Allow public read orders" ON orders FOR SELECT TO public USING (true);
CREATE POLICY "Allow anon read orders" ON orders FOR SELECT TO anon USING (true);
CREATE POLICY "Allow public insert orders" ON orders FOR INSERT TO public WITH CHECK (true);
CREATE POLICY "Allow anon insert orders" ON orders FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "Allow public update orders" ON orders FOR UPDATE TO public USING (true);
CREATE POLICY "Allow anon update orders" ON orders FOR UPDATE TO anon USING (true);

-- Fix photos table policies
DROP POLICY IF EXISTS "Allow public read access to photos" ON photos;
DROP POLICY IF EXISTS "Allow anon read access to photos" ON photos;
DROP POLICY IF EXISTS "Allow authenticated users to insert photos" ON photos;
DROP POLICY IF EXISTS "Allow anon insert photos" ON photos;
DROP POLICY IF EXISTS "Allow authenticated users to delete photos" ON photos;
DROP POLICY IF EXISTS "Allow anon delete photos" ON photos;
DROP POLICY IF EXISTS "Allow public read photos" ON photos;
DROP POLICY IF EXISTS "Allow anon read photos" ON photos;
DROP POLICY IF EXISTS "Allow public insert photos" ON photos;
DROP POLICY IF EXISTS "Allow anon insert photos" ON photos;
DROP POLICY IF EXISTS "Allow public update photos" ON photos;
DROP POLICY IF EXISTS "Allow anon update photos" ON photos;
DROP POLICY IF EXISTS "Allow public delete photos" ON photos;
DROP POLICY IF EXISTS "Allow anon delete photos" ON photos;

CREATE POLICY "Allow public read photos" ON photos FOR SELECT TO public USING (true);
CREATE POLICY "Allow anon read photos" ON photos FOR SELECT TO anon USING (true);
CREATE POLICY "Allow public insert photos" ON photos FOR INSERT TO public WITH CHECK (true);
CREATE POLICY "Allow anon insert photos" ON photos FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "Allow public update photos" ON photos FOR UPDATE TO public USING (true);
CREATE POLICY "Allow anon update photos" ON photos FOR UPDATE TO anon USING (true);
CREATE POLICY "Allow public delete photos" ON photos FOR DELETE TO public USING (true);
CREATE POLICY "Allow anon delete photos" ON photos FOR DELETE TO anon USING (true);

-- Verify RLS is enabled
SELECT 'RLS Status:' as info, tablename, rowsecurity as enabled 
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN ('orders', 'photos', 'users', 'config');
