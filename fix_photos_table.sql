-- Add missing columns to the photos table (including tag column)

-- Add order_code column if it doesn't exist
ALTER TABLE photos ADD COLUMN IF NOT EXISTS order_code TEXT;

-- Add image_url column if it doesn't exist  
ALTER TABLE photos ADD COLUMN IF NOT EXISTS image_url TEXT;

-- Add tag column for filtering (gallery, slideshow, ellen, etc.)
ALTER TABLE photos ADD COLUMN IF NOT EXISTS tag TEXT;

-- Add name column if it doesn't exist
ALTER TABLE photos ADD COLUMN IF NOT EXISTS name TEXT;

-- Add message column if it doesn't exist
ALTER TABLE photos ADD COLUMN IF NOT EXISTS message TEXT;

-- Add created_at column if it doesn't exist
ALTER TABLE photos ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
