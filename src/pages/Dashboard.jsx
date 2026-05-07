import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase, STORAGE_KEYS } from '../supabase'
import { usePackage, DEFAULT_PACKAGES } from '../hooks/usePackage.jsx'
import { getEventSchema, getEventFields, transformFormData, validateFormData } from '../config/eventSchemas'
import { getEventDisplay } from '../config/orderTypeMapping'

// Dynamic field renderer for event-specific forms
function DynamicFieldRenderer({ field, value, onChange, onFileUpload, maxPhotos, currentPhotosCount }) {
    const { name, label, type, accept, placeholder, helpText, rows, options, max } = field

    const handleChange = (e) => {
        const newValue = type === 'checkbox' ? e.target.checked : e.target.value
        onChange(name, newValue)
    }

    const handleFileChange = async (e) => {
        if (onFileUpload) {
            await onFileUpload(e, name)
        }
    }

    const baseInputClass = "w-full p-3 border-2 border-rose-200 rounded-xl text-sm"

    switch (type) {
        case 'text':
        case 'date':
        case 'time':
        case 'tel':
        case 'url':
            return (
                <div key={name}>
                    <label className="block text-gray-600 mb-2">{label} {field.required && <span className="text-red-500">*</span>}</label>
                    <input
                        type={type}
                        value={value || ''}
                        onChange={handleChange}
                        className={baseInputClass}
                        placeholder={placeholder}
                    />
                    {helpText && <p className="text-xs text-gray-500 mt-1">{helpText}</p>}
                </div>
            )

        case 'textarea':
            return (
                <div key={name}>
                    <label className="block text-gray-600 mb-2">{label} {field.required && <span className="text-red-500">*</span>}</label>
                    <textarea
                        value={value || ''}
                        onChange={handleChange}
                        className={baseInputClass}
                        placeholder={placeholder}
                        rows={rows || 4}
                    />
                    {helpText && <p className="text-xs text-gray-500 mt-1">{helpText}</p>}
                </div>
            )

        case 'checkbox':
            return (
                <div key={name} className="flex items-start gap-3 p-3 border-2 border-rose-200 rounded-xl">
                    <input
                        type="checkbox"
                        checked={value || false}
                        onChange={handleChange}
                        className="mt-1 w-5 h-5 accent-rose-500"
                    />
                    <div>
                        <label className="text-gray-700 font-medium">{label}</label>
                        {helpText && <p className="text-xs text-gray-500 mt-1">{helpText}</p>}
                    </div>
                </div>
            )

        case 'file-image':
            return (
                <div key={name}>
                    <label className="block text-gray-600 mb-2">{label}</label>
                    <div className="space-y-2">
                        <input
                            type="file"
                            accept={accept}
                            onChange={handleFileChange}
                            className="w-full p-2 border-2 border-rose-200 rounded-xl text-sm"
                        />
                        <p className="text-xs text-gray-500 text-center">or enter URL below</p>
                        <input
                            type="url"
                            value={value || ''}
                            onChange={handleChange}
                            className={baseInputClass}
                            placeholder={placeholder}
                        />
                    </div>
                    {value && (
                        <img
                            src={value}
                            alt="Preview"
                            className="mt-2 w-full h-32 object-cover rounded-xl"
                            onError={(e) => e.target.style.display = 'none'}
                        />
                    )}
                    {helpText && <p className="text-xs text-gray-500 mt-1">{helpText}</p>}
                </div>
            )

        case 'file-audio':
            return (
                <div key={name}>
                    <label className="block text-gray-600 mb-2">{label}</label>
                    <div className="space-y-2">
                        <input
                            type="file"
                            accept={accept}
                            onChange={handleFileChange}
                            className="w-full p-2 border-2 border-rose-200 rounded-xl text-sm"
                        />
                        <p className="text-xs text-gray-500 text-center">or enter URL below</p>
                        <input
                            type="url"
                            value={value || ''}
                            onChange={handleChange}
                            className={baseInputClass}
                            placeholder={placeholder}
                        />
                    </div>
                    {helpText && <p className="text-xs text-gray-500 mt-1">{helpText}</p>}
                </div>
            )

        case 'photo-uploader':
            return (
                <div key={name}>
                    <label className="block text-gray-600 mb-2">
                        {label} ({currentPhotosCount || 0}/{maxPhotos}) - Max 5MB each
                    </label>
                    <input
                        type="file"
                        accept="image/*"
                        multiple
                        onChange={handleFileChange}
                        disabled={(currentPhotosCount || 0) >= maxPhotos}
                        className="w-full p-2 border-2 border-rose-200 rounded-xl text-sm"
                    />
                    {helpText && <p className="text-xs text-gray-500 mt-1">{helpText}</p>}
                </div>
            )

        case 'select':
            return (
                <div key={name}>
                    <label className="block text-gray-600 mb-2">{label}</label>
                    <select
                        value={value || ''}
                        onChange={handleChange}
                        className={baseInputClass}
                    >
                        <option value="">{placeholder || 'Select...'}</option>
                        {options?.map(opt => (
                            <option key={opt} value={opt}>{opt}</option>
                        ))}
                    </select>
                </div>
            )

        case 'custom-fields':
            return (
                <div key={name}>
                    <label className="block text-gray-600 mb-2">{label}</label>
                    <div className="space-y-3">
                        {field.fields?.map(subField => (
                            <div key={subField.name}>
                                <label className="block text-gray-600 mb-1 text-sm">{subField.label}</label>
                                {subField.type === 'textarea' ? (
                                    <textarea
                                        value={value?.[subField.name] || ''}
                                        onChange={(e) => onChange(`${name}.${subField.name}`, e.target.value)}
                                        className={baseInputClass}
                                        placeholder={subField.placeholder}
                                        rows={subField.rows || 3}
                                    />
                                ) : (
                                    <input
                                        type={subField.type}
                                        value={value?.[subField.name] || ''}
                                        onChange={(e) => onChange(`${name}.${subField.name}`, e.target.value)}
                                        className={baseInputClass}
                                        placeholder={subField.placeholder}
                                    />
                                )}
                            </div>
                        ))}
                    </div>
                    {helpText && <p className="text-xs text-gray-500 mt-1">{helpText}</p>}
                </div>
            )

        default:
            return (
                <div key={name}>
                    <label className="block text-gray-600 mb-2">{label}</label>
                    <input
                        type="text"
                        value={value || ''}
                        onChange={handleChange}
                        className={baseInputClass}
                        placeholder={placeholder}
                    />
                </div>
            )
    }
}

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

    // Helper to check if premium features are unlocked
    const hasFeatureAccess = (tier) => {
        if (!tier || tier === 'free') return false
        if (user?.payment_status !== 'confirmed') return false
        return true
    }

    const logout = () => {
        localStorage.removeItem(STORAGE_KEYS.CURRENT_USER)
        supabase.auth.signOut().catch(() => { })
        navigate('/login')
    }

    // Event type color mappings
    const getEventColorClasses = (eventType) => {
        const colors = {
            birthday: { bg: 'from-rose-50 to-pink-50', border: 'border-rose-100', iconBg: 'from-rose-400 to-pink-500', badge: 'bg-rose-200 text-rose-700' },
            wedding: { bg: 'from-pink-50 to-rose-100', border: 'border-pink-200', iconBg: 'from-pink-400 to-rose-500', badge: 'bg-pink-200 text-pink-700' },
            anniversary: { bg: 'from-red-50 to-rose-100', border: 'border-red-200', iconBg: 'from-red-400 to-rose-500', badge: 'bg-red-200 text-red-700' },
            party: { bg: 'from-purple-50 to-indigo-100', border: 'border-purple-200', iconBg: 'from-purple-400 to-indigo-500', badge: 'bg-purple-200 text-purple-700' },
            hangout: { bg: 'from-blue-50 to-cyan-100', border: 'border-blue-200', iconBg: 'from-blue-400 to-cyan-500', badge: 'bg-blue-200 text-blue-700' },
            other: { bg: 'from-gray-50 to-gray-100', border: 'border-gray-200', iconBg: 'from-gray-400 to-gray-500', badge: 'bg-gray-200 text-gray-700' },
            graduation: { bg: 'from-blue-50 to-indigo-100', border: 'border-blue-200', iconBg: 'from-blue-400 to-indigo-500', badge: 'bg-blue-200 text-blue-700' }
        }
        return colors[eventType] || colors.birthday
    }

    // Dynamic Event Details state
    const [birthdayDetails, setBirthdayDetails] = useState({})
    const [currentEventType, setCurrentEventType] = useState('birthday')
    const [showShareLink, setShowShareLink] = useState(false)
    const [shareLinkCopied, setShareLinkCopied] = useState(false)

    useEffect(() => {
        const currentUser = JSON.parse(localStorage.getItem(STORAGE_KEYS.CURRENT_USER) || 'null')
        if (!currentUser) {
            navigate('/login')
            return
        }

        if (!currentUser.package_tier) {
            navigate('/select-package')
            return
        }

        if (currentUser.package_pending) {
            setPendingUpgrade({
                to_package_tier: currentUser.package_pending,
                payment_status: currentUser.payment_status
            })
            setPaymentPending(currentUser.payment_status === 'pending')
        } else {
            setPendingUpgrade(null)
            setPaymentPending(false)
        }

        setUser(currentUser)
        refreshUserFromSupabase(currentUser.id)
        loadUserOrders(currentUser)
    }, [navigate])

    async function refreshUserFromSupabase(userId) {
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

                if (data.package_pending) {
                    setPendingUpgrade({
                        to_package_tier: data.package_pending,
                        payment_status: data.payment_status
                    })
                    setPaymentPending(data.payment_status === 'pending')
                } else {
                    setPendingUpgrade(null)
                    setPaymentPending(false)
                }
            }
        } catch (err) {
            console.log('Error refreshing user from Supabase:', err)
        }
    }

    function loadUserOrders(userOrId) {
        const userId = typeof userOrId === 'object' ? userOrId.id : userOrId
        const allOrders = JSON.parse(localStorage.getItem(STORAGE_KEYS.ORDERS) || '[]')

        const filteredLocalOrders = allOrders.filter(order =>
            !order.userId ||
            order.userId === userId ||
            (order.giverPhone && user && order.giverPhone === user.phone)
        )
        setOrders(filteredLocalOrders)
        loadFromSupabase(userId)
    }

    async function loadFromSupabase(userId) {
        try {
            const { data, error } = await supabase
                .from('orders')
                .select('*')

            if (data && data.length > 0) {
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

                localStorage.setItem(STORAGE_KEYS.ORDERS, JSON.stringify(convertedOrders))

                const supabaseUserOrders = convertedOrders.filter(o =>
                    !o.userId ||
                    o.userId === userId ||
                    (o.giverPhone && user && o.giverPhone === user.phone)
                )
                setOrders(supabaseUserOrders)
            }
        } catch (err) {
            console.log('Could not load from Supabase:', err)
        }
    }



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
            return
        }

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

        const code = pageType === 'birthday' ? generateCode() : null

        const schema = getEventSchema(pageType)
        const tableName = schema.table

        if (pageType === 'birthday') {
            const newOrder = {
                id: Date.now(),
                registryId: null,
                eventType: pageType,
                eventId: null,
                recipientName: recipientName.trim(),
                eventDate: eventDate,
                details: {
                    backgroundImage: '',
                    heartMessage: 'My heart belongs to you',
                    dateOfBirth: '',
                    letter: '',
                    nickname: '',
                    audioUrl: '',
                    photos: []
                },
                hasDetails: false,
                status: 'active',
                package: user?.package_tier || 'free',
                isLegacy: true,
                code: code,
                createdAt: new Date().toISOString()
            }

            const registryData = {
                user_id: user?.id,
                event_type: 'birthday',
                event_name: recipientName.trim(),
                event_date: eventDate,
                is_public: false
            }
            try {
                const { error: registryError } = await supabase
                    .from('event_registry')
                    .insert([registryData])
                if (registryError) console.log('Registry insert error:', registryError.message)
            } catch (err) {
                console.log('Registry insert failed:', err)
            }

            setOrders(prev => [...prev, newOrder])
            setShowCreateModal(false)
            setRecipientName('')
            setEventDate('')
            setSelectedPackage('free')
            setPageType('birthday')

            alert(`Birthday page created! Code: ${code}\n\nShare this link with ${recipientName}:\n${window.location.origin}/birthday/${code}`)
            return
        }

        // For non-birthday event types
        const defaultValues = getDefaultValuesForType(pageType)
        
        // Validate required fields
        if (pageType === 'wedding' && !eventDate) {
            alert('Please select a wedding date')
            return
        }
        if (pageType === 'anniversary' && !eventDate) {
            alert('Please select an anniversary date')
            return
        }
        if (pageType === 'party' && !eventDate) {
            alert('Please select a party date')
            return
        }
        if (pageType === 'hangout' && !eventDate) {
            alert('Please select a hangout date')
            return
        }
        if (pageType === 'other' && !eventDate) {
            alert('Please select an event date')
            return
        }
        
        // Update date in defaultValues with the selected eventDate
        const dateFields = {
            wedding: 'wedding_date',
            anniversary: 'anniversary_date',
            party: 'party_date',
            hangout: 'hangout_date',
            other: 'event_date'
        }
        if (dateFields[pageType]) {
            defaultValues[dateFields[pageType]] = eventDate
        }
        
        const { data: eventResult, error: eventError } = await supabase
            .from(tableName)
            .insert({
                user_id: user?.id,
                ...defaultValues,
                created_at: new Date().toISOString()
            })
            .select('id')
            .single()

        if (eventError || !eventResult) {
            console.error('Failed to create event:', eventError)
            
            // Provide user-friendly error messages
            let userMessage = 'Failed to create event. '
            
            if (eventError?.code === '22007') {
                userMessage += 'Invalid date format. Please check the date fields.'
            } else if (eventError?.code === '23503') {
                userMessage += 'Database constraint violation. Please try again.'
            } else if (eventError?.code === '42P01') {
                userMessage += 'Table does not exist. Please contact support.'
            } else if (eventError?.code === '23505') {
                userMessage += 'Duplicate entry detected. Please try again.'
            } else if (eventError?.message?.includes('date')) {
                userMessage += 'Invalid date value. Please check the date fields.'
            } else {
                userMessage += 'Please try again or contact support.'
            }
            
            alert(userMessage)
            return
        }

        const { data: registryResult, error: registryError } = await supabase
            .from('event_registry')
            .insert({
                user_id: user?.id,
                event_type: pageType,
                event_name: recipientName.trim(),
                event_date: eventDate,
                event_id: eventResult.id,
                is_public: false
            })
            .select('*')
            .single()

        if (registryError) {
            console.error('Failed to create registry entry:', registryError)
        }

        const newEvent = {
            id: registryResult?.id || eventResult.id,
            registryId: registryResult?.id,
            eventType: pageType,
            eventId: eventResult.id,
            recipientName: recipientName.trim(),
            eventDate: eventDate,
            details: { ...defaultValues, id: eventResult.id },
            hasDetails: false,
            status: 'active',
            isPublic: false,
            isLegacy: false,
            createdAt: new Date().toISOString()
        }

        setOrders(prev => [...prev, newEvent])
        setShowCreateModal(false)
        setRecipientName('')
        setEventDate('')
        setSelectedPackage('free')
        setPageType('birthday')

        alert(`${pageType.charAt(0).toUpperCase() + pageType.slice(1)} page created!`)
    }

    function getDefaultValuesForType(eventType) {
        const defaults = {
            wedding: { couple_names: '', wedding_date: null, venue: '', guest_count: null, theme: '', is_public: false },
            anniversary: { couple_names: '', anniversary_date: null, years_married: null, special_memory: '', is_public: false },
            party: { party_name: '', party_date: null, party_time: '', theme: '', guest_count: null, is_public: false },
            hangout: { hangout_name: '', hangout_date: null, hangout_time: '', who_coming: '', expected_people: null, location: '', vibe: 'Chill', is_public: false },
            other: { event_name: '', event_date: null, event_time: '', event_category: '', description: '', custom_fields: {}, is_public: false }
        }
        return defaults[eventType] || {}
    }

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

    function openEventDetails(order) {
        setSelectedOrder(order)
        setCurrentEventType(order.eventType)
        const schema = getEventSchema(order.eventType)
        const defaults = {}
        schema.detailFields.forEach(field => {
            const fieldName = field.name
            const value = order.details?.[fieldName] ?? (field.type === 'checkbox' ? false : field.default || '')
            defaults[fieldName] = value
        })
        setBirthdayDetails(defaults)
        setShowDetailsModal(true)
    }

    async function saveEventDetails() {
        if (!selectedOrder) return

        const schema = getEventSchema(currentEventType)
        const tableName = schema.table

        // Prepare data for database
        const dbData = {}
        Object.entries(birthdayDetails).forEach(([key, value]) => {
            const fieldDef = schema.detailFields.find(f => f.name === key)
            if (!fieldDef) return
            const columnMap = {
                backgroundImage: 'background_image',
                heartMessage: 'heart_message',
                dateOfBirth: 'date_of_birth',
                audioUrl: 'audio_url'
            }
            const column = columnMap[key] || key
            if (Array.isArray(value)) {
                dbData[column] = JSON.stringify(value)
            } else if (key === 'is_public' || key === 'DJ_provided' || key === 'drinks_provided') {
                dbData[column] = Boolean(value)
            } else if (key === 'custom_fields' && typeof value === 'object') {
                dbData[column] = JSON.stringify(value)
            } else {
                dbData[column] = value
            }
        })
        dbData.updated_at = new Date().toISOString()

        try {
            const idValue = selectedOrder.eventId || selectedOrder.id
            const { error } = await supabase
                .from(tableName)
                .update(dbData)
                .eq('id', idValue)

            if (error) {
                console.log('Supabase update error:', error.message)
                alert('Failed to save details: ' + error.message)
                return
            }
            console.log('Updated event details successfully in Supabase!')
        } catch (err) {
            console.log('Could not save to Supabase:', err)
            alert('Error saving details')
        }

        setOrders(prevOrders => {
            return prevOrders.map(o => {
                if (o.id === selectedOrder.id) {
                    return { ...o, details: { ...o.details, ...birthdayDetails }, hasDetails: true }
                }
                return o
            })
        })

        setShowDetailsModal(false)
        alert('Event details saved successfully!')
    }

    async function handlePhotoUpload(e) {
        const files = Array.from(e.target.files)
        if (!files.length) return

        const maxPhotos = getMaxPhotos(selectedOrder?.package || 'free')
        const currentCount = birthdayDetails.photos.length

        if (currentCount + files.length > maxPhotos) {
            alert(`Maximum ${maxPhotos} photos allowed for ${selectedOrder?.package || 'free'} package`)
            return
        }

        for (const file of files) {
            if (file.size > 5 * 1024 * 1024) {
                alert('Each photo must be less than 5MB')
                return
            }
        }

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
                    uploadedUrls.push({
                        url: data.secure_url,
                        publicId: data.public_id,
                        tag: tag
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

    function removePhoto(index) {
        const newPhotos = [...birthdayDetails.photos]
        newPhotos.splice(index, 1)
        setBirthdayDetails({ ...birthdayDetails, photos: newPhotos })
    }

    async function handleBackgroundImageUpload(e) {
        const file = e.target.files[0]
        if (!file) return

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

    async function handleAudioUpload(e) {
        const file = e.target.files[0]
        if (!file) return

        if (file.size > 10 * 1024 * 1024) {
            alert('Audio must be less than 10MB')
            return
        }

        const formData = new FormData()
        formData.append('file', file)
        formData.append('upload_preset', 'ml_default')
        formData.append('resource_type', 'video')

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
                                    {user?.payment_reference_code && (
                                        <p className="text-xs md:text-sm text-purple-600 mt-1">
                                            <strong>Reference:</strong> <span className="font-mono bg-purple-100 px-2 py-0.5 rounded">{user.payment_reference_code}</span>
                                        </p>
                                    )}
                                </div>
                            </div>
                            <button
                                onClick={() => window.location.reload()}
                                className="px-3 md:px-4 py-1.5 md:py-2 bg-purple-500 text-white rounded-lg font-semibold hover:bg-purple-600 transition text-sm whitespace-nowrap"
                            >
                                Refresh Status
                            </button>
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
                    <div className="flex items-center gap-4">
                        {user?.package_tier && (
                            <div className={`flex items-center gap-1 md:gap-2 px-2 md:px-3 py-1 rounded-full text-xs md:text-sm font-semibold 
                                 ${user.package_tier === 'premium' ? 'bg-gradient-to-r from-rose-500 to-pink-500 text-white' :
                                    user.package_tier === 'enterprise' ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white' :
                                        user.package_tier === 'basic' ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-700'}`}>
                                <span>{user.package_name || user.package_tier?.toUpperCase()}</span>
                                {pendingUpgrade && (
                                    <span className="text-[10px] md:text-xs bg-purple-500 text-white px-1 rounded animate-pulse flex-shrink-0">↑</span>
                                )}
                                {user.payment_status !== 'confirmed' && user.package_tier !== 'free' && !pendingUpgrade && (
                                    <span className="text-[10px] md:text-xs bg-yellow-500 text-white px-1 rounded animate-pulse flex-shrink-0">!</span>
                                )}
                            </div>
                        )}
                        {user?.package_tier && user?.package_tier !== 'enterprise' && (
                            <button
                                onClick={() => navigate('/select-package?upgrade=true')}
                                className="text-[10px] md:text-xs opacity-80 hover:opacity-100 underline hidden md:inline"
                            >
                                Upgrade
                            </button>
                        )}
                        <button onClick={logout} className="text-rose-500 text-sm">Logout</button>
                    </div>
                </div>
            </div>

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
                    onClick={() => setShowCreateModal(true)}
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
                                            onClick={() => openEventDetails(order)}
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
                                        <button
                                            onClick={() => {
                                                setSelectedOrderForGift(order)
                                                setShowGiftOptions(true)
                                            }}
                                            className="text-xs bg-yellow-500 text-white px-3 py-2 rounded-full hover:bg-yellow-600 transition"
                                        >
                                            🎁 Send Gift
                                        </button>
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
                    <div className="bg-white rounded-3xl p-4 md:p-6 max-w-md w-full max-h-[90vh] overflow-y-auto">
                        <h3 className="text-xl font-bold text-gray-700 mb-4">Create New Event Page</h3>

                        <div className="space-y-3">
                            {/* Page Type Selection - Navigation Menu */}
                            <div>
                                <label className="block text-gray-600 mb-1 font-semibold text-sm">Select Event Type</label>

                                <div className="grid grid-cols-3 gap-2">
                                    <button
                                        onClick={() => setPageType('birthday')}
                                        className={`p-2 rounded-lg border-2 transition text-center ${pageType === 'birthday'
                                            ? 'border-rose-500 bg-rose-50'
                                            : 'border-gray-200 hover:border-rose-300'
                                            }`}
                                    >
                                        <div className="text-xl mb-1">🎂</div>
                                        <div className="font-semibold text-gray-700 text-xs">Birthday</div>
                                    </button>

                                    {(user?.package_tier === 'basic' || user?.package_tier === 'premium' || user?.package_tier === 'enterprise') && hasFeatureAccess(user.package_tier) ? (
                                        <button
                                            onClick={() => setPageType('wedding')}
                                            className={`p-2 rounded-lg border-2 transition text-center ${pageType === 'wedding'
                                                ? 'border-rose-500 bg-rose-50'
                                                : 'border-gray-200 hover:border-rose-300'
                                                }`}
                                        >
                                            <div className="text-xl mb-1">💒</div>
                                            <div className="font-semibold text-gray-700 text-xs">Wedding</div>
                                        </button>
                                    ) : (
                                        <button
                                            disabled
                                            className="p-2 rounded-lg border-2 border-gray-100 bg-gray-50 opacity-60 text-center"
                                        >
                                            <div className="text-xl mb-1">💒</div>
                                            <div className="font-semibold text-gray-400 text-xs">Wedding</div>
                                        </button>
                                    )}

                                    {(user?.package_tier === 'premium' || user?.package_tier === 'enterprise') && hasFeatureAccess(user.package_tier) ? (
                                        <button
                                            onClick={() => setPageType('anniversary')}
                                            className={`p-2 rounded-lg border-2 transition text-center ${pageType === 'anniversary'
                                                ? 'border-rose-500 bg-rose-50'
                                                : 'border-gray-200 hover:border-rose-300'
                                                }`}
                                        >
                                            <div className="text-xl mb-1">💕</div>
                                            <div className="font-semibold text-gray-700 text-xs">Anniversary</div>
                                        </button>
                                    ) : (
                                        <button
                                            disabled
                                            className="p-2 rounded-lg border-2 border-gray-100 bg-gray-50 opacity-60 text-center"
                                        >
                                            <div className="text-xl mb-1">💕</div>
                                            <div className="font-semibold text-gray-400 text-xs">Anniversary</div>
                                        </button>
                                    )}

                                    {(user?.package_tier === 'premium' || user?.package_tier === 'enterprise') && hasFeatureAccess(user.package_tier) ? (
                                        <button
                                            onClick={() => setPageType('graduation')}
                                            className={`p-2 rounded-lg border-2 transition text-center ${pageType === 'graduation'
                                                ? 'border-rose-500 bg-rose-50'
                                                : 'border-gray-200 hover:border-rose-300'
                                                }`}
                                        >
                                            <div className="text-xl mb-1">🎓</div>
                                            <div className="font-semibold text-gray-700 text-xs">Graduation</div>
                                        </button>
                                    ) : (
                                        <button
                                            disabled
                                            className="p-2 rounded-lg border-2 border-gray-100 bg-gray-50 opacity-60 text-center"
                                        >
                                            <div className="text-xl mb-1">🎓</div>
                                            <div className="font-semibold text-gray-400 text-xs">Graduation</div>
                                        </button>
                                    )}

                                    {user?.package_tier === 'enterprise' && hasFeatureAccess(user.package_tier) ? (
                                        <button
                                            onClick={() => setPageType('custom')}
                                            className={`p-2 rounded-lg border-2 transition text-center ${pageType === 'custom'
                                                ? 'border-rose-500 bg-rose-50'
                                                : 'border-gray-200 hover:border-rose-300'
                                                }`}
                                        >
                                            <div className="text-xl mb-1">✨</div>
                                            <div className="font-semibold text-gray-700 text-xs">Custom</div>
                                        </button>
                                    ) : (
                                        <button
                                            disabled
                                            className="p-2 rounded-lg border-2 border-gray-100 bg-gray-50 opacity-60 text-center"
                                        >
                                            <div className="text-xl mb-1">✨</div>
                                            <div className="font-semibold text-gray-400 text-xs">Custom</div>
                                        </button>
                                    )}
                                </div>

                                {user?.package_tier === 'free' && (
                                    <div className="mt-3 p-2 bg-blue-50 border border-blue-200 rounded-lg">
                                        <p className="text-xs text-blue-700">
                                            <strong>Upgrade</strong> to unlock more event types!
                                            <button
                                                onClick={() => { setShowCreateModal(false); navigate('/select-package'); }}
                                                className="underline font-semibold ml-1"
                                            >
                                                View Plans
                                            </button>
                                        </p>
                                    </div>
                                )}
                                {user?.package_tier && user?.package_tier !== 'free' && !hasFeatureAccess(user.package_tier) && (
                                    <div className="mt-3 p-2 bg-yellow-50 border border-yellow-200 rounded-lg">
                                        <p className="text-xs text-yellow-700">
                                            <strong>Payment pending:</strong> Features available after confirmation.
                                        </p>
                                    </div>
                                )}
                            </div>
                            <div>
                                <label className="block text-gray-600 mb-1 text-sm">Event Name</label>
                                <input
                                    type="text"
                                    value={recipientName}
                                    onChange={(e) => setRecipientName(e.target.value)}
                                    className="w-full p-2 border-2 border-rose-200 rounded-xl text-sm"
                                    placeholder="e.g., Sarah, Mama..."
                                />
                            </div>
                            <div>
                                <label className="block text-gray-600 mb-1 text-sm">Event Date</label>
                                <input
                                    type="date"
                                    value={eventDate}
                                    onChange={(e) => setEventDate(e.target.value)}
                                    className="w-full p-2 border-2 border-rose-200 rounded-xl text-sm"
                                />
                            </div>
                            <div>
                                <label className="block text-gray-600 mb-1 text-sm">Package</label>
                                <select
                                    value={selectedPackage}
                                    onChange={(e) => setSelectedPackage(e.target.value)}
                                    className="w-full p-2 border-2 border-rose-200 rounded-xl text-sm"
                                    disabled
                                >
                                    <option value={user?.package_tier || 'free'}>
                                        {user?.package_name?.toUpperCase() || (user?.package_tier || 'Free').toUpperCase()} Plan
                                    </option>
                                </select>
                                <p className="text-xs text-gray-500 mt-1">Tied to your account</p>
                            </div>
                        </div>

                        <div className="flex gap-2 mt-4">
                            <button
                                onClick={createEventPage}
                                className="flex-1 bg-rose-500 text-white py-2 px-4 rounded-xl font-semibold text-sm"
                            >
                                Create {pageType === 'birthday' ? 'Birthday' : pageType === 'wedding' ? 'Wedding' : pageType === 'anniversary' ? 'Anniversary' : pageType === 'graduation' ? 'Graduation' : 'Custom'} Page
                            </button>
                            <button
                                onClick={() => setShowCreateModal(false)}
                                className="px-4 bg-gray-200 text-gray-600 py-2 rounded-xl font-semibold text-sm"
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Birthday Details Modal */}
            {showDetailsModal && selectedOrder && (
                <div
                    className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto"
                    onClick={() => setShowDetailsModal(false)}
                >
                    <div
                        className="bg-white rounded-3xl p-6 max-w-2xl w-full my-8 relative"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Close button */}
                        <button
                            onClick={() => setShowDetailsModal(false)}
                            className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition text-2xl"
                            aria-label="Close"
                        >
                            ✕
                        </button>

                        <h3 className="text-xl font-bold text-gray-700 mb-2">
                            {getEventDisplay(currentEventType).celebrationName} Details
                        </h3>
                        <p className="text-sm text-gray-500 mb-4">
                            for {selectedOrder.recipientName} ({user?.package_tier?.toUpperCase() || 'FREE'} package)
                        </p>

                        <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
                            {/* Dynamic fields based on event type */}
                            {(() => {
                                const schema = getEventSchema(currentEventType)
                                return schema.detailFields.map(field => (
                                    <DynamicFieldRenderer
                                        key={field.name}
                                        field={field}
                                        value={birthdayDetails[field.name]}
                                        onChange={(name, val) => {
                                            setBirthdayDetails(prev => ({ ...prev, [name]: val }))
                                        }}
                                        onFileUpload={async (e, fieldName) => {
                                            // Handle file uploads for image/audio fields
                                            const file = e.target.files[0]
                                            if (!file) return
                                            const isAudio = field.type === 'file-audio'
                                            const resourceType = isAudio ? 'video' : 'image'
                                            const maxSize = isAudio ? 10 * 1024 * 1024 : 5 * 1024 * 1024
                                            if (file.size > maxSize) {
                                                alert(`File must be less than ${maxSize / (1024 * 1024)}MB`)
                                                return
                                            }
                                            const formData = new FormData()
                                            formData.append('file', file)
                                            formData.append('upload_preset', 'ml_default')
                                            if (resourceType === 'video') formData.append('resource_type', 'video')
                                            try {
                                                const res = await fetch(`https://api.cloudinary.com/v1_1/djjgkezui/${resourceType}/upload`, {
                                                    method: 'POST',
                                                    body: formData
                                                })
                                                const data = await res.json()
                                                if (data.secure_url) {
                                                    setBirthdayDetails(prev => ({ ...prev, [fieldName]: data.secure_url }))
                                                }
                                            } catch (err) {
                                                console.error('Upload error:', err)
                                            }
                                        }}
                                        maxPhotos={getMaxPhotos(selectedOrder.package)}
                                        currentPhotosCount={birthdayDetails.photos?.length || 0}
                                    />
                                ))
                            })()}
                        </div>

                        <div className="flex gap-3 mt-6">
                            <button
                                onClick={saveEventDetails}
                                className="flex-1 bg-rose-500 text-white py-3 rounded-xl font-semibold"
                            >
                                Save Details
                            </button>
                            {currentEventType === 'birthday' && (
                                <button
                                    onClick={() => setShowShareLink(true)}
                                    className="px-6 bg-green-500 text-white py-3 rounded-xl font-semibold"
                                >
                                    🔗 Share Link
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Share Link Modal */}
            {showShareLink && selectedOrder && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4">
                    <div className="bg-white rounded-3xl p-4 md:p-6 max-w-md w-full">
                        <h4 className="font-bold text-green-700 mb-2 text-lg">🎉 Share Your Page</h4>
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
                        <div className="mt-4 text-center">
                            <button
                                onClick={() => setShowShareLink(false)}
                                className="bg-gray-200 text-gray-600 px-4 py-2 rounded-xl font-semibold"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Gift Options Modal - Selection Menu Only */}
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
                            {/* Send a Code */}
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

                            {/* Scratch Card */}
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

                            {/* Order Products */}
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