import { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { supabase, cloudinaryConfig, STORAGE_KEYS } from '../supabase'

function Upload() {
    const [uploadedPhotos, setUploadedPhotos] = useState([])
    const [messages, setMessages] = useState([])
    const [senderName, setSenderName] = useState('')
    const [selectedPhoto, setSelectedPhoto] = useState('')
    const [messageText, setMessageText] = useState('')
    const [isUploading, setIsUploading] = useState(false)
    const [notification, setNotification] = useState('')
    const cloudinaryRef = useRef()
    const widgetRef = useRef()

    useEffect(() => {
        // Load from localStorage
        const photos = JSON.parse(localStorage.getItem(STORAGE_KEYS.PHOTOS) || '[]')
        setUploadedPhotos(photos)

        const msgs = JSON.parse(localStorage.getItem(STORAGE_KEYS.MESSAGES) || '[]')
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
    }, [])

    function initCloudinaryWidget() {
        if (window.cloudinary) {
            cloudinaryRef.current = window.cloudinary

            widgetRef.current = window.cloudinary.createUploadWidget({
                cloudName: cloudinaryConfig.cloudName,
                uploadPreset: cloudinaryConfig.uploadPreset,
                sources: ['local', 'camera'],
                maxFileSize: 5000000,
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
        setIsUploading(false)

        if (!error && result && result.event === "success") {
            addPhoto(result.info.secure_url)
            showNotification('Photo uploaded! 📸')
        }
    }

    function openUploadWidget() {
        setIsUploading(true)
        if (widgetRef.current) {
            widgetRef.current.open()
        } else {
            // Fallback: trigger file input
            document.getElementById('fileInput').click()
        }
    }

    function handleFileUpload(e) {
        const file = e.target.files[0]
        if (!file) return

        if (file.size > 5 * 1024 * 1024) {
            alert('File too large! Max 5MB')
            return
        }

        setIsUploading(true)

        // Upload to Cloudinary via unsigned upload
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
                    addPhoto(data.secure_url)
                    showNotification('Photo uploaded! 📸')
                }
            })
            .catch(err => {
                console.error('Upload error:', err)
                alert('Upload failed. Please try again.')
            })
            .finally(() => {
                setIsUploading(false)
                e.target.value = ''
            })
    }

    function addPhoto(url) {
        const newPhotos = [...uploadedPhotos, url]
        setUploadedPhotos(newPhotos)
        localStorage.setItem(STORAGE_KEYS.PHOTOS, JSON.stringify(newPhotos))

        // Save to Supabase for cross-device sync
        saveToSupabase(url)
    }

    async function saveToSupabase(imageUrl) {
        try {
            await supabase
                .from('photos')
                .insert([{
                    image_url: imageUrl,
                    created_at: new Date().toISOString()
                }])
        } catch (error) {
            console.error('Error saving to Supabase:', error)
        }
    }

    function removePhoto(index) {
        if (confirm('Remove this photo?')) {
            const newPhotos = [...uploadedPhotos]
            newPhotos.splice(index, 1)
            setUploadedPhotos(newPhotos)
            localStorage.setItem(STORAGE_KEYS.PHOTOS, JSON.stringify(newPhotos))
        }
    }

    function submitMessage(e) {
        e.preventDefault()

        if (!selectedPhoto) {
            alert('Please select a photo!')
            return
        }

        const newMessage = {
            name: senderName || 'Anonymous',
            photo: selectedPhoto,
            message: messageText,
            date: new Date().toISOString()
        }

        const newMessages = [...messages, newMessage]
        setMessages(newMessages)
        localStorage.setItem(STORAGE_KEYS.MESSAGES, JSON.stringify(newMessages))

        // Save to Supabase for cross-device sync
        saveMessageToSupabase(newMessage)

        // Reset form
        setSenderName('')
        setMessageText('')
        setSelectedPhoto('')

        showNotification('Message added to slideshow! 💌')
    }

    async function saveMessageToSupabase(message) {
        try {
            await supabase
                .from('photos')
                .insert([{
                    image_url: message.photo,
                    name: message.name,
                    message: message.message,
                    created_at: message.date
                }])
        } catch (error) {
            console.error('Error saving message to Supabase:', error)
        }
    }

    function deleteMessage(index) {
        if (confirm('Delete this message?')) {
            const newMessages = [...messages]
            newMessages.splice(index, 1)
            setMessages(newMessages)
            localStorage.setItem(STORAGE_KEYS.MESSAGES, JSON.stringify(newMessages))
        }
    }

    function showNotification(msg) {
        setNotification(msg)
        setTimeout(() => setNotification(''), 3000)
    }

    return (
        <div className="p-4 md:p-6 min-h-screen" style={{ background: 'linear-gradient(135deg, #fce7f3 0%, #fbcfe8 100%)' }}>
            {/* Return to Homepage */}
            <div className="fixed top-4 left-4 z-50">
                <Link
                    to="/"
                    className="bg-rose-500 text-white px-4 py-2 rounded-full text-sm hover:bg-rose-600 transition shadow-lg"
                >
                    ← Homepage
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
                    <h1 className="text-4xl md:text-5xl font-['Dancing_Script'] text-rose-500 mb-4">Share for Ellen!</h1>
                    <p className="text-gray-600 text-lg">Upload a photo and add a sweet message 💕</p>
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
                            <p className="text-xl text-gray-600 font-semibold">Tap to Upload Photo</p>
                            <p className="text-gray-400 text-sm mt-2">Max 5MB • JPG, PNG, GIF</p>
                        </div>

                        {/* Hidden file input for fallback */}
                        <input
                            type="file"
                            id="fileInput"
                            accept="image/*"
                            onChange={handleFileUpload}
                            className="hidden"
                        />

                        {/* Upload Progress */}
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
                                <label className="block text-gray-600 mb-2 font-semibold">Sweet Message for Ellen *</label>
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

                {/* Slideshow Preview */}
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
                    <p className="text-center text-gray-500 mt-2 text-sm">This is what Ellen will see on her birthday page</p>
                </div>

                {/* Footer */}
                <div className="text-center mt-8 text-gray-500 pb-8">
                    <p>Made with ❤️ for Ellen's special day</p>
                </div>
            </div>
        </div>
    )
}

export default Upload
