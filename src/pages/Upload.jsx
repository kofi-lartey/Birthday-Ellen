import { useState, useEffect, useRef } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { supabase, cloudinaryConfig, STORAGE_KEYS } from '../supabase'

function Upload() {
    const navigate = useNavigate()
    const { code } = useParams() // Get event code from URL
    const [uploadedPhotos, setUploadedPhotos] = useState([])
    const [messages, setMessages] = useState([])
    const [senderName, setSenderName] = useState('')
    const [selectedPhoto, setSelectedPhoto] = useState('')
    const [messageText, setMessageText] = useState('')
    const [isUploading, setIsUploading] = useState(false)
    const [notification, setNotification] = useState('')
    const [shareLink, setShareLink] = useState('')
    const [orderCode, setOrderCode] = useState(code || '')
    const [eventType, setEventType] = useState('birthday')
    const [eventName, setEventName] = useState('')
    const [maxPhotos, setMaxPhotos] = useState(5)
    const [rememberName, setRememberName] = useState(true)
    const [currentUser, setCurrentUser] = useState(null)
    const [isLoading, setIsLoading] = useState(false)

    const cloudinaryRef = useRef()
    const widgetRef = useRef()
    const uploadedUrlsSet = useRef(new Set()) // Track uploaded URLs to prevent duplicates

    // Load saved user name from localStorage on mount
    useEffect(() => {
        // Load current user from localStorage
        const user = JSON.parse(localStorage.getItem(STORAGE_KEYS.CURRENT_USER) || 'null')
        if (user) {
            setCurrentUser(user)
            // If user is logged in, use their name as default
            if (user.name) {
                setSenderName(user.name)
            }
        }
        
        // Load saved guest name from localStorage
        const savedName = localStorage.getItem('guest_sender_name')
        if (savedName && !user?.name) {
            setSenderName(savedName)
        }
        
        // Load remember preference
        const savedPreference = localStorage.getItem('remember_sender_name')
        if (savedPreference !== null) {
            setRememberName(savedPreference === 'true')
        }
    }, [])

    useEffect(() => {
        // If there's a code in URL, load photos/messages for that specific event
        if (code) {
            setOrderCode(code)
            loadEventData(code)
        } else {
            // Load from general localStorage (for dashboard uploads)
            const photos = JSON.parse(localStorage.getItem(STORAGE_KEYS.PHOTOS) || '[]')
            setUploadedPhotos(photos)

            const msgs = JSON.parse(localStorage.getItem(STORAGE_KEYS.MESSAGES) || '[]')
            setMessages(msgs)
        }

        // Load Cloudinary widget script
        const script = document.createElement('script')
        script.src = 'https://upload-widget.cloudinary.com/global/all.js'
        script.onload = initCloudinaryWidget
        document.body.appendChild(script)

        return () => {
            if (widgetRef.current) {
                widgetRef.current.destroy()
            }
        }
    }, [code])

    async function loadEventData(eventCode) {
        try {
            setIsLoading(true)
            // Fetch event from registry using code
            const { data: event, error } = await supabase
                .from('event_registry')
                .select('*')
                .eq('code', eventCode)
                .single()

            if (error) {
                console.error('Error loading event:', error)
                return
            }

            setEventType(event.event_type)
            setEventName(event.event_name)
            
            // Get package to determine photo limit
            const packageLimits = {
                free: 5,
                basic: 15,
                premium: 50,
                enterprise: 100
            }
            setMaxPhotos(packageLimits[event.package] || 5)

            await loadPhotosFromSupabase()

        } catch (err) {
            console.error('Error loading event data:', err)
        } finally {
            setIsLoading(false)
        }
    }

    async function loadPhotosFromSupabase() {
        try {
            const { data: photosData, error: photosError } = await supabase
                .from('photos')
                .select('*')
                .eq('order_code', orderCode)
                .order('created_at', { ascending: false })

            console.log('All photos loaded from Supabase:', photosData?.length || 0)

            if (!photosError && photosData) {
                // Reset the URL set to avoid duplicates
                uploadedUrlsSet.current.clear()
                
                // Separate gallery photos (uploaded photos)
                const galleryPhotos = photosData.filter(p => p.tag === 'gallery')
                console.log('Gallery photos found:', galleryPhotos.length)
                
                const photoObjects = galleryPhotos.map(p => {
                    // Add URL to set to track
                    uploadedUrlsSet.current.add(p.image_url)
                    return { 
                        url: p.image_url, 
                        tag: 'gallery',
                        uploadedAt: p.created_at 
                    }
                })
                setUploadedPhotos(photoObjects)
                
                // Update localStorage
                if (orderCode) {
                    localStorage.setItem(`${STORAGE_KEYS.PHOTOS}_${orderCode}`, JSON.stringify(photoObjects))
                }
                
                // Slideshow messages (messages with photos)
                const slideshowMessages = photosData.filter(p => p.tag === 'slideshow')
                console.log('Slideshow messages found:', slideshowMessages.length)
                
                const messagesList = slideshowMessages.map(p => ({
                    name: p.name || 'Someone Special',
                    photo: p.image_url,
                    message: p.message || 'Happy Celebration!',
                    date: p.created_at
                }))
                setMessages(messagesList)
                
                // Update localStorage for messages
                if (orderCode) {
                    localStorage.setItem(`${STORAGE_KEYS.MESSAGES}_${orderCode}`, JSON.stringify(messagesList))
                }
            }
        } catch (err) {
            console.error('Error loading photos from Supabase:', err)
        }
    }

    async function generateShareLink() {
        if (orderCode) {
            const link = `${window.location.origin}/upload/${orderCode}`
            setShareLink(link)
            navigator.clipboard.writeText(link)
            showNotification('Link copied to clipboard! 🔗')
        } else {
            showNotification('No event found. Please create an event first.')
        }
    }

    function initCloudinaryWidget() {
        if (window.cloudinary) {
            cloudinaryRef.current = window.cloudinary

            widgetRef.current = window.cloudinary.createUploadWidget({
                cloudName: cloudinaryConfig.cloudName,
                uploadPreset: cloudinaryConfig.uploadPreset,
                sources: ['local', 'camera'],
                maxFileSize: 5000000,
                maxFiles: 10,
                clientAllowedFormats: ['jpg', 'jpeg', 'png', 'gif'],
                styles: {
                    palette: {
                        window: "#FFFFFF",
                        windowBorder: "#F472B6",
                        tabIcon: "#EC4899",
                        menuIcons: "#F472B6",
                        textDark: "#333333",
                        textLight: "#FFFFFF",
                        link: "#EC4899",
                        action: "#EC4899",
                        inactiveTabIcon: "#9CA3AF",
                        error: "#EF4444",
                        inProgress: "#EC4899",
                        complete: "#10B981",
                        sourceBg: "#F3F4F6"
                    }
                }
            }, handleUpload)
        }
    }

    function handleUpload(error, result) {
        if (!error && result && result.event === "success") {
            const imageUrl = result.info.secure_url
            // Check if URL already added to prevent duplicates
            if (!uploadedUrlsSet.current.has(imageUrl)) {
                uploadedUrlsSet.current.add(imageUrl)
                addPhoto(imageUrl)
            }
        }

        if (result && result.event === "batch-complete") {
            setIsUploading(false)
            showNotification(`${result.info.files.length} photos uploaded! 📸`)
            // Reload photos from Supabase to ensure sync
            setTimeout(() => {
                loadPhotosFromSupabase()
            }, 500)
        }

        if (error) {
            setIsUploading(false)
            console.error('Upload error:', error)
        }
    }

    function openUploadWidget() {
        setIsUploading(true)
        if (widgetRef.current) {
            widgetRef.current.open()
        } else {
            document.getElementById('fileInput').click()
        }
    }

    function handleFileUpload(e) {
        const files = e.target.files
        if (!files || files.length === 0) return

        console.log(`Selected ${files.length} files to upload`)
        setIsUploading(true)

        let uploadedCount = 0
        Array.from(files).forEach(file => {
            if (file.size > 5 * 1024 * 1024) {
                alert(`File ${file.name} is too large! Max 5MB`)
                return
            }

            const formData = new FormData()
            formData.append('file', file)
            formData.append('upload_preset', cloudinaryConfig.uploadPreset)

            fetch(`https://api.cloudinary.com/v1_1/${cloudinaryConfig.cloudName}/image/upload`, {
                method: 'POST',
                body: formData
            })
                .then(res => res.json())
                .then(data => {
                    if (data.secure_url) {
                        const imageUrl = data.secure_url
                        // Check if URL already added to prevent duplicates
                        if (!uploadedUrlsSet.current.has(imageUrl)) {
                            uploadedUrlsSet.current.add(imageUrl)
                            addPhoto(imageUrl)
                        }
                        uploadedCount++
                        if (uploadedCount === files.length) {
                            setIsUploading(false)
                            showNotification(`${files.length} photos uploaded! 📸`)
                            // Reload photos from Supabase
                            setTimeout(() => {
                                loadPhotosFromSupabase()
                            }, 500)
                        }
                    }
                })
                .catch(err => {
                    console.error('Upload error:', err)
                })
        })

        e.target.value = ''
    }

    async function addPhoto(url) {
        if (uploadedPhotos.length >= maxPhotos) {
            showNotification(`Photo limit reached (${maxPhotos})! Upgrade your package for more uploads.`)
            return
        }

        const newPhoto = { url: url, tag: 'gallery', uploadedAt: new Date().toISOString() }
        
        // Update state immediately for UI feedback
        setUploadedPhotos(prev => {
            // Check if photo already exists in state
            if (prev.some(p => p.url === url)) {
                return prev
            }
            const newPhotos = [...prev, newPhoto]
            // Update localStorage
            if (orderCode) {
                localStorage.setItem(`${STORAGE_KEYS.PHOTOS}_${orderCode}`, JSON.stringify(newPhotos))
            }
            return newPhotos
        })
        
        // Save to Supabase
        try {
            const { error } = await supabase
                .from('photos')
                .insert([{
                    order_code: orderCode,
                    image_url: url,
                    tag: 'gallery',
                    created_at: new Date().toISOString()
                }])
            if (error) {
                console.log('Supabase save error:', error.message)
            }
        } catch (error) {
            console.error('Error saving to Supabase:', error)
        }
    }

    async function removePhoto(index) {
        if (confirm('Remove this photo?')) {
            const photo = uploadedPhotos[index]
            const newPhotos = [...uploadedPhotos]
            newPhotos.splice(index, 1)
            setUploadedPhotos(newPhotos)
            
            // Remove from URL tracking set
            if (photo.url) {
                uploadedUrlsSet.current.delete(photo.url)
            }
            
            if (orderCode) {
                localStorage.setItem(`${STORAGE_KEYS.PHOTOS}_${orderCode}`, JSON.stringify(newPhotos))
            }
            
            // Delete from Supabase
            if (photo.url) {
                await deleteFromSupabase(photo.url)
            }
        }
    }

    async function deleteFromSupabase(imageUrl) {
        try {
            await supabase
                .from('photos')
                .delete()
                .eq('image_url', imageUrl)
                .eq('order_code', orderCode)
        } catch (error) {
            console.error('Error deleting from Supabase:', error)
        }
    }

    async function submitMessage(e) {
        e.preventDefault()

        if (!selectedPhoto) {
            alert('Please select a photo!')
            return
        }

        const finalName = senderName.trim() || 'Someone Special'
        const finalMessage = messageText.trim() || `Happy ${eventType === 'birthday' ? 'Birthday' : eventType === 'wedding' ? 'Wedding' : 'Celebration'}!`

        // Save the name for future use if remember is checked
        if (rememberName && finalName !== 'Someone Special') {
            localStorage.setItem('guest_sender_name', finalName)
        } else if (!rememberName) {
            localStorage.removeItem('guest_sender_name')
        }
        
        // Save remember preference
        localStorage.setItem('remember_sender_name', rememberName.toString())

        const newMessage = {
            name: finalName,
            photo: selectedPhoto,
            message: finalMessage,
            date: new Date().toISOString()
        }

        const newMessages = [newMessage, ...messages]
        setMessages(newMessages)
        
        if (orderCode) {
            localStorage.setItem(`${STORAGE_KEYS.MESSAGES}_${orderCode}`, JSON.stringify(newMessages))
        }

        // Save to Supabase
        await saveMessageToSupabase(newMessage)

        // Reset form (but keep name if remember is checked)
        setMessageText('')
        setSelectedPhoto('')
        if (!rememberName) {
            setSenderName('')
        }

        showNotification(`Message added to ${eventType} slideshow! 💌`)
    }

    async function saveMessageToSupabase(message) {
        try {
            const { error } = await supabase
                .from('photos')
                .insert([{
                    order_code: orderCode,
                    image_url: message.photo,
                    name: message.name,
                    message: message.message,
                    tag: 'slideshow',
                    created_at: message.date
                }])
            if (error) {
                console.log('Supabase save error:', error.message)
            }
        } catch (error) {
            console.error('Error saving message to Supabase:', error)
        }
    }

    async function deleteMessage(index) {
        if (confirm('Delete this message?')) {
            const msg = messages[index]
            const newMessages = [...messages]
            newMessages.splice(index, 1)
            setMessages(newMessages)
            
            if (orderCode) {
                localStorage.setItem(`${STORAGE_KEYS.MESSAGES}_${orderCode}`, JSON.stringify(newMessages))
            }

            if (msg && msg.photo) {
                await deleteFromSupabase(msg.photo)
            }
        }
    }

    function clearSavedName() {
        localStorage.removeItem('guest_sender_name')
        setSenderName(currentUser?.name || '')
        showNotification('Saved name cleared!')
    }

    function showNotification(msg) {
        setNotification(msg)
        setTimeout(() => setNotification(''), 3000)
    }

    // Get celebration emoji based on event type
    const getCelebrationEmoji = () => {
        const emojis = {
            birthday: '🎂',
            wedding: '💍',
            anniversary: '💕',
            party: '🎉',
            hangout: '👋',
            other: '📅'
        }
        return emojis[eventType] || '🎂'
    }

    // Get celebration title based on event type
    const getCelebrationTitle = () => {
        const titles = {
            birthday: 'Share Your Love!',
            wedding: 'Share Your Wishes!',
            anniversary: 'Share Your Congratulations!',
            party: 'Share the Excitement!',
            hangout: 'Share the Vibes!',
            other: 'Share Your Wishes!'
        }
        return titles[eventType] || 'Share Your Love!'
    }

    // Get message placeholder based on event type
    const getMessagePlaceholder = () => {
        const placeholders = {
            birthday: 'Write something sweet for their birthday...',
            wedding: 'Write your wedding wishes...',
            anniversary: 'Write your anniversary wishes...',
            party: 'Write something fun...',
            hangout: 'Write something cool...',
            other: 'Write your wishes...'
        }
        return placeholders[eventType] || 'Write something sweet...'
    }

    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #fce7f3 0%, #fbcfe8 100%)' }}>
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-rose-500 mx-auto mb-4"></div>
                    <p className="text-gray-600">Loading...</p>
                </div>
            </div>
        )
    }

    return (
        <div className="p-4 md:p-6 min-h-screen" style={{ background: 'linear-gradient(135deg, #fce7f3 0%, #fbcfe8 100%)' }}>
            {/* Back Button */}
            <button
                onClick={() => navigate('/dashboard')}
                className="fixed top-4 left-4 bg-white/80 text-rose-500 px-4 py-2 rounded-full text-sm hover:bg-rose-100 transition shadow-lg z-40"
            >
                ← Dashboard
            </button>

            {/* Generate Link Button */}
            <button
                onClick={generateShareLink}
                className="fixed top-4 right-4 bg-gradient-to-r from-rose-500 to-pink-500 text-white px-4 py-2 rounded-full text-sm hover:shadow-lg transition z-40"
            >
                🔗 Share This Page
            </button>

            {/* Share Link Display */}
            {shareLink && (
                <div className="fixed bottom-4 left-1/2 transform -translate-x-1/2 bg-white px-4 py-2 rounded-full shadow-lg z-50">
                    <p className="text-sm text-gray-600">Link copied! Share: <span className="text-rose-500">{shareLink}</span></p>
                </div>
            )}

            {/* Notification */}
            {notification && (
                <div className="fixed top-4 right-4 bg-rose-500 text-white px-4 py-2 rounded-full shadow-lg z-50">
                    {notification}
                </div>
            )}

            <div className="max-w-6xl mx-auto">
                {/* Header */}
                <div className="text-center mb-8 pt-8">
                    <div className="text-6xl mb-4 animate-float">{getCelebrationEmoji()}</div>
                    <h1 className="text-4xl md:text-5xl font-['Dancing_Script'] text-rose-500 mb-4">{getCelebrationTitle()}</h1>
                    <p className="text-gray-600 text-lg">for <span className="font-bold text-rose-500">{eventName || 'the celebration'}</span> 💕</p>
                </div>

                {/* Two Column Layout */}
                <div className="grid md:grid-cols-2 gap-6">
                    {/* Left Side: Upload Photo */}
                    <div className="bg-white rounded-3xl shadow-xl p-6 md:p-8">
                        <h2 className="text-2xl font-bold text-gray-700 mb-6 text-center">📸 Upload Your Photo</h2>

                        <div
                            className="upload-zone rounded-2xl p-8 text-center cursor-pointer"
                            onClick={openUploadWidget}
                        >
                            <div className="text-6xl mb-4">📤</div>
                            <p className="text-xl text-gray-600 font-semibold">Tap to Upload Photos</p>
                            <p className="text-gray-400 text-sm mt-2">Max 5MB each • JPG, PNG, GIF • Select multiple files</p>
                            <p className="text-rose-500 text-sm mt-2 font-semibold">Limit: {uploadedPhotos.length}/{maxPhotos} photos</p>
                        </div>

                        <input
                            type="file"
                            id="fileInput"
                            accept="image/*"
                            multiple
                            onChange={handleFileUpload}
                            className="hidden"
                        />

                        {isUploading && (
                            <div className="mt-6">
                                <div className="flex items-center justify-center space-x-3">
                                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-rose-500"></div>
                                    <span className="text-gray-600">Uploading...</span>
                                </div>
                            </div>
                        )}

                        {/* Uploaded Photos Grid */}
                        <div className="mt-6">
                            <h3 className="font-bold text-gray-700 mb-3">
                                Your Uploads 📷 ({uploadedPhotos.length}/{maxPhotos})
                            </h3>
                            <div className="grid grid-cols-2 gap-3">
                                {uploadedPhotos.length === 0 ? (
                                    <div className="col-span-2 text-center py-6 text-gray-400">
                                        <p>No photos yet</p>
                                    </div>
                                ) : (
                                    uploadedPhotos.map((photo, index) => (
                                        <div key={photo.url} className="photo-card relative fade-in">
                                            <img
                                                src={photo.url}
                                                alt={`Photo ${index + 1}`}
                                                className="w-full h-24 object-cover rounded-xl shadow-md"
                                                onError={(e) => { 
                                                    console.error('Failed to load image:', photo.url);
                                                    e.target.style.display = 'none' 
                                                }}
                                            />
                                            <button
                                                onClick={() => removePhoto(index)}
                                                className="absolute top-1 right-1 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs hover:bg-red-600"
                                            >
                                                ×
                                            </button>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Right Side: Add Message */}
                    <div className="bg-white rounded-3xl shadow-xl p-6 md:p-8">
                        <h2 className="text-2xl font-bold text-gray-700 mb-6 text-center">💌 Add Your Message</h2>

                        <form onSubmit={submitMessage}>
                            <div className="mb-4">
                                <label className="block text-gray-600 mb-2 font-semibold">Your Name</label>
                                <div className="flex gap-2">
                                    <input
                                        type="text"
                                        value={senderName}
                                        onChange={(e) => setSenderName(e.target.value)}
                                        className="flex-1 p-3 border-2 border-rose-200 rounded-xl focus:outline-none focus:border-rose-400"
                                        placeholder="Enter your name"
                                    />
                                    {localStorage.getItem('guest_sender_name') && (
                                        <button
                                            type="button"
                                            onClick={clearSavedName}
                                            className="px-3 py-2 bg-gray-200 text-gray-600 rounded-xl text-sm hover:bg-gray-300 transition"
                                            title="Clear saved name"
                                        >
                                            ✕
                                        </button>
                                    )}
                                </div>
                            </div>

                            {/* Remember Name Checkbox */}
                            <div className="mb-4 flex items-center gap-2">
                                <input
                                    type="checkbox"
                                    id="rememberName"
                                    checked={rememberName}
                                    onChange={(e) => setRememberName(e.target.checked)}
                                    className="w-4 h-4 accent-rose-500"
                                />
                                <label htmlFor="rememberName" className="text-sm text-gray-600">
                                    Remember my name for next time
                                </label>
                            </div>

                            {currentUser && (
                                <div className="mb-3 text-xs text-gray-500">
                                    👤 Logged in as: <span className="font-medium">{currentUser.name}</span>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setSenderName(currentUser.name)
                                            showNotification('Using your account name')
                                        }}
                                        className="ml-2 text-rose-500 hover:underline"
                                    >
                                        Use account name
                                    </button>
                                </div>
                            )}

                            <div className="mb-4">
                                <label className="block text-gray-600 mb-2 font-semibold">Your Photo *</label>
                                <select
                                    value={selectedPhoto}
                                    onChange={(e) => setSelectedPhoto(e.target.value)}
                                    required
                                    className="w-full p-3 border-2 border-rose-200 rounded-xl focus:outline-none focus:border-rose-400"
                                >
                                    <option value="">Select a photo you uploaded</option>
                                    {uploadedPhotos.map((photo, index) => (
                                        <option key={photo.url} value={photo.url}>Photo {index + 1}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="mb-4">
                                <label className="block text-gray-600 mb-2 font-semibold">Your Message *</label>
                                <textarea
                                    value={messageText}
                                    onChange={(e) => setMessageText(e.target.value)}
                                    required
                                    className="w-full p-3 border-2 border-rose-200 rounded-xl focus:outline-none focus:border-rose-400"
                                    rows="4"
                                    placeholder={getMessagePlaceholder()}
                                ></textarea>
                            </div>

                            <button
                                type="submit"
                                className="w-full bg-gradient-to-r from-rose-500 to-pink-500 text-white py-3 rounded-xl font-semibold hover:shadow-lg transition"
                            >
                                💕 Add to Slideshow
                            </button>
                        </form>

                        {/* Quick Tips */}
                        <div className="mt-4 p-3 bg-rose-50 rounded-xl">
                            <p className="text-xs text-gray-500 text-center">
                                💡 Tip: Your name will be saved automatically. You can change it anytime.
                            </p>
                        </div>

                        {/* Messages List */}
                        <div className="mt-6">
                            <h3 className="font-bold text-gray-700 mb-3">Messages Added 💌</h3>
                            <div className="space-y-3 max-h-60 overflow-y-auto">
                                {messages.length === 0 ? (
                                    <div className="text-center py-6 text-gray-400">
                                        <p>No messages yet</p>
                                    </div>
                                ) : (
                                    messages.map((msg, index) => (
                                        <div key={index} className="bg-rose-50 p-3 rounded-xl fade-in">
                                            <div className="flex items-start gap-3">
                                                <img src={msg.photo} className="w-16 h-16 object-cover rounded-lg" alt="" />
                                                <div className="flex-1">
                                                    <div className="font-bold text-rose-600">{msg.name}</div>
                                                    <div className="text-gray-600 text-sm">{msg.message}</div>
                                                    <button
                                                        onClick={() => deleteMessage(index)}
                                                        className="text-red-400 text-xs mt-1 hover:text-red-600"
                                                    >
                                                        Delete
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Slideshow Preview */}
                <div className="mt-8">
                    <h2 className="text-2xl font-bold text-gray-700 mb-4 text-center">🎬 Slideshow Preview</h2>
                    <div className="bg-black rounded-2xl overflow-hidden relative" style={{ height: '300px' }}>
                        {messages.length > 0 ? (
                            <>
                                <img
                                    src={messages[0].photo}
                                    className="absolute inset-0 w-full h-full object-cover"
                                    alt=""
                                    onError={(e) => {
                                        console.error('Preview image failed to load:', messages[0].photo);
                                    }}
                                />
                                <div className="absolute inset-0 bg-black/50 flex items-center justify-center p-8">
                                    <div className="text-center">
                                        <h3 className="text-white text-2xl font-bold font-['Dancing_Script'] mb-2">
                                            {messages[0].name}
                                        </h3>
                                        <p className="text-white text-lg">{messages[0].message}</p>
                                    </div>
                                </div>
                            </>
                        ) : (
                            <div className="absolute inset-0 flex items-center justify-center">
                                <p className="text-white text-center p-4">No messages yet. Add your message above! 💌</p>
                            </div>
                        )}
                    </div>
                    <p className="text-center text-gray-500 mt-2 text-sm">This is what they will see on their celebration page</p>
                </div>

                {/* Footer */}
                <div className="text-center mt-8 text-gray-500 pb-8">
                    <p>Made with ❤️ for this special {eventType === 'birthday' ? 'day' : eventType === 'wedding' ? 'wedding' : 'celebration'}</p>
                </div>
            </div>
        </div>
    )
}

export default Upload