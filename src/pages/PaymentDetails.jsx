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
    const currency = searchParams.get('currency') || 'GHS'
    const selectedPackageId = Number.isInteger(Number(searchParams.get('packageId'))) ? Number(searchParams.get('packageId')) : null
    
    const [user, setUser] = useState(null)
    const [paymentMethod, setPaymentMethod] = useState('momo')
    const [senderNumber, setSenderNumber] = useState('')
    const [transactionId, setTransactionId] = useState('')
    const [amountPaid, setAmountPaid] = useState(price)
    const [notes, setNotes] = useState('')
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [error, setError] = useState('')
    const [paymentReference, setPaymentReference] = useState('')
    const [showConfirmationCard, setShowConfirmationCard] = useState(false)
    const [isPaid, setIsPaid] = useState(false)

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
        if (!isPaid) {
            setError('Please confirm that you have made the payment')
            return false
        }
        if (!senderNumber.trim()) {
            setError('Please enter your sender mobile money number')
            return false
        }
        if (!transactionId.trim()) {
            setError('Please enter the transaction/reference ID from your payment confirmation')
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

        try {
            // Create upgrade request with reference code
            const { error: insertError, data: insertedRequest } = await supabase
                .from('upgrade_requests')
                .insert([{
                    user_id: user.id,
                    user_email: user.email,
                    user_name: user.name || user.email,
                    from_package_tier: user.package_tier || 'free',
                    to_package_tier: selectedPackageTier,
                    to_package_id: selectedPackageId,
                    amount_paid: parseFloat(amountPaid),
                    currency: currency,
                    payment_method: paymentMethod,
                    sender_number: senderNumber,
                    transaction_id: transactionId,
                    payment_reference_code: paymentReference,
                    notes: notes,
                    status: 'pending'
                }])
                .select('id')

            if (insertError) {
                console.error('Upgrade request error:', insertError)
                saveToLocalStorage()
                setShowConfirmationCard(true)
                return
            }

            const requestId = insertedRequest?.[0]?.id

            // Update user's pending status
            const updateData = {
                package_pending: selectedPackageTier,
                payment_status: 'pending',
                payment_method: paymentMethod,
                payment_reference: paymentReference,
                payment_reference_code: paymentReference
            }
            
            if (requestId) {
                updateData.pending_upgrade_id = requestId
            }

            await supabase
                .from('users')
                .update(updateData)
                .eq('id', user.id)

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
                payment_method: paymentMethod,
                sender_number: senderNumber,
                payment_reference_code: paymentReference,
                transaction_id: transactionId,
                status: 'pending',
                created_at: new Date().toISOString()
            }
            const pendingPayments = JSON.parse(localStorage.getItem('pending_payments') || '[]')
            pendingPayments.push(paymentRecord)
            localStorage.setItem('pending_payments', JSON.stringify(pendingPayments))

            // Update localStorage current user
            const updatedUser = {
                ...user,
                package_pending: selectedPackageTier,
                payment_status: 'pending',
                pending_upgrade_id: requestId
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
            id: `local-${Date.now()}`,
            user_id: user.id,
            user_email: user.email,
            user_name: user.name || user.email,
            from_package_tier: user.package_tier || 'free',
            to_package_tier: selectedPackageTier,
            to_package_id: selectedPackageId,
            amount_paid: parseFloat(amountPaid),
            currency: currency,
            payment_method: paymentMethod,
            sender_number: senderNumber,
            transaction_id: transactionId,
            payment_reference_code: paymentReference,
            notes: notes,
            status: 'pending',
            created_at: new Date().toISOString(),
            isLocalFallback: true
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
                                <p className="text-xs text-slate-500 mt-2">Mobile Money (MTN / Vodafone / AirtelTigo)</p>
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

                            {/* Payment Details Summary */}
                            <div className="bg-slate-50 rounded-xl p-5 space-y-3">
                                <h3 className="font-semibold text-slate-700">Payment Summary</h3>
                                <div className="flex justify-between text-sm">
                                    <span className="text-slate-500">Sender Number:</span>
                                    <span className="font-mono font-semibold">{senderNumber}</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span className="text-slate-500">Amount Paid:</span>
                                    <span className="font-bold text-green-600">{currency === 'GHS' ? '₵' : '$'}{amountPaid}</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span className="text-slate-500">Transaction ID:</span>
                                    <span className="font-mono text-xs">{transactionId}</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span className="text-slate-500">Package:</span>
                                    <span className="font-semibold">{PACKAGE_NAMES[selectedPackageTier]}</span>
                                </div>
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
                                        <h3 className="font-bold text-amber-800 mb-1">No payment processed within 1 hour?</h3>
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
                                    Print / Save Receipt
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
                            {PACKAGE_NAMES[selectedPackageTier]} Package • {currency === 'GHS' ? '₵' : '$'}{price}
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
                                    className={`p-4 rounded-xl border-2 transition-all duration-200 ${paymentMethod === 'momo' ? 'border-indigo-500 bg-indigo-50 shadow-md' : 'border-slate-200 hover:border-slate-300'}`}
                                >
                                    <div className="text-2xl mb-2">📱</div>
                                    <div className="font-semibold text-slate-700">Mobile Money</div>
                                    <div className="text-xs text-slate-500">MTN/Vodafone/AirtelTigo</div>
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setPaymentMethod('bank')}
                                    className={`p-4 rounded-xl border-2 transition-all duration-200 ${paymentMethod === 'bank' ? 'border-indigo-500 bg-indigo-50 shadow-md' : 'border-slate-200 hover:border-slate-300'}`}
                                >
                                    <div className="text-2xl mb-2">🏦</div>
                                    <div className="font-semibold text-slate-700">Bank Transfer</div>
                                    <div className="text-xs text-slate-500">Direct deposit</div>
                                </button>
                            </div>
                        </div>

                        {/* Sender Number */}
                        <div>
                            <label className="block text-slate-700 font-semibold mb-2 text-sm">
                                Your Sender Number <span className="text-rose-600">*</span>
                            </label>
                            <input
                                type="tel"
                                value={senderNumber}
                                onChange={(e) => setSenderNumber(e.target.value)}
                                placeholder="024 XXX XXXX"
                                className="w-full p-3 border-2 border-slate-200 rounded-xl focus:outline-none focus:border-indigo-400 bg-white"
                                required
                            />
                            <p className="text-xs text-slate-500 mt-1">The mobile money number you used to send payment</p>
                        </div>

                        {/* Transaction ID */}
                        <div>
                            <label className="block text-slate-700 font-semibold mb-2 text-sm">
                                Transaction ID / Reference <span className="text-rose-600">*</span>
                            </label>
                            <input
                                type="text"
                                value={transactionId}
                                onChange={(e) => setTransactionId(e.target.value)}
                                placeholder="e.g., MTN-1234567890"
                                className="w-full p-3 border-2 border-slate-200 rounded-xl focus:outline-none focus:border-indigo-400 bg-white"
                                required
                            />
                            <p className="text-xs text-slate-500 mt-1">From your payment confirmation message</p>
                        </div>

                        {/* Pay To Number - prominent display */}
                        <div className="bg-gradient-to-br from-indigo-50 to-purple-50 border-2 border-indigo-200 rounded-xl p-6">
                            <div className="text-center">
                                <p className="text-sm font-semibold text-indigo-700 uppercase tracking-wider mb-3">
                                    ⚡ Send Payment To (Destination Number)
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
                                Amount Paid ({currency === 'GHS' ? 'GHS' : 'USD'}) <span className="text-rose-600">*</span>
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

                        {/* Unique Reference Code Display */}
                        <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
                            <p className="text-sm text-slate-600 mb-2">
                                <strong>Your Unique Payment Reference:</strong>
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

                        {/* Submit Button */}
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
                                'Submit Payment Confirmation'
                            )}
                        </button>

                        {/* Support Contact */}
                        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
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