import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase, STORAGE_KEYS } from '../supabase'

function Login() {
    const navigate = useNavigate()
    const [email, setEmail] = useState('')
    const [otpCode, setOtpCode] = useState('')
    const [showOtpInput, setShowOtpInput] = useState(false)
    const [isLoading, setIsLoading] = useState(false)
    const [error, setError] = useState('')
    const [countdown, setCountdown] = useState(0)

    async function sendOTP() {
        setError('')
        setIsLoading(true)

        if (!email.trim()) {
            setError('Please enter your email address')
            setIsLoading(false)
            return
        }

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
                // Get user profile from your users table
                const { data: profile } = await supabase
                    .from('users')
                    .select('*')
                    .eq('id', data.user.id)
                    .single()

                localStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify({
                    id: data.user.id,
                    email: data.user.email,
                    name: profile?.name || data.user.user_metadata?.full_name || data.user.email?.split('@')[0],
                    role: profile?.role || 'user',
                    package_tier: profile?.package_tier || 'free'
                }))

                navigate('/dashboard')
            }

        } catch (err) {
            setError('Invalid or expired code. Please try again.')
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
                            <div className="text-6xl mb-4 animate-bounce">🔐</div>
                            <h2 className="text-2xl font-bold text-gray-700 mb-3">Verify Your Email</h2>
                            <p className="text-gray-600 mb-4">
                                We sent an 8-digit verification code to:
                            </p>
                            <p className="text-rose-600 font-semibold mb-6 text-lg bg-rose-50 py-2 px-4 rounded-full inline-block break-all max-w-full">
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
                                    className="w-full bg-gradient-to-r from-rose-500 to-pink-500 text-white py-4 rounded-xl font-semibold hover:shadow-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {isLoading ? (
                                        <div className="flex items-center justify-center gap-2">
                                            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                            Verifying...
                                        </div>
                                    ) : (
                                        'Verify & Login'
                                    )}
                                </button>

                                <button
                                    onClick={sendOTP}
                                    disabled={countdown > 0 || isLoading}
                                    className="w-full bg-gray-100 text-gray-700 py-4 rounded-xl font-semibold hover:bg-gray-200 transition disabled:opacity-50"
                                >
                                    {countdown > 0 ? `Resend code in ${countdown}s` : 'Resend Code'}
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
                                <p className="text-gray-500 mt-2">Sign in with your email</p>
                            </div>

                            <form onSubmit={(e) => { e.preventDefault(); sendOTP(); }} className="space-y-5">
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

                                {error && (
                                    <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm">
                                        {error}
                                    </div>
                                )}

                                <button
                                    type="submit"
                                    disabled={isLoading}
                                    className="w-full bg-gradient-to-r from-rose-500 to-pink-500 text-white py-4 rounded-xl font-semibold hover:shadow-lg transition disabled:opacity-50"
                                >
                                    {isLoading ? (
                                        <span className="flex items-center justify-center gap-2">
                                            <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                            Sending Code...
                                        </span>
                                    ) : (
                                        'Send Login Code'
                                    )}
                                </button>
                            </form>

                            <div className="mt-6 text-center">
                                <p className="text-gray-500">
                                    Don't have an account?{' '}
                                    <Link to="/register" className="text-rose-500 font-semibold hover:underline">
                                        Create Account
                                    </Link>
                                </p>
                            </div>

                            <div className="mt-4 text-center text-xs text-gray-400">
                                We'll send you an 8-digit code to verify your email
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    )
}

export default Login