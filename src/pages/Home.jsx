import { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import confetti from 'canvas-confetti'
import { supabase, defaultGalleryImages, STORAGE_KEYS } from '../supabase'

function Home() {
    const [showContent, setShowContent] = useState(false)
    const [password, setPassword] = useState('')
    const [error, setError] = useState(false)
    const [showGift, setShowGift] = useState(false)
    const [showGiftModal, setShowGiftModal] = useState(false)
    const [giverName, setGiverName] = useState('')
    const [giftMessage, setGiftMessage] = useState('')
    const [momoNumber, setMomoNumber] = useState('')
    const [showMomoInfo, setShowMomoInfo] = useState(false)
    const [countdown, setCountdown] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 })
    const [typedText, setTypedText] = useState('')
    const [galleryImages, setGalleryImages] = useState(defaultGalleryImages)
    const [slideIndex, setSlideIndex] = useState(0)
    const [isPlaying, setIsPlaying] = useState(true)
    const [musicPlaying, setMusicPlaying] = useState(false)
    const audioRef = useRef(null)

    const letterText = `My dearest Ellen,

Another year has passed, and my love for you only grows stronger. You are my sunshine on cloudy days, my smile when I'm sad, my everything. Today we celebrate the day the most amazing person came into this world – YOU! Thank you for being my partner, my best friend, and my soulmate. I love you more than words can ever express! 💖`

    // Load Firebase photos
    useEffect(() => {
        loadFirebasePhotos()
        loadMomoNumber()
        trackViews()
    }, [])

    // Slide text animation
    useEffect(() => {
        const interval = setInterval(() => {
            if (isPlaying) {
                setSlideIndex(prev => (prev + 1) % 4)
            }
        }, 3000)
        return () => clearInterval(interval)
    }, [isPlaying])

    // Countdown timer
    useEffect(() => {
        const timer = setInterval(() => {
            const now = new Date()
            const birthday = new Date('2026-02-28') // Set birthday date
            birthday.setFullYear(now.getFullYear())

            if (birthday < now) {
                birthday.setFullYear(now.getFullYear() + 1)
            }

            const diff = birthday - now
            setCountdown({
                days: Math.floor(diff / (1000 * 60 * 60 * 24)),
                hours: Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
                minutes: Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60)),
                seconds: Math.floor((diff % (1000 * 60)) / 1000)
            })
        }, 1000)
        return () => clearInterval(timer)
    }, [])

    // Typewriter effect
    useEffect(() => {
        if (showContent) {
            let index = 0
            const interval = setInterval(() => {
                if (index < letterText.length) {
                    setTypedText(letterText.slice(0, index + 1))
                    index++
                } else {
                    clearInterval(interval)
                }
            }, 30)
            return () => clearInterval(interval)
        }
    }, [showContent])

    // Floating hearts
    useEffect(() => {
        if (showContent) {
            createFloatingHearts()
            createStars()
        }
    }, [showContent])

    async function loadFirebasePhotos() {
        try {
            const { data, error } = await supabase
                .from('photos')
                .select('image_url')
                .order('created_at', { ascending: false })

            if (data && data.length > 0) {
                const urls = data.map(p => p.image_url)
                setGalleryImages(prev => [...urls, ...defaultGalleryImages])
            }
        } catch (err) {
            console.error('Error loading photos:', err)
        }
    }

    function loadMomoNumber() {
        const number = localStorage.getItem(STORAGE_KEYS.MOM0)
        if (number) {
            setMomoNumber(number)
        }
    }

    function trackViews() {
        const views = parseInt(localStorage.getItem(STORAGE_KEYS.VIEWS) || '0')
        localStorage.setItem(STORAGE_KEYS.VIEWS, views + 1)
    }

    function createFloatingHearts() {
        const container = document.getElementById('heartsContainer')
        if (!container) return

        for (let i = 0; i < 15; i++) {
            const heart = document.createElement('div')
            heart.className = 'heart'
            heart.innerHTML = '💕'
            heart.style.left = Math.random() * 100 + '%'
            heart.style.animationDelay = Math.random() * 6 + 's'
            heart.style.fontSize = (Math.random() * 20 + 15) + 'px'
            container.appendChild(heart)
        }
    }

    function createStars() {
        const container = document.getElementById('starsContainer')
        if (!container) return

        for (let i = 0; i < 50; i++) {
            const star = document.createElement('div')
            star.className = 'star'
            star.style.left = Math.random() * 100 + '%'
            star.style.top = Math.random() * 100 + '%'
            star.style.animationDelay = Math.random() * 2 + 's'
            container.appendChild(star)
        }
    }

    function checkPassword() {
        if (password === 'ellen2025' || password === '1313') {
            setShowContent(true)
            setError(false)
        } else {
            setError(true)
            setTimeout(() => setError(false), 3000)
        }
    }

    function revealGift() {
        setShowGift(true)
        confetti({
            particleCount: 100,
            spread: 70,
            origin: { y: 0.6 }
        })
    }

    function openGiftModal() {
        setShowGiftModal(true)
        if (momoNumber) {
            setShowMomoInfo(true)
        }
    }

    function closeGiftModal() {
        setShowGiftModal(false)
        setShowMomoInfo(false)
        setGiverName('')
        setGiftMessage('')
    }

    function sendGift() {
        const gifts = JSON.parse(localStorage.getItem(STORAGE_KEYS.GIFTS) || '[]')
        gifts.push({
            name: giverName || 'Anonymous',
            message: giftMessage,
            date: new Date().toISOString()
        })
        localStorage.setItem(STORAGE_KEYS.GIFTS, JSON.stringify(gifts))

        confetti({
            particleCount: 50,
            spread: 50,
            origin: { y: 0.6 }
        })

        closeGiftModal()
        alert('Gift sent! 🎁')
    }

    function toggleMusic() {
        setMusicPlaying(!musicPlaying)
        if (!audioRef.current) {
            audioRef.current = new Audio('https://www.soundjay.com/misc/sounds/bell-ringing-05.mp3')
        }
        if (musicPlaying) {
            audioRef.current.pause()
        } else {
            audioRef.current.play()
        }
    }

    const slideTexts = [
        'To The Love Of My Life 💕',
        'My Beautiful Queen 👑',
        'Today Is All About You 🎂',
        'Happy Birthday My Love! 🎉'
    ]

    const slideColors = ['text-rose-500', 'text-pink-500', 'text-purple-500', 'text-rose-400']

    return (
        <div
            className="min-h-screen bg-gradient-to-br from-rose-50 via-pink-50 to-purple-50 text-gray-800"
            style={{
                backgroundImage: 'url(https://res.cloudinary.com/djjgkezui/image/upload/v1771045116/IMG-20240920-WA0022_kltayh.jpg)',
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                backgroundAttachment: 'fixed'
            }}
        >
            {/* Floating Hearts Background */}
            <div className="floating-hearts" id="heartsContainer"></div>

            {/* Password Screen */}
            {!showContent && (
                <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-50 backdrop-blur-sm p-4">
                    {/* Admin Link */}
                    <div className="fixed top-4 right-4 z-50">
                        <Link
                            to="/admin"
                            className="bg-rose-500 text-white px-4 py-2 rounded-full text-sm hover:bg-rose-600 transition shadow-lg"
                        >
                            🔐 Admin (Ellen)
                        </Link>
                    </div>

                    <div className="max-w-md w-full">
                        <div className="text-center mb-8">
                            <div className="text-5xl mb-2 animate-pulse">💕</div>
                            <h2 className="text-3xl font-['Dancing_Script'] text-rose-400">Happy Birthday Ellen! 🎂</h2>
                        </div>

                        <div className="space-y-4">
                            {/* Option 1: Enter Code */}
                            <div className="bg-white p-6 rounded-2xl shadow-xl">
                                <h3 className="text-xl font-bold text-gray-700 mb-4 text-center">🔑 Enter Code</h3>
                                <input
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="Type the code..."
                                    className="border-2 border-rose-200 p-3 w-full rounded-xl mb-3 text-center focus:outline-none focus:border-rose-400"
                                    onKeyPress={(e) => e.key === 'Enter' && checkPassword()}
                                />
                                <button
                                    onClick={checkPassword}
                                    className="btn-primary text-white px-6 py-3 rounded-full w-full font-semibold"
                                >
                                    Unlock 💖
                                </button>
                                {error && (
                                    <p className="text-red-400 text-sm mt-2 text-center">Oops! Wrong code 😢</p>
                                )}
                            </div>

                            {/* Option 2: Upload Pictures */}
                            <Link
                                to="/upload"
                                className="block bg-gradient-to-r from-purple-100 to-pink-100 p-6 rounded-2xl shadow-xl hover:shadow-2xl transition"
                            >
                                <div className="flex items-center gap-4">
                                    <div className="text-4xl">📸</div>
                                    <div>
                                        <h3 className="text-xl font-bold text-gray-700">Upload Pictures</h3>
                                        <p className="text-gray-500 text-sm">Add photos for Ellen • No login needed</p>
                                    </div>
                                </div>
                            </Link>

                            {/* Option 3: Gift Ellen */}
                            <button
                                onClick={openGiftModal}
                                className="block w-full text-left bg-gradient-to-r from-amber-100 to-yellow-100 p-6 rounded-2xl shadow-xl hover:shadow-2xl transition"
                            >
                                <div className="flex items-center gap-4">
                                    <div className="text-4xl">🎁</div>
                                    <div>
                                        <h3 className="text-xl font-bold text-gray-700">Gift Ellen</h3>
                                        <p className="text-gray-500 text-sm">Send a virtual gift • Optional name</p>
                                    </div>
                                </div>
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Gift Modal */}
            {showGiftModal && (
                <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-50">
                    <div className="bg-white p-8 rounded-3xl max-w-sm w-full mx-4">
                        <h3 className="text-2xl font-bold text-gray-700 mb-4 text-center font-['Dancing_Script']">🎁 Gift for Ellen</h3>
                        <input
                            type="text"
                            value={giverName}
                            onChange={(e) => setGiverName(e.target.value)}
                            placeholder="Your name (optional)"
                            className="border-2 border-rose-200 p-3 w-full rounded-xl mb-3 focus:outline-none focus:border-rose-400"
                        />
                        <textarea
                            value={giftMessage}
                            onChange={(e) => setGiftMessage(e.target.value)}
                            placeholder="Write a sweet message..."
                            className="border-2 border-rose-200 p-3 w-full rounded-xl mb-4 focus:outline-none focus:border-rose-400"
                            rows="3"
                        ></textarea>

                        {showMomoInfo && (
                            <div className="bg-green-50 p-4 rounded-xl mb-4">
                                <p className="text-green-700 font-semibold text-center mb-2">💰 Send a gift via MoMo</p>
                                <p className="text-gray-600 text-center text-sm">
                                    Number: <span className="font-bold text-green-600">{momoNumber}</span>
                                </p>
                            </div>
                        )}

                        <div className="flex gap-3">
                            <button
                                onClick={sendGift}
                                className="flex-1 bg-gradient-to-r from-rose-500 to-pink-500 text-white py-3 rounded-xl font-semibold"
                            >
                                Send Gift 🎉
                            </button>
                            <button
                                onClick={closeGiftModal}
                                className="px-6 bg-gray-200 text-gray-600 py-3 rounded-xl font-semibold"
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Main Content */}
            {showContent && (
                <>
                    {/* Hero Section */}
                    <section className="min-h-screen flex items-center justify-center text-center px-6 relative">
                        <div id="starsContainer" className="absolute inset-0"></div>

                        <div className="relative z-10">
                            <div className="slide-container flex items-center justify-center">
                                {slideTexts.map((text, index) => (
                                    <div
                                        key={index}
                                        className={`slide-text text-5xl md:text-6xl font-bold font-['Dancing_Script'] ${slideColors[index]} ${slideIndex === index ? 'active' : ''}`}
                                    >
                                        {text}
                                    </div>
                                ))}
                            </div>

                            <p className="mt-8 text-gray-500 animate-pulse">Keep watching, beautiful 💫</p>
                        </div>
                    </section>

                    {/* Love Declaration */}
                    <section className="py-16 text-center px-6 fade-in-up visible" style={{ background: 'rgba(255,255,255,0.85)' }}>
                        <div className="max-w-3xl mx-auto">
                            <div className="text-6xl mb-6">💗</div>
                            <h2 className="text-4xl font-['Dancing_Script'] gradient-text mb-6">My Heart Belongs To You</h2>
                            <p className="text-lg text-gray-600 leading-relaxed">
                                Another year has passed, and my love for you only grows stronger.
                                You are my sunshine on cloudy days, my smile when I'm sad, my everything.
                                Today we celebrate the day the most amazing person came into this world – YOU!
                                Thank you for being my partner, my best friend, and my soulmate.
                                I love you more than words can ever express! 💖
                            </p>
                        </div>
                    </section>

                    {/* Countdown */}
                    <section className="py-16 text-center px-6 fade-in-up visible" style={{ background: 'rgba(255,255,255,0.85)' }}>
                        <h2 className="text-3xl font-bold font-['Dancing_Script'] text-rose-500 mb-8">
                            Countdown To Your Special Day ⏳
                        </h2>
                        <div className="flex justify-center gap-4 md:gap-6 flex-wrap">
                            <div className="countdown-box w-20 h-20 md:w-24 md:h-24 rounded-2xl flex flex-col items-center justify-center">
                                <span className="text-2xl md:text-3xl font-bold text-rose-500">{countdown.days}</span>
                                <span className="text-xs text-gray-500">Days</span>
                            </div>
                            <div className="countdown-box w-20 h-20 md:w-24 md:h-24 rounded-2xl flex flex-col items-center justify-center">
                                <span className="text-2xl md:text-3xl font-bold text-pink-500">{countdown.hours}</span>
                                <span className="text-xs text-gray-500">Hours</span>
                            </div>
                            <div className="countdown-box w-20 h-20 md:w-24 md:h-24 rounded-2xl flex flex-col items-center justify-center">
                                <span className="text-2xl md:text-3xl font-bold text-purple-500">{countdown.minutes}</span>
                                <span className="text-xs text-gray-500">Minutes</span>
                            </div>
                            <div className="countdown-box w-20 h-20 md:w-24 md:h-24 rounded-2xl flex flex-col items-center justify-center">
                                <span className="text-2xl md:text-3xl font-bold text-rose-400">{countdown.seconds}</span>
                                <span className="text-xs text-gray-500">Seconds</span>
                            </div>
                        </div>
                    </section>

                    {/* Typewriter Message */}
                    <section className="text-center py-20 px-6 fade-in-up visible" style={{ background: 'rgba(255,255,255,0.9)' }}>
                        <h2 className="text-3xl font-bold font-['Dancing_Script'] text-rose-500 mb-8">
                            A Letter For You 💕
                        </h2>
                        <div className="max-w-2xl mx-auto">
                            <p className="text-lg text-gray-600 leading-relaxed text-left whitespace-pre-wrap">{typedText}</p>
                            <span className="cursor-blink text-rose-500">|</span>
                        </div>
                    </section>

                    {/* Memories Gallery */}
                    <section className="py-20 fade-in-up visible" style={{ background: 'rgba(255,255,255,0.85)' }}>
                        <h2 className="text-center text-3xl font-bold font-['Dancing_Script'] text-rose-500 mb-10">
                            Our Beautiful Memories 📸
                        </h2>

                        <div className="flex overflow-x-auto space-x-6 px-6 snap-x snap-mandatory gallery-container">
                            {galleryImages.map((src, index) => (
                                <img
                                    key={index}
                                    src={src}
                                    alt={`Memory ${index + 1}`}
                                    className="gallery-item rounded-2xl shadow-lg snap-center min-w-[280px] h-[400px] object-cover"
                                />
                            ))}
                        </div>

                        <p className="text-center text-gray-500 mt-6">Swipe to see more 💫</p>
                    </section>

                    {/* Gift Reveal */}
                    <section className="text-center py-20 px-6 fade-in-up visible" style={{ background: 'rgba(255,255,255,0.85)' }}>
                        {!showGift ? (
                            <button
                                onClick={revealGift}
                                className="btn-primary text-white px-10 py-4 rounded-full shadow-lg animate-pulse-glow text-lg font-semibold"
                            >
                                🎁 Tap To Open Your Surprise
                            </button>
                        ) : (
                            <div className="mt-10 max-w-2xl mx-auto">
                                <div className="text-6xl mb-6 gift-reveal show">🎉💝🎉</div>
                                <h3 className="text-3xl font-bold font-['Dancing_Script'] gradient-text mb-4">
                                    You Are My Greatest Blessing!
                                </h3>
                                <p className="text-gray-600 text-lg leading-relaxed">
                                    Every day with you feels like a gift. You make my life complete in ways I never thought possible.
                                    Your smile lights up my world, your laughter is my favorite melody, and your love is everything I've
                                    ever wanted.
                                    I promise to love you forever, to cherish you always, and to make you as happy as you make me.
                                    You deserve all the love in the universe and more! 💖✨
                                </p>
                            </div>
                        )}
                    </section>

                    {/* Music Player */}
                    <div className="fixed bottom-6 left-6 z-40">
                        <button
                            onClick={toggleMusic}
                            className="bg-white p-3 rounded-full shadow-lg hover:scale-110 transition-transform"
                        >
                            <span>{musicPlaying ? '🔊' : '🎵'}</span>
                        </button>
                    </div>
                </>
            )}
        </div>
    )
}

export default Home
