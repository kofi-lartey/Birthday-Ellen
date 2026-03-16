import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase, STORAGE_KEYS } from '../supabase'

function Register() {
    const navigate = useNavigate()
    const [name, setName] = useState('')
    const [email, setEmail] = useState('')
    const [phone, setPhone] = useState('')
    const [password, setPassword] = useState('')
    const [confirmPassword, setConfirmPassword] = useState('')
    const [isLoading, setIsLoading] = useState(false)
    const [error, setError] = useState('')
    const [success, setSuccess] = useState(false)

    async function handleRegister(e) {
        e.preventDefault()
        setError('')

        if (password !== confirmPassword) {
            setError('Passwords do not match!')
            return
        }

        if (password.length < 6) {
            setError('Password must be at least 6 characters')
            return
        }

        setIsLoading(true)

        try {
            // Register with Supabase Auth
            const { data: authData, error: authError } = await supabase.auth.signUp({
                email: email.trim().toLowerCase(),
                password: password
            })

            if (authError) {
                if (authError.message.includes('429') || authError.message.includes('rate limit')) {
                    setError('Too many requests. Please wait a moment and try again.')
                } else if (authError.message.includes('User already registered')) {
                    setError('An account with this email already exists. Please login instead.')
                } else {
                    setError(authError.message)
                }
                setIsLoading(false)
                return
            }

            // If auth successful, save user profile to users table
            if (authData.user) {
                const { error: profileError } = await supabase.from('users').insert([{
                    id: authData.user.id,
                    name: name.trim(),
                    email: email.trim().toLowerCase(),
                    phone: phone.trim(),
                    role: 'user'
                }])

                if (profileError) {
                    console.log('Profile save error:', profileError.message)
                }

                // Check if email confirmation is required
                if (!authData.user.email_confirmed_at) {
                    // Show confirmation message instead of auto-redirect
                    setSuccess(true)
                    setIsLoading(false)
                    return
                }

                // Auto login - save session
                const { data: sessionData } = await supabase.auth.getSession()
                if (sessionData.session) {
                    localStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify({
                        id: authData.user.id,
                        email: email.trim().toLowerCase(),
                        name: name.trim(),
                        role: 'user'
                    }))
                }

                setSuccess(true)
                setTimeout(() => {
                    navigate('/select-package')
                }, 2000)
            }

        } catch (err) {
            setError('Registration failed. Please try again.')
            console.error('Registration error:', err)
        }

        setIsLoading(false)
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
                        <div className="text-6xl mb-4">🎉</div>
                        <h1 className="text-3xl font-['Dancing_Script'] text-rose-500">Create Account</h1>
                        <p className="text-gray-500 mt-2">Start creating birthday surprises!</p>
                    </div>

                    {success ? (
                        <div className="text-center">
                            <div className="text-5xl mb-4">✅</div>
                            <h2 className="text-xl font-bold text-gray-700 mb-2">Account Created!</h2>
                            <p className="text-gray-500">We've sent a confirmation email to <strong>{email}</strong>. Please check your inbox and click the confirmation link to activate your account.</p>
                            <p className="text-gray-500 mt-4">After confirming your email, you will be directed to select your subscription package.</p>
                            <button
                                onClick={() => navigate('/select-package')}
                                className="mt-6 bg-gradient-to-r from-rose-500 to-pink-500 text-white px-6 py-3 rounded-xl font-semibold"
                            >
                                Continue to Select Package →
                            </button>
                        </div>
                    ) : (
                        <form onSubmit={handleRegister}>
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-gray-600 mb-2">Full Name *</label>
                                    <input
                                        type="text"
                                        value={name}
                                        onChange={(e) => setName(e.target.value)}
                                        required
                                        className="w-full p-3 border-2 border-rose-200 rounded-xl focus:outline-none focus:border-rose-400"
                                        placeholder="Your full name"
                                    />
                                </div>

                                <div>
                                    <label className="block text-gray-600 mb-2">Email *</label>
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
                                    <label className="block text-gray-600 mb-2">Phone Number</label>
                                    <input
                                        type="tel"
                                        value={phone}
                                        onChange={(e) => setPhone(e.target.value)}
                                        className="w-full p-3 border-2 border-rose-200 rounded-xl focus:outline-none focus:border-rose-400"
                                        placeholder="+233..."
                                    />
                                </div>

                                <div>
                                    <label className="block text-gray-600 mb-2">Password *</label>
                                    <input
                                        type="password"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        required
                                        className="w-full p-3 border-2 border-rose-200 rounded-xl focus:outline-none focus:border-rose-400"
                                        placeholder="At least 6 characters"
                                    />
                                </div>

                                <div>
                                    <label className="block text-gray-600 mb-2">Confirm Password *</label>
                                    <input
                                        type="password"
                                        value={confirmPassword}
                                        onChange={(e) => setConfirmPassword(e.target.value)}
                                        required
                                        className="w-full p-3 border-2 border-rose-200 rounded-xl focus:outline-none focus:border-rose-400"
                                        placeholder="Confirm your password"
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
                                className="w-full mt-6 bg-gradient-to-r from-rose-500 to-pink-500 text-white py-4 rounded-xl font-semibold hover:shadow-lg transition disabled:opacity-50"
                            >
                                {isLoading ? 'Creating Account...' : 'Create Account 🎁'}
                            </button>
                        </form>
                    )}

                    <div className="mt-6 text-center">
                        <p className="text-gray-500">
                            Already have an account?{' '}
                            <Link to="/login" className="text-rose-500 font-semibold">
                                Login
                            </Link>
                        </p>
                    </div>
                </div>
            </div>
        </div>
    )
}

export default Register
