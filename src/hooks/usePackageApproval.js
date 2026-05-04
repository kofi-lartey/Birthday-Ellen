/**
 * PACKAGE APPROVAL WORKFLOW - FRONTEND INTEGRATION GUIDE
 * 
 * This module provides React hooks and utilities for real-time package tier updates
 * and audit logging when admin approval workflows complete.
 */

import { useEffect, useState, useCallback } from 'react';
import { supabase } from '../supabase';

// ============================================
// REAL-TIME SUBSCRIPTION HOOK
// ============================================

/**
 * Hook to subscribe to user package tier changes in real-time.
 * Call this in any component that displays user package info.
 * 
 * Usage:
 *   const { currentTier, lastUpdated, syncStatus } = usePackageRealtime(userId);
 */
export function usePackageRealtime(userId) {
    const [currentTier, setCurrentTier] = useState(null);
    const [packageId, setPackageId] = useState(null);
    const [lastUpdated, setLastUpdated] = useState(null);
    const [syncStatus, setSyncStatus] = useState('idle'); // idle, syncing, success, error
    const [error, setError] = useState(null);

    useEffect(() => {
        if (!userId) return;

        // Initial fetch
        const fetchUserPackage = async () => {
            setSyncStatus('syncing');
            try {
                const { data, error } = await supabase
                    .from('users')
                    .select('package_tier, package_id, package_expires_at, updated_at')
                    .eq('id', userId)
                    .single();

                if (error) throw error;
                
                setCurrentTier(data?.package_tier || 'free');
                setPackageId(data?.package_id);
                setLastUpdated(data?.updated_at);
                setSyncStatus('success');
                setError(null);
            } catch (err) {
                console.error('Error fetching user package:', err);
                setSyncStatus('error');
                setError(err.message);
            }
        };

        fetchUserPackage();

        // Set up real-time subscription
        const channel = supabase
            .channel(`user-package-${userId}`)
            .on(
                'postgres_changes',
                {
                    event: 'UPDATE',
                    schema: 'public',
                    table: 'users',
                    filter: `id=eq.${userId}`
                },
                (payload) => {
                    console.log('User package changed:', payload);
                    const newRecord = payload.new;
                    setCurrentTier(newRecord.package_tier);
                    setPackageId(newRecord.package_id);
                    setLastUpdated(newRecord.updated_at);
                    setSyncStatus('success');
                }
            )
            .subscribe();

        // Also listen to user_packages changes (for subscription tracking)
        const packageChannel = supabase
            .channel(`user-packages-${userId}`)
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'user_packages',
                    filter: `user_id=eq.${userId}`
                },
                (payload) => {
                    console.log('New user package record:', payload);
                    // If this is an active package, sync user record immediately
                    if (payload.new.is_active) {
                        setTimeout(() => {
                            // Re-fetch user to ensure consistency
                            supabase
                                .from('users')
                                .select('package_tier, package_id')
                                .eq('id', userId)
                                .single()
                                .then(({ data }) => {
                                    if (data) {
                                        setCurrentTier(data.package_tier);
                                        setPackageId(data.package_id);
                                    }
                                });
                        }, 100); // Brief delay to let transaction settle
                    }
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
            supabase.removeChannel(packageChannel);
        };
    }, [userId]);

    const refresh = useCallback(async () => {
        const { data, error } = await supabase
            .from('users')
            .select('package_tier, package_id, updated_at')
            .eq('id', userId)
            .single();
        
        if (!error && data) {
            setCurrentTier(data.package_tier);
            setPackageId(data.package_id);
            setLastUpdated(data.updated_at);
        }
    }, [userId]);

    return {
        currentTier,
        packageId,
        lastUpdated,
        syncStatus,
        error,
        refresh
    };
}

// ============================================
// AUDIT LOG HOOK
// ============================================

/**
 * Hook to fetch audit logs for a specific user
 * Shows history of package tier changes and admin actions
 */
