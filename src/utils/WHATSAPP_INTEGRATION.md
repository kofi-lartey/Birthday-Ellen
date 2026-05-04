# WhatsApp Automation Integration

## Overview
This document describes the WhatsApp automation feature that automatically sends notifications to admin (0531114795) when customers place orders or send gifts through the Birthday Surprise App.

## Implementation Details

### Files Modified/Created

1. **src/utils/whatsappService.js** (NEW)
   - Core WhatsApp service module
   - Handles message generation, phone number formatting, and notification delivery
   - Supports both web deep-links and server-side API integration

2. **src/pages/Order.jsx** (MODIFIED)
   - Added WhatsApp notification trigger in `processOrder()` function
   - Sends notification for both free and paid orders
   - Includes order details: code, recipient, package, status

3. **src/pages/Gift.jsx** (MODIFIED)
   - Added WhatsApp notification trigger in `handleSubmit()` function
   - Sends notification for gift submissions
   - Includes gift type, amount, and selected product

## Features

### 1. Automatic Order Notifications
When a customer completes an order:
- Free orders: Immediate WhatsApp notification with order code
- Paid orders: WhatsApp notification with "pending" status
- Message includes: Order code, recipient name, birthday date, package type, status

### 2. Gift Order Notifications
When a customer sends a gift:
- Scratch cards: Amount and recipient details
- Gift codes: Code and redemption details
- Products: Product name and delivery info

### 3. Smart Phone Number Formatting
- Automatically formats Ghanaian numbers (+233)
- Handles various input formats (053..., 233..., +233...)

### 4. Dual-Mode Operation
- **Web Mode**: Opens WhatsApp Web in new tab for manual send
- **API Mode**: Returns structured data for server-side automation

## Message Formats

### Order Notification
```
🎁 NEW ORDER RECEIVED 🎁

📄 Order Code: ABC123
📦 Package: Premium Package
🎉 Birthday Person: Ama Serwaa
📅 Birthday Date: 27 February 2026
💝 From: Kwame Mensah
📱 Customer Phone: 0531114795
⭐ Status: PENDING

───────────────────
Timestamp: 02/05/2026, 16:30:00
⚡ System: Birthday Surprise App
```

### Gift Notification
```
🎁 NEW GIFT SENT 🎁

🎫 Gift Code: GFT987XYZ
📄 Order Code: ABC123
🎉 Recipient: Ama Serwaa
🎀 Gift Type: scratch
💝 From: Kwame Mensah
💰 Amount: $20

───────────────────
Timestamp: 02/05/2026, 16:30:00
⚡ System: Birthday Surprise App
```

## API Reference

### Core Functions

#### `generateOrderMessage(orderData)`
Generates formatted WhatsApp message for orders.

**Parameters:**
- `orderData` (object): Order details
  - `orderCode` (string)
  - `recipientName` (string)
  - `birthdayDate` (string)
  - `giverName` (string)
  - `giverPhone` (string)
  - `package` (string)
  - `status` (string)

**Returns:** Formatted message string

#### `generateGiftMessage(giftData)`
Generates formatted WhatsApp message for gifts.

**Parameters:**
- `giftData` (object): Gift details
  - `giftCode` (string)
  - `orderCode` (string)
  - `recipientName` (string)
  - `type` (string)
  - `senderName` (string)
  - `senderEmail` (string)
  - `message` (string)
  - `giftAmount` (string)
  - `selectedProduct` (string)

**Returns:** Formatted message string

#### `sendWhatsAppAuto(message, targetPhone)`
Sends WhatsApp notification using available method.

**Parameters:**
- `message` (string): Message content
- `targetPhone` (string): Recipient phone (default: 0531114795)

**Returns:** Promise with result object

#### `notifyNewOrder(orderData)`
Full integration: generates and sends order notification.

**Returns:** Promise with result including message and link

#### `notifyNewGift(giftData)`
Full integration: generates and sends gift notification.

**Returns:** Promise with result including message and link

## Usage Examples

### In Order Component
```javascript
import { notifyNewOrder } from '../utils/whatsappService';

// After order is created
const orderData = {
  orderCode: code,
  recipientName: recipientName.trim(),
  birthdayDate,
  giverName: giverName.trim(),
  giverPhone: giverPhone.trim(),
  package: selectedPackage,
  status: 'active'
};

const result = await notifyNewOrder(orderData);
if (result.link && result.canOpen) {
  result.openInNewTab();
}
```

### In Gift Component
```javascript
import { notifyNewGift } from '../utils/whatsappService';

// After gift is created
const giftData = {
  giftCode: newGiftCode,
  orderCode: code,
  recipientName: order.recipientName,
  type: giftType,
  senderName: senderName.trim(),
  message
};

const result = await notifyNewGift(giftData);
```

## Production Deployment

### Option 1: WhatsApp Business API (Recommended)
1. Set up Meta WhatsApp Business account
2. Configure webhook endpoint
3. Update service to use Graph API
4. Enable auto-send without manual confirmation

### Option 2: Third-Party Service
- **Twilio**: Easy integration with Node.js SDK
- **UltraMsg**: WhatsApp API with simple REST interface
- **Maytapi**: Multi-device WhatsApp solution

### Option 3: Self-Hosted
- Use whatsapp-web.js library
- Run dedicated WhatsApp session
- Requires phone to be online

## Testing

Run the test suite:
```javascript
import { testWhatsAppIntegration } from './whatsappService.test.js';
testWhatsAppIntegration();
```

Or run in browser console:
```javascript
// Load and test
import('../utils/whatsappService.js').then(module => {
  module.testWhatsAppIntegration();
});
```

## Configuration

### Environment Variables
Add to `.env` file for production:
```
VITE_WHATSAPP_TARGET=0531114795
VITE_WHATSAPP_API_URL=https://graph.facebook.com/v18.0
VITE_WHATSAPP_ACCESS_TOKEN=your_access_token
```

### Customization
Edit `WHATSAPP_TARGET` in `whatsappService.js` to change notification number.

## Notes

- Current implementation uses web deep-links for immediate deployment
- Auto-opens WhatsApp Web in new tab for manual send confirmation
- For fully automated sending, implement WhatsApp Business API
- Logs are saved to localStorage for debugging
- Supports all gift types: code, scratch, products
- Includes comprehensive error handling

## Troubleshooting

**WhatsApp doesn't open:**
- Ensure WhatsApp is installed (mobile or desktop)
- Check browser popup blocker settings
- Verify phone number format is correct

**Message not sent:**
- WhatsApp Web requires manual send button click
- For auto-send, implement server-side API
- Check network connectivity

**Logs not saving:**
- Check localStorage quota
- Clear old logs if exceeding 50 entries

## Future Enhancements

- [ ] Server-side automation with WhatsApp Business API
- [ ] Template messages for faster delivery
- [ ] Media attachments (images, documents)
- [ ] Bulk notifications for multiple orders
- [ ] Delivery status tracking
- [ ] Retry mechanism for failed sends
- [ ] Analytics dashboard
