# Package Tier System Documentation

## Overview
This document describes the package tier feature system implemented in the birthday app, including feature availability, verification testing, and text transformation logic.

---

## Package Tier Feature Matrix

### Feature Comparison Table

| Feature | Free | Basic | Premium | Enterprise |
|---------|------|-------|---------|------------|
| **Price** | Free | $9.99/mo | $24.99/mo | $99.99/yr |
| **Page Types** | | | | |
| - Birthday | ✅ | ✅ | ✅ | ✅ |
| - Wedding | ❌ | ✅ | ✅ | ✅ |
| - Anniversary | ❌ | ❌ | ✅ | ✅ |
| - Graduation | ❌ | ❌ | ✅ | ✅ |
| - Custom | ❌ | ❌ | ❌ | ✅ |
| **Limits** | | | | |
| Max Photos/Page | 5 | 15 | 50 | Unlimited |
| Max Videos/Page | 0 | 1 | 3 | Unlimited |
| Max Audio Files | 0 | 0 | 2 | Unlimited |
| Max Storage (MB) | 50 | 150 | 500 | Unlimited |
| Max Pages (Total) | 1 | 3 | 10 | Unlimited |
| Max Collaborators | 1 | 1 | 3 | Unlimited |
| **Features** | | | | |
| Music Player | ❌ | ✅ | ✅ | ✅ |
| Video Player | ❌ | ❌ | ✅ | ✅ |
| Gift Registry | ❌ | ✅ | ✅ | ✅ |
| RSVP | ❌ | ❌ | ✅ | ✅ |
| Guestbook | ❌ | ❌ | ✅ | ✅ |
| QR Codes | ❌ | ❌ | ✅ | ✅ |
| Custom Themes | ❌ | ❌ | ✅ | ✅ |
| Analytics | ❌ | ❌ | ✅ | ✅ |
| Custom Domain | ❌ | ❌ | ❌ | ✅ |
| Remove Branding | ❌ | ❌ | ❌ | ✅ |

---

## Where Package Restrictions Are Enforced

### 1. Dashboard.jsx (`src/pages/Dashboard.jsx`)

**Page Type Selection** (Lines 197-205):
```javascript
const allowedPageTypes = {
    free: ['birthday'],
    basic: ['birthday', 'wedding'],
    premium: ['birthday', 'wedding', 'anniversary', 'graduation'],
    enterprise: ['birthday', 'wedding', 'anniversary', 'graduation', 'custom']
}
if (!allowedPageTypes[userTier]?.includes(pageType)) {
    alert(`Your current package (${userTier}) does not allow creating ${pageType} pages. Please upgrade your package.`)
    return
}
```

**Page Limit Check** (Lines 208-218):
```javascript
const maxPagesPerTier = {
    free: 1,
    basic: 3,
    premium: 10,
    enterprise: 999999
}
const maxPages = maxPagesPerTier[userTier] || 1
if (orders.length >= maxPages) {
    alert(`Your current package (${userTier}) allows only ${maxPages} page(s). Please upgrade to create more pages.`)
    return
}
```

**Photo Upload Limit** (Lines 288-299):
```javascript
function getMaxPhotos(packageType) {
    const tier = packageType || user?.package_tier || 'free'
    const maxPhotosPerTier = {
        premium: 50,
        basic: 15,
        free: 5,
        enterprise: 999999
    }
    return maxPhotosPerTier[tier] || 5
}
```

---

## Verification Plan

### Testing Scenarios by Tier

#### 1. Free Tier Testing
- [ ] Register new account → Should redirect to package selection
- [ ] Select Free package → Should redirect to Dashboard
- [ ] Try to create Wedding page → Should show error message
- [ ] Create Birthday page → Should work
- [ ] Try to upload more than 5 photos → Should block upload
- [ ] Try to create second page → Should show page limit error
- [ ] Click Upgrade button → Should navigate to SelectPackage

#### 2. Basic Tier Testing
- [ ] Login with Basic account → Should see "BASIC" badge in header
- [ ] Create Birthday page → Should work
- [ ] Create Wedding page → Should work
- [ ] Try to create Anniversary page → Should show upgrade required
- [ ] Upload 15 photos → Should work
- [ ] Try to upload 16th photo → Should block upload
- [ ] Try to create 4th page → Should show page limit error

#### 3. Premium Tier Testing
- [ ] Login with Premium account → Should see gradient rose/pink badge
- [ ] Create all page types (Birthday, Wedding, Anniversary, Graduation) → All should work
- [ ] Upload 50 photos → Should work
- [ ] Try to upload 51st photo → Should block upload
- [ ] Try to create 11th page → Should show page limit error

#### 4. Enterprise Tier Testing
- [ ] Login with Enterprise account → Should see purple badge
- [ ] Create Custom page type → Should work
- [ ] Should NOT see "Upgrade" button in header

