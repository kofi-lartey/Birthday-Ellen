# Date Handling Fix - Debugging Guide

## Issue Summary
The wedding website application was displaying "Invalid Date" errors when rendering dates retrieved from Supabase database. This issue affected all event pages (Wedding, Anniversary, Party, Hangout, Other Events).

## Root Causes

### 1. Frontend Date Formatting Issue
Date inputs (`type="date"`) return values in format "YYYY-MM-DD". These were being sent directly to Supabase without proper ISO 8601 conversion, which can cause parsing failures.

### 2. Unsafe Date Parsing
View components used `new Date(value).toLocaleDateString()` without validation, causing runtime errors when:
- The date string format was incompatible with the browser's `Date` parser
- The date value was `null` or `undefined`
- PostgreSQL returned the date in an unexpected format

### 3. Missing Null Checks
No defensive checks for null/undefined dates before attempting to parse/display them.

### 4. Schema Mismatch Potential
PostgreSQL `DATE` columns expect dates in ISO 8601 format (`YYYY-MM-DD`). While Supabase's JavaScript client handles some conversion, explicit formatting ensures consistency across browsers.

## Files Modified

### New Files
- `src/utils/dateUtils.js` - Date utility functions for consistent formatting and safe parsing

### Modified Files
- `src/pages/CreateWedding.jsx` - Added date formatting before DB insert
- `src/pages/EditWedding.jsx` - Added date utility imports
- `src/pages/WeddingView.jsx` - Added safe date formatting for display
- `src/pages/CreateAnniversary.jsx` - Added date formatting
- `src/pages/EditAnniversary.jsx` - Added date utility imports
- `src/pages/AnniversaryView.jsx` - Added safe date formatting for display
- `src/pages/CreateParty.jsx` - Added date formatting
- `src/pages/EditParty.jsx` - Added date utility imports
- `src/pages/PartyView.jsx` - Added safe date formatting for display
- `src/pages/CreateHangout.jsx` - Added date formatting
- `src/pages/EditHangout.jsx` - Added date utility imports
- `src/pages/HangoutView.jsx` - Added safe date formatting for display
- `src/pages/CreateOtherEvent.jsx` - Added date formatting
- `src/pages/EditOtherEvent.jsx` - Added date utility imports
- `src/pages/OtherEventView.jsx` - Added safe date formatting for display
- `src/pages/GenericEventView.jsx` - Added safe date formatting for dynamic date fields

## Date Utility Functions

### `formatDateForDB(date)`
Converts a date string or Date object to ISO 8601 date string (YYYY-MM-DD) for database storage.

**Parameters:**
- `date` (string|Date) - Date input

**Returns:**
- `string` - ISO 8601 formatted date string, or `null` if invalid

**Usage:**
```javascript
import { formatDateForDB } from '../utils/dateUtils';

const dateString = formatDateForDB('2026-05-07'); // "2026-05-07"
const forDB = formatDateForDB(new Date()); // "2026-05-07"

await supabase.from('weddings').insert({
  ...formData,
  wedding_date: formatDateForDB(formData.wedding_date)
});
```

### `safeFormatDate(date, options, locale)`
Safely formats a date for display with comprehensive error handling.

**Parameters:**
- `date` (string|Date) - Date to format
- `options` (Object) - toLocaleDateString options (optional)
- `locale` (string) - Locale string, default: 'en-US' (optional)

**Returns:**
- `string` - Formatted date or 'Invalid date' string on error

**Usage:**
```javascript
import { safeFormatDate } from '../utils/dateUtils';

const display = safeFormatDate(wedding.wedding_date);
// "Wednesday, May 7, 2026"

const short = safeFormatDate(date, { month: 'short', day: 'numeric' });
// "May 7"
```

### `safeFormatTime(date)`
Safely formats a date as time.

**Parameters:**
- `date` (string|Date) - Date to format

