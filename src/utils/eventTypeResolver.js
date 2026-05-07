/**
 * EVENT TYPE RESOLVER UTILITY
 * Resolves the correct event type using priority mapping:
 * 1. page_type (highest priority)
 * 2. event_type (fallback)
 * 3. URL path detection (last resort)
 * 
 * Never returns a hardcoded "Birthday" default - always requires explicit selection
 */

/**
 * Resolves the effective event type from multiple sources
 * @param {string|null|undefined} pageType - The page_type field (highest priority)
 * @param {string|null|undefined} eventType - The event_type field (fallback)
 * @param {string} pathname - Current URL pathname for detection (last resort)
 * @returns {string|null} - Resolved event type or null if none found
 */
export const resolveEventType = (pageType, eventType, pathname = '') => {
  // Priority 1: page_type (explicit UI state)
  if (pageType && typeof pageType === 'string' && pageType.trim() !== '') {
    return pageType.trim().toLowerCase()
  }

  // Priority 2: event_type (from database/order)
  if (eventType && typeof eventType === 'string' && eventType.trim() !== '') {
    return eventType.trim().toLowerCase()
  }

  // Priority 3: Path-based detection (only for known paths)
  const detected = detectEventTypeFromPath(pathname)
  if (detected && detected !== 'birthday') {
    return detected
  }

  // Return null if no valid type found - NO hardcoded default
  return null
}

/**
 * Detects event type from URL path
 * @param {string} pathname - Current URL pathname
 * @returns {string|null} - Detected event type or null
 */
export const detectEventTypeFromPath = (pathname) => {
  if (!pathname || typeof pathname !== 'string') {
    return null
  }

  const pathLower = pathname.toLowerCase()
  
  // Check for specific event paths
  if (pathLower.includes('/wedding')) return 'wedding'
  if (pathLower.includes('/anniversary')) return 'anniversary'
  if (pathLower.includes('/party')) return 'party'
  if (pathLower.includes('/hangout')) return 'hangout'
  if (pathLower.includes('/other')) return 'other'
  if (pathLower.includes('/graduation')) return 'graduation'

  // Only return 'birthday' if explicitly in path
  if (pathLower.includes('/birthday')) return 'birthday'
  
  return null
}

/**
 * Validates if an event type is supported
 * @param {string} eventType - Event type to validate
 * @returns {boolean} - True if valid
 */
export const isValidEventType = (eventType) => {
  if (!eventType || typeof eventType !== 'string') return false
  
  const validTypes = ['birthday', 'wedding', 'anniversary', 'party', 'hangout', 'other', 'graduation']
  return validTypes.includes(eventType.toLowerCase())
}

/**
 * Gets slideshow heading based on resolved event type
 * @param {string|null} eventType - Resolved event type
 * @param {object} config - Slideshow configuration object
 * @param {string} recipientName - Recipient/Couple name for display
 * @returns {object} - Heading data { greeting, name, subtitle }
 */
export const getSlideshowHeading = (eventType, config, recipientName) => {
  // Default to null state - no hardcoded values
  if (!eventType || !config) {
    return {
      greeting: null,
      name: null,
      subtitle: null,
      isValid: false
    }
  }

  const validType = isValidEventType(eventType)
  if (!validType) {
    return {
      greeting: null,
      name: null,
      subtitle: null,
      isValid: false
    }
  }

  // Get event-specific config
  const eventConfig = config[eventType] || config.birthday
  
  return {
    greeting: eventConfig?.title?.greeting || null,
    name: recipientName || eventConfig?.intro?.fallbackName || null,
    subtitle: eventConfig?.title?.subtitle || null,
    isValid: true,
    eventType: eventType
  }
}

export default {
  resolveEventType,
  detectEventTypeFromPath,
  isValidEventType,
  getSlideshowHeading
}