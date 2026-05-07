-- ============================================
-- ROW LEVEL SECURITY POLICIES FOR MULTI-EVENT SYSTEM
-- Run this in Supabase SQL Editor after multi_event_schema.sql
-- ============================================

-- ============================================
-- 1. EVENT_REGISTRY POLICIES
-- ============================================

-- Users can read their own event registry entries
DROP POLICY IF EXISTS "Users can read own event registry" ON event_registry;
CREATE POLICY "Users can read own event registry" ON event_registry
    FOR SELECT USING (auth.uid() = user_id);

-- Users can insert their own event registry entries
DROP POLICY IF EXISTS "Users can insert own event registry" ON event_registry;
CREATE POLICY "Users can insert own event registry" ON event_registry
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can update their own event registry entries
DROP POLICY IF EXISTS "Users can update own event registry" ON event_registry;
CREATE POLICY "Users can update own event registry" ON event_registry
    FOR UPDATE USING (auth.uid() = user_id);

-- Users can delete their own event registry entries
DROP POLICY IF EXISTS "Users can delete own event registry" ON event_registry;
CREATE POLICY "Users can delete own event registry" ON event_registry
    FOR DELETE USING (auth.uid() = user_id);

-- Public can read public event registry entries (for gallery/showcase)
DROP POLICY IF EXISTS "Public can read public events" ON event_registry;
CREATE POLICY "Public can read public events" ON event_registry
    FOR SELECT USING (is_public = true);


-- ============================================
-- 2. WEDDINGS POLICIES
-- ============================================

-- Users can read their own weddings
DROP POLICY IF EXISTS "Users can read own weddings" ON weddings;
CREATE POLICY "Users can read own weddings" ON weddings
    FOR SELECT USING (auth.uid() = user_id);

-- Users can insert their own weddings
DROP POLICY IF EXISTS "Users can insert own weddings" ON weddings;
CREATE POLICY "Users can insert own weddings" ON weddings
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can update their own weddings
DROP POLICY IF EXISTS "Users can update own weddings" ON weddings;
CREATE POLICY "Users can update own weddings" ON weddings
    FOR UPDATE USING (auth.uid() = user_id);

-- Users can delete their own weddings
DROP POLICY IF EXISTS "Users can delete own weddings" ON weddings;
CREATE POLICY "Users can delete own weddings" ON weddings
    FOR DELETE USING (auth.uid() = user_id);

-- Public can read public weddings
DROP POLICY IF EXISTS "Public can read public weddings" ON weddings;
CREATE POLICY "Public can read public weddings" ON weddings
    FOR SELECT USING (is_public = true);


-- ============================================
-- 3. ANNIVERSARIES POLICIES
-- ============================================

-- Users can read their own anniversaries
DROP POLICY IF EXISTS "Users can read own anniversaries" ON anniversaries;
CREATE POLICY "Users can read own anniversaries" ON anniversaries
    FOR SELECT USING (auth.uid() = user_id);

-- Users can insert their own anniversaries
DROP POLICY IF EXISTS "Users can insert own anniversaries" ON anniversaries;
CREATE POLICY "Users can insert own anniversaries" ON anniversaries
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can update their own anniversaries
DROP POLICY IF EXISTS "Users can update own anniversaries" ON anniversaries;
CREATE POLICY "Users can update own anniversaries" ON anniversaries
    FOR UPDATE USING (auth.uid() = user_id);

-- Users can delete their own anniversaries
DROP POLICY IF EXISTS "Users can delete own anniversaries" ON anniversaries;
CREATE POLICY "Users can delete own anniversaries" ON anniversaries
    FOR DELETE USING (auth.uid() = user_id);

-- Public can read public anniversaries
DROP POLICY IF EXISTS "Public can read public anniversaries" ON anniversaries;
CREATE POLICY "Public can read public anniversaries" ON anniversaries
    FOR SELECT USING (is_public = true);


-- ============================================
-- 4. PARTIES POLICIES
-- ============================================

-- Users can read their own parties
DROP POLICY IF EXISTS "Users can read own parties" ON parties;
CREATE POLICY "Users can read own parties" ON parties
    FOR SELECT USING (auth.uid() = user_id);

-- Users can insert their own parties
DROP POLICY IF EXISTS "Users can insert own parties" ON parties;
CREATE POLICY "Users can insert own parties" ON parties
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can update their own parties
DROP POLICY IF EXISTS "Users can update own parties" ON parties;
CREATE POLICY "Users can update own parties" ON parties
    FOR UPDATE USING (auth.uid() = user_id);

-- Users can delete their own parties
DROP POLICY IF EXISTS "Users can delete own parties" ON parties;
CREATE POLICY "Users can delete own parties" ON parties
    FOR DELETE USING (auth.uid() = user_id);

-- Public can read public parties
DROP POLICY IF EXISTS "Public can read public parties" ON parties;
CREATE POLICY "Public can read public parties" ON parties
    FOR SELECT USING (is_public = true);


-- ============================================
-- 5. HANGOUTS POLICIES
-- ============================================

-- Users can read their own hangouts
DROP POLICY IF EXISTS "Users can read own hangouts" ON hangouts;
CREATE POLICY "Users can read own hangouts" ON hangouts
    FOR SELECT USING (auth.uid() = user_id);

