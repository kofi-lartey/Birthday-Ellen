/**
 * Payment Reference Generator
 * Generates unique alphanumeric reference codes for payment transactions
 * Format: [PREFIX][4-DIGIT]
 * Example: B2476 (Basic tier), P1234 (Premium tier), E5678 (Enterprise tier)
 */

// Tier prefix mapping
const TIER_PREFIX = {
    free: 'F',
    basic: 'B',
    premium: 'P',
    enterprise: 'E'
};

/**
 * Generates a unique payment reference code
 * @param {string} tier - The package tier (free, basic, premium, enterprise)
 * @returns {string} Unique reference code (e.g., "B2476")
 */
export function generatePaymentReference(tier = 'basic') {
    const prefix = TIER_PREFIX[tier] || 'T';
    const randomDigits = Math.floor(1000 + Math.random() * 9000).toString();
    return prefix + randomDigits;
}

/**
 * Validates a payment reference code format
 * @param {string} code - The reference code to validate
 * @returns {boolean} True if format is valid
 */
export function isValidReferenceCode(code) {
    if (!code || typeof code !== 'string') return false;
    if (code.length < 2) return false;
    
    const prefix = code[0];
    const digits = code.slice(1);
    
    // Check prefix is valid tier
    const validPrefixes = Object.values(TIER_PREFIX);
    if (!validPrefixes.includes(prefix)) return false;
    
    // Check digits are numeric and exactly 4 digits
    return /^\d{4}$/.test(digits);
}

/**
 * Extracts tier from reference code
 * @param {string} code - The payment reference code
 * @returns {string|null} The tier or null if invalid
 */
export function tierFromReference(code) {
    if (!isValidReferenceCode(code)) return null;
    
    const prefix = code[0];
    const entry = Object.entries(TIER_PREFIX).find(([tier, p]) => p === prefix);
    return entry ? entry[0] : null;
}
