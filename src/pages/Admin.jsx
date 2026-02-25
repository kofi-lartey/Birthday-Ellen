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

    useEffect(() => {
        // Check if already logged in
        if (localStorage.getItem(STORAGE_KEYS.ADMIN_LOGGED_IN) === 'true') {
            setIsLoggedIn(true)
            updateStats()
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
            }
        } catch (err) {
            console.error('Error loading Supabase count:', err)
        }

        // Get MoMo number
        const momo = localStorage.getItem(STORAGE_KEYS.MOM0)
        if (momo) {
            setMomoNumber(momo)
        }

        // Get gifts
        const giftsData = JSON.parse(localStorage.getItem(STORAGE_KEYS.GIFTS) || '[]')
        setGifts(giftsData)
    }

    function handleLogin(e) {
        e.preventDefault()

        if (username.toLowerCase() === ADMIN_CREDENTIALS.username && password === ADMIN_CREDENTIALS.password) {
            localStorage.setItem(STORAGE_KEYS.ADMIN_LOGGED_IN, 'true')
            setIsLoggedIn(true)
            setError(false)
            updateStats()
        } else {
            setError(true)
            setTimeout(() => setError(false), 3000)
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

    function clearAllPhotos() {
        if (confirm('Are you sure you want to delete all uploaded photos? This cannot be undone!')) {
            localStorage.removeItem(STORAGE_KEYS.PHOTOS)
            localStorage.removeItem(STORAGE_KEYS.MESSAGES)
            updateStats()
            alert('All photos cleared!')
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
                            <p className="text-gray-400 mt-2">For Ellen Only 👑</p>
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
                {/* Admin Dashboard */}
                <div className="bg-white rounded-3xl shadow-2xl p-8">
                    <div className="text-center mb-8">
                        <div className="text-6xl mb-4">🎂</div>
                        <h1 className="text-3xl font-['Dancing_Script'] text-rose-500">Ellen's Birthday Dashboard</h1>
                        <p className="text-gray-400 mt-2">Welcome, Ellen! 👑</p>
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
                            to="/"
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
