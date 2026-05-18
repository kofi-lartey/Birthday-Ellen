import { useState, useEffect } from 'react'
import { supabase, STORAGE_KEYS } from '../supabase'

// Package feature definitions
export const PACKAGE_FEATURES = {
    // Page Types
    BIRTHDAY_PAGES: 'birthday_pages',
    WEDDING_PAGES: 'wedding_pages',
    ANNIVERSARY_PAGES: 'anniversary_pages',
    PARTY_PAGES: 'party_pages',
    HANGOUT_PAGES: 'hangout_pages',
    OTHER_PAGES: 'other_pages',

    // Media Limits
    MAX_PHOTOS: 'max_photos',
    MAX_VIDEOS: 'max_videos',
    MAX_AUDIO: 'max_audio',
    MAX_STORAGE: 'max_storage',

    // Features
    MUSIC_PLAYER: 'music_player',
    VIDEO_PLAYER: 'video_player',
    GIFT_REGISTRY: 'gift_registry',
    RSVP: 'rsvp',
    GUESTBOOK: 'guestbook',
    QR_CODES: 'qr_codes',
    CUSTOM_THEMES: 'custom_themes',
    ANALYTICS: 'analytics',
    CUSTOM_DOMAIN: 'custom_domain',
    REMOVE_BRANDING: 'remove_branding',

    // Limits
    MAX_PAGES: 'max_pages',
    MAX_COLLABORATORS: 'max_collaborators'
}

// Default package configurations with correct event type allowances
// Update the DEFAULT_PACKAGES to include the new fields
export const DEFAULT_PACKAGES = {
    free: {
        id: 74,
        name: 'Free',
        tier: 'free',
        allow_birthday_pages: true,
        allow_wedding_pages: false,
        allow_anniversary_pages: false,
        allow_party_pages: false,
        allow_hangout_pages: false,
        allow_other_pages: false,
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
        max_collaborators: 1
    },
    basic: {
        id: 75,
        name: 'Basic',
        tier: 'basic',
        allow_birthday_pages: true,
        allow_wedding_pages: true,
        allow_anniversary_pages: false,
        allow_party_pages: false,
        allow_hangout_pages: false,
        allow_other_pages: false,
        max_photos_per_page: 15,
        max_videos_per_page: 1,
        max_audio_files: 0,
        max_storage_mb: 50,
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
        max_collaborators: 1
    },
    premium: {
        id: 76,
        name: 'Premium',
        tier: 'premium',
        allow_birthday_pages: true,
        allow_wedding_pages: true,
        allow_anniversary_pages: true,
        allow_party_pages: true,
        allow_hangout_pages: false,
        allow_other_pages: false,
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
        max_collaborators: 1
    },
    enterprise: {
        id: 77,
        name: 'Enterprise',
        tier: 'enterprise',
        allow_birthday_pages: true,
        allow_wedding_pages: true,
        allow_anniversary_pages: true,
        allow_party_pages: true,
        allow_hangout_pages: true,
        allow_other_pages: true,
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
        max_collaborators: 999999
    }
}

