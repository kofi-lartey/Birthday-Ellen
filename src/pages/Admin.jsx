import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase, ADMIN_CREDENTIALS, STORAGE_KEYS } from '../supabase'
// Import the sync utilities (utility functions defined at bottom of this file in production)
// For now we'll inline them

function Admin() {
    const navigate = useNavigate()
    const [isLoggedIn, setIsLoggedIn] = useState(false)
    const [user, setUser] = useState(null)
    const [username, setUsername] = useState('')
    const [password, setPassword] = useState('')
    const [error, setError] = useState(false)
    const [sidebarOpen, setSidebarOpen] = useState(false)
    const [photoCount, setPhotoCount] = useState(0)
    const [supabasePhotoCount, setSupabasePhotoCount] = useState(0)
    const [viewerCount, setViewerCount] = useState(0)
    const [momoNumber, setMomoNumber] = useState('')
    const [momoStatus, setMomoStatus] = useState(false)
    const [gifts, setGifts] = useState([])
    const [shareLink, setShareLink] = useState('')
    const [copyStatus, setCopyStatus] = useState(false)
    const [activeTab, setActiveTab] = useState('dashboard')
    const [users, setUsers] = useState([])
    const [showUserModal, setShowUserModal] = useState(false)
    const [newUserName, setNewUserName] = useState('')
    const [newUserEmail, setNewUserEmail] = useState('')
    const [newUserPassword, setNewUserPassword] = useState('')
    const [newUserRole, setNewUserRole] = useState('user')
    const [expandedUser, setExpandedUser] = useState(null)
    const [orders, setOrders] = useState([])
    const [pendingPayments, setPendingPayments] = useState([])
    const [upgradeRequests, setUpgradeRequests] = useState([])
    const [notifications, setNotifications] = useState([])
    const [showNotifications, setShowNotifications] = useState(false)
    const [syncingLocalRequests, setSyncingLocalRequests] = useState(false)

    // Group orders by user (giver)
    const ordersByUser = orders.reduce((acc, order) => {
        const key = order.giver_name || order.giverPhone || 'Anonymous'
        if (!acc[key]) {
            acc[key] = []
        }
        acc[key].push(order)
        return acc
    }, {})

    const groupedOrders = Object.entries(ordersByUser).map(([giver, giverOrders]) => ({
        giver,
        orders: giverOrders,
        total: giverOrders.length,
        paidCount: giverOrders.filter(o => o.status === 'paid').length
    }))

    const localPendingUpgradeCount = upgradeRequests.filter(r => r.status === 'pending' && (r.isLocalFallback || !isValidRequestId(r.id))).length

    function isValidRequestId(requestId) {
        const id = Number(requestId)
        return Number.isInteger(id) && id > 0 && id <= 2147483647
    }

    useEffect(() => {
        // Check if already logged in
        if (localStorage.getItem(STORAGE_KEYS.ADMIN_LOGGED_IN) === 'true') {
            setIsLoggedIn(true)
            setUser(JSON.parse(localStorage.getItem(STORAGE_KEYS.CURRENT_USER) || 'null'))
            updateStats()
            loadOrders()
            loadUsers()
            loadUpgradeRequests()
            loadPendingPayments()
        }

        // Set share link
        setShareLink(window.location.origin + '/upload')

        // Track views
        const views = parseInt(localStorage.getItem(STORAGE_KEYS.VIEWS) || '0')
        setViewerCount(views)
    }, [])

    // Load notifications and setup realtime when user is identified
    useEffect(() => {
        if (isLoggedIn && user) {
            loadNotifications()
            const notificationSub = setupRealtimeNotifications()
            const upgradeSub = setupRealtimeUpgrades()
            const userSub = setupRealtimeUsers()
            
            return () => {
                if (notificationSub) supabase.removeChannel(notificationSub)
                if (upgradeSub) supabase.removeChannel(upgradeSub)
                if (userSub) supabase.removeChannel(userSub)
            }
        }
    }, [isLoggedIn, user])

    // Close sidebar on mobile when clicking outside
    useEffect(() => {
        const handleResize = () => {
            if (window.innerWidth >= 1024) {
                setSidebarOpen(false)
            }
        }

        window.addEventListener('resize', handleResize)
        return () => window.removeEventListener('resize', handleResize)
    }, [])

    async function updateStats() {
        // Get local photos
        const photos = JSON.parse(localStorage.getItem(STORAGE_KEYS.PHOTOS) || '[]')
        setPhotoCount(photos.length)

        // Get Supabase photos
        try {
            const { data, error } = await supabase
                .from('photos')
                .select('*', { count: 'exact' })

            if (data) {
                setSupabasePhotoCount(data.length)
            } else if (error) {
                console.log('Supabase photos table not available')
            }
        } catch (err) {
            console.log('Supabase photos table not available')
        }

        // Get MoMo number
        const momo = localStorage.getItem(STORAGE_KEYS.MOM0)
        if (momo) {
            setMomoNumber(momo)
        } else {
            // Try to get from Supabase config
            try {
                const { data, error } = await supabase
                    .from('config')
                    .select('value')
                    .eq('key', 'momo_number')
                    .single()
                if (data?.value) {
                    setMomoNumber(data.value)
                } else if (error) {
                    console.log('Supabase config table not available')
                }
            } catch (err) {
                console.log('Supabase not available')
            }
        }

        // Get gifts
        const giftsData = JSON.parse(localStorage.getItem(STORAGE_KEYS.GIFTS) || '[]')
        setGifts(giftsData)
    }

    async function loadOrders() {
        // Try to load from Supabase first
        try {
            const { data, error } = await supabase
                .from('orders')
                .select('*')
                .order('created_at', { ascending: false })

            if (data && data.length > 0) {
                console.log('Loaded orders from Supabase:', data.length)
                setOrders(data)
                return
            }
        } catch (err) {
            console.log('Supabase error:', err)
        }

        // Fallback to localStorage
        const localOrders = JSON.parse(localStorage.getItem(STORAGE_KEYS.ORDERS) || '[]')
        console.log('Loaded orders from localStorage:', localOrders.length)
        setOrders(localOrders)
    }

    async function loadUsers() {
        try {
            // 1. Get localStorage users
            const localUsers = JSON.parse(localStorage.getItem(STORAGE_KEYS.USERS) || '[]')
            
            // 2. Get Supabase users (authoritative)
            const { data: supabaseUsers = [], error: supabaseError } = await supabase
                .from('users')
                .select('*')
                .order('created_at', { ascending: false })
            
            if (supabaseError) {
                console.warn('Supabase users fetch failed:', supabaseError)
            }
            
            // 3. Get orders-derived users (people who placed orders but may not have account)
            const { data: ordersData = [] } = await supabase
                .from('orders')
                .select('user_id, giver_name, giver_phone, created_at')
            
            // 4. Build set of existing IDs to avoid duplicates
            const userIds = new Set()
            const merged = []
            
            // Add Supabase users first (authoritative)
            supabaseUsers.forEach(u => {
                userIds.add(u.id)
                merged.push(u)
            })
            
            // Add order-based users not already in Supabase
            ordersData.forEach(order => {
                if (order.user_id && !userIds.has(order.user_id)) {
                    userIds.add(order.user_id)
                    merged.push({
                        id: order.user_id,
                        name: order.giver_name || 'User',
                        email: order.giver_phone || order.user_id,
                        phone: order.giver_phone || '',
                        role: 'user',
                        createdAt: order.created_at,
                        package_tier: 'free',
                        package_name: 'Free',
                        payment_status: null
                    })
                }
            })
            
            // Add localStorage-only users (if still missing)
            localUsers.forEach(u => {
                if (!userIds.has(u.id)) {
                    merged.push(u)
                }
            })
            
            // 5. Update state and localStorage
            setUsers(merged)
            localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(merged))
            
            console.log('Users loaded:', { 
                supabase: supabaseUsers.length, 
                fromOrders: ordersData.length, 
                total: merged.length 
            })
        } catch (err) {
            console.error('Error loading users:', err)
            // Fallback to localStorage if all else fails
            const local = JSON.parse(localStorage.getItem(STORAGE_KEYS.USERS) || '[]')
            setUsers(local)
        }
    }

    // Merge local and remote users, preferring remote data
    function mergeUsers(localUsers, remoteUsers) {
        const remoteMap = new Map(remoteUsers.map(u => [u.id, u]))
        const merged = [...remoteUsers] // start with all remote users

        // Add local-only users (not in remote)
        localUsers.forEach(local => {
            if (!remoteMap.has(local.id)) {
                merged.push(local)
            }
        })

        return merged
    }

    async function loadUsersFromOrders() {
        try {
            const { data, error } = await supabase
                .from('orders')
                .select('user_id, giver_name, giver_phone, created_at')

            if (data && data.length > 0) {
                // Get unique users from orders (both with and without user_id)
                const uniqueUsers = {}
                data.forEach(order => {
                    // First try to add by user_id
                    if (order.user_id) {
                        if (!uniqueUsers[order.user_id]) {
                            uniqueUsers[order.user_id] = {
                                id: order.user_id,
                                name: order.giver_name || 'User',
                                email: order.giver_phone || 'No email',
                                phone: order.giver_phone || '',
                                role: 'user',
                                createdAt: order.created_at
                            }
                        }
                    }
                    // Also add by giver_name if available (for orders without user_id)
                    if (order.giver_name && !order.user_id) {
                        const key = 'giver_' + order.giver_name
                        if (!uniqueUsers[key]) {
                            uniqueUsers[key] = {
                                id: key,
                                name: order.giver_name,
                                email: order.giver_phone || 'No email',
                                phone: order.giver_phone || '',
                                role: 'user',
                                createdAt: order.created_at
                            }
                        }
                    }
                })

                const orderUsers = Object.values(uniqueUsers)
                console.log('Users from orders:', orderUsers)

                // Get local users
                const localUsersList = JSON.parse(localStorage.getItem(STORAGE_KEYS.USERS) || '[]')

                // Merge with local users
                const allUsers = [...localUsersList]
                orderUsers.forEach(orderUser => {
                    if (!allUsers.find(u => u.id === orderUser.id)) {
                        allUsers.push(orderUser)
                    }
                })

                console.log('Total users after merge:', allUsers.length)
                setUsers(allUsers)
            }
        } catch (err) {
            console.log('Could not load users from orders:', err)
        }
    }

    // Load pending payments from localStorage
    async function loadPendingPayments() {
        try {
            // Get pending payments from localStorage
            const pendingData = localStorage.getItem('pending_payments') || '[]'
            const payments = JSON.parse(pendingData)

            console.log('Pending payments:', payments)
            setPendingPayments(payments)
        } catch (err) {
            console.log('Error loading pending payments:', err)
        }
    }

    // Confirm a payment and update user package
    // Confirm a payment and update user package
    async function confirmPayment(paymentId, packageTier) {
        try {
            // Verify admin authentication
            if (!user?.id) {
                alert('Admin not authenticated');
                return;
            }

            // Get payment details from pending payments
            const pendingData = localStorage.getItem('pending_payments') || '[]';
            let payments = JSON.parse(pendingData);
            const payment = payments.find(p => p.id === paymentId);

            if (!payment) {
                alert('Payment not found');
                return;
            }

            // Prepare payment data for Supabase
            const paymentData = {
                user_id: payment.user_id || null,
                user_email: payment.email,
                amount: payment.amount,
                payment_method: payment.payment_method || 'momo',
                payment_reference: payment.payment_reference_code || payment.transaction_id,
                status: 'confirmed',
                confirmed_by: user.id,
                confirmed_at: new Date().toISOString(),
                notes: `Payment confirmed for ${packageTier} package`
            };

            // Insert/update payment in Supabase
            let paymentResult;
            if (payment.payment_id) {
                // Update existing payment
                const { data, error } = await supabase
                    .from('payments')
                    .update({
                        status: 'confirmed',
                        confirmed_by: user.id,
                        confirmed_at: new Date().toISOString(),
                        notes: paymentData.notes
                    })
                    .eq('id', payment.payment_id);
                
                if (error) console.warn('Payment update failed:', error);
            } else {
                // Create new payment record
                const { data, error } = await supabase
                    .from('payments')
                    .insert([paymentData]);
                
                if (error) {
                    console.error('Payment insert error:', error);
                    // Continue anyway - payment tracking is secondary
                }
                paymentResult = data;
            }

            // Get current users from localStorage
            const usersData = localStorage.getItem(STORAGE_KEYS.USERS) || '[]';
            const users = JSON.parse(usersData);

            // Find and update the user
            const userIndex = users.findIndex(u => u.email === payment.email);
            if (userIndex !== -1) {
                users[userIndex].package_tier = packageTier;
                users[userIndex].package_name = payment.package_name || packageTier;
                users[userIndex].payment_status = 'confirmed';
                users[userIndex].payment_confirmed_at = new Date().toISOString();
                users[userIndex].payment_method = payment.payment_method;

                // Save updated users
                localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(users));
                console.log('User package updated:', users[userIndex]);
            }

            // Also update in Supabase if available
            const updatedUser = users.find(u => u.email === payment.email);
            // Check if user.id is a valid UUID before updating (admin user has id='admin' which is not a UUID)
            const isValidUUID = (str) => /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(str);
            if (updatedUser && updatedUser.id && isValidUUID(updatedUser.id)) {
                // Calculate expiry date: NULL for free, +1 month for paid
                const expiryDate = packageTier === 'free' 
                    ? null 
                    : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(); // 1 month

                const { error: userError } = await supabase
                    .from('users')
                    .update({
                        package_tier: packageTier,
                        package_name: payment.package_name || packageTier,
                        payment_status: 'confirmed',
                        payment_confirmed_at: new Date().toISOString(),
                        payment_method: payment.payment_method,
                        package_expires_at: expiryDate
                    })
                    .eq('id', updatedUser.id);

                if (userError) {
                    console.error('Supabase user update failed:', userError);
                }
            }

            // Remove from pending payments
            payments = payments.filter(p => p.id !== paymentId);
            localStorage.setItem('pending_payments', JSON.stringify(payments));

            // Refresh the pending payments list
            setPendingPayments(payments);

            alert(`✅ Payment confirmed! User now has ${packageTier} package.`);
        } catch (err) {
            console.error('Error confirming payment:', err);
            alert('Error confirming payment. Please try again.');
        }
    }

    async function rejectPayment(paymentId) {
        if (!confirm('Are you sure you want to reject this payment? The user will be downgraded to free tier.')) {
            return
        }

        try {
            // Get current pending payments
            const pendingData = localStorage.getItem('pending_payments') || '[]'
            let payments = JSON.parse(pendingData)

            // Find the payment
            const payment = payments.find(p => p.id === paymentId)
            if (!payment) {
                alert('Payment not found')
                return
            }

            // Get current users from localStorage
            const usersData = localStorage.getItem(STORAGE_KEYS.USERS) || '[]'
            const users = JSON.parse(usersData)

            // Find and reset user package to free
            const userIndex = users.findIndex(u => u.email === payment.email)
            if (userIndex !== -1) {
                users[userIndex].package_tier = 'free'
                users[userIndex].package_name = 'free'
                users[userIndex].payment_status = 'rejected'
                users[userIndex].payment_confirmed_at = null

                localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(users))
            }

             // Also update in Supabase if available
            const user = users.find(u => u.email === payment.email)
            // Check if user.id is a valid UUID before updating (admin user has id='admin' which is not a UUID)
            const isValidUUID = (str) => /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(str);
            if (user && user.id && isValidUUID(user.id)) {
                await supabase
                    .from('users')
                    .update({
                        package_tier: 'free',
                        package_name: 'free',
                        payment_status: 'rejected',
                        payment_confirmed_at: null
                    })
                    .eq('id', user.id)
            }

            // Remove from pending payments
            payments = payments.filter(p => p.id !== paymentId)
            localStorage.setItem('pending_payments', JSON.stringify(payments))
            setPendingPayments(payments)

            alert('Payment rejected. User has been downgraded to free tier.')
        } catch (err) {
            console.log('Error rejecting payment:', err)
            alert('Error rejecting payment')
        }
    }

    // Load pending upgrade requests from Supabase
    async function loadUpgradeRequests() {
        try {
            const { data, error } = await supabase
                .from('upgrade_requests')
                .select('*')
                .eq('status', 'pending')
                .order('created_at', { ascending: false })

            let supabaseRequests = []
            if (data && !error) {
                console.log('Loaded upgrade requests from Supabase:', data.length)
                supabaseRequests = data
            } else {
                console.log('Upgrade requests table not ready:', error?.message)
            }

            // Always merge with localStorage requests (for fallback cases)
            const localUpgrades = JSON.parse(localStorage.getItem('pending_upgrades') || '[]')
            console.log('Loaded local upgrade requests:', localUpgrades.length)

            const normalizedLocalUpgrades = localUpgrades.map(local => ({
                ...local,
                isLocalFallback: Boolean(local.isLocalFallback) || !isValidRequestId(local.id),
                created_at: local.created_at || local.requested_at || new Date().toISOString()
            }))

            // Merge and deduplicate by payment_reference_code
            const allRequests = [...supabaseRequests]
            normalizedLocalUpgrades.forEach(local => {
                if (!allRequests.find(r => r.payment_reference_code === local.payment_reference_code)) {
                    allRequests.push(local)
                }
            })

            setUpgradeRequests(allRequests)
        } catch (err) {
            console.log('Error loading upgrade requests:', err)
            const localUpgrades = JSON.parse(localStorage.getItem('pending_upgrades') || '[]')
            setUpgradeRequests(localUpgrades)
        }
    }

    async function syncLocalUpgradeRequests() {
        const localUpgrades = JSON.parse(localStorage.getItem('pending_upgrades') || '[]')
        const fallbackRequests = localUpgrades.filter(local => Boolean(local.isLocalFallback) || !isValidRequestId(local.id))

        if (fallbackRequests.length === 0) {
            alert('No local-only upgrade requests to sync.')
            return
        }

        if (!user?.id) {
            alert('Admin not authenticated. Please log in again.')
            return
        }

        if (!confirm(`Sync ${fallbackRequests.length} local request(s) to Supabase?`)) {
            return
        }

        setSyncingLocalRequests(true)
        const stillLocal = localUpgrades.filter(local => !(Boolean(local.isLocalFallback) || !isValidRequestId(local.id)))
        const syncMessages = []

        // Get list of valid package IDs to validate against
        const { data: packages } = await supabase.from('packages').select('id')
        const validPackageIds = packages?.map(p => p.id) || []

        for (const request of fallbackRequests) {
            // Validate to_package_id: only use if it exists in packages table, otherwise null
            let validPackageId = null
            if (request.to_package_id && validPackageIds.includes(request.to_package_id)) {
                validPackageId = request.to_package_id
            }

            const insertData = {
                user_id: request.user_id?.toString?.() || request.user_id,
                user_email: request.user_email,
                user_name: request.user_name || request.user_email,
                from_package_tier: request.from_package_tier || 'free',
                to_package_tier: request.to_package_tier,
                to_package_id: validPackageId,
                amount_paid: request.amount_paid || 0,
                payment_method: request.payment_method,
                momo_number: request.momo_number,
                transaction_id: request.transaction_id,
                payment_reference_code: request.payment_reference_code,
                payment_proof_url: request.payment_proof_url,
                notes: request.notes,
                status: request.status || 'pending',
                created_at: request.created_at ? new Date(request.created_at).toISOString() : new Date().toISOString(),
                updated_at: new Date().toISOString()
            }

            try {
                const { data, error } = await supabase
                    .from('upgrade_requests')
                    .insert(insertData)
                    .select()
                    .single()

                if (error) {
                    if (error.code === '23505' || error.message?.includes('duplicate key value')) {
                        const { data: existingRequest, error: fetchError } = await supabase
                            .from('upgrade_requests')
                            .select('*')
                            .eq('payment_reference_code', request.payment_reference_code)
                            .single()

                        if (!fetchError && existingRequest) {
                            syncMessages.push(`Skipped ${request.payment_reference_code || request.id}: already exists on server.`)
                            continue
                        }
                    }

                    syncMessages.push(`Failed ${request.payment_reference_code || request.id}: ${error.message || error}`)
                    stillLocal.push(request)
                    continue
                }

                syncMessages.push(`Synced ${request.payment_reference_code || request.id} to Supabase.`)
            } catch (err) {
                console.error('Sync error for local upgrade request:', err)
                syncMessages.push(`Failed ${request.payment_reference_code || request.id}: ${err.message || err}`)
                stillLocal.push(request)
            }
        }

        if (stillLocal.length > 0) {
            localStorage.setItem('pending_upgrades', JSON.stringify(stillLocal))
        } else {
            localStorage.removeItem('pending_upgrades')
        }

        await loadUpgradeRequests()
        setSyncingLocalRequests(false)

        alert(syncMessages.join('\n'))
    }

    // Load notifications for admin
    async function loadNotifications() {
        try {
            const { data, error } = await supabase
                .from('notifications')
                .select('*')
                .eq('recipient_id', user?.id)
                .order('created_at', { ascending: false })
                .limit(20)

            if (data && !error) {
                setNotifications(data)
            }
        } catch (err) {
            console.log('Error loading notifications:', err)
        }
    }

    // Mark notification as read
    async function markNotificationRead(notificationId) {
        try {
            await supabase
                .from('notifications')
                .update({ read: true, read_at: new Date().toISOString() })
                .eq('id', notificationId)

            setNotifications(notifications.map(n =>
                n.id === notificationId ? { ...n, read: true, read_at: new Date().toISOString() } : n
            ))
        } catch (err) {
            console.log('Error marking notification read:', err)
        }
    }

    // Mark all as read
    async function markAllRead() {
        try {
            const unreadIds = notifications.filter(n => !n.read).map(n => n.id)
            await supabase
                .from('notifications')
                .update({ read: true, read_at: new Date().toISOString() })
                .in('id', unreadIds)

            setNotifications(notifications.map(n => ({ ...n, read: true, read_at: new Date().toISOString() })))
        } catch (err) {
            console.log('Error marking all read:', err)
        }
    }

    // Setup realtime subscription for notifications
    function setupRealtimeNotifications() {
        if (!user?.id) return null

        const subscription = supabase
            .channel(`admin-notifications-${user.id}`)
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'notifications',
                    filter: `recipient_id=eq.${user.id}`
                },
                (payload) => {
                    console.log('New notification:', payload)
                    setNotifications(prev => [payload.new, ...prev])
                }
            )
            .subscribe()

        return subscription
    }

    // Setup realtime for upgrade requests (for multi-admin sync)
    function setupRealtimeUpgrades() {
        if (!user?.id) return null

        const subscription = supabase
            .channel(`admin-upgrades-${user.id}`)
            .on(
                'postgres_changes',
                {
                    event: '*', // INSERT, UPDATE, DELETE
                    schema: 'public',
                    table: 'upgrade_requests'
                },
                (payload) => {
                    console.log('Upgrade request changed:', payload.eventType, payload.new?.id)
                    
                    if (payload.eventType === 'UPDATE' || payload.eventType === 'INSERT') {
                        // Update local state based on the change
                        setUpgradeRequests(prev => {
                            const existing = prev.findIndex(r => r.id === payload.new.id)
                            if (existing !== -1) {
                                // Update existing
                                const updated = [...prev]
                                updated[existing] = payload.new
                                return updated
                            } else {
                                // Add new
                                return [payload.new, ...prev]
                            }
                        })
                    } else if (payload.eventType === 'DELETE') {
                        // Remove deleted request
                        setUpgradeRequests(prev => 
                            prev.filter(r => r.id !== payload.old.id)
                        )
                    }
                }
            )
            .subscribe()

        return subscription
    }

    // Setup realtime for users (to reflect package tier changes across all admins)
    function setupRealtimeUsers() {
        if (!user?.id) return null

        const subscription = supabase
            .channel(`admin-users-${user.id}`)
            .on(
                'postgres_changes',
                {
                    event: 'UPDATE',
                    schema: 'public',
                    table: 'users'
                },
                (payload) => {
                    console.log('User updated:', payload.new?.id, 'package_tier:', payload.new?.package_tier)
                    
                    // Update users list
                    setUsers(prev => {
                        const idx = prev.findIndex(u => u.id === payload.new.id)
                        if (idx !== -1) {
                            const updated = [...prev]
                            // Merge old and new data (preserve local fields)
                            updated[idx] = { ...updated[idx], ...payload.new }
                            return updated
                        }
                        // If not in list but might be from orders - add if email matches?
                        return prev
                    })
                }
            )
            .subscribe()

        return subscription
    }

    async function handleLogin(e) {
        e.preventDefault()
        const enteredUsername = String(username || '').trim().toLowerCase()
        const enteredPassword = String(password || '').trim()

        const validUsername = enteredUsername === ADMIN_CREDENTIALS.username
        const validPassword = [ADMIN_CREDENTIALS.password, ...(ADMIN_CREDENTIALS.fallbackPasswords || [])].includes(enteredPassword)

        if (validUsername && validPassword) {
            setIsLoggedIn(true)
            setError(false)
            const adminUser = { id: 'admin', name: 'Administrator', role: 'super_admin' }
            setUser(adminUser)
            localStorage.setItem(STORAGE_KEYS.ADMIN_LOGGED_IN, 'true')
            localStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(adminUser))
            updateStats()
            loadOrders()
            loadUsers()
            loadUpgradeRequests()
            loadPendingPayments()
        } else {
            setError(true)
        }
    }

    function handleLogout() {
        setIsLoggedIn(false)
        setUser(null)
        localStorage.removeItem(STORAGE_KEYS.ADMIN_LOGGED_IN)
        localStorage.removeItem(STORAGE_KEYS.CURRENT_USER)
        setActiveTab('dashboard')
    }

    function copyShareLink() {
        navigator.clipboard.writeText(shareLink)
        setCopyStatus(true)
        setTimeout(() => setCopyStatus(false), 2000)
    }

    function saveMomoNumber() {
        localStorage.setItem(STORAGE_KEYS.MOM0, momoNumber)
        // Also save to Supabase config if available
        try {
            supabase
                .from('config')
                .upsert({ key: 'momo_number', value: momoNumber })
                .then(() => {
                    setMomoStatus(true)
                    setTimeout(() => setMomoStatus(false), 3000)
                })
        } catch (err) {
            console.log('Supabase config not available')
            setMomoStatus(true)
            setTimeout(() => setMomoStatus(false), 3000)
        }
    }

    function clearAllPhotos() {
        if (confirm('Are you sure you want to clear all photos? This action cannot be undone.')) {
            localStorage.removeItem(STORAGE_KEYS.PHOTOS)
            setPhotoCount(0)
            alert('All photos cleared successfully!')
        }
    }

    async function approveUpgradeRequest(requestId) {
        if (!isValidRequestId(requestId)) {
            alert('Cannot approve a local-only request. Please sync this request to Supabase before approving.')
            return
        }

        try {
            if (!user?.id) {
                alert('Admin not authenticated');
                return;
            }

            // Show processing state
            const loadingBtn = document.activeElement;
            if (loadingBtn) loadingBtn.disabled = true;

            // Call the PostgreSQL stored procedure
            const { data, error } = await supabase.rpc('approve_package_payment', {
                p_request_id: requestId,
                p_approved_by: user.id,
                p_notes: null
            });

            if (error) {
                console.error('Approval error:', error);
                handleApprovalError(error);
                return;
            }

            if (data && !data.success) {
                alert('❌ Approval failed: ' + (data.error || 'Unknown error'));
                return;
            }

            // IMMEDIATE localStorage update for instant UI feedback
            try {
                const users = JSON.parse(localStorage.getItem(STORAGE_KEYS.USERS) || '[]');
                // Use email from RPC response (most authoritative)
                const userEmail = data?.user_email || 
                    (upgradeRequests.find(r => r.id === requestId)?.user_email);
                
                if (userEmail) {
                    const userIndex = users.findIndex(u => u.email === userEmail);
                    if (userIndex !== -1) {
                        users[userIndex].package_tier = data.new_tier;
                        users[userIndex].package_name = data.new_package_name || data.new_tier;
                        users[userIndex].payment_status = 'confirmed';
                        users[userIndex].payment_confirmed_at = new Date().toISOString();
                        localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(users));
                        console.log('✅ LocalStorage synced instantly for', userEmail);
                    }
                }
            } catch (lsErr) {
                console.warn('LocalStorage sync failed:', lsErr);
            }

            // Success feedback
            const msg = data?.message || 
                `Upgraded successfully to ${data?.new_tier || 'new tier'}!`;
            alert('✅ ' + msg);

            // Refresh all data sources
            await Promise.all([
                loadUpgradeRequests(),
                loadUsers(),
                loadPendingPayments()
            ]);

            console.log('Approval complete:', data);

        } catch (err) {
            console.error('Unexpected approval error:', err);
            alert('System error. Check console.');
        } finally {
            // Re-enable any loading buttons if needed
        }
    }

    function handleApprovalError(error) {
        if (error.code === 'P0001') {
            alert('Error: ' + error.message);
        } else if (error.message?.includes('already')) {
            alert('This request was already processed. Refreshing list...');
            loadUpgradeRequests();
        } else if (error.message?.includes('User not found')) {
            alert('Error: User account not found. They may have been deleted.');
        } else if (error.message?.includes('Package')) {
            alert('Error: Package configuration invalid. Contact system administrator.');
        } else {
            alert('Approval error: ' + error.message);
        }
    }

    async function rejectUpgradeRequest(requestId) {
        if (!isValidRequestId(requestId)) {
            alert('Cannot reject a local-only request. Please sync this request to Supabase before rejecting.')
            return
        }

        if (!confirm('Are you sure you want to reject this upgrade request? The user will retain their current package tier.')) {
            return;
        }

        try {
            const reason = prompt('Optional: Enter reason for rejection (will be shown to user):');
            
            // Call stored procedure for atomic rejection
            const { data, error } = await supabase.rpc('reject_package_payment', {
                p_request_id: requestId,
                p_rejected_by: user?.id,
                p_reason: reason
            });

            if (error) {
                console.error('Rejection error:', error);
                alert(`Error rejecting request: ${error.message}`);
                return;
            }

            if (data && !data.success) {
                alert(`Rejection failed: ${data.error}`);
                return;
            }

            alert('❌ Upgrade request rejected.');
            
            // Refresh list
            await loadUpgradeRequests();

        } catch (err) {
            console.error('Unexpected error in rejectUpgradeRequest:', err);
            alert('System error during rejection. Please try again.');
        }
    }

    function addNewUser() {
        if (!newUserName.trim() || !newUserEmail.trim() || !newUserPassword.trim()) {
            alert('Please fill in all fields')
            return
        }

        // Get existing users
        const existingUsers = JSON.parse(localStorage.getItem(STORAGE_KEYS.USERS) || '[]')

        // Check if email already exists
        if (existingUsers.some(u => u.email === newUserEmail)) {
            alert('User with this email already exists')
            return
        }

        // Create new user
        const newUser = {
            id: Date.now().toString(),
            name: newUserName,
            email: newUserEmail,
            password: newUserPassword, // In production, hash this!
            role: newUserRole,
            package_tier: 'free',
            package_name: 'free',
            payment_status: null,
            createdAt: new Date().toISOString()
        }

        existingUsers.push(newUser)
        localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(existingUsers))

        // Update state
        setUsers(existingUsers)

        // Reset form and close modal
        setNewUserName('')
        setNewUserEmail('')
        setNewUserPassword('')
        setNewUserRole('user')
        setShowUserModal(false)

        alert('User added successfully!')
    }

    if (!isLoggedIn) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-rose-50 via-pink-50 to-purple-50 flex items-center justify-center p-4">
                <div className="w-full max-w-md">
                    {/* Header */}
                    <div className="text-center mb-8 animate-fade-in">
                        <div className="w-20 h-20 bg-gradient-to-br from-rose-500 to-pink-600 rounded-2xl mx-auto mb-4 flex items-center justify-center shadow-lg">
                            <span className="text-3xl">🎂</span>
                        </div>
                        <h1 className="text-3xl font-bold text-gray-800 mb-2">Admin Portal</h1>
                        <p className="text-gray-600">Sign in to manage your birthday app</p>
                    </div>

                    {/* Login Form */}
                    <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl p-8">
                        <form onSubmit={handleLogin} className="space-y-6">
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-2">
                                    Username
                                </label>
                                <input
                                    type="text"
                                    value={username}
                                    onChange={(e) => setUsername(e.target.value)}
                                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-rose-400 focus:ring-2 focus:ring-rose-100 transition-all"
                                    placeholder="Enter username"
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-2">
                                    Password
                                </label>
                                <input
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-rose-400 focus:ring-2 focus:ring-rose-100 transition-all"
                                    placeholder="Enter password"
                                    required
                                />
                            </div>


                            {error && (
                                <div className="p-3 bg-red-50 border border-red-200 rounded-xl animate-shake">
                                    <p className="text-red-700 text-sm font-medium text-center">
                                        Invalid credentials. Please try again.
                                    </p>
                                </div>
                            )}

                            <button
                                type="submit"
                                className="w-full bg-gradient-to-r from-rose-500 to-pink-600 text-white py-3 rounded-xl font-semibold hover:shadow-lg transition-all transform hover:scale-[1.02] active:scale-[0.98]"
                            >
                                Sign In 🔐
                            </button>
                        </form>
                    </div>

                    {/* Footer */}
                    <div className="text-center mt-6">
                        <p className="text-sm text-gray-500">
                            Birthday App Admin Dashboard
                        </p>
                    </div>
                </div>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 lg:grid lg:grid-cols-[18rem_1fr]">
            {/* Sidebar Overlay for Mobile */}
            {sidebarOpen && (
                <div
                    className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 lg:hidden animate-fade-in"
                    onClick={() => setSidebarOpen(false)}
                />
            )}

            {/* Sidebar */}
            <div className={`fixed inset-y-0 left-0 z-50 w-72 bg-white/95 backdrop-blur-md shadow-2xl transform transition-all duration-300 ease-in-out lg:static lg:sticky lg:top-0 lg:h-screen lg:translate-x-0 lg:border-r lg:border-gray-200 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
                `}>
                <div className="flex flex-col h-full overflow-y-auto">
                    {/* Sidebar Header */}
                    <div className="flex items-center justify-between p-6 border-b border-gray-200">
                        <div className="flex items-center gap-3">
                            <div className="w-12 h-12 bg-gradient-to-br from-rose-500 to-pink-600 rounded-xl flex items-center justify-center shadow-lg">
                                <span className="text-white font-bold text-xl">🎂</span>
                            </div>
                            <div>
                                <h2 className="font-bold text-gray-800 text-lg">Admin Panel</h2>
                                <p className="text-xs text-gray-500">v2.0</p>
                            </div>
                        </div>
                        <button
                            onClick={() => setSidebarOpen(false)}
                            className="lg:hidden p-2 rounded-lg hover:bg-gray-100 transition-colors"
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>

                    {/* Navigation */}
                    <nav className="flex-1 px-4 py-6 space-y-2">
                        {[
                            { id: 'dashboard', label: 'Dashboard', icon: '📊' },
                            { id: 'orders', label: 'Orders', icon: '📋' },
                            { id: 'users', label: 'Users', icon: '👥' },
                            { id: 'payments', label: 'Payments', icon: '💰' },
                            { id: 'upgrades', label: 'Upgrades', icon: '⬆️' },
                            { id: 'birthday', label: 'Birthday Pages', icon: '🎂' }
                        ].map((tab) => (
                            <button
                                key={tab.id}
                                onClick={() => {
                                    setActiveTab(tab.id)
                                    setSidebarOpen(false)
                                }}
                                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left transition-all ${activeTab === tab.id
                                    ? 'bg-gradient-to-r from-rose-50 to-pink-50 text-rose-600 border border-rose-200 shadow-sm'
                                    : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
                                    }`}
                            >
                                <span className="text-xl">{tab.icon}</span>
                                <span className="font-medium">{tab.label}</span>
                                {tab.id === 'upgrades' && upgradeRequests.filter(r => r.status === 'pending').length > 0 && (
                                    <span className="ml-auto bg-rose-500 text-white text-xs rounded-full px-2 py-1">
                                        {upgradeRequests.filter(r => r.status === 'pending').length}
                                    </span>
                                )}
                            </button>
                        ))}
                    </nav>

                    {/* Sidebar Footer */}
                    <div className="p-4 border-t border-gray-200">
                        <button
                            onClick={handleLogout}
                            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-red-600 hover:bg-red-50 transition-all"
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                            </svg>
                            <span className="font-medium">Logout</span>
                        </button>
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <div className="lg:col-start-2 lg:row-start-1">
                {/* Header */}
                <header className="bg-white/80 backdrop-blur-md shadow-sm border-b border-gray-200 px-4 sm:px-6 py-4 sticky top-0 z-30">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <button
                                onClick={() => setSidebarOpen(true)}
                                className="lg:hidden p-2 rounded-lg hover:bg-gray-100 transition-colors"
                            >
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                                </svg>
                            </button>
                            <div>
                                <h1 className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-gray-800 to-gray-600 bg-clip-text text-transparent">
                                    {activeTab.charAt(0).toUpperCase() + activeTab.slice(1)}
                                </h1>
                                <p className="text-sm text-gray-600">
                                    Welcome back, {user?.name || 'Administrator'}
                                </p>
                            </div>
                        </div>

                        {/* Notifications */}
                        <div className="flex items-center gap-3">
                            <div className="relative">
                                <button
                                    onClick={() => setShowNotifications(!showNotifications)}
                                    className="p-2 rounded-lg hover:bg-gray-100 transition-colors relative"
                                >
                                    <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-5 5v-5zM15 7v5H9v-5H7v5H3v-5H1v12h14V7h-2z" />
                                    </svg>
                                    {notifications.filter(n => !n.read).length > 0 && (
                                        <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center animate-pulse">
                                            {notifications.filter(n => !n.read).length}
                                        </span>
                                    )}
                                </button>

                                {showNotifications && (
                                    <div className="absolute right-0 mt-2 w-80 bg-white rounded-xl shadow-xl border border-gray-200 z-50 animate-slide-down">
                                        <div className="p-4 border-b border-gray-200">
                                            <div className="flex items-center justify-between">
                                                <h3 className="font-semibold text-gray-800">Notifications</h3>
                                                {notifications.filter(n => !n.read).length > 0 && (
                                                    <button
                                                        onClick={markAllRead}
                                                        className="text-sm text-rose-600 hover:text-rose-700 font-medium"
                                                    >
                                                        Mark all read
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                        <div className="max-h-96 overflow-y-auto">
                                            {notifications.length === 0 ? (
                                                <div className="p-4 text-center text-gray-500">
                                                    <p className="text-sm">No notifications yet</p>
                                                </div>
                                            ) : (
                                                notifications.map((notification) => (
                                                    <div
                                                        key={notification.id}
                                                        className={`p-4 border-b border-gray-100 hover:bg-gray-50 cursor-pointer transition-colors ${!notification.read ? 'bg-blue-50' : ''
                                                            }`}
                                                        onClick={() => markNotificationRead(notification.id)}
                                                    >
                                                        <p className="text-sm text-gray-800">{notification.message}</p>
                                                        <p className="text-xs text-gray-500 mt-1">
                                                            {new Date(notification.created_at).toLocaleDateString()} at {new Date(notification.created_at).toLocaleTimeString()}
                                                        </p>
                                                    </div>
                                                ))
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </header>

                {/* Main Content Area */}
                <main className="p-4 sm:p-6 lg:p-8 space-y-6">
                    {/* Dashboard Tab */}
                    {activeTab === 'dashboard' && (
                        <div className="space-y-6 animate-fade-in">
                            {/* Welcome Section */}
                            <div className="bg-gradient-to-r from-rose-500 to-pink-600 rounded-2xl p-6 sm:p-8 text-white shadow-xl">
                                <h2 className="text-2xl sm:text-3xl font-bold mb-2">Welcome to Admin Dashboard</h2>
                                <p className="text-rose-100 text-lg">Manage your birthday app with ease and style</p>
                            </div>

                            {/* Key Metrics */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
                                <MetricCard
                                    title="Total Photos"
                                    value={photoCount + supabasePhotoCount}
                                    icon="📸"
                                    color="blue"
                                />
                                <MetricCard
                                    title="Total Orders"
                                    value={orders.length}
                                    icon="📋"
                                    color="green"
                                />
                                <MetricCard
                                    title="Page Views"
                                    value={viewerCount}
                                    icon="👁️"
                                    color="purple"
                                />
                                <MetricCard
                                    title="Total Gifts"
                                    value={gifts.length}
                                    icon="🎁"
                                    color="yellow"
                                />
                            </div>

                            {/* Quick Actions */}
                            <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100">
                                <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2 text-lg">
                                    <span className="text-2xl">⚡</span>
                                    Quick Actions
                                </h3>
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                                    <ActionCard
                                        to="/upload"
                                        icon="📤"
                                        label="Upload Photos"
                                        color="rose"
                                    />
                                    <ActionCard
                                        to="/slideshow"
                                        icon="🎬"
                                        label="View Slideshow"
                                        color="purple"
                                    />
                                    <ActionCard
                                        to="/locked"
                                        icon="🎁"
                                        label="Birthday Page"
                                        color="amber"
                                    />
                                    <ActionButton
                                        onClick={clearAllPhotos}
                                        icon="🗑️"
                                        label="Clear Photos"
                                        color="red"
                                    />
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Orders Tab */}
                    {activeTab === 'orders' && (
                        <div className="space-y-6 animate-fade-in">
                            {/* Header */}
                            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                                <div>
                                    <h2 className="text-2xl font-bold bg-gradient-to-r from-gray-800 to-gray-600 bg-clip-text text-transparent">Order Management</h2>
                                    <p className="text-gray-600 mt-1">View and manage all birthday orders</p>
                                </div>
                            </div>

                            {/* Orders Stats */}
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                <StatCard title="Total Orders" value={orders.length} icon="📋" color="green" />
                                <StatCard title="Paid Orders" value={orders.filter(o => o.status === 'paid').length} icon="💰" color="blue" />
                                <StatCard title="Pending Orders" value={orders.filter(o => o.status !== 'paid').length} icon="⏳" color="yellow" />
                            </div>

                            {/* Orders List */}
                            {groupedOrders.length === 0 ? (
                                <EmptyState icon="📋" title="No orders yet" message="Orders will appear here once users create birthday pages." />
                            ) : (
                                <div className="space-y-4">
                                    {groupedOrders.map((group, groupIndex) => (
                                        <OrderGroup key={groupIndex} group={group} />
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {/* Users Tab */}
                    {activeTab === 'users' && (
                        <div className="space-y-6 animate-fade-in">
                            {/* Header */}
                            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                                <div>
                                    <h2 className="text-2xl font-bold bg-gradient-to-r from-gray-800 to-gray-600 bg-clip-text text-transparent">User Management</h2>
                                    <p className="text-gray-600 mt-1">Manage registered users and their access levels</p>
                                </div>
                                <button
                                    onClick={() => setShowUserModal(true)}
                                    className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-rose-500 to-pink-600 text-white rounded-xl hover:shadow-lg transition-all transform hover:scale-[1.02] active:scale-[0.98] font-medium"
                                >
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                    </svg>
                                    Add User
                                </button>
                            </div>

                            {/* Users Stats */}
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                <StatCard title="Total Users" value={users.length} icon="👥" color="blue" />
                                <StatCard title="Paid Users" value={users.filter(u => u.payment_status === 'confirmed').length} icon="💰" color="green" />
                                <StatCard title="Free Users" value={users.filter(u => u.package_tier === 'free').length} icon="🆓" color="yellow" />
                            </div>

                            {/* Users List */}
                            {users.length === 0 ? (
                                <EmptyState icon="👥" title="No users yet" message="Users will appear here once they register or create orders." />
                            ) : (
                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                                    {users.map((user, index) => (
                                        <UserCard key={index} user={user} />
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {/* Payments Tab */}
                    {activeTab === 'payments' && (
                        <div className="space-y-6 animate-fade-in">
                            {/* Header */}
                            <div>
                                <h2 className="text-2xl font-bold bg-gradient-to-r from-gray-800 to-gray-600 bg-clip-text text-transparent">Payment Processing</h2>
                                <p className="text-gray-600 mt-1">Review and confirm pending payments</p>
                            </div>

                            {/* Payments Stats */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                                <StatCard title="Pending Payments" value={pendingPayments.length} icon="⏳" color="green" />
                                <StatCard title="Total Users" value={users.length} icon="👥" color="blue" />
                                <StatCard title="Paid Users" value={users.filter(u => u.payment_status === 'confirmed').length} icon="💰" color="purple" />
                                <StatCard title="Unpaid Users" value={users.filter(u => u.payment_status !== 'confirmed' && u.package_tier !== 'free').length} icon="⚠️" color="yellow" />
                            </div>

                            {/* Pending Payments List */}
                            {pendingPayments.length === 0 ? (
                                <EmptyState icon="✅" title="No pending payments" message="All payments have been processed." />
                            ) : (
                                <div className="space-y-4">
                                    {pendingPayments.map((payment, index) => (
                                        <PaymentCard key={index} payment={payment} onConfirm={confirmPayment} onReject={rejectPayment} />
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {/* Upgrades Tab */}
                    {activeTab === 'upgrades' && (
                        <div className="space-y-6 animate-fade-in">
                            {/* Header */}
                            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                                <div>
                                    <h2 className="text-2xl font-bold bg-gradient-to-r from-gray-800 to-gray-600 bg-clip-text text-transparent">Package Upgrade Requests</h2>
                                    <p className="text-gray-600 mt-1">Review and approve user package upgrades</p>
                                </div>
                                {localPendingUpgradeCount > 0 && (
                                    <button
                                        onClick={syncLocalUpgradeRequests}
                                        disabled={syncingLocalRequests}
                                        className={`px-4 py-2 rounded-lg font-semibold transition-colors ${syncingLocalRequests ? 'bg-gray-300 text-gray-600 cursor-not-allowed' : 'bg-indigo-600 text-white hover:bg-indigo-700'}`}>
                                        {syncingLocalRequests ? 'Syncing local requests...' : `Sync ${localPendingUpgradeCount} local request${localPendingUpgradeCount > 1 ? 's' : ''}`}
                                    </button>
                                )}
                            </div>

                            {/* Upgrades Stats */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                                <StatCard title="Pending Upgrades" value={upgradeRequests.filter(r => r.status === 'pending').length} icon="⏳" color="purple" />
                                <StatCard title="Approved" value={upgradeRequests.filter(r => r.status === 'approved').length} icon="✅" color="green" />
                                <StatCard title="Rejected" value={upgradeRequests.filter(r => r.status === 'rejected').length} icon="❌" color="red" />
                                <StatCard title="Total Requests" value={upgradeRequests.length} icon="📋" color="blue" />
                            </div>

                            {/* Upgrade Requests List */}
                            {upgradeRequests.length === 0 ? (
                                <EmptyState icon="✅" title="No upgrade requests" message="All upgrade requests have been processed." />
                            ) : (
                                <div className="space-y-4">
                                    {upgradeRequests.filter(r => r.status === 'pending').length > 0 && (
                                        <div className="bg-gradient-to-r from-purple-50 to-pink-50 border border-purple-200 rounded-xl p-4 animate-pulse">
                                            <p className="text-purple-700 font-semibold flex items-center gap-2">
                                                <span className="text-xl">⚠️</span>
                                                {upgradeRequests.filter(r => r.status === 'pending').length} upgrade request(s) awaiting review
                                            </p>
                                        </div>
                                    )}

                                    {upgradeRequests.map((request) => (
                                        <UpgradeRequestCard key={request.id} request={request} onApprove={approveUpgradeRequest} onReject={rejectUpgradeRequest} />
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {/* Birthday Pages Tab */}
                    {activeTab === 'birthday' && (
                        <div className="space-y-6 animate-fade-in">
                            {/* Header */}
                            <div>
                                <h2 className="text-2xl font-bold bg-gradient-to-r from-gray-800 to-gray-600 bg-clip-text text-transparent">Birthday Pages Management</h2>
                                <p className="text-gray-600 mt-1">Manage content and access to birthday pages</p>
                            </div>

                            {/* Quick Actions */}
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                                <ActionCard to="/upload" icon="📤" label="Upload Photos" color="rose" />
                                <ActionCard to="/slideshow" icon="🎬" label="View Slideshow" color="purple" />
                                <ActionCard to="/locked" icon="🎁" label="Birthday Page" color="amber" />
                                <ActionButton onClick={clearAllPhotos} icon="🗑️" label="Clear Photos" color="red" />
                            </div>

                            {/* Paid Birthday Pages */}
                            <div>
                                <h3 className="text-lg font-semibold text-gray-800 mb-4">🎂 Paid Birthday Pages</h3>
                                {orders.filter(o => o.package !== 'free').length === 0 ? (
                                    <EmptyState icon="🎂" title="No paid birthday pages yet" message="Paid birthday pages will appear here once users upgrade their packages." />
                                ) : (
                                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                                        {orders.filter(o => o.package !== 'free').slice(0, 20).map((order, idx) => (
                                            <BirthdayPageCard key={idx} order={order} />
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Statistics Section */}
                    <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100">
                        <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2 text-lg">
                            <span className="text-2xl">📊</span>
                            System Statistics
                        </h3>
                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                            <StatBox value={photoCount} label="Local Photos" color="rose" />
                            <StatBox value={supabasePhotoCount} label="Cloud Photos" color="pink" />
                            <StatBox value={viewerCount} label="Page Views" color="purple" />
                            <StatBox value={gifts.length} label="Total Gifts" color="indigo" />
                        </div>
                    </div>

                    {/* Share Section */}
                    <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100">
                        <h3 className="font-bold text-gray-800 mb-3 flex items-center gap-2 text-lg">
                            <span className="text-2xl">📲</span>
                            Share Upload Link
                        </h3>
                        <p className="text-gray-600 text-sm mb-4">Share this link with friends and family to let them upload photos</p>
                        <div className="flex flex-col sm:flex-row gap-3">
                            <input
                                type="text"
                                readOnly
                                value={shareLink}
                                className="flex-1 p-3 border-2 border-rose-200 rounded-xl text-sm bg-gray-50 focus:outline-none focus:border-rose-400 transition-all"
                            />
                            <button
                                onClick={copyShareLink}
                                className="px-6 py-3 bg-gradient-to-r from-rose-500 to-pink-600 text-white rounded-xl hover:shadow-lg transition-all font-medium whitespace-nowrap"
                            >
                                Copy Link 📋
                            </button>
                        </div>
                        {copyStatus && (
                            <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-lg animate-fade-in">
                                <p className="text-green-700 text-sm font-medium text-center">✅ Link copied successfully!</p>
                            </div>
                        )}
                    </div>

                    {/* MoMo Configuration */}
                    <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100">
                        <h3 className="font-bold text-gray-800 mb-3 flex items-center gap-2 text-lg">
                            <span className="text-2xl">💰</span>
                            Mobile Money Settings
                        </h3>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-gray-700 text-sm font-medium mb-2">MoMo Number</label>
                                <input
                                    type="text"
                                    value={momoNumber}
                                    onChange={(e) => setMomoNumber(e.target.value)}
                                    placeholder="Enter MoMo number (e.g., 0531114795)"
                                    className="w-full p-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-rose-400 focus:ring-2 focus:ring-rose-100 transition-all"
                                />
                            </div>
                            <button
                                onClick={saveMomoNumber}
                                className="w-full bg-gradient-to-r from-green-500 to-emerald-500 text-white py-3 rounded-xl font-semibold hover:shadow-lg transition-all transform hover:scale-[1.02] active:scale-[0.98]"
                            >
                                Save MoMo Number 💾
                            </button>
                            {momoStatus && (
                                <div className="p-3 bg-green-50 border border-green-200 rounded-lg animate-fade-in">
                                    <p className="text-green-700 text-sm font-medium text-center">✅ MoMo number saved successfully!</p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Recent Gifts */}
                    <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100">
                        <h3 className="font-bold text-gray-800 mb-3 flex items-center gap-2 text-lg">
                            <span className="text-2xl">🎁</span>
                            Recent Gifts ({gifts.length})
                        </h3>
                        <div className="space-y-3 max-h-96 overflow-y-auto">
                            {gifts.length === 0 ? (
                                <div className="text-center py-8 text-gray-500">
                                    <div className="text-4xl mb-2">🎁</div>
                                    <p className="text-sm">No gifts received yet</p>
                                    <p className="text-xs mt-1">Gifts from birthday pages will appear here</p>
                                </div>
                            ) : (
                                gifts.slice().reverse().slice(0, 10).map((gift, i) => (
                                    <div key={i} className="bg-gradient-to-r from-rose-50 to-pink-50 p-4 rounded-xl border border-rose-100 hover:shadow-md transition-all">
                                        <div className="flex items-start justify-between mb-2">
                                            <div className="font-bold text-rose-700 text-base">{gift.name}</div>
                                            <div className="text-xs text-gray-500 bg-white px-2 py-1 rounded-full">
                                                {new Date(gift.date).toLocaleDateString()}
                                            </div>
                                        </div>
                                        <div className="text-gray-700 text-sm leading-relaxed">{gift.message}</div>
                                    </div>
                                ))
                            )}
                        </div>
                        {gifts.length > 10 && (
                            <p className="text-xs text-gray-500 text-center mt-3">
                                Showing 10 most recent gifts
                            </p>
                        )}
                    </div>
                </main>
            </div>

            {/* Add User Modal */}
            {showUserModal && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
                    <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 animate-scale-up">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-xl font-bold text-gray-800">Add New User</h3>
                            <button
                                onClick={() => setShowUserModal(false)}
                                className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>
                        <div className="space-y-4">
                            <input
                                type="text"
                                placeholder="Full Name"
                                value={newUserName}
                                onChange={(e) => setNewUserName(e.target.value)}
                                className="w-full p-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-rose-400 transition-all"
                            />
                            <input
                                type="email"
                                placeholder="Email"
                                value={newUserEmail}
                                onChange={(e) => setNewUserEmail(e.target.value)}
                                className="w-full p-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-rose-400 transition-all"
                            />
                            <input
                                type="password"
                                placeholder="Password"
                                value={newUserPassword}
                                onChange={(e) => setNewUserPassword(e.target.value)}
                                className="w-full p-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-rose-400 transition-all"
                            />
                            <select
                                value={newUserRole}
                                onChange={(e) => setNewUserRole(e.target.value)}
                                className="w-full p-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-rose-400 transition-all"
                            >
                                <option value="user">User</option>
                                <option value="admin">Admin</option>
                            </select>
                            <button
                                onClick={addNewUser}
                                className="w-full bg-gradient-to-r from-rose-500 to-pink-600 text-white py-3 rounded-xl font-semibold hover:shadow-lg transition-all"
                            >
                                Create User ✨
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}

// Helper Components for better organization and reusability

const MetricCard = ({ title, value, icon, color }) => {
    const colors = {
        blue: 'from-blue-100 to-indigo-100 text-blue-700',
        green: 'from-green-100 to-emerald-100 text-green-700',
        purple: 'from-purple-100 to-violet-100 text-purple-700',
        yellow: 'from-yellow-100 to-amber-100 text-yellow-700'
    }
    return (
        <div className={`bg-gradient-to-r ${colors[color]} p-6 rounded-2xl shadow-md hover:shadow-xl transition-all transform hover:scale-[1.02]`}>
            <div className="flex items-center justify-between">
                <div>
                    <p className="text-sm font-medium opacity-80">{title}</p>
                    <p className="text-3xl font-bold">{value}</p>
                </div>
                <div className="text-4xl opacity-80">{icon}</div>
            </div>
        </div>
    )
}

const StatCard = ({ title, value, icon, color }) => {
    const colors = {
        green: 'from-green-100 to-emerald-100 text-green-700',
        blue: 'from-blue-100 to-indigo-100 text-blue-700',
        yellow: 'from-yellow-100 to-amber-100 text-yellow-700',
        purple: 'from-purple-100 to-violet-100 text-purple-700',
        red: 'from-red-100 to-pink-100 text-red-700'
    }
    return (
        <div className={`bg-gradient-to-r ${colors[color]} p-6 rounded-2xl shadow-md`}>
            <div className="flex items-center justify-between">
                <div>
                    <p className="text-sm font-medium opacity-80">{title}</p>
                    <p className="text-2xl font-bold">{value}</p>
                </div>
                <div className="text-3xl opacity-80">{icon}</div>
            </div>
        </div>
    )
}

const StatBox = ({ value, label, color }) => {
    const colors = {
        rose: 'bg-rose-50 text-rose-600',
        pink: 'bg-pink-50 text-pink-600',
        purple: 'bg-purple-50 text-purple-600',
        indigo: 'bg-indigo-50 text-indigo-600'
    }
    return (
        <div className={`text-center p-4 rounded-xl ${colors[color]} shadow-sm`}>
            <div className="text-2xl font-bold mb-1">{value}</div>
            <div className="text-xs">{label}</div>
        </div>
    )
}

const EmptyState = ({ icon, title, message }) => (
    <div className="bg-white rounded-2xl p-12 text-center shadow-lg border border-gray-100">
        <div className="text-6xl mb-4">{icon}</div>
        <h3 className="text-xl font-semibold text-gray-700 mb-2">{title}</h3>
        <p className="text-gray-500">{message}</p>
    </div>
)

const ActionCard = ({ to, icon, label, color }) => {
    const colors = {
        rose: 'from-rose-100 to-pink-100 hover:from-rose-200 hover:to-pink-200',
        purple: 'from-purple-100 to-violet-100 hover:from-purple-200 hover:to-violet-200',
        amber: 'from-amber-100 to-yellow-100 hover:from-amber-200 hover:to-yellow-200',
        red: 'from-red-100 to-pink-100 hover:from-red-200 hover:to-pink-200'
    }
    return (
        <Link
            to={to}
            className={`bg-gradient-to-r ${colors[color]} p-5 rounded-xl hover:shadow-xl transition-all transform hover:scale-[1.02] group text-center`}
        >
            <span className="text-3xl mb-2 block group-hover:scale-110 transition-transform">{icon}</span>
            <span className="font-semibold text-gray-700 text-sm">{label}</span>
        </Link>
    )
}

const ActionButton = ({ onClick, icon, label, color }) => {
    const colors = {
        rose: 'from-rose-100 to-pink-100 hover:from-rose-200 hover:to-pink-200',
        purple: 'from-purple-100 to-violet-100 hover:from-purple-200 hover:to-violet-200',
        amber: 'from-amber-100 to-yellow-100 hover:from-amber-200 hover:to-yellow-200',
        red: 'from-red-100 to-pink-100 hover:from-red-200 hover:to-pink-200'
    }
    return (
        <button
            onClick={onClick}
            className={`bg-gradient-to-r ${colors[color]} p-5 rounded-xl hover:shadow-xl transition-all transform hover:scale-[1.02] group text-center w-full`}
        >
            <span className="text-3xl mb-2 block group-hover:scale-110 transition-transform">{icon}</span>
            <span className="font-semibold text-gray-700 text-sm">{label}</span>
        </button>
    )
}

const OrderGroup = ({ group }) => (
    <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden hover:shadow-xl transition-all">
        <div className="bg-gradient-to-r from-gray-50 to-gray-100 px-6 py-4 border-b border-gray-200">
            <div className="flex items-center justify-between flex-wrap gap-2">
                <div>
                    <h3 className="font-bold text-gray-800 text-lg">{group.giver}</h3>
                    <p className="text-sm text-gray-600">{group.total} order{group.total !== 1 ? 's' : ''} • {group.paidCount} paid</p>
                </div>
                <div className="flex items-center gap-2">
                    <span className={`px-3 py-1 rounded-full text-sm font-semibold ${group.paidCount === group.total ? 'bg-green-100 text-green-700' :
                        group.paidCount > 0 ? 'bg-yellow-100 text-yellow-700' :
                            'bg-gray-100 text-gray-700'
                        }`}>
                        {group.paidCount === group.total ? 'All Paid' :
                            group.paidCount > 0 ? 'Partial' : 'Unpaid'}
                    </span>
                </div>
            </div>
        </div>
        <div className="divide-y divide-gray-100">
            {group.orders.map((order, orderIndex) => (
                <div key={orderIndex} className="p-6 hover:bg-gray-50 transition-colors">
                    <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                        <div className="flex-1">
                            <div className="flex items-center gap-3 mb-3">
                                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-rose-400 to-pink-500 flex items-center justify-center text-white font-bold text-lg shadow-md">
                                    🎂
                                </div>
                                <div>
                                    <h4 className="font-bold text-gray-800 text-lg">{order.recipient_name || 'Unknown'}</h4>
                                    <p className="text-sm text-gray-600">Code: <span className="font-mono bg-gray-100 px-2 py-0.5 rounded">{order.code}</span></p>
                                </div>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                                <div className="bg-gray-50 p-3 rounded-lg">
                                    <p className="text-xs text-gray-500 mb-1">Package</p>
                                    <p className="font-semibold text-gray-800 capitalize">{order.package || 'free'}</p>
                                </div>
                                <div className="bg-gray-50 p-3 rounded-lg">
                                    <p className="text-xs text-gray-500 mb-1">Status</p>
                                    <span className={`px-2 py-1 rounded-full text-xs font-semibold ${order.status === 'paid' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                                        }`}>
                                        {order.status || 'pending'}
                                    </span>
                                </div>
                                <div className="bg-gray-50 p-3 rounded-lg">
                                    <p className="text-xs text-gray-500 mb-1">Birthday</p>
                                    <p className="font-semibold text-gray-800">{order.birthday_date || order.date_of_birth || 'Not set'}</p>
                                </div>
                                <div className="bg-gray-50 p-3 rounded-lg">
                                    <p className="text-xs text-gray-500 mb-1">Created</p>
                                    <p className="font-semibold text-gray-800">{new Date(order.created_at || order.createdAt).toLocaleDateString()}</p>
                                </div>
                            </div>
                        </div>
                        <div className="flex flex-col sm:flex-row gap-2">
                            <Link to={`/birthday/${order.code}`} className="px-4 py-2 bg-rose-50 text-rose-600 rounded-lg hover:bg-rose-100 transition-colors text-sm font-medium text-center">
                                👁️ View
                            </Link>
                            <Link to={`/upload/${order.code}`} className="px-4 py-2 bg-purple-50 text-purple-600 rounded-lg hover:bg-purple-100 transition-colors text-sm font-medium text-center">
                                📷 Photos
                            </Link>
                        </div>
                    </div>
                </div>
            ))}
        </div>
    </div>
)

const UserCard = ({ user }) => (
    <div className="bg-white p-6 rounded-2xl shadow-lg border border-gray-100 hover:shadow-xl transition-all transform hover:scale-[1.01]">
        <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-400 to-indigo-500 flex items-center justify-center text-white font-bold text-lg shadow-md">
                    {user.name?.charAt(0).toUpperCase() || user.email?.charAt(0).toUpperCase() || '?'}
                </div>
                <div>
                    <h3 className="font-bold text-gray-800 text-lg">{user.name || 'Unknown User'}</h3>
                    <p className="text-sm text-gray-600">{user.email}</p>
                </div>
            </div>
            <span className={`px-3 py-1 rounded-full text-sm font-semibold ${user.role === 'super_admin' ? 'bg-purple-100 text-purple-700' :
                user.role === 'admin' ? 'bg-blue-100 text-blue-700' :
                    'bg-gray-100 text-gray-700'
                }`}>
                {user.role === 'super_admin' ? 'Super Admin' : user.role === 'admin' ? 'Admin' : 'User'}
            </span>
        </div>
        {user.phone && (
            <div className="flex items-center gap-2 text-sm text-gray-600 mb-2">
                <span className="text-base">📞</span>
                <span>{user.phone}</span>
            </div>
        )}
        <div className="flex items-center gap-2 text-sm text-gray-500 mb-2">
            <span className="text-base">📅</span>
            <span>Joined {new Date(user.createdAt || Date.now()).toLocaleDateString()}</span>
        </div>
        {user.package_tier && (
            <div className="flex items-center gap-2 text-sm text-gray-600">
                <span className="text-base">🎁</span>
                <span className="capitalize font-medium">{user.package_tier} package</span>
                {user.payment_status === 'confirmed' && (
                    <span className="text-green-600 font-medium ml-2">✓ Paid</span>
                )}
            </div>
        )}
    </div>
)

const PaymentCard = ({ payment, onConfirm, onReject }) => (
    <div className="bg-white p-6 rounded-2xl shadow-lg border border-gray-100 hover:shadow-xl transition-all">
        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
            <div className="flex-1">
                <div className="flex items-center gap-3 mb-3">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-green-400 to-emerald-500 flex items-center justify-center text-white font-bold text-lg shadow-md">
                        {payment.name?.charAt(0).toUpperCase() || payment.email?.charAt(0).toUpperCase() || '?'}
                    </div>
                    <div>
                        <h3 className="font-bold text-gray-800 text-lg">{payment.name || 'Unknown User'}</h3>
                        <p className="text-sm text-gray-600">{payment.email}</p>
                    </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
                    <div className="bg-gray-50 p-3 rounded-lg">
                        <p className="text-xs text-gray-500 mb-1">Package</p>
                        <p className="font-semibold text-gray-800 capitalize">{payment.package_tier || payment.package_name || 'N/A'}</p>
                    </div>
                    <div className="bg-gray-50 p-3 rounded-lg">
                        <p className="text-xs text-gray-500 mb-1">Amount</p>
                        <p className="font-semibold text-gray-800">GHS {payment.amount || 'N/A'}</p>
                    </div>
                </div>
                {payment.momo_number && (
                    <div className="bg-blue-50 p-3 rounded-lg mb-3">
                        <p className="text-xs text-blue-600 mb-1">MoMo Number</p>
                        <p className="font-mono font-semibold text-blue-800">{payment.momo_number}</p>
                    </div>
                )}
                <div className="text-sm text-gray-500">
                    <p>Requested: {new Date(payment.created_at || payment.createdAt).toLocaleDateString()}</p>
                </div>
            </div>
            <div className="flex flex-col gap-3">
                <div className="flex gap-2">
                    <button onClick={() => onConfirm(payment.id, payment.package_tier)} className="flex-1 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors text-sm font-medium">
                        ✅ Confirm
                    </button>
                    <button onClick={() => onReject(payment.id)} className="flex-1 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors text-sm font-medium">
                        ❌ Reject
                    </button>
                </div>
            </div>
        </div>
    </div>
)

const UpgradeRequestCard = ({ request, onApprove, onReject }) => (
    <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100 hover:shadow-xl transition-all">
        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4 mb-4">
            <div className="flex-1">
                <div className="flex items-center gap-3 mb-3">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-400 to-violet-500 flex items-center justify-center text-white font-bold text-lg shadow-md">
                        {request.user_name?.charAt(0).toUpperCase() || request.user_email?.charAt(0).toUpperCase() || '?'}
                    </div>
                    <div>
                        <h3 className="font-bold text-gray-800 text-lg">{request.user_name || 'Unknown User'}</h3>
                        <p className="text-sm text-gray-600">{request.user_email}</p>
                    </div>
                </div>
                <div className="flex items-center gap-2 mb-3">
                    <span className={`px-3 py-1 rounded-full text-sm font-semibold ${request.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                        request.status === 'approved' ? 'bg-green-100 text-green-700' :
                            'bg-red-100 text-red-700'
                        }`}>
                        {request.status.toUpperCase()}
                    </span>
                    <span className="text-sm text-gray-500">
                        Requested {new Date(request.created_at).toLocaleDateString()}
                    </span>
                </div>
            </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
            <div className="bg-purple-50 rounded-lg p-4">
                <p className="text-sm text-gray-600 mb-2">Current Package</p>
                <p className="font-bold text-purple-700 text-lg capitalize">{request.from_package_tier || 'Free'}</p>
            </div>
            <div className="bg-green-50 rounded-lg p-4">
                <p className="text-sm text-gray-600 mb-2">Requested Package</p>
                <p className="font-bold text-green-700 text-lg capitalize">{request.to_package_tier}</p>
            </div>
        </div>
        <div className="bg-gray-50 rounded-lg p-4 mb-4 space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="flex items-center gap-2">
                    <span className="text-base">💰</span>
                    <div>
                        <p className="text-xs text-gray-500">Amount Paid</p>
                        <p className="font-semibold text-gray-800">GHS {request.amount_paid}</p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <span className="text-base">💳</span>
                    <div>
                        <p className="text-xs text-gray-500">Payment Method</p>
                        <p className="font-semibold text-gray-800">{request.payment_method === 'momo' ? 'Mobile Money' : 'Bank Transfer'}</p>
                    </div>
                </div>
            </div>
            {request.momo_number && (
                <div className="flex items-center gap-2">
                    <span className="text-base">📞</span>
                    <div>
                        <p className="text-xs text-gray-500">MoMo Number</p>
                        <p className="font-mono font-semibold text-gray-800">{request.momo_number}</p>
                    </div>
                </div>
            )}
            {request.transaction_id && (
                <div className="flex items-center gap-2">
                    <span className="text-base">🧾</span>
                    <div>
                        <p className="text-xs text-gray-500">Transaction ID</p>
                        <p className="font-mono font-semibold text-gray-800">{request.transaction_id}</p>
                    </div>
                </div>
            )}
            {request.payment_reference_code && (
                <div className="bg-slate-900 text-slate-100 p-3 rounded-lg text-center">
                    <p className="text-xs text-gray-300 mb-1">Payment Reference</p>
                    <p className="font-mono font-bold tracking-widest text-emerald-400 text-lg">{request.payment_reference_code}</p>
                </div>
            )}
            {request.payment_proof_url && (
                <div className="flex items-center gap-2">
                    <span className="text-base">📎</span>
                    <a href={request.payment_proof_url} target="_blank" rel="noreferrer" className="text-rose-500 hover:text-rose-600 font-medium">
                        View Payment Proof
                    </a>
                </div>
            )}
            {request.notes && (
                <div className="bg-yellow-50 p-3 rounded-lg">
                    <p className="text-sm text-yellow-800"><strong>Notes:</strong> {request.notes}</p>
                </div>
            )}
        </div>
        {request.status === 'pending' && (() => {
            const isLocalFallback = request.isLocalFallback || !Number.isInteger(Number(request.id)) || Number(request.id) > 2147483647
            return (
                <>
                    {isLocalFallback && (
                        <div className="mb-3 rounded-lg bg-yellow-50 border border-yellow-200 p-3 text-yellow-700 text-sm">
                            This request was created locally and is not yet saved on the server. It cannot be approved or rejected until it is synced.
                        </div>
                    )}
                    <div className="flex flex-col sm:flex-row gap-3">
                        <button
                            onClick={() => onApprove(request.id)}
                            disabled={isLocalFallback}
                            className={`flex-1 px-4 py-3 rounded-lg font-semibold transition-colors ${isLocalFallback ? 'bg-gray-300 text-gray-600 cursor-not-allowed' : 'bg-green-500 text-white hover:bg-green-600'}`}>
                            ✅ Approve & Activate
                        </button>
                        <button
                            onClick={() => onReject(request.id)}
                            disabled={isLocalFallback}
                            className={`flex-1 px-4 py-3 rounded-lg font-semibold transition-colors ${isLocalFallback ? 'bg-gray-300 text-gray-600 cursor-not-allowed' : 'bg-red-500 text-white hover:bg-red-600'}`}>
                            ❌ Reject
                        </button>
                    </div>
                </>
            )
        })()}
    </div>
)

const BirthdayPageCard = ({ order }) => (
    <div className="bg-white p-6 rounded-2xl shadow-lg border border-gray-100 hover:shadow-xl transition-all transform hover:scale-[1.01]">
        <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-amber-400 to-yellow-500 flex items-center justify-center text-white font-bold text-lg shadow-md">
                    🎂
                </div>
                <div>
                    <h4 className="font-bold text-gray-800 text-lg">{order.recipient_name || 'Unknown'}</h4>
                    <p className="text-sm text-gray-600">Code: <span className="font-mono bg-gray-100 px-2 py-0.5 rounded">{order.code}</span></p>
                </div>
            </div>
            <span className={`px-3 py-1 rounded-full text-sm font-semibold ${order.status === 'paid' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                {order.status}
            </span>
        </div>
        <div className="grid grid-cols-2 gap-3 mb-4">
            <div className="bg-gray-50 p-3 rounded-lg">
                <p className="text-xs text-gray-500 mb-1">Package</p>
                <p className="font-semibold text-gray-800 capitalize">{order.package}</p>
            </div>
            <div className="bg-gray-50 p-3 rounded-lg">
                <p className="text-xs text-gray-500 mb-1">Birthday</p>
                <p className="font-semibold text-gray-800">{order.birthday_date || order.date_of_birth || 'Not set'}</p>
            </div>
        </div>
        <div className="flex flex-col sm:flex-row gap-2">
            <Link to={`/birthday/${order.code}`} className="flex-1 px-4 py-2 bg-rose-50 text-rose-600 rounded-lg hover:bg-rose-100 transition-colors text-sm font-medium text-center">
                👁️ View Page
            </Link>
            <Link to={`/upload/${order.code}`} className="flex-1 px-4 py-2 bg-purple-50 text-purple-600 rounded-lg hover:bg-purple-100 transition-colors text-sm font-medium text-center">
                📷 Manage Photos
            </Link>
        </div>
    </div>
)

export default Admin