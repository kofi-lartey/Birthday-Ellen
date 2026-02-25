import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import confetti from 'canvas-confetti'
import { STORAGE_KEYS } from '../supabase'

function Gift() {
    const navigate = useNavigate()
    const [giverName, setGiverName] = useState('')
    const [giftMessage, setGiftMessage] = useState('')
    const [momoNumber, setMomoNumber] = useState('')
    const [showMomoInfo, setShowMomoInfo] = useState(false)
    const [sent, setSent] = useState(false)

    useEffect(() => {
        // Load MoMo number from admin settings
        const number = localStorage.getItem(STORAGE_KEYS.MOM0)
        if (number) {
            setMomoNumber(number)
            setShowMomoInfo(true)
        }
    }, [])

    function sendGift() {
        const gifts = JSON.parse(localStorage.getItem(STORAGE_KEYS.GIFTS) || '[]')
        gifts.push({
            name: giverName || 'Anonymous',
            message: giftMessage,
            date: new Date().toISOString()
        })
        localStorage.setItem(STORAGE_KEYS.GIFTS, JSON.stringify(gifts))

        confetti({
            particleCount: 100,
            spread: 70,
            origin: { y: 0.6 }
        })

        setSent(true)
        setTimeout(() => {
            navigate('/')
        }, 2000)
    }

    if (sent) {
        return (
            <div
                className="min-h-screen flex items-center justify-center"
                style={{
                    background: 'linear-gradient(135deg, #fce7f3 0%, #fbcfe8 100%)'
                }}
            >
                <div className="text-center">
                    <div className="text-6xl mb-4">🎉💝🎉</div>
                    <h2 className="text-3xl font-['Dancing_Script'] text-rose-500">Gift Sent!</h2>
                    <p className="text-gray-600 mt-2">Ellen will see your love 💕</p>
                </div>
            </div>
        )
    }

    return (
        <div
            className="min-h-screen flex items-center justify-center p-4"
            style={{
                backgroundImage: 'url(https://res.cloudinary.com/djjgkezui/image/upload/v1771045116/IMG-20240920-WA0022_kltayh.jpg)',
                backgroundSize: 'cover',
                backgroundPosition: 'center'
            }}
        >
            {/* Dark overlay */}
            <div className="fixed inset-0 bg-black/90 backdrop-blur-sm"></div>

            {/* Back Button */}
            <Link
                to="/"
                className="fixed top-4 left-4 bg-white/80 hover:bg-rose-100 text-rose-500 px-4 py-2 rounded-full text-sm font-semibold shadow-lg transition z-40"
            >
                ← Back
            </Link>

            <div className="relative z-10 bg-white p-8 rounded-3xl max-w-sm w-full mx-4">
                <h3 className="text-2xl font-bold text-gray-700 mb-4 text-center font-['Dancing_Script']">
                    🎁 Gift for Ellen
                </h3>

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
                        className="flex-1 bg-gradient-to-r from-rose-500 to-pink-500 text-white py-3 rounded-xl font-semibold hover:shadow-lg transition"
                    >
                        Send Gift 🎉
                    </button>
                    <Link
                        to="/"
                        className="px-6 bg-gray-200 text-gray-600 py-3 rounded-xl font-semibold text-center"
                    >
                        Cancel
                    </Link>
                </div>
            </div>
        </div>
    )
}

export default Gift
