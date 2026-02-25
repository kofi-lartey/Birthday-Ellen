import { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { supabase, STORAGE_KEYS } from '../supabase'

function Slideshow() {
    const [slides, setSlides] = useState([])
    const [currentIndex, setCurrentIndex] = useState(0)
    const [isPlaying, setIsPlaying] = useState(true)
    const [showTitle, setShowTitle] = useState(true)
    const [showDownload, setShowDownload] = useState(false)
    const [downloadImage, setDownloadImage] = useState('')
    const intervalRef = useRef(null)

    useEffect(() => {
        loadSlides()

        // Show title briefly then hide
        const titleTimer = setTimeout(() => {
            setShowTitle(false)
        }, 4000)

        return () => {
            clearTimeout(titleTimer)
            if (intervalRef.current) {
                clearInterval(intervalRef.current)
            }
        }
    }, [])

    useEffect(() => {
        if (isPlaying && slides.length > 0) {
            intervalRef.current = setInterval(() => {
                setCurrentIndex(prev => (prev + 1) % slides.length)
            }, 5000)
        }

        return () => {
            if (intervalRef.current) {
                clearInterval(intervalRef.current)
            }
        }
    }, [isPlaying, slides.length])

    async function loadSlides() {
        // Load from localStorage first
        const messages = JSON.parse(localStorage.getItem(STORAGE_KEYS.MESSAGES) || '[]')

        if (messages.length > 0) {
            setSlides(messages)
            return
        }

        // Fallback: load from Supabase
        try {
            const { data, error } = await supabase
                .from('messages')
                .select('*')
                .order('created_at', { ascending: false })

            if (data && data.length > 0) {
                setSlides(data)
            }
        } catch (err) {
            console.error('Error loading slides:', err)
        }
    }

    function nextSlide() {
        setCurrentIndex(prev => (prev + 1) % slides.length)
    }

    function prevSlide() {
        setCurrentIndex(prev => (prev - 1 + slides.length) % slides.length)
    }

    function togglePlay() {
        setIsPlaying(!isPlaying)
    }

    function openDownloadModal(imageUrl) {
        setDownloadImage(imageUrl)
        setShowDownload(true)
    }

    function closeDownloadModal() {
        setShowDownload(false)
        setDownloadImage('')
    }

    function downloadImageFile() {
        const link = document.createElement('a')
        link.href = downloadImage
        link.download = 'ellen-birthday-memory.jpg'
        link.target = '_blank'
        link.click()
    }

    // Generate floating hearts
    useEffect(() => {
        const container = document.getElementById('heartsContainer')
        if (!container) return

        for (let i = 0; i < 20; i++) {
            const heart = document.createElement('div')
            heart.className = 'heart'
            heart.innerHTML = ['💕', '💗', '💖', '💘'][Math.floor(Math.random() * 4)]
            heart.style.left = Math.random() * 100 + '%'
            heart.style.animationDuration = (Math.random() * 3 + 4) + 's'
            heart.style.animationDelay = Math.random() * 5 + 's'
            heart.style.fontSize = (Math.random() * 15 + 15) + 'px'
            container.appendChild(heart)
        }
    }, [])

    const progress = slides.length > 0 ? ((currentIndex + 1) / slides.length) * 100 : 0

    return (
        <div className="relative w-full h-screen overflow-hidden" style={{ background: '#0a0a0a' }}>
            {/* Background gradient */}
            <div
                className="fixed inset-0"
                style={{
                    background: 'radial-gradient(ellipse at top, #1a1a2e 0%, #0a0a0a 50%, #000 100%)',
                    zIndex: -1
                }}
            />

            {/* Floating Hearts */}
            <div className="hearts" id="heartsContainer"></div>

            {/* Back Button */}
            <Link to="/" className="fab back fixed top-5 left-5 z-50">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" />
                </svg>
            </Link>

            {/* Title Overlay */}
            <div className={`title-overlay ${showTitle ? 'show' : ''}`}>
                <h1 className="font-['Playfair_Display']">Happy Birthday Ellen! 🎂</h1>
                <p>With love from your friends and family ❤️</p>
            </div>

            {/* Slideshow */}
            {slides.length > 0 ? (
                <div className="slideshow-container">
                    {slides.map((slide, index) => (
                        <div
                            key={index}
                            className={`slide ${index === currentIndex ? 'active' : ''}`}
                        >
                            <img
                                src={slide.photo}
                                alt=""
                                className="slide-image"
                            />

                            <div className="slide-message">
                                <h3>{slide.name}</h3>
                                <p>{slide.message}</p>
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="absolute inset-0 flex items-center justify-center">
                    <div className="text-center">
                        <div className="text-6xl mb-4">📷</div>
                        <p className="text-white text-xl">No photos yet!</p>
                        <p className="text-gray-400 mt-2">Go to upload page to add photos</p>
                        <Link
                            to="/upload"
                            className="inline-block mt-4 bg-rose-500 text-white px-6 py-3 rounded-full hover:bg-rose-600 transition"
                        >
                            Upload Photos 📸
                        </Link>
                    </div>
                </div>
            )}

            {/* Controls */}
            {slides.length > 0 && (
                <div className="controls-wrapper">
                    {/* Progress bar */}
                    <div className="progress-container">
                        <div className="progress-bar" style={{ width: `${progress}%` }}></div>
                    </div>

                    {/* Main Controls */}
                    <div className="controls">
                        <button className="control-btn" onClick={prevSlide}>
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
                            </svg>
                            Prev
                        </button>

                        <button className="control-btn primary" onClick={togglePlay}>
                            {isPlaying ? (
                                <>
                                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 5.25v13.5m-7.5-13.5v13.5" />
                                    </svg>
                                    Pause
                                </>
                            ) : (
                                <>
                                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.347a1.125 1.125 0 0 1 0 1.972l-11.54 6.347a1.125 1.125 0 0 1-1.667-.986V5.653Z" />
                                    </svg>
                                    Play
                                </>
                            )}
                        </button>

                        <button className="control-btn" onClick={nextSlide}>
                            Next
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                                <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
                            </svg>
                        </button>

                        <div className="divider"></div>

                        <span className="photo-counter">
                            {currentIndex + 1} / {slides.length}
                        </span>

                        <div className="divider"></div>

                        <button
                            className="control-btn"
                            onClick={() => openDownloadModal(slides[currentIndex]?.photo)}
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 1 5.25 21h13.5A2.25 2.25 0 0 1 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" />
                            </svg>
                            Save
                        </button>
                    </div>
                </div>
            )}

            {/* Download Modal */}
            {showDownload && (
                <div className="fixed inset-0 bg-black/85 backdrop-blur-sm z-50 flex items-center justify-center" onClick={closeDownloadModal}>
                    <div
                        className="bg-gray-900 rounded-2xl p-8 max-w-lg w-full mx-4"
                        onClick={e => e.stopPropagation()}
                    >
                        <h2 className="text-xl font-bold text-center mb-6 bg-gradient-to-r from-pink-500 to-rose-500 bg-clip-text text-transparent">
                            Download Memory 💕
                        </h2>

                        <img
                            src={downloadImage}
                            alt="Download preview"
                            className="max-h-64 rounded-xl mx-auto mb-6 object-contain"
                        />

                        <div className="flex gap-3 justify-center flex-wrap">
                            <button
                                onClick={handleDownload}
                                className="download-btn primary"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 1 5.25 21h13.5A2.25 2.25 0 0 1 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" />
                                </svg>
                                Download Image
                            </button>

                            <button
                                onClick={closeDownloadModal}
                                className="download-btn secondary"
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

export default Slideshow
