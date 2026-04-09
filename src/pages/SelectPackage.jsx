import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase, STORAGE_KEYS } from '../supabase'

// Default packages in case Supabase is not available
const defaultPackages = [
    {
        id: 1,
        name: 'Free',
        tier: 'free',
        description: 'Perfect for trying out our platform. Create simple birthday pages for your loved ones.',
        price: 0,
        currency: 'USD',
        features: {
            pageTypes: ['Birthday'],
            maxPhotosPerPage: 5,
            maxVideosPerPage: 0,
            maxPages: 1,
            musicPlayer: false,
            videoPlayer: false,
            giftRegistry: false,
            rsvp: false,
            guestbook: false,
            qrCodes: false,
            customThemes: false,
            analytics: false,
            customDomain: false,
            removeBranding: false
        },
        color: 'from-gray-500 to-gray-600',
        icon: '🎁'
    },
    {
        id: 2,
        name: 'Basic',
        tier: 'basic',
        description: 'Great for personal use. More photos and basic features for special occasions.',
        price: 9.99,
        currency: 'USD',
        features: {
            pageTypes: ['Birthday', 'Wedding'],
            maxPhotosPerPage: 15,
            maxVideosPerPage: 1,
            maxPages: 3,
            musicPlayer: true,
            videoPlayer: false,
            giftRegistry: true,
            rsvp: false,
            guestbook: false,
            qrCodes: false,
            customThemes: false,
            analytics: false,
            customDomain: false,
            removeBranding: false
        },
        color: 'from-blue-500 to-blue-600',
        icon: '⭐',
        isPopular: false
    },
    {
        id: 3,
        name: 'Premium',
        tier: 'premium',
        description: 'The complete experience. All page types, unlimited features, and priority support.',
        price: 24.99,
        currency: 'USD',
        features: {
            pageTypes: ['Birthday', 'Wedding', 'Anniversary', 'Graduation'],
            maxPhotosPerPage: 50,
            maxVideosPerPage: 3,
            maxPages: 10,
            musicPlayer: true,
            videoPlayer: true,
            giftRegistry: true,
            rsvp: true,
            guestbook: true,
            qrCodes: true,
            customThemes: true,
            analytics: true,
            customDomain: false,
            removeBranding: false
        },
        color: 'from-rose-500 to-pink-500',
        icon: '💎',
        isPopular: true
    },
    {
        id: 4,
        name: 'Enterprise',
        tier: 'enterprise',
        description: 'For professionals and businesses. Unlimited everything with white-label options.',
        price: 99.99,
        currency: 'USD',
        billingPeriod: 'yearly',
        features: {
            pageTypes: ['Birthday', 'Wedding', 'Anniversary', 'Graduation', 'Custom'],
            maxPhotosPerPage: 999999,
            maxVideosPerPage: 999999,
            maxPages: 999999,
            musicPlayer: true,
            videoPlayer: true,
            giftRegistry: true,
            rsvp: true,
            guestbook: true,
            qrCodes: true,
            customThemes: true,
            analytics: true,
            customDomain: true,
            removeBranding: true
        },
        color: 'from-purple-600 to-purple-700',
        icon: '👑',
        isPopular: false
    }
]

