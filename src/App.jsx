import { BrowserRouter as Router, Routes, Route, useNavigate } from 'react-router-dom'
import { useState, useRef, useEffect } from 'react'
import { supabase, STORAGE_KEYS } from './supabase'
import Home from './pages/Home'
import Locked from './pages/Locked'
import Gift from './pages/Gift'
import Admin from './pages/Admin'
import Upload from './pages/Upload'
import Slideshow from './pages/Slideshow'
import Order from './pages/Order'
import OrderStatus from './pages/OrderStatus'
import Birthday from './pages/Birthday'
import OrderUpload from './pages/OrderUpload'
import Register from './pages/Register'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Welcome from './pages/Welcome'
import SelectPackage from './pages/SelectPackage'

function ResetPassword() {
    const [password, setPassword] = useState('')
    const [confirmPassword, setConfirmPassword] = useState('')
    const [message, setMessage] = useState('')
    const [isLoading, setIsLoading] = useState(false)
    const navigate = useNavigate()

    useEffect(() => {
        const { hash } = window.location
        if (!hash.includes('access_token')) {
            setMessage('Invalid reset link. Please request a new password reset.')
        }
    }, [])

    async function handleReset(e) {
        e.preventDefault()
        setMessage('')

        if (password !== confirmPassword) {
            setMessage('Passwords do not match!')
            return
        }

        if (password.length < 6) {
            setMessage('Password must be at least 6 characters')
            return
        }

        setIsLoading(true)

        const { error } = await supabase.auth.updateUser({ password })

        if (error) {
            setMessage('Error: ' + error.message)
        } else {
            setMessage('Password updated successfully! Redirecting to login...')
            setTimeout(() => navigate('/login'), 2000)
        }

        setIsLoading(false)
    }

    return (
        <div className="min-h-screen flex items-center justify-center p-4" style={{ background: 'linear-gradient(135deg, #fce7f3 0%, #fbcfe8 100%)' }}>
            <div className="max-w-md w-full">
                <div className="bg-white rounded-3xl shadow-2xl p-8">
                    <div className="text-center mb-8">
                        <div className="text-6xl mb-4">🔐</div>
                        <h1 className="text-3xl font-['Dancing_Script'] text-rose-500">Reset Password</h1>
                        <p className="text-gray-500 mt-2">Enter your new password</p>
                    </div>

                    <form onSubmit={handleReset}>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-gray-600 mb-2">New Password</label>
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
                                <label className="block text-gray-600 mb-2">Confirm Password</label>
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

                        {message && (
                            <div className={`mt-4 p-3 rounded-xl text-sm ${message.includes('success') ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'}`}>
                                {message}
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={isLoading || message.includes('Invalid')}
                            className="w-full mt-6 bg-gradient-to-r from-rose-500 to-pink-500 text-white py-4 rounded-xl font-semibold hover:shadow-lg transition disabled:opacity-50"
                        >
                            {isLoading ? 'Resetting...' : 'Reset Password'}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    )
}

function AuthCallback() {
    const navigate = useNavigate()
    const processed = useRef(false)

    useEffect(() => {
        if (processed.current) return
        processed.current = true

        const handleAuth = async () => {
            try {
                const url = new URL(window.location.href)
                const code = url.searchParams.get('code')
                const hash = url.hash
                
                if (code) {
                    const { data, error } = await supabase.auth.exchangeCodeForSession(code)
                    
                    if (error) {
                        console.error('Auth callback error:', error)
                        navigate('/register?error=auth_failed', { replace: true })
                        return
                    }

                    if (data?.session) {
                        const user = data.session.user
                        localStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify({
                            id: user.id,
                            email: user.email,
                            name: user.email.split('@')[0],
                            role: 'user'
                        }))
                    }

                    navigate('/select-package', { replace: true })
                    return
                }
                
                if (hash && hash.includes('access_token')) {
                    const { data: { session }, error } = await supabase.auth.getSession()
                    
                    if (error) {
                        console.error('Auth callback error:', error)
                        navigate('/register?error=auth_failed', { replace: true })
                        return
                    }

                    if (session?.user) {
                        localStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify({
                            id: session.user.id,
                            email: session.user.email,
                            name: session.user.email.split('@')[0],
                            role: 'user'
                        }))
                    }

                    navigate('/select-package', { replace: true })
                    return
                }

                navigate('/register', { replace: true })
            } catch (err) {
                console.error('Auth callback error:', err)
                navigate('/register', { replace: true })
            }
        }

        handleAuth()
    }, [navigate])

    return (
        <div className="min-h-screen flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #fce7f3 0%, #fbcfe8 100%)' }}>
            <div className="text-center">
                <div className="text-4xl mb-4 animate-pulse">🎉</div>
                <p className="text-gray-600">Confirming your account...</p>
            </div>
        </div>
    )
}

function App() {
    return (
        <Router future={{
            v7_startTransition: true,
            v7_relativeSplatPath: true
        }}>
            <Routes>
                <Route path="/" element={<Welcome />} />
                <Route path="/order" element={<Order />} />
                <Route path="/order-status" element={<OrderStatus />} />
                <Route path="/register" element={<Register />} />
                <Route path="/login" element={<Login />} />
                <Route path="/auth/callback" element={<AuthCallback />} />
                <Route path="/reset-password" element={<ResetPassword />} />
                <Route path="/select-package" element={<SelectPackage />} />
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/birthday/:code" element={<Birthday />} />
                <Route path="/upload/:code" element={<Upload />} />
                <Route path="/slideshow/:code" element={<Slideshow />} />
                <Route path="/home" element={<Home />} />
                <Route path="/gift" element={<Gift />} />
                <Route path="/gift/:code" element={<Gift />} />
                <Route path="/admin" element={<Admin />} />
                <Route path="/upload" element={<Upload />} />
                <Route path="/slideshow" element={<Slideshow />} />
                <Route path="/locked" element={<Locked />} />
            </Routes>
        </Router>
    )
}

export default App
