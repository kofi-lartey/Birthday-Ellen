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

        try {
            const { data, error } = await supabase.auth.signInWithPassword({
                email: email.trim().toLowerCase(),
                password: password
            })

            if (error) throw error

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
            setError(err.message || 'Invalid email or password')
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
            <button
                onClick={() => navigate(-1)}
                className="fixed top-4 left-4 bg-white/80 text-rose-500 px-4 py-2 rounded-full text-sm hover:bg-rose-100 transition shadow-lg"
            >
                ← Back
            </button>

            <div className="max-w-md w-full">
                <div className="bg-white rounded-3xl shadow-2xl p-8">
                    {showOtpInput ? (
                        <div className="text-center">
                            <div className="text-6xl mb-4">🔐</div>
                            <h2 className="text-2xl font-bold text-gray-700 mb-3">Verify Your Email</h2>
                            <p className="text-gray-600 mb-4">Enter the code sent to:</p>
                            <p className="text-rose-600 font-semibold mb-6">{email}</p>
                            
                            <input
                                type="text"
                                value={otpCode}
                                onChange={(e) => setOtpCode(e.target.value)}
                                placeholder="Enter 6-digit code"
                                maxLength="6"
                                className="w-full p-3 border-2 border-rose-200 rounded-xl text-center text-2xl tracking-widest mb-4"
                            />

                            <button
                                onClick={verifyOTP}
                                disabled={isLoading || otpCode.length !== 6}
                                className="w-full bg-gradient-to-r from-rose-500 to-pink-500 text-white py-3 rounded-xl font-semibold mb-3"
                            >
                                Verify & Login
                            </button>
                            
                            <button
                                onClick={sendOTP}
                                disabled={countdown > 0}
                                className="w-full bg-gray-100 text-gray-700 py-3 rounded-xl font-semibold"
                            >
                                {countdown > 0 ? `Resend in ${countdown}s` : 'Resend Code'}
                            </button>
                        </div>
                    ) : (
                        <>
                            <div className="text-center mb-8">
                                <div className="text-6xl mb-4">🎉</div>
                                <h1 className="text-3xl font-['Dancing_Script'] text-rose-500">Welcome Back</h1>
                                <p className="text-gray-500 mt-2">Login to your account</p>
                            </div>

                            <form onSubmit={handlePasswordLogin}>
                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-gray-600 mb-2">Email</label>
                                        <input
                                            type="email"
                                            value={email}
                                            onChange={(e) => setEmail(e.target.value)}
                                            required
                                            className="w-full p-3 border-2 border-rose-200 rounded-xl focus:outline-none focus:border-rose-400"
                                            placeholder="your@email.com"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-gray-600 mb-2">Password</label>
                                        <input
                                            type="password"
                                            value={password}
                                            onChange={(e) => setPassword(e.target.value)}
                                            className="w-full p-3 border-2 border-rose-200 rounded-xl focus:outline-none focus:border-rose-400"
                                            placeholder="Enter your password"
                                        />
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
                                    className="w-full mt-6 bg-gradient-to-r from-rose-500 to-pink-500 text-white py-4 rounded-xl font-semibold"
                                >
                                    {isLoading ? 'Logging in...' : 'Login'}
                                </button>
                            </form>

                            <div className="mt-4 text-center">
                                <button
                                    onClick={sendOTP}
                                    className="text-rose-500 text-sm hover:underline"
                                >
                                    Login with One-Time Code instead
                                </button>
                            </div>

                            <div className="mt-6 text-center">
                                <p className="text-gray-500">
                                    Don't have an account?{' '}
                                    <Link to="/register" className="text-rose-500 font-semibold">
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