function SelectPackage() {
    const navigate = useNavigate()
    const [packages, setPackages] = useState(defaultPackages)
    const [selectedPackage, setSelectedPackage] = useState(null)
    const [isLoading, setIsLoading] = useState(false)
    const [error, setError] = useState('')
    const [user, setUser] = useState(null)

    useEffect(() => {
        const checkUser = () => {
            const currentUser = JSON.parse(localStorage.getItem(STORAGE_KEYS.CURRENT_USER) || 'null')
            
            if (!currentUser) {
                const urlParams = new URLSearchParams(window.location.search)
                const isFromAuth = window.location.pathname === '/auth/callback' || urlParams.has('code')
                
                if (isFromAuth) {
                    setTimeout(checkUser, 500)
                    return
                }
                
                navigate('/register')
                return
            }
            setUser(currentUser)
            
            const urlParams = new URLSearchParams(window.location.search)
            const isUpgrade = urlParams.get('upgrade') === 'true'
            
            if (isUpgrade) {
                // This is an upgrade flow - user already has a package
            }

            loadPackages()
        }

        checkUser()
    }, [navigate])

    async function loadPackages() {
        try {
            const { data, error } = await supabase
                .from('packages')
                .select('*')
                .eq('is_active', true)
                .order('display_order')

            if (data && data.length > 0) {
                const mappedPackages = data.map(pkg => ({
                    id: pkg.id,
                    name: pkg.name,
                    tier: pkg.tier,
                    description: pkg.description,
                    price: pkg.price,
                    currency: pkg.currency,
                    billingPeriod: pkg.billing_period,
                    features: {
                        pageTypes: [
                            pkg.allow_birthday_pages ? 'Birthday' : null,
                            pkg.allow_wedding_pages ? 'Wedding' : null,
                            pkg.allow_anniversary_pages ? 'Anniversary' : null,
                            pkg.allow_graduation_pages ? 'Graduation' : null,
                            pkg.allow_custom_pages ? 'Custom' : null
                        ].filter(Boolean),
                        maxPhotosPerPage: pkg.max_photos_per_page,
                        maxVideosPerPage: pkg.max_videos_per_page,
                        maxPages: pkg.max_pages,
                        musicPlayer: pkg.allow_music_player,
                        videoPlayer: pkg.allow_video_player,
                        giftRegistry: pkg.allow_gift_registry,
                        rsvp: pkg.allow_rsvp,
                        guestbook: pkg.allow_guestbook,
                        qrCodes: pkg.allow_qr_codes,
                        customThemes: pkg.allow_custom_themes,
                        analytics: pkg.allow_analytics,
                        customDomain: pkg.allow_custom_domain,
                        removeBranding: pkg.allow_remove_branding
                    },
                    color: getPackageColor(pkg.tier),
                    icon: getPackageIcon(pkg.tier),
                    isPopular: pkg.is_featured
                }))
                setPackages(mappedPackages)
            }
        } catch (err) {
            console.log('Using default packages:', err)
        }
    }

    function getPackageColor(tier) {
        const colors = {
            free: 'from-gray-500 to-gray-600',
            basic: 'from-blue-500 to-blue-600',
            premium: 'from-rose-500 to-pink-500',
            enterprise: 'from-purple-600 to-purple-700'
        }
        return colors[tier] || 'from-gray-500 to-gray-600'
    }

    function getPackageIcon(tier) {
        const icons = {
            free: '🎁',
            basic: '⭐',
            premium: '💎',
            enterprise: '👑'
        }
        return icons[tier] || '🎁'
    }

    async function handleSelectPackage(pkg) {
        setSelectedPackage(pkg)
        setIsLoading(true)
        setError('')

        try {
            // For paid packages, payment needs admin confirmation
            const paymentStatus = pkg.tier === 'free' ? 'confirmed' : 'pending'
            
            // Update user in localStorage with package info
            const updatedUser = {
                ...user,
                package_id: pkg.id,
                package_tier: pkg.tier,
                package_name: pkg.name,
                payment_status: paymentStatus,
                package_expires_at: null // Free tier doesn't expire
            }
            localStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(updatedUser))

            // Update user in Supabase
            const { error: updateError } = await supabase
                .from('users')
                .update({
                    package_id: pkg.id,
                    package_tier: pkg.tier,
                    package_name: pkg.name,
                    payment_status: paymentStatus
                })
                .eq('id', user.id)

            if (updateError) {
                console.log('Error updating user package:', updateError.message)
            }

            // For paid packages, add to pending payments for admin verification
            if (pkg.tier !== 'free') {
                // Add to pending_payments in localStorage for admin to review
                const pendingPayments = JSON.parse(localStorage.getItem('pending_payments') || '[]')
                pendingPayments.push({
                    id: Date.now().toString(),
                    user_id: user.id,
                    name: user.name || user.email,
                    email: user.email,
                    phone: user.phone || '',
                    package_tier: pkg.tier,
                    package_name: pkg.name,
                    amount: pkg.price,
                    created_at: new Date().toISOString()
                })
                localStorage.setItem('pending_payments', JSON.stringify(pendingPayments))
                
                // Record the user package selection
                await supabase.from('user_packages').insert([{
                    user_id: user.id,
                    package_id: pkg.id,
                    is_active: false // Not active until payment confirmed
                }])
            } else {
                // Record the user package selection for free tier
                if (pkg.tier === 'free') {
                    await supabase.from('user_packages').insert([{
                        user_id: user.id,
                        package_id: pkg.id,
                        is_active: true
                    }])
                }
            }

            // Navigate to login screen after package selection
            if (pkg.tier === 'free') {
                alert(`Package set to Free! You now have access to basic features. Please login to continue.`)
            } else {
                alert(`Package upgraded to ${pkg.name}! Your payment is pending admin confirmation. You'll have access to basic features until then. Please login to continue.`)
            }
            navigate('/login')

        } catch (err) {
            console.error('Package selection error:', err)
            setError('Failed to select package. Please try again.')
        }

        setIsLoading(false)
    }

    function FeatureItem({ available, text, icon }) {
        return (
            <div className={`flex items-center gap-2 text-sm ${available ? 'text-gray-700' : 'text-gray-400'}`}>
                <span className="text-lg">{icon}</span>
                <span className={available ? '' : 'line-through'}>{text}</span>
                {!available && <span className="text-xs">(Upgrade required)</span>}
            </div>
        )
    }

    return (
        <div className="min-h-screen p-4" style={{ background: 'linear-gradient(135deg, #fce7f3 0%, #fbcfe8 100%)' }}>
            <div className="max-w-6xl mx-auto">
                <div className="text-center mb-8 pt-8">
                    {user?.package_tier ? (
                        <>
                            <h1 className="text-4xl font-['Dancing_Script'] text-rose-500 mb-2">Upgrade Your Plan</h1>
                            <p className="text-gray-600">Your current plan: <span className="font-bold">{user.package_name || user.package_tier?.toUpperCase()}</span></p>
                            <p className="text-gray-500 text-sm">Choose a new plan to unlock more features</p>
                        </>
                    ) : (
                        <>
                            <h1 className="text-4xl font-['Dancing_Script'] text-rose-500 mb-2">Choose Your Plan</h1>
                            <p className="text-gray-600">Select the perfect package for your needs</p>
                        </>
                    )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {packages.map((pkg) => (
                        <div 
                            key={pkg.id} 
                            className={`bg-white rounded-3xl shadow-xl overflow-hidden transform hover:scale-105 transition duration-300 
                                ${user?.package_tier === pkg.tier ? 'ring-4 ring-rose-300' : ''}
                                ${pkg.isPopular ? 'ring-4 ring-rose-300' : ''}`}
                        >
                            {/* Current Plan Badge */}
                            {user?.package_tier === pkg.tier && (
                                <div className="bg-rose-500 text-white text-center py-1 font-semibold text-sm">
                                    Current Plan
                                </div>
                            )}
                            {!user?.package_tier && pkg.isPopular && (
                                <div className="bg-rose-500 text-white text-center py-2 font-semibold">
                                    Most Popular
                                </div>
                            )}
                            
                            <div className={`bg-gradient-to-r ${pkg.color} p-6 text-white`}>
                                <div className="text-4xl mb-2">{pkg.icon}</div>
                                <h3 className="text-2xl font-bold">{pkg.name}</h3>
                                <div className="text-3xl font-bold mt-2">
                                    ${pkg.price}
                                    {pkg.billingPeriod && <span className="text-sm font-normal">/{pkg.billingPeriod}</span>}
                                </div>
                            </div>
                            
                            <div className="p-6">
                                <p className="text-gray-600 text-sm mb-4">{pkg.description}</p>
                                
                                <div className="space-y-2 mb-6">
                                    <div className="text-sm font-semibold text-gray-700">Page Types:</div>
                                    <div className="flex flex-wrap gap-1">
                                        {pkg.features.pageTypes.map((type, idx) => (
                                            <span key={idx} className="bg-rose-100 text-rose-600 px-2 py-1 rounded-full text-xs">
                                                {type}
                                            </span>
                                        ))}
                                    </div>
                                    
                                    <div className="text-sm font-semibold text-gray-700 mt-3">Limits:</div>
                                    <FeatureItem available={true} text={`Max ${pkg.features.maxPhotosPerPage === 999999 ? 'Unlimited' : pkg.features.maxPhotosPerPage} photos`} icon="📷" />
                                    <FeatureItem available={pkg.features.maxVideosPerPage > 0} text={`Max ${pkg.features.maxVideosPerPage} videos`} icon="🎬" />
                                    <FeatureItem available={true} text={`Max ${pkg.features.maxPages === 999999 ? 'Unlimited' : pkg.features.maxPages} pages`} icon="📄" />
                                    
                                    <div className="text-sm font-semibold text-gray-700 mt-3">Features:</div>
                                    <FeatureItem available={pkg.features.musicPlayer} text="Music Player" icon="🎵" />
                                    <FeatureItem available={pkg.features.videoPlayer} text="Video Player" icon="🎥" />
                                    <FeatureItem available={pkg.features.giftRegistry} text="Gift Registry" icon="🎁" />
                                    <FeatureItem available={pkg.features.rsvp} text="RSVP" icon="✅" />
                                    <FeatureItem available={pkg.features.guestbook} text="Guestbook" icon="📝" />
                                    <FeatureItem available={pkg.features.qrCodes} text="QR Codes" icon="📱" />
                                    <FeatureItem available={pkg.features.customThemes} text="Custom Themes" icon="🎨" />
                                    <FeatureItem available={pkg.features.analytics} text="Analytics" icon="📊" />
                                    <FeatureItem available={pkg.features.customDomain} text="Custom Domain" icon="🌐" />
                                    <FeatureItem available={pkg.features.removeBranding} text="Remove Branding" icon="✨" />
                                </div>
                                
                                <button
                                    onClick={() => handleSelectPackage(pkg)}
                                    disabled={isLoading}
                                    className={`w-full py-3 rounded-xl font-semibold transition ${pkg.tier === 'free' ? 'bg-gray-200 text-gray-700 hover:bg-gray-300' : `bg-gradient-to-r ${pkg.color} text-white hover:opacity-90`}`}
                                >
                                    {isLoading && selectedPackage?.id === pkg.id ? 'Selecting...' : pkg.tier === 'free' ? 'Get Started' : 'Select Plan'}
                                </button>
                            </div>
                        </div>
                    ))}
                </div>

                {error && (
                    <div className="mt-6 p-4 bg-red-50 border border-red-200 rounded-xl text-red-600 text-center">
                        {error}
                    </div>
                )}

                <div className="text-center mt-8 text-gray-500 text-sm">
                    <p>All plans include basic support. Prices subject to change.</p>
                </div>
            </div>
        </div>
    )
}

export default SelectPackage