**Returns:**
- `string` - Formatted time (e.g., "2:30 PM") or empty string on error

**Usage:**
```javascript
import { safeFormatTime } from '../utils/dateUtils';

const time = safeFormatTime('2026-05-07T14:30:00');
// "2:30 PM"
```

### `isValidDateString(dateString)`
Validates that a date string can be parsed.

**Parameters:**
- `dateString` (string) - Date string to validate

**Returns:**
- `boolean` - True if valid date string

**Usage:**
```javascript
import { isValidDateString } from '../utils/dateUtils';

if (isValidDateString(formData.date)) {
  // Proceed with date
}
```

## Implementation Examples

### Before (Vulnerable)
```javascript
// CreateWedding.jsx - No date formatting
const { data, error } = await supabase
  .from('weddings')
  .insert({
    ...formData  // Date sent as-is
  });

// WeddingView.jsx - Unsafe parsing
<p>{new Date(wedding.wedding_date).toLocaleDateString()}</p>
// Throws: "Invalid Date" if parsing fails
```

### After (Fixed)
```javascript
// CreateWedding.jsx - With date formatting
import { formatDateForDB } from '../utils/dateUtils';

const { data, error } = await supabase
  .from('weddings')
  .insert({
    ...formData,
    wedding_date: formatDateForDB(formData.wedding_date)
  });

// WeddingView.jsx - Safe display
import { safeFormatDate } from '../utils/dateUtils';

<p>{safeFormatDate(wedding.wedding_date)}</p>
// Always returns valid string
```

## Data Flow

### Insert Path (Create/Edit → DB)
1. User selects date in date picker input (type="date")
2. Input value is string in "YYYY-MM-DD" format
3. `formatDateForDB()` validates and formats to ISO 8601
4. Formatted date sent to Supabase
5. Supabase stores in PostgreSQL DATE column

### Retrieve Path (DB → Display)
1. Supabase returns date as string ("YYYY-MM-DD") or ISO string
2. `safeFormatDate()` parses with error handling
3. Formatted date displayed to user
4. If parsing fails, "Invalid date" message shown (no crash)

## Supabase Configuration

No special Supabase configuration needed. The JavaScript client handles date serialization automatically, but explicit formatting ensures consistency:

```javascript
// Recommended: Explicit date formatting
import { formatDateForDB } from './utils/dateUtils';

await supabase
  .from('weddings')
  .insert({
    wedding_date: formatDateForDB('2026-05-07')
  });

// PostgreSQL DATE column stores: 2026-05-07
```

## Testing

Run the build to verify no syntax errors:
```bash
npm run build
```

Test date utilities:
```bash
node test/test-date-utils.js
```

## Browser Compatibility

All date operations use standard JavaScript Date API with ISO 8601 strings, ensuring consistency across:
- Chrome/Edge (V8)
- Firefox (SpiderMonkey)
- Safari (JavaScriptCore)
- Mobile browsers

## Known Limitations

1. **Time Zones**: Dates without times are treated as UTC midnight. For timezone-sensitive applications, use `TIMESTAMPTZ` columns.

2. **Date Validation**: The `isValidDateString` function validates format but doesn't check if dates are reasonable (e.g., year 0001 or 9999).

3. **Locale Dependence**: Display formatting depends on browser locale settings. The default 'en-US' locale ensures consistent output.

## Best Practices

1. Always format dates before sending to Supabase
2. Never use `new Date()` without error handling in render functions
3. Use `safeFormatDate()` for all date display
4. Validate user input dates before processing
5. Store dates in ISO 8601 format (YYYY-MM-DD) for consistency

## References

- [PostgreSQL Date/Time Types](https://www.postgresql.org/docs/current/datatype-datetime.html)
- [ISO 8601](https://en.wikipedia.org/wiki/ISO_8601)
- [Supabase JavaScript Client](https://supabase.com/docs/reference/javascript)
- [JavaScript Date](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Date)
