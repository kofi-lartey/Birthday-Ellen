-- ============================================
-- PACKAGE APPROVAL WORKFLOW - CLIENT INTEGRATION
-- ============================================
-- This file demonstrates how to call the stored procedures from the frontend.
-- Add these utility functions to your Admin.jsx or a separate service file.

// ============================================
// CLIENT-SIDE INTEGRATION EXAMPLE
// ============================================

/**
 * Approve an upgrade request using the database stored procedure
 * Ensures atomic transaction with audit logging
 */
async function approveUpgradeRequest(requestId, adminUserId, notes = null) {
    try {
        const { data, error } = await supabase.rpc(
            'approve_package_payment',
            {
                p_request_id: requestId,
                p_approved_by: adminUserId,
                p_notes: notes
            }
        );

        if (error) {
            console.error('Approval RPC error:', error);
            throw new Error(error.message);
        }

        if (!data.success) {
            throw new Error(data.error || 'Approval failed');
        }

        return {
            success: true,
            data: data
        };
    } catch (error) {
        console.error('approveUpgradeRequest failed:', error);
        return {
            success: false,
            error: error.message
        };
    }
}

/**
 * Reject an upgrade request using the database stored procedure
 */
async function rejectUpgradeRequest(requestId, adminUserId, reason = null) {
    try {
        const { data, error } = await supabase.rpc(
            'reject_package_payment',
            {
                p_request_id: requestId,
                p_rejected_by: adminUserId,
                p_reason: reason
            }
        );

        if (error) {
            console.error('Rejection RPC error:', error);
            throw new Error(error.message);
        }

        if (!data.success) {
            throw new Error(data.error || 'Rejection failed');
        }

        return {
            success: true,
            data: data
        };
    } catch (error) {
        console.error('rejectUpgradeRequest failed:', error);
        return {
            success: false,
            error: error.message
        };
    }
}

/**
 * Sync user package tier with active subscription
 * Useful for admin debugging or manual sync
 */
async function syncUserPackageTier(userId) {
    try {
        const { data, error } = await supabase.rpc(
            'sync_user_package_tier',
            { p_user_id: userId }
        );

        if (error) {
            console.error('Sync error:', error);
            throw new Error(error.message);
        }

        return {
            success: true,
            data: data
        };
    } catch (error) {
        console.error('syncUserPackageTier failed:', error);
        return {
            success: false,
            error: error.message
        };
    }
}

/**
 * Get audit log for a user (for admin view)
 */
async function getUserAuditLog(userId, limit = 50) {
    try {
        const { data, error } = await supabase.rpc(
            'get_audit_log_for_user',
            {
                p_user_id: userId,
                p_limit: limit
            }
        );

        if (error) {
            console.error('Audit log error:', error);
            throw new Error(error.message);
        }

        return {
            success: true,
            logs: data || []
        };
    } catch (error) {
        console.error('getUserAuditLog failed:', error);
        return {
            success: false,
            error: error.message,
            logs: []
        };
    }
}

// ============================================
// EXAMPLE USAGE IN Admin.jsx:
// ============================================
/*
// Replace the approveUpgradeRequest function with:
async function approveUpgradeRequest(requestId) {
    if (!user?.id) {
        alert('Admin not authenticated');
        return;
    }

    const result = await approveUpgradeRequest(
        requestId, 
        user.id,
        null // optional notes
    );

    if (result.success) {
        alert('✅ Upgrade approved successfully!');
        await Promise.all([
            loadUpgradeRequests(),
            loadUsers()
        ]);
    } else {
        alert('❌ ' + result.error);
    }
}

// Similarly for rejection:
async function rejectUpgradeRequest(requestId) {
    if (!confirm('Are you sure?')) return;
    
    const reason = prompt('Reason (optional):');
    const result = await rejectUpgradeRequest(requestId, user.id, reason);
    
    if (result.success) {
        alert('Request rejected');
        loadUpgradeRequests();
    } else {
        alert('Error: ' + result.error);
    }
}

// Add a "Sync User" button to user cards:
function UserCard({ user }) {
    // ... existing code
    
    const handleSync = async () => {
        const result = await syncUserPackageTier(user.id);
        if (result.success) {
            alert('Synced: ' + result.data.action);
            loadUsers(); // Refresh
        }
    };
    
    // Add button: <button onClick={handleSync}>Sync Tier</button>
}
*/

// ============================================
// ERROR HANDLING GUIDE
// ============================================
/*
Common RPC Error Codes:

- P0001: Raise Exception (custom error from our function)
- 22P02: Invalid text representation (data format issue)
- 23503: Foreign key violation (user/package not found)
- 23505: Unique violation (duplicate entry)
- 42501: Insufficient privileges (RLS violation)

Always check:
1. error.code for SQLSTATE
2. error.message for human-readable message
3. data.success flag from our JSON return
4. data.code for our custom error codes
*/

// ============================================
// FRONTEND VALIDATION (Optional)
// ============================================
/*
Before calling approve, you may want to validate:
- User exists and is active
- Package is active
- Request is still pending
- Admin has proper role

This is already handled inside the stored procedure via SELECT ... FOR UPDATE
which prevents race conditions.
*/

export {
    approveUpgradeRequest,
    rejectUpgradeRequest,
    syncUserPackageTier,
    getUserAuditLog
};
