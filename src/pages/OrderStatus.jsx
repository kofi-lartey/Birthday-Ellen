import { useState, useEffect } from 'react'
import { Link, useSearchParams, useNavigate } from 'react-router-dom'
import { supabase, STORAGE_KEYS } from '../supabase'

function OrderStatus() {
    const [searchParams] = useSearchParams()
    const navigate = useNavigate()
    const [eventCode, setEventCode] = useState(searchParams.get('code') || '')
    const [event, setEvent] = useState(null)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')

    useEffect(() => {
        if (eventCode) {
            checkEventStatus(eventCode)
        }
    }, [eventCode])

    async function checkEventStatus(code) {
        if (!code.trim()) {
            setError('Please enter your event code!')
            return
        }

        setLoading(true)
        setError('')

        try {
            // Check event_registry
            const { data, error } = await supabase
                .from('event_registry')
                .select('*')
                .eq('code', code.toUpperCase())
                .single()

            if (data) {
                setEvent(data)
            } else if (error) {
                setError('Event not found! Please check your code and try again.')
            }
        } catch (err) {
            console.log('Error checking event:', err)
            setError('Unable to check event status. Please try again.')
        }

        setLoading(false)
    }

    function handleSubmit(e) {
        e.preventDefault()
        checkEventStatus(eventCode)
    }

    return (
        <div className="min-h-screen" style={{ background: 'linear-gradient(135deg, #fce7f3 0%, #fbcfe8 50%, #e9d5ff 100%)' }}>
            <div className="fixed top-0 left-0 right-0 bg-white/80 backdrop-blur-md shadow-sm z-50">
                <div className="max-w-4xl mx-auto px-4 py-3 flex justify-between items-center">
                    <div className="flex items-center gap-3">
                        <button onClick={() => navigate('/')} className="text-rose-500 hover:text-rose-600">←</button>
                        <h1 className="text-xl font-['Dancing_Script'] text-rose-500">💕 Event Status</h1>
                    </div>
                    <Link to="/create-event" className="text-rose-500 text-sm">Create Event</Link>
                </div>
            </div>

            <div className="pt-20 px-4 pb-8">
                <div className="max-w-lg mx-auto">
                    <div className="text-center mb-8">
                        <div className="text-5xl mb-3">📋</div>
                        <h2 className="text-2xl font-bold text-gray-700">Check Event Status</h2>
                        <p className="text-gray-500">Enter your event code to view details</p>
                    </div>

                    <div className="bg-white rounded-3xl shadow-xl p-6 mb-6">
                        <form onSubmit={handleSubmit}>
                            <label className="block text-gray-600 mb-2 font-semibold">Your Event Code</label>
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    value={eventCode}
                                    onChange={(e) => setEventCode(e.target.value.toUpperCase())}
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

                    {event && (
                        <div className="bg-white rounded-3xl shadow-xl p-6">
                            <div className="text-center mb-6">
                                <div className="text-5xl mb-3">✅</div>
                                <h3 className="text-xl font-bold text-gray-700">Event Found!</h3>
                            </div>

                            <div className="bg-gradient-to-r from-rose-50 to-pink-50 rounded-2xl p-6 mb-6">
                                <div className="space-y-3">
                                    <div className="flex justify-between">
                                        <span className="text-gray-600">Event Code:</span>
                                        <span className="font-bold text-rose-500 font-mono">{event.code}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-gray-600">Event Type:</span>
                                        <span className="font-bold text-gray-700 capitalize">{event.event_type}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-gray-600">Event Name:</span>
                                        <span className="font-bold text-gray-700">{event.event_name}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-gray-600">Event Date:</span>
                                        <span className="font-bold text-gray-700">{new Date(event.event_date).toLocaleDateString()}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-gray-600">Status:</span>
                                        <span className={`font-bold ${event.status === 'active' ? 'text-green-500' : 'text-yellow-500'}`}>
                                            {event.status === 'active' ? 'ACTIVE ✓' : 'PENDING ⏳'}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            <button
                                onClick={() => navigate(`/event/${event.code}`)}
                                className="w-full bg-gradient-to-r from-rose-500 to-pink-500 text-white py-4 rounded-xl font-semibold text-lg hover:shadow-lg transition"
                            >
                                Go to Event Page →
                            </button>

                            <Link
                                to="/"
                                className="block text-center text-gray-500 py-4 mt-4"
                            >
                                ← Back to Home
                            </Link>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}

export default OrderStatus