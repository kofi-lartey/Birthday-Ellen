import { useState, useEffect } from 'react'
import { useParams, useNavigate, useLocation } from 'react-router-dom'
import { supabase, STORAGE_KEYS } from '../supabase'
import { notifyNewGift } from '../utils/whatsappService'

function GiftPage() {
    const { code } = useParams()
    const navigate = useNavigate()
    const location = useLocation()
    const [giftType, setGiftType] = useState(null)
    const [order, setOrder] = useState(null)
    const [loading, setLoading] = useState(true)
    const [submitting, setSubmitting] = useState(false)
    
    // Form states
    const [senderName, setSenderName] = useState('')
    const [senderEmail, setSenderEmail] = useState('')
    const [message, setMessage] = useState('')
    const [giftAmount, setGiftAmount] = useState('')
    const [selectedProduct, setSelectedProduct] = useState('')
    const [giftCode, setGiftCode] = useState(null)
    const [showSuccess, setShowSuccess] = useState(false)

    useEffect(() => {
        const params = new URLSearchParams(location.search)
        const type = params.get('type')
        setGiftType(type)
        loadOrder()
    }, [code, location])

    async function loadOrder() {
        try {
            // Load from localStorage
            const allOrders = JSON.parse(localStorage.getItem(STORAGE_KEYS.ORDERS) || '[]')
            const foundOrder = allOrders.find(o => o.code === code)
            
            if (foundOrder) {
                setOrder(foundOrder)
            } else {
                // Try from Supabase
                const { data, error } = await supabase
                    .from('orders')
                    .select('*')
                    .eq('code', code)
                    .single()
                
                if (data && !error) {
                    setOrder({
                        code: data.code,
                        recipientName: data.recipient_name,
                        birthdayDate: data.birthday_date
                    })
                }
            }
        } catch (err) {
            console.error('Error loading order:', err)
        } finally {
            setLoading(false)
        }
    }

     // Generate random gift code
     function generateGiftCode() {
         const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
         let code = ''
         for (let i = 0; i < 8; i++) {
             code += chars.charAt(Math.floor(Math.random() * chars.length))
         }
         return code
     }

     // Save gift to localStorage and Supabase
     async function saveGift(giftData) {
         // Save gift to localStorage
         const allGifts = JSON.parse(localStorage.getItem(STORAGE_KEYS.GIFTS) || '[]')
         const newGift = {
           id: Date.now(),
           giftCode: giftData.giftCode,
           orderCode: code,
           recipientName: order.recipientName,
           type: giftType,
           name: senderName.trim(),  // For display in gift list
           senderName: senderName.trim(),
           senderEmail: senderEmail,
           message: message || 'No message',  // For display in gift list
           giftAmount: giftAmount,
           selectedProduct: selectedProduct,
           date: new Date().toISOString(),  // For display in gift list
           createdAt: new Date().toISOString(),
           status: 'pending',
           claimed: false
         }
        
         allGifts.push(newGift)
         localStorage.setItem(STORAGE_KEYS.GIFTS, JSON.stringify(allGifts))
        
         // Also save to per-code storage so Birthday page can display
         const storageKey = `${STORAGE_KEYS.GIFTS}_${code.toUpperCase()}`
         const codeGifts = JSON.parse(localStorage.getItem(storageKey) || '[]')
         codeGifts.push(newGift)
         localStorage.setItem(storageKey, JSON.stringify(codeGifts))
        
         // Dispatch event to notify other tabs/pages of gift update
         window.dispatchEvent(new Event('giftAdded'))
         if (window.localStorage) {
           window.dispatchEvent(new StorageEvent('storage', {
             key: storageKey,
             newValue: JSON.stringify(codeGifts)
           }))
         }
        
         // Also save to Supabase if available
         try {
             await supabase.from('gifts').insert([{
                 gift_code: giftData.giftCode,
                 order_code: code,
                 recipient_name: order.recipientName,
                 type: giftType,
                 sender_name: senderName,
                 sender_email: senderEmail,
                 message: message,
                 gift_amount: giftAmount,
                 selected_product: selectedProduct,
                 status: 'pending',
                 created_at: new Date().toISOString()
             }])
         } catch (err) {
             console.log('Could not save to Supabase:', err)
         }
        
         return newGift
     }

     async function handleSubmit(e) {
        e.preventDefault()
        if (!senderName.trim()) {
            alert('Please enter your name')
            return
        }
        
        setSubmitting(true)
        
        const newGiftCode = generateGiftCode()
        const savedGift = await saveGift({ giftCode: newGiftCode })
        setGiftCode(newGiftCode)
        setShowSuccess(true)
        setSubmitting(false)
        
        // Send WhatsApp notification for gift order
        if (order) {
          const giftData = {
            giftCode: newGiftCode,
            orderCode: code,
            recipientName: order.recipientName,
            type: giftType,
            senderName: senderName.trim(),
            senderEmail: senderEmail.trim(),
            message: message,
            giftAmount: giftAmount || 'N/A',
            selectedProduct: selectedProduct?.name || 'N/A'
          }
          const whatsappResult = await notifyNewGift(giftData)
          if (whatsappResult.link && whatsappResult.canOpen) {
            setTimeout(() => {
              whatsappResult.openInNewTab()
            }, 800)
          }
        }
    }

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #fce7f3 0%, #fbcfe8 100%)' }}>
                <div className="text-center">
                    <div className="text-4xl mb-4">🎁</div>
                    <p className="text-gray-600">Loading...</p>
                </div>
            </div>
        )
    }

    if (!order) {
        return (
            <div className="min-h-screen flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #fce7f3 0%, #fbcfe8 100%)' }}>
                <div className="bg-white rounded-3xl p-8 max-w-md text-center">
                    <div className="text-6xl mb-4">😔</div>
                    <h2 className="text-2xl font-bold text-gray-700 mb-2">Order Not Found</h2>
                    <p className="text-gray-500 mb-4">This gift page doesn't exist or has been removed.</p>
                    <button onClick={() => navigate('/dashboard')} className="bg-rose-500 text-white px-6 py-2 rounded-xl">
                        Go to Dashboard
                    </button>
                </div>
            </div>
        )
    }

    // Success View
    if (showSuccess) {
        return (
            <div className="min-h-screen flex items-center justify-center p-4" style={{ background: 'linear-gradient(135deg, #fce7f3 0%, #fbcfe8 100%)' }}>
                <div className="bg-white rounded-3xl p-8 max-w-md w-full text-center">
                    <div className="text-7xl mb-4">🎉</div>
                    <h2 className="text-2xl font-bold text-gray-800 mb-2">Gift Sent Successfully!</h2>
                    <p className="text-gray-600 mb-4">
                        Your gift has been sent to {order.recipientName}!
                    </p>
                    
                    {giftType === 'code' && (
                        <div className="bg-purple-50 p-4 rounded-xl mb-4">
                            <p className="text-sm text-purple-600 mb-1">Gift Code:</p>
                            <p className="text-2xl font-mono font-bold text-purple-700">{giftCode}</p>
                            <p className="text-xs text-purple-500 mt-2">Share this code with {order.recipientName} to redeem!</p>
                        </div>
                    )}
                    
                    <div className="flex gap-3">
                        <button 
                            onClick={() => navigate('/dashboard')}
                            className="flex-1 bg-rose-500 text-white py-3 rounded-xl font-semibold"
                        >
                            Back to Dashboard
                        </button>
                        <button 
                            onClick={() => {
                                navigator.clipboard.writeText(giftCode || '')
                                alert('Gift code copied!')
                            }}
                            className="flex-1 bg-gray-100 text-gray-700 py-3 rounded-xl font-semibold"
                        >
                            Copy Code
                        </button>
                    </div>
                </div>
            </div>
        )
    }

    // Render different forms based on gift type
    const renderGiftForm = () => {
        switch(giftType) {
            case 'code':
                return (
                    <>
                        <div className="text-center mb-6">
                            <div className="text-6xl mb-3">🔑</div>
                            <h2 className="text-2xl font-bold text-gray-800">Send a Gift Code</h2>
                            <p className="text-gray-500 mt-1">Send a special code for exclusive rewards!</p>
                        </div>
                        
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="block text-gray-700 mb-2 font-semibold">Your Name *</label>
                                <input
                                    type="text"
                                    value={senderName}
                                    onChange={(e) => setSenderName(e.target.value)}
                                    className="w-full p-3 border-2 border-rose-200 rounded-xl focus:border-rose-400 outline-none"
                                    placeholder="Enter your name"
                                    required
                                />
                            </div>
                            
                            <div>
                                <label className="block text-gray-700 mb-2 font-semibold">Your Email</label>
                                <input
                                    type="email"
                                    value={senderEmail}
                                    onChange={(e) => setSenderEmail(e.target.value)}
                                    className="w-full p-3 border-2 border-rose-200 rounded-xl focus:border-rose-400 outline-none"
                                    placeholder="Enter your email (optional)"
                                />
                            </div>
                            
                            <div>
                                <label className="block text-gray-700 mb-2 font-semibold">Write a Sweet Message</label>
                                <textarea
                                    value={message}
                                    onChange={(e) => setMessage(e.target.value)}
                                    className="w-full p-3 border-2 border-rose-200 rounded-xl focus:border-rose-400 outline-none h-24"
                                    placeholder={`Dear ${order.recipientName}, ...`}
                                />
                            </div>
                            
                            <button
                                type="submit"
                                disabled={submitting}
                                className="w-full bg-gradient-to-r from-purple-500 to-pink-500 text-white py-3 rounded-xl font-semibold hover:shadow-lg transition disabled:opacity-50"
                            >
                                {submitting ? 'Sending...' : 'Send Gift Code →'}
                            </button>
                        </form>
                    </>
                )
            
            case 'scratch':
                return (
                    <>
                        <div className="text-center mb-6">
                            <div className="text-6xl mb-3">💳</div>
                            <h2 className="text-2xl font-bold text-gray-800">Send a Scratch Card</h2>
                            <p className="text-gray-500 mt-1">Send a surprise scratch card with cash prize!</p>
                        </div>
                        
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="block text-gray-700 mb-2 font-semibold">Your Name *</label>
                                <input
                                    type="text"
                                    value={senderName}
                                    onChange={(e) => setSenderName(e.target.value)}
                                    className="w-full p-3 border-2 border-rose-200 rounded-xl focus:border-rose-400 outline-none"
                                    placeholder="Enter your name"
                                    required
                                />
                            </div>
                            
                            <div>
                                <label className="block text-gray-700 mb-2 font-semibold">Gift Amount (USD) *</label>
                                <select
                                    value={giftAmount}
                                    onChange={(e) => setGiftAmount(e.target.value)}
                                    className="w-full p-3 border-2 border-rose-200 rounded-xl focus:border-rose-400 outline-none"
                                    required
                                >
                                    <option value="">Select amount</option>
                                    <option value="10">$10</option>
                                    <option value="20">$20</option>
                                    <option value="50">$50</option>
                                    <option value="100">$100</option>
                                    <option value="200">$200</option>
                                    <option value="500">$500</option>
                                </select>
                            </div>
                            
                            <div>
                                <label className="block text-gray-700 mb-2 font-semibold">Your Email</label>
                                <input
                                    type="email"
                                    value={senderEmail}
                                    onChange={(e) => setSenderEmail(e.target.value)}
                                    className="w-full p-3 border-2 border-rose-200 rounded-xl focus:border-rose-400 outline-none"
                                    placeholder="Enter your email (for receipt)"
                                />
                            </div>
                            
                            <div>
                                <label className="block text-gray-700 mb-2 font-semibold">Write a Sweet Message</label>
                                <textarea
                                    value={message}
                                    onChange={(e) => setMessage(e.target.value)}
                                    className="w-full p-3 border-2 border-rose-200 rounded-xl focus:border-rose-400 outline-none h-24"
                                    placeholder={`Happy ${order.recipientName}! Here's a surprise for you...`}
                                />
                            </div>
                            
                            <button
                                type="submit"
                                disabled={submitting}
                                className="w-full bg-gradient-to-r from-yellow-500 to-orange-500 text-white py-3 rounded-xl font-semibold hover:shadow-lg transition disabled:opacity-50"
                            >
                                {submitting ? 'Processing...' : 'Send Scratch Card →'}
                            </button>
                        </form>
                    </>
                )
            
            case 'products':
                const products = [
                    { id: 1, name: '🎂 Birthday Cake Package', price: '$25', description: 'Delicious custom cake with decorations' },
                    { id: 2, name: '🍫 Chocolate Gift Box', price: '$15', description: 'Premium assorted chocolates' },
                    { id: 3, name: '💐 Flower Bouquet', price: '$30', description: 'Fresh roses with custom message' },
                    { id: 4, name: '🧥 Premium Fabric', price: '$50', description: 'High-quality African fabric (6 yards)' },
                    { id: 5, name: '🕯️ Candle Set', price: '$20', description: 'Aromatherapy candle gift set' },
                    { id: 6, name: '📚 Custom Photo Album', price: '$35', description: 'Personalized photo album' }
                ]
                
                return (
                    <>
                        <div className="text-center mb-6">
                            <div className="text-6xl mb-3">📦</div>
                            <h2 className="text-2xl font-bold text-gray-800">Order Products</h2>
                            <p className="text-gray-500 mt-1">Deliver surprise gifts right to their door!</p>
                        </div>
                        
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="block text-gray-700 mb-2 font-semibold">Your Name *</label>
                                <input
                                    type="text"
                                    value={senderName}
                                    onChange={(e) => setSenderName(e.target.value)}
                                    className="w-full p-3 border-2 border-rose-200 rounded-xl focus:border-rose-400 outline-none"
                                    placeholder="Enter your name"
                                    required
                                />
                            </div>
                            
                            <div>
                                <label className="block text-gray-700 mb-2 font-semibold">Select a Product *</label>
                                <select
                                    value={selectedProduct}
                                    onChange={(e) => setSelectedProduct(JSON.parse(e.target.value))}
                                    className="w-full p-3 border-2 border-rose-200 rounded-xl focus:border-rose-400 outline-none"
                                    required
                                >
                                    <option value="">Choose a gift</option>
                                    {products.map(product => (
                                        <option key={product.id} value={JSON.stringify(product)}>
                                            {product.name} - {product.price}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            
                            <div>
                                <label className="block text-gray-700 mb-2 font-semibold">Your Email *</label>
                                <input
                                    type="email"
                                    value={senderEmail}
                                    onChange={(e) => setSenderEmail(e.target.value)}
                                    className="w-full p-3 border-2 border-rose-200 rounded-xl focus:border-rose-400 outline-none"
                                    placeholder="Enter your email (for order confirmation)"
                                    required
                                />
                            </div>
                            
                            <div>
                                <label className="block text-gray-700 mb-2 font-semibold">Delivery Address *</label>
                                <input
                                    type="text"
                                    className="w-full p-3 border-2 border-rose-200 rounded-xl focus:border-rose-400 outline-none"
                                    placeholder="Enter delivery address"
                                    required
                                />
                            </div>
                            
                            <div>
                                <label className="block text-gray-700 mb-2 font-semibold">Write a Sweet Message</label>
                                <textarea
                                    value={message}
                                    onChange={(e) => setMessage(e.target.value)}
                                    className="w-full p-3 border-2 border-rose-200 rounded-xl focus:border-rose-400 outline-none h-24"
                                    placeholder={`Dear ${order.recipientName}, enjoy your gift!`}
                                />
                            </div>
                            
                            <button
                                type="submit"
                                disabled={submitting}
                                className="w-full bg-gradient-to-r from-green-500 to-teal-500 text-white py-3 rounded-xl font-semibold hover:shadow-lg transition disabled:opacity-50"
                            >
                                {submitting ? 'Processing...' : 'Place Order →'}
                            </button>
                        </form>
                    </>
                )
            
            default:
                return <div>Invalid gift type</div>
        }
    }

    return (
        <div className="min-h-screen py-8 px-4" style={{ background: 'linear-gradient(135deg, #fce7f3 0%, #fbcfe8 100%)' }}>
            <div className="max-w-md mx-auto">
                {/* Header */}
                <div className="bg-white/80 backdrop-blur-md rounded-2xl p-4 mb-6 flex items-center justify-between">
                    <button onClick={() => navigate(-1)} className="text-rose-500 hover:text-rose-600">
                        ← Back
                    </button>
                    <div className="text-center flex-1">
                        <p className="text-sm text-gray-500">Sending gift to</p>
                        <p className="font-bold text-rose-600">{order.recipientName}</p>
                    </div>
                    <div className="w-8"></div>
                </div>
                
                {/* Gift Form Card */}
                <div className="bg-white rounded-3xl p-6 shadow-xl">
                    {renderGiftForm()}
                </div>
            </div>
        </div>
    )
}

export default GiftPage