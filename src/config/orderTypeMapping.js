/**
 * ORDER TYPE MAPPING CONFIGURATION
 * Maps order types to their corresponding content schemas, media, and data structures
 * This enables dynamic content binding for all event types
 */

// Import existing schemas
import { getSlideshowConfig } from './slideshowSchemas';
import { getEventSchema, getEventTable, getEventDisplay, getEventFields } from './eventSchemas';

/**
 * Order type registry - defines all supported order types
 */
export const ORDER_TYPES = {
  birthday: {
    name: 'Birthday',
    description: 'Personal birthday celebration',
    emoji: '🎂',
    path: 'birthday',
    table: 'orders',
    isCore: true,
    packageTiers: ['free', 'basic', 'premium', 'unlimited'],
    features: ['slideshow', 'photo_gallery', 'music', 'gift_collection', 'countdown']
  },
  wedding: {
    name: 'Wedding',
    description: 'Wedding celebration for couples',
    emoji: '💍',
    path: 'wedding',
    table: 'weddings',
    isCore: false,
    packageTiers: ['basic', 'premium', 'unlimited'],
    features: ['public_view', 'guest_list', 'vendor_management', 'timeline', 'rsvp']
  },
  anniversary: {
    name: 'Anniversary',
    description: 'Relationship anniversary celebration',
    emoji: '💕',
    path: 'anniversary',
    table: 'anniversaries',
    isCore: false,
    packageTiers: ['free', 'basic', 'premium'],
    features: ['memory_gallery', 'gift_ideas', 'celebration_plan']
  },
  party: {
    name: 'Party',
    description: 'Social gathering or event',
    emoji: '🎉',
    path: 'party',
    table: 'parties',
    isCore: false,
    packageTiers: ['free', 'basic', 'premium'],
    features: ['guest_invites', 'playlist', 'activities', 'food_planning']
  },
  hangout: {
    name: 'Hangout',
    description: 'Casual get-together',
    emoji: '👋',
    path: 'hangout',
    table: 'hangouts',
    isCore: false,
    packageTiers: ['free', 'basic'],
    features: ['activity_list', 'snacks_planning', 'vibe_setting']
  },
  'other-event': {
    name: 'Other Event',
    description: 'Custom event type',
    emoji: '📅',
    path: 'other-event',
    table: 'other_events',
    isCore: false,
    packageTiers: ['free', 'basic', 'premium', 'unlimited'],
    features: ['custom_fields', 'flexible_planning']
  }
};

/**
 * Get order type configuration by key
 */
export const getOrderType = (orderType) => {
  return ORDER_TYPES[orderType] || ORDER_TYPES.birthday;
};

/**
 * Get slideshow configuration for order type
 */
export const getSlideshowForOrderType = (orderType) => {
  return getSlideshowConfig(orderType);
};

/**
 * Get event schema for order type
 */
export const getEventSchemaForOrderType = (orderType) => {
  return getEventSchema(orderType);
};

/**
 * Get table name for order type
 */
export const getTableForOrderType = (orderType) => {
  const orderTypeConfig = getOrderType(orderType);
  return orderTypeConfig.table;
};

/**
 * Check if order type is supported
 */
export const isSupportedOrderType = (orderType) => {
  return !!ORDER_TYPES[orderType];
};

/**
 * Get all supported order types
 */
export const getSupportedOrderTypes = () => {
  return Object.keys(ORDER_TYPES);
};

/**
 * Get order types available for user creation (isCore + enabled)
 */
export const getCreatableOrderTypes = () => {
  return Object.entries(ORDER_TYPES)
    .filter(([key, config]) => config.isCore)
    .map(([key, config]) => ({ key, ...config }));
};

/**
 * Get all order types for dashboard display
 */
export const getAllOrderTypesForDashboard = () => {
  return Object.entries(ORDER_TYPES).map(([key, config]) => ({
    key,
    ...config
  }));
};

/**
 * Detect order type from URL path
 */
export const detectOrderTypeFromPath = (pathname) => {
  for (const [key, config] of Object.entries(ORDER_TYPES)) {
    if (pathname.includes(`/${config.path}/`) || pathname.includes(`/public/${config.path}/`)) {
      return key;
    }
  }
  return 'birthday'; // default
};

/**
 * Generate shareable link for order type
 */
export const generateShareableLink = (orderType, identifier, isPublic = false) => {
  const config = getOrderType(orderType);
  const baseUrl = window.location.origin;
  
  if (isPublic) {
    return `${baseUrl}/public/${config.path}/${identifier}`;
  }
  
  return `${baseUrl}/${config.path}/${identifier}`;
};

/**
 * Check if feature is available for order type and package
 */
export const hasFeature = (orderType, feature, packageTier = 'free') => {
  const orderTypeConfig = getOrderType(orderType);
  
  // If feature is in the order type's features list
  const hasFeatureInType = orderTypeConfig.features.includes(feature);
  
  // Check package tier availability (simplified - in real app, this would be more complex)
  if (packageTier === 'free') {
    return hasFeatureInType && ['slideshow', 'photo_gallery', 'gift_collection'].includes(feature);
  }
  
  return hasFeatureInType;
};

/**
 * Get required fields for order creation based on type
 */
export const getRequiredFieldsForOrderType = (orderType) => {
  const schema = getEventSchemaForOrderType(orderType);
  return schema.creationFields.filter(field => field.required);
};

/**
 * Transform order data for specific order type
 */
export const transformOrderData = (orderType, data) => {
  const schema = getEventSchemaForOrderType(orderType);
  const transformed = {};
  
  for (const [key, value] of Object.entries(data)) {
    if (key === 'photos' && Array.isArray(value)) {
      transformed[key] = JSON.stringify(value);
    } else if (['is_public', 'DJ_provided', 'drinks_provided'].includes(key)) {
      transformed[key] = Boolean(value);
    } else {
      transformed[key] = value;
    }
  }
  
  return transformed;
};

/**
 * Validate order data for specific order type
 */
export const validateOrderData = (orderType, data) => {
  const requiredFields = getRequiredFieldsForOrderType(orderType);
  const errors = [];
  
  for (const field of requiredFields) {
    if (!data[field.name]) {
      errors.push(`${field.label} is required`);
    }
  }
  
  return errors;
};

/**
 * Get display configuration for order type
 */
export const getDisplayConfig = (orderType) => {
  return getEventDisplay(orderType);
};

/**
 * Default order type fallback
 */
export const DEFAULT_ORDER_TYPE = 'birthday';

export { getEventDisplay, getEventSchema };