-- Users can insert their own hangouts
DROP POLICY IF EXISTS "Users can insert own hangouts" ON hangouts;
CREATE POLICY "Users can insert own hangouts" ON hangouts
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can update their own hangouts
DROP POLICY IF EXISTS "Users can update own hangouts" ON hangouts;
CREATE POLICY "Users can update own hangouts" ON hangouts
    FOR UPDATE USING (auth.uid() = user_id);

-- Users can delete their own hangouts
DROP POLICY IF EXISTS "Users can delete own hangouts" ON hangouts;
CREATE POLICY "Users can delete own hangouts" ON hangouts
    FOR DELETE USING (auth.uid() = user_id);

-- Public can read public hangouts
DROP POLICY IF EXISTS "Public can read public hangouts" ON hangouts;
CREATE POLICY "Public can read public hangouts" ON hangouts
    FOR SELECT USING (is_public = true);


-- ============================================
-- 6. OTHER EVENTS POLICIES
-- ============================================

-- Users can read their own other events
DROP POLICY IF EXISTS "Users can read own other events" ON other_events;
CREATE POLICY "Users can read own other events" ON other_events
    FOR SELECT USING (auth.uid() = user_id);

-- Users can insert their own other events
DROP POLICY IF EXISTS "Users can insert own other events" ON other_events;
CREATE POLICY "Users can insert own other events" ON other_events
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can update their own other events
DROP POLICY IF EXISTS "Users can update own other events" ON other_events;
CREATE POLICY "Users can update own other events" ON other_events
    FOR UPDATE USING (auth.uid() = user_id);

-- Users can delete their own other events
DROP POLICY IF EXISTS "Users can delete own other events" ON other_events;
CREATE POLICY "Users can delete own other events" ON other_events
    FOR DELETE USING (auth.uid() = user_id);

-- Public can read public other events
DROP POLICY IF EXISTS "Public can read public other events" ON other_events;
CREATE POLICY "Public can read public other events" ON other_events
    FOR SELECT USING (is_public = true);


-- ============================================
-- 7. BIRTHDAY TABLE (if still exists)
-- ============================================

-- If you still have the old birthdays table, add policies for it too
-- Users can read their own birthdays
-- DROP POLICY IF EXISTS "Users can read own birthdays" ON birthdays;
-- CREATE POLICY "Users can read own birthdays" ON birthdays
--     FOR SELECT USING (auth.uid() = user_id);
-- 
-- Users can insert their own birthdays
-- DROP POLICY IF EXISTS "Users can insert own birthdays" ON birthdays;
-- CREATE POLICY "Users can insert own birthdays" ON birthdays
--     FOR INSERT WITH CHECK (auth.uid() = user_id);
-- 
-- Users can update their own birthdays
-- DROP POLICY IF EXISTS "Users can update own birthdays" ON birthdays;
-- CREATE POLICY "Users can update own birthdays" ON birthdays
--     FOR UPDATE USING (auth.uid() = user_id);
-- 
-- Users can delete their own birthdays
-- DROP POLICY IF EXISTS "Users can delete own birthdays" ON birthdays;
-- CREATE POLICY "Users can delete own birthdays" ON birthdays
--     FOR DELETE USING (auth.uid() = user_id);
-- 
-- Public can read public birthdays
-- DROP POLICY IF EXISTS "Public can read public birthdays" ON birthdays;
-- CREATE POLICY "Public can read public birthdays" ON birthdays
--     FOR SELECT USING (is_public = true);


-- ============================================
-- 8. USER-ORDER RELATIONSHIP (if using orders table)
-- ============================================

-- Users can read their own orders
-- DROP POLICY IF EXISTS "Users can read own orders" ON orders;
-- CREATE POLICY "Users can read own orders" ON orders
--     FOR SELECT USING (auth.uid() = user_id);
-- 
-- Users can insert their own orders
-- DROP POLICY IF EXISTS "Users can insert own orders" ON orders;
-- CREATE POLICY "Users can insert own orders" ON orders
--     FOR INSERT WITH CHECK (auth.uid() = user_id);
-- 
-- Users can update their own orders
-- DROP POLICY IF EXISTS "Users can update own orders" ON orders;
-- CREATE POLICY "Users can update own orders" ON orders
--     FOR UPDATE USING (auth.uid() = user_id);
-- 
-- Users can delete their own orders
-- DROP POLICY IF EXISTS "Users can delete own orders" ON orders;
-- CREATE POLICY "Users can delete own orders" ON orders
--     FOR DELETE USING (auth.uid() = user_id);


-- ============================================
-- 9. RSVP TABLES (already defined, included for completeness)
-- ============================================

-- Wedding RSVP policies - anyone can create/read (public RSVP)
-- Already defined in multi_event_schema.sql

-- Party RSVP policies
-- Already defined in multi_event_schema.sql

-- Hangout RSVP policies  
-- Already defined in multi_event_schema.sql

-- Other Event RSVP policies
-- Already defined in multi_event_schema.sql


-- ============================================
-- 10. FILES/MEDIA TABLES (if using)
-- ============================================

-- If you have tables for storing file uploads, add policies:
-- Users can read their own uploads
-- Users can insert their own uploads
-- Public can read public uploads (if needed)
