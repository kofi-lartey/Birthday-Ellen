-- Add missing columns to the orders table (idempotent version)
-- Run this in Supabase SQL Editor

-- Add missing columns (will not fail if they already exist)
ALTER TABLE orders ADD COLUMN IF NOT EXISTS background_image TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS heart_message TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS letter TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS nickname TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS audio_url TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS photos JSONB;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS user_id TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
ALTER TABLE orders ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Verify table structure
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'orders' 
ORDER BY ordinal_position;
