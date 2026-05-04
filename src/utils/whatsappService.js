// ============================================
// WHATSAPP AUTOMATION SERVICE
// ============================================
// Service for automated WhatsApp notifications
// Target: 0531114795 (admin order notification)
// ============================================

const WHATSAPP_TARGET = '0531114795';
const WHATSAPP_API_URL = 'https://graph.facebook.com/v18.0';

/**
 * Format phone number for WhatsApp (remove non-digits, add country code)
 */
function formatWhatsAppNumber(phone) {
  if (!phone) return '';
  let cleaned = phone.replace(/\D/g, '');
  // If no country code and not starting with 0, assume Ghana +233
  if (cleaned.length === 9 && !cleaned.startsWith('233')) {
    cleaned = '233' + cleaned;
  }
  // If starts with 0, replace with Ghana country code
  if (cleaned.startsWith('0')) {
    cleaned = '233' + cleaned.substring(1);
  }
  return cleaned;
}

/**
 * Build WhatsApp deep link URL for sending messages
 */
function buildWhatsAppLink(phone, message) {
  const encodedMessage = encodeURIComponent(message);
  return `https://wa.me/${phone}?text=${encodedMessage}`;
}

/**
 * Generate dynamic WhatsApp message for new orders
 */
export function generateOrderMessage(orderData) {
  const { 
    orderCode, 
    recipientName, 
    birthdayDate, 
    giverName, 
    giverPhone, 
    package: pkg, 
    status,
    giftType = 'N/A',
    selectedProduct = 'N/A',
    giftAmount = 'N/A'
  } = orderData;
  
  const formattedDate = new Date(birthdayDate).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'long',
    year: 'numeric'
  });
  
  const packageNames = {
    free: 'FREE Package',
    basic: 'Basic Package',
    premium: 'Premium Package',
    unlimited: 'Unlimited Subscription'
  };
  
  const packageLabel = packageNames[pkg] || pkg;
  
  let message = `🎁 *NEW ORDER RECEIVED* 🎁\n\n`;
  message += `📄 *Order Code:* ${orderCode}\n`;
  message += `📦 *Package:* ${packageLabel}\n`;
  message += `🎉 *Birthday Person:* ${recipientName}\n`;
  message += `📅 *Birthday Date:* ${formattedDate}\n`;
  message += `💝 *From:* ${giverName}\n`;
  message += `📱 *Customer Phone:* ${giverPhone || 'N/A'}\n`;
  message += `⭐ *Status:* ${status.toUpperCase()}\n`;
  
  if (giftType !== 'N/A') {
    message += `\n🎀 *Gift Type:* ${giftType}\n`;
  }
  
  if (selectedProduct !== 'N/A' && selectedProduct) {
    message += `📦 *Product:* ${selectedProduct}\n`;
  }
  
  if (giftAmount !== 'N/A' && giftAmount) {
    message += `💰 *Amount:* ${giftAmount}\n`;
  }
  
  message += `\n───────────────────\n`;
  message += `*Timestamp:* ${new Date().toLocaleString('en-GB')}\n`;
  message += `⚡ *System:* Birthday Surprise App`;
  
  return message;
}

/**
 * Generate WhatsApp message for gift submissions
 */
export function generateGiftMessage(giftData) {
  const { 
    giftCode, 
    orderCode, 
    recipientName, 
    type, 
    senderName, 
    message: giftMessage,
    giftAmount,
    selectedProduct
  } = giftData;
  
  let message = `🎁 *NEW GIFT SENT* 🎁\n\n`;
  message += `🎫 *Gift Code:* ${giftCode}\n`;
  message += `📄 *Order Code:* ${orderCode}\n`;
  message += `🎉 *Recipient:* ${recipientName}\n`;
  message += `🎀 *Gift Type:* ${type}\n`;
  message += `💝 *From:* ${senderName}\n`;
  
  if (giftAmount) {
    message += `💰 *Amount:* $${giftAmount}\n`;
  }
  
  if (selectedProduct) {
    message += `📦 *Product:* ${selectedProduct}\n`;
  }
  
  if (giftMessage) {
    message += `💌 *Message:* "${giftMessage}"\n`;
  }
  
  message += `\n───────────────────\n`;
  message += `*Timestamp:* ${new Date().toLocaleString('en-GB')}\n`;
  message += `⚡ *System:* Birthday Surprise App`;
  
  return message;
}

