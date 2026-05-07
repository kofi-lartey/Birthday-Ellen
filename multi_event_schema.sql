-- ============================================
-- MULTI-EVENT SYSTEM DATABASE SCHEMA
-- Completely separate from Birthday
-- ============================================

-- ============================================
-- 1. WEDDING TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS weddings (
    id SERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    couple_names TEXT NOT NULL,
    wedding_date DATE NOT NULL,
    venue TEXT,
    venue_address TEXT,
    
    -- Vendors & Details
    photographer TEXT,
    caterer TEXT,
    florist TEXT,
    
    -- Planning
    guest_count INTEGER,
    dress_code TEXT,
    theme TEXT,
    
    -- Lists
    vendors_json JSONB DEFAULT '{}',  -- {photographer: {...}, caterer: {...}}
    guest_list_json JSONB DEFAULT '{}',  -- {guests: [{name, email, status}]}
    timeline_json JSONB DEFAULT '{}',  -- {events: [{time, description}]}
    
    -- Status
    is_public BOOLEAN DEFAULT false,
    featured BOOLEAN DEFAULT false,
    status TEXT DEFAULT 'planning',  -- planning, locked, completed
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_weddings_user ON weddings(user_id);
CREATE INDEX IF NOT EXISTS idx_weddings_date ON weddings(wedding_date);

ALTER TABLE weddings DROP COLUMN IF EXISTS DJ_or_band;
ALTER TABLE weddings DROP COLUMN IF EXISTS budget;

-- ============================================
-- 2. ANNIVERSARY TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS anniversaries (
    id SERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    couple_names TEXT NOT NULL,
    anniversary_date DATE NOT NULL,
    years_married INTEGER,
    
    -- Content
    gift_idea TEXT,
    special_memory TEXT,  -- story about the relationship
    celebration_plan TEXT,
    
    -- Media
    memory_photos_json JSONB DEFAULT '[]',  -- array of photo URLs
    memories_json JSONB DEFAULT '{}',  -- {milestones: [...]}
    
    -- Display
    is_public BOOLEAN DEFAULT false,
    featured BOOLEAN DEFAULT false,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_anniversaries_user ON anniversaries(user_id);
CREATE INDEX IF NOT EXISTS idx_anniversaries_date ON anniversaries(anniversary_date);

-- ============================================
-- 3. PARTY TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS parties (
    id SERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    party_name TEXT NOT NULL,
    party_date DATE NOT NULL,
    party_time TIME,
    
    -- Party Details
    theme TEXT,
    venue TEXT,
    guest_count INTEGER,
    dress_code TEXT,
    
    -- Entertainment
    music_style TEXT,  -- e.g., "Hip-hop and R&B", "Pop", "Electronic"
    DJ_provided BOOLEAN DEFAULT false,
    
    -- Food
    food_type TEXT,  -- e.g., "Buffet", "Catered", "Potluck", "BBQ"
    dietary_restrictions_json JSONB DEFAULT '[]',
    
    -- Details
    activities_json JSONB DEFAULT '[]',  -- array of activities
    playlist_json JSONB DEFAULT '[]',  -- array of song URLs/names
    
    -- Display
    is_public BOOLEAN DEFAULT false,
    featured BOOLEAN DEFAULT false,
    status TEXT DEFAULT 'planning',
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_parties_user ON parties(user_id);
CREATE INDEX IF NOT EXISTS idx_parties_date ON parties(party_date);

-- ============================================
-- 4. HANGOUT TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS hangouts (
    id SERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    hangout_name TEXT NOT NULL,
    hangout_date DATE NOT NULL,
    hangout_time TIME,
    
    -- Attendees
    who_coming TEXT,  -- "The crew", "Besties", comma-separated names
    expected_people INTEGER,
    
    -- Setup
    location TEXT,
    vibe TEXT,  -- e.g., "Chill", "Active", "Productive"
    
    -- Food & Drinks
    snacks TEXT,  -- "Chips & dip", "Charcuterie board", etc
    drinks_provided BOOLEAN DEFAULT false,
    
    -- Activities
    chill_activities_json JSONB DEFAULT '[]',  -- [gaming, movies, board games, music]
    music_playlist_json JSONB DEFAULT '[]',
    
    -- Details
    notes TEXT,
    
    -- Display
    is_public BOOLEAN DEFAULT false,
    status TEXT DEFAULT 'planned',
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_hangouts_user ON hangouts(user_id);
CREATE INDEX IF NOT EXISTS idx_hangouts_date ON hangouts(hangout_date);

-- ============================================
-- 5. OTHER EVENTS TABLE (Flexible)
-- ============================================
CREATE TABLE IF NOT EXISTS other_events (
    id SERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    event_name TEXT NOT NULL,
    event_date DATE NOT NULL,
    event_time TIME,
    
    -- Flexible Fields
    event_category TEXT,  -- "Conference", "Graduation", "Reunion", "Festival", etc
    description TEXT,
    
    -- Custom Fields (JSON for flexibility)
    custom_fields JSONB DEFAULT '{}',  -- {attendees: [...], location: {...}, details: {...}}
    
    -- Display
    is_public BOOLEAN DEFAULT false,
    featured BOOLEAN DEFAULT false,
    status TEXT DEFAULT 'planned',
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_other_events_user ON other_events(user_id);
CREATE INDEX IF NOT EXISTS idx_other_events_date ON other_events(event_date);

-- ============================================
-- 6. UNIFIED EVENT REGISTRY (for dashboard)
-- ============================================
CREATE TABLE IF NOT EXISTS event_registry (
    id SERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    event_type TEXT NOT NULL,  -- 'birthday', 'wedding', 'anniversary', 'party', 'hangout', 'other'
    event_id INTEGER NOT NULL,  -- FK to specific event table
    event_date DATE NOT NULL,
    event_name TEXT NOT NULL,
    
    -- Quick Access
    is_public BOOLEAN DEFAULT false,
    featured BOOLEAN DEFAULT false,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_event_registry_user_date ON event_registry(user_id, event_date);
CREATE INDEX IF NOT EXISTS idx_event_registry_type ON event_registry(event_type);
CREATE UNIQUE INDEX IF NOT EXISTS idx_event_registry_unique ON event_registry(event_type, event_id);

-- ============================================
-- 7. ENABLE RLS
-- ============================================
ALTER TABLE weddings ENABLE ROW LEVEL SECURITY;
ALTER TABLE anniversaries ENABLE ROW LEVEL SECURITY;
ALTER TABLE parties ENABLE ROW LEVEL SECURITY;
ALTER TABLE hangouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE other_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_registry ENABLE ROW LEVEL SECURITY;

-- ============================================
-- 9. RSVP TABLES
-- ============================================

-- Wedding RSVPs
CREATE TABLE IF NOT EXISTS wedding_rsvps (
    id SERIAL PRIMARY KEY,
    wedding_id INTEGER NOT NULL REFERENCES weddings(id) ON DELETE CASCADE,
    guest_name TEXT NOT NULL,
    guest_email TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'maybe',
    message TEXT,
    rsvp_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_wedding_rsvps_wedding ON wedding_rsvps(wedding_id);

-- Party RSVPs
CREATE TABLE IF NOT EXISTS party_rsvps (
    id SERIAL PRIMARY KEY,
    party_id INTEGER NOT NULL REFERENCES parties(id) ON DELETE CASCADE,
    guest_name TEXT NOT NULL,
    guest_email TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'maybe',
    message TEXT,
    rsvp_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_party_rsvps_party ON party_rsvps(party_id);

-- Hangout RSVPs
CREATE TABLE IF NOT EXISTS hangout_rsvps (
    id SERIAL PRIMARY KEY,
    hangout_id INTEGER NOT NULL REFERENCES hangouts(id) ON DELETE CASCADE,
    guest_name TEXT NOT NULL,
    guest_email TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'maybe',
    message TEXT,
    rsvp_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_hangout_rsvps_hangout ON hangout_rsvps(hangout_id);

-- Other Event RSVPs
CREATE TABLE IF NOT EXISTS other_event_rsvps (
    id SERIAL PRIMARY KEY,
    event_id INTEGER NOT NULL REFERENCES other_events(id) ON DELETE CASCADE,
    guest_name TEXT NOT NULL,
    guest_email TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'maybe',
    message TEXT,
    rsvp_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_other_event_rsvps_event ON other_event_rsvps(event_id);

-- ============================================
-- RLS POLICIES FOR RSVP TABLES
-- ============================================

ALTER TABLE wedding_rsvps ENABLE ROW LEVEL SECURITY;
ALTER TABLE party_rsvps ENABLE ROW LEVEL SECURITY;
ALTER TABLE hangout_rsvps ENABLE ROW LEVEL SECURITY;
ALTER TABLE other_event_rsvps ENABLE ROW LEVEL SECURITY;

-- Wedding RSVP policies
-- Wedding RSVP policies
DROP POLICY IF EXISTS "Anyone can create wedding RSVP" ON wedding_rsvps;
CREATE POLICY "Anyone can create wedding RSVP" ON wedding_rsvps FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "Users can read wedding RSVPs" ON wedding_rsvps;
CREATE POLICY "Users can read wedding RSVPs" ON wedding_rsvps FOR SELECT USING (true);

-- Party RSVP policies
DROP POLICY IF EXISTS "Anyone can create party RSVP" ON party_rsvps;
CREATE POLICY "Anyone can create party RSVP" ON party_rsvps FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "Users can read party RSVPs" ON party_rsvps;
CREATE POLICY "Users can read party RSVPs" ON party_rsvps FOR SELECT USING (true);

-- Hangout RSVP policies
DROP POLICY IF EXISTS "Anyone can create hangout RSVP" ON hangout_rsvps;
CREATE POLICY "Anyone can create hangout RSVP" ON hangout_rsvps FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "Users can read hangout RSVPs" ON hangout_rsvps;
CREATE POLICY "Users can read hangout RSVPs" ON hangout_rsvps FOR SELECT USING (true);

-- Other Event RSVP policies
DROP POLICY IF EXISTS "Anyone can create other event RSVP" ON other_event_rsvps;
CREATE POLICY "Anyone can create other event RSVP" ON other_event_rsvps FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "Users can read other event RSVPs" ON other_event_rsvps;
CREATE POLICY "Users can read other event RSVPs" ON other_event_rsvps FOR SELECT USING (true);
