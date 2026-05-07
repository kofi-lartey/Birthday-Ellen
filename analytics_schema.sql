-- ============================================
-- SLIDESHOW ANALYTICS TABLE
-- Tracks all slideshow interactions for insights
-- ============================================

CREATE TABLE IF NOT EXISTS slideshow_analytics (
    id BIGSERIAL PRIMARY KEY,
    
    -- Event Identification
    event_type VARCHAR(50) NOT NULL,  -- 'birthday', 'wedding', 'anniversary', etc.
    event_id INTEGER,                   -- FK to specific event table (weddings.id, etc.)
    order_code VARCHAR(20),            -- Legacy order code for birthday
    order_id INTEGER,                  -- FK to orders table (if applicable)
    
    -- Session Tracking
    session_id VARCHAR(255) NOT NULL,
    user_agent TEXT,
    ip_address INET,
    viewport_width INTEGER,
    viewport_height INTEGER,
    referrer TEXT,
    country_code CHAR(2),
    region VARCHAR(100),
    
    -- Event Details
    event_name VARCHAR(100) NOT NULL,  -- Event enum from AnalyticsEvents
    slide_index INTEGER,               -- Current slide index (for slide_change events)
    total_slides INTEGER,              -- Total slides in deck
    
    -- Timing Data
    duration_ms BIGINT,                -- Duration of event (for single events)
    time_on_slide_ms BIGINT,           -- Time spent on specific slide
    total_watch_time_ms BIGINT,        -- Total slideshow duration
    avg_time_per_slide_ms BIGINT,      -- Average viewing time
    
    -- Error Tracking
    error_message TEXT,
    error_stack TEXT,
    
    -- JSONB for flexible additional data
    metadata JSONB DEFAULT '{}',       -- Extra context (slide_times, export_format, etc.)
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Indexes for performance
    indexes: {
        idx_event_type: CREATE INDEX idx_slideshow_analytics_event_type ON slideshow_analytics(event_type),
        idx_event_id: CREATE INDEX idx_slideshow_analytics_event_id ON slideshow_analytics(event_id),
        idx_order_code: CREATE INDEX idx_slideshow_analytics_order_code ON slideshow_analytics(order_code),
        idx_session_id: CREATE INDEX idx_slideshow_analytics_session_id ON slideshow_analytics(session_id),
        idx_created_at: CREATE INDEX idx_slideshow_analytics_created_at ON slideshow_analytics(created_at DESC),
        idx_event_name: CREATE INDEX idx_slideshow_analytics_event_name ON slideshow_analytics(event_name)
    }
);

-- Comments for documentation
COMMENT ON TABLE slideshow_analytics IS 'Tracks all slideshow view and interaction events for analytics';
COMMENT ON COLUMN slideshow_analytics.event_type IS 'Type of event (birthday, wedding, anniversary, party, hangout, other, graduation)';
COMMENT ON COLUMN slideshow_analytics.event_name IS 'Specific event that occurred (view, slide_change, download, etc.)';
COMMENT ON COLUMN slideshow_analytics.session_id IS 'Unique session identifier for grouping events';
COMMENT ON COLUMN slideshow_analytics.metadata IS 'Flexible JSON object for additional context and custom metrics';

-- ============================================
-- EVENT TYPE SUMMARY MATERIALIZED VIEW
-- For quick dashboard analytics
-- ============================================

CREATE OR REPLACE VIEW event_type_summary AS
SELECT 
    event_type,
    COUNT(DISTINCT session_id) as unique_viewers,
    COUNT(*) as total_events,
    COUNT(CASE WHEN event_name = 'slideshow_view' THEN 1 END) as total_views,
    COUNT(CASE WHEN event_name = 'slide_change' THEN 1 END) as total_slide_changes,
    COUNT(CASE WHEN event_name = 'download_single' THEN 1 END) as single_downloads,
    COUNT(CASE WHEN event_name = 'download_all' THEN 1 END) as bulk_downloads,
    COUNT(CASE WHEN event_name = 'export_video' THEN 1 END) as video_exports,
    COUNT(CASE WHEN event_name = 'share_whatsapp' THEN 1 END) as whatsapp_shares,
    AVG(total_watch_time_ms) as avg_watch_time_ms,
    MAX(total_watch_time_ms) as max_watch_time_ms,
    MIN(created_at) as first_viewed,
    MAX(created_at) as last_viewed
FROM slideshow_analytics
WHERE event_name IN ('slideshow_view', 'slide_change', 'slideshow_complete')
GROUP BY event_type
ORDER BY total_views DESC;

-- Refresh function (run periodically via cron)
CREATE OR REPLACE FUNCTION refresh_event_type_summary()
RETURNS void AS $$
BEGIN
    REFRESH MATERIALIZED VIEW event_type_summary;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- DAILY ANALYTICS VIEW
-- ============================================

