import { useState, useEffect, useRef } from 'react';
import { useParams, Link, useLocation } from 'react-router-dom';
import { supabase, STORAGE_KEYS } from '../supabase';
import { getEventSchema, getEventDisplay, getTableForOrderType, detectOrderTypeFromPath } from '../config/orderTypeMapping';

const Birthday = () => {
  const { code } = useParams();
  const location = useLocation();
  const [order, setOrder] = useState(null);
  const [eventData, setEventData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [revealed, setRevealed] = useState(false);
  const [isBirthday, setIsBirthday] = useState(false);
  const [countdown, setCountdown] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });
  const [currentSlide, setCurrentSlide] = useState(0);
  const [typedText, setTypedText] = useState('');
  const [receivedGifts, setReceivedGifts] = useState([]);
  const [eventType, setEventType] = useState('birthday');
  const slideIntervalRef = useRef(null);
  const audioRef = useRef(null);

  // Detect order type from URL
  useEffect(() => {
    const detectedType = detectOrderTypeFromPath(location.pathname);
    setEventType(detectedType);
  }, [location]);

  // Get display config based on event type
  const displayConfig = getEventDisplay(eventType);

  // Default background image (neutral gradient)
  const DEFAULT_BACKGROUND = 'https://images.unsplash.com/photo-1518640467707-6811f4a6ab73?w=1280&q=80';
  // Default audio
  const DEFAULT_AUDIO = 'https://res.cloudinary.com/djjgkezui/video/upload/v1770905491/Chris_Brown_-_With_You_Official_HD_Video_iqxx8x.mp3';

  useEffect(() => {
    loadOrder();
  }, [code]);

  useEffect(() => {
    if (order) {
      calculateCountdown();
      const interval = setInterval(calculateCountdown, 1000);
      return () => clearInterval(interval);
    }
  }, [order]);

  useEffect(() => {
    if (order && isBirthday && revealed) {
      startSlideshow();
    }
    return () => {
      if (slideIntervalRef.current) {
        clearInterval(slideIntervalRef.current);
      }
    };
  }, [isBirthday, revealed, order]);

  // Load received gifts when order is loaded and revealed
  useEffect(() => {
    if (order && code) {
      const storageKey = `${STORAGE_KEYS.GIFTS}_${code.toUpperCase()}`;
      const gifts = JSON.parse(localStorage.getItem(storageKey) || '[]');
      setReceivedGifts(gifts);
    }
  }, [order, code]);

  // Listen for storage changes to update gifts in real-time
  useEffect(() => {
    if (!code) return;
    
    const handleStorageChange = (e) => {
      if (e.key === `${STORAGE_KEYS.GIFTS}_${code.toUpperCase()}` || e.key === STORAGE_KEYS.GIFTS) {
        const storageKey = `${STORAGE_KEYS.GIFTS}_${code.toUpperCase()}`;
        const gifts = JSON.parse(localStorage.getItem(storageKey) || '[]');
        setReceivedGifts(gifts);
      }
    };

    // Listen for localStorage changes
    window.addEventListener('storage', handleStorageChange);
    
    // Also listen for custom events from Gift page for same-tab updates
    const handleGiftUpdate = () => {
      const storageKey = `${STORAGE_KEYS.GIFTS}_${code.toUpperCase()}`;
      const gifts = JSON.parse(localStorage.getItem(storageKey) || '[]');
      setReceivedGifts(gifts);
    };
    window.addEventListener('giftAdded', handleGiftUpdate);
    
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('giftAdded', handleGiftUpdate);
    };
  }, [code, order]);

  const loadOrder = async () => {
    try {
      setLoading(true);
      
      // Try loading from specific event table first
      if (eventType && eventType !== 'birthday') {
        try {
          const table = getTableForOrderType(eventType);
          const { data: eventResult, error: eventError } = await supabase
            .from(table)
            .select('*')
            .eq('code', code)
            .limit(1)
            .single();
          
          if (eventResult && !eventError) {
            setEventData(eventResult);
            setOrder({
              ...eventResult,
              page_type: eventType
            });
            setLoading(false);
            return;
          }
        } catch (err) {
          console.log(`Could not load from ${table} table`);
        }
      }
      
      // Fall back to orders table (for birthday events)
      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .eq('code', code)
        .limit(1)
        .single();
      
      if (error) {
        console.error('Error loading order from Supabase:', error);
        // Try localStorage fallback
        const localOrders = JSON.parse(localStorage.getItem(STORAGE_KEYS.ORDERS) || '[]');
        const localOrder = localOrders.find(o => o.code?.toLowerCase() === code?.toLowerCase());
        
        if (localOrder) {
          const normalizedOrder = {
            ...localOrder,
            recipient_name: localOrder.recipient_name || localOrder.recipientName,
            birthday_date: localOrder.birthday_date || localOrder.birthdayDate,
            giver_name: localOrder.giver_name || localOrder.giverName,
            giver_phone: localOrder.giver_phone || localOrder.giverPhone,
            page_type: localOrder.page_type || localOrder.pageType,
            created_at: localOrder.created_at || localOrder.createdAt
          };
          setOrder(normalizedOrder);
          setLoading(false);
          return;
        }
        throw error;
      }
      
      setOrder(data);
    } catch (err) {
      console.error('Error loading order:', err);
      setError('Order not found');
    } finally {
      setLoading(false);
    }
  };

  const getEventDetails = () => {
    if (!order) return null;
    
    // For non-birthday events, use event data
    if (eventType !== 'birthday' && eventData) {
      return {
        backgroundImage: DEFAULT_BACKGROUND,
        audioUrl: DEFAULT_AUDIO,
        photos: [],
        title: eventData.event_name || eventData.couple_names || displayConfig.title,
        description: eventData.description || displayConfig.defaultMessage,
        emoji: displayConfig.emoji
      };
    }
    
    // For birthday events, use existing logic
    return {
      backgroundImage: order.background_image || DEFAULT_BACKGROUND,
      audioUrl: order.audio_url || DEFAULT_AUDIO,
      photos: order.photos ? (typeof order.photos === 'string' ? JSON.parse(order.photos) : order.photos) : [],
      nickname: order.nickname || 'My Love',
      letter: order.letter || '',
      dateOfBirth: order.birthday_date || order.date_of_birth || order.dateOfBirth || '',
      heartMessage: order.heart_message || 'My Heart Belongs To You'
    };
  };

  const calculateCountdown = () => {
    if (!order) return;
    
    const details = getEventDetails();
    const dateStr = details?.dateOfBirth;
    
    if (!dateStr) {
      setCountdown({ days: 0, hours: 0, minutes: 0, seconds: 0 });
      return;
    }
    
    const now = new Date();
    
    let targetDate;
    try {
      const [year, month, day] = dateStr.split('-').map(Number);
      targetDate = new Date(now.getFullYear(), month - 1, day);
    } catch (e) {
      setCountdown({ days: 0, hours: 0, minutes: 0, seconds: 0 });
      return;
    }
    
    const isTargetDay = now.getMonth() === targetDate.getMonth() && now.getDate() === targetDate.getDate();
    
    if (isTargetDay) {
      setCountdown({ days: 0, hours: 0, minutes: 0, seconds: 0 });
      setIsBirthday(true);
      return;
    }
    
    if (now > targetDate) {
      setCountdown({ days: 0, hours: 0, minutes: 0, seconds: 0 });
      setIsBirthday(true);
      return;
    }
    
    const diff = targetDate - now;
    
    if (diff <= 0) {
      setCountdown({ days: 0, hours: 0, minutes: 0, seconds: 0 });
      setIsBirthday(true);
      return;
    }
    
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diff % (1000 * 60)) / 1000);
    
    setCountdown({ days, hours, minutes, seconds });
    setIsBirthday(false);
  };

  const startSlideshow = () => {
    const details = getEventDetails();
    const photos = details?.photos || [];
    
    if (photos.length <= 1) return;
    
    if (slideIntervalRef.current) {
      clearInterval(slideIntervalRef.current);
    }
    
    slideIntervalRef.current = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % photos.length);
    }, 3500);
  };

  const handleTapToReveal = () => {
    if (isBirthday) {
      setRevealed(true);
      if (audioRef.current) {
        audioRef.current.play().catch(console.error);
      }
    } else {
      alert('Calm down! Your special surprise will be revealed at the right time!');
    }
  };

  const formatNumber = (num) => String(num).padStart(2, '0');

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-rose-50 via-pink-50 to-purple-50 px-4">
        <div className="text-rose-500 text-xl md:text-2xl animate-pulse text-center">Loading your surprise...</div>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-rose-50 via-pink-50 to-purple-50 px-4">
        <div className="text-rose-500 text-xl md:text-2xl text-center">Event not found</div>
      </div>
    );
  }

  const details = getEventDetails();
  const photos = details?.photos || [];
  const backgroundImage = details?.backgroundImage;
  const audioUrl = details?.audioUrl;
  const nickname = details?.nickname;
  const letter = details?.letter;
  const heartMessage = details?.heartMessage;
  const eventTitle = details?.title || displayConfig.title;
  const eventEmoji = details?.emoji || displayConfig.emoji;
  const eventDefaultMessage = displayConfig.defaultMessage;

  // Default gallery images as fallback
  const defaultGalleryImages = [
    'https://images.unsplash.com/photo-1530103862676-de3c9a59af38?w=800&q=80',
    'https://images.unsplash.com/photo-1464349095431-e9a21285b5f3?w=800&q=80',
    'https://images.unsplash.com/photo-1519834785169-98be25ec3f84?w=800&q=80',
    'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=800&q=80',
    'https://images.unsplash.com/photo-1485291571150-772bcfc10da5?w=800&q=80',
    'https://images.unsplash.com/photo-1523438885200-e635ba2c371e?w=800&q=80'
  ];

  const galleryImages = photos.length > 0 ? photos.map(p => p.url || p) : defaultGalleryImages;

  return (
    <div className="min-h-screen text-gray-800" style={{backgroundImage: `url(${backgroundImage})`, backgroundSize: 'cover', backgroundPosition: 'center', backgroundAttachment: 'fixed'}}>
      {/* Floating Hearts Background */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden" style={{background: 'rgba(0,0,0,0.4)'}}>
        {[...Array(15)].map((_, i) => (
          <div
            key={i}
            className="absolute hidden md:block"
            style={{
              left: `${Math.random() * 100}%`,
              animation: `floatUp ${6 + Math.random() * 4}s ease-in-out infinite`,
              animationDelay: `${Math.random() * 5}s`,
              fontSize: `${15 + Math.random() * 20}px`,
              opacity: 0
            }}
          >
            {['💖', '💕', '❤️', '💗', '💝', '💘', '💟'][Math.floor(Math.random() * 7)]}
          </div>
        ))}
      </div>

      <style>{`
        @keyframes floatUp {
          0% { transform: translateY(100vh) scale(0); opacity: 0; }
          10% { opacity: 0.8; }
          90% { opacity: 0.6; }
          100% { transform: translateY(-100px) scale(1); opacity: 0; }
        }
        @media (max-width: 768px) {
          .mobile-padding {
            padding-left: 1rem;
            padding-right: 1rem;
          }
        }
      `}</style>

      {/* Hero Section - Mobile Optimized */}
      <section className="min-h-[80vh] md:min-h-screen flex items-center justify-center text-center px-4 md:px-6 relative z-10">
        <div className="max-w-full">
          <h1 className="text-3xl md:text-6xl font-bold romantic-font text-rose-400 mb-3 md:mb-4 break-words">
            To {nickname || 'You'} {eventEmoji}
          </h1>
          <p className="text-white text-sm md:text-base animate-pulse">Keep watching, beautiful ✨</p>
        </div>
      </section>

      {/* Love Declaration - Mobile Optimized */}
      <section className="py-8 md:py-16 text-center px-4 md:px-6 relative z-10" style={{background: 'rgba(255,255,255,0.85)'}}>
        <div className="max-w-3xl mx-auto">
          <div className="text-4xl md:text-6xl mb-4 md:mb-6">{eventEmoji}</div>
          <h2 className="text-2xl md:text-4xl font-bold romantic-font gradient-text mb-4 md:mb-6 break-words">{heartMessage}</h2>
          <p className="text-base md:text-lg text-gray-600 leading-relaxed text-left md:text-center">
            {letter || eventDefaultMessage}
          </p>
        </div>
      </section>

      {/* Countdown - Mobile Optimized */}
      <section className="py-8 md:py-16 text-center px-4 md:px-6 relative z-10" style={{background: 'rgba(255,255,255,0.85)'}}>
        <h2 className="text-xl md:text-3xl font-bold romantic-font text-rose-500 mb-6 md:mb-8">
          Countdown To Your Special Day ⏰
        </h2>
        <div className="flex justify-center gap-2 md:gap-6 flex-wrap">
          <div className="bg-white w-16 h-16 md:w-24 md:h-24 rounded-xl md:rounded-2xl flex flex-col items-center justify-center shadow-lg border-2 border-rose-200">
            <span className="text-xl md:text-3xl font-bold text-rose-500">{formatNumber(countdown.days)}</span>
            <span className="text-[10px] md:text-xs text-gray-500">Days</span>
          </div>
          <div className="bg-white w-16 h-16 md:w-24 md:h-24 rounded-xl md:rounded-2xl flex flex-col items-center justify-center shadow-lg border-2 border-rose-200">
            <span className="text-xl md:text-3xl font-bold text-pink-500">{formatNumber(countdown.hours)}</span>
            <span className="text-[10px] md:text-xs text-gray-500">Hours</span>
          </div>
          <div className="bg-white w-16 h-16 md:w-24 md:h-24 rounded-xl md:rounded-2xl flex flex-col items-center justify-center shadow-lg border-2 border-rose-200">
            <span className="text-xl md:text-3xl font-bold text-purple-500">{formatNumber(countdown.minutes)}</span>
            <span className="text-[10px] md:text-xs text-gray-500">Minutes</span>
          </div>
          <div className="bg-white w-16 h-16 md:w-24 md:h-24 rounded-xl md:rounded-2xl flex flex-col items-center justify-center shadow-lg border-2 border-rose-200">
            <span className="text-xl md:text-3xl font-bold text-rose-400">{formatNumber(countdown.seconds)}</span>
            <span className="text-[10px] md:text-xs text-gray-500">Seconds</span>
          </div>
        </div>
      </section>

      {/* Tap to Reveal Button - Mobile Optimized */}
      {!revealed && (
        <section className="py-12 md:py-20 text-center relative z-10 px-4">
          <button
            onClick={handleTapToReveal}
            className="bg-gradient-to-r from-rose-500 to-pink-500 text-white px-6 md:px-10 py-3 md:py-4 rounded-full shadow-lg text-base md:text-lg font-semibold hover:scale-105 transition-transform animate-bounce w-auto max-w-[90%] mx-auto"
          >
            🎁 Tap To Open Your Surprise
          </button>
        </section>
      )}

      {/* Revealed Content */}
      {revealed && (
        <div className="relative z-10">
          {/* Celebration Message - Mobile Optimized */}
          <section className="py-8 md:py-16 text-center px-4" style={{background: 'rgba(255,255,255,0.9)'}}>
            <div className="text-4xl md:text-6xl mb-3 md:mb-4">🎉</div>
            <h2 className="text-2xl md:text-4xl font-bold romantic-font gradient-text break-words">
              {eventTitle}, {nickname}! {eventEmoji}
            </h2>
          </section>

          {/* Photo Gallery - Mobile Optimized */}
          <section className="py-8 md:py-10 px-4 md:px-6" style={{background: 'rgba(255,255,255,0.85)'}}>
            <h2 className="text-center text-xl md:text-3xl font-bold romantic-font text-rose-500 mb-6 md:mb-8">
              Our Beautiful Memories 📸
            </h2>
            <div className="flex overflow-x-auto space-x-4 md:space-x-6 px-2 md:px-4 pb-4" style={{scrollbarWidth: 'thin'}}>
              {galleryImages.map((img, index) => (
                <img
                  key={index}
                  src={img}
                  alt={`Memory ${index + 1}`}
                  className="rounded-xl md:rounded-2xl shadow-lg min-w-[200px] md:min-w-[280px] h-[280px] md:h-[400px] object-cover hover:scale-105 transition-transform"
                />
              ))}
            </div>
            <p className="text-center text-gray-500 text-sm md:text-base mt-3 md:mt-4">Swipe to see more 💫</p>
          </section>

           {/* Slideshow Link - Mobile Optimized */}
           <section className="py-8 md:py-10 text-center px-4" style={{background: 'rgba(255,255,255,0.85)'}}>
            <div className="flex flex-col gap-3 md:gap-4 justify-center">
              <Link
                to={`/slideshow/${code}`}
                className="bg-gradient-to-r from-rose-500 to-pink-500 text-white font-bold py-2.5 md:py-3 px-4 md:px-6 rounded-full shadow-lg hover:scale-105 transition-transform inline-block text-sm md:text-base"
              >
                View Slideshow 🎬
              </Link>
            </div>
          </section>

          {/* Received Gifts Section - Mobile Optimized */}
          {revealed && (
            <section className="py-8 md:py-10 text-center px-4 md:px-6" style={{background: 'rgba(255,255,255,0.85)'}}>
              <div className="max-w-4xl mx-auto">
                <h3 className="text-xl md:text-2xl font-bold romantic-font gradient-text mb-4 md:mb-6">
                  💝 Gifts Received ({receivedGifts.length})
                </h3>
                {receivedGifts.length === 0 ? (
                  <p className="text-gray-500 text-sm md:text-base">
                    No gifts received yet. Share your page link to start receiving gifts!
                  </p>
                ) : (
                  <div className="grid grid-cols-1 gap-3 md:gap-4">
                    {receivedGifts.map((gift, index) => (
                      <div key={index} className="bg-white rounded-xl md:rounded-2xl p-4 md:p-5 shadow-lg border-2 border-rose-100 text-left">
                        <div className="flex items-start gap-2 md:gap-3">
                          <div className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-gradient-to-br from-rose-400 to-pink-400 flex items-center justify-center text-white font-bold text-sm md:text-lg flex-shrink-0">
                            {gift.name?.charAt(0).toUpperCase() || 'A'}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="font-bold text-gray-700 text-sm md:text-base mb-1 break-words">
                              {gift.name || 'Anonymous'}
                            </div>
                            <p className="text-gray-600 text-xs md:text-sm mb-2 leading-relaxed break-words">
                              {gift.message || 'No message'} 
                            </p>
                            <div className="text-[10px] md:text-xs text-gray-400">
                              {gift.date ? new Date(gift.date).toLocaleString() : 'Just now'}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </section>
          )}

        </div>
      )}

      {/* Music Player - Mobile Optimized */}
      {audioUrl && (
        <div className="fixed bottom-4 right-4 md:bottom-6 md:left-6 z-40">
          <audio ref={audioRef} src={audioUrl} loop preload="auto" />
          <button 
            onClick={() => {
              if (audioRef.current) {
                if (audioRef.current.paused) {
                  audioRef.current.play().catch(console.error);
                } else {
                  audioRef.current.pause();
                }
              }
            }}
            className="bg-white p-2 md:p-3 rounded-full shadow-lg hover:scale-110 transition-transform text-sm md:text-base"
          >
            🎵
          </button>
        </div>
      )}
    </div>
  );
};

export default Birthday;