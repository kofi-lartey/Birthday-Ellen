-- ============================================
-- SLIDESHOW STATE TABLE
-- Tracks current playback state for real-time sync
-- ============================================

CREATE TABLE IF NOT EXISTS slideshow_state (
    id SERIAL PRIMARY KEY,
    event_id INTEGER NOT NULL,  -- References weddings, anniversaries, parties, etc.
    event_type VARCHAR(50) NOT NULL,  -- For routing to correct table
    
    -- Current State
    current_slide INTEGER DEFAULT 0,
    is_playing BOOLEAN DEFAULT true,
    total_slides INTEGER DEFAULT 0,
    
    -- Who last updated
    updated_by VARCHAR(255),  -- User ID or session ID
    session_id VARCHAR(255),
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT unique_event_state UNIQUE (event_id, event_type),
    
    -- Indexes
    indexes: {
        idx_event_lookup: CREATE UNIQUE INDEX idx_slideshow_state_event ON slideshow_state(event_id, event_type),
        idx_updated_at: CREATE INDEX idx_slideshow_state_updated ON slideshow_state(updated_at DESC)
    }
);

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_slideshow_state_updated_at
    BEFORE UPDATE ON slideshow_state
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Comments
COMMENT ON TABLE slideshow_state IS 'Real-time playback state for multi-viewer synchronization';
COMMENT ON COLUMN slideshow_state.event_id IS 'References the specific event (wedding_id, party_id, etc.)';
COMMENT ON COLUMN slideshow_state.event_type IS 'Type of event for routing to correct foreign table';

-- ============================================
-- RLS POLICIES
-- ============================================

ALTER TABLE slideshow_state ENABLE ROW LEVEL SECURITY;

-- Anyone can read state
CREATE POLICY "Anyone can read slideshow state"
ON slideshow_state FOR SELECT
USING (true);

-- Anyone can update/create state (validated by app logic)
CREATE POLICY "Anyone can upsert slideshow state"
ON slideshow_state FOR INSERT
WITH CHECK (true)
ON CONFLICT DO UPDATE;

-- ============================================
-- GRANTS
-- ============================================

GRANT SELECT, INSERT, UPDATE ON slideshow_state TO anon, authenticated;

-- ============================================
-- VIEW: Active Slideshows
-- Shows currently active (non-finished) slideshows
-- ============================================

CREATE OR REPLACE VIEW active_slideshows AS
SELECT 
    s.event_type,
    s.event_id,
    s.current_slide,
    s.is_playing,
    s.session_id,
    s.updated_at,
    -- Join to get event name based on type
    COALESCE(
        w.couple_names,
        a.couple_names,
        p.party_name,
        h.hangout_name,
        o.event_name
    ) as event_name,
    -- Count unique viewers (approximate via sessions)
    (SELECT COUNT(DISTINCT session_id) 
     FROM slideshow_analytics 
     WHERE event_id = s.event_id 
       AND event_name = 'slideshow_view'
       AND created_at > NOW() - INTERVAL '5 minutes'
    ) as recent_viewers
FROM slideshow_state s
LEFT JOIN weddings w ON s.event_type = 'wedding' AND s.event_id = w.id
LEFT JOIN anniversaries a ON s.event_type = 'anniversary' AND s.event_id = a.id
LEFT JOIN parties p ON s.event_type = 'party' AND s.event_id = p.id
LEFT JOIN hangouts h ON s.event_type = 'hangout' AND s.event_id = h.id
LEFT JOIN other_events o ON s.event_type = 'other' AND s.event_id = o.id
WHERE s.updated_at > NOW() - INTERVAL '1 hour'
ORDER BY s.updated_at DESC;

-- Grant access to the view
GRANT SELECT ON active_slideshows TO anon, authenticated;

-- ============================================
-- SAMPLE DATA FOR TESTING
-- ============================================

-- First insert state for an existing event
INSERT INTO slideshow_state (event_id, event_type, current_slide, is_playing, updated_by)
SELECT 
    id as event_id,
    'wedding' as event_type,
    0 as current_slide,
    true as is_playing,
    'system' as updated_by
FROM weddings
WHERE id = 1  -- Replace with actual ID
ON CONFLICT (event_id, event_type) DO NOTHING;

-- Verify
SELECT * FROM slideshow_state LIMIT 5;
SELECT * FROM active_slideshows LIMIT 5;
