import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import confetti from 'canvas-confetti'
import { supabase, STORAGE_KEYS } from '../supabase'

function Order() {
    const navigate = useNavigate()
    const [step, setStep] = useState(1)
    const [recipientName, setRecipientName] = useState('')
    const [recipientName2, setRecipientName2] = useState('')
    const [birthdayDate, setBirthdayDate] = useState('')
    const [giverName, setGiverName] = useState('')
    const [giverPhone, setGiverPhone] = useState('')
    const [selectedPackage, setSelectedPackage] = useState('')
    const [showPayment, setShowPayment] = useState(false)
    const [momoNumber, setMomoNumber] = useState('')
    const [orderCode, setOrderCode] = useState('')
    const [isProcessing, setIsProcessing] = useState(false)
    const [existingCode, setExistingCode] = useState('')
    const [user, setUser] = useState(null)

    // Load user from localStorage on mount
    useEffect(() => {
        const currentUser = JSON.parse(localStorage.getItem(STORAGE_KEYS.CURRENT_USER) || 'null')
        if (currentUser) {
            setUser(currentUser)
        }
    }, [])

    // Packages
    const packages = [
        {
            id: 'free',
            name: 'Free Package',
            price: 'FREE',
            features: [
                '🎂 Personalized birthday page',
                '📸 Photo gallery (up to 5 photos)',
                '💕 Basic animations',
                '🔒 Private access code',
                '📱 Mobile friendly'
            ]
        },
        {
            id: 'basic',
            name: 'Basic Package',
            price: '₵5',
            features: [
                '🎂 Personalized birthday page',
                '📸 Photo gallery slideshow',
                '💕 Beautiful animations',
                '🔒 Private access code',
                '📱 Mobile friendly'
            ]
        },
        {
            id: 'premium',
            name: 'Premium Package',
            price: '₵10',
            popular: true,
            features: [
                '🎂 Everything in Basic',
                '🎬 Video slideshow download',
                '🎁 Gift collection feature',
                '💰 View statistics',
                '✉️ Share link for friends'
            ]
        }
    ]

    useEffect(() => {
        // Load MoMo number from config
        loadConfig()
    }, [])

    async function loadConfig() {
        try {
            const { data } = await supabase
                .from('config')
                .select('value')
                .eq('key', 'momo_number')
                .single()

            if (data?.value) {
                setMomoNumber(data.value)
            }
        } catch (err) {
            console.log('Using default momo')
        }
    }

    function validateStep1() {
        if (!recipientName.trim()) {
            alert('Please enter the birthday person\'s name!')
            return false
        }
        if (!birthdayDate) {
            alert('Please select the birthday date!')
            return false
        }
        return true
    }

    function goToStep2() {
        if (validateStep1()) {
            setStep(2)
        }
    }

    function validateStep2() {
        if (!selectedPackage) {
            alert('Please select a package!')
            return false
        }
        if (!giverName.trim()) {
            alert('Please enter your name!')
            return false
        }
        return true
    }

    function goToPayment() {
        if (validateStep2()) {
            // FREE tier doesn't need payment - go directly to confirmation
            if (selectedPackage === 'free') {
                processOrder()
            } else {
                setShowPayment(true)
            }
        }
    }

    async function processOrder() {
        // FREE tier doesn't need payment
        if (selectedPackage === 'free') {
            setIsProcessing(true)

            // Generate unique code
            const code = generateCode()
            setOrderCode(code)

            // Save order to localStorage
            const order = {
                code,
                recipientName: recipientName.trim(),
                birthdayDate,
                giverName: giverName.trim(),
                giverPhone: giverPhone.trim(),
                package: selectedPackage,
                status: 'active', // Free tier is immediately active
                createdAt: new Date().toISOString()
            }

            // Save to localStorage
            const orders = JSON.parse(localStorage.getItem(STORAGE_KEYS.ORDERS) || '[]')
            orders.push(order)
            localStorage.setItem(STORAGE_KEYS.ORDERS, JSON.stringify(orders))

            // Also save to Supabase for admin management - save FIRST, then localStorage as backup
            try {
                console.log('=== DEBUG: Creating free order in Supabase ===')
                const { data, error } = await supabase.from('orders').insert({
                    code: code,
                    recipient_name: recipientName.trim(),
                    birthday_date: birthdayDate,
                    date_of_birth: birthdayDate,
                    giver_name: giverName.trim(),
                    giver_phone: giverPhone.trim(),
                    package: selectedPackage,
                    status: 'active',
                    price: 0,
                    user_id: user?.id || null,
                    created_at: new Date().toISOString()
                })
                console.log('Free order insert - error:', error)
                console.log('Free order insert - data:', data)
                if (error) {
                    console.log('Supabase save error:', error.message)
                    alert('Warning: Could not save to cloud. Order saved locally only.')
                } else {
                    console.log('Order saved to Supabase!', data)
                }
            } catch (err) {
                console.log('Could not save to Supabase:', err)
                alert('Warning: Could not save to cloud. Order saved locally only.')
            }

            setIsProcessing(false)
            setStep(3)

            confetti({
                particleCount: 100,
                spread: 70,
                origin: { y: 0.6 }
            })
            return
        }

        // For paid packages, require payment
        if (!momoNumber) {
            alert('Payment setup not available. Please try again later.')
            return
        }

        setIsProcessing(true)

        // Generate unique code
        const code = generateCode()
        setOrderCode(code)

        // Save order to localStorage (in real app, would save to Supabase)
        const order = {
            code,
            recipientName: recipientName.trim(),
            birthdayDate,
            giverName: giverName.trim(),
            giverPhone: giverPhone.trim(),
            package: selectedPackage,
            status: 'pending',
            createdAt: new Date().toISOString()
        }

        // Save to localStorage
        const orders = JSON.parse(localStorage.getItem(STORAGE_KEYS.ORDERS) || '[]')
        orders.push(order)
        localStorage.setItem(STORAGE_KEYS.ORDERS, JSON.stringify(orders))

        // Also save to Supabase for admin management - save FIRST
        try {
            console.log('=== DEBUG: Creating paid order in Supabase ===')
            const { data, error } = await supabase.from('orders').insert({
                code: code,
                recipient_name: recipientName.trim(),
                birthday_date: birthdayDate,
                date_of_birth: birthdayDate,
                giver_name: giverName.trim(),
                giver_phone: giverPhone.trim(),
                package: selectedPackage,
                status: 'pending',
                price: selectedPackage === 'premium' ? 100 : (selectedPackage === 'basic' ? 50 : 0),
                user_id: user?.id || null,
                created_at: new Date().toISOString()
            })
            console.log('Paid order insert - error:', error)
            console.log('Paid order insert - data:', data)
            if (error) {
                console.log('Supabase save error:', error.message)
                alert('Warning: Could not save to cloud. Order saved locally only.')
            } else {
                console.log('Order saved to Supabase!', data)
            }
        } catch (err) {
            console.log('Could not save to Supabase:', err)
            alert('Warning: Could not save to cloud. Order saved locally only.')
        }

        setIsProcessing(false)
        setStep(3)

        confetti({
            particleCount: 100,
            spread: 70,
            origin: { y: 0.6 }
        })
    }

    function generateCode() {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
        let code = ''
        for (let i = 0; i < 6; i++) {
            code += chars.charAt(Math.floor(Math.random() * chars.length))
        }
        return code
    }

    function checkExistingOrder() {
        if (!existingCode.trim()) {
            alert('Please enter your order code!')
            return
        }

        const orders = JSON.parse(localStorage.getItem(STORAGE_KEYS.ORDERS) || '[]')
        const order = orders.find(o => o.code.toLowerCase() === existingCode.toLowerCase())

        if (order) {
            // Navigate to the birthday page with the code
            navigate(`/birthday/${order.code}`)
        } else {
            alert('Order not found! Please check your code and try again.')
        }
    }

    return (
        <div className="min-h-screen" style={{ background: 'linear-gradient(135deg, #fce7f3 0%, #fbcfe8 50%, #e9d5ff 100%)' }}>
            {/* Header */}
            <div className="fixed top-0 left-0 right-0 bg-white/80 backdrop-blur-md shadow-sm z-50">
                <div className="max-w-4xl mx-auto px-4 py-3 flex justify-between items-center">
                    <h1 className="text-xl font-['Dancing_Script'] text-rose-500">💕 Birthday surprise</h1>
                    <Link to="/admin" className="text-rose-500 text-sm">Admin</Link>
                </div>
            </div>

            <div className="pt-20 px-4 pb-8">
                {/* Progress Steps */}
                <div className="max-w-lg mx-auto mb-8">
                    <div className="flex items-center justify-between">
                        {[1, 2, 3].map((s) => (
                            <div key={s} className="flex items-center">
                                <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${step >= s ? 'bg-rose-500 text-white' : 'bg-gray-200 text-gray-500'
                                    }`}>
                                    {step > s ? '✓' : s}
                                </div>
                                {s < 3 && (
                                    <div className={`w-16 h-1 ${step > s ? 'bg-rose-500' : 'bg-gray-200'}`}></div>
                                )}
                            </div>
                        ))}
                    </div>
                    <div className="flex justify-between text-xs text-gray-500 mt-2">
                        <span>Details</span>
                        <span>Package</span>
                        <span>{selectedPackage === 'free' ? 'Complete' : 'Confirm'}</span>
                    </div>
                </div>

                {/* Step 1: Recipient Details */}
                {step === 1 && (
                    <div className="max-w-lg mx-auto bg-white rounded-3xl shadow-xl p-6 md:p-8">
                        <div className="text-center mb-6">
                            <div className="text-5xl mb-3">🎂</div>
                            <h2 className="text-2xl font-bold text-gray-700">Who is the birthday star?</h2>
                            <p className="text-gray-500">Let's create something special for them</p>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-gray-600 mb-2 font-semibold">Birthday Person's Name *</label>
                                <input
                                    type="text"
                                    value={recipientName}
                                    onChange={(e) => setRecipientName(e.target.value)}
                                    className="w-full p-4 border-2 border-rose-200 rounded-xl focus:outline-none focus:border-rose-400"
                                    placeholder="e.g., Sarah, Michael, Mama..."
                                />
                            </div>

                            <div>
                                <label className="block text-gray-600 mb-2 font-semibold">Nickname (optional)</label>
                                <input
                                    type="text"
                                    value={recipientName2}
                                    onChange={(e) => setRecipientName2(e.target.value)}
                                    className="w-full p-4 border-2 border-rose-200 rounded-xl focus:outline-none focus:border-rose-400"
                                    placeholder="e.g., Babe, Love, My Queen..."
                                />
                            </div>

                            <div>
                                <label className="block text-gray-600 mb-2 font-semibold">Birthday Date *</label>
                                <input
                                    type="date"
                                    value={birthdayDate}
                                    onChange={(e) => setBirthdayDate(e.target.value)}
                                    className="w-full p-4 border-2 border-rose-200 rounded-xl focus:outline-none focus:border-rose-400"
                                />
                            </div>

                            <button
                                onClick={goToStep2}
                                className="w-full bg-gradient-to-r from-rose-500 to-pink-500 text-white py-4 rounded-xl font-semibold text-lg hover:shadow-lg transition mt-4"
                            >
                                Continue →
                            </button>
                        </div>
                    </div>
                )}

                {/* Step 2: Select Package */}
                {step === 2 && !showPayment && (
                    <div className="max-w-lg mx-auto">
                        <div className="text-center mb-6">
                            <div className="text-5xl mb-3">🎁</div>
                            <h2 className="text-2xl font-bold text-gray-700">Choose Your Package</h2>
                            <p className="text-gray-500">Select the perfect surprise for {recipientName}</p>
                        </div>

                        <div className="space-y-4 mb-6">
                            {packages.map((pkg) => (
                                <div
                                    key={pkg.id}
                                    onClick={() => setSelectedPackage(pkg.id)}
                                    className={`bg-white rounded-3xl shadow-xl p-6 cursor-pointer transition transform hover:scale-[1.02] ${selectedPackage === pkg.id ? 'ring-4 ring-rose-500' : ''
                                        }`}
                                >
                                    <div className="flex justify-between items-start mb-3">
                                        <div>
                                            <h3 className="text-xl font-bold text-gray-700">{pkg.name}</h3>
                                            <p className="text-3xl font-bold text-rose-500">{pkg.price}</p>
                                        </div>
                                        {pkg.popular && (
                                            <span className="bg-gradient-to-r from-amber-400 to-orange-400 text-white px-3 py-1 rounded-full text-xs font-bold">
                                                POPULAR
                                            </span>
                                        )}
                                    </div>
                                    <ul className="space-y-2">
                                        {pkg.features.map((feature, i) => (
                                            <li key={i} className="text-gray-600 text-sm flex items-center gap-2">
                                                <span>{feature}</span>
                                            </li>
                                        ))}
                                    </ul>
                                    <div className="mt-4 flex items-center justify-center">
                                        <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${selectedPackage === pkg.id ? 'bg-rose-500 border-rose-500' : 'border-gray-300'
                                            }`}>
                                            {selectedPackage === pkg.id && <span className="text-white text-sm">✓</span>}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div className="bg-white rounded-3xl shadow-xl p-6 mb-6">
                            <h3 className="font-bold text-gray-700 mb-4">Your Details</h3>
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-gray-600 mb-2 text-sm">Your Name *</label>
                                    <input
                                        type="text"
                                        value={giverName}
                                        onChange={(e) => setGiverName(e.target.value)}
                                        className="w-full p-3 border-2 border-rose-200 rounded-xl focus:outline-none focus:border-rose-400"
                                        placeholder="Who is this from?"
                                    />
                                </div>
                                <div>
                                    <label className="block text-gray-600 mb-2 text-sm">Your Phone (optional)</label>
                                    <input
                                        type="tel"
                                        value={giverPhone}
                                        onChange={(e) => setGiverPhone(e.target.value)}
                                        className="w-full p-3 border-2 border-rose-200 rounded-xl focus:outline-none focus:border-rose-400"
                                        placeholder="For payment confirmation"
                                    />
                                </div>
                            </div>
                        </div>

                        <button
                            onClick={goToPayment}
                            className="w-full bg-gradient-to-r from-rose-500 to-pink-500 text-white py-4 rounded-xl font-semibold text-lg hover:shadow-lg transition"
                        >
                            {selectedPackage === 'free' ? 'Create Free Birthday Page →' : 'Continue →'}
                        </button>

                        <button
                            onClick={() => setStep(1)}
                            className="w-full mt-3 text-gray-500 py-2"
                        >
                            ← Back
                        </button>
                    </div>
                )}

                {/* Step 3: Payment */}
                {showPayment && step === 2 && (
                    <div className="max-w-lg mx-auto bg-white rounded-3xl shadow-xl p-6 md:p-8">
                        <div className="text-center mb-6">
                            <div className="text-5xl mb-3">💰</div>
                            <h2 className="text-2xl font-bold text-gray-700">{selectedPackage === 'free' ? 'Get Your Code' : 'Get Your Code'}</h2>
                            <p className="text-gray-500">{selectedPackage === 'free' ? 'Your free birthday page is ready!' : 'How would you like to proceed?'}</p>
                        </div>

                        {/* Option 1: Free - Get Code Instantly */}
                        {selectedPackage === 'free' && (
                            <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-2xl p-6 mb-4">
                                <h3 className="font-bold text-gray-700 mb-3">🎉 Your Birthday Page is Free!</h3>
                                <p className="text-gray-600 text-sm mb-3">
                                    Click below to get your instant access code and create your free birthday page.
                                </p>
                                <button
                                    onClick={processOrder}
                                    disabled={isProcessing}
                                    className="w-full bg-gradient-to-r from-green-500 to-emerald-500 text-white py-3 rounded-xl font-semibold disabled:opacity-50"
                                >
                                    {isProcessing ? 'Processing...' : 'Get My Free Code 🎁'}
                                </button>
                            </div>
                        )}

                        {/* Option 2: Create Account (Free) - for paid packages */}
                        {selectedPackage !== 'free' && (
                            <>
                                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl p-6 mb-4">
                                    <h3 className="font-bold text-gray-700 mb-3">🎁 Create Free Account</h3>
                                    <p className="text-gray-600 text-sm mb-3">
                                        Create a free account to manage your own birthday pages and get your code instantly!
                                    </p>
                                    <Link
                                        to="/register"
                                        className="block w-full bg-gradient-to-r from-blue-500 to-indigo-500 text-white py-3 rounded-xl font-semibold text-center"
                                    >
                                        Create Free Account →
                                    </Link>
                                </div>

                                {/* Option 3: Manual Payment - Submit Order for Verification */}
                                <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-2xl p-6 mb-4">
                                    <h3 className="font-bold text-gray-700 mb-3">📝 Submit Order for Verification</h3>
                                    <p className="text-gray-600 text-sm mb-3">
                                        1. Submit your order below<br />
                                        2. Pay ₵{selectedPackage === 'premium' ? '10' : '5'} via MoMo<br />
                                        3. Admin will verify and activate your code
                                    </p>
                                    <button
                                        onClick={processOrder}
                                        disabled={isProcessing}
                                        className="w-full bg-gradient-to-r from-green-500 to-emerald-500 text-white py-3 rounded-xl font-semibold disabled:opacity-50"
                                    >
                                        {isProcessing ? 'Processing...' : 'Submit Order →'}
                                    </button>
                                </div>
                            </>
                        )}

                        <button
                            onClick={() => setShowPayment(false)}
                            className="w-full text-gray-500 py-2"
                        >
                            ← Back
                        </button>
                    </div>
                )}

                {/* Step 3: Confirmation */}
                {step === 3 && (
                    <div className="max-w-lg mx-auto bg-white rounded-3xl shadow-xl p-6 md:p-8">
                        <div className="text-center mb-6">
                            <div className="text-6xl mb-4 animate-bounce">🎉</div>
                            <h2 className="text-2xl font-bold text-gray-700">{selectedPackage === 'free' ? 'Order Confirmed!' : 'Order Submitted!'}</h2>
                            <p className="text-gray-500">{selectedPackage === 'free' ? 'Your birthday surprise is ready!' : 'Your order is pending payment verification'}</p>
                        </div>

                        <div className="bg-gradient-to-r from-rose-50 to-pink-50 rounded-2xl p-6 mb-6">
                            <div className="text-center">
                                <p className="text-gray-600 mb-2">Your Order Code</p>
                                <p className="text-4xl font-bold text-rose-500 tracking-wider">{orderCode}</p>
                            </div>

                            <div className="mt-6 text-left space-y-2 text-gray-600">
                                <p><strong>For:</strong> {recipientName}</p>
                                <p><strong>Package:</strong> {selectedPackage === 'premium' ? 'Premium (₵10)' : (selectedPackage === 'basic' ? 'Basic (₵5)' : 'FREE')}</p>
                                <p><strong>Date:</strong> {new Date(birthdayDate).toLocaleDateString()}</p>
                            </div>
                        </div>

                        {selectedPackage === 'free' ? (
                            <>
                                <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6">
                                    <p className="text-amber-800 text-sm">
                                        <strong>📝 Important:</strong> Save this code! You'll need it to:
                                        <br />1. Access and customize the birthday page
                                        <br />2. Share with friends to add their photos
                                        <br />3. View the final slideshow
                                    </p>
                                </div>

                                <div className="space-y-3">
                                    <button
                                        onClick={() => navigate(`/birthday/${orderCode}`)}
                                        className="w-full bg-gradient-to-r from-rose-500 to-pink-500 text-white py-4 rounded-xl font-semibold text-lg hover:shadow-lg transition"
                                    >
                                        Go to Birthday Page →
                                    </button>

                                    <Link
                                        to="/"
                                        className="block text-center text-gray-500 py-2"
                                    >
                                        Back to Home
                                    </Link>
                                </div>
                            </>
                        ) : (
                            <>
                                <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6">
                                    <p className="text-amber-800 text-sm">
                                        <strong>📝 Next Steps:</strong>
                                        <br />1. Save your order code: <strong>{orderCode}</strong>
                                        <br />2. Pay ₵{selectedPackage === 'premium' ? '10' : '5'} via MoMo
                                        <br />3. Admin will verify and activate your page
                                        <br />4. Check status using the button below
                                    </p>
                                </div>

                                <div className="space-y-3">
                                    <Link
                                        to={`/order-status?code=${orderCode}`}
                                        className="block w-full bg-gradient-to-r from-blue-500 to-indigo-500 text-white py-4 rounded-xl font-semibold text-lg text-center hover:shadow-lg transition"
                                    >
                                        Check Order Status →
                                    </Link>

                                    <Link
                                        to="/"
                                        className="block text-center text-gray-500 py-2"
                                    >
                                        Back to Home
                                    </Link>
                                </div>
                            </>
                        )}
                    </div>
                )}

                {/* Check Existing Order */}
                <div className="max-w-lg mx-auto mt-8">
                    <div className="bg-white rounded-3xl shadow-xl p-6">
                        <h3 className="font-bold text-gray-700 mb-4 text-center">Already have an order code?</h3>
                        <div className="flex gap-2">
                            <input
                                type="text"
                                value={existingCode}
                                onChange={(e) => setExistingCode(e.target.value.toUpperCase())}
                                placeholder="Enter your code"
                                className="flex-1 p-3 border-2 border-rose-200 rounded-xl focus:outline-none focus:border-rose-400 uppercase"
                                maxLength={6}
                            />
                            <button
                                onClick={checkExistingOrder}
                                className="bg-rose-500 text-white px-6 py-3 rounded-xl font-semibold"
                            >
                                Go →
                            </button>
                        </div>
                        <div className="mt-3 text-center">
                            <Link to="/order-status" className="text-rose-500 text-sm hover:text-rose-600">
                                Or check order status here →
                            </Link>
                        </div>
                    </div>
                </div>

                {/* How it works */}
                <div className="max-w-lg mx-auto mt-8">
                    <h3 className="text-xl font-bold text-gray-700 text-center mb-6">How It Works</h3>
                    <div className="grid grid-cols-3 gap-4 text-center">
                        <div>
                            <div className="text-3xl mb-2">1️⃣</div>
                            <p className="text-sm text-gray-600">Enter name & date</p>
                        </div>
                        <div>
                            <div className="text-3xl mb-2">2️⃣</div>
                            <p className="text-sm text-gray-600">Choose FREE or paid</p>
                        </div>
                        <div>
                            <div className="text-3xl mb-2">3️⃣</div>
                            <p className="text-sm text-gray-600">Share with friends!</p>
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="text-center mt-12 text-gray-500 text-sm pb-8">
                    <p>Made with ❤️ for special moments</p>
                </div>
            </div>
        </div>
    )
}

export default Order
