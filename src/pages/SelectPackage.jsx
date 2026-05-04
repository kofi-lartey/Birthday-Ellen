import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase, STORAGE_KEYS } from '../supabase'

// Default packages aligned with packages_database.sql
const defaultPackages = [
    {
        id: 1,
        name: 'Free',
        tier: 'free',
        description: 'Perfect for trying out our platform. Create simple birthday pages for your loved ones.',
        price: 0,
        currency: 'USD',
        billing_period: 'monthly',
        allow_birthday_pages: true,
        allow_wedding_pages: false,
        allow_anniversary_pages: false,
        allow_graduation_pages: false,
        allow_custom_pages: false,
        max_photos_per_page: 5,
        max_videos_per_page: 0,
        max_audio_files: 0,
        max_storage_mb: 50,
        allow_music_player: false,
        allow_video_player: false,
        allow_gift_registry: false,
        allow_rsvp: false,
        allow_guestbook: false,
        allow_qr_codes: false,
        allow_custom_themes: false,
        allow_analytics: false,
        allow_custom_domain: false,
        allow_remove_branding: false,
        max_pages: 1,
        max_collaborators: 1,
        is_active: true,
        is_featured: false,
        display_order: 1,
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
        billing_period: 'monthly',
        allow_birthday_pages: true,
        allow_wedding_pages: true,
        allow_anniversary_pages: false,
        allow_graduation_pages: false,
        allow_custom_pages: false,
        max_photos_per_page: 15,
        max_videos_per_page: 1,
        max_audio_files: 0,
        max_storage_mb: 150,
        allow_music_player: true,
        allow_video_player: false,
        allow_gift_registry: true,
        allow_rsvp: false,
        allow_guestbook: false,
        allow_qr_codes: false,
        allow_custom_themes: false,
        allow_analytics: false,
        allow_custom_domain: false,
        allow_remove_branding: false,
        max_pages: 3,
        max_collaborators: 1,
        is_active: true,
        is_featured: false,
        display_order: 2,
        color: 'from-blue-500 to-blue-600',
        icon: '⭐'
    },
    {
        id: 3,
        name: 'Premium',
        tier: 'premium',
        description: 'The complete experience. All page types, unlimited features, and priority support.',
        price: 24.99,
        currency: 'USD',
        billing_period: 'monthly',
        allow_birthday_pages: true,
        allow_wedding_pages: true,
        allow_anniversary_pages: true,
        allow_graduation_pages: true,
        allow_custom_pages: false,
        max_photos_per_page: 50,
        max_videos_per_page: 3,
        max_audio_files: 2,
        max_storage_mb: 500,
        allow_music_player: true,
        allow_video_player: true,
        allow_gift_registry: true,
        allow_rsvp: true,
        allow_guestbook: true,
        allow_qr_codes: true,
        allow_custom_themes: true,
        allow_analytics: true,
        allow_custom_domain: false,
        allow_remove_branding: false,
        max_pages: 10,
        max_collaborators: 3,
        is_active: true,
        is_featured: true,
        display_order: 3,
        color: 'from-rose-500 to-pink-500',
        icon: '💎'
    },
    {
        id: 4,
        name: 'Enterprise',
        tier: 'enterprise',
        description: 'For professionals and businesses. Unlimited everything with white-label options.',
        price: 99.99,
        currency: 'USD',
        billing_period: 'yearly',
        allow_birthday_pages: true,
        allow_wedding_pages: true,
        allow_anniversary_pages: true,
        allow_graduation_pages: true,
        allow_custom_pages: true,
        max_photos_per_page: 999999,
        max_videos_per_page: 999999,
        max_audio_files: 999999,
        max_storage_mb: 999999,
        allow_music_player: true,
        allow_video_player: true,
        allow_gift_registry: true,
        allow_rsvp: true,
        allow_guestbook: true,
        allow_qr_codes: true,
        allow_custom_themes: true,
        allow_analytics: true,
        allow_custom_domain: true,
        allow_remove_branding: true,
        max_pages: 999999,
        max_collaborators: 999999,
        is_active: true,
        is_featured: false,
        display_order: 4,
        color: 'from-purple-600 to-purple-700',
        icon: '👑'
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
                setPackages(data)
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
             // Free tier - activate immediately
             if (pkg.tier === 'free') {
                 await activateFreePackage(pkg)
                 setIsLoading(false)
                 navigate('/login')
                 return
             }

             // Paid tier - redirect to payment details page
             // Don't change package yet - only after admin approval
             navigate(`/payment-details?package=${pkg.tier}&packageId=${pkg.id}&price=${pkg.price}&currency=${pkg.currency || 'USD'}`)

         } catch (err) {
             console.error('Package selection error:', err)
             setError('Failed to process selection. Please try again.')
         }

         setIsLoading(false)
     }

     async function activateFreePackage(pkg) {
         // Update user in localStorage and Supabase for free tier
         const updatedUser = {
             ...user,
             package_id: pkg.id,
             package_tier: pkg.tier,
             package_name: pkg.name,
             payment_status: 'confirmed',
             package_expires_at: null
         }
         localStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(updatedUser))

         // Update user in Supabase
         const { error: updateError } = await supabase
             .from('users')
             .update({
                 package_id: pkg.id,
                 package_tier: pkg.tier,
                 package_name: pkg.name,
                 payment_status: 'confirmed',
                 package_pending: null
             })
             .eq('id', user.id)

         // Record free package activation
         await supabase.from('user_packages').insert([{
             user_id: user.id,
             package_id: pkg.id,
             is_active: true,
             payment_status: 'confirmed'
         }])

         if (updateError) {
             console.log('Error updating user package:', updateError.message)
         }
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

    function getPageTypes(pkg) {
        const types = []
        if (pkg.allow_birthday_pages) types.push('Birthday')
        if (pkg.allow_wedding_pages) types.push('Wedding')
        if (pkg.allow_anniversary_pages) types.push('Anniversary')
        if (pkg.allow_graduation_pages) types.push('Graduation')
        if (pkg.allow_custom_pages) types.push('Custom')
        return types
    }

    function formatLimit(value) {
        return value >= 999999 ? 'Unlimited' : value
    }

    return (
        <div className="min-h-screen p-4 md:p-8" style={{ background: 'linear-gradient(135deg, #fce7f3 0%, #fbcfe8 100%)' }}>
            <div className="max-w-7xl mx-auto">
                <div className="text-center mb-8 pt-8">
                    {user?.package_tier ? (
                        <>
                            <h1 className="text-3xl md:text-4xl font-['Dancing_Script'] text-rose-500 mb-2">Upgrade Your Plan</h1>
                            <p className="text-gray-600">Current plan: <span className="font-bold">{user.package_name || user.package_tier?.toUpperCase()}</span></p>
                            <p className="text-gray-500 text-sm">Choose a new plan to unlock more features</p>
                        </>
                    ) : (
                        <>
                            <h1 className="text-3xl md:text-4xl font-['Dancing_Script'] text-rose-500 mb-2">Choose Your Plan</h1>
                            <p className="text-gray-600">Select the perfect package for your needs</p>
                        </>
                    )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {packages.map((pkg) => (
                        <div 
                            key={pkg.id} 
                            className={`bg-white rounded-3xl shadow-xl overflow-hidden transform hover:scale-105 transition duration-300 relative
                                ${user?.package_tier === pkg.tier ? 'ring-4 ring-rose-300' : ''}
                                ${pkg.is_featured ? 'ring-4 ring-rose-300' : ''}`}
                        >
                            {/* Most Popular Badge */}
                            {pkg.is_featured && !user?.package_tier && (
                                <div className="absolute top-4 right-4 bg-rose-500 text-white text-xs font-bold px-3 py-1 rounded-full z-10">
                                    Most Popular
                                </div>
                            )}
                            
                            {/* Current Plan Badge */}
                            {user?.package_tier === pkg.tier && (
                                <div className="bg-rose-500 text-white text-center py-2 font-semibold text-sm">
                                    Current Plan
                                </div>
                            )}
                            
                            <div className={`bg-gradient-to-r ${pkg.color || getPackageColor(pkg.tier)} p-6 text-white`}>
                                <div className="text-4xl mb-2">{pkg.icon || getPackageIcon(pkg.tier)}</div>
                                <h3 className="text-2xl font-bold">{pkg.name}</h3>
                                <div className="text-3xl font-bold mt-2">
                                    ${pkg.price}
                                    {pkg.billing_period && pkg.billing_period !== 'monthly' && <span className="text-sm font-normal">/{pkg.billing_period}</span>}
                                </div>
                            </div>
                            
                            <div className="p-6">
                                <p className="text-gray-600 text-sm mb-4">{pkg.description}</p>
                                
                                <div className="space-y-3 mb-6">
                                    <div>
                                        <div className="text-sm font-semibold text-gray-700 mb-2">Page Types:</div>
                                        <div className="flex flex-wrap gap-1">
                                            {getPageTypes(pkg).map((type, idx) => (
                                                <span key={idx} className="bg-rose-100 text-rose-600 px-2 py-1 rounded-full text-xs">
                                                    {type}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                    
                                    <div>
                                        <div className="text-sm font-semibold text-gray-700 mb-2">Limits:</div>
                                        <FeatureItem available={true} text={`${formatLimit(pkg.max_photos_per_page)} photos`} icon="📷" />
                                        <FeatureItem available={pkg.max_videos_per_page > 0} text={`${formatLimit(pkg.max_videos_per_page)} videos`} icon="🎬" />
                                        <FeatureItem available={pkg.max_audio_files > 0} text={`${formatLimit(pkg.max_audio_files)} audio files`} icon="🎵" />
                                        <FeatureItem available={true} text={`${formatLimit(pkg.max_pages)} pages`} icon="📄" />
                                        <FeatureItem available={true} text={`${formatLimit(pkg.max_storage_mb)}MB storage`} icon="💾" />
                                    </div>
                                    
                                    <div>
                                        <div className="text-sm font-semibold text-gray-700 mb-2">Features:</div>
                                        <FeatureItem available={pkg.allow_music_player} text="Music Player" icon="🎵" />
                                        <FeatureItem available={pkg.allow_video_player} text="Video Player" icon="🎥" />
                                        <FeatureItem available={pkg.allow_gift_registry} text="Gift Registry" icon="🎁" />
                                        <FeatureItem available={pkg.allow_rsvp} text="RSVP" icon="✅" />
                                        <FeatureItem available={pkg.allow_guestbook} text="Guestbook" icon="📝" />
                                        <FeatureItem available={pkg.allow_qr_codes} text="QR Codes" icon="📱" />
                                        <FeatureItem available={pkg.allow_custom_themes} text="Custom Themes" icon="🎨" />
                                        <FeatureItem available={pkg.allow_analytics} text="Analytics" icon="📊" />
                                        <FeatureItem available={pkg.allow_custom_domain} text="Custom Domain" icon="🌐" />
                                        <FeatureItem available={pkg.allow_remove_branding} text="Remove Branding" icon="✨" />
                                    </div>
                                </div>
                                
                                <button
                                    onClick={() => handleSelectPackage(pkg)}
                                    disabled={isLoading || user?.package_tier === pkg.tier}
                                    className={`w-full py-3 rounded-xl font-semibold transition ${
                                        user?.package_tier === pkg.tier 
                                            ? 'bg-gray-100 text-gray-400 cursor-not-allowed' 
                                            : pkg.tier === 'free' 
                                                ? 'bg-gray-200 text-gray-700 hover:bg-gray-300' 
                                                : `bg-gradient-to-r ${pkg.color || getPackageColor(pkg.tier)} text-white hover:opacity-90`
                                    }`}
                                >
                                    {isLoading && selectedPackage?.id === pkg.id ? 'Selecting...' : 
                                     user?.package_tier === pkg.tier ? 'Current Plan' : 
                                     pkg.tier === 'free' ? 'Get Started' : 'Select Plan'}
                                </button>
                            </div>
                        </div>
                    ))}
                </div>

                {error && (
                    <div className="mt-6 p-4 bg-red-50 border border-red-200 rounded-xl text-red-600 text-center max-w-2xl mx-auto">
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
