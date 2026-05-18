import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { supabase, STORAGE_KEYS } from '../supabase'
import { generatePaymentReference } from '../utils/paymentRef'

const PAYMENT_NUMBER = '0531114795'
const ADMIN_CONTACT = '0557655008'
const ADMIN_WHATSAPP = '233557655008'

const PACKAGE_NAMES = {
    free: 'Free',
    basic: 'Basic',
    premium: 'Premium',
    enterprise: 'Enterprise'
}

function PaymentDetails() {
    const navigate = useNavigate()
    const [searchParams] = useSearchParams()
    const selectedPackageTier = searchParams.get('package') || 'basic'
    const price = searchParams.get('price') || '0'
    const currency = searchParams.get('currency') || 'GHS'
    
    // Map package tier to correct package ID
    const selectedPackageId = (() => {
        const id = Number(searchParams.get('packageId'))
        if (Number.isInteger(id) && id >= 74 && id <= 77) {
            return id
        }
        const packageIdMap = {
            free: 74,
            basic: 75,
            premium: 76,
            enterprise: 77
        }
        return packageIdMap[selectedPackageTier] || 75
    })()

    const [user, setUser] = useState(null)
    const [senderNumber, setSenderNumber] = useState('')
    const [amountPaid, setAmountPaid] = useState(price)
    const [notes, setNotes] = useState('')
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [error, setError] = useState('')
    const [paymentReference, setPaymentReference] = useState('')
    const [showConfirmationCard, setShowConfirmationCard] = useState(false)
    const [isPaid, setIsPaid] = useState(false)
    const [userCurrentPackage, setUserCurrentPackage] = useState('free')

    // Load user and get current package
    useEffect(() => {
        const loadUser = async () => {
            // Get session from Supabase Auth
            const { data: { session } } = await supabase.auth.getSession()
            
            if (!session?.user) {
                navigate('/login')
                return
            }

            // Get user profile from users table
            const { data: userProfile, error: profileError } = await supabase
                .from('users')
                .select('*')
                .eq('id', session.user.id)
                .single()

            if (profileError) {
                console.error('Error loading user profile:', profileError)
                navigate('/login')
                return
            }

            // Set user with current package
            const currentUser = {
                id: session.user.id,
                email: session.user.email,
                name: userProfile.name,
                package_tier: userProfile.package_tier || 'free',
                payment_status: userProfile.payment_status,
                ...userProfile
            }
            
            setUser(currentUser)
            setUserCurrentPackage(userProfile.package_tier || 'free')
            
            // Update localStorage with correct data
            localStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(currentUser))

            console.log('Current user package:', userProfile.package_tier)
        }

        loadUser()

        const refCode = generatePaymentReference(selectedPackageTier)
        setPaymentReference(refCode)
    }, [navigate, selectedPackageTier])

    // Get current package display name
    const getCurrentPackageDisplay = () => {
        const packageName = PACKAGE_NAMES[userCurrentPackage] || 'Free'
        return packageName
    }

    // Play notification sound
    function playNotificationSound() {
        try {
            const audioContext = new (window.AudioContext || window.webkitAudioContext)()
            const oscillator = audioContext.createOscillator()
            const gainNode = audioContext.createGain()
            oscillator.connect(gainNode)
            gainNode.connect(audioContext.destination)
            oscillator.frequency.value = 880
            gainNode.gain.value = 0.15
            oscillator.type = 'sine'
            oscillator.start()
            gainNode.gain.exponentialRampToValueAtTime(0.00001, audioContext.currentTime + 0.3)
            oscillator.stop(audioContext.currentTime + 0.3)
            audioContext.resume().catch(e => console.log('Audio resume failed'))
        } catch (err) {
            console.log('Sound not supported')
        }
    }

    // Create admin notification in Supabase
    async function createAdminNotification(upgradeData, requestId) {
        try {
            const packageName = PACKAGE_NAMES[selectedPackageTier]
            const message = `${upgradeData.user_name || upgradeData.user_email} requested upgrade from ${getCurrentPackageDisplay()} to ${packageName}. Amount: ${currency === 'GHS' ? '₵' : '$'}${upgradeData.amount_paid}`

            const { error } = await supabase
                .from('admin_notifications')
                .insert([{
                    title: '💳 New Payment Request',
                    message: message,
                    type: 'payment',
                    priority: 'high',
                    related_id: requestId,
                    related_table: 'upgrade_requests',
                    is_read: false,
                    created_at: new Date().toISOString()
                }])

            if (error) {
                console.error('Error creating admin notification:', error)
            } else {
                console.log('✅ Admin notification created successfully')
            }
        } catch (err) {
            console.log('Could not create admin notification:', err)
        }
    }

    // Send WhatsApp notification
    function sendWhatsAppNotification(upgradeData) {
        const packageName = PACKAGE_NAMES[selectedPackageTier]
        const message = `🚀 *NEW UPGRADE REQUEST* 🚀
        
👤 *User:* ${upgradeData.user_name}
📧 *Email:* ${upgradeData.user_email}
📱 *Phone:* ${upgradeData.momo_number || 'Not provided'}

📦 *Current Package:* ${getCurrentPackageDisplay()}
📦 *Requested Package:* ${packageName}
💰 *Amount:* ${currency === 'GHS' ? '₵' : '$'}${upgradeData.amount_paid}

🔑 *Reference:* ${paymentReference}

⏰ *Time:* ${new Date().toLocaleString()}

➡️ *Approve here:* ${window.location.origin}/admin

_This is an automated notification from HappyMoment_`

        const encodedMessage = encodeURIComponent(message)
        const whatsappUrl = `https://wa.me/${ADMIN_WHATSAPP}?text=${encodedMessage}`
        window.open(whatsappUrl, '_blank')
    }

    function validateForm() {
        if (!isPaid) {
            setError('Please confirm that you have made the payment')
            return false
        }
        if (!senderNumber.trim()) {
            setError('Please enter your mobile money number')
            return false
        }
        if (!amountPaid || parseFloat(amountPaid) <= 0) {
            setError('Please enter a valid amount paid')
            return false
        }
        return true
    }

    async function handleSubmit(e) {
        e.preventDefault()
        if (!validateForm()) return

        setIsSubmitting(true)
        setError('')

        if (!user || !user.id) {
            setError('User not logged in. Please log in again.')
            setIsSubmitting(false)
            return
        }

        try {
            const packageIdMap = {
                free: 74,
                basic: 75,
                premium: 76,
                enterprise: 77
            }

            const finalPackageId = packageIdMap[selectedPackageTier] || 75

            const upgradeData = {
                user_id: user.id,
                user_email: user.email,
                user_name: user.name || user.email,
                from_package_tier: user.package_tier || 'free',
                to_package_tier: selectedPackageTier,
                to_package_id: finalPackageId,
                amount_paid: parseFloat(amountPaid),
                payment_method: 'momo',
                momo_number: senderNumber,
                payment_reference_code: paymentReference,
                notes: notes || '',
                status: 'pending',
                created_at: new Date().toISOString()
            }

            console.log('📝 Inserting upgrade request:', upgradeData)

            const { error: insertError, data: insertedRequest } = await supabase
                .from('upgrade_requests')
                .insert([upgradeData])
                .select()

            if (insertError) {
                console.error('❌ Insert error:', insertError)
                setError(`Failed to submit: ${insertError.message}`)
                setIsSubmitting(false)
                return
            }

            console.log('✅ Insert successful:', insertedRequest)
            const requestId = insertedRequest?.[0]?.id

            // Create admin notification
            await createAdminNotification(upgradeData, requestId)
            
            // Send WhatsApp notification
            sendWhatsAppNotification(upgradeData)
            
            // Play sound
            playNotificationSound()

            // Save to localStorage
            const paymentRecord = {
                id: requestId || Date.now(),
                user_id: user.id,
                email: user.email,
                name: user.name || user.email,
                package_tier: selectedPackageTier,
                package_name: PACKAGE_NAMES[selectedPackageTier],
                amount: parseFloat(amountPaid),
                currency: currency,
                payment_method: 'momo',
                momo_number: senderNumber,
                payment_reference_code: paymentReference,
                status: 'pending',
                created_at: new Date().toISOString()
            }

            const pendingPayments = JSON.parse(localStorage.getItem('pending_payments') || '[]')
            pendingPayments.push(paymentRecord)
            localStorage.setItem('pending_payments', JSON.stringify(pendingPayments))

            const updatedUser = {
                ...user,
                package_tier: userCurrentPackage, // Keep current package
                package_pending: selectedPackageTier,
                payment_status: 'pending',
                pending_upgrade_id: requestId
            }
            localStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(updatedUser))

            setShowConfirmationCard(true)

        } catch (err) {
            console.error('❌ Submission error:', err)
            setError('Failed to submit. Please try again.')
        } finally {
            setIsSubmitting(false)
        }
    }

    function goBack() {
        navigate('/select-package')
    }

    if (!user) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-slate-50">
                <div className="text-slate-600 text-xl animate-pulse">Loading...</div>
            </div>
        )
    }

    if (showConfirmationCard) {
        return (
            <div className="min-h-screen p-4 bg-gradient-to-br from-slate-50 to-gray-50">
                <div className="max-w-lg mx-auto pt-8 pb-16">
                    <div className="text-center mb-8">
                        <div className="inline-flex items-center justify-center w-20 h-20 bg-green-100 rounded-full mb-4">
                            <svg className="w-10 h-10 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                        </div>
                        <h1 className="text-3xl font-bold text-slate-800 mb-2">Payment Request Submitted</h1>
                        <p className="text-slate-600">
                            Your upgrade request from <span className="font-semibold text-blue-600">{getCurrentPackageDisplay()}</span> to <span className="font-semibold text-rose-600">{PACKAGE_NAMES[selectedPackageTier]}</span> has been submitted
                        </p>
                        <div className="mt-3 inline-block bg-amber-100 text-amber-800 px-4 py-2 rounded-full text-sm font-semibold">
                            ⏳ Pending Admin Approval
                        </div>
                    </div>

                    <div className="bg-green-50 border border-green-200 rounded-xl p-5 mb-6">
                        <div className="flex items-start gap-3">
                            <div className="text-2xl">📢</div>
                            <div>
                                <h3 className="font-bold text-green-800 mb-1">Admin Notified!</h3>
                                <p className="text-sm text-green-700">
                                    The administrator has been notified of your payment via WhatsApp.
                                    You will be upgraded once your payment is confirmed.
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="bg-blue-50 border border-blue-200 rounded-xl p-5 mb-6">
                        <div className="flex items-start gap-3">
                            <div className="text-2xl">📌</div>
                            <div>
                                <h3 className="font-bold text-blue-800 mb-1">Important Note</h3>
                                <p className="text-sm text-blue-700">
                                    Your account will remain on the <strong className="font-bold">{getCurrentPackageDisplay()} plan</strong> until an admin reviews and confirms your payment.
                                    This usually takes 1-24 hours.
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden">
                        <div className="bg-gradient-to-r from-slate-800 to-slate-900 px-6 py-4">
                            <h2 className="text-white font-semibold text-lg">Payment Details</h2>
                        </div>

                        <div className="p-8 space-y-8">
                            <div className="text-center">
                                <p className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-3">Pay To</p>
                                <div className="bg-gradient-to-br from-slate-50 to-slate-100 border-2 border-slate-200 rounded-xl py-6 px-4">
                                    <div className="text-4xl md:text-5xl font-mono font-bold text-slate-800 tracking-wider">
                                        {PAYMENT_NUMBER}
                                    </div>
                                </div>
                                <p className="text-xs text-slate-500 mt-2">Mobile Money (MTN / Vodafone / AirtelTigo)</p>
                            </div>

                            <div className="relative">
                                <div className="absolute inset-0 flex items-center">
                                    <div className="w-full border-t border-slate-200"></div>
                                </div>
                                <div className="relative flex justify-center">
                                    <span className="bg-white px-4 text-sm text-slate-500">Your Reference</span>
                                </div>
                            </div>

                            <div className="text-center">
                                <p className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-3">
                                    Payment Reference
                                </p>
                                <div className="inline-block bg-slate-900 text-slate-50 py-5 px-10 rounded-xl shadow-lg">
                                    <div className="text-5xl md:text-6xl font-mono font-bold tracking-[0.2em] text-emerald-400">
                                        {paymentReference}
                                    </div>
                                </div>
                            </div>

                            <div className="bg-slate-50 rounded-xl p-5 space-y-3">
                                <h3 className="font-semibold text-slate-700">Payment Summary</h3>
                                <div className="flex justify-between text-sm">
                                    <span className="text-slate-500">Current Package:</span>
                                    <span className="font-semibold text-blue-600">{getCurrentPackageDisplay()}</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span className="text-slate-500">Requested Package:</span>
                                    <span className="font-semibold text-rose-600">{PACKAGE_NAMES[selectedPackageTier]}</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span className="text-slate-500">Mobile Money Number:</span>
                                    <span className="font-mono font-semibold">{senderNumber}</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span className="text-slate-500">Amount:</span>
                                    <span className="font-bold text-green-600">{currency === 'GHS' ? '₵' : '$'}{amountPaid}</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span className="text-slate-500">Status:</span>
                                    <span className="font-semibold text-amber-600">Pending Approval</span>
                                </div>
                            </div>

                            <div className="bg-amber-50 border-l-4 border-amber-500 rounded-r-xl p-5">
                                <div className="flex items-start gap-4">
                                    <div className="flex-shrink-0">
                                        <svg className="w-6 h-6 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                        </svg>
                                    </div>
                                    <div className="flex-1">
                                        <h3 className="font-bold text-amber-800 mb-1">No confirmation within 1 hour?</h3>
                                        <p className="text-sm text-amber-700">
                                            Contact admin: <span className="font-mono font-bold text-amber-900">{ADMIN_CONTACT}</span>
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="bg-slate-50 px-6 py-4 border-t border-slate-200">
                            <div className="flex flex-col sm:flex-row gap-3">
                                <button
                                    onClick={() => navigate('/dashboard')}
                                    className="flex-1 bg-slate-800 text-white py-3 px-6 rounded-xl font-semibold hover:bg-slate-900 transition shadow-md"
                                >
                                    Go to Dashboard
                                </button>
                                <button
                                    onClick={() => window.print()}
                                    className="flex-1 bg-white text-slate-700 border-2 border-slate-300 py-3 px-6 rounded-xl font-semibold hover:bg-slate-50 transition"
                                >
                                    Print Receipt
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        )
    }

    // Payment form
    return (
        <div className="min-h-screen p-4 bg-gradient-to-br from-slate-50 to-gray-50">
            <div className="max-w-2xl mx-auto pt-8">
                <button
                    onClick={goBack}
                    className="mb-6 flex items-center gap-2 text-slate-600 hover:text-rose-600 transition font-medium"
                >
                    <svg width="24" height="24" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                    </svg>
                    Back to Packages
                </button>

                <div className="bg-white rounded-2xl shadow-xl border border-slate-200 p-8">
                    <div className="text-center mb-10">
                        <div className="inline-flex items-center justify-center w-16 h-16 bg-slate-100 rounded-full mb-4">
                            <svg className="w-8 h-8 text-slate-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                            </svg>
                        </div>
                        <h1 className="text-2xl font-bold text-slate-800 mb-2">Complete Your Upgrade</h1>
                        <p className="text-slate-600">
                            {PACKAGE_NAMES[selectedPackageTier]} Package • {currency === 'GHS' ? '₵' : '$'}{price}
                        </p>
                        <div className="mt-2 inline-block bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-xs font-semibold">
                            Your current plan: {getCurrentPackageDisplay()}
                        </div>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-6">
                        {/* Mobile Money Number */}
                        <div>
                            <label className="block text-slate-700 font-semibold mb-2 text-sm">
                                Your Mobile Money Number <span className="text-rose-600">*</span>
                            </label>
                            <input
                                type="tel"
                                value={senderNumber}
                                onChange={(e) => setSenderNumber(e.target.value)}
                                placeholder="024 XXX XXXX"
                                className="w-full p-3 border-2 border-slate-200 rounded-xl focus:outline-none focus:border-indigo-400 bg-white"
                                required
                            />
                            <p className="text-xs text-slate-500 mt-1">The mobile money number you will use to send payment</p>
                        </div>

                        {/* Pay To Number */}
                        <div className="bg-gradient-to-br from-indigo-50 to-purple-50 border-2 border-indigo-200 rounded-xl p-6">
                            <div className="text-center">
                                <p className="text-sm font-semibold text-indigo-700 uppercase tracking-wider mb-3">
                                    ⚡ Send Payment To
                                </p>
                                <div className="text-4xl md:text-5xl font-mono font-bold text-slate-800 tracking-wider mb-2">
                                    {PAYMENT_NUMBER}
                                </div>
                                <p className="text-sm text-slate-600">
                                    Send exactly <span className="font-bold text-indigo-600">{currency === 'GHS' ? '₵' : '$'}{amountPaid}</span> to this number
                                </p>
                            </div>
                        </div>

                        {/* Amount */}
                        <div>
                            <label className="block text-slate-700 font-semibold mb-2 text-sm">
                                Amount to Pay ({currency === 'GHS' ? 'GHS' : 'USD'}) <span className="text-rose-600">*</span>
                            </label>
                            <input
                                type="number"
                                value={amountPaid}
                                onChange={(e) => setAmountPaid(e.target.value)}
                                placeholder={price}
                                step="0.01"
                                className="w-full p-3 border-2 border-slate-200 rounded-xl focus:outline-none focus:border-indigo-400 bg-white text-lg text-center font-bold"
                                required
                            />
                        </div>

                        {/* Reference Code */}
                        <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
                            <p className="text-sm text-slate-600 mb-2">
                                <strong>Your Payment Reference:</strong>
                            </p>
                            <div className="bg-slate-900 text-slate-50 py-3 px-6 rounded-lg text-center font-mono font-bold tracking-widest text-2xl text-emerald-400">
                                {paymentReference}
                            </div>
                            <p className="text-xs text-slate-500 mt-2 text-center">
                                Use this as reference when sending payment
                            </p>
                        </div>

                        {/* Confirm Payment Checkbox */}
                        <div className="flex items-start gap-3 p-4 bg-green-50 rounded-xl border border-green-200">
                            <input
                                type="checkbox"
                                id="confirmPaid"
                                checked={isPaid}
                                onChange={(e) => setIsPaid(e.target.checked)}
                                className="mt-1 w-5 h-5 accent-green-600"
                            />
                            <label htmlFor="confirmPaid" className="text-slate-700 text-sm leading-relaxed">
                                I confirm that I have sent <strong>{currency === 'GHS' ? '₵' : '$'}{amountPaid}</strong> to <strong>{PAYMENT_NUMBER}</strong> using the reference code <strong className="font-mono">{paymentReference}</strong>
                            </label>
                        </div>

                        {/* Notes (Optional) */}
                        <div>
                            <label className="block text-slate-700 font-semibold mb-2 text-sm">
                                Additional Notes (Optional)
                            </label>
                            <textarea
                                value={notes}
                                onChange={(e) => setNotes(e.target.value)}
                                rows="3"
                                placeholder="Any additional information for the admin..."
                                className="w-full p-3 border-2 border-slate-200 rounded-xl focus:outline-none focus:border-indigo-400 bg-white"
                            />
                        </div>

                        {error && (
                            <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-600 text-center text-sm">
                                {error}
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="w-full py-4 bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-bold rounded-xl shadow-lg hover:from-indigo-700 hover:to-purple-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isSubmitting ? (
                                <span className="flex items-center justify-center gap-2">
                                    <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                    Processing...
                                </span>
                            ) : (
                                'Submit Payment & Notify Admin'
                            )}
                        </button>

                        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                            <div className="flex items-start gap-3">
                                <svg className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                <div>
                                    <p className="text-sm font-semibold text-blue-800">How it works:</p>
                                    <p className="text-sm text-blue-700">
                                        After submitting, the admin will be notified via WhatsApp.
                                        Your account stays on the <strong className="font-bold">{getCurrentPackageDisplay()} plan</strong> until the admin confirms your payment.
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                            <div className="flex items-start gap-3">
                                <svg className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                <div>
                                    <p className="text-sm font-semibold text-amber-800">Need help?</p>
                                    <p className="text-sm text-amber-700">
                                        Contact admin: <span className="font-mono font-bold text-amber-900">{ADMIN_CONTACT}</span>
                                    </p>
                                </div>
                            </div>
                        </div>
                    </form>
                </div>

                <div className="mt-6 text-center">
                    <div className="inline-flex items-center gap-2 text-slate-500 text-xs">
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                        </svg>
                        <span>Secure Payment Processing</span>
                    </div>
                </div>
            </div>
        </div>
    )
}

export default PaymentDetails