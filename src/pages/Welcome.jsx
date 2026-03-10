import { useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { STORAGE_KEYS } from '../supabase'

function Welcome() {
    const navigate = useNavigate()

    useEffect(() => {
        // Check if user is already logged in
        const currentUser = JSON.parse(localStorage.getItem(STORAGE_KEYS.CURRENT_USER) || 'null')

        // Redirect to dashboard if already logged in
        if (currentUser) {
            navigate('/dashboard')
        }
    }, [navigate])

    return (
        <div className="min-h-screen flex items-center justify-center p-4" style={{ background: 'linear-gradient(135deg, #fce7f3 0%, #fbcfe8 50%, #e9d5ff 100%)' }}>
            <div className="max-w-md w-full">
                {/* Main Card */}
                <div className="bg-white rounded-3xl shadow-2xl p-8 text-center">
                    {/* Logo/Title */}
                    <div className="mb-8">
                        <div className="text-6xl mb-4 animate-float">🎂</div>
                        <h1 className="text-4xl font-['Dancing_Script'] text-rose-500 mb-2">
                            Birthday Surprise
                        </h1>
                        <p className="text-gray-500">Create beautiful birthday pages for your loved ones</p>
                    </div>

                    {/* Auth Options */}
                    <div className="space-y-4">
                        {/* Sign Up Button */}
                        <Link
                            to="/register"
                            className="block w-full bg-gradient-to-r from-rose-500 to-pink-500 text-white py-4 rounded-xl font-semibold text-lg hover:shadow-lg transition transform hover:scale-105"
                        >
                            ✨ Create Account
                        </Link>

                        {/* Login Button */}
                        <Link
                            to="/login"
                            className="block w-full bg-gradient-to-r from-purple-500 to-violet-500 text-white py-4 rounded-xl font-semibold text-lg hover:shadow-lg transition transform hover:scale-105"
                        >
                            🔐 Login
                        </Link>
                    </div>

                    {/* Divider */}
                    <div className="flex items-center my-8">
                        <div className="flex-1 h-px bg-gray-200"></div>
                        <span className="px-4 text-gray-400 text-sm">or</span>
                        <div className="flex-1 h-px bg-gray-200"></div>
                    </div>

                    {/* Browse Without Account */}
                    <Link
                        to="/order"
                        className="block w-full bg-gray-100 text-gray-600 py-3 rounded-xl font-semibold hover:bg-gray-200 transition"
                    >
                        Continue Without Account →
                    </Link>

                    {/* Features */}
                    <div className="mt-8 pt-8 border-t border-gray-100">
                        <h3 className="text-sm font-semibold text-gray-500 mb-4">WHAT YOU GET</h3>
                        <div className="grid grid-cols-2 gap-3 text-left">
                            <div className="flex items-center gap-2 text-sm text-gray-600">
                                <span>🎂</span> Personalized birthday page
                            </div>
                            <div className="flex items-center gap-2 text-sm text-gray-600">
                                <span>📸</span> Photo slideshow
                            </div>
                            <div className="flex items-center gap-2 text-sm text-gray-600">
                                <span>💕</span> Beautiful animations
                            </div>
                            <div className="flex items-center gap-2 text-sm text-gray-600">
                                <span>🎁</span> Gift collection
                            </div>
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="text-center mt-6">
                    <Link to="/order-status" className="text-rose-500 text-sm hover:text-rose-600 mr-4">
                        Check Order Status
                    </Link>
                    <p className="text-gray-500 text-sm">
                        By continuing, you agree to create wonderful moments
                    </p>
                </div>
            </div>
        </div>
    )
}

export default Welcome
