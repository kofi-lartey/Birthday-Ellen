# Data Refresh Troubleshooting Guide

## Symptom
After an admin approves a package payment, the displayed package status (tier) remains "stuck" and does not update on the page, even after manual refresh.

---

## Step 1: Client-Side Checks

### 1.1 Hard Refresh
- **Windows/Linux**: `Ctrl + Shift + R` or `Ctrl + F5`
- **Mac**: `Cmd + Shift + R`

If the data appears after a hard refresh, the issue is browser cache. Clear cache regularly.

### 1.2 Clear Site Data
1. Open DevTools: `F12`
2. Application → Storage → Clear site data
3. Reload page

### 1.3 Disable Extensions
- Temporarily disable ad blockers or privacy extensions that may intercept API calls.

### 1.4 Incognito Mode
Test in private window to rule out localStorage corruption.

---

## Step 2: Network Inspection

### 2.1 Check API Requests
1. Open DevTools → **Network** tab
2. Filter: `XHR` or `Fetch`
3. Approve a package and observe:
   - Is `rpc` call to `approve_package_payment` sent?
   - Status should be `200 OK`
   - Response JSON should contain `success: true`

### 2.2 Failed Requests
- Status `4xx` → Authentication/authorization error
- Status `5xx` → Server/database error
- Network error → Offline or CORS

### 2.3 Disable Cache (DevTools)
In Network tab, check **Disable cache** and reload. If it works now, add cache-control headers to API responses.

---

## Step 3: Real-Time Connectivity

### 3.1 Verify Real-Time Channels
In browser console:
```javascript
// List active Supabase real-time channels
const channels = supabase.getChannels();
console.log('Active channels:', channels.map(c => ({ 
    name: c.name, 
    state: c.state 
})));
```
Expected state: `SUBSCRIBED`. If `CLOSED` or `TIMED_OUT`, real-time is broken.

### 3.2 Test Real-Time Manually
```javascript
// Trigger a test event from Supabase Dashboard:
// Table: users → row → edit any field → save
// The page should update instantly if real-time works.
```

### 3.3 Realtime Misconfiguration
- Ensure `supabaseUrl` and `supabaseKey` are correct in `supabase.js`
- Ensure `is_active = true` for real-time subscriptions
- Check for browser policies blocking WebSockets

---

## Step 4: Database Verification

### 4.1 Confirm Update in Supabase
1. Go to Supabase Dashboard → Table Editor
2. Open `users` table
3. Find the user by ID or email
4. Check if `package_tier` and `payment_status` are updated

If **yes** → Frontend sync issue  
If **no** → Backend stored procedure not updating

### 4.2 Check upgrade_requests Status
```sql
SELECT id, status, approved_by, approved_at 
FROM upgrade_requests 
WHERE user_email = 'user@example.com' 
ORDER BY id DESC LIMIT 1;
```
Should show `status = 'approved'` with timestamps.

### 4.3 Verify Audit Logs
```sql
SELECT * FROM audit_logs 
WHERE table_name = 'users' 
  AND record_id = 'user_id_here'
ORDER BY created_at DESC LIMIT 3;
```
If empty → `log_audit_event` may be failing silently.

### 4.4 RPC Errors
In Supabase → Logs → Edge Functions (or SQL Editor → Query logs):
```sql
SELECT * FROM pg_stat_statements 
WHERE query LIKE '%approve_package_payment%' 
ORDER BY query_start DESC LIMIT 5;
```
Look for errors.

---

## Step 5: Frontend State Debugging

### 5.1 React DevTools
- Inspect `Admin` component state
  - `users` array: does it contain the updated user record?
  - `upgradeRequests` array: does request show `status: 'approved'`?

### 5.2 Component Is Not Re-Rendering
If state changes but UI doesn't update, check:
- Are you mutating state incorrectly? (use immutable updates)
- Are you using `useState` and `setUsers` correctly?

### 5.3 Console Logging
Add temporary logs to `admin.jsx`:
```javascript
useEffect(() => {
    console.log('Users state changed:', users.map(u => ({id: u.id, tier: u.package_tier})));
}, [users]);
```
Watch console when approval happens.

---

## Step 6: LocalStorage Consistency

### 6.1 Inspect localStorage
```javascript
// In console on admin page:
const stored = JSON.parse(localStorage.getItem('birthdayUsers') || '[]');
console.log('Stored users:', stored.map(u => ({id: u.id, tier: u.package_tier})));
```
Compare with displayed list.

### 6.2 Corrupted localStorage
If data is stale or malformed:
```javascript
localStorage.removeItem('birthdayUsers');
location.reload();
```
Will force fresh fetch from Supabase.

---

## Step 7: Common Root Causes (and Fixes)

| Symptom | Likely Cause | Fix |
|---------|-------------|-----|
| UI updates for a few seconds then reverts | Two state setters race; later one overwrites earlier | Consolidate user loading into single function; remove race |
| Nothing happens after approval | RPC call failing silently | Check Network tab; add error alerts; verify SQL function exists |
| Admin sees update, other admin doesn't | Realtime channel not established for other admin | Ensure `setupRealtimeUsers` runs for all logged-in admins |
| Data correct in Supabase but UI wrong | LocalStorage not synced | Immediate localStorage sync after approval (already implemented) |
| After refresh, data is stale again | LocalStorage not overwritten by fresh fetch | Disable localStorage fallback temporarily, use only Supabase |

---

## Step 8: Verification Checklist

Complete after applying fixes:

- [ ] Approve a pending request → Success alert appears
- [ ] User's row in Supabase `users` table shows new `package_tier`
- [ ] Admin panel's Users list shows new tier **without page reload** (real-time)
- [ ] Refresh page → User still shows new tier
- [ ] Audit log entry appears in `audit_logs` for that user
- [ ] In Network tab, `rpc/approve_package_payment` returns 200 with `{success:true}`
- [ ] Realtime channel `admin-users-{id}` shows messages when other admin updates
- [ ] No errors in console

---

## Step 9: Automated Sync (Emergency)

If real-time is broken, use this one-liner to force sync all users:

```javascript
// In browser console on admin page
(async () => {
  const { data: users } = await supabase.from('users').select('id');
  for (const u of users) {
    await supabase.rpc('sync_user_package_tier', { p_user_id: u.id });
  }
  console.log('Sync complete');
  location.reload();
})();
```

---

## Step 10: When All Else Fails

1. **Restart Supabase**: In dashboard, restart project (rarely needed)
2. **Disable/Enable Realtime**: Remove channel subscriptions and re-subscribe
3. **Check Row-Level Security**: Ensure admin policies are active:
   ```sql
   SELECT * FROM pg_policies WHERE tablename = 'users';
   ```
4. **Validate SQL Functions**: Re-run `FINAL_APPROVAL_WORKFLOW.sql` to ensure all functions exist

---

## Notes for Admin Users

- **Multi-tab updates**: Changes made in one admin tab will reflect in others automatically via Realtime.
- **Browser support**: Ensure browser supports WebSockets (all modern browsers do).
- **Mobile**: Real-time works on mobile browsers; ensure network is stable.

---

*Last updated: 2026-04-23*
</content>