### API Endpoints to Check

1. **Supabase - users table**
   - Check `package_id`, `package_tier` columns are populated
   
2. **Supabase - packages table**
   - Verify all 4 tiers exist with correct feature flags
   
3. **Supabase - user_packages table**
   - Verify subscription records for non-free tiers

### UI Elements to Verify

1. **Dashboard Header**
   - Package badge shows correct tier and color
   - Upgrade button appears for non-Enterprise tiers
   
2. **Create Page Modal**
   - Page type dropdown shows only allowed options
   - Warning text appears for restricted page types
   
3. **SelectPackage Page**
   - Current plan highlighted with "Current Plan" badge
   - All tiers display with correct features

---

## Text Transformation Logic

### Where Celebration Type Text Changes

The celebration type (pageType) is stored in the order and used throughout the app:

#### 1. Order Creation (Dashboard.jsx)
```javascript
// Line 230 - Stores pageType with order
pageType: pageType,
```

#### 2. Page Display (Birthday.jsx)
The Birthday.jsx page is used for ALL celebration types. Text transformations are based on:
- `order.page_type` - The stored celebration type
- `order.recipientName` - Name of the celebration person
- `order.birthdayDate` - The celebration date

**Dynamic Text Examples:**
- "birthday" → "Birthday Person", "Happy Birthday"
- "wedding" → "Wedding Couple", "Happy Wedding"
- "anniversary" → "Celebration Person", "Happy Anniversary"
- "graduation" → "Graduate", "Congratulations Graduate"

#### 3. Dashboard Page Type Selection (Dashboard.jsx Lines 736-758)
```javascript
<select value={pageType} onChange={(e) => setPageType(e.target.value)}>
    <option value="birthday">Birthday 🎂</option>
    <option value="wedding">Wedding 💒</option>
    <option value="anniversary">Anniversary 💕</option>
    <option value="graduation">Graduation 🎓</option>
    <option value="custom">Custom ✨</option>
</select>
```

### Modifying Text Transformations

To extend celebration types, modify these locations:

1. **Add new page type in Dashboard.jsx:**
   - Add option to select dropdown (line ~736)
   - Add to allowedPageTypes object (line ~197)
   - Update validation messages

2. **Add feature toggle in packages_database.sql:**
   - Add column `allow_{type}_pages BOOLEAN`
   - Insert new tier configurations

3. **Add text templates in Birthday.jsx:**
   - Create mapping object for celebration-specific text
   - Example:
   ```javascript
   const celebrationText = {
       birthday: { title: "Happy Birthday", personLabel: "Birthday Person" },
       wedding: { title: "Congratulations", personLabel: "Wedding Couple" },
       anniversary: { title: "Happy Anniversary", personLabel: "Celebration Couple" },
       graduation: { title: "Congratulations", personLabel: "Graduate" }
   }
   ```

---

## Potential Issues and Gaps

### Identified Issues

1. **Text Not Dynamic** - Currently Birthday.jsx always shows "birthday" text regardless of pageType. The page uses hardcoded "Birthday" text throughout.

2. **Missing Feature Restrictions** - Features like music player, video player, gift registry are defined in the package but NOT enforced in the UI. Users can access these regardless of tier.

3. **No Upgrade Prompt** - When users try to access features they don't have, there's no upgrade prompt - just silent failure or generic errors.

### Fixes Needed

1. **Update Birthday.jsx** to dynamically show text based on `order.page_type`:
   ```javascript
   const celebrationType = order.page_type || 'birthday'
   const labels = {
       birthday: { title: 'Happy Birthday', person: 'Birthday Person', emoji: '🎂' },
       wedding: { title: 'Congratulations', person: 'Wedding Couple', emoji: '💒' },
       // ... etc
   }
   ```

2. **Add feature gate checks** in Dashboard details modal for:
   - Music player upload (Premium+)
   - Video player upload (Premium+)
   - Gift registry access (Basic+)
   - RSVP access (Premium+)

3. **Add upgrade prompts** when users try restricted features

---

## File Reference Guide

| File | Purpose | Key Lines |
|------|---------|-----------|
| `src/pages/Dashboard.jsx` | Main page creation & package enforcement | 197-218, 288-299, 736-758 |
| `src/pages/SelectPackage.jsx` | Package selection UI | 10-115, 217-264 |
| `src/hooks/usePackage.jsx` | Package hook utilities | 6-30, 195-230 |
| `packages_database.sql` | Database schema | Full file |
| `src/pages/Birthday.jsx` | Page display (needs updates) | All - needs text dynamic |

---

## Database Schema Reference

See `packages_database.sql` for complete table definitions:

- `packages` - Package tier definitions
- `users` - User accounts with package_id foreign key  
- `user_packages` - Subscription tracking
- `orders` - Page orders with page_type column
