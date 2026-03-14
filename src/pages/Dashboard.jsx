import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase, STORAGE_KEYS } from '../supabase'
import { usePackage, DEFAULT_PACKAGES } from '../hooks/usePackage.jsx'

function Dashboard() {
    const navigate = useNavigate()
    const [user, setUser] = useState(null)
    const [orders, setOrders] = useState([])
    const [showCreateModal, setShowCreateModal] = useState(false)
    const [showDetailsModal, setShowDetailsModal] = useState(false)
    const [selectedOrder, setSelectedOrder] = useState(null)
    const [recipientName, setRecipientName] = useState('')
    const [birthdayDate, setBirthdayDate] = useState('')
    const [selectedPackage, setSelectedPackage] = useState('free')
    const [pageType, setPageType] = useState('birthday')
    const [paymentPending, setPaymentPending] = useState(false)

    // Helper to check if premium features are unlocked
    const hasFeatureAccess = (tier) => {
        if (!tier || tier === 'free') return false
        // Check if payment is confirmed
        if (user?.payment_status !== 'confirmed') return false
        return true
    }

    // Birthday Details state
    const [birthdayDetails, setBirthdayDetails] = useState({
        backgroundImage: '',
        heartMessage: 'My heart belongs to you',
        dateOfBirth: '',
        letter: '',
        nickname: '',
        audioUrl: '',
        photos: []
    })
    const [showShareLink, setShowShareLink] = useState(false)
    const [shareLinkCopied, setShareLinkCopied] = useState(false)

    useEffect(() => {
        // Load orders whenever component mounts or user changes
        const currentUser = JSON.parse(localStorage.getItem(STORAGE_KEYS.CURRENT_USER) || 'null')
        if (!currentUser) {
            navigate('/login')
            return
        }
        
        // Check if user has selected a package - redirect if not
        if (!currentUser.package_tier) {
            navigate('/select-package')
            return
        }
        
        // Check if payment is confirmed for paid packages
        // Only show pending if payment_status is explicitly 'pending' (new selections awaiting confirmation)
        // Existing users without payment_status are assumed to be confirmed
        const paymentStatus = currentUser.payment_status
        if (currentUser.package_tier !== 'free' && paymentStatus === 'pending') {
            // User has a paid package but payment not confirmed - show pending state
            setPaymentPending(true)
        }
        
        setUser(currentUser)

        // Load user's orders
        loadUserOrders(currentUser)
    }, [navigate])

    function loadUserOrders(userOrId) {
        const userId = typeof userOrId === 'object' ? userOrId.id : userOrId
        
        // Load orders from localStorage and filter by user
        const allOrders = JSON.parse(localStorage.getItem(STORAGE_KEYS.ORDERS) || '[]')
        console.log('=== Loading all orders from localStorage:', allOrders.length)
        
        // Filter localStorage orders by userId
        const filteredLocalOrders = allOrders.filter(order =>
            !order.userId || // Orders without user_id
            order.userId === userId || // Orders created by this user
            (order.giverPhone && user && order.giverPhone === user.phone) // Match by phone
        )
        console.log('=== Filtered local orders:', filteredLocalOrders.length)
        setOrders(filteredLocalOrders)

        // Also try to load from Supabase
        loadFromSupabase(userId)
    }

    async function loadFromSupabase(userId) {
        try {
            // DEBUG: Log the current user ID
            console.log('=== DEBUG: Current user ID:', userId)
            console.log('=== DEBUG: Current user:', user)

            const { data, error } = await supabase
                .from('orders')
                .select('*')

            if (data && data.length > 0) {
                console.log('Loaded orders from Supabase:', data)

                // Convert Supabase format to localStorage format
                const convertedOrders = data.map(order => ({
                    id: order.id,
                    userId: order.user_id,
                    code: order.code,
                    recipientName: order.recipient_name,
                    birthdayDate: order.birthday_date,
                    dateOfBirth: order.date_of_birth,
                    giverName: order.giver_name,
                    giverPhone: order.giver_phone,
                    package: order.package,
                    status: order.status,
                    price: order.price,
                    backgroundImage: order.background_image,
                    heartMessage: order.heart_message,
                    letter: order.letter,
                    nickname: order.nickname,
                    audioUrl: order.audio_url,
                    photos: order.photos,
                    createdAt: order.created_at
                }))

                // Update localStorage with Supabase data
                localStorage.setItem(STORAGE_KEYS.ORDERS, JSON.stringify(convertedOrders))

                // DEBUG: Log converted orders
                console.log('=== DEBUG: Converted orders:', convertedOrders)
                console.log('=== DEBUG: Checking filter - userId:', userId)

                // Filter for current user - show orders that belong to this user
                const supabaseUserOrders = convertedOrders.filter(o =>
                    !o.userId || // Show orders without user_id (backwards compatibility)
                    o.userId === userId || // Orders created by this user
                    (o.giverPhone && user && o.giverPhone === user.phone) // Match by phone number
                )
                console.log('=== DEBUG: Filtered orders:', supabaseUserOrders)
                setOrders(supabaseUserOrders)
            }
        } catch (err) {
            console.log('Could not load from Supabase:', err)
        }
    }

    function logout() {
        localStorage.removeItem(STORAGE_KEYS.CURRENT_USER)
        navigate('/')
    }

    // Sync all local orders to Supabase
    async function syncToSupabase() {
        const allOrders = JSON.parse(localStorage.getItem(STORAGE_KEYS.ORDERS) || '[]')
        let synced = 0
        let failed = 0

        for (const order of allOrders) {
            try {
                const { error } = await supabase
                    .from('orders')
                    .upsert({
                        code: order.code,
                        user_id: user?.id,
                        recipient_name: order.recipientName,
                        birthday_date: order.birthdayDate,
                        giver_name: order.giverName,
                        giver_phone: order.giverPhone,
                        package: order.package || 'free',
                        status: order.status || 'pending',
                        background_image: order.backgroundImage || order.birthdayDetails?.backgroundImage,
                        heart_message: order.heartMessage || order.birthdayDetails?.heartMessage,
                        date_of_birth: order.dateOfBirth || order.birthdayDetails?.dateOfBirth,
                        letter: order.letter || order.birthdayDetails?.letter,
                        nickname: order.nickname || order.birthdayDetails?.nickname,
                        audio_url: order.audioUrl || order.birthdayDetails?.audioUrl,
                        photos: order.photos ? JSON.stringify(order.photos) : (order.birthdayDetails?.photos ? JSON.stringify(order.birthdayDetails.photos) : null),
                        created_at: order.createdAt || new Date().toISOString(),
                        updated_at: new Date().toISOString()
                    }, { onConflict: 'code' })

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

        alert(`Synced ${synced} orders to Supabase. ${failed} failed.`)
        // Reload orders
        loadUserOrders(user)
    }

    function generateCode() {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
        let code = ''
        for (let i = 0; i < 6; i++) {
            code += chars.charAt(Math.floor(Math.random() * chars.length))
        }
        return code
    }

    async function createBirthdayPage() {
        if (!recipientName.trim() || !birthdayDate) {
            alert('Please fill in all fields')
            return
        }

        const userTier = user?.package_tier || 'free'

        // Check page type access based on package
        const allowedPageTypes = {
            free: ['birthday'],
            basic: ['birthday', 'wedding'],
            premium: ['birthday', 'wedding', 'anniversary', 'graduation'],
            enterprise: ['birthday', 'wedding', 'anniversary', 'graduation', 'custom']
        }
        if (!allowedPageTypes[userTier]?.includes(pageType)) {
            alert(`Your current package (${userTier}) does not allow creating ${pageType} pages. Please upgrade your package.`)
            return
        }

        // Check page limit based on package
        const maxPagesPerTier = {
            free: 1,
            basic: 3,
            premium: 10,
            enterprise: 999999
        }
        const maxPages = maxPagesPerTier[userTier] || 1
        if (orders.length >= maxPages) {
            alert(`Your current package (${userTier}) allows only ${maxPages} page(s). Please upgrade to create more pages.`)
            return
        }

        const code = generateCode()
        console.log('Creating order with user:', user)

        const newOrder = {
            id: Date.now(),
            userId: user?.id || 'guest',
            code,
            recipientName: recipientName.trim(),
            birthdayDate,
            pageType: pageType,
            package: user?.package_tier || 'free',
            price: user?.package_tier === 'premium' ? 10 : (user?.package_tier === 'basic' ? 5 : 0),
            status: user?.package_tier === 'free' ? 'active' : 'pending',
            createdAt: new Date().toISOString(),
            // Birthday details
            birthdayDetails: {
                backgroundImage: '',
                heartMessage: 'My heart belongs to you',
                dateOfBirth: '',
                letter: '',
                nickname: '',
                audioUrl: '',
                photos: []
            }
        }

        console.log('New order:', newOrder)

        const allOrders = JSON.parse(localStorage.getItem(STORAGE_KEYS.ORDERS) || '[]')
        allOrders.push(newOrder)
        localStorage.setItem(STORAGE_KEYS.ORDERS, JSON.stringify(allOrders))
        console.log('Saved to localStorage, total orders:', allOrders.length)

        // Also save to Supabase
        try {
            const { error: supabaseError } = await supabase.from('orders').insert([{
                code: code,
                user_id: user?.id,
                recipient_name: newOrder.recipientName,
                birthday_date: newOrder.birthdayDate,
                page_type: pageType,
                package: newOrder.package,
                status: newOrder.status,
                created_at: new Date().toISOString()
            }])

            if (supabaseError) {
                console.log('Supabase save error:', supabaseError.message)
            } else {
                console.log('Saved to Supabase!')
            }
        } catch (err) {
            console.log('Could not save to Supabase:', err)
        }

        setOrders([...orders, newOrder])
        setShowCreateModal(false)
        setRecipientName('')
        setBirthdayDate('')
        setSelectedPackage('free')
        setPageType('birthday')

        // Show success message and stay on dashboard
        alert(`Birthday page created! Code: ${code}\n\nShare this link with ${recipientName}:\n${window.location.origin}/birthday/${code}`)
    }

    // Get max photos based on tier
    function getMaxPhotos(packageType) {
        const tier = packageType || user?.package_tier || 'free'
        const maxPhotosPerTier = {
            premium: 50,
            basic: 15,
            free: 5,
            enterprise: 999999
        }
        return maxPhotosPerTier[tier] || 5
    }

    // Open birthday details modal
    function openBirthdayDetails(order) {
        setSelectedOrder(order)
        setBirthdayDetails(order.birthdayDetails || {
            backgroundImage: '',
            heartMessage: 'My heart belongs to you',
            dateOfBirth: '',
            letter: '',
            nickname: '',
            audioUrl: '',
            photos: []
        })
        setShowDetailsModal(true)
    }

    // Save birthday details
    async function saveBirthdayDetails() {
        if (!selectedOrder) return

        const updatedOrders = orders.map(o => {
            if (o.code === selectedOrder.code) {
                return { ...o, birthdayDetails: birthdayDetails, letter: birthdayDetails.letter, nickname: birthdayDetails.nickname, heartMessage: birthdayDetails.heartMessage, backgroundImage: birthdayDetails.backgroundImage, audioUrl: birthdayDetails.audioUrl }
            }
            return o
        })

        // Update localStorage
        const allOrders = JSON.parse(localStorage.getItem(STORAGE_KEYS.ORDERS) || '[]')
        const updatedAllOrders = allOrders.map(o => {
            if (o.code === selectedOrder.code) {
                return { ...o, birthdayDetails: birthdayDetails, letter: birthdayDetails.letter, nickname: birthdayDetails.nickname, heartMessage: birthdayDetails.heartMessage, backgroundImage: birthdayDetails.backgroundImage, audioUrl: birthdayDetails.audioUrl }
            }
            return o
        })
        localStorage.setItem(STORAGE_KEYS.ORDERS, JSON.stringify(updatedAllOrders))

        // Save to Supabase - try update first, then insert if needed
        try {
            console.log('=== DEBUG: Attempting to save order to Supabase ===')
            console.log('Order code:', selectedOrder.code)

            // First try to update - this will work if the order already exists
            const { data, error, count } = await supabase
                .from('orders')
                .update({
                    user_id: user?.id,
                    background_image: birthdayDetails.backgroundImage,
                    heart_message: birthdayDetails.heartMessage,
                    date_of_birth: birthdayDetails.dateOfBirth,
                    letter: birthdayDetails.letter,
                    nickname: birthdayDetails.nickname,
                    audio_url: birthdayDetails.audioUrl,
                    photos: JSON.stringify(birthdayDetails.photos),
                    updated_at: new Date().toISOString()
                })
                .eq('code', selectedOrder.code)

            console.log('Update result - error:', error)
            console.log('Update result - data:', data)
            console.log('Update result - count:', count)

            // Check if update was successful (either data returned or count > 0)
            if (error) {
                console.log('Supabase update error:', error.message)
                // Try inserting instead - but handle duplicate key gracefully
                const { data: insertData, error: insertError } = await supabase
                    .from('orders')
                    .insert([{
                        user_id: user?.id,
                        code: selectedOrder.code,
                        recipient_name: selectedOrder.recipientName,
                        birthday_date: selectedOrder.birthdayDate,
                        package: selectedOrder.package,
                        status: selectedOrder.status,
                        background_image: birthdayDetails.backgroundImage,
                        heart_message: birthdayDetails.heartMessage,
                        date_of_birth: birthdayDetails.dateOfBirth,
                        letter: birthdayDetails.letter,
                        nickname: birthdayDetails.nickname,
                        audio_url: birthdayDetails.audioUrl,
                        photos: JSON.stringify(birthdayDetails.photos),
                        created_at: new Date().toISOString(),
                        updated_at: new Date().toISOString()
                    }])

                console.log('Insert result - error:', insertError)
                console.log('Insert result - data:', insertData)

                if (insertError) {
                    // Check if it's a duplicate key error - order might already exist from another session
                    if (insertError.code === '23505') {
                        console.log('Order already exists, trying to update with user_id...')
                        // Try update again - this time it should work
                        const { data: updateData, error: updateError } = await supabase
                            .from('orders')
                            .update({
                                user_id: user?.id,
                                background_image: birthdayDetails.backgroundImage,
                                heart_message: birthdayDetails.heartMessage,
                                date_of_birth: birthdayDetails.dateOfBirth,
                                letter: birthdayDetails.letter,
                                nickname: birthdayDetails.nickname,
                                audio_url: birthdayDetails.audioUrl,
                                photos: JSON.stringify(birthdayDetails.photos),
                                updated_at: new Date().toISOString()
                            })
                            .eq('code', selectedOrder.code)

                        if (updateError) {
                            console.log('Supabase update error:', updateError.message)
                        } else {
                            console.log('Updated existing order with user_id!', updateData)
                        }
                    } else {
                        console.log('Supabase insert error:', insertError.message)
                    }
                } else {
                    console.log('Saved to Supabase via insert!')
                }
            } else if (count === 0) {
                // Update returned no error but no rows affected - order doesn't exist, do insert
                console.log('No rows updated - order does NOT exist, doing INSERT...')
                const { data: insertData, error: insertError } = await supabase
                    .from('orders')
                    .insert([{
                        user_id: user?.id,
                        code: selectedOrder.code,
                        recipient_name: selectedOrder.recipientName,
                        birthday_date: selectedOrder.birthdayDate,
                        package: selectedOrder.package,
                        status: selectedOrder.status,
                        background_image: birthdayDetails.backgroundImage,
                        heart_message: birthdayDetails.heartMessage,
                        date_of_birth: birthdayDetails.dateOfBirth,
                        letter: birthdayDetails.letter,
                        nickname: birthdayDetails.nickname,
                        audio_url: birthdayDetails.audioUrl,
                        photos: JSON.stringify(birthdayDetails.photos),
                        created_at: new Date().toISOString(),
                        updated_at: new Date().toISOString()
                    }])

                console.log('Insert result - error:', insertError)
                console.log('Insert result - data:', insertData)

                if (insertError) {
                    console.log('Supabase insert error:', insertError.message)
                    alert('Error: ' + insertError.message)
                } else {
                    console.log('INSERTED new order to Supabase!', insertData)
                }
            } else {
                // Update was successful
                console.log('Updated order successfully in Supabase!')
            }
        } catch (err) {
            console.log('Could not save to Supabase:', err)
        }

        setOrders(updatedOrders)
        setShowDetailsModal(false)
        alert('Birthday details saved successfully!')
    }

    // Handle photo upload with tagging
    async function handlePhotoUpload(e) {
        const files = Array.from(e.target.files)
        if (!files.length) return

        const maxPhotos = getMaxPhotos(selectedOrder?.package || 'free')
        const currentCount = birthdayDetails.photos.length

        if (currentCount + files.length > maxPhotos) {
            alert(`Maximum ${maxPhotos} photos allowed for ${selectedOrder?.package || 'free'} package`)
            return
        }

        // Check file size (max 5MB)
        for (const file of files) {
            if (file.size > 5 * 1024 * 1024) {
                alert('Each photo must be less than 5MB')
                return
            }
        }

        // Upload to Cloudinary with tag
        const tag = selectedOrder?.recipientName?.toLowerCase().replace(/\s+/g, '') || 'birthday'
        const uploadedUrls = []

        for (const file of files) {
            const formData = new FormData()
            formData.append('file', file)
            formData.append('upload_preset', 'ml_default')

            try {
                const res = await fetch(`https://api.cloudinary.com/v1_1/djjgkezui/image/upload`, {
                    method: 'POST',
                    body: formData
                })
                const data = await res.json()
                if (data.secure_url) {
                    // Add tag to the image in Cloudinary
                    uploadedUrls.push({
                        url: data.secure_url,
                        publicId: data.public_id,
                        tag: tag // Tag for tracking
                    })
                }
            } catch (err) {
                console.error('Upload error:', err)
            }
        }

        if (uploadedUrls.length > 0) {
            setBirthdayDetails({
                ...birthdayDetails,
                photos: [...birthdayDetails.photos, ...uploadedUrls]
            })
        }
    }

    // Remove photo
    function removePhoto(index) {
        const newPhotos = [...birthdayDetails.photos]
        newPhotos.splice(index, 1)
        setBirthdayDetails({ ...birthdayDetails, photos: newPhotos })
    }

    // Upload background image to Cloudinary
    async function handleBackgroundImageUpload(e) {
        const file = e.target.files[0]
        if (!file) return

        // Check file size (max 5MB)
        if (file.size > 5 * 1024 * 1024) {
            alert('Image must be less than 5MB')
            return
        }

        const formData = new FormData()
        formData.append('file', file)
        formData.append('upload_preset', 'ml_default')

        try {
            const res = await fetch(`https://api.cloudinary.com/v1_1/djjgkezui/image/upload`, {
                method: 'POST',
                body: formData
            })
            const data = await res.json()
            if (data.secure_url) {
                setBirthdayDetails({ ...birthdayDetails, backgroundImage: data.secure_url })
            }
        } catch (err) {
            console.error('Upload error:', err)
        }
    }

    // Upload background music to Cloudinary
    async function handleAudioUpload(e) {
        const file = e.target.files[0]
        if (!file) return

        // Check file size (max 10MB)
        if (file.size > 10 * 1024 * 1024) {
            alert('Audio must be less than 10MB')
            return
        }

        const formData = new FormData()
        formData.append('file', file)
        formData.append('upload_preset', 'ml_default')
        formData.append('resource_type', 'video') // Cloudinary uses video API for audio

        try {
            const res = await fetch(`https://api.cloudinary.com/v1_1/djjgkezui/video/upload`, {
                method: 'POST',
                body: formData
            })
            const data = await res.json()
            if (data.secure_url) {
                setBirthdayDetails({ ...birthdayDetails, audioUrl: data.secure_url })
            }
        } catch (err) {
            console.error('Upload error:', err)
        }
    }

    if (!user) return null

    return (
        <div className="min-h-screen" style={{ background: 'linear-gradient(135deg, #fce7f3 0%, #fbcfe8 100%)' }}>
            {/* Payment Pending Warning */}
            {paymentPending && (
                <div className="bg-yellow-50 border-b-2 border-yellow-400 p-3 md:p-4 fixed top-0 left-0 right-0 z-40">
                    <div className="max-w-4xl mx-auto flex flex-col md:flex-row items-start md:items-center justify-between gap-2 md:gap-4">
                        <div className="flex items-center gap-2 md:gap-3">
                            <span className="text-xl md:text-2xl">⏳</span>
                            <div>
                                <p className="font-bold text-yellow-800 text-sm md:text-base">Payment Pending Confirmation</p>
                                <p className="text-xs md:text-sm text-yellow-700">Your {user?.package_tier} package is waiting for admin confirmation. Basic features are available.</p>
                            </div>
                        </div>
                        <button 
                            onClick={() => window.location.reload()}
                            className="px-3 md:px-4 py-1.5 md:py-2 bg-yellow-500 text-white rounded-lg font-semibold hover:bg-yellow-600 transition text-sm"
                        >
                            Refresh
                        </button>
                    </div>
                </div>
            )}
            
            {/* Header */}
            <div className={`fixed left-0 right-0 bg-white/80 backdrop-blur-md shadow-sm z-40 ${paymentPending ? 'top-[72px] md:top-[72px]' : 'top-0'}`}>
                <div className="max-w-4xl mx-auto px-4 py-3 flex justify-between items-center">
                    <div className="flex items-center gap-3">
                        <button onClick={() => navigate('/')} className="text-rose-500 hover:text-rose-600">
                            ←
                        </button>
                        <h1 className="text-xl font-['Dancing_Script'] text-rose-500">💕 My Dashboard</h1>
                    </div>
                    <div className="flex items-center gap-4">
                        {/* Package Badge in Header */}
                        {user?.package_tier && (
                            <div className={`flex items-center gap-1 md:gap-2 px-2 md:px-3 py-1 rounded-full text-xs md:text-sm font-semibold 
                                ${user.package_tier === 'premium' ? 'bg-gradient-to-r from-rose-500 to-pink-500 text-white' : 
                                  user.package_tier === 'enterprise' ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white' :
                                  user.package_tier === 'basic' ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-700'}`}>
                                <span>{user.package_name || user.package_tier?.toUpperCase()}</span>
                                {user.payment_status !== 'confirmed' && user.package_tier !== 'free' && (
                                    <span className="text-[10px] md:text-xs bg-yellow-500 text-white px-1 rounded animate-pulse flex-shrink-0">!</span>
                                )}
                                {user.package_tier !== 'enterprise' && (
                                    <button 
                                        onClick={() => navigate('/select-package?upgrade=true')}
                                        className="text-[10px] md:text-xs opacity-80 hover:opacity-100 underline hidden md:inline"
                                    >
                                        Upgrade
                                    </button>
                                )}
                            </div>
                        )}
                        <button onClick={logout} className="text-rose-500 text-sm">Logout</button>
                    </div>
                </div>
            </div>

            <div className={`px-4 pb-8 max-w-4xl mx-auto ${paymentPending ? 'pt-28' : 'pt-20'}`}>
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
                    onClick={() => setShowCreateModal(true)}
                    className="w-full bg-gradient-to-r from-rose-500 to-pink-500 text-white py-4 rounded-xl font-semibold text-lg mb-3 hover:shadow-lg transition"
                >
                    + Create New Birthday Page
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
                                        {/* Avatar */}
                                        <div className="w-14 h-14 rounded-full bg-gradient-to-br from-rose-400 to-pink-500 flex items-center justify-center text-white text-xl font-bold shadow-md">
                                            {order.recipientName.charAt(0).toUpperCase()}
                                        </div>
                                        <div className="flex-1">
                                            <div className="font-bold text-rose-600 text-lg">
                                                {order.recipientName}
                                            </div>
                                            <div className="text-gray-600 text-sm flex items-center gap-1">
                                                🎂 {new Date(order.birthdayDate).toLocaleDateString()}
                                            </div>
                                            <div className="text-sm mt-1">
                                                <span className="bg-rose-200 text-rose-700 px-2 py-1 rounded text-xs font-bold">
                                                    {order.code}
                                                </span>
                                            </div>
                                        </div>
                                        <div>
                                            <span className={`px-2 py-1 rounded-full text-xs font-bold ${order.status === 'active' || order.status === 'paid' ? 'bg-green-100 text-green-600' : 'bg-yellow-100 text-yellow-600'
                                                }`}>
                                                {order.status === 'active' || order.status === 'paid' ? 'Active' : 'Pending'}
                                            </span>
                                        </div>
                                    </div>
                                    <div className="mt-4 flex gap-2 flex-wrap">
                                        <Link
                                            to={`/birthday/${order.code}`}
                                            className="text-xs bg-rose-500 text-white px-3 py-2 rounded-full hover:bg-rose-600 transition"
                                        >
                                            👁️ View Page
                                        </Link>
                                        <button
                                            onClick={() => openBirthdayDetails(order)}
                                            className="text-xs bg-amber-500 text-white px-3 py-2 rounded-full hover:bg-amber-600 transition"
                                        >
                                            ✏️ {order.birthdayDetails?.letter || order.birthdayDetails?.nickname ? 'Edit Details' : 'Add Details'}
                                        </button>
                                        <Link
                                            to={`/upload/${order.code}`}
                                            className="text-xs bg-purple-500 text-white px-3 py-2 rounded-full hover:bg-purple-600 transition"
                                        >
                                            📷 Add Photos
                                        </Link>
                                        <Link
                                            to={`/slideshow/${order.code}`}
                                            className="text-xs bg-blue-500 text-white px-3 py-2 rounded-full hover:bg-blue-600 transition"
                                        >
                                            🎬 Slideshow
                                        </Link>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Create Modal */}
            {showCreateModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-3xl p-6 max-w-md w-full">
                        <h3 className="text-xl font-bold text-gray-700 mb-4">Create Birthday Page</h3>

                        <div className="space-y-4">
                            {/* Page Type Selection */}
                            <div>
                                <label className="block text-gray-600 mb-2">Page Type</label>
                                <select
                                    value={pageType}
                                    onChange={(e) => setPageType(e.target.value)}
                                    className="w-full p-3 border-2 border-rose-200 rounded-xl"
                                >
                                    <option value="birthday">Birthday 🎂</option>
                                    {user?.package_tier && user?.package_tier !== 'free' ? (
                                        hasFeatureAccess(user.package_tier) ? (
                                            <>
                                                <option value="wedding">Wedding 💒</option>
                                            </>
                                        ) : (
                                            <option value="wedding" disabled>Wedding 💒 (Payment Pending)</option>
                                        )
                                    ) : null}
                                    {user?.package_tier === 'premium' || user?.package_tier === 'enterprise' ? (
                                        hasFeatureAccess(user.package_tier) ? (
                                            <>
                                                <option value="anniversary">Anniversary 💕</option>
                                                <option value="graduation">Graduation 🎓</option>
                                            </>
                                        ) : (
                                            <>
                                                <option value="anniversary" disabled>Anniversary 💕 (Payment Pending)</option>
                                                <option value="graduation" disabled>Graduation 🎓 (Payment Pending)</option>
                                            </>
                                        )
                                    ) : null}
                                    {user?.package_tier === 'enterprise' ? (
                                        hasFeatureAccess(user.package_tier) ? (
                                            <option value="custom">Custom ✨</option>
                                        ) : (
                                            <option value="custom" disabled>Custom ✨ (Payment Pending)</option>
                                        )
                                    ) : null}
                                </select>
                                {pageType !== 'birthday' && (
                                    <p className="text-xs text-rose-500 mt-1">
                                        {pageType === 'wedding' && 'Wedding pages require Basic or higher'}
                                        {pageType === 'anniversary' && 'Anniversary pages require Premium or higher'}
                                        {pageType === 'graduation' && 'Graduation pages require Premium or higher'}
                                        {pageType === 'custom' && 'Custom pages require Enterprise'}
                                    </p>
                                )}
                            </div>
                            <div>
                                <label className="block text-gray-600 mb-2">Birthday Person's Name</label>
                                <input
                                    type="text"
                                    value={recipientName}
                                    onChange={(e) => setRecipientName(e.target.value)}
                                    className="w-full p-3 border-2 border-rose-200 rounded-xl"
                                    placeholder="e.g., Sarah, Mama..."
                                />
                            </div>
                            <div>
                                <label className="block text-gray-600 mb-2">Birthday Date</label>
                                <input
                                    type="date"
                                    value={birthdayDate}
                                    onChange={(e) => setBirthdayDate(e.target.value)}
                                    className="w-full p-3 border-2 border-rose-200 rounded-xl"
                                />
                            </div>
                            <div>
                                <label className="block text-gray-600 mb-2">Package</label>
                                <select
                                    value={selectedPackage}
                                    onChange={(e) => setSelectedPackage(e.target.value)}
                                    className="w-full p-3 border-2 border-rose-200 rounded-xl"
                                    disabled
                                >
                                    <option value={user?.package_tier || 'free'}>
                                        {user?.package_name?.toUpperCase() || (user?.package_tier || 'Free').toUpperCase()} Plan
                                    </option>
                                </select>
                                <p className="text-xs text-gray-500 mt-1">Your package is tied to your account</p>
                            </div>
                        </div>

                        <div className="flex gap-3 mt-6">
                            <button
                                onClick={createBirthdayPage}
                                className="flex-1 bg-rose-500 text-white py-3 rounded-xl font-semibold"
                            >
                                Create
                            </button>
                            <button
                                onClick={() => setShowCreateModal(false)}
                                className="px-6 bg-gray-200 text-gray-600 py-3 rounded-xl font-semibold"
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Birthday Details Modal */}
            {showDetailsModal && selectedOrder && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto">
                    <div className="bg-white rounded-3xl p-6 max-w-2xl w-full my-8">
                        <h3 className="text-xl font-bold text-gray-700 mb-2">Birthday Details</h3>
                        <p className="text-sm text-gray-500 mb-4">for {selectedOrder.recipientName} ({selectedOrder.package} package - max {getMaxPhotos(selectedOrder.package)} photos)</p>

                        <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
                            {/* Background Image */}
                            <div>
                                <label className="block text-gray-600 mb-2">Main Background Image</label>
                                <div className="space-y-2">
                                    <input
                                        type="file"
                                        accept="image/*"
                                        onChange={handleBackgroundImageUpload}
                                        className="w-full p-3 border-2 border-rose-200 rounded-xl"
                                    />
                                    <p className="text-xs text-gray-500 text-center">or enter URL below</p>
                                    <input
                                        type="url"
                                        value={birthdayDetails.backgroundImage}
                                        onChange={(e) => setBirthdayDetails({ ...birthdayDetails, backgroundImage: e.target.value })}
                                        className="w-full p-3 border-2 border-rose-200 rounded-xl"
                                        placeholder="https://example.com/background.jpg"
                                    />
                                </div>
                                {birthdayDetails.backgroundImage && (
                                    <img
                                        src={birthdayDetails.backgroundImage}
                                        alt="Background preview"
                                        className="mt-2 w-full h-32 object-cover rounded-xl"
                                        onError={(e) => e.target.style.display = 'none'}
                                    />
                                )}
                            </div>

                            {/* Heart Message */}
                            <div>
                                <label className="block text-gray-600 mb-2">Heart Message</label>
                                <input
                                    type="text"
                                    value={birthdayDetails.heartMessage}
                                    onChange={(e) => setBirthdayDetails({ ...birthdayDetails, heartMessage: e.target.value })}
                                    className="w-full p-3 border-2 border-rose-200 rounded-xl"
                                    placeholder="My heart belongs to you"
                                />
                            </div>

                            {/* Nickname */}
                            <div>
                                <label className="block text-gray-600 mb-2">Nickname</label>
                                <input
                                    type="text"
                                    value={birthdayDetails.nickname}
                                    onChange={(e) => setBirthdayDetails({ ...birthdayDetails, nickname: e.target.value })}
                                    className="w-full p-3 border-2 border-rose-200 rounded-xl"
                                    placeholder="e.g., Babe, Love, My Queen..."
                                />
                            </div>

                            {/* Date of Birth for Countdown */}
                            <div>
                                <label className="block text-gray-600 mb-2">Date of Birth (for countdown)</label>
                                <input
                                    type="date"
                                    value={birthdayDetails.dateOfBirth}
                                    onChange={(e) => setBirthdayDetails({ ...birthdayDetails, dateOfBirth: e.target.value })}
                                    className="w-full p-3 border-2 border-rose-200 rounded-xl"
                                />
                            </div>

                            {/* Letter */}
                            <div>
                                <label className="block text-gray-600 mb-2">Letter to the Birthday Person</label>
                                <textarea
                                    value={birthdayDetails.letter}
                                    onChange={(e) => setBirthdayDetails({ ...birthdayDetails, letter: e.target.value })}
                                    className="w-full p-3 border-2 border-rose-200 rounded-xl h-32"
                                    placeholder="Write a heartfelt letter..."
                                />
                            </div>

                            {/* Audio URL */}
                            <div>
                                <label className="block text-gray-600 mb-2">Background Music</label>
                                <div className="space-y-2">
                                    <input
                                        type="file"
                                        accept="audio/*"
                                        onChange={handleAudioUpload}
                                        className="w-full p-3 border-2 border-rose-200 rounded-xl"
                                    />
                                    <p className="text-xs text-gray-500 text-center">or enter URL below</p>
                                    <input
                                        type="url"
                                        value={birthdayDetails.audioUrl}
                                        onChange={(e) => setBirthdayDetails({ ...birthdayDetails, audioUrl: e.target.value })}
                                        className="w-full p-3 border-2 border-rose-200 rounded-xl"
                                        placeholder="https://example.com/song.mp3"
                                    />
                                </div>
                            </div>

                            {/* Photos */}
                            <div>
                                <label className="block text-gray-600 mb-2">
                                    Photos ({birthdayDetails.photos.length}/{getMaxPhotos(selectedOrder.package)}) - Max 5MB each
                                </label>
                                <input
                                    type="file"
                                    accept="image/*"
                                    multiple
                                    onChange={handlePhotoUpload}
                                    className="w-full p-3 border-2 border-rose-200 rounded-xl"
                                    disabled={birthdayDetails.photos.length >= getMaxPhotos(selectedOrder.package)}
                                />
                                <p className="text-xs text-gray-500 mt-1">
                                    Photos will be tagged with "{selectedOrder.recipientName?.toLowerCase().replace(/\s+/g, '') || 'birthday'}" for tracking
                                </p>

                                {/* Photo Preview Grid */}
                                {birthdayDetails.photos.length > 0 && (
                                    <div className="grid grid-cols-3 gap-2 mt-3">
                                        {birthdayDetails.photos.map((photo, index) => (
                                            <div key={index} className="relative">
                                                <img
                                                    src={photo.url}
                                                    alt={`Photo ${index + 1}`}
                                                    className="w-full h-20 object-cover rounded-lg"
                                                />
                                                <button
                                                    onClick={() => removePhoto(index)}
                                                    className="absolute top-1 right-1 bg-red-500 text-white rounded-full w-5 h-5 text-xs flex items-center justify-center"
                                                >
                                                    ✕
                                                </button>
                                                <span className="absolute bottom-1 left-1 bg-black/50 text-white text-xs px-1 rounded">
                                                    {photo.tag}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="flex gap-3 mt-6">
                            <button
                                onClick={saveBirthdayDetails}
                                className="flex-1 bg-rose-500 text-white py-3 rounded-xl font-semibold"
                            >
                                Save Details
                            </button>
                            <button
                                onClick={() => setShowShareLink(true)}
                                className="px-6 bg-green-500 text-white py-3 rounded-xl font-semibold"
                            >
                                🔗 Share Link
                            </button>
                        </div>

                        {/* Share Link Section */}
                        {showShareLink && (
                            <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-xl">
                                <h4 className="font-bold text-green-700 mb-2">🎉 Birthday Page Link</h4>
                                <p className="text-sm text-gray-600 mb-3">
                                    Share this link with friends and family to let them see {selectedOrder.recipientName}'s birthday page!
                                </p>
                                <div className="flex gap-2">
                                    <input
                                        type="text"
                                        readOnly
                                        value={`${window.location.origin}/birthday/${selectedOrder.code}`}
                                        className="flex-1 p-2 border-2 border-green-200 rounded-xl text-sm bg-white"
                                    />
                                    <button
                                        onClick={() => {
                                            navigator.clipboard.writeText(`${window.location.origin}/birthday/${selectedOrder.code}`)
                                            setShareLinkCopied(true)
                                            setTimeout(() => setShareLinkCopied(false), 3000)
                                        }}
                                        className="bg-green-500 text-white px-4 py-2 rounded-xl text-sm"
                                    >
                                        {shareLinkCopied ? '✓ Copied!' : 'Copy'}
                                    </button>
                                </div>
                            </div>
                        )}

                        <div className="mt-4">
                            <button
                                onClick={() => setShowDetailsModal(false)}
                                className="w-full bg-gray-200 text-gray-600 py-3 rounded-xl font-semibold"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}

export default Dashboard
