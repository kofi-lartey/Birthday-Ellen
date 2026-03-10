import { useState, useEffect } from 'react'
import { Link, useSearchParams, useNavigate } from 'react-router-dom'
import { supabase, STORAGE_KEYS } from '../supabase'

function OrderStatus() {
    const [searchParams] = useSearchParams()
    const navigate = useNavigate()
    const [orderCode, setOrderCode] = useState(searchParams.get('code') || '')
    const [order, setOrder] = useState(null)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')

    useEffect(() => {
        if (orderCode) {
            checkOrderStatus(orderCode)
        }
    }, [])

    async function checkOrderStatus(code) {
        if (!code.trim()) {
            setError('Please enter your order code!')
            return
        }

        setLoading(true)
        setError('')

        // Check localStorage first
        const localOrders = JSON.parse(localStorage.getItem(STORAGE_KEYS.ORDERS) || '[]')
        const localOrder = localOrders.find(o => o.code.toLowerCase() === code.toLowerCase())

        if (localOrder) {
            setOrder(localOrder)
            setLoading(false)
            return
        }

        // Check Supabase
        try {
            const { data, error } = await supabase
                .from('orders')
                .select('*')
                .eq('code', code.toUpperCase())
                .limit(1);

            if (data && data.length > 0) {
                setOrder(data[0]);
            } else if (error) {
                // Table might not exist, that's ok - use localStorage
                console.log('Supabase orders table not available, using local storage')
                setError('')
            } else {
                setError('Order not found! Please check your code and try again.')
            }
        } catch (err) {
            // Supabase not available, use localStorage
            console.log('Supabase not available, using local storage')
            setError('')
        }

        setLoading(false)
    }

    function handleSubmit(e) {
        e.preventDefault()
        checkOrderStatus(orderCode)
    }

    return (
        <div className="min-h-screen" style={{ background: 'linear-gradient(135deg, #fce7f3 0%, #fbcfe8 50%, #e9d5ff 100%)' }}>
            {/* Header */}
            <div className="fixed top-0 left-0 right-0 bg-white/80 backdrop-blur-md shadow-sm z-50">
                <div className="max-w-4xl mx-auto px-4 py-3 flex justify-between items-center">
                    <div className="flex items-center gap-3">
                        <button onClick={() => navigate('/')} className="text-rose-500 hover:text-rose-600">
                            ←
                        </button>
                        <h1 className="text-xl font-['Dancing_Script'] text-rose-500">💕 Birthday surprise</h1>
                    </div>
                    <Link to="/order" className="text-rose-500 text-sm">New Order</Link>
                </div>
            </div>

            <div className="pt-20 px-4 pb-8">
                <div className="max-w-lg mx-auto">
                    <div className="text-center mb-8">
                        <div className="text-5xl mb-3">📋</div>
                        <h2 className="text-2xl font-bold text-gray-700">Check Order Status</h2>
                        <p className="text-gray-500">Enter your order code to see if it's been verified</p>
                    </div>

                    {/* Search Form */}
                    <div className="bg-white rounded-3xl shadow-xl p-6 mb-6">
                        <form onSubmit={handleSubmit}>
                            <label className="block text-gray-600 mb-2 font-semibold">Your Order Code</label>
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    value={orderCode}
                                    onChange={(e) => setOrderCode(e.target.value.toUpperCase())}
                                    placeholder="Enter code (e.g., ABC123)"
                                    className="flex-1 p-4 border-2 border-rose-200 rounded-xl focus:outline-none focus:border-rose-400 uppercase font-mono text-lg tracking-wider"
                                    maxLength={6}
                                />
                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="bg-rose-500 text-white px-6 py-4 rounded-xl font-semibold disabled:opacity-50"
                                >
                                    {loading ? '...' : 'Check'}
                                </button>
                            </div>
                        </form>

                        {error && (
                            <div className="mt-4 bg-red-50 border border-red-200 rounded-xl p-4">
                                <p className="text-red-600 text-center">{error}</p>
                            </div>
                        )}
                    </div>

                    {/* Order Status Result */}
                    {order && (
                        <div className="bg-white rounded-3xl shadow-xl p-6">
                            <div className="text-center mb-6">
                                {order.status === 'paid' || order.status === 'active' ? (
                                    <div className="text-5xl mb-3">✅</div>
                                ) : (
                                    <div className="text-5xl mb-3">⏳</div>
                                )}
                                <h3 className="text-xl font-bold text-gray-700">
                                    {order.status === 'paid' || order.status === 'active'
                                        ? 'Order Verified!'
                                        : 'Order Pending'}
                                </h3>
                            </div>

                            <div className="bg-gradient-to-r from-rose-50 to-pink-50 rounded-2xl p-6 mb-6">
                                <div className="space-y-3">
                                    <div className="flex justify-between">
                                        <span className="text-gray-600">Order Code:</span>
                                        <span className="font-bold text-rose-500 font-mono">{order.code}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-gray-600">For:</span>
                                        <span className="font-bold text-gray-700">{order.recipient_name}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-gray-600">Package:</span>
                                        <span className="font-bold text-gray-700 capitalize">{order.package}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-gray-600">Status:</span>
                                        <span className={`font-bold ${order.status === 'paid' || order.status === 'active' ? 'text-green-500' : 'text-yellow-500'}`}>
                                            {order.status === 'paid' || order.status === 'active' ? 'VERIFIED ✓' : 'PENDING ⏳'}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {order.status === 'paid' || order.status === 'active' ? (
                                <div className="space-y-3">
                                    <p className="text-gray-600 text-center text-sm mb-4">
                                        🎉 Your order has been verified! You can now access and customize your birthday page.
                                    </p>
                                    <button
                                        onClick={() => navigate(`/birthday/${order.code}`)}
                                        className="w-full bg-gradient-to-r from-rose-500 to-pink-500 text-white py-4 rounded-xl font-semibold text-lg hover:shadow-lg transition"
                                    >
                                        Go to Birthday Page →
                                    </button>
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4">
                                        <p className="text-yellow-800 text-sm">
                                            <strong>📝 Next Steps:</strong>
                                            <br />1. Make payment via MoMo
                                            <br />2. Contact admin to verify payment
                                            <br />3. Return here to check status
                                        </p>
                                    </div>
                                    <Link
                                        to="/order"
                                        className="block text-center text-rose-500 py-2"
                                    >
                                        Need to make a new order?
                                    </Link>
                                </div>
                            )}

                            <Link
                                to="/"
                                className="block text-center text-gray-500 py-4 mt-4"
                            >
                                ← Back to Home
                            </Link>
                        </div>
                    )}

                    {/* Instructions */}
                    {!order && !error && !loading && (
                        <div className="bg-white rounded-3xl shadow-xl p-6">
                            <h3 className="font-bold text-gray-700 mb-4 text-center">How to Check Your Order</h3>
                            <div className="space-y-4 text-gray-600">
                                <div className="flex items-start gap-3">
                                    <span className="text-2xl">1️⃣</span>
                                    <p>Enter the order code you received when you submitted your order</p>
                                </div>
                                <div className="flex items-start gap-3">
                                    <span className="text-2xl">2️⃣</span>
                                    <p>Click "Check" to see if your order has been verified</p>
                                </div>
                                <div className="flex items-start gap-3">
                                    <span className="text-2xl">3️⃣</span>
                                    <p>If verified, you can access your birthday page!</p>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}

export default OrderStatus
