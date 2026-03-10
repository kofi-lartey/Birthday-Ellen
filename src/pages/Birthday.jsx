import { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '../supabase';

const Birthday = () => {
  const { code } = useParams();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [revealed, setRevealed] = useState(false);
  const [isBirthday, setIsBirthday] = useState(false);
  const [countdown, setCountdown] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });
  const [currentSlide, setCurrentSlide] = useState(0);
  const [typedText, setTypedText] = useState('');
  const [showGift, setShowGift] = useState(false);
  const slideIntervalRef = useRef(null);
  const audioRef = useRef(null);

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

  const loadOrder = async () => {
    try {
      setLoading(true);
      
      // Load directly from Supabase - the source of truth
      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .eq('code', code)
        .limit(1)
        .single();
      
      if (error) {
        console.error('Error loading order from Supabase:', error);
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

  const getBirthdayDetails = () => {
    if (!order) return null;
    
    // Debug: log the order data to see what's coming
    console.log('Order data:', order);
    console.log('date_of_birth:', order.date_of_birth);
    console.log('birthday_date:', order.birthday_date);
    
    return {
      backgroundImage: order.background_image || DEFAULT_BACKGROUND,
      audioUrl: order.audio_url || DEFAULT_AUDIO,
      photos: order.photos ? (typeof order.photos === 'string' ? JSON.parse(order.photos) : order.photos) : [],
      nickname: order.nickname || 'My Love',
      letter: order.letter || '',
      // Use birthday_date first (from Order), then date_of_birth (from Dashboard)
      dateOfBirth: order.birthday_date || order.date_of_birth || order.dateOfBirth || '',
      heartMessage: order.heart_message || 'My Heart Belongs To You'
    };
  };

  const calculateCountdown = () => {
    if (!order) return;
    
    const details = getBirthdayDetails();
    const birthdayDateStr = details?.dateOfBirth;
    
    console.log('Birthday date string:', birthdayDateStr);
    
    if (!birthdayDateStr) {
      // No date - show zeros
      setCountdown({ days: 0, hours: 0, minutes: 0, seconds: 0 });
      return;
    }
    
    const now = new Date();
    
    // Parse the date - handle different formats
    let birthday;
    try {
      const [year, month, day] = birthdayDateStr.split('-').map(Number);
      birthday = new Date(now.getFullYear(), month - 1, day);
    } catch (e) {
      console.error('Error parsing date:', e);
      setCountdown({ days: 0, hours: 0, minutes: 0, seconds: 0 });
      return;
    }
    
    // Check if birthday is today
    const isBirthdayToday = now.getMonth() === birthday.getMonth() && now.getDate() === birthday.getDate();
    
    if (isBirthdayToday) {
      setCountdown({ days: 0, hours: 0, minutes: 0, seconds: 0 });
      setIsBirthday(true);
      return;
    }
    
    // If birthday has passed this year, set to next year
    if (now > birthday) {
      birthday.setFullYear(now.getFullYear() + 1);
    }
    
    const diff = birthday - now;
    
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
    const details = getBirthdayDetails();
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
      alert('Calm down, baby! Your birthday surprise will be revealed when the countdown reaches zero!');
    }
  };

  const revealGift = () => {
    if (!isBirthday) {
      alert("Calm down and wait for your main day...I have something nice for you!");
      return;
    }
    setShowGift(true);
  };

  const formatNumber = (num) => String(num).padStart(2, '0');

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-rose-50 via-pink-50 to-purple-50">
        <div className="text-rose-500 text-2xl animate-pulse">Loading your surprise...</div>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-rose-50 via-pink-50 to-purple-50">
        <div className="text-rose-500 text-2xl">Order not found</div>
      </div>
    );
  }

  const details = getBirthdayDetails();
  const photos = details?.photos || [];
  const backgroundImage = details?.backgroundImage;
  const audioUrl = details?.audioUrl;
  const nickname = details?.nickname;
  const letter = details?.letter;
  const heartMessage = details?.heartMessage;

  // Default gallery images as fallback
  const defaultGalleryImages = [
    'https://images.unsplash.com/photo-1530103862676-de3c9a59af38?w=800&q=80',
    'https://images.unsplash.com/photo-1464349095431-e9a21285b5f3?w=800&q=80',
    'https://images.unsplash.com/photo-1519834785169-98be25ec3f84?w=800&q=80',
    'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=800&q=80',
    'https://images.unsplash.com/photo-1485291571150-772bcfc10da5?w=800&q=80',
    'https://images.unsplash.com/photo-1523438885200-e635ba2c371e?w=800&q=80'
  ];

  const galleryImages = photos.length > 0 ? photos.map(p => p.url) : defaultGalleryImages;

  return (
    <div className="min-h-screen text-gray-800" style={{backgroundImage: `url(${backgroundImage})`, backgroundSize: 'cover', backgroundPosition: 'center', backgroundAttachment: 'fixed'}}>
      {/* Floating Hearts Background */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden" style={{background: 'rgba(0,0,0,0.4)'}}>
        {[...Array(15)].map((_, i) => (
          <div
            key={i}
            className="absolute"
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
      `}</style>

      {/* Hero Section */}
      <section className="min-h-screen flex items-center justify-center text-center px-6 relative z-10">
        <div>
          <h1 className="text-5xl md:text-6xl font-bold romantic-font text-rose-400 mb-4">
            To The Love Of My Life 💕
          </h1>
          <p className="text-white animate-pulse">Keep watching, beautiful ✨</p>
        </div>
      </section>

      {/* Love Declaration */}
      <section className="py-16 text-center px-6 relative z-10" style={{background: 'rgba(255,255,255,0.85)'}}>
        <div className="max-w-3xl mx-auto">
          <div className="text-6xl mb-6">💕</div>
          <h2 className="text-4xl font-bold romantic-font gradient-text mb-6">{heartMessage}</h2>
          <p className="text-lg text-gray-600 leading-relaxed">
            {letter || "Another year has passed, and my love for you only grows stronger. You are my sunshine on cloudy days, my smile when I'm sad, my everything. Today we celebrate the day the most amazing person came into this world - YOU!"}
          </p>
        </div>
      </section>

      {/* Countdown */}
      <section className="py-16 text-center px-6 relative z-10" style={{background: 'rgba(255,255,255,0.85)'}}>
        <h2 className="text-3xl font-bold romantic-font text-rose-500 mb-8">
          Countdown To Your Special Day ⏰
        </h2>
        <div className="flex justify-center gap-4 md:gap-6 flex-wrap">
          <div className="bg-white w-20 h-20 md:w-24 md:h-24 rounded-2xl flex flex-col items-center justify-center shadow-lg border-2 border-rose-200">
            <span className="text-2xl md:text-3xl font-bold text-rose-500">{formatNumber(countdown.days)}</span>
            <span className="text-xs text-gray-500">Days</span>
          </div>
          <div className="bg-white w-20 h-20 md:w-24 md:h-24 rounded-2xl flex flex-col items-center justify-center shadow-lg border-2 border-rose-200">
            <span className="text-2xl md:text-3xl font-bold text-pink-500">{formatNumber(countdown.hours)}</span>
            <span className="text-xs text-gray-500">Hours</span>
          </div>
          <div className="bg-white w-20 h-20 md:w-24 md:h-24 rounded-2xl flex flex-col items-center justify-center shadow-lg border-2 border-rose-200">
            <span className="text-2xl md:text-3xl font-bold text-purple-500">{formatNumber(countdown.minutes)}</span>
            <span className="text-xs text-gray-500">Minutes</span>
          </div>
          <div className="bg-white w-20 h-20 md:w-24 md:h-24 rounded-2xl flex flex-col items-center justify-center shadow-lg border-2 border-rose-200">
            <span className="text-2xl md:text-3xl font-bold text-rose-400">{formatNumber(countdown.seconds)}</span>
            <span className="text-xs text-gray-500">Seconds</span>
          </div>
        </div>
      </section>

      {/* Tap to Reveal Button */}
      {!revealed && (
        <section className="py-20 text-center relative z-10">
          <button
            onClick={handleTapToReveal}
            className="bg-gradient-to-r from-rose-500 to-pink-500 text-white px-10 py-4 rounded-full shadow-lg text-lg font-semibold hover:scale-105 transition-transform animate-bounce"
          >
            🎁 Tap To Open Your Surprise
          </button>
        </section>
      )}

      {/* Revealed Content */}
      {revealed && (
        <div className="relative z-10">
          {/* Birthday Message */}
          <section className="py-16 text-center" style={{background: 'rgba(255,255,255,0.9)'}}>
            <div className="text-6xl mb-4">🎉</div>
            <h2 className="text-4xl font-bold romantic-font gradient-text">
              Happy Birthday, {nickname}! 🎂💕
            </h2>
          </section>

          {/* Photo Gallery */}
          <section className="py-10 px-6" style={{background: 'rgba(255,255,255,0.85)'}}>
            <h2 className="text-center text-3xl font-bold romantic-font text-rose-500 mb-8">
              Our Beautiful Memories 📸
            </h2>
            <div className="flex overflow-x-auto space-x-6 px-4" style={{scrollbarWidth: 'none'}}>
              {galleryImages.map((img, index) => (
                <img
                  key={index}
                  src={img}
                  alt={`Memory ${index + 1}`}
                  className="rounded-2xl shadow-lg min-w-[280px] h-[400px] object-cover hover:scale-105 transition-transform"
                />
              ))}
            </div>
            <p className="text-center text-gray-500 mt-4">Swipe to see more 💫</p>
          </section>

          {/* Gift Section */}
          <section className="py-16 text-center px-6" style={{background: 'rgba(255,255,255,0.85)'}}>
            {!showGift ? (
              <button
                onClick={revealGift}
                className="bg-gradient-to-r from-rose-500 to-pink-500 text-white px-10 py-4 rounded-full shadow-lg text-lg font-semibold hover:scale-105 transition-transform"
              >
                🎁 Tap For Your Gift
              </button>
            ) : (
              <div className="max-w-2xl mx-auto">
                <div className="text-6xl mb-6">🎉</div>
                <h3 className="text-3xl font-bold romantic-font gradient-text mb-4">
                  You Are My Greatest Blessing! 💖
                </h3>
                <p className="text-gray-600 text-lg leading-relaxed">
                  Every day with you feels like a gift. You make my life complete in ways I never thought possible.
                  Your smile lights up my world, your laughter is my favorite melody, and your love is everything I've ever wanted.
                  I promise to love you forever, to cherish you always, and to make you as happy as you make me.
                  You deserve all the love in the universe and more! ✨💕
                </p>
              </div>
            )}
          </section>

          {/* Links */}
          <section className="py-10 text-center" style={{background: 'rgba(255,255,255,0.85)'}}>
            <div className="flex flex-col md:flex-row gap-4 justify-center">
              <Link
                to={`/slideshow/${code}`}
                className="bg-gradient-to-r from-rose-500 to-pink-500 text-white font-bold py-3 px-6 rounded-full shadow-lg hover:scale-105 transition-transform inline-block"
              >
                View Slideshow 🎬
              </Link>
              <Link
                to={`/gift/${code}`}
                className="bg-gradient-to-r from-yellow-500 to-orange-500 text-white font-bold py-3 px-6 rounded-full shadow-lg hover:scale-105 transition-transform inline-block"
              >
                Send a Gift 🎁
              </Link>
            </div>
          </section>
        </div>
      )}

      {/* Music Player */}
      {audioUrl && (
        <div className="fixed bottom-6 left-6 z-40">
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
            className="bg-white p-3 rounded-full shadow-lg hover:scale-110 transition-transform"
          >
            🎵 Play Music
          </button>
        </div>
      )}
    </div>
  );
};

export default Birthday;
