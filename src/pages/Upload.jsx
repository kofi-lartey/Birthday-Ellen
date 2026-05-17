import { useState, useEffect, useRef } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { supabase, cloudinaryConfig, STORAGE_KEYS } from '../supabase'

function Upload() {
    const navigate = useNavigate()
    const { code } = useParams() // Get event code from URL
    const [uploadedPhotos, setUploadedPhotos] = useState([])
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
    const [eventExists, setEventExists] = useState(true)
    const [sessionId, setSessionId] = useState('')

    const cloudinaryRef = useRef()
    const widgetRef = useRef()
    const uploadedUrlsSet = useRef(new Set())
    const uploadingUrlsRef = useRef(new Set())

    // Generate or get session ID for guest users
    useEffect(() => {
        // Generate a unique session ID for this user/browser
        let storedSessionId = sessionStorage.getItem('upload_session_id')
        if (!storedSessionId) {
            storedSessionId = 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9)
            sessionStorage.setItem('upload_session_id', storedSessionId)
        }
        setSessionId(storedSessionId)

        // Load current user from localStorage (for dashboard users)
        const user = JSON.parse(localStorage.getItem(STORAGE_KEYS.CURRENT_USER) || 'null')
        if (user) {
            setCurrentUser(user)
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
        // If there's a code in URL, verify the event exists
        if (code) {
            setOrderCode(code)
            verifyEventAndLoadUserData(code)
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

    async function verifyEventAndLoadUserData(eventCode) {
        try {
            setIsLoading(true)
            // Check if event exists
            const { data: event, error } = await supabase
                .from('event_registry')
                .select('*')
                .eq('code', eventCode)
                .single()

            if (error || !event) {
                console.error('Event not found:', error)
                setEventExists(false)
                return
            }

            setEventExists(true)
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

            // Load ONLY the current user's uploaded photos (by session ID)
            await loadCurrentUserPhotos(eventCode)

        } catch (err) {
            console.error('Error loading event data:', err)
            setEventExists(false)
        } finally {
            setIsLoading(false)
        }
    }

    async function loadCurrentUserPhotos(eventCode) {
        try {
            if (!sessionId) return

            const { data: photosData, error: photosError } = await supabase
                .from('photos')
                .select('*')
                .eq('order_code', eventCode)
                .eq('tag', 'gallery')
                .eq('session_id', sessionId) // Only load current session's photos
                .order('created_at', { ascending: false })

            console.log('Your photos loaded:', photosData?.length || 0)

            if (!photosError && photosData) {
                uploadedUrlsSet.current.clear()

                const photoObjects = photosData.map(p => ({
                    url: p.image_url,
                    tag: 'gallery',
                    uploadedAt: p.created_at,
                    id: p.id
                }))

                photoObjects.forEach(p => uploadedUrlsSet.current.add(p.url))
                setUploadedPhotos(photoObjects)
            }
        } catch (err) {
            console.error('Error loading your photos:', err)
        }
    }

    async function generateShareLink() {
        if (orderCode) {
            const link = `${window.location.origin}/upload/${orderCode}`
            setShareLink(link)
            await navigator.clipboard.writeText(link)
            showNotification('Link copied! Share this link so others can upload their own photos 🎉')
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
                maxFiles: maxPhotos - uploadedPhotos.length,
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
            setTimeout(() => {
                if (!uploadedUrlsSet.current.has(imageUrl) && !uploadingUrlsRef.current.has(imageUrl)) {
                    uploadedUrlsSet.current.add(imageUrl)
                    addPhoto(imageUrl)
                }
            }, 100)
        }

        if (result && result.event === "batch-complete") {
            setIsUploading(false)
            showNotification(`${result.info.files.length} photo(s) uploaded! 📸`)
            setTimeout(() => {
                loadCurrentUserPhotos(orderCode)
            }, 1000)
        }

        if (error) {
            setIsUploading(false)
            console.error('Upload error:', error)
        }
    }

    function openUploadWidget() {
        if (uploadedPhotos.length >= maxPhotos) {
            showNotification(`You've reached the photo limit (${maxPhotos}) for this event!`)
            return
        }
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

        if (uploadedPhotos.length + files.length > maxPhotos) {
            showNotification(`You can only upload ${maxPhotos - uploadedPhotos.length} more photo(s)`)
            setIsUploading(false)
            return
        }

        console.log(`Selected ${files.length} files to upload`)
        setIsUploading(true)

        let uploadedCount = 0
        Array.from(files).forEach(file => {
            if (file.size > 5 * 1024 * 1024) {
                alert(`File ${file.name} is too large! Max 5MB`)
                uploadedCount++
                if (uploadedCount === files.length) {
                    setIsUploading(false)
                }
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
                        setTimeout(() => {
                            if (!uploadedUrlsSet.current.has(imageUrl) && !uploadingUrlsRef.current.has(imageUrl)) {
                                uploadedUrlsSet.current.add(imageUrl)
                                addPhoto(imageUrl)
                            }
                        }, 100)
                    }
                    uploadedCount++
                    if (uploadedCount === files.length) {
                        setIsUploading(false)
                        showNotification(`${files.length} photo(s) uploaded! 📸`)
                        setTimeout(() => {
                            loadCurrentUserPhotos(orderCode)
                        }, 1500)
                    }
                })
                .catch(err => {
                    console.error('Upload error:', err)
                    uploadedCount++
                    if (uploadedCount === files.length) {
                        setIsUploading(false)
                    }
                })
        })

        e.target.value = ''
    }

    async function addPhoto(url) {
        if (uploadingUrlsRef.current.has(url)) {
            console.log('Photo already being uploaded:', url)
            return
        }

        if (uploadedPhotos.some(p => p.url === url)) {
            console.log('Photo already exists:', url)
            return
        }

        if (uploadedPhotos.length >= maxPhotos) {
            showNotification(`Photo limit reached (${maxPhotos})!`)
            return
        }

        uploadingUrlsRef.current.add(url)

        const newPhoto = {
            url: url,
            tag: 'gallery',
            uploadedAt: new Date().toISOString()
        }

        try {
            // Check if already in Supabase for this session
            const { data: existingPhoto } = await supabase
                .from('photos')
                .select('image_url')
                .eq('image_url', url)
                .eq('order_code', orderCode)
                .eq('session_id', sessionId)
                .single()

            if (existingPhoto) {
                console.log('Photo already in database, skipping insert')
                setUploadedPhotos(prev => {
                    if (prev.some(p => p.url === url)) return prev
                    return [...prev, newPhoto]
                })
                uploadingUrlsRef.current.delete(url)
                return
            }

            // Save to Supabase with session ID
            const { data, error } = await supabase
                .from('photos')
                .insert([{
                    order_code: orderCode,
                    image_url: url,
                    tag: 'gallery',
                    session_id: sessionId,
                    created_at: new Date().toISOString()
                }])
                .select()

            if (error) {
                console.error('Database save error:', error.message)
                showNotification('Error saving photo. Please try again.')
                uploadingUrlsRef.current.delete(url)
                return
            }

            // Update state
            setUploadedPhotos(prev => {
                if (prev.some(p => p.url === url)) return prev
                const newPhotos = [...prev, { ...newPhoto, id: data?.[0]?.id }]
                return newPhotos
            })

            showNotification('Photo saved! ✨')

        } catch (error) {
            console.error('Error saving to database:', error)
            showNotification('Error saving photo. Please try again.')
        } finally {
            setTimeout(() => {
                uploadingUrlsRef.current.delete(url)
            }, 1000)
        }
    }

    async function removePhoto(index) {
        if (confirm('Remove this photo?')) {
            const photo = uploadedPhotos[index]
            const newPhotos = [...uploadedPhotos]
            newPhotos.splice(index, 1)
            setUploadedPhotos(newPhotos)

            if (photo.url) {
                uploadedUrlsSet.current.delete(photo.url)
            }

            // Delete from Supabase with session ID
            await supabase
                .from('photos')
                .delete()
                .eq('image_url', photo.url)
                .eq('order_code', orderCode)
                .eq('session_id', sessionId)

            showNotification('Photo removed')
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

        localStorage.setItem('remember_sender_name', rememberName.toString())

        const newMessage = {
            name: finalName,
            photo: selectedPhoto,
            message: finalMessage,
            date: new Date().toISOString()
        }

        // Save to Supabase with session ID
        try {
            const { error } = await supabase
                .from('photos')
                .insert([{
                    order_code: orderCode,
                    image_url: newMessage.photo,
                    name: newMessage.name,
                    message: newMessage.message,
                    tag: 'slideshow',
                    session_id: sessionId,
                    created_at: newMessage.date
                }])

            if (error) {
                console.error('Database save error:', error.message)
                showNotification('Error saving your message. Please try again.')
                return
            }

            showNotification(`Your message has been added to the ${eventType} slideshow! 💌`)

            // Reset form
            setMessageText('')
            setSelectedPhoto('')
            if (!rememberName) {
                setSenderName('')
            }

            // Optional: Clear the selected photo from the list or keep it
            // You can choose to keep the photo for multiple messages

        } catch (error) {
            console.error('Error saving message:', error)
            showNotification('Error saving message. Please try again.')
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
                    <p className="text-gray-600">Loading celebration...</p>
                </div>
            </div>
        )
    }

    if (!eventExists && code) {
        return (
            <div className="min-h-screen flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #fce7f3 0%, #fbcfe8 100%)' }}>
                <div className="bg-white rounded-3xl shadow-xl p-8 max-w-md text-center">
                    <div className="text-6xl mb-4">🔗</div>
                    <h1 className="text-2xl font-bold text-gray-700 mb-4">Event Not Found</h1>
                    <p className="text-gray-600 mb-6">This celebration link doesn't exist or has been removed.</p>
                    {currentUser && (
                        <button
                            onClick={() => navigate('/dashboard')}
                            className="bg-gradient-to-r from-rose-500 to-pink-500 text-white px-6 py-2 rounded-full hover:shadow-lg transition"
                        >
                            Go to Dashboard
                        </button>
                    )}
                </div>
            </div>
        )
    }

    return (
        <div className="p-4 md:p-6 min-h-screen" style={{ background: 'linear-gradient(135deg, #fce7f3 0%, #fbcfe8 100%)' }}>
            {/* Back to Dashboard Button - Only show if user is logged in */}
            {currentUser && (
                <button
                    onClick={() => navigate('/dashboard')}
                    className="fixed top-4 left-4 bg-white/80 text-rose-500 px-4 py-2 rounded-full text-sm hover:bg-rose-100 transition shadow-lg z-40"
                >
                    ← Dashboard
                </button>
            )}

            {/* Generate Share Link Button - Only show for event creators (logged in) */}
            {currentUser && (
                <button
                    onClick={generateShareLink}
                    className="fixed top-4 right-4 bg-gradient-to-r from-rose-500 to-pink-500 text-white px-4 py-2 rounded-full text-sm hover:shadow-lg transition z-40"
                >
                    🔗 Get Shareable Link
                </button>
            )}

            {/* Share Link Display */}
            {shareLink && (
                <div className="fixed bottom-4 left-1/2 transform -translate-x-1/2 bg-white px-4 py-2 rounded-full shadow-lg z-50 animate-bounce">
                    <p className="text-sm text-gray-600">Share this link: <span className="text-rose-500 font-mono text-xs">{shareLink}</span></p>
                    <p className="text-xs text-gray-400 mt-1">✨ Anyone with this link can upload photos and messages</p>
                </div>
            )}

            {/* Notification */}
            {notification && (
                <div className="fixed top-20 right-4 bg-rose-500 text-white px-4 py-2 rounded-full shadow-lg z-50 max-w-md">
                    {notification}
                </div>
            )}

            <div className="max-w-6xl mx-auto">
                {/* Header */}
                <div className="text-center mb-8 pt-8">
                    <div className="text-6xl mb-4 animate-float">{getCelebrationEmoji()}</div>
                    <h1 className="text-4xl md:text-5xl font-['Dancing_Script'] text-rose-500 mb-4">{getCelebrationTitle()}</h1>
                    <p className="text-gray-600 text-lg">for <span className="font-bold text-rose-500">{eventName || 'the celebration'}</span> 💕</p>
                    <p className="text-sm text-gray-500 mt-2">Upload your photo and message to be part of the celebration!</p>
                </div>

                {/* Info Banner */}
                <div className="bg-rose-100 border border-rose-200 rounded-2xl p-4 mb-6 text-center">
                    <p className="text-sm text-gray-700">
                        🎉 No login required! Your photos and messages will appear in the celebration slideshow.
                    </p>
                </div>

                {/* Two Column Layout */}
                <div className="grid md:grid-cols-2 gap-6">
                    {/* Left Side: Upload Photo */}
                    <div className="bg-white rounded-3xl shadow-xl p-6 md:p-8">
                        <h2 className="text-2xl font-bold text-gray-700 mb-6 text-center">📸 Upload Your Photo</h2>

                        <div
                            className="upload-zone rounded-2xl p-8 text-center cursor-pointer transition hover:shadow-lg"
                            onClick={openUploadWidget}
                            style={{ border: '2px dashed #fbcfe8', background: '#fff5f7' }}
                        >
                            <div className="text-6xl mb-4">📤</div>
                            <p className="text-xl text-gray-600 font-semibold">Tap to Upload Photos</p>
                            <p className="text-gray-400 text-sm mt-2">Max 5MB each • JPG, PNG, GIF • Select multiple files</p>
                            <p className="text-rose-500 text-sm mt-2 font-semibold">
                                Your uploads: {uploadedPhotos.length}/{maxPhotos} photos
                            </p>
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
                                Your Photos 📷 ({uploadedPhotos.length}/{maxPhotos})
                            </h3>
                            <div className="grid grid-cols-2 gap-3">
                                {uploadedPhotos.length === 0 ? (
                                    <div className="col-span-2 text-center py-8 text-gray-400 bg-gray-50 rounded-xl">
                                        <p>No photos uploaded yet</p>
                                        <p className="text-xs mt-1">Click above to add your photos</p>
                                    </div>
                                ) : (
                                    uploadedPhotos.map((photo, index) => (
                                        <div key={photo.url || index} className="photo-card relative fade-in group">
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
                                                className="absolute top-1 right-1 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs hover:bg-red-600 transition opacity-0 group-hover:opacity-100"
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
                                        className="flex-1 p-3 border-2 border-rose-200 rounded-xl focus:outline-none focus:border-rose-400 transition"
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
                                <div className="mb-3 text-xs text-gray-500 bg-blue-50 p-2 rounded">
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
                                <label className="block text-gray-600 mb-2 font-semibold">Choose Your Photo *</label>
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
                                {uploadedPhotos.length === 0 && (
                                    <p className="text-xs text-amber-600 mt-1">⚠️ Please upload a photo first</p>
                                )}
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
                                disabled={uploadedPhotos.length === 0}
                                className={`w-full py-3 rounded-xl font-semibold transition ${uploadedPhotos.length === 0
                                        ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                                        : 'bg-gradient-to-r from-rose-500 to-pink-500 text-white hover:shadow-lg'
                                    }`}
                            >
                                💕 Add to Celebration
                            </button>
                        </form>

                        <div className="mt-4 p-3 bg-rose-50 rounded-xl">
                            <p className="text-xs text-gray-500 text-center">
                                ✨ Your photo and message will appear in the celebration slideshow!
                            </p>
                        </div>
                    </div>
                </div>

                {/* Preview Section - Show current user's submission */}
                {uploadedPhotos.length > 0 && (
                    <div className="mt-8">
                        <h2 className="text-2xl font-bold text-gray-700 mb-4 text-center">🎬 Your Contribution Preview</h2>
                        <div className="bg-black rounded-2xl overflow-hidden relative" style={{ height: '300px' }}>
                            {selectedPhoto ? (
                                <>
                                    <img
                                        src={selectedPhoto}
                                        className="absolute inset-0 w-full h-full object-cover"
                                        alt="Preview"
                                        onError={(e) => {
                                            console.error('Preview image failed to load');
                                        }}
                                    />
                                    <div className="absolute inset-0 bg-black/50 flex items-center justify-center p-8">
                                        <div className="text-center">
                                            <h3 className="text-white text-2xl font-bold font-['Dancing_Script'] mb-2">
                                                {senderName || 'Your Name'}
                                            </h3>
                                            <p className="text-white text-lg">{messageText || 'Your message here'}</p>
                                        </div>
                                    </div>
                                </>
                            ) : (
                                <div className="absolute inset-0 flex items-center justify-center">
                                    <p className="text-white text-center p-4">Select a photo and write a message to see your preview! 💌</p>
                                </div>
                            )}
                        </div>
                        <p className="text-center text-gray-500 mt-2 text-sm">This is how your contribution will appear</p>
                    </div>
                )}

                {/* Footer */}
                <div className="text-center mt-8 text-gray-500 pb-8">
                    <p>Made with ❤️ for this special {eventType === 'birthday' ? 'birthday' : eventType === 'wedding' ? 'wedding' : 'celebration'}</p>
                </div>
            </div>
        </div>
    )
}

export default Upload