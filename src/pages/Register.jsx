import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase, STORAGE_KEYS } from '../supabase'

function Register() {
    const navigate = useNavigate()
    const [name, setName] = useState('')
    const [email, setEmail] = useState('')
    const [phone, setPhone] = useState('')
    const [otpCode, setOtpCode] = useState('')
    const [showOtpInput, setShowOtpInput] = useState(false)
    const [isLoading, setIsLoading] = useState(false)
    const [error, setError] = useState('')
    const [countdown, setCountdown] = useState(0)
    const [agreeToTerms, setAgreeToTerms] = useState(false)
    const [focusedField, setFocusedField] = useState(null)
    const [verificationSuccess, setVerificationSuccess] = useState(false)

    // Send OTP to email
    async function sendOTP() {
        setError('')
        setIsLoading(true)

        try {
            const { data, error } = await supabase.auth.signInWithOtp({
                email: email.trim().toLowerCase(),
                options: {
                    shouldCreateUser: true,
                    data: {
                        full_name: name.trim(),
                        phone: phone.trim()
                    }
                }
            })

            if (error) throw error

            setShowOtpInput(true)
            startCountdown()

        } catch (err) {
            setError(err.message || 'Failed to send verification code. Please try again.')
        } finally {
            setIsLoading(false)
        }
    }

    // Verify OTP code (8 characters)
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
                // Create user profile in your users table
                const { error: profileError } = await supabase.from('users').insert([{
                    id: data.user.id,
                    name: name.trim(),
                    email: email.trim().toLowerCase(),
                    phone: phone.trim(),
                    role: 'user',
                    created_at: new Date().toISOString()
                }])

                if (profileError && !profileError.message.includes('duplicate')) {
                    console.log('Profile save error:', profileError.message)
                }

                // Create free package for the user
                const { error: packageError } = await supabase
                    .from('user_packages')
                    .insert([{
                        user_id: data.user.id,
                        package_id: 74,
                        package_tier: 'free',
                        started_at: new Date().toISOString(),
                        expires_at: null,
                        is_active: true,
                        payment_status: 'free',
                        created_at: new Date().toISOString()
                    }])

                if (packageError) {
                    console.log('Package creation error:', packageError.message)
                }

                // Save to localStorage
                localStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify({
                    id: data.user.id,
                    email: email.trim().toLowerCase(),
                    name: name.trim(),
                    role: 'user',
                    package_tier: 'free'
                }))

                // Show success then redirect
                setVerificationSuccess(true)
                setTimeout(() => {
                    navigate('/select-package')
                }, 2000)
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

    async function handleRegister(e) {
        e.preventDefault()
        setError('')

        if (!name.trim()) {
            setError('Full name is required')
            return
        }

        if (!email) {
            setError('Email is required')
            return
        }

        if (!email.includes('@') || !email.includes('.')) {
            setError('Please enter a valid email address')
            return
        }

        if (!agreeToTerms) {
            setError('Please agree to the Terms & Conditions')
            return
        }

        // Send OTP
        await sendOTP()
    }

    return (
        <div className="min-h-screen flex items-center justify-center p-4" style={{ background: 'linear-gradient(135deg, #fce7f3 0%, #fbcfe8 100%)' }}>
            <button
                onClick={() => navigate(-1)}
                className="fixed top-4 left-4 bg-white/80 backdrop-blur-sm text-rose-500 px-4 py-2 rounded-full text-sm hover:bg-rose-100 transition shadow-lg z-50"
            >
                ← Back
            </button>

            <div className="max-w-md w-full">
                <div className="bg-white rounded-3xl shadow-2xl p-8">
                    {showOtpInput ? (
                        verificationSuccess ? (
                            <div className="text-center">
                                <div className="text-6xl mb-4 animate-bounce">✅</div>
                                <h2 className="text-2xl font-bold text-gray-700 mb-3">Verification Successful!</h2>
                                <p className="text-gray-600 mb-4">
                                    Your email has been verified successfully.
                                </p>
                                <p className="text-rose-500 mb-6">
                                    Redirecting you to select your package...
                                </p>
                                <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                                    <div className="bg-gradient-to-r from-rose-500 to-pink-500 h-full animate-pulse" style={{ width: '100%' }}></div>
                                </div>
                            </div>
                        ) : (
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
                                            'Verify Code'
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
                        )
                    ) : (
                        // Registration Form (no password fields)
                        <>
                            <div className="text-center mb-8">
                                <div className="text-6xl mb-4">🎉</div>
                                <h1 className="text-3xl font-['Dancing_Script'] text-rose-500">Create Account</h1>
                                <p className="text-gray-500 mt-2">Start creating memorable events!</p>
                            </div>

                            <form onSubmit={handleRegister} className="space-y-5">
                                {/* Full Name */}
                                <div>
                                    <label className="block text-gray-700 font-semibold mb-2">
                                        Full Name <span className="text-rose-500">*</span>
                                    </label>
                                    <div className={`relative transition-all duration-200 ${focusedField === 'name' ? 'transform scale-[1.02]' : ''}`}>
                                        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                            </svg>
                                        </div>
                                        <input
                                            type="text"
                                            value={name}
                                            onChange={(e) => setName(e.target.value)}
                                            onFocus={() => setFocusedField('name')}
                                            onBlur={() => setFocusedField(null)}
                                            required
                                            className="w-full pl-10 pr-4 py-3 border-2 border-rose-200 rounded-xl focus:outline-none focus:border-rose-400 transition-all"
                                            placeholder="Your full name"
                                        />
                                    </div>
                                </div>

                                {/* Email */}
                                <div>
                                    <label className="block text-gray-700 font-semibold mb-2">
                                        Email Address <span className="text-rose-500">*</span>
                                    </label>
                                    <div className={`relative transition-all duration-200 ${focusedField === 'email' ? 'transform scale-[1.02]' : ''}`}>
                                        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                            </svg>
                                        </div>
                                        <input
                                            type="email"
                                            value={email}
                                            onChange={(e) => setEmail(e.target.value)}
                                            onFocus={() => setFocusedField('email')}
                                            onBlur={() => setFocusedField(null)}
                                            required
                                            className="w-full pl-10 pr-4 py-3 border-2 border-rose-200 rounded-xl focus:outline-none focus:border-rose-400 transition-all"
                                            placeholder="your@email.com"
                                        />
                                    </div>
                                </div>

                                {/* Phone (Optional) */}
                                <div>
                                    <label className="block text-gray-700 font-semibold mb-2">
                                        Phone Number <span className="text-gray-400 text-sm font-normal">(Optional)</span>
                                    </label>
                                    <div className={`relative transition-all duration-200 ${focusedField === 'phone' ? 'transform scale-[1.02]' : ''}`}>
                                        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                                            </svg>
                                        </div>
                                        <input
                                            type="tel"
                                            value={phone}
                                            onChange={(e) => setPhone(e.target.value)}
                                            onFocus={() => setFocusedField('phone')}
                                            onBlur={() => setFocusedField(null)}
                                            className="w-full pl-10 pr-4 py-3 border-2 border-rose-200 rounded-xl focus:outline-none focus:border-rose-400 transition-all"
                                            placeholder="+233..."
                                        />
                                    </div>
                                </div>

                                {/* Terms & Conditions */}
                                <div className="flex items-center gap-3 p-3 bg-rose-50 rounded-xl">
                                    <input
                                        type="checkbox"
                                        id="terms"
                                        checked={agreeToTerms}
                                        onChange={(e) => setAgreeToTerms(e.target.checked)}
                                        className="w-5 h-5 accent-rose-500 rounded"
                                    />
                                    <label htmlFor="terms" className="text-gray-600 text-sm">
                                        I agree to the{' '}
                                        <a href="#" className="text-rose-500 hover:underline">Terms & Conditions</a>
                                        {' '}and{' '}
                                        <a href="#" className="text-rose-500 hover:underline">Privacy Policy</a>
                                    </label>
                                </div>

                                {error && (
                                    <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm">
                                        {error}
                                    </div>
                                )}

                                <button
                                    type="submit"
                                    disabled={isLoading}
                                    className="w-full bg-gradient-to-r from-rose-500 to-pink-500 text-white py-4 rounded-xl font-semibold hover:shadow-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {isLoading ? (
                                        <div className="flex items-center justify-center gap-2">
                                            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                            Sending Code...
                                        </div>
                                    ) : (
                                        'Create Account'
                                    )}
                                </button>
                            </form>

                            <div className="mt-6 text-center">
                                <p className="text-gray-500">
                                    Already have an account?{' '}
                                    <Link to="/login" className="text-rose-500 font-semibold hover:underline">
                                        Sign In
                                    </Link>
                                </p>
                            </div>

                            <div className="mt-4 text-center text-xs text-gray-400">
                                By creating an account, you agree to our terms
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    )
}

export default Register