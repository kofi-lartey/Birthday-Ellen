# Package Approval Workflow - Implementation Guide

## Overview

This system implements a complete backend workflow for administrators to approve package payments with full transaction integrity, audit logging, real-time updates, and error handling.

## Architecture Components

### 1. Database Layer (`FINAL_APPROVAL_WORKFLOW.sql`)
- **Stored Procedures**: Atomic approval/rejection with full transaction
- **Audit Trail**: Complete history of all package tier changes
- **Real-time Triggers**: Automatic notifications on status changes
- **Sync Functions**: Keep `users.package_tier` synchronized with active subscriptions

### 2. Frontend Layer (`src/pages/Admin.jsx`)
- RPC calls to database functions (instead of direct updates)
- Real-time subscriptions for instant cross-tab updates
- Immediate localStorage sync for instant UI feedback
- Comprehensive error handling and user feedback

### 3. Utility Hooks (`src/hooks/usePackageApproval.js`)
- `usePackageRealtime`: Subscribe to user package changes
- `useUserAuditLog`: View audit history for any user
- `useLocalStorageSync`: Keep localStorage in sync with server
- `ApprovalActions`: Reusable approval button component

---

## Step-by-Step Setup

### Step 1: Deploy Database Schema

1. Open **Supabase Dashboard** → **SQL Editor**
2. Paste the entire contents of `FINAL_APPROVAL_WORKFLOW.sql`
3. Execute the query

**Verify installation:**
```sql
-- Should return function definition
SELECT proname, prosrc 
FROM pg_proc 
WHERE proname = 'approve_package_payment';

-- Should return table exists
SELECT tablename FROM pg_tables 
WHERE tablename = 'audit_logs';
```

### Step 2: Update `Admin.jsx` Approval Functions

The updated `approveUpgradeRequest` and `rejectUpgradeRequest` functions in `src/pages/Admin.jsx` now:

- Call stored procedures via RPC (`supabase.rpc`)
- Handle specific database errors with user-friendly messages
- Perform immediate localStorage update for instant UI feedback
- Refresh all relevant data after successful approval
- Log comprehensive audit trail

**Key changes:**
- Replaced inline `UPDATE` queries with single RPC call
- Added error handling for concurrency conflicts
- Added localStorage sync
- Added `loadUsersFromSupabase()` for authoritative user list

### Step 3: Add Real-Time Subscriptions

Two new subscription channels added:

1. **`admin-upgrades-{userId}`**: Listens for all changes to `upgrade_requests`
   - Updates local state instantly when any admin makes changes
   - Supports multi-admin collaboration

2. **`admin-users-{userId}`**: Listens for user record changes
   - Immediately reflects package tier updates across all admin sessions
   - Eliminates need for manual refresh

**Activation:** Subscriptions start automatically when admin logs in (see `useEffect` in Admin.jsx).

### Step 4: Clear Existing Cache (One-time)

After deployment, admins should clear localStorage to avoid stale data:

```javascript
// In browser console on admin page:
localStorage.removeItem('birthdayUsers');
localStorage.removeItem('pending_upgrades');
location.reload();
```

---

## Troubleshooting Data Refresh Issues

### Problem: "Package status remains stuck after refresh"

This was caused by:
1. **Users state came from localStorage only**, not refreshed from Supabase after approval
2. **No real-time subscription** on `users` table
3. **LocalStorage not updated** when admin approved

### Fixes Applied:

1. **Added `loadUsersFromSupabase()`** that fetches fresh user list from database
2. **Added real-time subscription** (`admin-users-{userId}`) to receive live updates
3. **Immediate localStorage sync** within `approveUpgradeRequest` after successful RPC
4. **Merged remote/local user lists** to prevent losing unregistered users

### Manual Debug Steps

If package changes still don't appear:

```javascript
// 1. Check real-time channel is subscribed
const status = supabase.getChannels().map(c => ({
    name: c.name,
    state: c.state
}));
console.log('Channels:', status);

// 2. Force fetch from database
const { data } = await supabase
    .from('users')
    .select('package_tier, package_name, payment_status')
    .eq('id', 'user_id_here');
console.log('Direct DB fetch:', data);

// 3. Clear and reload
localStorage.clear();
location.reload();

// 4. Check Supabase logs for errors
// In Supabase Dashboard → Logs → Edge Functions
```

---

## Audit Log Queries

### Get complete history for a user:
```sql
SELECT * FROM get_audit_log_for_user('user_abc', 50);
```

### Check who approved a specific request:
```sql
SELECT 
    ur.id,
    ur.user_email,
    ur.to_package_tier,
    ur.approved_by,
    u.name as approved_by_name,
    al.created_at as approval_time,
    al.reason
FROM upgrade_requests ur
JOIN audit_logs al ON al.record_id = ur.id::TEXT
    AND al.table_name = 'upgrade_requests'
    AND al.action = 'APPROVE'
LEFT JOIN users u ON u.id::text = ur.approved_by
WHERE ur.id = 123;
```

