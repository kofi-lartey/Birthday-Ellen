-- ============================================
-- MULTI-EVENT SYSTEM DATABASE SCHEMA
-- Completely separate from Birthday
-- ============================================

-- ============================================
-- 1. WEDDING TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS weddings (
    id SERIAL PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    couple_names TEXT NOT NULL,
    wedding_date DATE NOT NULL,
    venue TEXT,
    venue_address TEXT,
    
    -- Vendors & Details
    photographer TEXT,
    caterer TEXT,
    florist TEXT,
    DJ_or_band TEXT,
    
    -- Planning
    budget DECIMAL(12,2),
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

CREATE INDEX idx_weddings_user ON weddings(user_id);
CREATE INDEX idx_weddings_date ON weddings(wedding_date);

-- ============================================
-- 2. ANNIVERSARY TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS anniversaries (
    id SERIAL PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
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

CREATE INDEX idx_anniversaries_user ON anniversaries(user_id);
CREATE INDEX idx_anniversaries_date ON anniversaries(anniversary_date);

-- ============================================
-- 3. PARTY TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS parties (
    id SERIAL PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
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

CREATE INDEX idx_parties_user ON parties(user_id);
CREATE INDEX idx_parties_date ON parties(party_date);

-- ============================================
-- 4. HANGOUT TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS hangouts (
    id SERIAL PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
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

CREATE INDEX idx_hangouts_user ON hangouts(user_id);
CREATE INDEX idx_hangouts_date ON hangouts(hangout_date);

-- ============================================
-- 5. OTHER EVENTS TABLE (Flexible)
-- ============================================
CREATE TABLE IF NOT EXISTS other_events (
    id SERIAL PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
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

CREATE INDEX idx_other_events_user ON other_events(user_id);
CREATE INDEX idx_other_events_date ON other_events(event_date);

-- ============================================
-- 6. UNIFIED EVENT REGISTRY (for dashboard)
-- ============================================
CREATE TABLE IF NOT EXISTS event_registry (
    id SERIAL PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    event_type TEXT NOT NULL,  -- 'birthday', 'wedding', 'anniversary', 'party', 'hangout', 'other'
    event_id INTEGER NOT NULL,  -- FK to specific event table
    event_date DATE NOT NULL,
    event_name TEXT NOT NULL,
    
    -- Quick Access
    is_public BOOLEAN DEFAULT false,
    featured BOOLEAN DEFAULT false,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_event_registry_user_date ON event_registry(user_id, event_date);
CREATE INDEX idx_event_registry_type ON event_registry(event_type);
CREATE UNIQUE INDEX idx_event_registry_unique ON event_registry(event_type, event_id);

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
-- 8. POLICIES
-- ============================================

-- Wedding policies
CREATE POLICY "Users can read own weddings" ON weddings
    FOR SELECT USING (auth.uid()::text = user_id);
CREATE POLICY "Users can create weddings" ON weddings
    FOR INSERT WITH CHECK (auth.uid()::text = user_id);
CREATE POLICY "Users can update own weddings" ON weddings
    FOR UPDATE USING (auth.uid()::text = user_id);
CREATE POLICY "Users can delete own weddings" ON weddings
    FOR DELETE USING (auth.uid()::text = user_id);

-- Anniversary policies
CREATE POLICY "Users can read own anniversaries" ON anniversaries
    FOR SELECT USING (auth.uid()::text = user_id);
CREATE POLICY "Users can create anniversaries" ON anniversaries
    FOR INSERT WITH CHECK (auth.uid()::text = user_id);
CREATE POLICY "Users can update own anniversaries" ON anniversaries
    FOR UPDATE USING (auth.uid()::text = user_id);
CREATE POLICY "Users can delete own anniversaries" ON anniversaries
    FOR DELETE USING (auth.uid()::text = user_id);

-- Party policies
CREATE POLICY "Users can read own parties" ON parties
    FOR SELECT USING (auth.uid()::text = user_id);
CREATE POLICY "Users can create parties" ON parties
    FOR INSERT WITH CHECK (auth.uid()::text = user_id);
CREATE POLICY "Users can update own parties" ON parties
    FOR UPDATE USING (auth.uid()::text = user_id);
CREATE POLICY "Users can delete own parties" ON parties
    FOR DELETE USING (auth.uid()::text = user_id);

-- Hangout policies
CREATE POLICY "Users can read own hangouts" ON hangouts
    FOR SELECT USING (auth.uid()::text = user_id);
CREATE POLICY "Users can create hangouts" ON hangouts
    FOR INSERT WITH CHECK (auth.uid()::text = user_id);
CREATE POLICY "Users can update own hangouts" ON hangouts
    FOR UPDATE USING (auth.uid()::text = user_id);
CREATE POLICY "Users can delete own hangouts" ON hangouts
    FOR DELETE USING (auth.uid()::text = user_id);

-- Other events policies
CREATE POLICY "Users can read own other_events" ON other_events
    FOR SELECT USING (auth.uid()::text = user_id);
CREATE POLICY "Users can create other_events" ON other_events
    FOR INSERT WITH CHECK (auth.uid()::text = user_id);
CREATE POLICY "Users can update own other_events" ON other_events
    FOR UPDATE USING (auth.uid()::text = user_id);
CREATE POLICY "Users can delete own other_events" ON other_events
    FOR DELETE USING (auth.uid()::text = user_id);

-- Event registry policies
CREATE POLICY "Users can read own event_registry" ON event_registry
    FOR SELECT USING (auth.uid()::text = user_id);
CREATE POLICY "Users can create event_registry" ON event_registry
    FOR INSERT WITH CHECK (auth.uid()::text = user_id);
CREATE POLICY "Users can delete from event_registry" ON event_registry
    FOR DELETE USING (auth.uid()::text = user_id);
