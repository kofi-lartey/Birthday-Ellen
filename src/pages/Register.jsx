import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase, STORAGE_KEYS } from '../supabase'

function Register() {
    const navigate = useNavigate()
    const [name, setName] = useState('')
    const [email, setEmail] = useState('')
    const [phone, setPhone] = useState('')
    const [password, setPassword] = useState('')
    const [confirmPassword, setConfirmPassword] = useState('')
    const [otpCode, setOtpCode] = useState('')
    const [showOtpInput, setShowOtpInput] = useState(false)
    const [isLoading, setIsLoading] = useState(false)
    const [error, setError] = useState('')
    const [showPassword, setShowPassword] = useState(false)
    const [showConfirmPassword, setShowConfirmPassword] = useState(false)
    const [passwordStrength, setPasswordStrength] = useState({ score: 0, label: '', color: '' })
    const [countdown, setCountdown] = useState(0)
    const [agreeToTerms, setAgreeToTerms] = useState(false)
    const [focusedField, setFocusedField] = useState(null)
    const [verificationSuccess, setVerificationSuccess] = useState(false)

    // Password strength checker
    const checkPasswordStrength = (pass) => {
        let score = 0
        let label = ''
        let color = ''

        if (pass.length >= 6) score += 1
        if (pass.length >= 10) score += 1
        if (/[A-Z]/.test(pass)) score += 1
        if (/[0-9]/.test(pass)) score += 1
        if (/[^A-Za-z0-9]/.test(pass)) score += 1

        if (score <= 1) { label = 'Weak'; color = 'bg-red-500' }
        else if (score <= 3) { label = 'Fair'; color = 'bg-yellow-500' }
        else if (score <= 4) { label = 'Good'; color = 'bg-blue-500' }
        else { label = 'Strong'; color = 'bg-green-500' }

        setPasswordStrength({ score, label, color, percent: (score / 5) * 100 })
    }

    useEffect(() => {
        if (password) checkPasswordStrength(password)
        else setPasswordStrength({ score: 0, label: '', color: '', percent: 0 })
    }, [password])

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
                        package_id: 74,  // Free package ID
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

        if (password !== confirmPassword) {
            setError('Passwords do not match!')
            return
        }

        if (password.length < 6) {
            setError('Password must be at least 6 characters')
            return
        }

        if (passwordStrength.score < 2) {
            setError('Please choose a stronger password')
            return
        }

        if (!agreeToTerms) {
            setError('Please agree to the Terms & Conditions')
            return
        }

        setIsLoading(true)

        try {
            // FIRST: Create the user with password in Supabase Auth
            const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
                email: email.trim().toLowerCase(),
                password: password,  // This creates the user with a password
                options: {
                    data: {
                        full_name: name.trim(),
                        phone: phone.trim()
                    }
                }
            })

            if (signUpError) {
                if (signUpError.message.includes('User already registered')) {
                    setError('An account with this email already exists. Please login instead.')
                } else {
                    throw signUpError
                }
                setIsLoading(false)
                return
            }

            if (signUpData?.user) {
                // Send OTP for email verification
                await sendOTP()
            }

        } catch (err) {
            setError(err.message || 'Registration failed. Please try again.')
            setIsLoading(false)
        }
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
                        // OTP Verification Screen
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
                        // Registration Form
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

                                {/* Password */}
                                <div>
                                    <label className="block text-gray-700 font-semibold mb-2">
                                        Password <span className="text-rose-500">*</span>
                                    </label>
                                    <div className={`relative transition-all duration-200 ${focusedField === 'password' ? 'transform scale-[1.02]' : ''}`}>
                                        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                                            </svg>
                                        </div>
                                        <input
                                            type={showPassword ? 'text' : 'password'}
                                            value={password}
                                            onChange={(e) => setPassword(e.target.value)}
                                            onFocus={() => setFocusedField('password')}
                                            onBlur={() => setFocusedField(null)}
                                            required
                                            className="w-full pl-10 pr-12 py-3 border-2 border-rose-200 rounded-xl focus:outline-none focus:border-rose-400 transition-all"
                                            placeholder="At least 6 characters"
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

                                    {/* Password Strength Meter */}
                                    {password && (
                                        <div className="mt-2">
                                            <div className="flex items-center gap-2 mb-1">
                                                <div className="flex-1 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                                                    <div
                                                        className={`h-full ${passwordStrength.color} transition-all duration-300 rounded-full`}
                                                        style={{ width: `${passwordStrength.percent}%` }}
                                                    />
                                                </div>
                                                <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${passwordStrength.label === 'Strong' ? 'bg-green-100 text-green-700' :
                                                        passwordStrength.label === 'Good' ? 'bg-blue-100 text-blue-700' :
                                                            passwordStrength.label === 'Fair' ? 'bg-yellow-100 text-yellow-700' :
                                                                'bg-red-100 text-red-700'
                                                    }`}>
                                                    {passwordStrength.label}
                                                </span>
                                            </div>
                                            <p className="text-xs text-gray-500">
                                                {passwordStrength.label === 'Strong' ? '✓ Great password!' :
                                                    passwordStrength.label === 'Good' ? 'Add special characters to make it stronger' :
                                                        'Use 10+ chars with uppercase, numbers & symbols'}
                                            </p>
                                        </div>
                                    )}
                                </div>

                                {/* Confirm Password */}
                                <div>
                                    <label className="block text-gray-700 font-semibold mb-2">
                                        Confirm Password <span className="text-rose-500">*</span>
                                    </label>
                                    <div className={`relative transition-all duration-200 ${focusedField === 'confirm' ? 'transform scale-[1.02]' : ''}`}>
                                        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                                            </svg>
                                        </div>
                                        <input
                                            type={showConfirmPassword ? 'text' : 'password'}
                                            value={confirmPassword}
                                            onChange={(e) => setConfirmPassword(e.target.value)}
                                            onFocus={() => setFocusedField('confirm')}
                                            onBlur={() => setFocusedField(null)}
                                            required
                                            className="w-full pl-10 pr-12 py-3 border-2 border-rose-200 rounded-xl focus:outline-none focus:border-rose-400 transition-all"
                                            placeholder="Confirm your password"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-rose-500 transition"
                                        >
                                            {showConfirmPassword ? (
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
                                    {confirmPassword && password !== confirmPassword && (
                                        <p className="text-xs text-red-500 mt-1">✗ Passwords do not match</p>
                                    )}
                                    {confirmPassword && password === confirmPassword && password && (
                                        <p className="text-xs text-green-500 mt-1">✓ Passwords match</p>
                                    )}
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