CREATE OR REPLACE VIEW daily_slideshow_stats AS
SELECT 
    DATE(created_at) as date,
    event_type,
    COUNT(DISTINCT session_id) as unique_sessions,
    COUNT(*) as total_events,
    COUNT(DISTINCT order_code) as unique_orders,
    COUNT(CASE WHEN event_name = 'slideshow_view' THEN 1 END) as views,
    COUNT(CASE WHEN event_name = 'download_single' THEN 1 END) as downloads,
    COUNT(CASE WHEN event_name = 'export_video' THEN 1 END) as exports,
    AVG(total_watch_time_ms) as avg_session_duration_ms
FROM slideshow_analytics
GROUP BY DATE(created_at), event_type
ORDER BY date DESC, event_type;

-- ============================================
-- TOP PERFORMING EVENTS VIEW
-- Most viewed/engaged events
-- ============================================

CREATE OR REPLACE VIEW top_performing_events AS
SELECT 
    event_type,
    order_code,
    COUNT(DISTINCT session_id) as view_count,
    COUNT(*) as engagement_score,
    AVG(total_watch_time_ms) as avg_view_time,
    COUNT(CASE WHEN event_name = 'download_single' THEN 1 END) as download_count,
    COUNT(CASE WHEN event_name = 'share_whatsapp' THEN 1 END) as share_count,
    MAX(created_at) as last_activity
FROM slideshow_analytics
GROUP BY event_type, order_code
HAVING COUNT(DISTINCT session_id) > 0
ORDER BY engagement_score DESC, view_count DESC
LIMIT 100;

-- ============================================
-- SESSION FUNNEL ANALYSIS
-- Track complete user journeys
-- ============================================

CREATE OR REPLACE VIEW session_funnels AS
SELECT 
    session_id,
    event_type,
    order_code,
    COUNT(*) as total_events,
    MIN(created_at) as session_start,
    MAX(created_at) as session_end,
    EXTRACT(EPOCH FROM (MAX(created_at) - MIN(created_at))) as session_duration_seconds,
    BOOL_AND(event_name = 'slideshow_complete') as completed,
    json_agg(
        json_build_object(
            'event', event_name,
            'time', created_at,
            'slide', slide_index
        )
    ) as event_sequence
FROM slideshow_analytics
GROUP BY session_id, event_type, order_code
ORDER BY session_start DESC;

-- ============================================
-- GEOGRAPHIC DISTRIBUTION (if country_code available)
-- ============================================

CREATE OR REPLACE VIEW geographic_analytics AS
SELECT 
    COALESCE(country_code, 'unknown') as country,
    COUNT(DISTINCT session_id) as unique_viewers,
    COUNT(*) as total_views,
    AVG(total_watch_time_ms) as avg_watch_time
FROM slideshow_analytics
WHERE country_code IS NOT NULL
GROUP BY country_code
ORDER BY unique_viewers DESC;

-- ============================================
-- CLEANUP FUNCTION (call via cron weekly)
-- Remove old analytics data to manage table size
-- ============================================

CREATE OR REPLACE FUNCTION cleanup_old_analytics(retention_days INTEGER DEFAULT 90)
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM slideshow_analytics 
    WHERE created_at < NOW() - INTERVAL '1 day' * retention_days;
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- RLS POLICIES
-- ============================================

ALTER TABLE slideshow_analytics ENABLE ROW LEVEL SECURITY;

-- Everyone can insert (tracking)
CREATE POLICY "Anyone can insert analytics" 
ON slideshow_analytics FOR INSERT 
WITH CHECK (true);

-- Only authenticated admins can read (protect PII)
CREATE POLICY "Admins can read analytics" 
ON slideshow_analytics FOR SELECT 
USING (
    EXISTS (
        SELECT 1 FROM users 
        WHERE users.id = auth.uid() 
        AND users.role = 'admin'
    )
);

-- ============================================
-- GRANT PERMISSIONS
-- ============================================

GRANT INSERT ON slideshow_analytics TO anon, authenticated;
GRANT SELECT ON slideshow_analytics TO authenticated;
GRANT SELECT ON event_type_summary TO anon, authenticated;
GRANT SELECT ON daily_slideshow_stats TO anon, authenticated;
GRANT SELECT ON top_performing_events TO anon, authenticated;
GRANT SELECT ON session_funnels TO anon, authenticated;
GRANT SELECT ON geographic_analytics TO anon, authenticated;

-- ============================================
-- INSERT SAMPLE QUERIES FOR TESTING
-- ============================================

-- Track a view
INSERT INTO slideshow_analytics (
    event_type, order_code, session_id, event_name, 
    user_agent, viewport_width, viewport_height
) VALUES (
    'birthday', 
    'ABC123', 
    'session_test_001', 
    'slideshow_view',
    'Mozilla/5.0...',
    1920, 
    1080
);

-- Check data
SELECT * FROM slideshow_analytics LIMIT 10;
SELECT * FROM event_type_summary;
SELECT * FROM daily_slideshow_stats LIMIT 5;
