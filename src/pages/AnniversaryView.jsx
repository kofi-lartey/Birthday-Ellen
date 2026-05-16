import React, { useState, useEffect, useRef } from 'react';
import { useParams, Link, useLocation } from 'react-router-dom';
import { supabase } from '../supabase';
import { safeFormatDate } from '../utils/dateUtils';

export default function AnniversaryView() {
  const { id } = useParams();
  const location = useLocation();
  const isPublicView = location.pathname.startsWith('/public');
  
  const [anniversary, setAnniversary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [revealed, setRevealed] = useState(false);
  const [isAnniversaryDay, setIsAnniversaryDay] = useState(false);
  const [countdown, setCountdown] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });
  const [eventCode, setEventCode] = useState(null);
  const audioRef = useRef(null);

  const DEFAULT_BACKGROUND = 'https://images.unsplash.com/photo-1516589091380-5d8e87df6999?w=1280&q=80';
  const DEFAULT_AUDIO = 'https://res.cloudinary.com/djjgkezui/video/upload/v1770905491/Chris_Brown_-_With_You_Official_HD_Video_iqxx8x.mp3';

  useEffect(() => {
    loadAnniversary();
  }, [id]);

  useEffect(() => {
    if (anniversary) {
      calculateCountdown();
      const interval = setInterval(calculateCountdown, 1000);
      return () => clearInterval(interval);
    }
  }, [anniversary]);

  const loadAnniversary = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      
      let actualId = null;
      const isCode = isNaN(id) || /[A-Za-z]/.test(id);
      
      if (isCode) {
        const { data: registryData, error: registryError } = await supabase
          .from('event_registry')
          .select('event_id, code')
          .eq('code', id)
          .eq('event_type', 'anniversary')
          .single();
        
        if (registryError) throw new Error('Anniversary not found');
        actualId = registryData.event_id;
        setEventCode(registryData.code);
      } else {
        actualId = parseInt(id);
      }
      
      let query = supabase.from('anniversaries').select('*').eq('id', actualId);
      if (isPublicView) query = query.eq('is_public', true);
      
      const { data, error } = await query.single();
      if (error) throw error;
      if (!data) throw new Error('Anniversary not found');
      
      setAnniversary(data);
    } catch (err) {
      console.error('Error loading anniversary:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const calculateCountdown = () => {
    if (!anniversary?.anniversary_date) {
      setCountdown({ days: 0, hours: 0, minutes: 0, seconds: 0 });
      return;
    }
    
    const now = new Date();
    const targetDate = new Date(anniversary.anniversary_date);
    const isToday = now.toDateString() === targetDate.toDateString();
    
    if (isToday) {
      setCountdown({ days: 0, hours: 0, minutes: 0, seconds: 0 });
      setIsAnniversaryDay(true);
      return;
    }
    
    if (now > targetDate) {
      const nextYear = new Date(now.getFullYear() + 1, targetDate.getMonth(), targetDate.getDate());
      const diff = nextYear - now;
      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);
      setCountdown({ days, hours, minutes, seconds });
      setIsAnniversaryDay(false);
      return;
    }
    
    const diff = targetDate - now;
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diff % (1000 * 60)) / 1000);
    
    setCountdown({ days, hours, minutes, seconds });
    setIsAnniversaryDay(false);
  };

  const handleTapToReveal = () => {
    if (isAnniversaryDay) {
      setRevealed(true);
      if (audioRef.current) {
        audioRef.current.play().catch(console.error);
      }
    } else {
      alert('Your anniversary surprise awaits! Come back on your special day! 💕');
    }
  };

  const formatNumber = (num) => String(num).padStart(2, '0');

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-50 to-rose-100">
        <div className="text-rose-500 text-2xl animate-pulse">Loading anniversary celebration...</div>
      </div>
    );
  }

  if (error || !anniversary) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-50 to-rose-100">
        <div className="text-center">
          <div className="text-rose-500 text-6xl mb-4">💕</div>
          <p className="text-gray-600 text-xl">Anniversary not found</p>
          <button onClick={() => window.location.href = '/'} className="mt-4 px-6 py-2 bg-rose-500 text-white rounded-full">
            Go Home
          </button>
        </div>
      </div>
    );
  }

  const coupleNames = anniversary.couple_names || 'The Happy Couple';
  const [name1, name2] = coupleNames.includes('&') ? coupleNames.split('&').map(n => n.trim()) : [coupleNames, ''];

  return (
    <div className="min-h-screen text-gray-800" style={{
      backgroundImage: `url(${anniversary.background_image || DEFAULT_BACKGROUND})`,
      backgroundSize: 'cover',
      backgroundPosition: 'center',
      backgroundAttachment: 'fixed'
    }}>
      {/* Floating Hearts Background */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden" style={{ background: 'rgba(0,0,0,0.3)' }}>
        {[...Array(25)].map((_, i) => (
          <div
            key={i}
            className="absolute"
            style={{
              left: `${Math.random() * 100}%`,
              animation: `floatUp ${7 + Math.random() * 5}s ease-in-out infinite`,
              animationDelay: `${Math.random() * 5}s`,
              fontSize: `${15 + Math.random() * 25}px`,
              opacity: 0
            }}
          >
            {['💕', '❤️', '💖', '💗', '💝', '💘', '💟', '🌹', '✨'][Math.floor(Math.random() * 9)]}
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
          <div className="text-7xl mb-6 animate-pulse">💕</div>
          <h1 className="text-5xl md:text-7xl font-['Dancing_Script'] text-white mb-4 drop-shadow-lg">
            {name1} & {name2 || ''}
          </h1>
          <p className="text-white/90 text-xl italic">Celebrating Love</p>
          <p className="text-white/80 text-lg mt-4">{safeFormatDate(anniversary.anniversary_date)}</p>
          {anniversary.years_married && (
            <p className="text-white/70 text-md mt-2">{anniversary.years_married} Years Together 💍</p>
          )}
        </div>
      </section>

      {/* Love Story Section */}
      <section className="py-20 text-center px-6 relative z-10" style={{ background: 'rgba(255,255,255,0.92)' }}>
        <div className="max-w-3xl mx-auto">
          <div className="text-6xl mb-6">💝</div>
          <h2 className="text-4xl font-['Dancing_Script'] text-rose-500 mb-6">Our Journey of Love</h2>
          <p className="text-lg text-gray-600 leading-relaxed">
            {anniversary.special_memory || 
              `${name1} and ${name2 || ''} have shared ${anniversary.years_married || 'many'} beautiful years together. 
              Their love has grown stronger with each passing day, creating memories that will last a lifetime. 
              Today, they celebrate another year of togetherness.`}
          </p>
        </div>
      </section>

      {/* Countdown Section */}
      <section className="py-20 text-center px-6 relative z-10" style={{ background: 'rgba(255,255,255,0.88)' }}>
        <h2 className="text-3xl font-['Dancing_Script'] text-rose-500 mb-8">
          {isAnniversaryDay ? "Today's Our Special Day! 🎉" : "Countdown To Our Anniversary 💕"}
        </h2>
        <div className="flex justify-center gap-4 md:gap-6 flex-wrap">
          <div className="bg-white w-24 h-24 md:w-28 md:h-28 rounded-2xl flex flex-col items-center justify-center shadow-lg border-2 border-red-200">
            <span className="text-3xl md:text-4xl font-bold text-red-500">{formatNumber(countdown.days)}</span>
            <span className="text-xs text-gray-500">Days</span>
          </div>
          <div className="bg-white w-24 h-24 md:w-28 md:h-28 rounded-2xl flex flex-col items-center justify-center shadow-lg border-2 border-pink-200">
            <span className="text-3xl md:text-4xl font-bold text-pink-500">{formatNumber(countdown.hours)}</span>
            <span className="text-xs text-gray-500">Hours</span>
          </div>
          <div className="bg-white w-24 h-24 md:w-28 md:h-28 rounded-2xl flex flex-col items-center justify-center shadow-lg border-2 border-rose-200">
            <span className="text-3xl md:text-4xl font-bold text-rose-500">{formatNumber(countdown.minutes)}</span>
            <span className="text-xs text-gray-500">Minutes</span>
          </div>
          <div className="bg-white w-24 h-24 md:w-28 md:h-28 rounded-2xl flex flex-col items-center justify-center shadow-lg border-2 border-rose-100">
            <span className="text-3xl md:text-4xl font-bold text-rose-400">{formatNumber(countdown.seconds)}</span>
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
            💕 Tap To Open Anniversary Surprise
          </button>
        </section>
      )}

      {/* Revealed Content */}
      {revealed && (
        <div className="relative z-10">
          {/* Celebration Message */}
          <section className="py-20 text-center" style={{ background: 'rgba(255,255,255,0.95)' }}>
            <div className="text-7xl mb-4">🎉💕🎉</div>
            <h2 className="text-5xl font-['Dancing_Script'] gradient-text">
              Happy Anniversary {name1} & {name2 || ''}!
            </h2>
            <p className="text-gray-600 text-lg mt-4 max-w-2xl mx-auto px-4">
              Another year of love, laughter, and beautiful memories. Your love story inspires everyone around you. Here's to many more years of happiness!
            </p>
          </section>

          {/* Celebration Plans */}
          {(anniversary.celebration_plan || anniversary.gift_idea) && (
            <section className="py-10 px-6" style={{ background: 'rgba(255,255,255,0.9)' }}>
              <h2 className="text-center text-3xl font-['Dancing_Script'] text-rose-500 mb-8">Celebration Plans 🎊</h2>
              <div className="max-w-4xl mx-auto grid md:grid-cols-2 gap-6">
                {anniversary.celebration_plan && (
                  <div className="bg-white p-6 rounded-2xl shadow-lg text-center">
                    <div className="text-4xl mb-3">🎉</div>
                    <h3 className="font-bold text-gray-700 mb-2">How We're Celebrating</h3>
                    <p className="text-gray-600">{anniversary.celebration_plan}</p>
                  </div>
                )}
                {anniversary.gift_idea && (
                  <div className="bg-white p-6 rounded-2xl shadow-lg text-center">
                    <div className="text-4xl mb-3">🎁</div>
                    <h3 className="font-bold text-gray-700 mb-2">Gift Idea</h3>
                    <p className="text-gray-600">{anniversary.gift_idea}</p>
                  </div>
                )}
              </div>
            </section>
          )}

          {/* Memory Photos */}
          {anniversary.memory_photos_json && anniversary.memory_photos_json.length > 0 && (
            <section className="py-10 px-6" style={{ background: 'rgba(255,255,255,0.85)' }}>
              <h2 className="text-center text-3xl font-['Dancing_Script'] text-rose-500 mb-8">Beautiful Memories 📸</h2>
              <div className="flex overflow-x-auto space-x-6 px-4 pb-4" style={{ scrollbarWidth: 'none' }}>
                {anniversary.memory_photos_json.map((photo, index) => (
                  <img
                    key={index}
                    src={photo}
                    alt={`Memory ${index + 1}`}
                    className="rounded-2xl shadow-lg min-w-[280px] h-[300px] object-cover hover:scale-105 transition-transform"
                  />
                ))}
              </div>
            </section>
          )}

          {/* Slideshow Link */}
          <section className="py-10 text-center" style={{ background: 'rgba(255,255,255,0.9)' }}>
            <Link
              to={`/slideshow/${eventCode || id}`}
              className="bg-gradient-to-r from-rose-500 to-pink-500 text-white font-bold py-3 px-8 rounded-full shadow-lg hover:scale-105 transition-transform inline-block"
            >
              View Anniversary Slideshow 🎬
            </Link>
          </section>
        </div>
      )}

      {/* Music Player */}
      <div className="fixed bottom-6 left-6 z-40">
        <audio ref={audioRef} src={anniversary.audio_url || DEFAULT_AUDIO} loop preload="auto" />
        <button 
          onClick={() => {
            if (audioRef.current) {
              audioRef.current.paused ? audioRef.current.play().catch(console.error) : audioRef.current.pause();
            }
          }}
          className="bg-white p-3 rounded-full shadow-lg hover:scale-110 transition-transform"
        >
          🎵 Play Music
        </button>
      </div>
    </div>
  );
}