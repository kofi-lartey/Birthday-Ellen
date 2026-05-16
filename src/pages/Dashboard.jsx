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
        loadEventsFromRegistry(currentUser.id)
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
                    code: registry.code,  // MAKE SURE THIS IS INCLUDED
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

    // In Dashboard.jsx, replace the createEventPage function with this:

    async function createEventPage() {
        if (!recipientName.trim() || !eventDate) {
            alert('Please fill in all fields')
            return
        }

        // Check package limits
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

        // Count user's existing events
        const userEvents = orders.filter(order => order.userId === user?.id || order.user_id === user?.id)
        if (userEvents.length >= maxPages) {
            alert(`Your current package (${userTier}) allows only ${maxPages} event(s). Please upgrade to create more events.`)
            navigate('/select-package?upgrade=true')
            return
        }

        const code = generateCode()

        // For birthday events
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

        // For non-birthday events
        const schema = getEventSchema(pageType)
        const tableName = schema.table
        const defaultValues = getDefaultValuesForType(pageType)

        // Add name field based on event type
        if (pageType === 'wedding') {
            defaultValues.couple_names = recipientName.trim()
        } else if (pageType === 'anniversary') {
            defaultValues.couple_names = recipientName.trim()
        } else if (pageType === 'party') {
            defaultValues.party_name = recipientName.trim()
        } else if (pageType === 'hangout') {
            defaultValues.hangout_name = recipientName.trim()
        } else if (pageType === 'other') {
            defaultValues.event_name = recipientName.trim()
        }

        // Update date field
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

        // Insert into specific event table
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
            alert(`Failed to create ${pageType} page: ${eventError?.message || 'Unknown error'}`)
            return
        }

        const eventId = eventResult.id

        // Insert into event_registry
        const { error: registryError } = await supabase
            .from('event_registry')
            .insert({
                user_id: user?.id,
                event_type: pageType,
                event_name: recipientName.trim(),
                event_date: eventDate,
                event_id: eventId,
                code: code,
                package: user?.package_tier || 'free',
                status: 'active',
                is_public: false,
                featured: false,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            })

        if (registryError) {
            console.error('Failed to create registry entry:', registryError)
            await supabase.from(tableName).delete().eq('id', eventId)
            alert(`Failed to create ${pageType} page: ${registryError.message}`)
            return
        }

        alert(`${pageType.charAt(0).toUpperCase() + pageType.slice(1)} page created successfully! Code: ${code}`)
        setShowCreateModal(false)
        setRecipientName('')
        setEventDate('')
        setPageType('birthday')
        loadEventsFromRegistry(user?.id)
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
        console.log('Opening details for:', order.eventType, order)
        setSelectedOrder(order)
        setCurrentEventType(order.eventType)

        // Load existing details
        const currentDetails = { ...order.details }

        // Ensure photos is ALWAYS an array
        if (!currentDetails.photos || typeof currentDetails.photos !== 'object' || !Array.isArray(currentDetails.photos)) {
            currentDetails.photos = []
        }

        // Ensure other fields have defaults
        if (!currentDetails.backgroundImage) currentDetails.backgroundImage = ''
        if (!currentDetails.heartMessage) currentDetails.heartMessage = 'My heart belongs to you'
        if (!currentDetails.letter) currentDetails.letter = ''
        if (!currentDetails.nickname) currentDetails.nickname = ''
        if (!currentDetails.audioUrl) currentDetails.audioUrl = ''
        if (!currentDetails.dateOfBirth) currentDetails.dateOfBirth = ''

        setBirthdayDetails(currentDetails)
        setShowDetailsModal(true)
    }

    async function saveEventDetails() {
        if (!selectedOrder) return

        // Prepare data for event_registry
        const updateData = {
            background_image: birthdayDetails.backgroundImage || null,
            heart_message: birthdayDetails.heartMessage || null,
            date_of_birth: birthdayDetails.dateOfBirth || null,
            letter: birthdayDetails.letter || null,
            nickname: birthdayDetails.nickname || null,
            audio_url: birthdayDetails.audioUrl || null,
            photos: birthdayDetails.photos ? JSON.stringify(birthdayDetails.photos) : null,
            updated_at: new Date().toISOString()
        }

        // Update event_registry
        const { error } = await supabase
            .from('event_registry')
            .update(updateData)
            .eq('id', selectedOrder.registryId || selectedOrder.id)

        if (error) {
            console.error('Failed to save details:', error)
            alert('Failed to save details: ' + error.message)
            return
        }

        // For non-birthday events, also update the specific table
        if (selectedOrder.eventType !== 'birthday') {
            const schema = getEventSchema(selectedOrder.eventType)
            const tableName = schema.table

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

            const { error: detailError } = await supabase
                .from(tableName)
                .update(dbData)
                .eq('id', selectedOrder.eventId)

            if (detailError) {
                console.error('Failed to save detailed data:', detailError)
            }
        }

        // Update local state
        setOrders(prevOrders => {
            return prevOrders.map(o => {
                if (o.id === selectedOrder.id) {
                    return {
                        ...o,
                        details: { ...o.details, ...birthdayDetails },
                        hasDetails: true
                    }
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

        const maxPhotos = getMaxPhotos(selectedOrder?.package)
        const currentPhotos = Array.isArray(birthdayDetails.photos) ? birthdayDetails.photos : []
        const currentCount = currentPhotos.length

        if (currentCount + files.length > maxPhotos) {
            alert(`Maximum ${maxPhotos} photos allowed`)
            return
        }

        const uploadedUrls = []
        for (const file of files) {
            if (file.size > 5 * 1024 * 1024) {
                alert('Each photo must be less than 5MB')
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
                    uploadedUrls.push({
                        url: data.secure_url,
                        publicId: data.public_id
                    })
                }
            } catch (err) {
                console.error('Upload error:', err)
            }
        }

        if (uploadedUrls.length > 0) {
            setBirthdayDetails({
                ...birthdayDetails,
                photos: [...currentPhotos, ...uploadedUrls]
            })
        }
    }

    function removePhoto(index) {
        const currentPhotos = Array.isArray(birthdayDetails.photos) ? birthdayDetails.photos : []
        const newPhotos = [...currentPhotos]
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
                                {pendingUpgrade && (
                                    <span className="text-[10px] bg-purple-500 text-white px-1 rounded animate-pulse">↑</span>
                                )}
                                {user.payment_status !== 'confirmed' && user.package_tier !== 'free' && !pendingUpgrade && (
                                    <span className="text-[10px] bg-yellow-500 text-white px-1 rounded animate-pulse">!</span>
                                )}
                            </div>
                        )}
                        {user?.package_tier && user?.package_tier !== 'enterprise' && (
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
                                    <div className="mt-4 flex gap-2 flex-wrap">
                                        {/* View Page */}
                                        <Link
                                            to={`/event/${order.code}`}
                                            className="text-[10px] sm:text-xs bg-rose-500 text-white px-2 sm:px-3 py-1.5 sm:py-2 rounded-full hover:bg-rose-600 transition"
                                        >
                                            👁️ View
                                        </Link>

                                        {/* Add Photos */}
                                        <Link
                                            to={`/upload/${order.code}`}
                                            className="text-[10px] sm:text-xs bg-purple-500 text-white px-2 sm:px-3 py-1.5 sm:py-2 rounded-full hover:bg-purple-600 transition"
                                        >
                                            📷 Photos
                                        </Link>

                                        {/* Slideshow */}
                                        <Link
                                            to={`/slideshow/${order.code}`}
                                            className="text-[10px] sm:text-xs bg-blue-500 text-white px-2 sm:px-3 py-1.5 sm:py-2 rounded-full hover:bg-blue-600 transition"
                                        >
                                            🎬 Slideshow
                                        </Link>

                                        {/* Edit Details */}
                                        <Link
                                            to={`/edit-event/${order.code || order.id}`}
                                            className="text-[10px] sm:text-xs bg-amber-500 text-white px-2 sm:px-3 py-1.5 sm:py-2 rounded-full hover:bg-amber-600 transition"
                                        >
                                            ✏️ {order.hasDetails ? 'Edit' : 'Add'}
                                        </Link>

                                        {/* Send Gift */}
                                        {order.code && (
                                            <button
                                                onClick={() => {
                                                    setSelectedOrderForGift(order);
                                                    setShowGiftOptions(true);
                                                }}
                                                className="text-[10px] sm:text-xs bg-yellow-500 text-white px-2 sm:px-3 py-1.5 sm:py-2 rounded-full hover:bg-yellow-600 transition"
                                            >
                                                🎁 Gift
                                            </button>
                                        )}
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
                            {/* Page Type Selection */}
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

            {/* Event Details Modal */}
            {/* Details Modal */}
            {showDetailsModal && selectedOrder && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto" onClick={() => setShowDetailsModal(false)}>
                    <div className="bg-white rounded-3xl p-6 max-w-2xl w-full my-8 relative" onClick={(e) => e.stopPropagation()}>
                        <button onClick={() => setShowDetailsModal(false)} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 text-2xl">✕</button>

                        <h3 className="text-xl font-bold text-gray-700 mb-2">
                            {getEventDisplay(currentEventType)?.celebrationName || currentEventType} Details
                        </h3>
                        <p className="text-sm text-gray-500 mb-4">for {selectedOrder.recipientName} ({user?.package_tier?.toUpperCase() || 'FREE'} package)</p>

                        <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
                            {currentEventType === 'birthday' ? (
                                // ACTUAL BIRTHDAY FORM FIELDS - NOT PLACEHOLDER TEXT
                                <>
                                    <div>
                                        <label className="block text-gray-600 mb-2">Background Image</label>
                                        <input
                                            type="file"
                                            accept="image/*"
                                            onChange={handleBackgroundImageUpload}
                                            className="w-full p-2 border-2 border-rose-200 rounded-xl text-sm"
                                        />
                                        <p className="text-xs text-gray-500 mt-1">or enter URL below</p>
                                        <input
                                            type="url"
                                            value={birthdayDetails.backgroundImage || ''}
                                            onChange={(e) => setBirthdayDetails({ ...birthdayDetails, backgroundImage: e.target.value })}
                                            className="w-full mt-2 p-2 border-2 border-rose-200 rounded-xl text-sm"
                                            placeholder="https://example.com/background.jpg"
                                        />
                                        {birthdayDetails.backgroundImage && (
                                            <img src={birthdayDetails.backgroundImage} alt="Background" className="mt-2 w-full h-32 object-cover rounded-xl" />
                                        )}
                                    </div>

                                    <div>
                                        <label className="block text-gray-600 mb-2">Heart Message</label>
                                        <input
                                            type="text"
                                            value={birthdayDetails.heartMessage || ''}
                                            onChange={(e) => setBirthdayDetails({ ...birthdayDetails, heartMessage: e.target.value })}
                                            className="w-full p-3 border-2 border-rose-200 rounded-xl text-sm"
                                            placeholder="My heart belongs to you"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-gray-600 mb-2">Nickname</label>
                                        <input
                                            type="text"
                                            value={birthdayDetails.nickname || ''}
                                            onChange={(e) => setBirthdayDetails({ ...birthdayDetails, nickname: e.target.value })}
                                            className="w-full p-3 border-2 border-rose-200 rounded-xl text-sm"
                                            placeholder="e.g., Babe, Love, My Queen..."
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-gray-600 mb-2">Date of Birth (for countdown)</label>
                                        <input
                                            type="date"
                                            value={birthdayDetails.dateOfBirth || ''}
                                            onChange={(e) => setBirthdayDetails({ ...birthdayDetails, dateOfBirth: e.target.value })}
                                            className="w-full p-3 border-2 border-rose-200 rounded-xl text-sm"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-gray-600 mb-2">Letter to the Birthday Person</label>
                                        <textarea
                                            value={birthdayDetails.letter || ''}
                                            onChange={(e) => setBirthdayDetails({ ...birthdayDetails, letter: e.target.value })}
                                            className="w-full p-3 border-2 border-rose-200 rounded-xl text-sm"
                                            rows={5}
                                            placeholder="Write a heartfelt letter..."
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-gray-600 mb-2">Background Music</label>
                                        <input
                                            type="file"
                                            accept="audio/*"
                                            onChange={handleAudioUpload}
                                            className="w-full p-2 border-2 border-rose-200 rounded-xl text-sm"
                                        />
                                        <p className="text-xs text-gray-500 mt-1">or enter URL below</p>
                                        <input
                                            type="url"
                                            value={birthdayDetails.audioUrl || ''}
                                            onChange={(e) => setBirthdayDetails({ ...birthdayDetails, audioUrl: e.target.value })}
                                            className="w-full mt-2 p-2 border-2 border-rose-200 rounded-xl text-sm"
                                            placeholder="https://example.com/song.mp3"
                                        />
                                        {birthdayDetails.audioUrl && (
                                            <audio src={birthdayDetails.audioUrl} controls className="mt-2 w-full" />
                                        )}
                                    </div>

                                    <div>
                                        <label className="block text-gray-600 mb-2">
                                            Photo Gallery ({Array.isArray(birthdayDetails.photos) ? birthdayDetails.photos.length : 0}/{getMaxPhotos(selectedOrder.package)})
                                        </label>
                                        <input
                                            type="file"
                                            accept="image/*"
                                            multiple
                                            onChange={handlePhotoUpload}
                                            className="w-full p-2 border-2 border-rose-200 rounded-xl text-sm"
                                        />
                                        <div className="grid grid-cols-3 gap-2 mt-3">
                                            {Array.isArray(birthdayDetails.photos) && birthdayDetails.photos.map((photo, idx) => (
                                                <div key={idx} className="relative">
                                                    <img src={photo.url} alt={`Photo ${idx + 1}`} className="w-full h-24 object-cover rounded-lg" />
                                                    <button
                                                        onClick={() => removePhoto(idx)}
                                                        className="absolute top-1 right-1 bg-red-500 text-white rounded-full w-5 h-5 text-xs hover:bg-red-600"
                                                    >
                                                        ×
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </>
                            ) : (
                                // For other event types (wedding, anniversary, party, hangout, other)
                                (() => {
                                    const schema = getEventSchema(currentEventType)
                                    return schema.detailFields?.map(field => {
                                        if (field.type === 'hidden') return null

                                        // Handle different field types
                                        if (field.type === 'checkbox') {
                                            return (
                                                <div key={field.name} className="flex items-start gap-3 p-3 border-2 border-rose-200 rounded-xl">
                                                    <input
                                                        type="checkbox"
                                                        checked={birthdayDetails[field.name] || false}
                                                        onChange={(e) => setBirthdayDetails(prev => ({ ...prev, [field.name]: e.target.checked }))}
                                                        className="mt-1 w-5 h-5 accent-rose-500"
                                                    />
                                                    <div>
                                                        <label className="text-gray-700 font-medium">{field.label}</label>
                                                        {field.helpText && <p className="text-xs text-gray-500">{field.helpText}</p>}
                                                    </div>
                                                </div>
                                            )
                                        }

                                        if (field.type === 'select') {
                                            return (
                                                <div key={field.name}>
                                                    <label className="block text-gray-600 mb-2">{field.label}</label>
                                                    <select
                                                        value={birthdayDetails[field.name] || ''}
                                                        onChange={(e) => setBirthdayDetails(prev => ({ ...prev, [field.name]: e.target.value }))}
                                                        className="w-full p-3 border-2 border-rose-200 rounded-xl text-sm"
                                                    >
                                                        <option value="">{field.placeholder || 'Select...'}</option>
                                                        {field.options?.map(opt => (
                                                            <option key={opt} value={opt}>{opt}</option>
                                                        ))}
                                                    </select>
                                                    {field.helpText && <p className="text-xs text-gray-500 mt-1">{field.helpText}</p>}
                                                </div>
                                            )
                                        }

                                        if (field.type === 'textarea') {
                                            return (
                                                <div key={field.name}>
                                                    <label className="block text-gray-600 mb-2">{field.label} {field.required && <span className="text-red-500">*</span>}</label>
                                                    <textarea
                                                        value={birthdayDetails[field.name] || ''}
                                                        onChange={(e) => setBirthdayDetails(prev => ({ ...prev, [field.name]: e.target.value }))}
                                                        className="w-full p-3 border-2 border-rose-200 rounded-xl text-sm"
                                                        rows={field.rows || 4}
                                                        placeholder={field.placeholder}
                                                    />
                                                    {field.helpText && <p className="text-xs text-gray-500 mt-1">{field.helpText}</p>}
                                                </div>
                                            )
                                        }

                                        if (field.type === 'file-image' || field.type === 'file-audio') {
                                            const isAudio = field.type === 'file-audio'
                                            return (
                                                <div key={field.name}>
                                                    <label className="block text-gray-600 mb-2">{field.label}</label>
                                                    <input
                                                        type="file"
                                                        accept={field.accept}
                                                        onChange={async (e) => {
                                                            const file = e.target.files[0]
                                                            if (!file) return
                                                            const formData = new FormData()
                                                            formData.append('file', file)
                                                            formData.append('upload_preset', 'ml_default')
                                                            if (isAudio) formData.append('resource_type', 'video')
                                                            try {
                                                                const res = await fetch(`https://api.cloudinary.com/v1_1/djjgkezui/${isAudio ? 'video' : 'image'}/upload`, {
                                                                    method: 'POST',
                                                                    body: formData
                                                                })
                                                                const data = await res.json()
                                                                if (data.secure_url) {
                                                                    setBirthdayDetails(prev => ({ ...prev, [field.name]: data.secure_url }))
                                                                }
                                                            } catch (err) {
                                                                console.error('Upload error:', err)
                                                            }
                                                        }}
                                                        className="w-full p-2 border-2 border-rose-200 rounded-xl text-sm"
                                                    />
                                                    <p className="text-xs text-gray-500 text-center">or enter URL below</p>
                                                    <input
                                                        type="url"
                                                        value={birthdayDetails[field.name] || ''}
                                                        onChange={(e) => setBirthdayDetails(prev => ({ ...prev, [field.name]: e.target.value }))}
                                                        className="w-full mt-2 p-2 border-2 border-rose-200 rounded-xl text-sm"
                                                        placeholder={field.placeholder}
                                                    />
                                                    {field.helpText && <p className="text-xs text-gray-500 mt-1">{field.helpText}</p>}
                                                </div>
                                            )
                                        }

                                        // Default text/number/date input
                                        return (
                                            <div key={field.name}>
                                                <label className="block text-gray-600 mb-2">{field.label} {field.required && <span className="text-red-500">*</span>}</label>
                                                <input
                                                    type={field.type || 'text'}
                                                    value={birthdayDetails[field.name] || ''}
                                                    onChange={(e) => setBirthdayDetails(prev => ({ ...prev, [field.name]: e.target.value }))}
                                                    className="w-full p-3 border-2 border-rose-200 rounded-xl text-sm"
                                                    placeholder={field.placeholder}
                                                />
                                                {field.helpText && <p className="text-xs text-gray-500 mt-1">{field.helpText}</p>}
                                            </div>
                                        )
                                    })
                                })()
                            )}
                        </div>

                        <div className="flex gap-3 mt-6">
                            <button onClick={saveEventDetails} className="flex-1 bg-rose-500 text-white py-3 rounded-xl font-semibold hover:bg-rose-600 transition">
                                Save Details
                            </button>
                            {currentEventType === 'birthday' && selectedOrder.code && (
                                <button onClick={() => setShowShareLink(true)} className="px-6 bg-green-500 text-white py-3 rounded-xl font-semibold hover:bg-green-600 transition">
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