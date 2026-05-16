import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../supabase';
import { getEventSchema, getEventDisplay } from '../config/eventSchemas';

export default function EditEvent() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [event, setEvent] = useState(null);
  const [eventType, setEventType] = useState(null);
  const [eventId, setEventId] = useState(null);
  const [formData, setFormData] = useState({
    event_name: '',
    event_date: '',
    is_public: false,
    background_image: '',
    audio_url: '',
    voice_url: '',
    letter: '',
    photos: []
  });
  const [specificData, setSpecificData] = useState({});
  
  // Voice recording states
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const timerRef = useRef(null);

  useEffect(() => {
    loadEvent();
  }, [id]);

  const getDisplay = () => getEventDisplay(eventType);
  const getSchema = () => getEventSchema(eventType);

  // Request microphone permission
  const requestMicrophonePermission = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      return stream;
    } catch (err) {
      console.error('Microphone permission denied:', err);
      alert('Please allow microphone access to record your voice message.');
      return null;
    }
  };

  // Start recording
  const startRecording = async () => {
    const stream = await requestMicrophonePermission();
    if (!stream) return;

    audioChunksRef.current = [];
    const mediaRecorder = new MediaRecorder(stream);
    mediaRecorderRef.current = mediaRecorder;

    mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        audioChunksRef.current.push(event.data);
      }
    };

    mediaRecorder.onstop = async () => {
      const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
      const audioFile = new File([audioBlob], `voice-recording-${Date.now()}.webm`, { type: 'audio/webm' });
      
      setUploading(true);
      const url = await uploadAudioFile(audioFile);
      if (url) {
        setFormData(prev => ({ ...prev, voice_url: url }));
      }
      setUploading(false);
      
      stream.getTracks().forEach(track => track.stop());
    };

    mediaRecorder.start();
    setIsRecording(true);
    
    setRecordingTime(0);
    timerRef.current = setInterval(() => {
      setRecordingTime(prev => prev + 1);
    }, 1000);
  };

  // Stop recording
  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    }
  };

  // Cancel recording
  const cancelRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    }
    audioChunksRef.current = [];
  };

  // Upload audio file to Cloudinary
  const uploadAudioFile = async (file) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', 'ml_default');
    formData.append('resource_type', 'video');

    try {
      const res = await fetch(`https://api.cloudinary.com/v1_1/djjgkezui/video/upload`, {
        method: 'POST',
        body: formData
      });
      const data = await res.json();
      return data.secure_url;
    } catch (err) {
      console.error('Upload error:', err);
      return null;
    }
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const loadEvent = async () => {
    try {
      setLoading(true);
      
      const isCode = isNaN(id) || /[A-Za-z]/.test(id);
      let registryId = null;
      let actualEventId = null;
      
      if (isCode) {
        const { data: registry, error: registryError } = await supabase
          .from('event_registry')
          .select('*')
          .eq('code', id)
          .single();
        
        if (registryError) throw registryError;
        setEvent(registry);
        setEventType(registry.event_type);
        actualEventId = registry.event_id;
        registryId = registry.id;
        
        let parsedPhotos = [];
        if (registry.photos) {
          try {
            parsedPhotos = typeof registry.photos === 'string' ? JSON.parse(registry.photos) : registry.photos;
          } catch (e) {
            parsedPhotos = [];
          }
        }
        
        setFormData({
          event_name: registry.event_name,
          event_date: registry.event_date,
          is_public: registry.is_public || false,
          background_image: registry.background_image || '',
          audio_url: registry.audio_url || '',
          voice_url: registry.voice_url || '',
          letter: registry.letter || '',
          photos: parsedPhotos
        });
      } else {
        const { data: registry, error: registryError } = await supabase
          .from('event_registry')
          .select('*')
          .eq('event_id', parseInt(id))
          .single();
        
        if (registryError) throw registryError;
        setEvent(registry);
        setEventType(registry.event_type);
        actualEventId = registry.event_id;
        registryId = registry.id;
        
        let parsedPhotos = [];
        if (registry.photos) {
          try {
            parsedPhotos = typeof registry.photos === 'string' ? JSON.parse(registry.photos) : registry.photos;
          } catch (e) {
            parsedPhotos = [];
          }
        }
        
        setFormData({
          event_name: registry.event_name,
          event_date: registry.event_date,
          is_public: registry.is_public || false,
          background_image: registry.background_image || '',
          audio_url: registry.audio_url || '',
          voice_url: registry.voice_url || '',
          letter: registry.letter || '',
          photos: parsedPhotos
        });
      }
      
      setEventId(actualEventId);
      
      // Load specific table data if not birthday
      if (eventType !== 'birthday' && actualEventId) {
        const schema = getSchema();
        const { data: specific, error: specificError } = await supabase
          .from(schema.table)
          .select('*')
          .eq('id', actualEventId)
          .single();
        
        if (!specificError && specific) {
          setSpecificData(specific);
        }
      }
      
    } catch (err) {
      console.error('Error loading event:', err);
      alert('Event not found');
      navigate('/dashboard');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    if (name.startsWith('specific_')) {
      const fieldName = name.replace('specific_', '');
      setSpecificData(prev => ({ ...prev, [fieldName]: value }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: type === 'checkbox' ? checked : value
      }));
    }
  };

  const handleFileUpload = async (file, type) => {
    if (!file) return null;
    
    const maxSize = type === 'audio' ? 10 * 1024 * 1024 : 5 * 1024 * 1024;
    if (file.size > maxSize) {
      alert(`File too large! Max ${maxSize / (1024 * 1024)}MB`);
      return null;
    }

    const uploadData = new FormData();
    uploadData.append('file', file);
    uploadData.append('upload_preset', 'ml_default');
    if (type === 'audio') uploadData.append('resource_type', 'video');

    try {
      const resourceType = type === 'audio' ? 'video' : 'image';
      const res = await fetch(`https://api.cloudinary.com/v1_1/djjgkezui/${resourceType}/upload`, {
        method: 'POST',
        body: uploadData
      });
      const data = await res.json();
      return data.secure_url;
    } catch (err) {
      console.error('Upload error:', err);
      return null;
    }
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    const url = await handleFileUpload(file, 'image');
    if (url) {
      setFormData(prev => ({ ...prev, background_image: url }));
    }
    setUploading(false);
  };

  const handleAudioUpload = async (e, field) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    const url = await handleFileUpload(file, 'audio');
    if (url) {
      setFormData(prev => ({ ...prev, [field]: url }));
    }
    setUploading(false);
  };

  const handlePhotoUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (!files.length) return;
    setUploading(true);
    
    const newPhotos = [...formData.photos];
    for (const file of files) {
      const url = await handleFileUpload(file, 'image');
      if (url) {
        newPhotos.push({ url, uploadedAt: new Date().toISOString() });
      }
    }
    
    setFormData(prev => ({ ...prev, photos: newPhotos }));
    setUploading(false);
  };

  const removePhoto = (index) => {
    setFormData(prev => ({
      ...prev,
      photos: prev.photos.filter((_, i) => i !== index)
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Update event_registry
      const updateData = {
        event_name: formData.event_name,
        event_date: formData.event_date,
        is_public: formData.is_public,
        background_image: formData.background_image || null,
        audio_url: formData.audio_url || null,
        voice_url: formData.voice_url || null,
        letter: formData.letter || null,
        photos: formData.photos.length > 0 ? JSON.stringify(formData.photos) : null,
        updated_at: new Date().toISOString()
      };

      const { error: registryError } = await supabase
        .from('event_registry')
        .update(updateData)
        .eq('id', event.id);

      if (registryError) throw registryError;

      // Update specific table if not birthday
      if (eventType !== 'birthday' && eventId) {
        const schema = getSchema();
        const specificUpdateData = { ...specificData, updated_at: new Date().toISOString() };
        
        delete specificUpdateData.id;
        delete specificUpdateData.user_id;
        delete specificUpdateData.created_at;
        
        const { error: specificError } = await supabase
          .from(schema.table)
          .update(specificUpdateData)
          .eq('id', eventId);
        
        if (specificError) throw specificError;
      }

      alert('Event updated successfully!');
      navigate('/dashboard');

    } catch (err) {
      console.error('Error updating event:', err);
      alert('Error updating event: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const getEventTypeDisplay = () => {
    const displays = {
      birthday: { emoji: '🎂', title: 'Birthday', gradient: 'from-rose-500 to-pink-500' },
      wedding: { emoji: '💍', title: 'Wedding', gradient: 'from-pink-500 to-rose-500' },
      anniversary: { emoji: '💕', title: 'Anniversary', gradient: 'from-red-500 to-rose-500' },
      party: { emoji: '🎉', title: 'Party', gradient: 'from-purple-500 to-indigo-500' },
      hangout: { emoji: '👋', title: 'Hangout', gradient: 'from-blue-500 to-cyan-500' },
      other: { emoji: '📅', title: 'Event', gradient: 'from-gray-500 to-gray-700' }
    };
    return displays[eventType] || displays.birthday;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-rose-50 to-pink-100">
        <div className="text-rose-500 text-2xl animate-pulse">Loading event...</div>
      </div>
    );
  }

  const typeDisplay = getEventTypeDisplay();
  const display = getDisplay();

  return (
    <div className="min-h-screen bg-gradient-to-br from-rose-50 via-pink-50 to-purple-50 py-12 px-4">
      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-8">
          <button onClick={() => navigate('/dashboard')} className="float-left text-rose-500 hover:text-rose-600 mb-4">
            ← Back to Dashboard
          </button>
          <div className="text-6xl mb-4">{typeDisplay.emoji}</div>
          <h1 className="text-4xl font-['Dancing_Script'] text-rose-500">
            Edit {typeDisplay.title} Page
          </h1>
          <p className="text-gray-600 mt-2">Update your event details and make it special</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-white rounded-3xl shadow-2xl p-8 space-y-6">
          {/* Basic Info */}
          <div>
            <label className="block text-gray-700 font-semibold mb-2">
              {eventType === 'wedding' ? 'Couple Names' : 
               eventType === 'anniversary' ? 'Couple Names' :
               eventType === 'party' ? 'Party Name' :
               eventType === 'hangout' ? 'Hangout Name' : 'Event Name'} *
            </label>
            <input
              type="text"
              name="event_name"
              value={formData.event_name}
              onChange={handleChange}
              required
              className="w-full p-3 border-2 border-rose-200 rounded-xl focus:border-rose-400 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-gray-700 font-semibold mb-2">
              {eventType === 'wedding' ? 'Wedding Date' :
               eventType === 'anniversary' ? 'Anniversary Date' :
               eventType === 'party' ? 'Party Date' :
               eventType === 'hangout' ? 'Hangout Date' : 'Event Date'} *
            </label>
            <input
              type="date"
              name="event_date"
              value={formData.event_date}
              onChange={handleChange}
              required
              className="w-full p-3 border-2 border-rose-200 rounded-xl focus:border-rose-400 focus:outline-none"
            />
          </div>

          {/* Event-Specific Fields */}
          {eventType !== 'birthday' && (
            <div className="border-t-2 border-rose-100 pt-6">
              <h3 className="text-lg font-bold text-gray-800 mb-4">Event Details</h3>
              
              {eventType === 'wedding' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-gray-600 mb-1">Venue</label>
                      <input type="text" name="specific_venue" value={specificData.venue || ''} onChange={handleChange} className="w-full p-2 border-2 border-rose-200 rounded-xl" />
                    </div>
                    <div>
                      <label className="block text-gray-600 mb-1">Venue Address</label>
                      <input type="text" name="specific_venue_address" value={specificData.venue_address || ''} onChange={handleChange} className="w-full p-2 border-2 border-rose-200 rounded-xl" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-gray-600 mb-1">Theme</label>
                      <input type="text" name="specific_theme" value={specificData.theme || ''} onChange={handleChange} className="w-full p-2 border-2 border-rose-200 rounded-xl" />
                    </div>
                    <div>
                      <label className="block text-gray-600 mb-1">Dress Code</label>
                      <input type="text" name="specific_dress_code" value={specificData.dress_code || ''} onChange={handleChange} className="w-full p-2 border-2 border-rose-200 rounded-xl" />
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <label className="block text-gray-600 mb-1">Photographer</label>
                      <input type="text" name="specific_photographer" value={specificData.photographer || ''} onChange={handleChange} className="w-full p-2 border-2 border-rose-200 rounded-xl" />
                    </div>
                    <div>
                      <label className="block text-gray-600 mb-1">Caterer</label>
                      <input type="text" name="specific_caterer" value={specificData.caterer || ''} onChange={handleChange} className="w-full p-2 border-2 border-rose-200 rounded-xl" />
                    </div>
                    <div>
                      <label className="block text-gray-600 mb-1">Florist</label>
                      <input type="text" name="specific_florist" value={specificData.florist || ''} onChange={handleChange} className="w-full p-2 border-2 border-rose-200 rounded-xl" />
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Rich Media Section - Same as CreateEvent */}
          <div className="border-t-2 border-rose-100 pt-6">
            <h3 className="text-lg font-bold text-gray-800 mb-4">Make It Special ✨</h3>
            
            {/* Love Letter */}
            <div className="mb-4">
              <label className="block text-gray-700 font-semibold mb-2">💌 Love Letter / Message</label>
              <textarea
                name="letter"
                value={formData.letter || ''}
                onChange={handleChange}
                rows={5}
                className="w-full p-3 border-2 border-rose-200 rounded-xl"
                placeholder="Write a heartfelt message..."
              />
            </div>

            {/* Background Image */}
            <div className="mb-4">
              <label className="block text-gray-700 font-semibold mb-2">Background Image</label>
              <input
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                disabled={uploading}
                className="w-full p-2 border-2 border-rose-200 rounded-xl"
              />
              {formData.background_image && (
                <img src={formData.background_image} alt="Background" className="mt-2 w-full h-32 object-cover rounded-xl" />
              )}
            </div>

            {/* Background Music */}
            <div className="mb-4">
              <label className="block text-gray-700 font-semibold mb-2">Background Music</label>
              <input
                type="file"
                accept="audio/*"
                onChange={(e) => handleAudioUpload(e, 'audio_url')}
                disabled={uploading}
                className="w-full p-2 border-2 border-rose-200 rounded-xl"
              />
              {formData.audio_url && <audio src={formData.audio_url} controls className="mt-2 w-full" />}
            </div>

            {/* Voice Recording */}
            <div className="mb-4">
              <label className="block text-gray-700 font-semibold mb-2">🎤 Voice Recording / Personal Message</label>
              
              {!formData.voice_url ? (
                <div className="space-y-3">
                  {!isRecording ? (
                    <button
                      type="button"
                      onClick={startRecording}
                      className="w-full py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-xl font-semibold hover:shadow-lg transition flex items-center justify-center gap-2"
                    >
                      <span className="text-xl">🎙️</span> Start Recording
                    </button>
                  ) : (
                    <div className="space-y-3">
                      <div className="flex items-center justify-center gap-4 p-4 bg-red-50 rounded-xl">
                        <div className="animate-pulse">
                          <span className="text-red-500 text-2xl">🔴</span>
                        </div>
                        <div className="text-center">
                          <div className="text-2xl font-mono font-bold text-red-500">
                            {formatTime(recordingTime)}
                          </div>
                          <p className="text-sm text-gray-500">Recording in progress...</p>
                        </div>
                      </div>
                      <div className="flex gap-3">
                        <button
                          type="button"
                          onClick={stopRecording}
                          className="flex-1 py-2 bg-green-500 text-white rounded-lg font-semibold hover:bg-green-600 transition"
                        >
                          ✓ Stop & Save
                        </button>
                        <button
                          type="button"
                          onClick={cancelRecording}
                          className="flex-1 py-2 bg-gray-300 text-gray-700 rounded-lg font-semibold hover:bg-gray-400 transition"
                        >
                          ✕ Cancel
                        </button>
                      </div>
                    </div>
                  )}
                  
                  <div className="text-center text-sm text-gray-500">
                    or 
                    <label className="ml-2 text-rose-500 cursor-pointer hover:underline">
                      upload from file
                      <input
                        type="file"
                        accept="audio/*"
                        onChange={async (e) => {
                          const file = e.target.files[0];
                          if (file) {
                            setUploading(true);
                            const url = await handleFileUpload(file, 'audio');
                            if (url) setFormData(prev => ({ ...prev, voice_url: url }));
                            setUploading(false);
                          }
                        }}
                        className="hidden"
                      />
                    </label>
                  </div>
                </div>
              ) : (
                <div className="p-4 bg-green-50 rounded-xl">
                  <audio src={formData.voice_url} controls className="w-full mb-3" />
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, voice_url: null }))}
                      className="flex-1 py-2 bg-red-500 text-white rounded-lg text-sm hover:bg-red-600"
                    >
                      Remove Recording
                    </button>
                    <button
                      type="button"
                      onClick={startRecording}
                      className="flex-1 py-2 bg-purple-500 text-white rounded-lg text-sm hover:bg-purple-600"
                    >
                      Record New
                    </button>
                  </div>
                </div>
              )}
              
              <p className="text-xs text-gray-500 mt-2">
                Record a personal voice message or upload an audio file (MP3, WAV, up to 10MB)
              </p>
            </div>

            {/* Photo Gallery */}
            <div className="mb-4">
              <label className="block text-gray-700 font-semibold mb-2">Photo Gallery ({formData.photos.length} photos)</label>
              <input
                type="file"
                accept="image/*"
                multiple
                onChange={handlePhotoUpload}
                disabled={uploading}
                className="w-full p-2 border-2 border-rose-200 rounded-xl"
              />
              <div className="grid grid-cols-3 gap-2 mt-3">
                {formData.photos.map((photo, idx) => (
                  <div key={idx} className="relative">
                    <img src={photo.url} alt={`Photo ${idx + 1}`} className="w-full h-24 object-cover rounded-lg" />
                    <button
                      type="button"
                      onClick={() => removePhoto(idx)}
                      className="absolute top-1 right-1 bg-red-500 text-white rounded-full w-5 h-5 text-xs"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Public Toggle */}
          <div className="flex items-center gap-3 p-4 bg-rose-50 rounded-xl">
            <input
              type="checkbox"
              name="is_public"
              checked={formData.is_public}
              onChange={handleChange}
              className="w-5 h-5 accent-rose-500"
            />
            <label className="text-gray-700 font-medium">Make this event public (shareable link)</label>
          </div>

          {uploading && (
            <div className="text-center text-rose-500">Uploading... Please wait</div>
          )}

          <div className="flex gap-4 pt-4">
            <button
              type="button"
              onClick={() => navigate('/dashboard')}
              className="flex-1 px-6 py-3 bg-gray-200 text-gray-700 rounded-xl font-semibold hover:bg-gray-300"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving || uploading}
              className={`flex-1 px-6 py-3 bg-gradient-to-r ${typeDisplay.gradient} text-white rounded-xl font-semibold hover:shadow-lg disabled:opacity-50`}
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}