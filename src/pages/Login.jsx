import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase, STORAGE_KEYS } from '../supabase'

function Login() {
    const navigate = useNavigate()
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [isLoading, setIsLoading] = useState(false)
    const [error, setError] = useState('')
    const [showForgotPassword, setShowForgotPassword] = useState(false)
    const [resetEmail, setResetEmail] = useState('')
    const [resetMessage, setResetMessage] = useState('')

    async function handleLogin(e) {
        e.preventDefault()
        setError('')
        setIsLoading(true)

        try {
            // Login with Supabase Auth
            const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
                email: email.trim().toLowerCase(),
                password: password
            })

            if (authError) {
                if (authError.message.includes('429') || authError.message.includes('rate limit')) {
                    setError('Too many requests. Please wait a moment and try again.')
                } else if (authError.message.includes('Email not confirmed')) {
                    setError('Please confirm your email address before logging in. Check your inbox for the confirmation link.')
                } else {
                    setError('Invalid email or password')
                }
                setIsLoading(false)
                return
            }

            // Get user profile from users table
            if (authData.user) {
                const { data: userData, error: userError } = await supabase
                    .from('users')
                    .select('*')
                    .eq('id', authData.user.id)
                    .single()

                console.log('Login - User data from Supabase:', userData)

                const user = userData || {
                    id: authData.user.id,
                    email: authData.user.email,
                    role: 'user',
                    name: authData.user.email.split('@')[0]
                }

                console.log('Login - Final user object:', user)

                // Save current user
                localStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(user))
                setIsLoading(false)

                // Check if user needs to select a package
                if (!user.package_tier) {
                    navigate('/select-package')
                    return
                }

                // Check if admin
                if (user.role === 'admin' || user.role === 'super_admin') {
                    navigate('/admin')
                } else {
                    navigate('/dashboard')
                }
                return
            }

            setError('Login failed. Please try again.')
            setIsLoading(false)

        } catch (err) {
            console.error('Login error:', err)
            setError('An error occurred. Please try again.')
            setIsLoading(false)
        }
    }

    function handleForgotPassword(e) {
        e.preventDefault()
        setResetMessage('')

        const users = JSON.parse(localStorage.getItem(STORAGE_KEYS.USERS) || '[]')
        const user = users.find(u => u.email === resetEmail.trim().toLowerCase())

        if (user) {
            // In a real app, this would send an email
            // For now, show a message
            setResetMessage('Password reset link has been sent to your email!')
        } else {
            setResetMessage('No account found with that email address.')
        }
    }

    return (
        <div className="min-h-screen flex items-center justify-center p-4" style={{ background: 'linear-gradient(135deg, #fce7f3 0%, #fbcfe8 100%)' }}>
            {/* Back Link */}
            <button
                onClick={() => navigate(-1)}
                className="fixed top-4 left-4 bg-white/80 text-rose-500 px-4 py-2 rounded-full text-sm hover:bg-rose-100 transition shadow-lg"
            >
                ← Back
            </button>

            <div className="max-w-md w-full">
                <div className="bg-white rounded-3xl shadow-2xl p-8">
                    <div className="text-center mb-8">
                        <div className="text-6xl mb-4">🔐</div>
                        <h1 className="text-3xl font-['Dancing_Script'] text-rose-500">Welcome Back</h1>
                        <p className="text-gray-500 mt-2">Login to your account</p>
                    </div>

                    <form onSubmit={handleLogin}>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-gray-600 mb-2">Email or Phone</label>
                                <input
                                    type="text"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    required
                                    className="w-full p-3 border-2 border-rose-200 rounded-xl focus:outline-none focus:border-rose-400"
                                    placeholder="your@email.com or phone"
                                />
                            </div>

                            <div>
                                <label className="block text-gray-600 mb-2">Password</label>
                                <input
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    required
                                    className="w-full p-3 border-2 border-rose-200 rounded-xl focus:outline-none focus:border-rose-400"
                                    placeholder="Your password"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowForgotPassword(true)}
                                    className="text-rose-500 text-sm mt-1 hover:text-rose-600"
                                >
                                    Forgot Password?
                                </button>
                            </div>
                        </div>

                        {error && (
                            <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm">
                                {error}
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={isLoading}
                            className="w-full mt-6 bg-gradient-to-r from-rose-500 to-pink-500 text-white py-4 rounded-xl font-semibold hover:shadow-lg transition disabled:opacity-50"
                        >
                            {isLoading ? 'Logging in...' : 'Login'}
                        </button>
                    </form>

                    <div className="mt-6 text-center">
                        <p className="text-gray-500">
                            Don't have an account?{' '}
                            <Link to="/register" className="text-rose-500 font-semibold">
                                Register
                            </Link>
                        </p>
                    </div>
                </div>

                {/* Forgot Password Modal */}
                {showForgotPassword && (
                    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                        <div className="bg-white rounded-3xl p-6 max-w-md w-full">
                            <h3 className="text-xl font-bold text-gray-700 mb-4">Reset Password</h3>
                            <p className="text-gray-500 text-sm mb-4">
                                Enter your email address and we'll send you a link to reset your password.
                            </p>

                            <form onSubmit={handleForgotPassword}>
                                <div className="mb-4">
                                    <label className="block text-gray-600 mb-2">Email Address</label>
                                    <input
                                        type="email"
                                        value={resetEmail}
                                        onChange={(e) => setResetEmail(e.target.value)}
                                        required
                                        className="w-full p-3 border-2 border-rose-200 rounded-xl focus:outline-none focus:border-rose-400"
                                        placeholder="your@email.com"
                                    />
                                </div>

                                {resetMessage && (
                                    <div className={`mb-4 p-3 rounded-xl text-sm ${resetMessage.includes('sent') ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'}`}>
                                        {resetMessage}
                                    </div>
                                )}

                                <div className="flex gap-3">
                                    <button
                                        type="submit"
                                        className="flex-1 bg-rose-500 text-white py-3 rounded-xl font-semibold"
                                    >
                                        Send Reset Link
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => { setShowForgotPassword(false); setResetMessage(''); }}
                                        className="px-6 bg-gray-200 text-gray-600 py-3 rounded-xl font-semibold"
                                    >
                                        Cancel
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}

export default Login
