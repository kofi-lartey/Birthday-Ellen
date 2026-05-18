import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase, STORAGE_KEYS } from '../supabase'

function Dashboard() {
    const navigate = useNavigate()
    const [user, setUser] = useState(null)
    const [orders, setOrders] = useState([])
    const [showCreateModal, setShowCreateModal] = useState(false)
    const [showDetailsModal, setShowDetailsModal] = useState(false)
    const [selectedOrder, setSelectedOrder] = useState(null)
    const [selectedOrderForGift, setSelectedOrderForGift] = useState(null)
    const [showGiftOptions, setShowGiftOptions] = useState(false)
    const [recipientName, setRecipientName] = useState('')
    const [eventDate, setEventDate] = useState('')
    const [selectedPackage, setSelectedPackage] = useState('free')
    const [pageType, setPageType] = useState('birthday')
    const [paymentPending, setPaymentPending] = useState(false)
    const [pendingUpgrade, setPendingUpgrade] = useState(null)
    const [shareNotification, setShareNotification] = useState({ show: false, message: '', type: '', eventId: null })
    const [showShareModal, setShowShareModal] = useState(false)
    const [shareOrder, setShareOrder] = useState(null)
    const [isRefreshing, setIsRefreshing] = useState(false)

    const logout = () => {
        localStorage.removeItem(STORAGE_KEYS.CURRENT_USER)
        supabase.auth.signOut().catch(() => { })
        navigate('/login')
    }

    // WhatsApp share function
    const shareToWhatsApp = (orderCode, recipientName, linkType = 'upload') => {
        let url = ''
        let message = ''

        if (linkType === 'upload') {
            url = `${window.location.origin}/upload/${orderCode}`
            message = `🎉 *${recipientName}'s Celebration* 🎉\n\n📸 Share your photos and messages for ${recipientName}!\n\nClick here to upload: ${url}\n\n✨ Add your love and wishes to make this celebration special! ✨`
        } else {
            url = `${window.location.origin}/event/${orderCode}`
            message = `🎉 *${recipientName}'s Celebration* 🎉\n\nJoin the celebration and see all the wonderful messages and photos!\n\nView the celebration page: ${url}\n\n💕 Let's make ${recipientName} feel special! 💕`
        }

        const encodedMessage = encodeURIComponent(message)
        const whatsappUrl = `https://wa.me/?text=${encodedMessage}`
        window.open(whatsappUrl, '_blank')
    }

    // Copy link function
    async function copyLink(orderCode, linkType, recipientName) {
        let url = ''
        let message = ''

        if (linkType === 'upload') {
            url = `${window.location.origin}/upload/${orderCode}`
            message = `📸 Upload link for "${recipientName}" copied! Share this link so others can upload photos and messages.`
        } else {
            url = `${window.location.origin}/event/${orderCode}`
            message = `🎉 Event page link for "${recipientName}" copied!`
        }

        try {
            await navigator.clipboard.writeText(url)
            setShareNotification({
                show: true,
                message: message,
                type: linkType,
                eventId: orderCode
            })
            setTimeout(() => {
                setShareNotification({ show: false, message: '', type: '', eventId: null })
            }, 3000)
        } catch (err) {
            alert('Failed to copy link. Please copy manually: ' + url)
        }
    }

    // Open share modal
    function openShareModal(order) {
        setShareOrder(order)
        setShowShareModal(true)
    }

    // Refresh user data from Supabase
    async function refreshUserFromSupabase(userId) {
        setIsRefreshing(true)
        try {
            const { data, error } = await supabase
                .from('users')
                .select('*')
                .eq('id', userId)
                .single()

            if (data && !error) {
                console.log('Dashboard - Refreshed user from Supabase:', data)
                localStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(data))
                setUser(data)

                // Update pending upgrade state based on fresh data
                if (data.package_pending && data.payment_status === 'pending') {
                    setPendingUpgrade({
                        to_package_tier: data.package_pending,
                        payment_status: data.payment_status
                    })
                    setPaymentPending(true)
                } else {
                    setPendingUpgrade(null)
                    setPaymentPending(false)
                }

                return data
            }
        } catch (err) {
            console.log('Error refreshing user from Supabase:', err)
        } finally {
            setIsRefreshing(false)
        }
        return null
    }

    // Polling effect - checks for package updates every 30 seconds
    useEffect(() => {
        if (!user?.id) return

        const interval = setInterval(async () => {
            const { data: freshUser } = await supabase
                .from('users')
                .select('*')
                .eq('id', user.id)
                .single()

            if (freshUser) {
                const packageChanged = freshUser.package_tier !== user.package_tier
                const pendingCleared = user.package_pending && !freshUser.package_pending

                if (packageChanged || pendingCleared) {
                    localStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(freshUser))
                    setUser(freshUser)

                    if (freshUser.package_pending && freshUser.payment_status === 'pending') {
                        setPendingUpgrade({
                            to_package_tier: freshUser.package_pending,
                            payment_status: freshUser.payment_status
                        })
                        setPaymentPending(true)
                    } else {
                        setPendingUpgrade(null)
                        setPaymentPending(false)
                    }

                    if (packageChanged && freshUser.package_tier !== 'free') {
                        setShareNotification({
                            show: true,
                            message: `🎉 Congratulations! Your package has been upgraded to ${freshUser.package_tier?.toUpperCase()}! 🎉`,
                            type: 'upgrade',
                            eventId: null
                        })
                        setTimeout(() => {
                            setShareNotification({ show: false, message: '', type: '', eventId: null })
                        }, 5000)
                    }
                }
            }
        }, 30000)

        return () => clearInterval(interval)
    }, [user?.id])

    // Update pendingUpgrade when user changes
    useEffect(() => {
        if (user) {
            if (user.package_pending && user.payment_status === 'pending') {
                setPendingUpgrade({
                    to_package_tier: user.package_pending,
                    payment_status: user.payment_status
                })
                setPaymentPending(true)
            } else {
                setPendingUpgrade(null)
                setPaymentPending(false)
            }
        }
    }, [user])

    // Initial load
    useEffect(() => {
        const loadUser = async () => {
            const currentUser = JSON.parse(localStorage.getItem(STORAGE_KEYS.CURRENT_USER) || 'null')

            if (!currentUser) {
                navigate('/login')
                return
            }

            if (!currentUser.package_tier) {
                navigate('/select-package')
                return
            }

            const freshUser = await refreshUserFromSupabase(currentUser.id)

            if (!freshUser) {
                setUser(currentUser)
                if (currentUser.package_pending && currentUser.payment_status === 'pending') {
                    setPendingUpgrade({
                        to_package_tier: currentUser.package_pending,
                        payment_status: currentUser.payment_status
                    })
                    setPaymentPending(true)
                }
            }

            await loadEventsFromRegistry(currentUser.id)
        }

        loadUser()
    }, [navigate])

    // MAIN LOAD FUNCTION - Reads ONLY from event_registry
    async function loadEventsFromRegistry(userId) {
        try {
            console.log('Loading events for user:', userId);

            const { data: registryData, error: registryError } = await supabase
                .from('event_registry')
                .select('*')
                .eq('user_id', userId)
                .order('created_at', { ascending: false });

            if (registryError) {
                console.error('Error loading registry:', registryError);
                return;
            }

            if (!registryData || registryData.length === 0) {
                setOrders([]);
                return;
            }

            const convertedOrders = registryData.map(registry => {
                let parsedPhotos = [];
                if (registry.photos) {
                    try {
                        if (Array.isArray(registry.photos)) {
                            parsedPhotos = registry.photos;
                        } else if (typeof registry.photos === 'string' && registry.photos !== 'null' && registry.photos !== '') {
                            parsedPhotos = JSON.parse(registry.photos);
                        }
                    } catch (e) {
                        parsedPhotos = [];
                    }
                }

                return {
                    id: registry.id,
                    registryId: registry.id,
                    eventType: registry.event_type,
                    eventId: registry.event_id,
                    recipientName: registry.event_name,
                    eventDate: registry.event_date,
                    code: registry.code,
                    package: registry.package || 'free',
                    status: registry.status || 'active',
                    isPublic: registry.is_public || false,
                    createdAt: registry.created_at,
                    details: {
                        backgroundImage: registry.background_image,
                        heartMessage: registry.heart_message,
                        dateOfBirth: registry.date_of_birth,
                        letter: registry.letter,
                        nickname: registry.nickname,
                        audioUrl: registry.audio_url,
                        photos: parsedPhotos,
                        couple_names: registry.couple_names,
                        wedding_date: registry.wedding_date,
                        venue: registry.venue,
                        theme: registry.theme,
                        dress_code: registry.dress_code,
                        guest_count: registry.guest_count
                    },
                    hasDetails: !!(registry.background_image || registry.letter || registry.couple_names)
                };
            });

            console.log('Converted orders with codes:', convertedOrders.map(o => ({ name: o.recipientName, code: o.code })));
            setOrders(convertedOrders);
            localStorage.setItem(STORAGE_KEYS.ORDERS, JSON.stringify(convertedOrders));

        } catch (err) {
            console.error('Error loading from Supabase:', err);
        }
    }

    async function syncToSupabase() {
        const allOrders = JSON.parse(localStorage.getItem(STORAGE_KEYS.ORDERS) || '[]')
        let synced = 0
        let failed = 0

        for (const order of allOrders) {
            try {
                const { error } = await supabase
                    .from('event_registry')
                    .upsert({
                        id: order.registryId,
                        user_id: user?.id,
                        event_type: order.eventType,
                        event_name: order.recipientName,
                        event_date: order.eventDate,
                        event_id: order.eventId,
                        code: order.code,
                        package: order.package || 'free',
                        status: order.status || 'active',
                        is_public: order.isPublic || false,
                        background_image: order.details?.backgroundImage,
                        heart_message: order.details?.heartMessage,
                        date_of_birth: order.details?.dateOfBirth,
                        letter: order.details?.letter,
                        nickname: order.details?.nickname,
                        audio_url: order.details?.audioUrl,
                        photos: order.details?.photos ? JSON.stringify(order.details.photos) : null,
                        updated_at: new Date().toISOString()
                    }, { onConflict: 'id' })

                if (error) {
                    console.log('Failed to sync order', order.code, error.message)
                    failed++
                } else {
                    synced++
                }
            } catch (err) {
                console.log('Error syncing order', order.code, err)
                failed++
            }
        }

        alert(`Synced ${synced} events to Supabase. ${failed} failed.`)
        loadEventsFromRegistry(user?.id)
    }

    function generateCode() {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
        let code = ''
        for (let i = 0; i < 6; i++) {
            code += chars.charAt(Math.floor(Math.random() * chars.length))
        }
        return code
    }

    async function createEventPage() {
        if (!recipientName.trim() || !eventDate) {
            alert('Please fill in all fields')
            return
        }

        const userTier = user?.package_tier || 'free'

        const allowedPageTypes = {
            free: ['birthday'],
            basic: ['birthday', 'wedding', 'hangout'],
            premium: ['birthday', 'wedding', 'anniversary', 'graduation', 'party'],
            enterprise: ['birthday', 'wedding', 'anniversary', 'graduation', 'custom', 'party', 'hangout']
        }

        if (!allowedPageTypes[userTier]?.includes(pageType)) {
            alert(`Your current package (${userTier}) does not allow creating ${pageType} pages. Please upgrade your package.`)
            navigate('/select-package?upgrade=true')
            return
        }

        const maxPagesPerTier = {
            free: 1,
            basic: 3,
            premium: 10,
            enterprise: 999999
        }
        const maxPages = maxPagesPerTier[userTier] || 1

        const userEvents = orders.filter(order => order.userId === user?.id || order.user_id === user?.id)
        if (userEvents.length >= maxPages) {
            alert(`Your current package (${userTier}) allows only ${maxPages} event(s). Please upgrade to create more events.`)
            navigate('/select-package?upgrade=true')
            return
        }

        const code = generateCode()

        if (pageType === 'birthday') {
            const { error: registryError } = await supabase
                .from('event_registry')
                .insert({
                    user_id: user?.id,
                    event_type: pageType,
                    event_name: recipientName.trim(),
                    event_date: eventDate,
                    code: code,
                    package: user?.package_tier || 'free',
                    status: 'active',
                    is_public: false,
                    featured: false,
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString()
                })

            if (registryError) {
                console.error('Failed to create event:', registryError)
                alert(`Failed to create event: ${registryError.message}`)
                return
            }

            alert(`Event created! Code: ${code}\n\nShare this link:\n${window.location.origin}/event/${code}`)
            setShowCreateModal(false)
            setRecipientName('')
            setEventDate('')
            setPageType('birthday')
            loadEventsFromRegistry(user?.id)
            return
        }

        // For non-birthday events (keep your existing logic)
        alert('Non-birthday events coming soon!')
    }

    if (!user) return null

    return (
        <div className="min-h-screen" style={{ background: 'linear-gradient(135deg, #fce7f3 0%, #fbcfe8 100%)' }}>
            {/* Payment Pending Warning - Upgrade Request */}
            {pendingUpgrade && (
                <div className="bg-purple-50 border-b-2 border-purple-400 p-3 md:p-4 fixed top-0 left-0 right-0 z-40">
                    <div className="max-w-4xl mx-auto">
                        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-2 md:gap-4">
                            <div className="flex items-center gap-2 md:gap-3">
                                <span className="text-xl md:text-2xl">⏳</span>
                                <div>
                                    <p className="font-bold text-purple-800 text-sm md:text-base">
                                        Upgrade Requested: {pendingUpgrade.to_package_tier?.toUpperCase()}
                                    </p>
                                    <p className="text-xs md:text-sm text-purple-700">
                                        Your upgrade is under review. You'll have access to all {pendingUpgrade.to_package_tier} features once confirmed.
                                    </p>
                                </div>
                            </div>
                            <div className="flex gap-2">
                                <button
                                    onClick={async () => {
                                        await refreshUserFromSupabase(user?.id)
                                        setShareNotification({
                                            show: true,
                                            message: "Checking for updates...",
                                            type: 'refresh',
                                            eventId: null
                                        })
                                        setTimeout(() => {
                                            setShareNotification({ show: false, message: '', type: '', eventId: null })
                                        }, 2000)
                                    }}
                                    disabled={isRefreshing}
                                    className="px-3 md:px-4 py-1.5 md:py-2 bg-purple-500 text-white rounded-lg font-semibold hover:bg-purple-600 transition text-sm whitespace-nowrap disabled:opacity-50"
                                >
                                    {isRefreshing ? 'Checking...' : '🔄 Check Status'}
                                </button>
                                <button
                                    onClick={() => window.location.reload()}
                                    className="px-3 md:px-4 py-1.5 md:py-2 bg-blue-500 text-white rounded-lg font-semibold hover:bg-blue-600 transition text-sm whitespace-nowrap"
                                >
                                    🔄 Refresh Page
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Header */}
            <div className={`fixed left-0 right-0 bg-white/80 backdrop-blur-md shadow-sm z-40 ${pendingUpgrade ? 'top-[72px] md:top-[72px]' : 'top-0'}`}>
                <div className="max-w-4xl mx-auto px-4 py-3 flex justify-between items-center">
                    <div className="flex items-center gap-3">
                        <button onClick={() => navigate('/')} className="text-rose-500 hover:text-rose-600">
                            ←
                        </button>
                        <h1 className="text-xl font-['Dancing_Script'] text-rose-500">💕 My Dashboard</h1>
                    </div>
                    <div className="flex items-center gap-2 md:gap-4">
                        {user?.package_tier && (
                            <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold 
                                ${user.package_tier === 'premium' ? 'bg-gradient-to-r from-rose-500 to-pink-500 text-white' :
                                    user.package_tier === 'enterprise' ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white' :
                                        user.package_tier === 'basic' ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-700'}`}>
                                <span>{user.package_name || user.package_tier?.toUpperCase()}</span>
                            </div>
                        )}
                        {user?.package_tier && user?.package_tier !== 'enterprise' && !pendingUpgrade && (
                            <button
                                onClick={() => navigate('/select-package?upgrade=true')}
                                className="text-[10px] bg-rose-500 text-white px-2 py-1 rounded-full hover:bg-rose-600 transition whitespace-nowrap"
                            >
                                Upgrade
                            </button>
                        )}
                        <button onClick={logout} className="text-rose-500 text-sm">Logout</button>
                    </div>
                </div>
            </div>

            {/* Share Notification */}
            {shareNotification.show && (
                <div className="fixed top-20 left-1/2 transform -translate-x-1/2 z-50 animate-bounce">
                    <div className={`px-6 py-3 rounded-full shadow-lg flex items-center gap-2 ${shareNotification.type === 'upgrade' ? 'bg-green-500' : 'bg-blue-500'
                        } text-white`}>
                        <span>{shareNotification.type === 'upgrade' ? '🎉' : '✅'}</span>
                        <span className="text-sm">{shareNotification.message}</span>
                    </div>
                </div>
            )}

            <div className={`px-4 pb-8 max-w-4xl mx-auto ${pendingUpgrade ? 'pt-28' : 'pt-20'}`}>
                {/* Welcome */}
                <div className="bg-white rounded-3xl shadow-xl p-6 mb-6">
                    <div className="flex items-center gap-4">
                        <div className="text-5xl">👋</div>
                        <div>
                            <h2 className="text-xl font-bold text-gray-700">Welcome, {user.name}!</h2>
                            <p className="text-gray-500">{user.email}</p>
                        </div>
                    </div>
                </div>

                {/* Create New Button */}
                <button
                    onClick={() => navigate('/create-event')}
                    className="w-full bg-gradient-to-r from-rose-500 to-pink-500 text-white py-4 rounded-xl font-semibold text-lg mb-3 hover:shadow-lg transition"
                >
                    + Create New Event Page
                </button>

                {/* Sync to Supabase Button */}
                <button
                    onClick={syncToSupabase}
                    className="w-full bg-gradient-to-r from-blue-500 to-indigo-500 text-white py-3 rounded-xl font-semibold mb-6 hover:shadow-lg transition"
                >
                    🔄 Sync to Cloud (Supabase)
                </button>

                {/* My Loved Ones - Grid Layout */}
                <div className="bg-white rounded-3xl shadow-xl p-6">
                    <h3 className="text-xl font-bold text-gray-700 mb-4">My Loved Ones</h3>

                    {orders.length === 0 ? (
                        <div className="text-center py-8 text-gray-500">
                            <p className="text-4xl mb-2">🎂</p>
                            <p>You haven't added any loved ones yet</p>
                            <p className="text-sm mt-2">Create a birthday page for your loved ones...</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            {orders.map((order, index) => (
                                <div key={index} className="bg-gradient-to-br from-rose-50 to-pink-50 p-5 rounded-2xl border border-rose-100 hover:shadow-lg transition-all">
                                    <div className="flex items-start gap-4">
                                        <div className="w-14 h-14 rounded-full bg-gradient-to-br from-rose-400 to-pink-500 flex items-center justify-center text-white text-xl font-bold shadow-md">
                                            {order.recipientName?.charAt(0).toUpperCase() || '?'}
                                        </div>
                                        <div className="flex-1">
                                            <div className="font-bold text-rose-600 text-lg">
                                                {order.recipientName}
                                            </div>
                                            <div className="text-gray-600 text-sm flex items-center gap-1">
                                                📅 {order.eventDate ? new Date(order.eventDate).toLocaleDateString() : 'Date not set'}
                                            </div>
                                            {order.code && (
                                                <div className="text-sm mt-1">
                                                    <span className="bg-rose-200 text-rose-700 px-2 py-1 rounded text-xs font-bold">
                                                        {order.code}
                                                    </span>
                                                </div>
                                            )}
                                        </div>
                                        <div>
                                            <span className={`px-2 py-1 rounded-full text-xs font-bold ${order.status === 'active' || order.status === 'paid' ? 'bg-green-100 text-green-600' : 'bg-yellow-100 text-yellow-600'
                                                }`}>
                                                {order.status === 'active' || order.status === 'paid' ? 'Active' : 'Pending'}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Action Buttons */}
                                    <div className="mt-4 space-y-2">
                                        <div className="flex gap-2">
                                            <Link
                                                to={`/event/${order.code}`}
                                                className="flex-1 text-center text-[10px] sm:text-xs bg-rose-500 text-white px-2 sm:px-3 py-1.5 sm:py-2 rounded-full hover:bg-rose-600 transition"
                                            >
                                                👁️ View
                                            </Link>
                                            <Link
                                                to={`/upload/${order.code}`}
                                                className="flex-1 text-center text-[10px] sm:text-xs bg-purple-500 text-white px-2 sm:px-3 py-1.5 sm:py-2 rounded-full hover:bg-purple-600 transition"
                                            >
                                                📷 Upload
                                            </Link>
                                            <Link
                                                to={`/slideshow/${order.code}`}
                                                className="flex-1 text-center text-[10px] sm:text-xs bg-blue-500 text-white px-2 sm:px-3 py-1.5 sm:py-2 rounded-full hover:bg-blue-600 transition"
                                            >
                                                🎬 Slideshow
                                            </Link>
                                        </div>

                                        <div className="flex gap-2">
                                            <button
                                                onClick={() => openShareModal(order)}
                                                className="flex-1 text-center text-[10px] sm:text-xs bg-green-500 text-white px-2 sm:px-3 py-1.5 sm:py-2 rounded-full hover:bg-green-600 transition flex items-center justify-center gap-1"
                                            >
                                                <span>📤</span> Share
                                            </button>
                                            <button
                                                onClick={() => shareToWhatsApp(order.code, order.recipientName, 'upload')}
                                                className="flex-1 text-center text-[10px] sm:text-xs bg-[#25D366] text-white px-2 sm:px-3 py-1.5 sm:py-2 rounded-full hover:bg-[#20bd59] transition flex items-center justify-center gap-1"
                                            >
                                                <span>💚</span> WhatsApp
                                            </button>
                                        </div>

                                        <div className="flex gap-2">
                                            <Link
                                                to={`/edit-event/${order.code || order.id}`}
                                                className="flex-1 text-center text-[10px] sm:text-xs bg-amber-500 text-white px-2 sm:px-3 py-1.5 sm:py-2 rounded-full hover:bg-amber-600 transition"
                                            >
                                                ✏️ {order.hasDetails ? 'Edit' : 'Add Details'}
                                            </Link>
                                            {order.code && (
                                                <button
                                                    onClick={() => {
                                                        setSelectedOrderForGift(order);
                                                        setShowGiftOptions(true);
                                                    }}
                                                    className="flex-1 text-center text-[10px] sm:text-xs bg-yellow-500 text-white px-2 sm:px-3 py-1.5 sm:py-2 rounded-full hover:bg-yellow-600 transition"
                                                >
                                                    🎁 Gift
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Share Modal */}
            {showShareModal && shareOrder && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4">
                    <div className="bg-white rounded-3xl p-6 max-w-md w-full">
                        <div className="text-center mb-4">
                            <div className="text-5xl mb-2">📤</div>
                            <h3 className="text-xl font-bold text-gray-700">Share {shareOrder.recipientName}'s Celebration</h3>
                            <p className="text-gray-500 text-sm mt-1">Choose how to share</p>
                        </div>

                        <div className="space-y-3">
                            <button
                                onClick={() => {
                                    shareToWhatsApp(shareOrder.code, shareOrder.recipientName, 'upload')
                                    setShowShareModal(false)
                                }}
                                className="w-full bg-[#25D366] text-white rounded-xl p-4 hover:bg-[#20bd59] transition flex items-center gap-4"
                            >
                                <div className="text-3xl">💚</div>
                                <div className="flex-1 text-left">
                                    <div className="font-bold">Share Upload Link on WhatsApp</div>
                                    <div className="text-xs opacity-90">Let friends upload photos & messages</div>
                                </div>
                                <div>→</div>
                            </button>

                            <button
                                onClick={() => {
                                    shareToWhatsApp(shareOrder.code, shareOrder.recipientName, 'event')
                                    setShowShareModal(false)
                                }}
                                className="w-full bg-[#25D366] text-white rounded-xl p-4 hover:bg-[#20bd59] transition flex items-center gap-4"
                            >
                                <div className="text-3xl">🎉</div>
                                <div className="flex-1 text-left">
                                    <div className="font-bold">Share Event Page on WhatsApp</div>
                                    <div className="text-xs opacity-90">Share the celebration slideshow</div>
                                </div>
                                <div>→</div>
                            </button>

                            <button
                                onClick={() => {
                                    copyLink(shareOrder.code, 'upload', shareOrder.recipientName)
                                    setShowShareModal(false)
                                }}
                                className="w-full bg-purple-500 text-white rounded-xl p-4 hover:bg-purple-600 transition flex items-center gap-4"
                            >
                                <div className="text-3xl">📋</div>
                                <div className="flex-1 text-left">
                                    <div className="font-bold">Copy Upload Link</div>
                                    <div className="text-xs opacity-90">Share anywhere</div>
                                </div>
                                <div>→</div>
                            </button>

                            <button
                                onClick={() => {
                                    copyLink(shareOrder.code, 'event', shareOrder.recipientName)
                                    setShowShareModal(false)
                                }}
                                className="w-full bg-teal-500 text-white rounded-xl p-4 hover:bg-teal-600 transition flex items-center gap-4"
                            >
                                <div className="text-3xl">📋</div>
                                <div className="flex-1 text-left">
                                    <div className="font-bold">Copy Event Link</div>
                                    <div className="text-xs opacity-90">Share anywhere</div>
                                </div>
                                <div>→</div>
                            </button>
                        </div>

                        <div className="mt-6 text-center">
                            <button
                                onClick={() => setShowShareModal(false)}
                                className="bg-gray-100 text-gray-600 px-6 py-2 rounded-xl font-semibold hover:bg-gray-200 transition"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Gift Options Modal */}
            {showGiftOptions && selectedOrderForGift && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4">
                    <div className="bg-white rounded-3xl p-6 max-w-md w-full">
                        <h3 className="text-xl font-bold text-gray-700 mb-2 text-center">
                            🎁 Send a Gift
                        </h3>
                        <p className="text-center text-gray-500 text-sm mb-6">
                            Choose how you'd like to gift {selectedOrderForGift.recipientName}
                        </p>

                        <div className="space-y-4">
                            <button
                                onClick={() => {
                                    navigate(`/gift/${selectedOrderForGift.code}?type=code&recipient=${encodeURIComponent(selectedOrderForGift.recipientName)}`);
                                    setShowGiftOptions(false);
                                }}
                                className="w-full bg-white rounded-xl p-4 border-2 border-rose-100 hover:shadow-lg transition-all hover:border-rose-300 text-left flex items-center gap-4"
                            >
                                <div className="text-4xl">🔑</div>
                                <div className="flex-1">
                                    <h4 className="font-bold text-gray-800 text-lg">Send a Code</h4>
                                    <p className="text-gray-500 text-sm">Gift a special code for exclusive rewards!</p>
                                </div>
                                <div className="text-gray-400">→</div>
                            </button>

                            <button
                                onClick={() => {
                                    navigate(`/gift/${selectedOrderForGift.code}?type=scratch&recipient=${encodeURIComponent(selectedOrderForGift.recipientName)}`);
                                    setShowGiftOptions(false);
                                }}
                                className="w-full bg-white rounded-xl p-4 border-2 border-rose-100 hover:shadow-lg transition-all hover:border-rose-300 text-left flex items-center gap-4"
                            >
                                <div className="text-4xl">💳</div>
                                <div className="flex-1">
                                    <h4 className="font-bold text-gray-800 text-lg">Scratch Card</h4>
                                    <p className="text-gray-500 text-sm">Send a surprise scratch card with cash prize!</p>
                                </div>
                                <div className="text-gray-400">→</div>
                            </button>

                            <button
                                onClick={() => {
                                    navigate(`/gift/${selectedOrderForGift.code}?type=products&recipient=${encodeURIComponent(selectedOrderForGift.recipientName)}`);
                                    setShowGiftOptions(false);
                                }}
                                className="w-full bg-white rounded-xl p-4 border-2 border-rose-100 hover:shadow-lg transition-all hover:border-rose-300 text-left flex items-center gap-4"
                            >
                                <div className="text-4xl">📦</div>
                                <div className="flex-1">
                                    <h4 className="font-bold text-gray-800 text-lg">Order Products</h4>
                                    <p className="text-gray-500 text-sm">Deliver surprise gifts right to their door! (Food package, Fabrics, etc.)</p>
                                </div>
                                <div className="text-gray-400">→</div>
                            </button>
                        </div>

                        <div className="mt-6 text-center">
                            <button
                                onClick={() => setShowGiftOptions(false)}
                                className="bg-gray-100 text-gray-600 px-6 py-2 rounded-xl font-semibold hover:bg-gray-200 transition"
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}

export default Dashboard