import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase, STORAGE_KEYS } from '../supabase'

// Default packages kept same for logic, UI updated in render
const defaultPackages = [
    {
        id: 1,
        name: 'Free',
        tier: 'free',
        description: 'Perfect for simple event pages for loved ones.',
        price: 0,
        priceGHS: 0,
        currency: 'USD',
        color: 'from-gray-50 to-gray-100',
        borderColor: 'border-gray-200',
        icon: '🌱',
        popular: false,
        max_pages: 1,
        max_photos_per_page: 5,
        allow_custom_domain: false,
        allow_analytics: false,
        buttonClass: 'bg-gray-100 text-gray-700 hover:bg-gray-200'
    },
    {
        id: 2,
        name: 'Basic',
        tier: 'basic',
        description: 'More photos and features for special occasions.',
        price: 9.99,
        priceGHS: 15,
        currency: 'USD',
        color: 'from-blue-50 to-blue-100',
        borderColor: 'border-blue-200',
        icon: '✨',
        popular: false,
        max_pages: 3,
        max_photos_per_page: 15,
        allow_custom_domain: false,
        allow_analytics: false,
        buttonClass: 'bg-blue-600 text-white hover:bg-blue-700'
    },
    {
        id: 3,
        name: 'Premium',
        tier: 'premium',
        description: 'The complete experience with priority support.',
        price: 24.99,
        priceGHS: 30,
        currency: 'USD',
        color: 'from-indigo-50 to-indigo-100',
        borderColor: 'border-indigo-300',
        icon: '💎',
        popular: true,
        max_pages: 10,
        max_photos_per_page: 50,
        allow_custom_domain: false,
        allow_analytics: true,
        buttonClass: 'bg-indigo-600 text-white hover:bg-indigo-700'
    },
    {
        id: 4,
        name: 'Enterprise',
        tier: 'enterprise',
        description: 'Unlimited everything with white-label options.',
        price: 99.99,
        priceGHS: 100,
        currency: 'USD',
        color: 'from-purple-50 to-purple-100',
        borderColor: 'border-purple-300',
        icon: '👑',
        popular: false,
        max_pages: 999999,
        max_photos_per_page: 999999,
        allow_custom_domain: true,
        allow_analytics: true,
        buttonClass: 'bg-purple-600 text-white hover:bg-purple-700'
    }
]

