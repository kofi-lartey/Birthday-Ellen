import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase, ADMIN_CREDENTIALS, STORAGE_KEYS } from '../supabase'

function Admin() {
    const navigate = useNavigate()
    const [isLoggedIn, setIsLoggedIn] = useState(false)
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
    const [activeTab, setActiveTab] = useState('orders') // 'orders', 'users', or 'birthday'
    const [users, setUsers] = useState([])
    const [showUserModal, setShowUserModal] = useState(false)
    const [newUserName, setNewUserName] = useState('')
    const [newUserEmail, setNewUserEmail] = useState('')
    const [newUserPassword, setNewUserPassword] = useState('')
    const [newUserRole, setNewUserRole] = useState('user')
    const [expandedUser, setExpandedUser] = useState(null)
    const [orders, setOrders] = useState([])

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
            updateStats()
            loadOrders()
        }

        // Set share link
        setShareLink(window.location.origin + '/upload')

        // Track views
        const views = parseInt(localStorage.getItem(STORAGE_KEYS.VIEWS) || '0')
        setViewerCount(views)
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
            console.log('Supabase not available')
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

    function handleLogin(e) {
        e.preventDefault()

        if (username.toLowerCase() === ADMIN_CREDENTIALS.username && password === ADMIN_CREDENTIALS.password) {
            localStorage.setItem(STORAGE_KEYS.ADMIN_LOGGED_IN, 'true')
            setIsLoggedIn(true)
            setError(false)
            updateStats()
            loadOrders()
            loadUsers()
        } else {
            // Check if user exists in database
            const users = JSON.parse(localStorage.getItem(STORAGE_KEYS.USERS) || '[]')
            const user = users.find(u =>
                (u.email === username.toLowerCase() || u.phone === username)
                && u.password === password
            )

            if (user && (user.role === 'admin' || user.role === 'super_admin')) {
                localStorage.setItem(STORAGE_KEYS.ADMIN_LOGGED_IN, 'true')
                localStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(user))
                setIsLoggedIn(true)
                setError(false)
                updateStats()
                loadOrders()
                loadUsers()
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
                    <div className="flex gap-2 mb-6">
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
