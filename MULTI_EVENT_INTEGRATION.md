# Multi-Event System Integration Guide

## ✅ What's Been Created

### 1. Database Schema (`multi_event_schema.sql`)
- **6 Event Tables**: `weddings`, `anniversaries`, `parties`, `hangouts`, `other_events`
- **Registry Table**: `event_registry` (unified dashboard)
- **RLS Policies**: All tables secured per-user
- **Indexes**: Optimized for fast queries

### 2. React Components
- **EventsDashboard.jsx**: Unified dashboard showing all event types
- **CreateWedding.jsx**: Full-featured wedding planner (like Birthday)
- **CreateAnniversary.jsx**: Warm, reflective anniversary page
- **CreateParty.jsx**: Energetic party planning
- **CreateHangout.jsx**: Casual hangout setup
- **CreateOtherEvent.jsx**: Flexible multi-purpose event creator

## 🔧 Integration Steps

### Step 1: Run the SQL Schema
```sql
-- In Supabase SQL Editor, run:
-- File: multi_event_schema.sql
```

### Step 2: Update `App.jsx` Routes
Add these routes to your React Router setup:

```jsx
import EventsDashboard from './pages/EventsDashboard';
import CreateWedding from './pages/CreateWedding';
import CreateAnniversary from './pages/CreateAnniversary';
import CreateParty from './pages/CreateParty';
import CreateHangout from './pages/CreateHangout';
import CreateOtherEvent from './pages/CreateOtherEvent';

// In your Routes:
<Route path="/events" element={<EventsDashboard />} />
<Route path="/create-wedding" element={<CreateWedding />} />
<Route path="/create-anniversary" element={<CreateAnniversary />} />
<Route path="/create-party" element={<CreateParty />} />
<Route path="/create-hangout" element={<CreateHangout />} />
<Route path="/create-other-event" element={<CreateOtherEvent />} />

// View routes (view individual events)
<Route path="/wedding/:id" element={<WeddingView />} />
<Route path="/anniversary/:id" element={<AnniversaryView />} />
<Route path="/party/:id" element={<PartyView />} />
<Route path="/hangout/:id" element={<HangoutView />} />
<Route path="/other-event/:id" element={<OtherEventView />} />
```

### Step 3: Create Detail View Components

You'll need to create view/edit pages for each event type:
- `WeddingView.jsx` - Full details, edit vendors, guest list, timeline
- `AnniversaryView.jsx` - Show memories, gift ideas, celebration plans
- `PartyView.jsx` - Manage activities, invite guests, playlist
- `HangoutView.jsx` - Show attendees, activities, notes
- `OtherEventView.jsx` - Flexible detail display

### Step 4: Update Navigation
Add a link in your main navigation to `/events`:

```jsx
<Link to="/events" className="...">
  📅 All Events
</Link>
```

---

## 📋 Event Type Structure

| Type | Tone | Full Dashboard? | Key Fields |
|------|------|-----------------|-----------|
| **Birthday** | Celebratory | Yes (existing) | age, cake, gifts |
| **Wedding** | Romantic | Yes | couple, venue, vendors, budget |
| **Anniversary** | Reflective | No (simple view) | years, memory, gift |
| **Party** | Energetic | No (simple view) | theme, music, food |
| **Hangout** | Casual | No (simple view) | who, location, vibe |
| **Other** | Flexible | No (simple view) | custom JSON fields |

---

## 🎨 Color Scheme

- **Wedding**: Pink/Rose (`from-pink-500 to-rose-500`)
- **Anniversary**: Red (`from-red-500 to-rose-500`)
- **Party**: Purple (`from-purple-500 to-indigo-500`)
- **Hangout**: Blue (`from-blue-500 to-cyan-500`)
- **Other**: Gray (`from-gray-600 to-gray-800`)
- **Birthday**: Yellow (existing)

---

## 🚀 Next Steps

1. **Run SQL schema** in Supabase
2. **Add routes** to App.jsx
3. **Create view components** for each event type
4. **Style the dashboard** cards and navigation
5. **Add RSVP functionality** to shareable events
6. **Create event editing** for users to modify details
7. **Add social sharing** (sharable links with custom messages)

---

## 📝 Sample Database Entries

After setting up, users can create:
- A wedding 💍 with vendor management
- An anniversary 💕 with family sharing
- A party 🎉 with guest invites
- A hangout 👋 with activity suggestions
- Any event 📅 with custom fields

All appear unified in the **Events Dashboard** and sync properly between tables!
