import React, { useState, useEffect, useRef } from 'react';
import { useParams, Link, useLocation } from 'react-router-dom';
import { supabase } from '../supabase';
import { safeFormatDate } from '../utils/dateUtils';
import { getEventDisplay } from '../config/eventSchemas';

export default function EventView() {
  const { id, code } = useParams();
  const location = useLocation();
  const isPublicView = location.pathname.startsWith('/public');
  
  const identifier = code || id;
  
  const [event, setEvent] = useState(null);
  const [registryData, setRegistryData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [revealed, setRevealed] = useState(false);
  const [isEventDay, setIsEventDay] = useState(false);
  const [countdown, setCountdown] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });
  const [eventCode, setEventCode] = useState(null);
  const [photos, setPhotos] = useState([]);
  const [isVoicePlaying, setIsVoicePlaying] = useState(false);
  const [isMusicPlaying, setIsMusicPlaying] = useState(false);
  
  // Photo Slideshow State
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);
  
  // Single source of truth for volume control
  const [userVolume, setUserVolume] = useState(0.5);
  const [backgroundVolume, setBackgroundVolume] = useState(0.5);
  
  const audioRef = useRef(null);
  const voiceRef = useRef(null);

  const APP_LOGO = 'https://res.cloudinary.com/djjgkezui/image/upload/v1778959179/IMG-20260516-WA0050_zegaok.jpg';

  const DEFAULT_BACKGROUNDS = {
    birthday: 'https://images.unsplash.com/photo-1518640467707-6811f4a6ab73?w=1280&q=80',
    wedding: 'https://images.unsplash.com/photo-1519741497674-611481863552?w=1280&q=80',
    anniversary: 'https://images.unsplash.com/photo-1516589091380-5d8e87df6999?w=1280&q=80',
    party: 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=1280&q=80',
    hangout: 'https://images.unsplash.com/photo-1528605248644-14dd04022da1?w=1280&q=80',
    other: 'https://images.unsplash.com/photo-1511795409834-ef04bbd61622?w=1280&q=80'
  };

  const DEFAULT_AUDIO = 'https://res.cloudinary.com/djjgkezui/video/upload/v1770905491/Chris_Brown_-_With_You_Official_HD_Video_iqxx8x.mp3';

  useEffect(() => {
    if (identifier) {
      loadEvent();
    } else {
      setError('No event ID provided');
      setLoading(false);
    }
  }, [identifier]);

  useEffect(() => {
    if (event?.event_date) {
      calculateCountdown();
      const interval = setInterval(calculateCountdown, 1000);
      return () => clearInterval(interval);
    }
  }, [event]);

  // Automated Slideshow Engine for "Beautiful Memories"
  useEffect(() => {
    if (photos.length <= 1) return;
    const slideInterval = setInterval(() => {
      setCurrentPhotoIndex((prevIndex) => (prevIndex + 1) % photos.length);
    }, 4000);

    return () => clearInterval(slideInterval);
  }, [photos]);

  // Sync background audio when volume slider or ducking state changes
  useEffect(() => {
    if (audioRef.current) {
      const calculatedVolume = isVoicePlaying ? userVolume * 0.2 : userVolume;
      audioRef.current.volume = calculatedVolume;
      setBackgroundVolume(calculatedVolume);
    }
  }, [userVolume, isVoicePlaying]);

  useEffect(() => {
    const audioEl = audioRef.current;
    if (!audioEl) return;

    const handlePlayState = () => setIsMusicPlaying(true);
    const handlePauseState = () => setIsMusicPlaying(false);

    audioEl.addEventListener('play', handlePlayState);
    audioEl.addEventListener('pause', handlePauseState);

    return () => {
      audioEl.removeEventListener('play', handlePlayState);
      audioEl.removeEventListener('pause', handlePauseState);
    };
  }, []);

  useEffect(() => {
    const voiceElement = voiceRef.current;
    if (!voiceElement) return;
    
    const handleVoicePlay = () => setIsVoicePlaying(true);
    const handleVoicePauseOrEnd = () => setIsVoicePlaying(false);
    
    voiceElement.addEventListener('play', handleVoicePlay);
    voiceElement.addEventListener('pause', handleVoicePauseOrEnd);
    voiceElement.addEventListener('ended', handleVoicePauseOrEnd);
    
    return () => {
      voiceElement.removeEventListener('play', handleVoicePlay);
      voiceElement.removeEventListener('pause', handleVoicePauseOrEnd);
      voiceElement.removeEventListener('ended', handleVoicePauseOrEnd);
    };
  }, [event?.voice_url]);

  const loadEvent = async () => {
    try {
      setLoading(true);
      setError(null);
      
      if (!identifier) throw new Error('No event identifier provided');
      
      let registry = null;
      const isCode = isNaN(identifier) || /[A-Za-z]/.test(identifier);
      
      if (isCode) {
        const { data, error } = await supabase
          .from('event_registry')
          .select('*')
          .eq('code', identifier)
          .maybeSingle();
        
        if (error) throw new Error('Error loading event');
        if (!data) throw new Error('Event not found');
        
        registry = data;
        setEventCode(registry.code);
      } else {
        const { data, error } = await supabase
          .from('event_registry')
          .select('*')
          .eq('event_id', parseInt(identifier))
          .maybeSingle();
        
        if (error) throw new Error('Error loading event');
        if (!data) throw new Error('Event not found');
        
        registry = data;
        setEventCode(registry.code);
      }
      
      setRegistryData(registry);
      
      if (registry.photos) {
        try {
          const parsedPhotos = typeof registry.photos === 'string' ? JSON.parse(registry.photos) : registry.photos;
          setPhotos(parsedPhotos);
        } catch (e) {
          console.error('Error parsing photos:', e);
          setPhotos([]);
        }
      }
      
      let specificData = null;
      const eventType = registry.event_type;
      const actualId = registry.event_id;
      
      if (eventType !== 'birthday' && actualId) {
        const tableMap = {
          wedding: 'weddings',
          anniversary: 'anniversaries',
          party: 'parties',
          hangout: 'hangouts',
          other: 'other_events'
        };
        
        const tableName = tableMap[eventType];
        if (tableName) {
          let query = supabase.from(tableName).select('*').eq('id', actualId);
          if (isPublicView) query = query.eq('is_public', true);
          
          const { data, error } = await query.maybeSingle();
          if (!error && data) specificData = data;
        }
      }
      
      setEvent({
        ...specificData,
        event_type: eventType,
        event_name: registry.event_name,
        event_date: registry.event_date,
        background_image: registry.background_image || specificData?.background_image,
        audio_url: registry.audio_url || specificData?.audio_url,
        voice_url: registry.voice_url,
        letter: registry.letter,
        photos: registry.photos,
        is_public: registry.is_public
      });
      
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const calculateCountdown = () => {
    if (!event?.event_date) return;
    
    const now = new Date();
    const targetDate = new Date(event.event_date);
    const isToday = now.toDateString() === targetDate.toDateString();
    
    if (isToday || now > targetDate) {
      setCountdown({ days: 0, hours: 0, minutes: 0, seconds: 0 });
      setIsEventDay(true);
      return;
    }
    
    const diff = targetDate - now;
    setCountdown({
      days: Math.floor(diff / (1000 * 60 * 60 * 24)),
      hours: Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
      minutes: Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60)),
      seconds: Math.floor((diff % (1000 * 60)) / 1000)
    });
    setIsEventDay(false);
  };

  const handleTapToReveal = () => {
    if (isEventDay) {
      setRevealed(true);
      if (audioRef.current) audioRef.current.play().catch(console.error);
    } else {
      const messages = {
        birthday: 'Calm down! Your special surprise will be revealed on your birthday! 🎂',
        wedding: 'The celebration awaits! Your surprise will be revealed on the wedding day! 💒',
        anniversary: 'Your anniversary surprise awaits! Come back on your special day! 💕',
        party: 'The party surprise awaits! Come back on the party day! 🎉',
        hangout: 'The hangout surprise awaits! Come back on the hangout day! 👋',
        other: 'Your special surprise awaits! Come back on the event day! 📅'
      };
      alert(messages[event?.event_type] || messages.other);
    }
  };

  const nextSlide = () => setCurrentPhotoIndex((prev) => (prev + 1) % photos.length);
  const prevSlide = () => setCurrentPhotoIndex((prev) => (prev - 1 + photos.length) % photos.length);
  const handleVolumeChange = (e) => setUserVolume(parseFloat(e.target.value));
  const formatNumber = (num) => String(num).padStart(2, '0');

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-rose-50 to-pink-100">
        <div className="text-rose-500 text-2xl animate-pulse">Loading celebration...</div>
      </div>
    );
  }

  if (error || !event || !registryData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-rose-50 to-pink-100 p-6">
        <div className="text-center max-w-sm w-full bg-white/80 backdrop-blur p-6 rounded-3xl shadow-xl">
          <div className="text-rose-500 text-6xl mb-4">😢</div>
          <p className="text-gray-600 text-xl font-medium">{error || 'Event not found'}</p>
          <button onClick={() => window.location.href = '/dashboard'} className="mt-6 w-full py-3 bg-rose-500 text-white rounded-full font-semibold shadow-md">
            Go to Dashboard
          </button>
        </div>
      </div>
    );
  }

  const displayConfig = getEventDisplay(registryData.event_type);
  const eventType = registryData.event_type;
  const backgroundImage = event.background_image || DEFAULT_BACKGROUNDS[eventType] || DEFAULT_BACKGROUNDS.other;
  const audioUrl = event.audio_url || DEFAULT_AUDIO;

  const getHeroTitle = () => (eventType === 'wedding' || eventType === 'anniversary') ? (event.couple_names || event.event_name) : event.event_name;
  
  const getHeroSubtitle = () => {
    const subtitles = { birthday: 'Celebrating Another Amazing Year!', wedding: 'Getting Married!', anniversary: 'Celebrating Love', party: 'Party Time!', hangout: "Let's Hangout!", other: 'Special Celebration' };
    return subtitles[eventType] || 'Special Celebration';
  };
  
  const getCountdownTitle = () => {
    const titles = { birthday: 'Countdown To Your Birthday', wedding: 'Countdown To The Big Day', anniversary: 'Countdown To Anniversary', party: 'Countdown To The Party', hangout: 'Countdown To Hangout', other: 'Countdown To Event' };
    return isEventDay ? "Today's The Special Day! 🎉" : titles[eventType] || 'Countdown To Special Day';
  };

  const getRevealButtonText = () => {
    const texts = { birthday: '🎁 Tap To Open Your Birthday Surprise', wedding: '💒 Tap To Open Wedding Surprise', anniversary: '💕 Tap To Open Anniversary Surprise', party: '🎉 Tap To Open Party Surprise', hangout: '👋 Tap To Open Hangout Surprise' };
    return texts[eventType] || '📅 Tap To Open Your Surprise';
  };
  
  const getCelebrationMessage = () => {
    const messages = { birthday: `Happy Birthday, ${event.event_name}! 🎂`, wedding: `Congratulations ${event.couple_names || event.event_name}! 💍`, anniversary: `Happy Anniversary ${event.couple_names || event.event_name}! 💕`, party: `Let's Party, ${event.event_name}! 🎉`, hangout: `Let's Hangout, ${event.event_name}! 👋` };
    return messages[eventType] || `Celebrating ${event.event_name}! 🎉`;
  };

  const getDynamicBodyMessage = () => {
    if (event.celebration_message) return event.celebration_message;
    const defaultMessages = {
      birthday: `Another year has passed, and our love for you only grows stronger. You are sunshine on cloudy days, a smile when times are tough, and an absolute gift to this world. Today we celebrate the day the most amazing person came into this world—YOU!`,
      wedding: `Today two hearts join as one. May your love grow deeper with every passing day, and your life together be filled with boundless joy, laughter, and beautiful memories. Here's to forever!`,
      anniversary: `Celebrating the beautiful love you share. May the journey you started together continue to be paved with understanding, deep friendship, and endless romance. Happy Anniversary!`,
      party: `The waiting is officially over! Put on your dancing shoes, grab a drink, and let's turn this moment into an unforgettable night. Thanks for celebrating with us!`,
      hangout: `Time to unwind with great company and amazing vibes. Let's create some beautiful memories together today!`,
      other: displayConfig.defaultMessage || `We are so happy to share this incredibly special day with you. Thank you for being a part of this beautiful milestone celebration!`
    };
    return defaultMessages[eventType] || defaultMessages.other;
  };

  const getFloatingEmojis = () => {
    const emojiSets = { birthday: ['🎂', '🎈', '🎁', '🎉', '✨', '💖'], wedding: ['💍', '💒', '💕', '🌸', '🥂'], anniversary: ['💕', '❤️', '💖', '🌹'], party: ['🎉', '🎈', '🎊', '💃'], hangout: ['👋', '😎', '🍕', '🎵'] };
    return emojiSets[eventType] || ['✨', '🎉', '🎈'];
  };

  const activePhotoSrc = photos[currentPhotoIndex]?.url || photos[currentPhotoIndex];

  return (
    // FIXED: Standardize viewport display and limit outer window scrolling on desktop screens
    <div className="min-h-screen text-gray-800 lg:grid lg:grid-cols-2 lg:h-screen lg:overflow-hidden relative">
      
      <style>{`
        @keyframes floatUp {
          0% { transform: translateY(100vh) scale(0); opacity: 0; }
          10% { opacity: 0.8; }
          90% { opacity: 0.6; }
          100% { transform: translateY(-100px) scale(1); opacity: 0; }
        }
        @keyframes pulse-ring {
          0% { transform: scale(0.98); box-shadow: 0 0 0 0 rgba(244, 114, 182, 0.7); }
          70% { transform: scale(1); box-shadow: 0 0 0 15px rgba(244, 114, 182, 0); }
          100% { transform: scale(0.98); box-shadow: 0 0 0 0 rgba(244, 114, 182, 0); }
        }
        @keyframes vinyl-spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        .animate-vinyl { animation: vinyl-spin 4s linear infinite; }
      `}</style>

      {/* LEFT COLUMN: COMPLETELY FIXED HERO CANVAS (NEVER SCROLLS) */}
      {/* FIXED: Changed alignment background properties to 'bg-top' so the face/head isn't cut off */}
      <div 
        className="relative min-h-screen lg:h-full w-full flex flex-col justify-center items-center text-center px-4 bg-no-repeat bg-top bg-cover" 
        style={{ backgroundImage: `url(${backgroundImage})` }}
      >
        {/* Dimmer Overlay */}
        <div className="absolute inset-0 bg-black/30 z-0" />
        
        {/* Floating Particle Emojis */}
        <div className="absolute inset-0 pointer-events-none z-10 overflow-hidden">
          {[...Array(12)].map((_, i) => (
            <div
              key={i}
              className="absolute"
              style={{
                left: `${Math.random() * 100}%`,
                animation: `floatUp ${8 + Math.random() * 6}s ease-in-out infinite`,
                animationDelay: `${Math.random() * 4}s`,
                fontSize: `${24 + Math.random() * 16}px`,
                opacity: 0
              }}
            >
              {getFloatingEmojis()[Math.floor(Math.random() * getFloatingEmojis().length)]}
            </div>
          ))}
        </div>

        {/* Hero Copy Content */}
        <div className="relative z-20 w-full max-w-md mx-auto px-4">
          <div className="text-6xl mb-3 animate-bounce">{displayConfig.emoji}</div>
          <h1 className="text-4xl md:text-6xl font-['Dancing_Script'] font-bold text-white mb-4 drop-shadow-lg leading-tight">
            {getHeroTitle()}
          </h1>
          <p className="text-white/90 text-lg md:text-xl italic drop-shadow-md">{getHeroSubtitle()}</p>
          <p className="text-white/90 text-sm md:text-md mt-4 font-bold bg-white/20 inline-block px-5 py-1.5 rounded-full backdrop-blur-sm shadow-inner">
            {safeFormatDate(event.event_date)}
          </p>
          {event.venue && <p className="text-white/90 text-sm mt-3 drop-shadow-sm font-medium">📍 {event.venue}</p>}
        </div>
      </div>

      {/* RIGHT COLUMN: ISOLATED INDEPENDENT SCROLLING ZONE */}
      {/* FIXED: Added lg:h-full and lg:overflow-y-auto to isolate scrolling exclusively to this container */}
      <div className="bg-slate-50/50 min-h-screen lg:h-full lg:overflow-y-auto flex flex-col justify-start relative z-20 shadow-2xl border-l border-white/20 pb-32">
        
        {/* Message Banner Card */}
        {event.letter && (
          <section className="p-8 md:p-12 text-center border-b border-gray-100 bg-white/80 backdrop-blur-sm">
            <h2 className="text-3xl font-['Dancing_Script'] font-bold text-rose-500 mb-6">A Special Message</h2>
            <p className="text-md md:text-lg text-gray-700 leading-relaxed whitespace-pre-wrap font-serif max-w-xl mx-auto px-2">
              {event.letter}
            </p>
          </section>
        )}

        {/* Countdown Ticker */}
        <section className="p-8 text-center border-b border-gray-100 bg-white/40">
          <h2 className="text-xl font-bold text-gray-600 mb-4 tracking-wide">{getCountdownTitle()}</h2>
          <div className="grid grid-cols-4 gap-2 max-w-sm mx-auto">
            {[['Days', countdown.days, 'text-rose-500'], ['Hours', countdown.hours, 'text-pink-500'], ['Mins', countdown.minutes, 'text-purple-500'], ['Secs', countdown.seconds, 'text-rose-400']].map(([label, val, colorClass]) => (
              <div key={label} className="bg-white p-3 rounded-2xl flex flex-col items-center justify-center shadow-sm border border-gray-100">
                <span className={`text-2xl md:text-3xl font-black ${colorClass}`}>{formatNumber(val)}</span>
                <span className="text-[10px] uppercase font-bold tracking-wider text-gray-400 mt-0.5">{label}</span>
              </div>
            ))}
          </div>
        </section>

        {/* Gatekeep Button */}
        {!revealed && (
          <section className="py-16 text-center px-4 flex justify-center items-center flex-1">
            <button
              onClick={handleTapToReveal}
              className="w-full max-w-xs bg-gradient-to-r from-rose-500 to-pink-500 text-white px-6 py-4 rounded-full shadow-lg text-md font-bold active:scale-95 transition-transform"
              style={{ animation: 'pulse-ring 2s infinite' }}
            >
              {getRevealButtonText()}
            </button>
          </section>
        )}

        {/* Unveiled Surprises */}
        {revealed && (
          <div className="animate-fade-in divide-y divide-gray-100/60">
            
            {/* Dynamic Reveal Card Block */}
            <section className="p-8 md:p-12 text-center bg-white">
              <div className="text-4xl mb-2 animate-spin" style={{ animationDuration: '3s' }}>✨</div>
              <h2 className="text-2xl md:text-4xl font-['Dancing_Script'] font-bold text-transparent bg-clip-text bg-gradient-to-r from-rose-500 to-pink-600 mb-4">
                {getCelebrationMessage()}
              </h2>
              <p className="text-gray-600 text-md max-w-md mx-auto leading-relaxed font-serif whitespace-pre-wrap px-2">
                {getDynamicBodyMessage()}
              </p>
            </section>

            {/* Voice Clip Section with auto-ducking notification */}
            {event.voice_url && (
              <section className="p-8 bg-slate-50/50">
                <div className="max-w-md mx-auto text-center">
                  <h2 className="text-xl font-bold text-gray-700 mb-4 flex items-center justify-center gap-2">
                    <span>🎤</span> A Special Voice Note
                  </h2>
                  <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-200">
                    <audio ref={voiceRef} src={event.voice_url} controls className="w-full focus:outline-none" />
                    <p className="text-[11px] text-gray-400 mt-2 font-medium">
                      💡 Background music lowers down automatically while playing
                    </p>
                  </div>
                </div>
              </section>
            )}

            {/* AUTOMATED SLIDESHOW GALLERY */}
            {photos.length > 0 && (
              <section className="p-8 bg-white text-center">
                <h2 className="text-xl font-bold text-gray-700 mb-4">Beautiful Memories 📸</h2>
                <div className="relative w-full max-w-md h-[450px] mx-auto rounded-2xl overflow-hidden shadow-xl border-4 border-white group bg-slate-950">
                  
                  {/* Smart Background Canvas Layering for Complete Images */}
                  <div 
                    className="absolute inset-0 bg-cover bg-center blur-xl opacity-30 scale-110 pointer-events-none" 
                    style={{ backgroundImage: `url(${activePhotoSrc})` }} 
                  />
                  
                  {/* Primary Render Image Frame (Guarantees image dimensions remain uncropped) */}
                  <img
                    src={activePhotoSrc}
                    alt={`Celebration Slide ${currentPhotoIndex + 1}`}
                    className="relative z-10 w-full h-full object-contain transition-all duration-500 ease-in-out"
                  />

                  {/* Manual Navigation Triggers */}
                  <button onClick={prevSlide} className="absolute left-3 top-1/2 -translate-y-1/2 z-20 w-9 h-9 bg-black/50 hover:bg-black/70 text-white rounded-full flex items-center justify-center text-sm backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity active:scale-90">
                    ❮
                  </button>
                  <button onClick={nextSlide} className="absolute right-3 top-1/2 -translate-y-1/2 z-20 w-9 h-9 bg-black/50 hover:bg-black/70 text-white rounded-full flex items-center justify-center text-sm backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity active:scale-90">
                    ❯
                  </button>

                  {/* Bubble Indicators */}
                  <div className="absolute bottom-4 inset-x-0 flex justify-center gap-1.5 z-20">
                    {photos.map((_, idx) => (
                      <button
                        key={idx}
                        onClick={() => setCurrentPhotoIndex(idx)}
                        className={`h-2 rounded-full transition-all duration-300 ${idx === currentPhotoIndex ? 'w-6 bg-rose-500' : 'w-2 bg-white/60'}`}
                      />
                    ))}
                  </div>
                </div>
              </section>
            )}

            {/* Slideshow Redirect Context */}
            <section className="p-8 text-center bg-slate-50/20">
              <Link
                to={`/slideshow/${eventCode || identifier}`}
                className="w-full max-w-xs bg-gradient-to-r from-rose-500 to-pink-500 text-white font-bold py-3.5 px-8 rounded-full shadow-md active:scale-95 transition-transform inline-block text-center"
              >
                Launch Cinema Slideshow 🎬
              </Link>
            </section>
          </div>
        )}
      </div>

      {/* INTUITIVE COMPACT FLOATING MUSIC PLAYER */}
      {/* FIXED: Shifted position left relative to the right panel layout context on wide desktop windows */}
      <div className="fixed bottom-6 left-1/2 lg:left-[75%] -translate-x-1/2 z-50 w-[90%] max-w-[340px] bg-white/95 backdrop-blur-xl rounded-full shadow-2xl px-3 py-2 border border-white/60 flex items-center justify-between gap-3 transition-all">
        <audio ref={audioRef} src={audioUrl} loop preload="auto" />
        
        {/* Spinning Vinyl Logo Action Button */}
        <button 
          onClick={() => {
            if (audioRef.current) {
              audioRef.current.paused ? audioRef.current.play().catch(console.error) : audioRef.current.pause();
            }
          }}
          className="relative shrink-0 w-11 h-11 rounded-full overflow-hidden shadow-md active:scale-90 transition-transform bg-gradient-to-tr from-rose-500 to-pink-500 flex items-center justify-center group"
        >
          <img 
            src={APP_LOGO} 
            alt="App Vinyl Logo" 
            className={`w-full h-full object-cover rounded-full border border-white/20 transition-transform duration-500 ${isMusicPlaying ? 'animate-vinyl' : ''}`}
          />
          <div className="absolute inset-0 m-auto w-3 h-3 bg-white rounded-full shadow-inner flex items-center justify-center">
            <div className="w-1 h-1 bg-gray-800 rounded-full" />
          </div>
        </button>

        {/* Volume Mixer Controls */}
        <div className="flex flex-col flex-1 gap-0.5">
          <div className="flex items-center justify-between px-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
              {isVoicePlaying ? 'Audio Ducked 🎤' : 'Music Volume'}
            </span>
            <span className="text-[10px] font-extrabold text-rose-500 bg-rose-50 px-1.5 py-0.5 rounded-full border border-rose-100">
              {Math.round(backgroundVolume * 100)}%
            </span>
          </div>

          <div className="w-full flex items-center px-1">
            <input
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={userVolume}
              onChange={handleVolumeChange}
              className="w-full h-1 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-rose-500"
            />
          </div>
        </div>

        {/* Mini Sound Equalizer Node (Only displays when playing) */}
        {isMusicPlaying && (
          <div className="flex items-end gap-0.5 h-3.5 shrink-0 pr-2">
            <div className="w-0.5 bg-rose-400 rounded-full animate-pulse h-3" />
            <div className="w-0.5 bg-pink-500 rounded-full animate-pulse h-2" style={{ animationDelay: '0.2s' }} />
            <div className="w-0.5 bg-rose-500 rounded-full animate-pulse h-4" style={{ animationDelay: '0.4s' }} />
          </div>
        )}
      </div>

    </div>
  );
}