export function useUserAuditLog(userId, limit = 20) {
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const fetchLogs = useCallback(async () => {
        if (!userId) return;
        
        setLoading(true);
        setError(null);
        
        try {
            const { data, error: fetchError } = await supabase.rpc(
                'get_audit_log_for_user',
                {
                    p_user_id: userId,
                    p_limit: limit
                }
            );

            if (fetchError) throw fetchError;
            setLogs(data || []);
        } catch (err) {
            console.error('Error fetching audit log:', err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }, [userId, limit]);

    useEffect(() => {
        fetchLogs();
    }, [fetchLogs]);

    return { logs, loading, error, refetch: fetchLogs };
}

// ============================================
// AUTOMATIC LOCALSTORAGE SYNC
// ============================================

/**
 * Hook to automatically sync localStorage with Supabase user data
 * This ensures offline fallback works correctly after approval
 */
export function useLocalStorageSync(userId, user) {
    useEffect(() => {
        if (!userId || !user) return;

        const syncToLocalStorage = async () => {
            try {
                // Get fresh data from Supabase
                const { data, error } = await supabase
                    .from('users')
                    .select('*')
                    .eq('id', userId)
                    .single();

                if (error) throw error;
                if (!data) return;

                // Update localStorage with latest state
                const users = JSON.parse(localStorage.getItem('birthdayUsers') || '[]');
                const userIndex = users.findIndex(u => u.id === userId || u.email === data.email);

                const syncData = {
                    id: data.id,
                    name: data.name || user.name,
                    email: data.email || user.email,
                    package_tier: data.package_tier,
                    package_name: data.package_name,
                    payment_status: data.payment_status,
                    payment_confirmed_at: data.payment_confirmed_at,
                    package_expires_at: data.package_expires_at,
                    role: data.role || 'user'
                };

                if (userIndex !== -1) {
                    users[userIndex] = { ...users[userIndex], ...syncData };
                } else {
                    users.push(syncData);
                }

                localStorage.setItem('birthdayUsers', JSON.stringify(users));
                console.log('LocalStorage synced for user:', userId);
            } catch (err) {
                console.error('LocalStorage sync error:', err);
            }
        };

        // Sync immediately and then every 30 seconds
        syncToLocalStorage();
        const interval = setInterval(syncToLocalStorage, 30000);

        return () => clearInterval(interval);
    }, [userId, user]);

    return null;
}

// ============================================
// COMPONENT: PackageTierDisplay with real-time updates
// ============================================

export function PackageTierDisplay({ userId, user, showHistory = false }) {
    const { currentTier, lastUpdated, syncStatus } = usePackageRealtime(userId);
    const { logs, loading: logsLoading } = useUserAuditLog(userId, 5);

    // Format timestamp
    const formatTime = (timestamp) => {
        if (!timestamp) return 'Never';
        return new Date(timestamp).toLocaleString();
    };

    // Get status color
    const getTierColor = (tier) => {
        const colors = {
            free: 'bg-gray-100 text-gray-700',
            basic: 'bg-blue-100 text-blue-700',
            premium: 'bg-purple-100 text-purple-700',
            enterprise: 'bg-amber-100 text-amber-700'
        };
        return colors[tier] || colors.free;
    };

    if (!userId) {
        return <div className="text-sm text-gray-500">Not authenticated</div>;
    }

    return (
        <div className="space-y-3">
            <div className="flex items-center gap-3">
                <div className={`px-3 py-1 rounded-full text-sm font-semibold ${getTierColor(currentTier)}`}>
                    {currentTier?.toUpperCase() || 'UNKNOWN'}
                </div>
                <span className="text-xs text-gray-500">
                    Updated: {formatTime(lastUpdated)}
                </span>
                {syncStatus === 'syncing' && (
                    <span className="text-xs text-blue-500">Syncing...</span>
                )}
                {syncStatus === 'error' && (
                    <span className="text-xs text-red-500">Sync error</span>
                )}
            </div>

            {/* Recent Changes */}
            {showHistory && logs.length > 0 && (
                <div className="mt-4 border-t pt-3">
                    <p className="text-xs font-semibold text-gray-600 mb-2">Recent Changes</p>
                    <div className="space-y-2">
                        {logs.map((log) => (
                            <div key={log.id} className="text-xs bg-gray-50 p-2 rounded">
                                <div className="flex justify-between">
                                    <span className="font-medium">{log.action}</span>
                                    <span className="text-gray-500">{formatTime(log.created_at)}</span>
                                </div>
                                <p className="text-gray-600 mt-1">{log.reason}</p>
                                {log.changed_by && (
                                    <p className="text-gray-400">by {log.changed_by}</p>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}

// ============================================
// ADMIN ACTION BUTTONS WITH CONFIRMATION
// ============================================

export function ApprovalActions({ requestId, onSuccess, onError }) {
    const [loading, setLoading] = useState(false);

    const handleApprove = async () => {
        if (!confirm('Approve this payment? User package will be upgraded immediately.')) return;
        
        setLoading(true);
        try {
            // Get current admin user from localStorage
            const adminUser = JSON.parse(localStorage.getItem('currentUser') || '{}');
            
            const result = await supabase.rpc('approve_package_payment', {
                p_request_id: requestId,
                p_approved_by: adminUser.id || 'admin',
                p_notes: null
            });

            if (result.error) throw result.error;
            if (!result.data?.success) throw new Error(result.data?.error);

            alert('✅ Approval successful! User package upgraded.');
            if (onSuccess) onSuccess(result.data);
        } catch (err) {
            console.error('Approval failed:', err);
            alert('❌ Approval failed: ' + err.message);
            if (onError) onError(err);
        } finally {
            setLoading(false);
        }
    };

    const handleReject = async () => {
        const reason = prompt('Reason for rejection (optional, shown to user):');
        if (reason === null) return; // Cancelled
        
        if (!confirm('Reject this payment? User will NOT be upgraded.')) return;
        
        setLoading(true);
        try {
            const adminUser = JSON.parse(localStorage.getItem('currentUser') || '{}');
            
            const result = await supabase.rpc('reject_package_payment', {
                p_request_id: requestId,
                p_rejected_by: adminUser.id || 'admin',
                p_reason: reason
            });

            if (result.error) throw result.error;
            if (!result.data?.success) throw new Error(result.data?.error);

            alert('❌ Request rejected');
            if (onSuccess) onSuccess(result.data);
        } catch (err) {
            console.error('Rejection failed:', err);
            alert('Error: ' + err.message);
            if (onError) onError(err);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex gap-2">
            <button
                onClick={handleApprove}
                disabled={loading}
                className="flex-1 px-3 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:opacity-50 text-sm font-medium"
            >
                {loading ? '⏳ Processing...' : '✅ Approve'}
            </button>
            <button
                onClick={handleReject}
                disabled={loading}
                className="flex-1 px-3 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 disabled:opacity-50 text-sm font-medium"
            >
                {loading ? '⏳...' : '❌ Reject'}
            </button>
        </div>
    );
}

// ============================================
// DATA REFRESH UTILITIES
// ============================================

export const refreshAdminData = async () => {
    const actions = [];
    
    try {
        console.log('🔄 Refreshing admin data...');
        
        // Force refresh from Supabase
        actions.push(
            supabase.from('upgrade_requests').select('*').eq('status', 'pending'),
            supabase.from('users').select('*'),
            supabase.from('payments').select('*').eq('status', 'pending')
        );

        const [upgradesRes, usersRes, paymentsRes] = await Promise.all(actions);
        
        console.log('✅ Data refreshed:', {
            upgrades: upgradesRes.data?.length || 0,
            users: usersRes.data?.length || 0,
            payments: paymentsRes.data?.length || 0
        });

        return {
            success: true,
            counts: {
                upgrades: upgradesRes.data?.length || 0,
                users: usersRes.data?.length || 0,
                payments: paymentsRes.data?.length || 0
            }
        };
    } catch (err) {
        console.error('Refresh failed:', err);
        return { success: false, error: err.message };
    }
};

// ============================================
// EXPORTS
// ============================================
export default {
    usePackageRealtime,
    useUserAuditLog,
    useLocalStorageSync,
    PackageTierDisplay,
    ApprovalActions,
    refreshAdminData
};
