import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase, ADMIN_CREDENTIALS, STORAGE_KEYS } from '../supabase'

function Admin() {
    const navigate = useNavigate()
    const [isLoggedIn, setIsLoggedIn] = useState(false)
    const [user, setUser] = useState(null)
    const [username, setUsername] = useState('')
    const [password, setPassword] = useState('')
    const [error, setError] = useState(false)
    const [photoCount, setPhotoCount] = useState(0)
    const [supabasePhotoCount, setSupabasePhotoCount] = useState(0)
    const [viewerCount, setViewerCount] = useState(0)
    const [momoNumber, setMomoNumber] = useState('')
    const [momoStatus, setMomoStatus] = useState(false)
    const [gifts, setGifts] = useState([])
    const [shareLink, setShareLink] = useState('')
    const [copyStatus, setCopyStatus] = useState(false)
     const [activeTab, setActiveTab] = useState('orders') // 'orders', 'users', 'birthday', 'payments', 'upgrades'
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

      useEffect(() => {
          // Check if already logged in
          if (localStorage.getItem(STORAGE_KEYS.ADMIN_LOGGED_IN) === 'true') {
              setIsLoggedIn(true)
              setUser(JSON.parse(localStorage.getItem(STORAGE_KEYS.CURRENT_USER) || 'null'))
              updateStats()
              loadOrders()
              loadUsers()
              loadUpgradeRequests()
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
             const subscription = setupRealtimeNotifications()
             return () => {
                 if (subscription) supabase.removeChannel(subscription)
             }
         }
     }, [isLoggedIn, user])

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
         
         // Load pending payments
         loadPendingPayments()
         
          // Load upgrade requests
          loadUpgradeRequests()
          
          // Load notifications
          loadNotifications()
      }

    async function loadPendingPayments() {
        try {
            // Get users with pending payments (non-free packages)
            const { data: usersData, error } = await supabase
                .from('users')
                .select('*')
                .in('package_tier', ['basic', 'premium', 'enterprise'])
                
            if (usersData) {
                // Filter to show users whose payment is not confirmed
                const pending = usersData.filter(u => 
                    u.payment_status !== 'confirmed' && 
                    u.package_tier !== 'free'
                )
                setPendingPayments(pending)
            }
        } catch (err) {
            console.log('Could not load pending payments:', err)
        }
    }

    async function confirmPayment(userId, packageTier) {
        try {
            // Get package name from packages table
            const { data: packageData } = await supabase
                .from('packages')
                .select('name')
                .eq('tier', packageTier)
                .single()
            
            const packageName = packageData?.name || packageTier
            
            // Update user payment status
            const { error } = await supabase
                .from('users')
                .update({
                    payment_status: 'confirmed',
                    payment_confirmed_at: new Date().toISOString(),
                    payment_confirmed_by: 'admin',
                    package_name: packageName
                })
                .eq('id', userId)

            if (error) {
                alert('Error confirming payment: ' + error.message)
                return
            }

            alert('Payment confirmed! User can now access their package features.')
            loadPendingPayments()
        } catch (err) {
            alert('Error confirming payment')
        }
    }

    async function rejectPayment(userId) {
        if (!confirm('Are you sure you want to reject this payment? The user will be downgraded to free tier.')) {
            return
        }
        
        try {
            // Reset user to free tier
            const { error } = await supabase
                .from('users')
                .update({
                    package_tier: 'free',
                    package_id: 1,
                    payment_status: 'rejected',
                    payment_confirmed_at: null
                })
                .eq('id', userId)

            if (error) {
                alert('Error rejecting payment: ' + error.message)
                return
            }

            alert('Payment rejected. User has been downgraded to free tier.')
            loadPendingPayments()
        } catch (err) {
            alert('Error rejecting payment')
        }
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

    function loadUsers() {
        // Load from localStorage first
        const localUsers = JSON.parse(localStorage.getItem(STORAGE_KEYS.USERS) || '[]')
        setUsers(localUsers)
        
        // Also try to load from orders table (users who created orders)
        loadUsersFromOrders()
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
    async function confirmPayment(paymentId, packageTier) {
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
            const STORAGE_KEYS = {
                USERS: 'birthday_app_users'
            }
            const usersData = localStorage.getItem(STORAGE_KEYS.USERS) || '[]'
            const users = JSON.parse(usersData)
            
            // Find and update the user
            const userIndex = users.findIndex(u => u.email === payment.email)
            if (userIndex !== -1) {
                // Update user's package tier and payment status
                users[userIndex].package_tier = packageTier
                users[userIndex].package_name = payment.package_name || packageTier
                users[userIndex].payment_status = 'confirmed'
                users[userIndex].payment_confirmed_at = new Date().toISOString()
                
                // Save updated users
                localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(users))
                console.log('User package updated:', users[userIndex])
            }
            
            // Also update in Supabase if available
            const user = users.find(u => u.email === payment.email)
            if (user && user.id) {
                await supabase
                    .from('users')
                    .update({
                        package_tier: packageTier,
                        package_name: payment.package_name || packageTier,
                        payment_status: 'confirmed',
                        payment_confirmed_at: new Date().toISOString()
                    })
                    .eq('id', user.id)
            }
            
            // Remove from pending payments
            payments = payments.filter(p => p.id !== paymentId)
            localStorage.setItem('pending_payments', JSON.stringify(payments))
            
            // Refresh the pending payments list
            setPendingPayments(payments)
            
            alert(`Payment confirmed! User now has ${packageTier} package.`)
        } catch (err) {
            console.log('Error confirming payment:', err)
            alert('Error confirming payment')
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

              // Merge and deduplicate by id or payment_reference_code
              const allRequests = [...supabaseRequests]
              localUpgrades.forEach(local => {
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
                     console.log('New notification received:', payload)
                     setNotifications(prev => [payload.new, ...prev])
                 }
             )
             .subscribe()

         return subscription
     }

     // Close notifications dropdown when clicking outside
     useEffect(() => {
         const handleClickOutside = () => {
             if (showNotifications) setShowNotifications(false)
         }
         if (showNotifications) {
             document.addEventListener('click', handleClickOutside)
             return () => document.removeEventListener('click', handleClickOutside)
         }
     }, [showNotifications])

     // Approve upgrade request
     async function approveUpgradeRequest(requestId) {
         try {
             // Get the request
             const request = upgradeRequests.find(r => r.id === requestId)
             if (!request) {
                 alert('Upgrade request not found')
                 return
             }

             // Update upgrade request status
             const { error: updateError } = await supabase
                 .from('upgrade_requests')
                 .update({
                     status: 'approved',
                     reviewed_by: 'admin',
                     reviewed_at: new Date().toISOString(),
                     approved_at: new Date().toISOString()
                 })
                 .eq('id', requestId)

             if (updateError) {
                 console.error('Error updating upgrade request:', updateError)
                 // Fallback to localStorage
                 updateLocalUpgradeRequest(requestId, 'approved')
             }

             // Update user's package
             const { error: userError } = await supabase
                 .from('users')
                 .update({
                     package_tier: request.to_package_tier,
                     package_id: request.to_package_id,
                     payment_status: 'confirmed',
                     payment_confirmed_at: new Date().toISOString(),
                     package_pending: null,
                     pending_upgrade_id: null
                 })
                 .eq('id', request.user_id)

             if (userError) {
                 console.error('Error updating user package:', userError)
             }

             // Create user_packages entry (active)
             await supabase.from('user_packages').insert([{
                 user_id: request.user_id,
                 package_id: request.to_package_id,
                 is_active: true,
                 payment_status: 'confirmed',
                 started_at: new Date().toISOString()
             }])

             // Update localStorage
             updateLocalUserPackage(request.user_id, {
                 package_tier: request.to_package_tier,
                 package_id: request.to_package_id,
                 payment_status: 'confirmed',
                 package_pending: null
             })

              alert(`Upgrade approved! ${request.user_name || request.user_email} now has ${request.to_package_tier} package. Payment reference: ${request.payment_reference_code || 'N/A'}`)
              loadUpgradeRequests()

         } catch (err) {
             console.error('Error approving upgrade:', err)
             alert('Error approving upgrade')
         }
     }

     // Reject upgrade request
     async function rejectUpgradeRequest(requestId) {
         if (!confirm('Are you sure you want to reject this upgrade request?')) {
             return
         }

         try {
             // Update upgrade request status
             const { error } = await supabase
                 .from('upgrade_requests')
                 .update({
                     status: 'rejected',
                     reviewed_by: 'admin',
                     reviewed_at: new Date().toISOString(),
                     notes: 'Rejected by admin'
                 })
                 .eq('id', requestId)

             if (error) {
                 console.error('Error rejecting upgrade:', error)
                 // Fallback to localStorage
                 updateLocalUpgradeRequest(requestId, 'rejected')
             }

             // Clear user's pending upgrade
             const request = upgradeRequests.find(r => r.id === requestId)
             if (request) {
                 updateLocalUserPackage(request.user_id, {
                     package_pending: null,
                     pending_upgrade_id: null
                 })
             }

             alert('Upgrade request rejected.')
             loadUpgradeRequests()

         } catch (err) {
             console.error('Error rejecting upgrade:', err)
             alert('Error rejecting upgrade')
         }
     }

     // Helper: Update local user package data
     function updateLocalUserPackage(userId, updates) {
         // Update CURRENT_USER if it's the logged-in user
         const currentUser = JSON.parse(localStorage.getItem(STORAGE_KEYS.CURRENT_USER) || 'null')
         if (currentUser && currentUser.id === userId) {
             localStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify({ ...currentUser, ...updates }))
         }

         // Update in users list
         const usersData = JSON.parse(localStorage.getItem(STORAGE_KEYS.USERS) || '[]')
         const userIndex = usersData.findIndex(u => u.id === userId)
         if (userIndex !== -1) {
             usersData[userIndex] = { ...usersData[userIndex], ...updates }
             localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(usersData))
         }

         // Update in orders
         const ordersData = JSON.parse(localStorage.getItem(STORAGE_KEYS.ORDERS) || '[]')
         const orderIndex = ordersData.findIndex(o => o.userId === userId)
         if (orderIndex !== -1) {
             ordersData[orderIndex] = { ...ordersData[orderIndex], ...updates }
             localStorage.setItem(STORAGE_KEYS.ORDERS, JSON.stringify(ordersData))
         }
     }

     // Helper: Update localStorage upgrade request
     function updateLocalUpgradeRequest(requestId, status) {
         const upgrades = JSON.parse(localStorage.getItem('pending_upgrades') || '[]')
         const updatedUpgrades = upgrades.map(u => {
             if (u.id === requestId) {
                 return { ...u, status }
             }
             return u
         })
         localStorage.setItem('pending_upgrades', JSON.stringify(updatedUpgrades))
     }

    function createUser() {
        if (!newUserName.trim() || !newUserEmail.trim() || !newUserPassword.trim()) {
            alert('Please fill in all fields')
            return
        }

        const newUser = {
            id: Date.now(),
            name: newUserName.trim(),
            email: newUserEmail.trim().toLowerCase(),
            password: newUserPassword,
            role: newUserRole,
            createdAt: new Date().toISOString()
        }

        const allUsers = JSON.parse(localStorage.getItem(STORAGE_KEYS.USERS) || '[]')
        allUsers.push(newUser)
        localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(allUsers))

        setUsers([...users, newUser])
        setShowUserModal(false)
        setNewUserName('')
        setNewUserEmail('')
        setNewUserPassword('')
        setNewUserRole('user')

        alert('User created successfully!')
    }

    async function markOrderPaid(orderCode) {
        // Get the order to show the code
        const order = orders.find(o => o.code === orderCode)

        // Update in localStorage
        const updatedOrders = orders.map(o => {
            if (o.code === orderCode) {
                return { ...o, status: 'paid' }
            }
            return o
        })
        localStorage.setItem(STORAGE_KEYS.ORDERS, JSON.stringify(updatedOrders))
        setOrders(updatedOrders)

        // Update in Supabase
        try {
            const { data, error } = await supabase
                .from('orders')
                .update({ status: 'paid' })
                .eq('code', orderCode)
            if (error) {
                console.log('Supabase update error:', error.message)
            } else {
                console.log('Order marked as paid in Supabase!')
            }
        } catch (err) {
            console.log('Could not update Supabase:', err)
        }

        // Show success message with the order code for user to share
        const code = order?.code || orderCode
        alert(`✅ Order marked as PAID!

📝 Share this code with the user: ${code}

The user can now access their birthday page using this code!`)
    }

    async function saveMomoNumber() {
        localStorage.setItem(STORAGE_KEYS.MOM0, momoNumber)
        setMomoStatus(true)
        setTimeout(() => setMomoStatus(false), 3000)

        // Save to Supabase config
        try {
            await supabase
                .from('config')
                .upsert({ key: 'momo_number', value: momoNumber }, { onConflict: 'key' })
        } catch (err) {
            console.log('Could not save to Supabase')
        }
    }

    async function handleLogin(e) {
        e.preventDefault()

             if (username.toLowerCase() === ADMIN_CREDENTIALS.username && password === ADMIN_CREDENTIALS.password) {
                 localStorage.setItem(STORAGE_KEYS.ADMIN_LOGGED_IN, 'true')
                 setIsLoggedIn(true)
                 setError(false)
                 updateStats()
                 loadOrders()
                 loadUsers()
                 loadUpgradeRequests()
                 loadNotifications()
                 // Setup realtime notifications (will be called after user state is set via useEffect)
             } else {
                 // Check if user exists in database
                 const users = JSON.parse(localStorage.getItem(STORAGE_KEYS.USERS) || '[]')
                 const user = users.find(u =>
                     (u.email === username.toLowerCase() || u.phone === username)
                     && u.password === password
                 )

                  if (user && (user.role === 'admin' || user.role === 'super_admin')) {
                      // Sign in with Supabase for RLS access
                      try {
                          await supabase.auth.signInWithPassword({
                              email: user.email,
                              password: password
                          })
                      } catch (authError) {
                          console.log('Auth sign in failed:', authError.message)
                      }

                      localStorage.setItem(STORAGE_KEYS.ADMIN_LOGGED_IN, 'true')
                      localStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(user))
                      setIsLoggedIn(true)
                      setError(false)
                      updateStats()
                      loadOrders()
                      loadUsers()
                      loadUpgradeRequests()
                      loadNotifications()
                      // Setup realtime notifications
                  } else {
                     setError(true)
                     setTimeout(() => setError(false), 3000)
                 }
             }
    }

    function logout() {
        localStorage.removeItem(STORAGE_KEYS.ADMIN_LOGGED_IN)
        setIsLoggedIn(false)
        setUsername('')
        setPassword('')
        navigate('/')
    }

    function saveMomoNumber() {
        localStorage.setItem(STORAGE_KEYS.MOM0, momoNumber)
        setMomoStatus(true)
        setTimeout(() => setMomoStatus(false), 3000)
    }

    async function clearAllPhotos() {
        if (confirm('Are you sure you want to delete all uploaded photos? This cannot be undone!')) {
            // Clear localStorage
            localStorage.removeItem(STORAGE_KEYS.PHOTOS)
            localStorage.removeItem(STORAGE_KEYS.MESSAGES)

            // Clear Supabase database
            try {
                await supabase.from('photos').delete().neq('id', 0)
            } catch (error) {
                console.error('Error clearing Supabase:', error)
            }

            updateStats()
            alert('All photos cleared from localStorage and database!')
        }
    }

    function copyShareLink() {
        navigator.clipboard.writeText(shareLink)
        setCopyStatus(true)
        setTimeout(() => setCopyStatus(false), 2000)
    }

    if (!isLoggedIn) {
        return (
            <div className="flex items-center justify-center p-6 min-h-screen" style={{ background: 'linear-gradient(135deg, #fce7f3 0%, #fbcfe8 100%)' }}>
                {/* Return to Homepage */}
                <div className="fixed top-4 left-4 z-50">
                    <Link
                        to="/"
                        className="bg-rose-500 text-white px-4 py-2 rounded-full text-sm hover:bg-rose-600 transition shadow-lg"
                    >
                        ← Homepage
                    </Link>
                </div>

                <div className="max-w-md w-full">
                    <div className="bg-white rounded-3xl shadow-2xl p-8">
                        <div className="text-center mb-8">
                            <div className="text-6xl mb-4 animate-float">🔐</div>
                            <h1 className="text-3xl font-['Dancing_Script'] text-rose-500">Admin Login</h1>
                            <p className="text-gray-400 mt-2">Manage Orders 👑</p>
                        </div>

                        <form onSubmit={handleLogin}>
                            <div className="mb-4">
                                <label className="block text-gray-600 mb-2">Username</label>
                                <input
                                    type="text"
                                    value={username}
                                    onChange={(e) => setUsername(e.target.value)}
                                    required
                                    className="w-full p-3 border-2 border-rose-200 rounded-xl focus:outline-none focus:border-rose-400"
                                />
                            </div>

                            <div className="mb-6">
                                <label className="block text-gray-600 mb-2">Password</label>
                                <input
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    required
                                    className="w-full p-3 border-2 border-rose-200 rounded-xl focus:outline-none focus:border-rose-400"
                                />
                            </div>

                            <button
                                type="submit"
                                className="w-full bg-gradient-to-r from-rose-500 to-pink-500 text-white py-3 rounded-xl font-semibold hover:shadow-lg transition"
                            >
                                Login 🔑
                            </button>
                        </form>

                        {error && (
                            <p className="text-red-500 text-center mt-4">Invalid credentials</p>
                        )}

                        <div className="mt-6 text-center">
                            <Link to="/upload" className="text-rose-500 hover:text-rose-600 text-sm">
                                ← Back to Upload Page
                            </Link>
                        </div>
                    </div>
                </div>
            </div>
        )
    }

    return (
        <div className="flex items-center justify-center p-6 min-h-screen" style={{ background: 'linear-gradient(135deg, #fce7f3 0%, #fbcfe8 100%)' }}>
            {/* Home Link */}
            <Link
                to="/"
                className="fixed top-4 left-4 bg-rose-500 text-white px-4 py-2 rounded-full text-sm hover:bg-rose-600 transition shadow-lg z-50"
            >
                🏠 Home
            </Link>

            <div className="max-w-2xl w-full">
                {/* Admin Dashboard */}
                <div className="bg-white rounded-3xl shadow-2xl p-8">
                    <div className="text-center mb-6">
                        <div className="text-5xl mb-3">🎂</div>
                        <h1 className="text-2xl font-['Dancing_Script'] text-rose-500">Admin Dashboard</h1>
                    </div>

                     {/* Tabs */}
                      <div className="flex gap-2 mb-6 relative">
                          <button
                              onClick={() => { setActiveTab('orders'); loadUsers(); }}
                              className={`flex-1 py-3 rounded-xl font-semibold transition ${activeTab === 'orders'
                                  ? 'bg-rose-500 text-white'
                                  : 'bg-gray-100 text-gray-600'
                                  }`}
                          >
                              📋 Orders ({orders.length})
                          </button>
                          <button
                              onClick={() => { setActiveTab('users'); loadUsers(); }}
                              className={`flex-1 py-3 rounded-xl font-semibold transition ${activeTab === 'users'
                                  ? 'bg-rose-500 text-white'
                                  : 'bg-gray-100 text-gray-600'
                                  }`}
                          >
                              👥 Users ({users.length})
                          </button>
                          <button
                              onClick={() => setActiveTab('birthday')}
                              className={`flex-1 py-3 rounded-xl font-semibold transition ${activeTab === 'birthday'
                                  ? 'bg-rose-500 text-white'
                                  : 'bg-gray-100 text-gray-600'
                                  }`}
                          >
                              👑 Birthday Pages
                          </button>
                          <button
                              onClick={() => { setActiveTab('payments'); loadPendingPayments(); }}
                              className={`flex-1 py-3 rounded-xl font-semibold transition ${activeTab === 'payments'
                                  ? 'bg-green-500 text-white'
                                  : 'bg-gray-100 text-gray-600'
                                  }`}
                          >
                              💰 Payments {pendingPayments.length > 0 && `(${pendingPayments.length})`}
                          </button>
                          <button
                              onClick={() => { setActiveTab('upgrades'); loadUpgradeRequests(); }}
                              className={`flex-1 py-3 rounded-xl font-semibold transition ${activeTab === 'upgrades'
                                  ? 'bg-purple-500 text-white'
                                  : 'bg-gray-100 text-gray-600'
                                  }`}
                          >
                              ⬆️ Upgrades {upgradeRequests.filter(r => r.status === 'pending').length > 0 && `(${upgradeRequests.filter(r => r.status === 'pending').length})`}
                          </button>

                          {/* Notification Bell - Absolute positioned */}
                          <div className="absolute right-0 top-1/2 -translate-y-1/2">
                              <div className="relative">
                                  <button
                                      onClick={() => setShowNotifications(!showNotifications)}
                                      className="relative p-2 bg-gray-100 hover:bg-gray-200 rounded-full transition"
                                  >
                                      <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                                      </svg>
                                      {notifications.filter(n => !n.read).length > 0 && (
                                          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                                              {notifications.filter(n => !n.read).length}
                                          </span>
                                      )}
                                  </button>

                                  {/* Notifications Dropdown */}
                                  {showNotifications && (
                                      <div className="absolute right-0 mt-2 w-80 bg-white rounded-xl shadow-2xl border border-gray-200 max-h-96 overflow-y-auto z-50">
                                          <div className="p-4 border-b border-gray-100 flex justify-between items-center">
                                              <h3 className="font-bold text-gray-700">Notifications</h3>
                                              {notifications.filter(n => !n.read).length > 0 && (
                                                  <button
                                                      onClick={markAllRead}
                                                      className="text-xs text-blue-600 hover:text-blue-700 font-medium"
                                                  >
                                                      Mark all read
                                                  </button>
                                              )}
                                          </div>

                                          {notifications.length === 0 ? (
                                              <div className="p-6 text-center text-gray-500">
                                                  <div className="text-3xl mb-2">🔔</div>
                                                  <p>No notifications yet</p>
                                              </div>
                                          ) : (
                                              <div className="divide-y divide-gray-100">
                                                  {notifications.slice(0, 15).map(notification => (
                                                      <div
                                                          key={notification.id}
                                                          onClick={() => !notification.read && markNotificationRead(notification.id)}
                                                          className={`p-4 hover:bg-gray-50 cursor-pointer transition ${!notification.read ? 'bg-blue-50/50' : 'bg-white'}`}
                                                      >
                                                          <div className="flex items-start gap-3">
                                                              <div className="text-2xl flex-shrink-0">
                                                                  {notification.type === 'upgrade_pending' && '🚀'}
                                                                  {notification.type === 'upgrade_approved' && '✅'}
                                                                  {notification.type === 'upgrade_rejected' && '❌'}
                                                              </div>
                                                              <div className="flex-1 min-w-0">
                                                                  <p className="font-semibold text-gray-800 text-sm">{notification.title}</p>
                                                                  <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{notification.message}</p>
                                                                  <p className="text-xs text-gray-400 mt-1">
                                                                      {new Date(notification.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                                                  </p>
                                                              </div>
                                                              {!notification.read && (
                                                                  <div className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0 mt-2"></div>
                                                              )}
                                                          </div>
                                                      </div>
                                                  ))}
                                              </div>
                                          )}

                                          {notifications.length > 15 && (
                                              <div className="p-3 text-center border-t border-gray-100">
                                                  <p className="text-xs text-gray-500">
                                                      Showing 15 of {notifications.length} notifications
                                                  </p>
                                              </div>
                                          )}
                                      </div>
                                  )}
                              </div>
                          </div>
                      </div>

                    {/* Orders Tab */}
                    {activeTab === 'orders' && (
                        <div className="space-y-4">
                            {/* Orders Summary */}
                            <div className="bg-gradient-to-r from-rose-100 to-pink-100 p-4 rounded-xl">
                                <div className="flex justify-between items-center">
                                    <div>
                                        <span className="text-lg font-bold text-rose-600">📋 All Orders</span>
                                    </div>
                                    <div className="text-sm text-gray-600">
                                        Total: <span className="font-bold">{orders.length}</span> orders
                                    </div>
                                </div>
                            </div>

                            {/* Orders List - Grouped by User */}
                            {orders.length === 0 ? (
                                <div className="text-center py-8 text-gray-500">
                                    <p className="text-4xl mb-2">📦</p>
                                    <p>No orders yet</p>
                                </div>
                            ) : (
                                <div className="space-y-3 max-h-96 overflow-y-auto">
                                    {groupedOrders.map((group, groupIndex) => (
                                        <div key={groupIndex} className="bg-white border border-rose-100 rounded-xl overflow-hidden">
                                            {/* User Header - Clickable to expand */}
                                            <div
                                                onClick={() => setExpandedUser(expandedUser === group.giver ? null : group.giver)}
                                                className="bg-gradient-to-r from-rose-50 to-pink-50 p-4 cursor-pointer hover:from-rose-100 hover:to-pink-100 transition"
                                            >
                                                <div className="flex justify-between items-center">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-rose-400 to-pink-500 flex items-center justify-center text-white font-bold">
                                                            {group.giver.charAt(0).toUpperCase()}
                                                        </div>
                                                        <div>
                                                            <div className="font-bold text-rose-600">
                                                                {group.giver}
                                                            </div>
                                                            <div className="text-xs text-gray-500">
                                                                {group.total} loved ones • {group.paidCount} paid
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <span className={`px-2 py-1 rounded-full text-xs font-bold ${group.paidCount === group.total ? 'bg-green-100 text-green-600' : 'bg-yellow-100 text-yellow-600'}`}>
                                                            {group.paidCount}/{group.total} Paid
                                                        </span>
                                                        <span className="text-rose-400">
                                                            {expandedUser === group.giver ? '▼' : '▶'}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Expanded Orders List */}
                                            {expandedUser === group.giver && (
                                                <div className="p-3 space-y-2 bg-gray-50">
                                                    {group.orders.map((order, orderIndex) => (
                                                        <div key={orderIndex} className="bg-white p-3 rounded-lg border border-gray-100">
                                                            <div className="flex justify-between items-start">
                                                                <div className="flex-1">
                                                                    <div className="font-bold text-gray-700 flex items-center gap-2">
                                                                        <span className="text-lg">🎂</span>
                                                                        {order.recipient_name}
                                                                    </div>
                                                                    <div className="text-xs text-gray-500 mt-1">
                                                                        <span className="bg-gray-200 px-2 py-0.5 rounded font-mono">{order.code}</span>
                                                                        <span className="ml-2">{order.package}</span>
                                                                    </div>
                                                                    <div className="text-xs text-gray-500 mt-1">
                                                                        🎁 From: {order.giver_name || 'Anonymous'}
                                                                    </div>
                                                                    <div className="text-xs text-gray-500">
                                                                        📅 Birthday: {order.birthday_date || order.date_of_birth || 'Not set'}
                                                                    </div>
                                                                </div>
                                                                <div className="text-right">
                                                                    <span className={`inline-block px-2 py-1 rounded-full text-xs font-bold ${order.status === 'paid'
                                                                        ? 'bg-green-100 text-green-600'
                                                                        : 'bg-yellow-100 text-yellow-600'
                                                                        }`}>
                                                                        {order.status === 'paid' ? 'PAID' : 'PENDING'}
                                                                    </span>
                                                                    {order.status !== 'paid' && (
                                                                        <button
                                                                            onClick={() => markOrderPaid(order.code)}
                                                                            className="block mt-1 text-xs bg-green-500 text-white px-2 py-1 rounded w-full"
                                                                        >
                                                                            Mark Paid
                                                                        </button>
                                                                    )}
                                                                </div>
                                                            </div>
                                                            <div className="mt-2 flex gap-3 text-xs">
                                                                <div className="text-gray-500">
                                                                    📞 {order.giver_phone || 'No phone'}
                                                                </div>
                                                                <Link
                                                                    to={`/birthday/${order.code}`}
                                                                    className="text-rose-500 hover:text-rose-600"
                                                                >
                                                                    👁️ View
                                                                </Link>
                                                                <Link
                                                                    to={`/upload/${order.code}`}
                                                                    className="text-purple-500 hover:text-purple-600"
                                                                >
                                                                    📷 Photos
                                                                </Link>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {/* Users Tab - Super Admin */}
                    {activeTab === 'users' && (
                        <div className="space-y-4">
                            <div className="flex justify-between items-center mb-4">
                                <h3 className="font-bold text-gray-700">User Management</h3>
                                <button
                                    onClick={() => setShowUserModal(true)}
                                    className="bg-rose-500 text-white px-4 py-2 rounded-xl text-sm"
                                >
                                    + Add User
                                </button>
                            </div>

                            {users.length === 0 ? (
                                <div className="text-center py-8 text-gray-500">
                                    <p className="text-4xl mb-2">👥</p>
                                    <p>No users registered yet</p>
                                </div>
                            ) : (
                                <div className="space-y-3 max-h-80 overflow-y-auto">
                                    {users.map((user, index) => (
                                        <div key={index} className="bg-blue-50 p-4 rounded-xl">
                                            <div className="flex justify-between items-start">
                                                <div>
                                                    <div className="font-bold text-blue-600">
                                                        {user.name}
                                                    </div>
                                                    <div className="text-sm text-gray-600">
                                                        {user.email}
                                                    </div>
                                                    {user.phone && (
                                                        <div className="text-xs text-gray-500">
                                                            {user.phone}
                                                        </div>
                                                    )}
                                                </div>
                                                <span className={`px-2 py-1 rounded-full text-xs font-bold ${user.role === 'super_admin'
                                                    ? 'bg-purple-100 text-purple-600'
                                                    : user.role === 'admin'
                                                        ? 'bg-blue-100 text-blue-600'
                                                        : 'bg-gray-100 text-gray-600'
                                                    }`}>
                                                    {user.role === 'super_admin' ? 'Super Admin' : user.role === 'admin' ? 'Admin' : 'User'}
                                                </span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {/* Birthday Pages Tab */}
                    {activeTab === 'birthday' && (
                        <div className="space-y-4">
                            <div className="text-center mb-4">
                                <h2 className="text-xl font-bold text-gray-700">Birthday Pages Dashboard</h2>
                                <p className="text-gray-500">Manage birthday pages</p>
                            </div>
                            
                            <div className="space-y-4">
                                {orders.filter(o => o.package !== 'free').length === 0 ? (
                                    <div className="text-center py-8 text-gray-500">
                                        <p>No paid birthday pages yet</p>
                                    </div>
                                ) : (
                                    <div className="space-y-3">
                                        {orders.filter(o => o.package !== 'free').slice(0, 20).map((order, idx) => (
                                            <div key={idx} className="bg-white rounded-xl p-4 shadow">
                                                <div className="flex justify-between items-start">
                                                    <div>
                                                        <p className="font-semibold">{order.recipient_name || 'Unknown'}</p>
                                                        <p className="text-sm text-gray-500">Code: {order.code}</p>
                                                        <p className="text-sm text-gray-500">Package: {order.package}</p>
                                                        <p className="text-sm text-gray-500">Status: {order.status}</p>
                                                    </div>
                                                    <span className={`px-2 py-1 rounded text-xs ${order.status === 'paid' ? 'bg-green-100 text-green-600' : 'bg-yellow-100 text-yellow-600'}`}>
                                                        {order.status}
                                                    </span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                     {/* Upgrade Requests Tab */}
                     {activeTab === 'upgrades' && (
                         <div className="space-y-4">
                             <div className="text-center mb-4">
                                 <h2 className="text-xl font-bold text-gray-700">⬆️ Package Upgrade Requests</h2>
                                 <p className="text-gray-500">Review and approve user upgrades</p>
                             </div>

                             {upgradeRequests.length === 0 ? (
                                 <div className="bg-green-50 border border-green-200 rounded-xl p-6 text-center">
                                     <div className="text-4xl mb-2">✅</div>
                                     <p className="text-green-600 font-semibold">No pending upgrade requests!</p>
                                     <p className="text-green-500 text-sm">All upgrades have been processed</p>
                                 </div>
                             ) : (
                                 <div className="space-y-4">
                                     <div className="bg-purple-50 border border-purple-200 rounded-xl p-4 mb-4">
                                         <p className="text-purple-700 font-semibold">
                                             ⚠️ {upgradeRequests.filter(r => r.status === 'pending').length} upgrade request(s) awaiting review
                                         </p>
                                     </div>
                                     
                                     {upgradeRequests.map((request) => (
                                         <div key={request.id} className="bg-white rounded-xl p-4 shadow border-l-4 border-purple-400">
                                             <div className="flex justify-between items-start mb-3">
                                                 <div>
                                                     <p className="font-bold text-lg">{request.user_name || 'Unknown User'}</p>
                                                     <p className="text-gray-500 text-sm">{request.user_email}</p>
                                                 </div>
                                                 <span className={`px-3 py-1 rounded-full text-sm font-semibold ${
                                                     request.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                                                     request.status === 'approved' ? 'bg-green-100 text-green-700' :
                                                     'bg-red-100 text-red-700'
                                                 }`}>
                                                     {request.status.toUpperCase()}
                                                 </span>
                                             </div>
                                             
                                             <div className="grid grid-cols-2 gap-4 mb-3">
                                                 <div className="bg-purple-50 rounded-lg p-3">
                                                     <p className="text-xs text-gray-500 mb-1">Current Package</p>
                                                     <p className="font-bold text-purple-700 capitalize">
                                                         {request.from_package_tier || 'Free'}
                                                     </p>
                                                 </div>
                                                 <div className="bg-green-50 rounded-lg p-3">
                                                     <p className="text-xs text-gray-500 mb-1">Requested Package</p>
                                                     <p className="font-bold text-green-700 capitalize">
                                                         {request.to_package_tier}
                                                     </p>
                                                 </div>
                                             </div>

                                              <div className="bg-gray-50 rounded-lg p-3 mb-3">
                                                  <p className="text-sm text-gray-600">
                                                      <strong>💰 Amount Paid:</strong> GHS {request.amount_paid}
                                                  </p>
                                                  <p className="text-sm text-gray-600">
                                                      <strong>💳 Payment Method:</strong> {request.payment_method === 'momo' ? '📱 Mobile Money' : '🏦 Bank Transfer'}
                                                  </p>
                                                  {request.momo_number && (
                                                      <p className="text-sm text-gray-600">
                                                          <strong>📞 Momo Number:</strong> {request.momo_number}
                                                      </p>
                                                  )}
                                                  <p className="text-sm text-gray-600">
                                                      <strong>🧾 Transaction ID:</strong> {request.transaction_id}
                                                  </p>
                                                  {request.payment_reference_code && (
                                                      <div className="mt-2 bg-slate-900 text-slate-100 py-2 px-4 rounded text-center">
                                                          <p className="text-xs text-gray-300 mb-1">Payment Reference</p>
                                                          <p className="font-mono font-bold tracking-widest text-emerald-400 text-lg">
                                                              {request.payment_reference_code}
                                                          </p>
                                                      </div>
                                                  )}
                                                  {request.payment_proof_url && (
                                                      <p className="text-sm text-gray-600">
                                                          <strong>📎 Proof:</strong> <a href={request.payment_proof_url} target="_blank" rel="noreferrer" className="text-rose-500 hover:underline">View Proof</a>
                                                      </p>
                                                  )}
                                                  {request.notes && (
                                                      <p className="text-sm text-gray-600 mt-2">
                                                          <strong>📝 Notes:</strong> {request.notes}
                                                      </p>
                                                  )}
                                                  <p className="text-xs text-gray-400 mt-2">
                                                      Requested: {new Date(request.created_at).toLocaleString()}
                                                  </p>
                                              </div>

                                             {request.status === 'pending' && (
                                                 <div className="flex gap-3">
                                                     <button
                                                         onClick={() => approveUpgradeRequest(request.id)}
                                                         className="flex-1 bg-green-500 text-white py-2 px-4 rounded-lg font-semibold hover:bg-green-600 transition"
                                                     >
                                                         ✅ Approve & Activate
                                                     </button>
                                                     <button
                                                         onClick={() => rejectUpgradeRequest(request.id)}
                                                         className="flex-1 bg-red-500 text-white py-2 px-4 rounded-lg font-semibold hover:bg-red-600 transition"
                                                     >
                                                         ❌ Reject
                                                     </button>
                                                 </div>
                                             )}
                                         </div>
                                     ))}
                                 </div>
                             )}
                         </div>
                     )}

                    {/* Birthday Pages Tab */}
                    {activeTab === 'birthday' && (
                        <div className="space-y-4">
                            <div className="text-center mb-4">
                                <h2 className="text-xl font-bold text-gray-700">Birthday Pages Dashboard</h2>
                                <p className="text-gray-500">Manage birthday pages</p>
                            </div>
                            
                            <div className="space-y-4">
                                <Link
                                    to="/upload"
                                    className="block bg-gradient-to-r from-rose-100 to-pink-100 p-4 rounded-xl hover:shadow-md transition"
                                >
                                    <span className="text-2xl">📤</span>
                                    <span className="ml-3 font-semibold text-gray-700">Upload Photos</span>
                                </Link>

                                <Link
                                    to="/slideshow"
                                    className="block bg-gradient-to-r from-purple-100 to-violet-100 p-4 rounded-xl hover:shadow-md transition"
                                >
                                    <span className="text-2xl">🎬</span>
                                    <span className="ml-3 font-semibold text-gray-700">View Slideshow</span>
                                </Link>

                                <Link
                                    to="/locked"
                                    className="block bg-gradient-to-r from-amber-100 to-yellow-100 p-4 rounded-xl hover:shadow-md transition"
                                >
                                    <span className="text-2xl">🎁</span>
                                    <span className="ml-3 font-semibold text-gray-700">Birthday Page</span>
                                </Link>

                                <button
                                    onClick={clearAllPhotos}
                                    className="block w-full text-left bg-gradient-to-r from-red-100 to-pink-100 p-4 rounded-xl hover:shadow-md transition"
                                >
                                    <span className="text-2xl">🗑️</span>
                                    <span className="ml-3 font-semibold text-gray-700">Clear All Photos</span>
                                </button>
                            </div>
                        </div>
                    )}

                    <button
                        onClick={logout}
                        className="mt-6 w-full bg-gray-200 text-gray-600 py-3 rounded-xl font-semibold hover:bg-gray-300 transition"
                    >
                        Logout 🚪
                    </button>
                </div>

                {/* Photo Stats */}
                <div className="mt-6 bg-white rounded-3xl shadow-xl p-6">
                    <h3 className="font-bold text-gray-700 mb-4">📊 Statistics</h3>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="text-center p-4 bg-rose-50 rounded-xl">
                            <div className="text-3xl font-bold text-rose-500">{photoCount}</div>
                            <div className="text-gray-500 text-sm">Cloudinary Photos</div>
                        </div>
                        <div className="text-center p-4 bg-pink-50 rounded-xl">
                            <div className="text-3xl font-bold text-pink-500">{supabasePhotoCount}</div>
                            <div className="text-gray-500 text-sm">Supabase Photos</div>
                        </div>
                        <div className="text-center p-4 bg-pink-50 rounded-xl">
                            <div className="text-3xl font-bold text-pink-500">{viewerCount}</div>
                            <div className="text-gray-500 text-sm">Page Views</div>
                        </div>
                    </div>
                </div>

                {/* Share Section */}
                <div className="mt-6 bg-white rounded-3xl shadow-xl p-6">
                    <h3 className="font-bold text-gray-700 mb-4">📲 Share Birthday Page</h3>
                    <p className="text-gray-500 text-sm mb-4">Share this link with friends and family to let them upload photos!</p>
                    <div className="flex gap-2">
                        <input
                            type="text"
                            readOnly
                            value={shareLink}
                            className="flex-1 p-2 border-2 border-rose-200 rounded-xl text-sm bg-gray-50"
                        />
                        <button
                            onClick={copyShareLink}
                            className="bg-rose-500 text-white px-4 py-2 rounded-xl hover:bg-rose-600 transition"
                        >
                            Copy 📋
                        </button>
                    </div>
                    {copyStatus && (
                        <p className="text-green-500 text-sm mt-2">Link copied! ✅</p>
                    )}
                </div>

                {/* MoMo Number Section */}
                <div className="mt-6 bg-white rounded-3xl shadow-xl p-6">
                    <h3 className="font-bold text-gray-700 mb-4">💰 MoMo Number</h3>
                    <input
                        type="text"
                        value={momoNumber}
                        onChange={(e) => setMomoNumber(e.target.value)}
                        placeholder="Enter MoMo number (e.g., 0531114795)"
                        className="w-full p-3 border-2 border-rose-200 rounded-xl mb-3 focus:outline-none focus:border-rose-400"
                    />
                    <button
                        onClick={saveMomoNumber}
                        className="w-full bg-gradient-to-r from-green-500 to-emerald-500 text-white py-3 rounded-xl font-semibold hover:shadow-lg transition"
                    >
                        Save MoMo Number 💾
                    </button>
                    {momoStatus && (
                        <p className="text-green-500 text-sm mt-2 text-center">MoMo number saved! ✅</p>
                    )}
                </div>

                {/* View Gifts Section */}
                <div className="mt-6 bg-white rounded-3xl shadow-xl p-6">
                    <h3 className="font-bold text-gray-700 mb-4">🎁 View Gifts</h3>
                    <div className="space-y-3 max-h-60 overflow-y-auto">
                        {gifts.length === 0 ? (
                            <p className="text-gray-500 text-center">No gifts yet 🎁</p>
                        ) : (
                            gifts.slice().reverse().map((gift, i) => (
                                <div key={i} className="bg-rose-50 p-3 rounded-xl">
                                    <div className="font-bold text-rose-600">{gift.name}</div>
                                    <div className="text-gray-600 text-sm">{gift.message}</div>
                                    <div className="text-gray-400 text-xs mt-1">{new Date(gift.date).toLocaleDateString()}</div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>
        </div>
    )
}

export default Admin
