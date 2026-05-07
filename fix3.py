c = open('multi_event_schema.sql', 'r', encoding='utf-8').read()

old = '''CREATE POLICY IF NOT EXISTS "Anyone can create wedding RSVP" ON wedding_rsvps FOR INSERT WITH CHECK (true);
CREATE POLICY IF NOT EXISTS "Users can read wedding RSVPs" ON wedding_rsvps FOR SELECT USING (true);

-- Party RSVP policies
CREATE POLICY IF NOT EXISTS "Anyone can create party RSVP" ON party_rsvps FOR INSERT WITH CHECK (true);
CREATE POLICY IF NOT EXISTS "Users can read party RSVPs" ON party_rsvps FOR SELECT USING (true);

-- Hangout RSVP policies
CREATE POLICY IF NOT EXISTS "Anyone can create hangout RSVP" ON hangout_rsvps FOR INSERT WITH CHECK (true);
CREATE POLICY IF NOT EXISTS "Users can read hangout RSVPs" ON hangout_rsvps FOR SELECT USING (true);

-- Other Event RSVP policies
CREATE POLICY IF NOT EXISTS "Anyone can create other event RSVP" ON other_event_rsvps FOR INSERT WITH CHECK (true);
CREATE POLICY IF NOT EXISTS "Users can read other event RSVPs" ON other_event_rsvps FOR SELECT USING (true);'''

new = '''-- Wedding RSVP policies
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
CREATE POLICY "Users can read other event RSVPs" ON other_event_rsvps FOR SELECT USING (true);'''

c = c.replace(old, new)
open('multi_event_schema.sql', 'w', encoding='utf-8').write(c)
print('Replaced')