### Find all recent tier changes:
```sql
SELECT 
    record_id as user_id,
    old_value->>'package_tier' as old_tier,
    new_value->>'package_tier' as new_tier,
    changed_by,
    created_at
FROM audit_logs
WHERE table_name = 'users'
  AND action = 'UPDATE'
  AND field_name LIKE '%package_tier%'
ORDER BY created_at DESC
LIMIT 20;
```

---

## Database Functions Reference

| Function | Purpose | Returns |
|----------|---------|---------|
| `approve_package_payment(request_id, approved_by, notes)` | Atomically approves upgrade; updates user, user_packages, logs audit | `{success, user_id, old_tier, new_tier, ...}` |
| `reject_package_payment(request_id, rejected_by, reason)` | Rejects upgrade; logs audit | `{success, message}` |
| `sync_user_package_tier(user_id)` | Manual sync tool for debugging | `{success, action, old_tier, new_tier}` |
| `get_audit_log_for_user(user_id, limit)` | Admin view of user's history | `TABLE(...)` |
| `get_user_package_history(user_id)` | All packages a user has had | `TABLE(package_tier, started_at, ...)` |

---

## Error Codes & Handling

| Code | Meaning | Suggested UI Response |
|------|---------|-----------------------|
| `NOT_FOUND` | Request or user missing | "Record not found." |
| `ALREADY_PROCESSED` | Request already approved/rejected | "This request was already processed." |
| `USER_NOT_FOUND` | User account missing | "User not found. Contact support." |
| `PACKAGE_INVALID` | Package ID invalid or inactive | "Package configuration error." |
| `TRANSACTION_ERROR` | Database error (rollback) | "System error. Try again." |

---

## Security Notes

1. **SECURITY DEFINER**: Stored procedures run with database owner privileges. Only grant execute to:
   - `authenticated` role (if RLS allows)
   - `service_role` (for server-side)
   - **Never** grant to `anon` role.

2. **Audit Logs**: Immutable by policy; admin users can only read. Do not grant delete.

3. **RLS**: The tables `audit_logs`, `user_packages`, `upgrade_requests` have admin policies. Review in Supabase → Authentication → Policies.

4. **Rate Limiting**: Consider adding rate limiting on RPC calls to prevent abuse.

---

## Testing

### Test 1: Basic Approval Flow
```javascript
// 1. Create pending upgrade request in Supabase:
INSERT INTO upgrade_requests (
    user_id, user_email, from_package_tier, 
    to_package_tier, to_package_id, amount_paid, status
) VALUES (
    'test_user_123', 'test@example.com', 'free', 'premium', 
    (SELECT id FROM packages WHERE tier='premium'), 10.00, 'pending'
);

// 2. Approve via RPC:
SELECT approve_package_payment(LASTVAL(), 'admin_123', 'Test approval');

// 3. Verify user updated:
SELECT package_tier, payment_status FROM users WHERE id = 'test_user_123';
-- Should show: premium, confirmed

// 4. Check audit:
SELECT * FROM audit_logs WHERE record_id = 'test_user_123' ORDER BY created_at DESC;
```

### Test 2: Concurrency (Race Condition) Safety
Open two admin tabs and simultaneously approve the same request. One should succeed, the other return `ALREADY_PROCESSED`.

### Test 3: Real-time Propagation
1. Approve a request in Admin panel
2. Open another admin tab to Dashboard
3. Confirm package tier updates instantly without refresh

### Test 4: Error Handling
1. Approve a non-existent request ID (e.g., 99999)
2. Should return `NOT_FOUND` error gracefully

---

## Monitoring

**Dashboard queries:**

```sql
-- Pending count
SELECT COUNT(*) FROM upgrade_requests WHERE status = 'pending';

-- Approvals in last 24h
SELECT COUNT(*) FROM audit_logs 
WHERE action = 'APPROVE' 
  AND created_at >= NOW() - INTERVAL '1 day';

-- Failures
SELECT * FROM audit_logs 
WHERE action = 'ERROR' 
ORDER BY created_at DESC LIMIT 10;
```

---

## Future Enhancements

1. **Webhook Notifications**: Send Slack/email on approval
2. **Expiry Automation**: `cleanup_expired_packages()` cron job
3. **Refund Workflow**: Add stored procedure for refunds
4. **Upgrade Downgrade**: Allow users to downgrade with proration
5. **Analytics Reports**: Monthly revenue per tier

## Support

For issues:
- Check Supabase Logs → Edge Functions/RPC calls
- Verify RLS policies allow admin access
- Confirm `audit_logs` table is accessible
- Ensure all functions compiled without error: `\df+` in SQL Editor
