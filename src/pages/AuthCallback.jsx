import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase, STORAGE_KEYS } from '../supabase'

function AuthCallback() {
    const navigate = useNavigate()
    const [status, setStatus] = useState('loading')
    const [errorMessage, setErrorMessage] = useState('')

    useEffect(() => {
        const handleAuth = async () => {
            try {
                const url = new URL(window.location.href)
                const code = url.searchParams.get('code')
                const hash = url.hash
                const type = url.searchParams.get('type')
                
                console.log('Auth callback triggered:', { code: !!code, hash: !!hash, type })

                // ========== OTP VERIFICATION (Already handled in Register/Login) ==========
                if (type === 'email' || type === 'sms' || type === 'magiclink') {
                    // OTP is already verified on the Register/Login page
                    // This is just a fallback in case user clicks a stale link
                    console.log('OTP verification - already handled, redirecting to login')
                    navigate('/login', { replace: true })
                    return
                }

                // ========== MAGIC LINK / EMAIL CONFIRMATION ==========
                if (code) {
                    console.log('Exchanging code for session...')
                    const { data, error } = await supabase.auth.exchangeCodeForSession(code)

                    if (error) {
                        console.error('Auth callback error:', error)
                        setErrorMessage(error.message)
                        setStatus('error')
                        return
                    }

                    if (data?.session) {
                        const user = data.session.user
                        
                        // Get or create user profile
                        let { data: profile } = await supabase
                            .from('users')
                            .select('*')
                            .eq('id', user.id)
                            .single()

                        // If profile doesn't exist, create it
                        if (!profile) {
                            const { data: newProfile, error: createError } = await supabase
                                .from('users')
                                .insert([{
                                    id: user.id,
                                    name: user.user_metadata?.full_name || user.email.split('@')[0],
                                    email: user.email,
                                    role: 'user',
                                    created_at: new Date().toISOString()
                                }])
                                .select()
                                .single()
                            
                            if (!createError && newProfile) {
                                profile = newProfile
                            }
                        }
                        
                        const userData = {
                            id: user.id,
                            email: user.email,
                            name: profile?.name || user.user_metadata?.full_name || user.email.split('@')[0],
                            role: profile?.role || 'user',
                            package_tier: profile?.package_tier || null
                        }
                        localStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(userData))
                        
                        setStatus('success')
                        return
                    }
                }

                // ========== PASSWORD RESET HANDLER ==========
                if (hash && hash.includes('access_token')) {
                    console.log('Processing password reset...')
                    // For password reset, redirect to reset password page
                    // The reset-password page will handle the actual password update
                    navigate('/reset-password', { replace: true })
                    return
                }

                // ========== NO MATCHING HANDLER ==========
                setStatus('error')
                setErrorMessage('Unable to verify your account. Please try logging in.')
                
            } catch (err) {
                console.error('Auth callback error:', err)
                setErrorMessage(err.message || 'An unexpected error occurred')
                setStatus('error')
            }
        }

        handleAuth()
    }, [navigate])

    useEffect(() => {
        if (status === 'success') {
            const user = JSON.parse(localStorage.getItem(STORAGE_KEYS.CURRENT_USER) || 'null')
            // Check if user has a package (not free or null)
            if (user?.package_tier && user.package_tier !== 'free' && user.package_tier !== null) {
                navigate('/dashboard', { replace: true })
            } else {
                navigate('/select-package', { replace: true })
            }
        } else if (status === 'error') {
            setTimeout(() => {
                navigate('/login', { replace: true })
            }, 3000)
        }
    }, [status, navigate, errorMessage])

    return (
        <div className="min-h-screen flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #fce7f3 0%, #fbcfe8 100%)' }}>
            <div className="text-center max-w-md mx-auto p-8">
                {status === 'loading' && (
                    <>
                        <div className="text-6xl mb-4 animate-pulse">🎉</div>
                        <div className="animate-spin rounded-full h-12 w-12 border-b-4 border-rose-500 mx-auto mb-4"></div>
                        <p className="text-gray-600">Confirming your account...</p>
                    </>
                )}
                
                {status === 'success' && (
                    <>
                        <div className="text-6xl mb-4">✅</div>
                        <h2 className="text-2xl font-bold text-gray-700 mb-2">Email Verified!</h2>
                        <p className="text-gray-600">Your account has been successfully verified.</p>
                        <p className="text-rose-500 mt-4">Redirecting you to select your package...</p>
                        <div className="mt-4 w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                            <div className="bg-gradient-to-r from-rose-500 to-pink-500 h-full animate-pulse" style={{ width: '100%' }}></div>
                        </div>
                    </>
                )}
                
                {status === 'error' && (
                    <>
                        <div className="text-6xl mb-4">❌</div>
                        <h2 className="text-2xl font-bold text-gray-700 mb-2">Verification Failed</h2>
                        <p className="text-gray-600 mb-4">{errorMessage || 'Unable to verify your account.'}</p>
                        <p className="text-rose-500">Redirecting you to login...</p>
                    </>
                )}
            </div>
        </div>
    )
}

export default AuthCallback