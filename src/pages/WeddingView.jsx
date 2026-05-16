import React, { useState, useEffect, useRef } from 'react';
import { useParams, Link, useLocation } from 'react-router-dom';
import { supabase } from '../supabase';
import { safeFormatDate } from '../utils/dateUtils';

export default function WeddingView() {
  const { id } = useParams();
  const location = useLocation();
  const isPublicView = location.pathname.startsWith('/public');
  
  const [wedding, setWedding] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [revealed, setRevealed] = useState(false);
  const [isWeddingDay, setIsWeddingDay] = useState(false);
  const [countdown, setCountdown] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });
  const [eventCode, setEventCode] = useState(null);
  const audioRef = useRef(null);

  // Default assets
  const DEFAULT_BACKGROUND = 'https://images.unsplash.com/photo-1519741497674-611481863552?w=1280&q=80';
  const DEFAULT_AUDIO = 'https://res.cloudinary.com/djjgkezui/video/upload/v1770905491/Chris_Brown_-_With_You_Official_HD_Video_iqxx8x.mp3';

  useEffect(() => {
    loadWedding();
  }, [id]);

  useEffect(() => {
    if (wedding) {
      calculateCountdown();
      const interval = setInterval(calculateCountdown, 1000);
      return () => clearInterval(interval);
    }
  }, [wedding]);

  const loadWedding = async () => {
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
          .eq('event_type', 'wedding')
          .single();
        
        if (registryError) throw new Error('Wedding not found');
        actualId = registryData.event_id;
        setEventCode(registryData.code);
      } else {
        actualId = parseInt(id);
      }
      
      let query = supabase.from('weddings').select('*').eq('id', actualId);
      if (isPublicView) query = query.eq('is_public', true);
      
      const { data, error } = await query.single();
      if (error) throw error;
      if (!data) throw new Error('Wedding not found');
      
      setWedding(data);
    } catch (err) {
      console.error('Error loading wedding:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const calculateCountdown = () => {
    if (!wedding?.wedding_date) {
      setCountdown({ days: 0, hours: 0, minutes: 0, seconds: 0 });
      return;
    }
    
    const now = new Date();
    const targetDate = new Date(wedding.wedding_date);
    const isToday = now.toDateString() === targetDate.toDateString();
    
    if (isToday) {
      setCountdown({ days: 0, hours: 0, minutes: 0, seconds: 0 });
      setIsWeddingDay(true);
      return;
    }
    
    if (now > targetDate) {
      setCountdown({ days: 0, hours: 0, minutes: 0, seconds: 0 });
      setIsWeddingDay(true);
      return;
    }
    
    const diff = targetDate - now;
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diff % (1000 * 60)) / 1000);
    
    setCountdown({ days, hours, minutes, seconds });
    setIsWeddingDay(false);
  };

  const handleTapToReveal = () => {
    if (isWeddingDay) {
      setRevealed(true);
      if (audioRef.current) {
        audioRef.current.play().catch(console.error);
      }
    } else {
      alert('The celebration awaits! Your surprise will be revealed on the wedding day! 💒');
    }
  };

  const formatNumber = (num) => String(num).padStart(2, '0');

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-pink-50 to-rose-100">
        <div className="text-rose-500 text-2xl animate-pulse">Loading wedding celebration...</div>
      </div>
    );
  }

  if (error || !wedding) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-pink-50 to-rose-100">
        <div className="text-center">
          <div className="text-rose-500 text-6xl mb-4">💍</div>
          <p className="text-gray-600 text-xl">Wedding not found</p>
          <button onClick={() => window.location.href = '/'} className="mt-4 px-6 py-2 bg-rose-500 text-white rounded-full">
            Go Home
          </button>
        </div>
      </div>
    );
  }

  const coupleNames = wedding.couple_names || 'The Happy Couple';
  const [name1, name2] = coupleNames.includes('&') ? coupleNames.split('&').map(n => n.trim()) : [coupleNames, ''];

  return (
    <div className="min-h-screen text-gray-800" style={{
      backgroundImage: `url(${wedding.background_image || DEFAULT_BACKGROUND})`,
      backgroundSize: 'cover',
      backgroundPosition: 'center',
      backgroundAttachment: 'fixed'
    }}>
      {/* Floating Hearts/Rings Background */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden" style={{ background: 'rgba(0,0,0,0.4)' }}>
        {[...Array(20)].map((_, i) => (
          <div
            key={i}
            className="absolute"
            style={{
              left: `${Math.random() * 100}%`,
              animation: `floatUp ${8 + Math.random() * 6}s ease-in-out infinite`,
              animationDelay: `${Math.random() * 5}s`,
              fontSize: `${20 + Math.random() * 30}px`,
              opacity: 0
            }}
          >
            {['💍', '💒', '💕', '🌸', '✨', '💖', '🥂'][Math.floor(Math.random() * 7)]}
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
        @keyframes pulse-ring {
          0% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(244, 114, 182, 0.7); }
          70% { transform: scale(1); box-shadow: 0 0 0 20px rgba(244, 114, 182, 0); }
          100% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(244, 114, 182, 0); }
        }
      `}</style>

      {/* Hero Section */}
      <section className="min-h-screen flex items-center justify-center text-center px-6 relative z-10">
        <div className="animate-fade-in">
          <div className="text-7xl mb-6 animate-bounce">💍</div>
          <h1 className="text-5xl md:text-7xl font-['Dancing_Script'] text-white mb-4 drop-shadow-lg">
            {name1} & {name2 || ''}
          </h1>
          <p className="text-white/90 text-xl italic">Getting Married!</p>
          <p className="text-white/80 text-lg mt-4">{safeFormatDate(wedding.wedding_date)}</p>
          {wedding.venue && <p className="text-white/70 text-md mt-2">📍 {wedding.venue}</p>}
        </div>
      </section>

      {/* Love Story Section */}
      <section className="py-20 text-center px-6 relative z-10" style={{ background: 'rgba(255,255,255,0.9)' }}>
        <div className="max-w-3xl mx-auto">
          <div className="text-6xl mb-6">💕</div>
          <h2 className="text-4xl font-['Dancing_Script'] text-rose-500 mb-6">Our Love Story</h2>
          <p className="text-lg text-gray-600 leading-relaxed">
            {wedding.special_memory || 
              `Two hearts, one love. ${name1} and ${name2 || ''} are embarking on the most beautiful journey together. 
              Their love story is one for the ages, filled with laughter, joy, and endless devotion. 
              Today, they celebrate the beginning of forever.`}
          </p>
          {wedding.theme && (
            <p className="text-md text-rose-400 mt-4">✨ Theme: {wedding.theme} ✨</p>
          )}
        </div>
      </section>

      {/* Countdown Section */}
      <section className="py-20 text-center px-6 relative z-10" style={{ background: 'rgba(255,255,255,0.85)' }}>
        <h2 className="text-3xl font-['Dancing_Script'] text-rose-500 mb-8">
          {isWeddingDay ? "Today's The Big Day! 🎉" : "Countdown To The Big Day 💒"}
        </h2>
        <div className="flex justify-center gap-4 md:gap-8 flex-wrap">
          <div className="bg-white w-24 h-24 md:w-28 md:h-28 rounded-2xl flex flex-col items-center justify-center shadow-lg border-2 border-rose-200">
            <span className="text-3xl md:text-4xl font-bold text-rose-500">{formatNumber(countdown.days)}</span>
            <span className="text-xs text-gray-500">Days</span>
          </div>
          <div className="bg-white w-24 h-24 md:w-28 md:h-28 rounded-2xl flex flex-col items-center justify-center shadow-lg border-2 border-pink-200">
            <span className="text-3xl md:text-4xl font-bold text-pink-500">{formatNumber(countdown.hours)}</span>
            <span className="text-xs text-gray-500">Hours</span>
          </div>
          <div className="bg-white w-24 h-24 md:w-28 md:h-28 rounded-2xl flex flex-col items-center justify-center shadow-lg border-2 border-purple-200">
            <span className="text-3xl md:text-4xl font-bold text-purple-500">{formatNumber(countdown.minutes)}</span>
            <span className="text-xs text-gray-500">Minutes</span>
          </div>
          <div className="bg-white w-24 h-24 md:w-28 md:h-28 rounded-2xl flex flex-col items-center justify-center shadow-lg border-2 border-rose-200">
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
            className="bg-gradient-to-r from-rose-500 to-pink-500 text-white px-10 py-4 rounded-full shadow-lg text-lg font-semibold hover:scale-105 transition-transform animate-pulse"
            style={{ animation: 'pulse-ring 2s infinite' }}
          >
            💒 Tap To Open Wedding Surprise
          </button>
        </section>
      )}

      {/* Revealed Content */}
      {revealed && (
        <div className="relative z-10">
          {/* Celebration Message */}
          <section className="py-20 text-center" style={{ background: 'rgba(255,255,255,0.95)' }}>
            <div className="text-7xl mb-4">🎉💍🎉</div>
            <h2 className="text-5xl font-['Dancing_Script'] gradient-text">
              Congratulations {name1} & {name2 || ''}!
            </h2>
            <p className="text-gray-600 text-lg mt-4 max-w-2xl mx-auto px-4">
              May your journey together be filled with endless love, joy, and beautiful moments. Here's to forever!
            </p>
          </section>

          {/* Wedding Details */}
          <section className="py-10 px-6" style={{ background: 'rgba(255,255,255,0.9)' }}>
            <h2 className="text-center text-3xl font-['Dancing_Script'] text-rose-500 mb-8">Wedding Details ✨</h2>
            <div className="max-w-4xl mx-auto grid md:grid-cols-2 gap-6">
              {wedding.venue && (
                <div className="bg-white p-6 rounded-2xl shadow-lg text-center">
                  <div className="text-4xl mb-3">📍</div>
                  <h3 className="font-bold text-gray-700 mb-2">Venue</h3>
                  <p className="text-gray-600">{wedding.venue}</p>
                  {wedding.venue_address && <p className="text-gray-500 text-sm mt-1">{wedding.venue_address}</p>}
                </div>
              )}
              {wedding.dress_code && (
                <div className="bg-white p-6 rounded-2xl shadow-lg text-center">
                  <div className="text-4xl mb-3">👔</div>
                  <h3 className="font-bold text-gray-700 mb-2">Dress Code</h3>
                  <p className="text-gray-600">{wedding.dress_code}</p>
                </div>
              )}
              {wedding.theme && (
                <div className="bg-white p-6 rounded-2xl shadow-lg text-center">
                  <div className="text-4xl mb-3">🎨</div>
                  <h3 className="font-bold text-gray-700 mb-2">Theme</h3>
                  <p className="text-gray-600">{wedding.theme}</p>
                </div>
              )}
              {wedding.guest_count && (
                <div className="bg-white p-6 rounded-2xl shadow-lg text-center">
                  <div className="text-4xl mb-3">👥</div>
                  <h3 className="font-bold text-gray-700 mb-2">Guests</h3>
                  <p className="text-gray-600">{wedding.guest_count} expected</p>
                </div>
              )}
            </div>
          </section>

          {/* Vendors Section */}
          {(wedding.photographer || wedding.caterer || wedding.florist) && (
            <section className="py-10 px-6" style={{ background: 'rgba(255,255,255,0.85)' }}>
              <h2 className="text-center text-3xl font-['Dancing_Script'] text-rose-500 mb-8">Our Vendors 🤝</h2>
              <div className="max-w-4xl mx-auto grid md:grid-cols-3 gap-4">
                {wedding.photographer && (
                  <div className="bg-white p-4 rounded-xl shadow text-center">
                    <div className="text-3xl mb-2">📸</div>
                    <p className="font-medium text-gray-700">Photographer</p>
                    <p className="text-gray-600 text-sm">{wedding.photographer}</p>
                  </div>
                )}
                {wedding.caterer && (
                  <div className="bg-white p-4 rounded-xl shadow text-center">
                    <div className="text-3xl mb-2">🍽️</div>
                    <p className="font-medium text-gray-700">Caterer</p>
                    <p className="text-gray-600 text-sm">{wedding.caterer}</p>
                  </div>
                )}
                {wedding.florist && (
                  <div className="bg-white p-4 rounded-xl shadow text-center">
                    <div className="text-3xl mb-2">🌸</div>
                    <p className="font-medium text-gray-700">Florist</p>
                    <p className="text-gray-600 text-sm">{wedding.florist}</p>
                  </div>
                )}
              </div>
            </section>
          )}

          {/* Slideshow Link */}
          <section className="py-10 text-center" style={{ background: 'rgba(255,255,255,0.9)' }}>
            <Link
              to={`/slideshow/${eventCode || id}`}
              className="bg-gradient-to-r from-rose-500 to-pink-500 text-white font-bold py-3 px-8 rounded-full shadow-lg hover:scale-105 transition-transform inline-block"
            >
              View Wedding Slideshow 🎬
            </Link>
          </section>
        </div>
      )}

      {/* Music Player */}
      <div className="fixed bottom-6 left-6 z-40">
        <audio ref={audioRef} src={wedding.audio_url || DEFAULT_AUDIO} loop preload="auto" />
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