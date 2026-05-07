/**
 * Date Utilities for Supabase Date Handling
 * Ensures consistent ISO 8601 formatting and safe parsing
 */

/**
 * Convert a date string or Date object to ISO 8601 date string (YYYY-MM-DD)
 * @param {string|Date} date - Date input
 * @returns {string} ISO 8601 formatted date string
 */
export const formatDateForDB = (date) => {
  if (!date) return null;
  
  // If already a properly formatted string, return as-is
  if (typeof date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return date;
  }
  
  const d = date instanceof Date ? date : new Date(date);
  
  if (isNaN(d.getTime())) {
    console.error('Invalid date provided:', date);
    return null;
  }
  
  return d.toISOString().split('T')[0];
};

/**
 * Safely format a date for display
 * @param {string|Date} date - Date to format
 * @param {Object} options - toLocaleDateString options
 * @param {string} locale - Locale string (default: 'en-US')
 * @returns {string} Formatted date or 'Invalid Date' string
 */
export const safeFormatDate = (date, options = {}, locale = 'en-US') => {
  if (!date) return 'No date';
  
  try {
    const d = date instanceof Date ? date : new Date(date);
    
    if (isNaN(d.getTime())) {
      console.error('Invalid date:', date);
      return 'Invalid date';
    }
    
    const defaultOptions = {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    };
    
    return d.toLocaleDateString(locale, { ...defaultOptions, ...options });
  } catch (err) {
    console.error('Date formatting error:', err, 'Input:', date);
    return 'Invalid date';
  }
};

/**
 * Safely format date as time
 * @param {string|Date} date - Date to format
 * @returns {string} Formatted time or empty string
 */
export const safeFormatTime = (date) => {
  if (!date) return '';
  
  try {
    const d = date instanceof Date ? date : new Date(date);
    
    if (isNaN(d.getTime())) return '';
    
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  } catch (err) {
    console.error('Time formatting error:', err);
    return '';
  }
};

/**
 * Validate that a date string is valid
 * @param {string} dateString - Date string to validate
 * @returns {boolean} True if valid date string
 */
export const isValidDateString = (dateString) => {
  if (!dateString) return false;
  
  // Check YYYY-MM-DD format
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
    const d = new Date(dateString);
    return !isNaN(d.getTime());
  }
  
  // Check if it can be parsed as Date
  const d = new Date(dateString);
  return !isNaN(d.getTime());
};