// Hook to get current user's package
export function usePackage() {
    const [userPackage, setUserPackage] = useState(null)
    const [isLoading, setIsLoading] = useState(true)

    useEffect(() => {
        loadUserPackage()
    }, [])

    async function loadUserPackage() {
        try {
            const currentUser = JSON.parse(localStorage.getItem(STORAGE_KEYS.CURRENT_USER) || 'null')

            if (!currentUser) {
                setUserPackage(null)
                setIsLoading(false)
                return
            }

            // Try to get package from Supabase
            if (currentUser.package_tier && DEFAULT_PACKAGES[currentUser.package_tier]) {
                setUserPackage(DEFAULT_PACKAGES[currentUser.package_tier])
            } else {
                // Default to free package if no package tier set
                setUserPackage(DEFAULT_PACKAGES.free)
            }

            // Try to fetch from Supabase for more accurate data
            const { data } = await supabase
                .from('packages')
                .select('*')
                .eq('tier', currentUser.package_tier || 'free')
                .single()

            if (data) {
                setUserPackage(data)
            }
        } catch (err) {
            console.log('Error loading package:', err)
            // Fallback to default
            const currentUser = JSON.parse(localStorage.getItem(STORAGE_KEYS.CURRENT_USER) || 'null')
            setUserPackage(DEFAULT_PACKAGES[currentUser?.package_tier] || DEFAULT_PACKAGES.free)
        }

        setIsLoading(false)
    }

    // Check if user has access to a specific feature
    function hasFeature(feature) {
        if (!userPackage) return false

        const featureMap = {
            [PACKAGE_FEATURES.BIRTHDAY_PAGES]: 'allow_birthday_pages',
            [PACKAGE_FEATURES.WEDDING_PAGES]: 'allow_wedding_pages',
            [PACKAGE_FEATURES.ANNIVERSARY_PAGES]: 'allow_anniversary_pages',
            [PACKAGE_FEATURES.PARTY_PAGES]: 'allow_party_pages',
            [PACKAGE_FEATURES.HANGOUT_PAGES]: 'allow_hangout_pages',
            [PACKAGE_FEATURES.OTHER_PAGES]: 'allow_other_pages',
            [PACKAGE_FEATURES.MUSIC_PLAYER]: 'allow_music_player',
            [PACKAGE_FEATURES.VIDEO_PLAYER]: 'allow_video_player',
            [PACKAGE_FEATURES.GIFT_REGISTRY]: 'allow_gift_registry',
            [PACKAGE_FEATURES.RSVP]: 'allow_rsvp',
            [PACKAGE_FEATURES.GUESTBOOK]: 'allow_guestbook',
            [PACKAGE_FEATURES.QR_CODES]: 'allow_qr_codes',
            [PACKAGE_FEATURES.CUSTOM_THEMES]: 'allow_custom_themes',
            [PACKAGE_FEATURES.ANALYTICS]: 'allow_analytics',
            [PACKAGE_FEATURES.CUSTOM_DOMAIN]: 'allow_custom_domain',
            [PACKAGE_FEATURES.REMOVE_BRANDING]: 'allow_remove_branding'
        }

        const dbField = featureMap[feature]
        return dbField ? !!userPackage[dbField] : false
    }

    // Update canCreatePageType function
    function canCreatePageType(pageType) {
        if (!userPackage) return false

        const pageTypeMap = {
            'birthday': 'allow_birthday_pages',
            'wedding': 'allow_wedding_pages',
            'anniversary': 'allow_anniversary_pages',
            'party': 'allow_party_pages',
            'hangout': 'allow_hangout_pages',
            'other': 'allow_other_pages'
        }

        const dbField = pageTypeMap[pageType?.toLowerCase()]
        return dbField ? !!userPackage[dbField] : false
    }

    // Check media upload limit
    function getMediaLimit(mediaType) {
        if (!userPackage) return 0

        const limitMap = {
            'photos': 'max_photos_per_page',
            'videos': 'max_videos_per_page',
            'audio': 'max_audio_files',
            'storage': 'max_storage_mb'
        }

        const dbField = limitMap[mediaType?.toLowerCase()]
        return dbField ? userPackage[dbField] : 0
    }

    // Check if user can upload more media
    function canUploadMedia(mediaType, currentCount) {
        const limit = getMediaLimit(mediaType)
        return currentCount < limit
    }

    // Get maximum pages allowed
    function getMaxPages() {
        return userPackage?.max_pages || 1
    }

    // Check if user can create more pages
    function canCreatePage(currentPageCount) {
        const maxPages = getMaxPages()
        return currentPageCount < maxPages
    }

    // Get all package features for display
    function getAllFeatures() {
        if (!userPackage) return {}

        // Build list of allowed page types
        const allowedPages = []
        if (userPackage.allow_birthday_pages) allowedPages.push('birthday')
        if (userPackage.allow_wedding_pages) allowedPages.push('wedding')
        if (userPackage.allow_anniversary_pages) allowedPages.push('anniversary')
        if (userPackage.allow_party_pages) allowedPages.push('party')
        if (userPackage.allow_hangout_pages) allowedPages.push('hangout')
        if (userPackage.allow_other_pages) allowedPages.push('other')

        // Build list of enabled features
        const enabledFeatures = []
        if (userPackage.allow_music_player) enabledFeatures.push('Music Player')
        if (userPackage.allow_video_player) enabledFeatures.push('Video Player')
        if (userPackage.allow_gift_registry) enabledFeatures.push('Gift Registry')
        if (userPackage.allow_rsvp) enabledFeatures.push('RSVP')
        if (userPackage.allow_guestbook) enabledFeatures.push('Guestbook')
        if (userPackage.allow_qr_codes) enabledFeatures.push('QR Codes')
        if (userPackage.allow_custom_themes) enabledFeatures.push('Custom Themes')
        if (userPackage.allow_analytics) enabledFeatures.push('Analytics')
        if (userPackage.allow_custom_domain) enabledFeatures.push('Custom Domain')
        if (userPackage.allow_remove_branding) enabledFeatures.push('Remove Branding')

        return {
            allowedPageTypes: allowedPages,
            enabledFeatures: enabledFeatures,
            limits: {
                maxPhotos: userPackage.max_photos_per_page,
                maxVideos: userPackage.max_videos_per_page,
                maxPages: userPackage.max_pages,
                maxStorage: userPackage.max_storage_mb,
                maxCollaborators: userPackage.max_collaborators
            }
        }
    }

    // Get upgrade recommendation based on desired feature
    function getUpgradeSuggestion(desiredFeature) {
        const featureToPackage = {
            'wedding': 'basic',
            'anniversary': 'premium',
            'party': 'premium',
            'hangout': 'enterprise',
            'other': 'enterprise'
        }

        const requiredPackage = featureToPackage[desiredFeature?.toLowerCase()]

        const packageNames = {
            'basic': 'Basic',
            'premium': 'Premium',
            'enterprise': 'Enterprise'
        }

        return {
            requiredTier: requiredPackage,
            packageName: packageNames[requiredPackage],
            message: `Upgrade to ${packageNames[requiredPackage]} to create ${desiredFeature} events!`
        }
    }

    return {
        userPackage,
        isLoading,
        hasFeature,
        canCreatePageType,
        getMediaLimit,
        canUploadMedia,
        getMaxPages,
        canCreatePage,
        getAllFeatures,
        getUpgradeSuggestion,
        // Convenience checks
        isFree: userPackage?.tier === 'free',
        isBasic: userPackage?.tier === 'basic',
        isPremium: userPackage?.tier === 'premium',
        isEnterprise: userPackage?.tier === 'enterprise'
    }
}

// Higher-order component wrapper for protected routes
export function withPackageRestriction(WrappedComponent, requiredFeature) {
    return function WithPackageRestriction(props) {
        const { hasFeature, userPackage, isLoading } = usePackage()

        if (isLoading) {
            return (
                <div className="min-h-screen flex items-center justify-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-rose-500"></div>
                </div>
            )
        }

        if (!userPackage || !hasFeature(requiredFeature)) {
            return (
                <div className="min-h-screen flex items-center justify-center p-4">
                    <div className="bg-white rounded-3xl shadow-2xl p-8 max-w-md text-center">
                        <div className="text-6xl mb-4">🔒</div>
                        <h2 className="text-2xl font-bold text-gray-700 mb-2">Feature Locked</h2>
                        <p className="text-gray-500 mb-6">
                            This feature requires an upgraded package.
                            Upgrade your plan to unlock this feature!
                        </p>
                        <button
                            onClick={() => window.location.href = '/select-package'}
                            className="bg-gradient-to-r from-rose-500 to-pink-500 text-white px-6 py-3 rounded-xl font-semibold"
                        >
                            View Packages
                        </button>
                    </div>
                </div>
            )
        }

        return <WrappedComponent {...props} />
    }
}

export default usePackage