function SelectPackage() {
    const navigate = useNavigate()
    const [packages, setPackages] = useState(defaultPackages)
    const [selectedPackage, setSelectedPackage] = useState(null)
    const [isLoading, setIsLoading] = useState(false)
    const [error, setError] = useState('')
    const [user, setUser] = useState(null)
    const [billingCycle, setBillingCycle] = useState('monthly')
    const [hoveredCard, setHoveredCard] = useState(null)
    const [currency, setCurrency] = useState('USD') // 'USD' or 'GHS'

    useEffect(() => {
        const checkUser = () => {
            const currentUser = JSON.parse(localStorage.getItem(STORAGE_KEYS.CURRENT_USER) || 'null')
            if (!currentUser) {
                navigate('/register')
                return
            }
            setUser(currentUser)
            loadPackages()
        }
        checkUser()
    }, [navigate])

    async function loadPackages() {
        try {
            const { data } = await supabase
                .from('packages')
                .select('*')
                .eq('is_active', true)
                .order('display_order')

            if (data && data.length > 0) {
                const enriched = data.map(dbPkg => ({
                    ...dbPkg,
                    ...defaultPackages.find(d => d.tier === dbPkg.tier)
                }))
                setPackages(enriched)
            }
        } catch (err) {
            console.log('Using default packages')
        }
    }

    const getPrice = (pkg) => {
        const price = currency === 'GHS' ? pkg.priceGHS : pkg.price
        if (billingCycle === 'yearly') {
            return Math.round(price * 10)
        }
        return price
    }

    const getFormattedPrice = (pkg) => {
        const price = getPrice(pkg)
        if (price === 0) return 'FREE'
        return currency === 'GHS' ? `₵${price}` : `$${price}`
    }

    const getYearlySavings = (pkg) => {
        const price = currency === 'GHS' ? pkg.priceGHS : pkg.price
        if (price === 0) return null
        const monthlyTotal = price * 12
        const yearlyTotal = price * 10
        const savings = monthlyTotal - yearlyTotal
        return Math.round(savings)
    }

    async function handleSelectPackage(pkg) {
        setSelectedPackage(pkg)
        setIsLoading(true)
        setError('')

        try {
            if (pkg.tier === 'free') {
                await activateFreePackage(pkg)
                setIsLoading(false)
                navigate('/dashboard')
                return
            }

            const updatedUser = {
                ...user,
                package_pending: pkg.tier,
                package_pending_id: pkg.id,
                payment_status: 'pending'
            }
            localStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(updatedUser))

            const price = getPrice(pkg)
            await supabase
                .from('users')
                .update({
                    package_pending: pkg.tier,
                    package_pending_id: pkg.id,
                    payment_status: 'pending'
                })
                .eq('id', user.id)

            navigate(`/payment-details?package=${pkg.tier}&packageId=${pkg.id}&price=${price}&currency=${currency}&billing=${billingCycle}`)

        } catch (err) {
            console.error('Package selection error:', err)
            setError('Failed to process selection. Please try again.')
        }

        setIsLoading(false)
    }

    async function activateFreePackage(pkg) {
        const updatedUser = {
            ...user,
            package_id: pkg.id,
            package_tier: pkg.tier,
            package_name: pkg.name,
            payment_status: 'confirmed',
            package_expires_at: null,
            package_pending: null
        }
        localStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(updatedUser))

        await supabase
            .from('users')
            .update({
                package_id: pkg.id,
                package_tier: pkg.tier,
                package_name: pkg.name,
                payment_status: 'confirmed',
                package_pending: null
            })
            .eq('id', user.id)

        await supabase.from('user_packages').insert([{
            user_id: user.id,
            package_id: pkg.id,
            is_active: true,
            payment_status: 'confirmed'
        }])
    }

    function goToDashboard() {
        navigate('/dashboard')
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 md:py-24">
                
                {/* Back Navigation Button */}
                <div className="mb-8">
                    <button
                        onClick={goToDashboard}
                        className="inline-flex items-center gap-2 text-slate-600 hover:text-indigo-600 transition-colors group"
                    >
                        <svg className="w-5 h-5 transition-transform group-hover:-translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                        </svg>
                        <span className="font-medium">Back to Dashboard</span>
                    </button>
                </div>

                {/* Hero Section */}
                <div className="text-center max-w-3xl mx-auto mb-16">
                    <div className="inline-flex items-center gap-2 bg-indigo-50 px-4 py-2 rounded-full mb-6">
                        <span className="text-indigo-600 text-sm font-semibold">🎉 Special Launch Offer</span>
                    </div>
                    <h1 className="text-4xl md:text-6xl font-bold bg-gradient-to-r from-slate-900 via-indigo-800 to-slate-900 bg-clip-text text-transparent mb-6">
                        Choose Your Perfect Plan
                    </h1>
                    <p className="text-lg text-slate-600 leading-relaxed">
                        Start with our free plan and upgrade as you grow. No hidden fees, cancel anytime.
                    </p>

                    {/* Currency Toggle */}
                    <div className="mt-8 flex items-center justify-center gap-3">
                        <button
                            onClick={() => setCurrency('USD')}
                            className={`px-4 py-2 rounded-full text-sm font-semibold transition-all ${
                                currency === 'USD' 
                                    ? 'bg-indigo-600 text-white shadow-md' 
                                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                            }`}
                        >
                            🇺🇸 USD
                        </button>
                        <button
                            onClick={() => setCurrency('GHS')}
                            className={`px-4 py-2 rounded-full text-sm font-semibold transition-all ${
                                currency === 'GHS' 
                                    ? 'bg-indigo-600 text-white shadow-md' 
                                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                            }`}
                        >
                            🇬🇭 GHS (₵)
                        </button>
                    </div>

                    {/* Billing Toggle */}
                    <div className="mt-8 flex items-center justify-center gap-4">
                        <span className={`text-sm font-medium transition-colors ${billingCycle === 'monthly' ? 'text-slate-900' : 'text-slate-400'}`}>
                            Monthly
                        </span>
                        <button 
                            onClick={() => setBillingCycle(prev => prev === 'monthly' ? 'yearly' : 'monthly')}
                            className="relative w-14 h-7 bg-slate-200 rounded-full p-1 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
                        >
                            <div className={`w-5 h-5 bg-white rounded-full shadow-md transform transition-transform duration-200 ${billingCycle === 'yearly' ? 'translate-x-7 bg-indigo-600' : ''}`} />
                        </button>
                        <span className={`text-sm font-medium transition-colors ${billingCycle === 'yearly' ? 'text-slate-900' : 'text-slate-400'}`}>
                            Yearly
                            <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                Save 17%
                            </span>
                        </span>
                    </div>
                </div>

                {/* Pricing Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                    {packages.map((pkg) => {
                        const isCurrent = user?.package_tier === pkg.tier
                        const isPopular = pkg.popular
                        const yearlySavings = getYearlySavings(pkg)
                        const isHovered = hoveredCard === pkg.id
                        const displayPrice = getFormattedPrice(pkg)
                        
                        return (
                            <div 
                                key={pkg.id}
                                onMouseEnter={() => setHoveredCard(pkg.id)}
                                onMouseLeave={() => setHoveredCard(null)}
                                className={`relative rounded-2xl bg-white border-2 transition-all duration-300 transform ${
                                    isHovered ? 'scale-105 shadow-2xl' : 'shadow-lg'
                                } ${
                                    isPopular 
                                        ? 'border-indigo-500 ring-2 ring-indigo-200' 
                                        : 'border-slate-200'
                                }`}
                            >
                                {/* Popular Badge */}
                                {isPopular && (
                                    <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                                        <span className="bg-gradient-to-r from-indigo-500 to-purple-500 text-white text-xs font-bold uppercase tracking-wider px-4 py-1.5 rounded-full shadow-lg">
                                            Most Popular
                                        </span>
                                    </div>
                                )}

                                {/* Current Plan Badge */}
                                {isCurrent && (
                                    <div className="absolute top-4 right-4">
                                        <span className="bg-green-100 text-green-700 text-xs font-semibold px-2 py-1 rounded-full">
                                            Current Plan
                                        </span>
                                    </div>
                                )}

                                <div className="p-6">
                                    {/* Icon & Name */}
                                    <div className="flex items-center justify-between mb-6">
                                        <div className="text-5xl">{pkg.icon}</div>
                                        {yearlySavings && billingCycle === 'yearly' && (
                                            <div className="bg-green-100 text-green-700 text-xs font-bold px-2 py-1 rounded-full">
                                                Save {currency === 'GHS' ? `₵${yearlySavings}` : `$${yearlySavings}`}/yr
                                            </div>
                                        )}
                                    </div>
                                    
                                    <h3 className="text-2xl font-bold text-slate-900 mb-2">{pkg.name}</h3>
                                    <p className="text-slate-500 text-sm mb-4">{pkg.description}</p>
                                    
                                    {/* Price */}
                                    <div className="mb-6">
                                        <div className="flex items-baseline gap-1">
                                            <span className="text-4xl font-extrabold text-slate-900">
                                                {displayPrice}
                                            </span>
                                            <span className="text-slate-500">
                                                /{billingCycle === 'monthly' ? 'month' : 'year'}
                                            </span>
                                        </div>
                                        {pkg.price > 0 && billingCycle === 'yearly' && (
                                            <p className="text-xs text-green-600 mt-1">
                                                Was {currency === 'GHS' ? `₵${pkg.priceGHS * 12}` : `$${pkg.price * 12}`}/year
                                            </p>
                                        )}
                                        {pkg.price === 0 && (
                                            <p className="text-xs text-slate-400 mt-1">No credit card required</p>
                                        )}
                                    </div>

                                    {/* Features List */}
                                    <div className="space-y-3 mb-8">
                                        <div className="flex items-center gap-2 text-sm">
                                            <svg className="w-5 h-5 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                                            </svg>
                                            <span className="text-slate-700">Up to {pkg.max_pages === 999999 ? 'Unlimited' : pkg.max_pages} Event{pkg.max_pages !== 1 ? 's' : ''}</span>
                                        </div>
                                        <div className="flex items-center gap-2 text-sm">
                                            <svg className="w-5 h-5 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                                            </svg>
                                            <span className="text-slate-700">{pkg.max_photos_per_page === 999999 ? 'Unlimited' : pkg.max_photos_per_page} Photos per event</span>
                                        </div>
                                        {pkg.allow_custom_domain && (
                                            <div className="flex items-center gap-2 text-sm">
                                                <svg className="w-5 h-5 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.66 0 3-4.03 3-9s-1.34-9-3-9m0 18c-1.66 0-3-4.03-3-9s1.34-9 3-9" />
                                                </svg>
                                                <span className="text-slate-700">Custom Domain</span>
                                            </div>
                                        )}
                                        {pkg.allow_analytics && (
                                            <div className="flex items-center gap-2 text-sm">
                                                <svg className="w-5 h-5 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                                                </svg>
                                                <span className="text-slate-700">Analytics Dashboard</span>
                                            </div>
                                        )}
                                    </div>

                                    {/* CTA Button */}
                                    <button
                                        onClick={() => handleSelectPackage(pkg)}
                                        disabled={isCurrent || isLoading}
                                        className={`w-full py-3 rounded-xl font-semibold text-sm transition-all duration-200 ${
                                            isCurrent 
                                                ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                                                : pkg.tier === 'free'
                                                    ? 'bg-slate-900 text-white hover:bg-slate-800'
                                                    : pkg.buttonClass
                                        } ${!isCurrent && 'hover:shadow-lg transform hover:-translate-y-0.5'}`}
                                    >
                                        {isLoading && selectedPackage?.id === pkg.id ? (
                                            <div className="flex items-center justify-center gap-2">
                                                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                                Processing...
                                            </div>
                                        ) : isCurrent ? (
                                            '✓ Current Plan'
                                        ) : pkg.tier === 'free' ? (
                                            'Start Free'
                                        ) : (
                                            `Upgrade to ${pkg.name}`
                                        )}
                                    </button>
                                </div>
                            </div>
                        )
                    })}
                </div>

                {/* Trust Badges */}
                <div className="mt-16 text-center">
                    <div className="flex flex-wrap items-center justify-center gap-8 mb-8">
                        <div className="flex items-center gap-2 text-slate-500">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            <span className="text-sm">Cancel anytime</span>
                        </div>
                        <div className="flex items-center gap-2 text-slate-500">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                            </svg>
                            <span className="text-sm">Secure payment</span>
                        </div>
                        <div className="flex items-center gap-2 text-slate-500">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 21h18M3 10h18M5 6h14M5 4h14" />
                            </svg>
                            <span className="text-sm">14-day money back</span>
                        </div>
                    </div>
                    
                    <p className="text-slate-400 text-sm">
                        Need a custom plan? <button className="text-indigo-600 hover:text-indigo-700 font-medium">Contact our sales team</button>
                    </p>
                </div>

                {/* Error Toast */}
                {error && (
                    <div className="fixed bottom-4 right-4 bg-red-500 text-white px-6 py-3 rounded-lg shadow-lg animate-bounce">
                        {error}
                    </div>
                )}
            </div>
        </div>
    )
}

export default SelectPackage