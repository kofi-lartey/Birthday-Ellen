import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase, STORAGE_KEYS } from '../supabase'

function Login() {
    const navigate = useNavigate()
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [otpCode, setOtpCode] = useState('')
    const [showOtpInput, setShowOtpInput] = useState(false)
    const [isLoading, setIsLoading] = useState(false)
    const [error, setError] = useState('')
    const [countdown, setCountdown] = useState(0)
    const [showPassword, setShowPassword] = useState(false)

    async function sendOTP() {
        setError('')
        setIsLoading(true)

        try {
            const { error } = await supabase.auth.signInWithOtp({
                email: email.trim().toLowerCase(),
            })

            if (error) throw error

            setShowOtpInput(true)
            startCountdown()

        } catch (err) {
            setError(err.message || 'Failed to send code. Please try again.')
        } finally {
            setIsLoading(false)
        }
    }

    async function verifyOTP() {
        setError('')
        setIsLoading(true)

        try {
            const { data, error } = await supabase.auth.verifyOtp({
                email: email.trim().toLowerCase(),
                token: otpCode,
                type: 'email'
            })

            if (error) throw error

            if (data?.user) {
                // Get user profile
                const { data: profile } = await supabase
                    .from('users')
                    .select('*')
                    .eq('id', data.user.id)
                    .single()

                localStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify({
                    id: data.user.id,
                    email: data.user.email,
                    name: profile?.name || data.user.user_metadata?.full_name,
                    role: profile?.role || 'user',
                    package_tier: profile?.package_tier
                }))

                navigate('/dashboard')
            }

        } catch (err) {
            setError('Invalid or expired code. Please try again.')
        } finally {
            setIsLoading(false)
        }
    }

    async function handlePasswordLogin(e) {
        e.preventDefault()
        setError('')
        setIsLoading(true)

        if (!email.trim() || !password) {
            setError('Please enter both email and password')
            setIsLoading(false)
            return
        }

        try {
            const { data, error } = await supabase.auth.signInWithPassword({
                email: email.trim().toLowerCase(),
                password: password
            })

            if (error) {
                console.error('Login error:', error)

                // Check if user exists in your users table
                const { data: userExists } = await supabase
                    .from('users')
                    .select('id')
                    .eq('email', email.trim().toLowerCase())
                    .single()

                if (userExists) {
                    // User exists but likely has no password (registered via OTP)
                    setError('This account was created without a password. Please use "Login with One-Time Code" or reset your password.')
                } else {
                    setError('Invalid email or password. Please try again or create an account.')
                }
                setIsLoading(false)
                return
            }

            if (data?.user) {
                const { data: profile } = await supabase
                    .from('users')
                    .select('*')
                    .eq('id', data.user.id)
                    .single()

                localStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify({
                    id: data.user.id,
                    email: data.user.email,
                    name: profile?.name,
                    role: profile?.role || 'user',
                    package_tier: profile?.package_tier
                }))

                navigate('/dashboard')
            }

        } catch (err) {
            console.error('Login error:', err)
            setError('An unexpected error occurred. Please try again.')
        } finally {
            setIsLoading(false)
        }
    }

    function startCountdown() {
        setCountdown(60)
        const timer = setInterval(() => {
            setCountdown(prev => {
                if (prev <= 1) {
                    clearInterval(timer)
                    return 0
                }
                return prev - 1
            })
        }, 1000)
    }

    return (
        <div className="min-h-screen flex items-center justify-center p-4" style={{ background: 'linear-gradient(135deg, #fce7f3 0%, #fbcfe8 100%)' }}>
            <Link
                to="/"
                className="fixed top-4 left-4 bg-white/80 text-rose-500 px-4 py-2 rounded-full text-sm hover:bg-rose-100 transition shadow-lg"
            >
                ← Back
            </Link>

            <div className="max-w-md w-full">
                <div className="bg-white rounded-3xl shadow-2xl p-8">
                    {showOtpInput ? (
                        <div className="text-center">
                            <div className="text-6xl mb-4">🔐</div>
                            <h2 className="text-2xl font-bold text-gray-700 mb-3">Verify Your Email</h2>
                            <p className="text-gray-600 mb-4">Enter the 8-digit code sent to:</p>
                            <p className="text-rose-600 font-semibold mb-6 bg-rose-50 py-2 px-4 rounded-full inline-block">
                                {email}
                            </p>

                            <div className="mb-6">
                                <input
                                    type="text"
                                    value={otpCode}
                                    onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, '').slice(0, 8))}
                                    placeholder="Enter 8-digit code"
                                    maxLength="8"
                                    className="w-full p-4 border-2 border-rose-200 rounded-xl focus:outline-none focus:border-rose-400 text-center text-2xl tracking-[0.3em] font-mono"
                                    autoFocus
                                />
                            </div>

                            <div className="space-y-3">
                                <button
                                    onClick={verifyOTP}
                                    disabled={isLoading || otpCode.length !== 8}
                                    className="w-full bg-gradient-to-r from-rose-500 to-pink-500 text-white py-3 rounded-xl font-semibold hover:shadow-lg transition disabled:opacity-50"
                                >
                                    {isLoading ? 'Verifying...' : 'Verify & Login'}
                                </button>

                                <button
                                    onClick={sendOTP}
                                    disabled={countdown > 0}
                                    className="w-full bg-gray-100 text-gray-700 py-3 rounded-xl font-semibold hover:bg-gray-200 transition disabled:opacity-50"
                                >
                                    {countdown > 0 ? `Resend in ${countdown}s` : 'Resend Code'}
                                </button>
                            </div>

                            {error && (
                                <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm">
                                    {error}
                                </div>
                            )}
                        </div>
                    ) : (
                        <>
                            <div className="text-center mb-8">
                                <div className="text-6xl mb-4">🎉</div>
                                <h1 className="text-3xl font-['Dancing_Script'] text-rose-500">Welcome Back</h1>
                                <p className="text-gray-500 mt-2">Login to your account</p>
                            </div>

                            <form onSubmit={handlePasswordLogin}>
                                <div className="space-y-5">
                                    {/* Email Input */}
                                    <div>
                                        <label className="block text-gray-700 font-semibold mb-2">Email Address</label>
                                        <div className="relative">
                                            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                                </svg>
                                            </div>
                                            <input
                                                type="email"
                                                value={email}
                                                onChange={(e) => setEmail(e.target.value)}
                                                required
                                                className="w-full pl-10 pr-4 py-3 border-2 border-rose-200 rounded-xl focus:outline-none focus:border-rose-400 transition-all"
                                                placeholder="your@email.com"
                                            />
                                        </div>
                                    </div>

                                    {/* Password Input with Eye Toggle */}
                                    <div>
                                        <label className="block text-gray-700 font-semibold mb-2">Password</label>
                                        <div className="relative">
                                            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                                                </svg>
                                            </div>
                                            <input
                                                type={showPassword ? 'text' : 'password'}
                                                value={password}
                                                onChange={(e) => setPassword(e.target.value)}
                                                className="w-full pl-10 pr-12 py-3 border-2 border-rose-200 rounded-xl focus:outline-none focus:border-rose-400 transition-all"
                                                placeholder="Enter your password"
                                            />
                                            <button
                                                type="button"
                                                onClick={() => setShowPassword(!showPassword)}
                                                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-rose-500 transition"
                                            >
                                                {showPassword ? (
                                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                                                    </svg>
                                                ) : (
                                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                                    </svg>
                                                )}
                                            </button>
                                        </div>
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
                                    {isLoading ? (
                                        <span className="flex items-center justify-center gap-2">
                                            <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                            Logging in...
                                        </span>
                                    ) : (
                                        'Login'
                                    )}
                                </button>
                            </form>

                            <div className="mt-4 text-center">
                                <button
                                    onClick={sendOTP}
                                    className="text-rose-500 text-sm hover:underline font-medium"
                                >
                                    Login with One-Time Code instead
                                </button>
                            </div>

                            <div className="mt-6 text-center">
                                <p className="text-gray-500">
                                    Don't have an account?{' '}
                                    <Link to="/register" className="text-rose-500 font-semibold hover:underline">
                                        Create Account
                                    </Link>
                                </p>
                                <Link to="/forgot-password" className="text-gray-400 text-sm hover:text-rose-500 mt-2 inline-block">
                                    Forgot Password?
                                </Link>
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    )
}

export default Login