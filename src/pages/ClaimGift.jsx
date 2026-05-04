import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'

function ClaimGift() {
    const { giftCode } = useParams()
    const navigate = useNavigate()
    const [gift, setGift] = useState(null)
    const [loading, setLoading] = useState(true)
    const [claimed, setClaimed] = useState(false)

    useEffect(() => {
        loadGift()
    }, [giftCode])

    function loadGift() {
        const allGifts = JSON.parse(localStorage.getItem('gifts') || '[]')
        const foundGift = allGifts.find(g => g.giftCode === giftCode)
        
        if (foundGift) {
            setGift(foundGift)
        }
        setLoading(false)
    }

    async function claimGift() {
        const allGifts = JSON.parse(localStorage.getItem('gifts') || '[]')
        const updatedGifts = allGifts.map(g => {
            if (g.giftCode === giftCode) {
                return { ...g, status: 'claimed', claimed: true, claimedAt: new Date().toISOString() }
            }
            return g
        })
        
        localStorage.setItem('gifts', JSON.stringify(updatedGifts))
        setClaimed(true)
        
        // Show success message
        setTimeout(() => {
            navigate('/dashboard')
        }, 3000)
    }

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-center">Loading...</div>
            </div>
        )
    }

    if (!gift) {
        return (
            <div className="min-h-screen flex items-center justify-center p-4" style={{ background: 'linear-gradient(135deg, #fce7f3 0%, #fbcfe8 100%)' }}>
                <div className="bg-white rounded-3xl p-8 max-w-md text-center">
                    <div className="text-6xl mb-4">🔒</div>
                    <h2 className="text-2xl font-bold text-gray-700 mb-2">Invalid Gift Code</h2>
                    <p className="text-gray-500 mb-4">This gift code doesn't exist or has expired.</p>
                    <button onClick={() => navigate('/')} className="bg-rose-500 text-white px-6 py-2 rounded-xl">
                        Go Home
                    </button>
                </div>
            </div>
        )
    }

    if (claimed || gift.claimed) {
        return (
            <div className="min-h-screen flex items-center justify-center p-4" style={{ background: 'linear-gradient(135deg, #fce7f3 0%, #fbcfe8 100%)' }}>
                <div className="bg-white rounded-3xl p-8 max-w-md text-center">
                    <div className="text-6xl mb-4">🎁</div>
                    <h2 className="text-2xl font-bold text-gray-700 mb-2">Gift Already Claimed!</h2>
                    <p className="text-gray-500 mb-4">This gift has already been redeemed.</p>
                    <button onClick={() => navigate('/')} className="bg-rose-500 text-white px-6 py-2 rounded-xl">
                        Go Home
                    </button>
                </div>
            </div>
        )
    }

    // Render gift details based on type
    const renderGiftContent = () => {
        switch(gift.type) {
            case 'code':
                return (
                    <div className="text-center">
                        <div className="bg-purple-100 p-6 rounded-2xl mb-6">
                            <p className="text-purple-600 mb-2">Your Gift Code</p>
                            <p className="text-3xl font-mono font-bold text-purple-700">{gift.giftCode}</p>
                        </div>
                        <p className="text-gray-600 mb-6">{gift.message}</p>
                        <button
                            onClick={claimGift}
                            className="w-full bg-purple-500 text-white py-3 rounded-xl font-semibold"
                        >
                            Claim Your Gift
                        </button>
                    </div>
                )
            
            case 'scratch':
                return (
                    <div className="text-center">
                        <div className="bg-yellow-100 p-6 rounded-2xl mb-6">
                            <p className="text-yellow-600 mb-2">You received a Scratch Card!</p>
                            <p className="text-4xl font-bold text-yellow-700">${gift.giftAmount}</p>
                        </div>
                        <p className="text-gray-600 mb-6">{gift.message}</p>
                        <button
                            onClick={claimGift}
                            className="w-full bg-yellow-500 text-white py-3 rounded-xl font-semibold"
                        >
                            Reveal & Claim
                        </button>
                    </div>
                )
            
            case 'products':
                const product = typeof gift.selectedProduct === 'string' 
                    ? JSON.parse(gift.selectedProduct) 
                    : gift.selectedProduct
                return (
                    <div className="text-center">
                        <div className="bg-green-100 p-6 rounded-2xl mb-6">
                            <p className="text-green-600 mb-2">You received a gift!</p>
                            <p className="text-xl font-bold text-green-700">{product?.name}</p>
                            <p className="text-green-600">{product?.price}</p>
                        </div>
                        <p className="text-gray-600 mb-6">{gift.message}</p>
                        <button
                            onClick={claimGift}
                            className="w-full bg-green-500 text-white py-3 rounded-xl font-semibold"
                        >
                            Claim Your Gift
                        </button>
                    </div>
                )
            
            default:
                return null
        }
    }

    return (
        <div className="min-h-screen flex items-center justify-center p-4" style={{ background: 'linear-gradient(135deg, #fce7f3 0%, #fbcfe8 100%)' }}>
            <div className="bg-white rounded-3xl p-8 max-w-md w-full">
                <div className="text-center mb-6">
                    <div className="text-6xl mb-3">🎁</div>
                    <h2 className="text-2xl font-bold text-gray-800">You've Got a Gift!</h2>
                    <p className="text-gray-500">From: {gift.senderName}</p>
                </div>
                
                {renderGiftContent()}
            </div>
        </div>
    )
}

export default ClaimGift