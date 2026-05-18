import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../supabase'

function ForgotPassword() {
    const navigate = useNavigate()
    const [email, setEmail] = useState('')
    const [isLoading, setIsLoading] = useState(false)
    const [error, setError] = useState('')
    const [success, setSuccess] = useState(false)

    async function handleResetPassword(e) {
        e.preventDefault()
        setError('')
        setIsLoading(true)

        if (!email.trim()) {
            setError('Please enter your email address')
            setIsLoading(false)
            return
        }

        try {
            console.log('Sending reset email to:', email.trim().toLowerCase())
            
            const { data, error } = await supabase.auth.resetPasswordForEmail(
                email.trim().toLowerCase(),
                {
                    redirectTo: `${window.location.origin}/reset-password`,
                }
            )

            console.log('Reset response:', { data, error })

            if (error) {
                // Handle specific error cases
                if (error.message.includes('rate limit')) {
                    setError('Too many requests. Please wait a few minutes before trying again.')
                } else if (error.message.includes('User not found')) {
                    setError('No account found with this email address.')
                } else {
                    setError(error.message)
                }
                setIsLoading(false)
                return
            }

            setSuccess(true)

        } catch (err) {
            console.error('Reset password error:', err)
            setError('Failed to send reset email. Please try again.')
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <div className="min-h-screen flex items-center justify-center p-4" style={{ background: 'linear-gradient(135deg, #fce7f3 0%, #fbcfe8 100%)' }}>
            <Link
                to="/login"
                className="fixed top-4 left-4 bg-white/80 text-rose-500 px-4 py-2 rounded-full text-sm hover:bg-rose-100 transition shadow-lg"
            >
                ← Back to Login
            </Link>

            <div className="max-w-md w-full">
                <div className="bg-white rounded-3xl shadow-2xl p-8">
                    {success ? (
                        <div className="text-center">
                            <div className="text-6xl mb-4">📧</div>
                            <h2 className="text-2xl font-bold text-gray-700 mb-3">Check Your Email</h2>
                            <p className="text-gray-600 mb-4">
                                We've sent a password reset link to:
                            </p>
                            <p className="text-rose-600 font-semibold mb-6 bg-rose-50 py-2 px-4 rounded-full inline-block">
                                {email}
                            </p>
                            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6">
                                <p className="text-amber-700 text-sm">
                                    🔒 Click the link in your email to reset your password. 
                                    The link will expire in 1 hour.
                                </p>
                                <p className="text-amber-600 text-xs mt-2">
                                    Check your spam folder if you don't see the email in your inbox.
                                </p>
                            </div>
                            <button
                                onClick={() => navigate('/login')}
                                className="w-full bg-gradient-to-r from-rose-500 to-pink-500 text-white py-3 rounded-xl font-semibold hover:shadow-lg transition"
                            >
                                Back to Login
                            </button>
                        </div>
                    ) : (
                        <>
                            <div className="text-center mb-8">
                                <div className="text-6xl mb-4">🔐</div>
                                <h1 className="text-3xl font-['Dancing_Script'] text-rose-500">Reset Password</h1>
                                <p className="text-gray-500 mt-2">
                                    Enter your email address and we'll send you a link to reset your password.
                                </p>
                            </div>

                            <form onSubmit={handleResetPassword} className="space-y-6">
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
                                            Sending...
                                        </span>
                                    ) : (
                                        'Send Reset Link'
                                    )}
                                </button>
                            </form>

                            <div className="mt-6 text-center">
                                <p className="text-gray-500">
                                    Remember your password?{' '}
                                    <Link to="/login" className="text-rose-500 font-semibold hover:underline">
                                        Back to Login
                                    </Link>
                                </p>
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    )
}

export default ForgotPassword