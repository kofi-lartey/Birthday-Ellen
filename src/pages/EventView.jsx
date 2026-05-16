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
  const [backgroundVolume, setBackgroundVolume] = useState(1);
  
  const audioRef = useRef(null);
  const voiceRef = useRef(null);
  const originalVolumeRef = useRef(1);

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
      console.log('Loading event with identifier:', identifier);
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

  // Handle audio ducking when voice message plays
  useEffect(() => {
    if (voiceRef.current) {
      const voiceElement = voiceRef.current;
      
      const handleVoicePlay = () => {
        setIsVoicePlaying(true);
        if (audioRef.current && originalVolumeRef.current === 1) {
          originalVolumeRef.current = audioRef.current.volume;
          audioRef.current.volume = 0.2; // Duck to 20%
          setBackgroundVolume(0.2);
        }
      };
      
      const handleVoicePause = () => {
        setIsVoicePlaying(false);
        if (audioRef.current && originalVolumeRef.current !== 1) {
          audioRef.current.volume = originalVolumeRef.current;
          setBackgroundVolume(originalVolumeRef.current);
          originalVolumeRef.current = 1;
        }
      };
      
      const handleVoiceEnded = () => {
        setIsVoicePlaying(false);
        if (audioRef.current) {
          audioRef.current.volume = originalVolumeRef.current;
          setBackgroundVolume(originalVolumeRef.current);
          originalVolumeRef.current = 1;
        }
      };
      
      voiceElement.addEventListener('play', handleVoicePlay);
      voiceElement.addEventListener('pause', handleVoicePause);
      voiceElement.addEventListener('ended', handleVoiceEnded);
      
      return () => {
        voiceElement.removeEventListener('play', handleVoicePlay);
        voiceElement.removeEventListener('pause', handleVoicePause);
        voiceElement.removeEventListener('ended', handleVoiceEnded);
      };
    }
  }, [event?.voice_url]);

  const loadEvent = async () => {
    try {
      setLoading(true);
      setError(null);
      
      if (!identifier) {
        throw new Error('No event identifier provided');
      }
      
      let registry = null;
      const isCode = isNaN(identifier) || /[A-Za-z]/.test(identifier);
      
      if (isCode) {
        console.log('Looking up by code:', identifier);
        const { data, error } = await supabase
          .from('event_registry')
          .select('*')
          .eq('code', identifier)
          .maybeSingle();
        
        if (error) {
          console.error('Supabase error:', error);
          throw new Error('Error loading event');
        }
        
        if (!data) {
          console.log('No event found with code:', identifier);
          throw new Error('Event not found');
        }
        
        registry = data;
        setEventCode(registry.code);
      } else {
        console.log('Looking up by event_id:', parseInt(identifier));
        const { data, error } = await supabase
          .from('event_registry')
          .select('*')
          .eq('event_id', parseInt(identifier))
          .maybeSingle();
        
        if (error) {
          console.error('Supabase error:', error);
          throw new Error('Error loading event');
        }
        
        if (!data) {
          console.log('No event found with event_id:', identifier);
          throw new Error('Event not found');
        }
        
        registry = data;
        setEventCode(registry.code);
      }
      
      console.log('Loaded registry:', registry);
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
          console.log('Loading from table:', tableName, 'ID:', actualId);
          let query = supabase.from(tableName).select('*').eq('id', actualId);
          if (isPublicView) query = query.eq('is_public', true);
          
          const { data, error } = await query.maybeSingle();
          if (!error && data) {
            specificData = data;
            console.log('Loaded specific data:', specificData);
          }
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
      console.error('Error loading event:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const calculateCountdown = () => {
    if (!event?.event_date) {
      setCountdown({ days: 0, hours: 0, minutes: 0, seconds: 0 });
      return;
    }
    
    const now = new Date();
    const targetDate = new Date(event.event_date);
    const isToday = now.toDateString() === targetDate.toDateString();
    
    if (isToday || now > targetDate) {
      setCountdown({ days: 0, hours: 0, minutes: 0, seconds: 0 });
      setIsEventDay(true);
      return;
    }
    
    const diff = targetDate - now;
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diff % (1000 * 60)) / 1000);
    
    setCountdown({ days, hours, minutes, seconds });
    setIsEventDay(false);
  };

  const handleTapToReveal = () => {
    if (isEventDay) {
      setRevealed(true);
      if (audioRef.current) {
        audioRef.current.play().catch(console.error);
      }
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

  const handleVolumeChange = (e) => {
    const newVolume = parseFloat(e.target.value);
    setBackgroundVolume(newVolume);
    if (audioRef.current) {
      audioRef.current.volume = newVolume;
      originalVolumeRef.current = newVolume;
    }
  };

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
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-rose-50 to-pink-100">
        <div className="text-center">
          <div className="text-rose-500 text-6xl mb-4">😢</div>
          <p className="text-gray-600 text-xl">{error || 'Event not found'}</p>
          <p className="text-gray-500 text-sm mt-2">Identifier: {identifier}</p>
          <button onClick={() => window.location.href = '/dashboard'} className="mt-4 px-6 py-2 bg-rose-500 text-white rounded-full">
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

  const getHeroTitle = () => {
    if (eventType === 'wedding') return event.couple_names || event.event_name;
    if (eventType === 'anniversary') return event.couple_names || event.event_name;
    return event.event_name;
  };
  
  const getHeroSubtitle = () => {
    const subtitles = {
      birthday: 'Celebrating Another Amazing Year!',
      wedding: 'Getting Married!',
      anniversary: 'Celebrating Love',
      party: 'Party Time!',
      hangout: 'Let\'s Hangout!',
      other: 'Special Celebration'
    };
    return subtitles[eventType] || 'Special Celebration';
  };
  
  const getCountdownTitle = () => {
    const titles = {
      birthday: 'Countdown To Your Birthday',
      wedding: 'Countdown To The Big Day',
      anniversary: 'Countdown To Anniversary',
      party: 'Countdown To The Party',
      hangout: 'Countdown To Hangout',
      other: 'Countdown To Event'
    };
    return isEventDay ? "Today's The Special Day! 🎉" : titles[eventType] || 'Countdown To Special Day';
  };
  
  const getRevealButtonText = () => {
    const texts = {
      birthday: '🎁 Tap To Open Your Birthday Surprise',
      wedding: '💒 Tap To Open Wedding Surprise',
      anniversary: '💕 Tap To Open Anniversary Surprise',
      party: '🎉 Tap To Open Party Surprise',
      hangout: '👋 Tap To Open Hangout Surprise',
      other: '📅 Tap To Open Your Surprise'
    };
    return texts[eventType] || '🎁 Tap To Open Your Surprise';
  };
  
  const getCelebrationMessage = () => {
    const messages = {
      birthday: `Happy Birthday, ${event.event_name}! 🎂`,
      wedding: `Congratulations ${event.couple_names || event.event_name}! 💍`,
      anniversary: `Happy Anniversary ${event.couple_names || event.event_name}! 💕`,
      party: `Let's Party, ${event.event_name}! 🎉`,
      hangout: `Let's Hangout, ${event.event_name}! 👋`,
      other: `Celebrating ${event.event_name}! 🎉`
    };
    return messages[eventType] || `Celebrating ${event.event_name}! 🎉`;
  };

  const getFloatingEmojis = () => {
    const emojiSets = {
      birthday: ['🎂', '🎈', '🎁', '🎉', '✨', '💖', '🎊'],
      wedding: ['💍', '💒', '💕', '🌸', '✨', '💖', '🥂'],
      anniversary: ['💕', '❤️', '💖', '💗', '💝', '💘', '🌹', '✨'],
      party: ['🎉', '🎈', '🎊', '🪅', '✨', '💃', '🕺'],
      hangout: ['👋', '😎', '✨', '🎮', '🍕', '🎵', '💬'],
      other: ['✨', '🎉', '💫', '⭐', '🌟', '🎈', '🎊']
    };
    return emojiSets[eventType] || emojiSets.other;
  };

  return (
    <div className="min-h-screen text-gray-800" style={{
      backgroundImage: `url(${backgroundImage})`,
      backgroundSize: 'cover',
      backgroundPosition: 'center',
      backgroundAttachment: 'fixed'
    }}>
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden" style={{ background: 'rgba(0,0,0,0.3)' }}>
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
            {getFloatingEmojis()[Math.floor(Math.random() * getFloatingEmojis().length)]}
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
          <div className="text-7xl mb-6 animate-bounce">{displayConfig.emoji}</div>
          <h1 className="text-5xl md:text-7xl font-['Dancing_Script'] text-white mb-4 drop-shadow-lg">
            {getHeroTitle()}
          </h1>
          <p className="text-white/90 text-xl italic">{getHeroSubtitle()}</p>
          <p className="text-white/80 text-lg mt-4">{safeFormatDate(event.event_date)}</p>
          {event.venue && <p className="text-white/70 text-md mt-2">📍 {event.venue}</p>}
        </div>
      </section>

      {/* Love Letter Section */}
      {event.letter && (
        <section className="py-20 text-center px-6 relative z-10" style={{ background: 'rgba(255,255,255,0.92)' }}>
          <div className="max-w-3xl mx-auto">
            <div className="text-6xl mb-6">{displayConfig.emoji}</div>
            <h2 className="text-4xl font-['Dancing_Script'] text-rose-500 mb-6">A Special Message</h2>
            <p className="text-lg text-gray-600 leading-relaxed whitespace-pre-wrap">
              {event.letter}
            </p>
          </div>
        </section>
      )}

      {/* Countdown Section */}
      <section className="py-20 text-center px-6 relative z-10" style={{ background: 'rgba(255,255,255,0.88)' }}>
        <h2 className="text-3xl font-['Dancing_Script'] text-rose-500 mb-8">
          {getCountdownTitle()}
        </h2>
        <div className="flex justify-center gap-4 md:gap-6 flex-wrap">
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
            className="bg-gradient-to-r from-rose-500 to-pink-500 text-white px-10 py-4 rounded-full shadow-lg text-lg font-semibold hover:scale-105 transition-transform animate-pulse"
            style={{ animation: 'pulse-ring 2s infinite' }}
          >
            {getRevealButtonText()}
          </button>
        </section>
      )}

      {/* Revealed Content */}
      {revealed && (
        <div className="relative z-10">
          <section className="py-20 text-center" style={{ background: 'rgba(255,255,255,0.95)' }}>
            <div className="text-7xl mb-4">🎉✨🎉</div>
            <h2 className="text-5xl font-['Dancing_Script'] gradient-text">
              {getCelebrationMessage()}
            </h2>
            <p className="text-gray-600 text-lg mt-4 max-w-2xl mx-auto px-4">
              {displayConfig.defaultMessage}
            </p>
          </section>

          {event.voice_url && (
            <section className="py-10 px-6" style={{ background: 'rgba(255,255,255,0.9)' }}>
              <div className="max-w-2xl mx-auto text-center">
                <h2 className="text-3xl font-['Dancing_Script'] text-rose-500 mb-6">🎤 A Special Voice Message</h2>
                <div className="bg-white p-6 rounded-2xl shadow-lg">
                  <audio ref={voiceRef} src={event.voice_url} controls className="w-full" />
                  <p className="text-xs text-gray-500 mt-2">
                    💡 Background music volume automatically lowers when playing voice message
                  </p>
                </div>
              </div>
            </section>
          )}

          {photos.length > 0 && (
            <section className="py-10 px-6" style={{ background: 'rgba(255,255,255,0.85)' }}>
              <h2 className="text-center text-3xl font-['Dancing_Script'] text-rose-500 mb-8">Beautiful Memories 📸</h2>
              <div className="flex overflow-x-auto space-x-6 px-4 pb-4" style={{ scrollbarWidth: 'none' }}>
                {photos.map((photo, index) => (
                  <img
                    key={index}
                    src={photo.url || photo}
                    alt={`Memory ${index + 1}`}
                    className="rounded-2xl shadow-lg min-w-[280px] h-[300px] object-cover hover:scale-105 transition-transform"
                  />
                ))}
              </div>
            </section>
          )}

          <section className="py-10 text-center" style={{ background: 'rgba(255,255,255,0.9)' }}>
            <Link
              to={`/slideshow/${eventCode || identifier}`}
              className="bg-gradient-to-r from-rose-500 to-pink-500 text-white font-bold py-3 px-8 rounded-full shadow-lg hover:scale-105 transition-transform inline-block"
            >
              View Slideshow 🎬
            </Link>
          </section>
        </div>
      )}

      {/* Music Player with Volume Control */}
      <div className="fixed bottom-6 left-6 z-40 bg-white/90 backdrop-blur-sm rounded-2xl shadow-lg p-3 flex items-center gap-3">
        <audio ref={audioRef} src={audioUrl} loop preload="auto" />
        <button 
          onClick={() => {
            if (audioRef.current) {
              audioRef.current.paused ? audioRef.current.play().catch(console.error) : audioRef.current.pause();
            }
          }}
          className="bg-gradient-to-r from-rose-500 to-pink-500 text-white p-2 rounded-full hover:scale-110 transition-transform w-10 h-10 flex items-center justify-center"
        >
          🎵
        </button>
        
        {/* Volume Control Slider */}
        <div className="flex items-center gap-2">
          <span className="text-sm">🔊</span>
          <input
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={backgroundVolume}
            onChange={handleVolumeChange}
            className="w-24 h-1 bg-gray-300 rounded-lg appearance-none cursor-pointer accent-rose-500"
          />
          <span className="text-xs text-gray-500 w-8">
            {Math.round(backgroundVolume * 100)}%
          </span>
        </div>
        
        {isVoicePlaying && (
          <div className="text-xs text-rose-500 animate-pulse">
            Voice playing 🎤 (music lowered)
          </div>
        )}
      </div>
    </div>
  );
}