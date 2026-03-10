import { useState, useEffect, useRef } from 'react'
import { Link, useParams } from 'react-router-dom'
import { supabase, STORAGE_KEYS } from '../supabase'

function OrderUpload() {
    const { code } = useParams()
    const [uploadedPhotos, setUploadedPhotos] = useState([])
    const [messages, setMessages] = useState([])
    const [senderName, setSenderName] = useState('')
    const [selectedPhoto, setSelectedPhoto] = useState('')
    const [messageText, setMessageText] = useState('')
    const [isUploading, setIsUploading] = useState(false)
    const [notification, setNotification] = useState('')
    const [orderConfig, setOrderConfig] = useState(null)

    const cloudinaryRef = useRef()
    const widgetRef = useRef()

    useEffect(() => {
        loadOrderConfig()

        // Load from localStorage for this specific order
        const photos = JSON.parse(localStorage.getItem(`${STORAGE_KEYS.PHOTOS}_${code}`) || '[]')
        setUploadedPhotos(photos)

        const msgs = JSON.parse(localStorage.getItem(`${STORAGE_KEYS.MESSAGES}_${code}`) || '[]')
        setMessages(msgs)

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

    async function loadOrderConfig() {
        // Check localStorage first
        const orders = JSON.parse(localStorage.getItem(STORAGE_KEYS.ORDERS) || '[]')
        const localOrder = orders.find(o => o.code.toLowerCase() === code?.toLowerCase())

        if (localOrder) {
            setOrderConfig(localOrder)
            return
        }

        // Check Supabase
        try {
            const { data, error } = await supabase
                .from('orders')
                .select('*')
                .eq('code', code)
                .limit(1);

            if (data && data.length > 0) {
                setOrderConfig(data[0]);
            } else if (error) {
                console.log('Supabase orders table not available');
            }
        } catch (err) {
            console.log('Supabase not available');
        }
    }

    function initCloudinaryWidget() {
        if (window.cloudinary) {
            cloudinaryRef.current = window.cloudinary

            widgetRef.current = window.cloudinary.createUploadWidget({
                cloudName: 'djjgkezui',
                uploadPreset: 'ml_default',
                sources: ['local', 'camera'],
                maxFileSize: 5000000,
                maxFiles: 10,
                clientAllowedFormats: ['jpg', 'jpeg', 'png', 'gif']
            }, handleUpload)
        }
    }

    function handleUpload(error, result) {
        if (!error && result && result.event === "success") {
            addPhoto(result.info.secure_url)
        }

        if (result && result.event === "batch-complete") {
            setIsUploading(false)
            showNotification(`${result.info.files.length} photos uploaded! 📸`)
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

        setIsUploading(true)

        let uploadedCount = 0
        Array.from(files).forEach(file => {
            if (file.size > 5 * 1024 * 1024) {
                alert(`File ${file.name} is too large! Max 5MB`)
                return
            }

            const formData = new FormData()
            formData.append('file', file)
            formData.append('upload_preset', 'ml_default')

            fetch('https://api.cloudinary.com/v1_1/djjgkezui/image/upload', {
                method: 'POST',
                body: formData
            })
                .then(res => res.json())
                .then(data => {
                    if (data.secure_url) {
                        addPhoto(data.secure_url)
                        uploadedCount++
                        if (uploadedCount === files.length) {
                            setIsUploading(false)
                            showNotification(`${files.length} photos uploaded! 📸`)
                        }
                    }
                })
                .catch(err => {
                    console.error('Upload error:', err)
                })
        })

        e.target.value = ''
    }

    function addPhoto(url) {
        // Tag as 'gallery' for order-specific photos
        const tag = 'gallery'

        const photoWithTag = { url, tag }

        setUploadedPhotos(prevPhotos => {
            const newPhotos = [...prevPhotos, photoWithTag]
            localStorage.setItem(`${STORAGE_KEYS.PHOTOS}_${code}`, JSON.stringify(newPhotos))
            return newPhotos
        })

        // Save to Supabase with tag
        saveToSupabase(url, tag)
    }

    // Save to Supabase with tag for tracking
    async function saveToSupabase(imageUrl, tag) {
        try {
            const { data, error } = await supabase
                .from('photos')
                .insert([{
                    order_code: code,
                    image_url: imageUrl,
                    tag: tag,
                    created_at: new Date().toISOString()
                }])
            if (error) {
                console.log('Supabase save error:', error.message)
            } else {
                console.log('Photo saved to Supabase!')
            }
        } catch (error) {
            console.error('Error saving to Supabase:', error)
        }
    }

    function removePhoto(index) {
        if (confirm('Remove this photo?')) {
            const newPhotos = [...uploadedPhotos]
            newPhotos.splice(index, 1)
            setUploadedPhotos(newPhotos)
            localStorage.setItem(`${STORAGE_KEYS.PHOTOS}_${code}`, JSON.stringify(newPhotos))
        }
    }

    function submitMessage(e) {
        e.preventDefault()

        if (!selectedPhoto) {
            alert('Please select a photo!')
            return
        }

        const finalName = senderName.trim() || 'By a Love One'
        const finalMessage = messageText.trim() || 'Happy Birthday Dear'

        const newMessage = {
            name: finalName,
            photo: selectedPhoto,
            message: finalMessage,
            date: new Date().toISOString()
        }

        const newMessages = [...messages, newMessage]
        setMessages(newMessages)
        localStorage.setItem(`${STORAGE_KEYS.MESSAGES}_${code}`, JSON.stringify(newMessages))

        // Reset form
        setSenderName('')
        setMessageText('')
        setSelectedPhoto('')

        showNotification('Message added to slideshow! 💌')
    }

    function deleteMessage(index) {
        if (confirm('Delete this message?')) {
            const newMessages = [...messages]
            newMessages.splice(index, 1)
            setMessages(newMessages)
            localStorage.setItem(`${STORAGE_KEYS.MESSAGES}_${code}`, JSON.stringify(newMessages))
        }
    }

    function showNotification(msg) {
        setNotification(msg)
        setTimeout(() => setNotification(''), 3000)
    }

    const recipientName = orderConfig?.recipient_name || 'the birthday person'

    return (
        <div className="p-4 md:p-6 min-h-screen" style={{ background: 'linear-gradient(135deg, #fce7f3 0%, #fbcfe8 100%)' }}>
            {/* Return to Homepage */}
            <div className="fixed top-4 left-4 z-50">
                <Link
                    to={`/birthday/${code}`}
                    className="bg-rose-500 text-white px-4 py-2 rounded-full text-sm hover:bg-rose-600 transition shadow-lg"
                >
                    ← Birthday Page
                </Link>
            </div>

            {/* Notification */}
            {notification && (
                <div className="fixed top-4 right-4 bg-rose-500 text-white px-4 py-2 rounded-full shadow-lg z-50">
                    {notification}
                </div>
            )}

            <div className="max-w-6xl mx-auto">
                {/* Header */}
                <div className="text-center mb-8 pt-8">
                    <div className="text-6xl mb-4 animate-float">🎂</div>
                    <h1 className="text-4xl md:text-5xl font-['Dancing_Script'] text-rose-500 mb-4">
                        Add Photos for {recipientName}!
                    </h1>
                    <p className="text-gray-600 text-lg">Upload a photo and add a sweet message 💕</p>
                    <p className="text-rose-500 font-semibold mt-2">Code: {code}</p>
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
                            <p className="text-gray-400 text-sm mt-2">Max 5MB each • JPG, PNG, GIF</p>
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

                        {/* Uploaded Photos */}
                        <div className="mt-6">
                            <h3 className="font-bold text-gray-700 mb-3">Your Uploads 📷</h3>
                            <div className="grid grid-cols-2 gap-3">
                                {uploadedPhotos.length === 0 ? (
                                    <div className="col-span-2 text-center py-6 text-gray-400">
                                        <p>No photos yet</p>
                                    </div>
                                ) : (
                                    uploadedPhotos.map((url, index) => (
                                        <div key={index} className="photo-card relative fade-in">
                                            <img
                                                src={url}
                                                alt={`Photo ${index + 1}`}
                                                className="w-full h-24 object-cover rounded-xl shadow-md"
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
                                <label className="block text-gray-600 mb-2 font-semibold">Your Name (optional)</label>
                                <input
                                    type="text"
                                    value={senderName}
                                    onChange={(e) => setSenderName(e.target.value)}
                                    className="w-full p-3 border-2 border-rose-200 rounded-xl focus:outline-none focus:border-rose-400"
                                    placeholder="Enter your name"
                                />
                            </div>

                            <div className="mb-4">
                                <label className="block text-gray-600 mb-2 font-semibold">Your Photo *</label>
                                <select
                                    value={selectedPhoto}
                                    onChange={(e) => setSelectedPhoto(e.target.value)}
                                    required
                                    className="w-full p-3 border-2 border-rose-200 rounded-xl focus:outline-none focus:border-rose-400"
                                >
                                    <option value="">Select a photo you uploaded</option>
                                    {uploadedPhotos.map((url, index) => (
                                        <option key={index} value={url}>Photo {index + 1}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="mb-4">
                                <label className="block text-gray-600 mb-2 font-semibold">Sweet Message for {recipientName} *</label>
                                <textarea
                                    value={messageText}
                                    onChange={(e) => setMessageText(e.target.value)}
                                    required
                                    className="w-full p-3 border-2 border-rose-200 rounded-xl focus:outline-none focus:border-rose-400"
                                    rows="4"
                                    placeholder="Write something sweet..."
                                ></textarea>
                            </div>

                            <button
                                type="submit"
                                className="w-full bg-gradient-to-r from-rose-500 to-pink-500 text-white py-3 rounded-xl font-semibold hover:shadow-lg transition"
                            >
                                💕 Add to Slideshow
                            </button>
                        </form>

                        {/* Messages List */}
                        <div className="mt-6">
                            <h3 className="font-bold text-gray-700 mb-3">Messages Added 💌</h3>
                            <div className="space-y-3 max-h-60 overflow-y-auto">
                                {messages.length === 0 ? (
                                    <div className="text-center py-6 text-gray-400">
                                        <p>No messages yet</p>
                                    </div>
                                ) : (
                                    messages.slice().reverse().map((msg, index) => (
                                        <div key={index} className="bg-rose-50 p-3 rounded-xl fade-in">
                                            <div className="flex items-start gap-3">
                                                <img src={msg.photo} className="w-16 h-16 object-cover rounded-lg" alt="" />
                                                <div className="flex-1">
                                                    <div className="font-bold text-rose-600">{msg.name}</div>
                                                    <div className="text-gray-600 text-sm">{msg.message}</div>
                                                    <button
                                                        onClick={() => deleteMessage(messages.length - 1 - index)}
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

                {/* Preview */}
                <div className="mt-8">
                    <h2 className="text-2xl font-bold text-gray-700 mb-4 text-center">🎬 Slideshow Preview</h2>
                    <div className="bg-black rounded-2xl overflow-hidden relative" style={{ height: '300px' }}>
                        {messages.length > 0 ? (
                            <>
                                <img
                                    src={messages[messages.length - 1].photo}
                                    className="absolute inset-0 w-full h-full object-cover"
                                    alt=""
                                />
                                <div className="absolute inset-0 bg-black/50 flex items-center justify-center p-8">
                                    <div className="text-center">
                                        <h3 className="text-white text-2xl font-bold font-['Dancing_Script'] mb-2">
                                            {messages[messages.length - 1].name}
                                        </h3>
                                        <p className="text-white text-lg">{messages[messages.length - 1].message}</p>
                                    </div>
                                </div>
                            </>
                        ) : (
                            <div className="absolute inset-0 flex items-center justify-center">
                                <p className="text-white text-center p-4">No messages yet. Add your message above! 💌</p>
                            </div>
                        )}
                    </div>
                    <p className="text-center text-gray-500 mt-2 text-sm">This is what {recipientName} will see on their birthday page</p>
                </div>

                {/* Footer */}
                <div className="text-center mt-8 text-gray-500 pb-8">
                    <p>Made with ❤️ for {recipientName}'s special day</p>
                    <p className="text-sm mt-2">Code: {code}</p>
                </div>
            </div>
        </div>
    )
}

export default OrderUpload