/**
 * Send WhatsApp notification via deep link (web-based)
 */
export function sendWhatsAppNotification(message, targetPhone = WHATSAPP_TARGET) {
  const formattedPhone = formatWhatsAppNumber(targetPhone);
  const link = buildWhatsAppLink(formattedPhone, message);
  
  // Return link for programmatic use
  return {
    success: true,
    link,
    phone: formattedPhone,
    canOpen: typeof window !== 'undefined',
    openInNewTab: () => {
      if (typeof window !== 'undefined') {
        window.open(link, '_blank', 'noopener,noreferrer');
      }
    }
  };
}

/**
 * Try to auto-send via WhatsApp API (if configured)
 */
export async function sendWhatsAppAuto(message, targetPhone = WHATSAPP_TARGET) {
  const formattedPhone = formatWhatsAppNumber(targetPhone);
  
  // Method 1: Try WhatsApp Web API if available
  if (typeof window !== 'undefined' && window.open) {
    const link = buildWhatsAppLink(formattedPhone, message);
    
    // Attempt to open WhatsApp
    try {
      window.open(link, '_blank', 'noopener,noreferrer');
      return {
        success: true,
        method: 'web_deep_link',
        message: 'WhatsApp notification link generated',
        link
      };
    } catch (err) {
      console.warn('WhatsApp deep link failed:', err);
    }
  }
  
  // Method 2: Return formatted data for server-side processing
  return {
    success: true,
    method: 'data_only',
    phone: formattedPhone,
    message,
    timestamp: new Date().toISOString(),
    note: 'Use server-side WhatsApp API (Twilio/UltraMsg) for automated sending'
  };
}

/**
 * Log notification attempt
 */
export function logNotification(type, data, result) {
  const logEntry = {
    id: Date.now(),
    type,
    data,
    result,
    timestamp: new Date().toISOString()
  };
  
  try {
    const logs = JSON.parse(localStorage.getItem('whatsappLogs') || '[]');
    logs.unshift(logEntry);
    // Keep only last 50 logs
    if (logs.length > 50) logs.length = 50;
    localStorage.setItem('whatsappLogs', JSON.stringify(logs));
  } catch (err) {
    console.warn('Could not save WhatsApp log:', err);
  }
  
  return logEntry;
}

/**
 * Full integration: Send order notification to WhatsApp
 */
export async function notifyNewOrder(orderData) {
  const message = generateOrderMessage(orderData);
  const result = await sendWhatsAppAuto(message);
  
  logNotification('new_order', orderData, result);
  
  return {
    ...result,
    message,
    orderCode: orderData.orderCode
  };
}

/**
 * Full integration: Send gift notification to WhatsApp
 */
export async function notifyNewGift(giftData) {
  const message = generateGiftMessage(giftData);
  const result = await sendWhatsAppAuto(message);
  
  logNotification('new_gift', giftData, result);
  
  return {
    ...result,
    message,
    giftCode: giftData.giftCode
  };
}

/**
 * Bulk status update notification
 */
export async function notifyOrderStatusUpdate(orderData, oldStatus, newStatus) {
  const message = `📋 *ORDER STATUS UPDATED* \n\n` +
    `📄 Order: ${orderData.orderCode}\n` +
    `👤 Customer: ${orderData.recipientName}\n` +
    `📦 Package: ${orderData.package}\n` +
    `🔄 Status: ${oldStatus} → ${newStatus}\n` +
    `⏰ Updated: ${new Date().toLocaleString('en-GB')}`;
  
  const result = await sendWhatsAppAuto(message);
  
  logNotification('status_update', { orderData, oldStatus, newStatus }, result);
  
  return result;
}

/**
 * Get notification logs
 */
export function getNotificationLogs(type = null) {
  try {
    const logs = JSON.parse(localStorage.getItem('whatsappLogs') || '[]');
    if (type) {
      return logs.filter(log => log.type === type);
    }
    return logs;
  } catch (err) {
    return [];
  }
}

export default {
  generateOrderMessage,
  generateGiftMessage,
  sendWhatsAppNotification,
  sendWhatsAppAuto,
  notifyNewOrder,
  notifyNewGift,
  notifyOrderStatusUpdate,
  getNotificationLogs,
  logNotification
};
