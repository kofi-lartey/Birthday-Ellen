import { useState } from 'react'
import { Link } from 'react-router-dom'

function Locked() {
    const [password, setPassword] = useState('')
    const [error, setError] = useState(false)

    function checkPassword() {
        if (password === 'ellen2025' || password === '1313') {
            // Store auth state
            localStorage.setItem('ellenAuthenticated', 'true')
            window.location.href = '/home'
        } else {
            setError(true)
            setTimeout(() => setError(false), 3000)
        }
    }

    return (
        <div
            className="min-h-screen flex items-center justify-center"
            style={{
                backgroundImage: 'url(https://res.cloudinary.com/djjgkezui/image/upload/v1771045116/IMG-20240920-WA0022_kltayh.jpg)',
                backgroundSize: 'cover',
                backgroundPosition: 'center'
            }}
        >
            {/* Dark overlay */}
            <div className="fixed inset-0 bg-black/90 backdrop-blur-sm"></div>

            {/* Admin Link */}
            <Link
                to="/admin"
                className="fixed top-4 right-4 bg-rose-500 text-white px-4 py-2 rounded-full text-sm hover:bg-rose-600 transition shadow-lg z-40"
            >
                🔐 Admin
            </Link>

            <div className="relative z-10 max-w-md w-full mx-4">
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
                            className="bg-gradient-to-r from-rose-500 to-pink-500 text-white px-6 py-3 rounded-full w-full font-semibold hover:shadow-lg transition"
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
                    <Link
                        to="/gift"
                        className="block w-full text-left bg-gradient-to-r from-amber-100 to-yellow-100 p-6 rounded-2xl shadow-xl hover:shadow-2xl transition"
                    >
                        <div className="flex items-center gap-4">
                            <div className="text-4xl">🎁</div>
                            <div>
                                <h3 className="text-xl font-bold text-gray-700">Gift Ellen</h3>
                                <p className="text-gray-500 text-sm">Send a virtual gift • Optional name</p>
                            </div>
                        </div>
                    </Link>
                </div>
            </div>
        </div>
    )
}

export default Locked
