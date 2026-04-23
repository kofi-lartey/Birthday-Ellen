import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { supabase, STORAGE_KEYS } from '../supabase'
import { generatePaymentReference } from '../utils/paymentRef'

const PAYMENT_NUMBER = '0531114795'
const ADMIN_CONTACT = '0557655008'

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
    
    const [user, setUser] = useState(null)
    const [paymentMethod, setPaymentMethod] = useState('momo')
    const [momoNumber, setMomoNumber] = useState('')
    const [transactionId, setTransactionId] = useState('')
    const [amountPaid, setAmountPaid] = useState(price)
    const [paymentProof, setPaymentProof] = useState('')
    const [notes, setNotes] = useState('')
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [error, setError] = useState('')
    const [paymentReference, setPaymentReference] = useState('')
    const [showConfirmationCard, setShowConfirmationCard] = useState(false)

    // Generate unique reference code on mount
    useEffect(() => {
        const currentUser = JSON.parse(localStorage.getItem(STORAGE_KEYS.CURRENT_USER) || 'null')
        if (!currentUser) {
            navigate('/login')
            return
        }
        setUser(currentUser)
        
        // Generate unique reference
        const refCode = generatePaymentReference(selectedPackageTier)
        setPaymentReference(refCode)
    }, [navigate, selectedPackageTier])

    function validateForm() {
        if (!transactionId.trim()) {
            setError('Please enter your transaction/reference ID from your payment confirmation')
            return false
        }
        if (!amountPaid || parseFloat(amountPaid) <= 0) {
            setError('Please enter a valid amount paid')
            return false
        }
        if (paymentMethod === 'momo' && !momoNumber.trim()) {
            setError('Please enter your Momo number')
            return false
        }
        return true
    }

    async function handleSubmit(e) {
        e.preventDefault()
        if (!validateForm()) return

        setIsSubmitting(true)
        setError('')

        try {
            // Create upgrade request with reference code
            const { error: insertError } = await supabase
                .from('upgrade_requests')
                .insert([{
                    user_id: user.id,
                    user_email: user.email,
                    user_name: user.name || user.email,
                    from_package_tier: user.package_tier || 'free',
                    to_package_tier: selectedPackageTier,
                    to_package_id: parseInt(searchParams.get('packageId') || '0'),
                    amount_paid: parseFloat(amountPaid),
                    payment_method: paymentMethod,
                    momo_number: paymentMethod === 'momo' ? momoNumber : null,
                    transaction_id: transactionId,
                    payment_reference_code: paymentReference,
                    payment_proof_url: paymentProof || null,
                    notes: notes,
                    status: 'pending'
                }])

            if (insertError) {
                console.error('Upgrade request error:', insertError)
                console.log('Falling back to localStorage. Admin may not see this request until localStorage is synced.')
                saveToLocalStorage()
                setShowConfirmationCard(true)
                return
            }

            // Update user's pending status
            await supabase
                .from('users')
                .update({
                    package_pending: selectedPackageTier,
                    payment_status: 'pending',
                    payment_method: paymentMethod,
                    payment_reference: paymentReference,
                    payment_reference_code: paymentReference
                })
                .eq('id', user.id)

            // Update localStorage
            const updatedUser = {
                ...user,
                package_pending: selectedPackageTier,
                payment_status: 'pending'
            }
            localStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(updatedUser))

            setShowConfirmationCard(true)

        } catch (err) {
            console.error('Submission error:', err)
            setError('Failed to submit. Please try again.')
        } finally {
            setIsSubmitting(false)
        }
    }

    function saveToLocalStorage() {
        const upgradeRequests = JSON.parse(localStorage.getItem('pending_upgrades') || '[]')
        upgradeRequests.push({
            id: Date.now().toString(),
            user_id: user.id,
            user_email: user.email,
            user_name: user.name || user.email,
            from_package_tier: user.package_tier || 'free',
            to_package_tier: selectedPackageTier,
            to_package_id: parseInt(searchParams.get('packageId') || '0'),
            amount_paid: parseFloat(amountPaid),
            payment_method: paymentMethod,
            momo_number: momoNumber,
            transaction_id: transactionId,
            payment_reference_code: paymentReference,
            payment_proof_url: paymentProof,
            notes: notes,
            status: 'pending',
            requested_at: new Date().toISOString()
        })
        localStorage.setItem('pending_upgrades', JSON.stringify(upgradeRequests))
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

    // Show confirmation card after submission
    if (showConfirmationCard) {
        return (
            <div className="min-h-screen p-4 bg-gradient-to-br from-slate-50 to-gray-50">
                <div className="max-w-lg mx-auto pt-8 pb-16">
                    {/* Success Header */}
                    <div className="text-center mb-8">
                        <div className="inline-flex items-center justify-center w-20 h-20 bg-green-100 rounded-full mb-4">
                            <svg className="w-10 h-10 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                        </div>
                        <h1 className="text-3xl font-bold text-slate-800 mb-2">Payment Request Submitted</h1>
                        <p className="text-slate-600">
                            Your upgrade to <span className="font-semibold text-rose-600">{PACKAGE_NAMES[selectedPackageTier]}</span> is pending admin approval
                        </p>
                    </div>

                    {/* Payment Instruction Card */}
                    <div className="bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden">
                        <div className="bg-gradient-to-r from-slate-800 to-slate-900 px-6 py-4">
                            <h2 className="text-white font-semibold text-lg">Payment Instructions</h2>
                        </div>

                        <div className="p-8 space-y-8">
                            {/* Payment Number */}
                            <div className="text-center">
                                <p className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-3">Pay To</p>
                                <div className="bg-gradient-to-br from-slate-50 to-slate-100 border-2 border-slate-200 rounded-xl py-6 px-4">
                                    <div className="text-4xl md:text-5xl font-mono font-bold text-slate-800 tracking-wider">
                                        {PAYMENT_NUMBER}
                                    </div>
                                </div>
                                <p className="text-xs text-slate-500 mt-2">Mobile Money / Bank Transfer</p>
                            </div>

                            {/* Divider */}
                            <div className="relative">
                                <div className="absolute inset-0 flex items-center">
                                    <div className="w-full border-t border-slate-200"></div>
                                </div>
                                <div className="relative flex justify-center">
                                    <span className="bg-white px-4 text-sm text-slate-500">Your Unique Reference</span>
                                </div>
                            </div>

                            {/* Reference Code */}
                            <div className="text-center">
                                <p className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-3">
                                    Use this code as payment reference
                                </p>
                                <div className="inline-block bg-slate-900 text-slate-50 py-5 px-10 rounded-xl shadow-lg">
                                    <div className="text-5xl md:text-6xl font-mono font-bold tracking-[0.2em] text-emerald-400">
                                        {paymentReference}
                                    </div>
                                </div>
                                <p className="text-sm text-slate-600 mt-4">
                                    Copy this reference code and include it with your payment
                                </p>
                            </div>

                            {/* Divider */}
                            <div className="relative">
                                <div className="absolute inset-0 flex items-center">
                                    <div className="w-full border-t border-slate-200"></div>
                                </div>
                                <div className="relative flex justify-center">
                                    <span className="bg-white px-4 text-sm text-slate-500">Important</span>
                                </div>
                            </div>

                            {/* Alert Notice */}
                            <div className="bg-amber-50 border-l-4 border-amber-500 rounded-r-xl p-5">
                                <div className="flex items-start gap-4">
                                    <div className="flex-shrink-0">
                                        <svg className="w-6 h-6 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                        </svg>
                                    </div>
                                    <div className="flex-1">
                                        <h3 className="font-bold text-amber-800 mb-1">Account Activation Time</h3>
                                        <p className="text-sm text-amber-700 leading-relaxed">
                                            If your account is <strong>not activated within one hour</strong> after payment, please contact the administrator immediately.
                                        </p>
                                        <div className="mt-3 bg-white rounded-lg px-5 py-3 inline-block border border-amber-200 shadow-sm">
                                            <p className="text-sm text-amber-800">
                                                <span className="font-semibold">Admin Contact:</span>{' '}
                                                <span className="font-mono text-lg font-bold text-amber-900">{ADMIN_CONTACT}</span>
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Footer */}
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
                                    Print / Save
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Additional Info */}
                    <div className="mt-8 text-center">
                        <p className="text-sm text-slate-500">
                            Amount Paid: <span className="font-bold text-slate-700">GHS {amountPaid}</span> • 
                            Package: <span className="font-bold text-slate-700">{PACKAGE_NAMES[selectedPackageTier]}</span>
                        </p>
                        {paymentMethod === 'momo' && momoNumber && (
                            <p className="text-sm text-slate-500 mt-1">
                                Paid from: <span className="font-mono">{momoNumber}</span>
                            </p>
                        )}
                    </div>
                </div>
            </div>
        )
    }

    // Payment form (minimal)
    return (
        <div className="min-h-screen p-4 bg-gradient-to-br from-slate-50 to-gray-50">
            <div className="max-w-2xl mx-auto pt-8">
                {/* Back Button */}
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
                    {/* Header */}
                    <div className="text-center mb-10">
                        <div className="inline-flex items-center justify-center w-16 h-16 bg-slate-100 rounded-full mb-4">
                            <svg className="w-8 h-8 text-slate-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                            </svg>
                        </div>
                        <h1 className="text-2xl font-bold text-slate-800 mb-2">
                            Complete Your Upgrade
                        </h1>
                        <p className="text-slate-600">
                            {PACKAGE_NAMES[selectedPackageTier]} Package • ${price}
                        </p>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-6">
                        {/* Payment Method */}
                        <div>
                            <label className="block text-slate-700 font-semibold mb-3 text-sm">Payment Method</label>
                            <div className="grid grid-cols-2 gap-4">
                                <button
                                    type="button"
                                    onClick={() => setPaymentMethod('momo')}
                                    className={`p-4 rounded-xl border-2 transition-all duration-200 ${paymentMethod === 'momo' ? 'border-slate-400 bg-slate-50 shadow-md' : 'border-slate-200 hover:border-slate-300'}`}
                                >
                                    <div className="text-2xl mb-2">📱</div>
                                    <div className="font-semibold text-slate-700">Mobile Money</div>
                                    <div className="text-xs text-slate-500">MTN/Vodafone/AirtelTigo</div>
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setPaymentMethod('bank')}
                                    className={`p-4 rounded-xl border-2 transition-all duration-200 ${paymentMethod === 'bank' ? 'border-slate-400 bg-slate-50 shadow-md' : 'border-slate-200 hover:border-slate-300'}`}
                                >
                                    <div className="text-2xl mb-2">🏦</div>
                                    <div className="font-semibold text-slate-700">Bank Transfer</div>
                                    <div className="text-xs text-slate-500">Direct deposit</div>
                                </button>
                            </div>
                        </div>

                        {/* Momo Number */}
                        {paymentMethod === 'momo' && (
                            <div>
                                <label className="block text-slate-700 font-semibold mb-2 text-sm">
                                    Your Momo Number <span className="text-rose-600">*</span>
                                </label>
                                <input
                                    type="tel"
                                    value={momoNumber}
                                    onChange={(e) => setMomoNumber(e.target.value)}
                                    placeholder="024 XXX XXXX"
                                    className="w-full p-3 border-2 border-slate-200 rounded-xl focus:outline-none focus:border-slate-400 bg-white"
                                    required
                                />
                            </div>
                        )}

                        {/* Transaction ID */}
                        <div>
                            <label className="block text-slate-700 font-semibold mb-2 text-sm">
                                Transaction ID <span className="text-rose-600">*</span>
                            </label>
                            <input
                                type="text"
                                value={transactionId}
                                onChange={(e) => setTransactionId(e.target.value)}
                                placeholder="e.g., MTN-1234567890"
                                className="w-full p-3 border-2 border-slate-200 rounded-xl focus:outline-none focus:border-slate-400 bg-white"
                                required
                            />
                            <p className="text-xs text-slate-500 mt-1">From your payment confirmation</p>
                        </div>

                        {/* Pay To Number - prominent display */}
                        <div className="bg-gradient-to-br from-slate-50 to-slate-100 border-2 border-slate-300 rounded-xl p-6">
                            <div className="text-center">
                                <p className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-3">
                                    ⚡ Pay To (Destination Number)
                                </p>
                                <div className="text-4xl md:text-5xl font-mono font-bold text-slate-800 tracking-wider mb-2">
                                    {PAYMENT_NUMBER}
                                </div>
                                <p className="text-sm text-slate-600">
                                    Send exactly <span className="font-bold text-rose-600">GHS {amountPaid}</span> to this number
                                </p>
                            </div>
                        </div>

                         {/* Amount */}
                         <div>
                             <label className="block text-slate-700 font-semibold mb-2 text-sm">
                                 Amount (GHS) <span className="text-rose-600">*</span>
                             </label>
                             <input
                                 type="number"
                                 value={amountPaid}
                                 onChange={(e) => setAmountPaid(e.target.value)}
                                 placeholder={price}
                                 step="0.01"
                                 className="w-full p-3 border-2 border-slate-200 rounded-xl focus:outline-none focus:border-slate-400 bg-white text-lg text-center font-bold"
                                 required
                             />
                         </div>

                         {error && (
                             <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-600 text-center text-sm">
                                 {error}
                             </div>
                         )}

                        {/* Submit Button */}
                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="w-full py-4 bg-slate-800 text-white font-bold rounded-xl shadow-lg hover:bg-slate-900 transition disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isSubmitting ? (
                                <span className="flex items-center justify-center gap-2">
                                    <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                    Processing...
                                </span>
                            ) : (
                                `Submit Payment Request`
                            )
                        }
                        </button>

                        {/* Reference Code Display */}
                        {paymentReference && (
                            <div className="mt-6 bg-slate-50 border border-slate-200 rounded-xl p-4">
                                <p className="text-sm text-slate-600 mb-2">
                                    <strong>Your Unique Payment Reference:</strong>
                                </p>
                                <div className="bg-slate-900 text-slate-50 py-3 px-6 rounded-lg text-center font-mono font-bold tracking-widest text-2xl text-emerald-400">
                                    {paymentReference}
                                </div>
                                <p className="text-xs text-slate-500 mt-2 text-center">
                                    Write this down—admin will use it to verify your payment
                                </p>
                            </div>
                        )}

                        {/* Support Contact */}
                        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mt-6">
                            <div className="flex items-start gap-3">
                                <svg className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                <div>
                                    <p className="text-sm font-semibold text-amber-800">No payment processed within 1 hour?</p>
                                    <p className="text-sm text-amber-700">
                                        Contact admin immediately: <span className="font-mono font-bold text-amber-900">{ADMIN_CONTACT}</span>
                                    </p>
                                </div>
                            </div>
                        </div>
                    </form>
                </div>

                {/* Security Badge */}
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
