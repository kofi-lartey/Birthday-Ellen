import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '../supabase';
import { getSlideshowConfig, getEventSchema, getEventDisplay, getTableForOrderType } from '../config/orderTypeMapping';
import { safeFormatDate, safeFormatTime } from '../utils/dateUtils';

/**
 * Generic Event View Component
 * Dynamically renders event pages based on order type
 */
function GenericEventView() {
  const { eventType, id } = useParams();
  const [eventData, setEventData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isPublicView, setIsPublicView] = useState(false);

  useEffect(() => {
    const path = window.location.pathname;
    setIsPublicView(path.includes('/public/'));
    loadEventData();
  }, [eventType, id]);

  const loadEventData = async () => {
    try {
      setLoading(true);
      const table = getTableForOrderType(eventType);
      
      const { data, error } = await supabase
        .from(table)
        .select('*')
        .eq('id', id)
        .limit(1)
        .single();

      if (error) throw error;
      
      setEventData(data);
    } catch (err) {
      console.error(`Error loading ${eventType} data:`, err);
      setError(`Could not load ${eventType} data`);
    } finally {
      setLoading(false);
    }
  };

  const displayConfig = getEventDisplay(eventType);
  const schema = getEventSchema(eventType);
  const slideshowConfig = getSlideshowConfig(eventType);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-rose-50 via-pink-50 to-purple-50">
        <div className="text-rose-500 text-2xl animate-pulse">Loading event...</div>
      </div>
    );
  }

  if (error || !eventData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-rose-50 via-pink-50 to-purple-50">
        <div className="text-rose-500 text-2xl">Event not found</div>
      </div>
    );
  }

  // Dynamic field rendering based on schema
  const renderField = (field) => {
    const value = eventData[field.name];
    
    if (!value && value !== 0) return null;
    
    switch (field.type) {
      case 'checkbox':
        return (
          <div key={field.name} className="flex items-center gap-2">
            <span className="text-gray-600">{field.label}:</span>
            <span className={`px-2 py-1 rounded-full text-xs font-semibold ${value ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'}`}>
              {value ? 'Yes' : 'No'}
            </span>
          </div>
        );
      case 'textarea':
        return (
          <div key={field.name} className="mb-4">
            <h4 className="font-semibold text-gray-700 mb-1">{field.label}</h4>
            <p className="text-gray-600 bg-gray-50 p-3 rounded-lg">{value}</p>
          </div>
        );
        case 'date':
          return (
            <div key={field.name} className="flex items-center gap-2">
              <span className="text-gray-600">{field.label}:</span>
              <span className="font-medium">{safeFormatDate(value)}</span>
            </div>
          );
        case 'time':
          return (
            <div key={field.name} className="flex items-center gap-2">
              <span className="text-gray-600">{field.label}:</span>
              <span className="font-medium">{safeFormatTime(value)}</span>
            </div>
          );
      case 'number':
        return (
          <div key={field.name} className="flex items-center gap-2">
            <span className="text-gray-600">{field.label}:</span>
            <span className="font-medium">{value}</span>
          </div>
        );
      default:
        return (
          <div key={field.name} className="flex items-center gap-2">
            <span className="text-gray-600">{field.label}:</span>
            <span className="font-medium">{value}</span>
          </div>
        );
    }
  };

  // Render JSON fields
  const renderJSONField = (key, label) => {
    const value = eventData[key];
    if (!value) return null;
    
    let parsed;
    try {
      parsed = typeof value === 'string' ? JSON.parse(value) : value;
    } catch {
      return null;
    }
    
    return (
      <div key={key} className="mb-4">
        <h4 className="font-semibold text-gray-700 mb-2">{label}</h4>
        <div className="bg-gray-50 p-3 rounded-lg">
          <pre className="text-xs text-gray-600 overflow-x-auto">
            {JSON.stringify(parsed, null, 2)}
          </pre>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen" style={{ 
      background: `linear-gradient(135deg, ${displayConfig.color === 'rose' ? '#fce7f3' : 
                                        displayConfig.color === 'red' ? '#fef2f2' :
                                        displayConfig.color === 'purple' ? '#faf5ff' :
                                        displayConfig.color === 'blue' ? '#eff6ff' :
                                        displayConfig.color === 'gray' ? '#f9fafb' : '#fce7f3'} 0%, 
                                       ${displayConfig.bgGradient.split(' ').slice(1).join(' ')} 100%)` 
    }}>
      {/* Header */}
      <div className="bg-white/80 backdrop-blur-md shadow-sm">
        <div className="max-w-4xl mx-auto px-4 py-4 flex justify-between items-center">
          <Link to="/events" className="text-rose-500 hover:text-rose-600 transition">
            ← Back to Events
          </Link>
          <h1 className="text-2xl font-bold text-gray-800" style={{ color: `var(--${displayConfig.color}-600, #ec4899)` }}>
            {displayConfig.emoji} {displayConfig.title}
          </h1>
          <div className="w-20"></div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Event Card */}
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
          {/* Event Header */}
          <div className="p-8 text-center" style={{ 
            background: `linear-gradient(135deg, ${displayConfig.color === 'rose' ? '#fde4e8' : 
                                          displayConfig.color === 'red' ? '#fef2f2' :
                                          displayConfig.color === 'purple' ? '#f3e8ff' :
                                          displayConfig.color === 'blue' ? '#dbeafe' :
                                          displayConfig.color === 'gray' ? '#e5e7eb' : '#fde4e8'} 0%, 
                                         ${displayConfig.color === 'rose' ? '#fce7f3' : 
                                           displayConfig.color === 'red' ? '#fdf2f8' :
                                           displayConfig.color === 'purple' ? '#faf5ff' :
                                           displayConfig.color === 'blue' ? '#eff6ff' :
                                           displayConfig.color === 'gray' ? '#f9fafb' : '#fce7f3'} 100%)` 
          }}>
            <div className="text-6xl mb-4">{displayConfig.emoji}</div>
            <h2 className="text-3xl font-bold text-gray-800 mb-2">
              {eventData.event_name || eventData.couple_names || eventData.party_name || eventData.hangout_name || 'Special Event'}
            </h2>
            {eventData.event_date && (
              <p className="text-gray-600">
                {safeFormatDate(eventData.event_date)}
              </p>
            )}
            {eventData.is_public && (
              <span className="inline-block mt-3 px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm font-medium">
                🌍 Public Event
              </span>
            )}
          </div>

          {/* Event Details */}
          <div className="p-8">
            <div className="grid md:grid-cols-2 gap-8">
              {/* Main Details */}
              <div>
                <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                  <svg className="w-5 h-5" style={{ color: `var(--${displayConfig.color}-600, #ec4899)` }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                  Event Details
                </h3>
                <div className="space-y-3">
                  {schema.detailFields.slice(0, 8).map(renderField)}
                </div>
              </div>

              {/* Additional Info */}
              <div>
                <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                  <svg className="w-5 h-5" style={{ color: `var(--${displayConfig.color}-600, #ec4899)` }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                  </svg>
                  Additional Information
                </h3>
                
                {/* JSON Fields */}
                {eventType === 'wedding' && (
                  <>
                    {eventData.vendors_json && renderJSONField('vendors_json', 'Vendors')}
                    {eventData.guest_list_json && renderJSONField('guest_list_json', 'Guest List')}
                    {eventData.timeline_json && renderJSONField('timeline_json', 'Timeline')}
                  </>
                )}
                
                {eventType === 'party' && (
                  <>
                    {eventData.activities_json && renderJSONField('activities_json', 'Activities')}
                    {eventData.playlist_json && renderJSONField('playlist_json', 'Playlist')}
                    {eventData.dietary_restrictions_json && renderJSONField('dietary_restrictions_json', 'Dietary Restrictions')}
                  </>
                )}
                
                {eventType === 'hangout' && (
                  <>
                    {eventData.chill_activities_json && renderJSONField('chill_activities_json', 'Activities')}
                    {eventData.music_playlist_json && renderJSONField('music_playlist_json', 'Music Playlist')}
                  </>
                )}
                
                {eventType === 'other' && eventData.custom_fields && (
                  renderJSONField('custom_fields', 'Custom Details')
                )}

                {/* Metadata */}
                <div className="mt-6 pt-4 border-t border-gray-200">
                  <p className="text-sm text-gray-500">
                    Created: {new Date(eventData.created_at).toLocaleString()}
                  </p>
                  {eventData.updated_at !== eventData.created_at && (
                    <p className="text-sm text-gray-500">
                      Updated: {new Date(eventData.updated_at).toLocaleString()}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="mt-8 pt-6 border-t border-gray-200 flex gap-4">
              {!isPublicView && (
                <Link
                  to={`/edit-${eventType}/${id}`}
                  className="flex-1 text-center py-3 px-4 bg-gradient-to-r from-rose-500 to-pink-500 text-white rounded-lg font-medium hover:shadow-lg transition"
                >
                  Edit Event
                </Link>
              )}
              
              {eventData.is_public && (
                <button
                  onClick={() => {
                    const url = `${window.location.origin}/public/${eventType}/${id}`;
                    navigator.clipboard.writeText(url);
                    alert('Public link copied to clipboard!');
                  }}
                  className="flex-1 py-3 px-4 border-2 border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition"
                >
                  🔗 Copy Public Link
                </button>
              )}
              
              {!isPublicView && (
                <button
                  onClick={() => {
                    const shareUrl = eventData.is_public 
                      ? `${window.location.origin}/public/${eventType}/${id}`
                      : window.location.href;
                    const text = `Check out this ${displayConfig.celebrationName.toLowerCase()}! ${shareUrl}`;
                    
                    if (navigator.share) {
                      navigator.share({ title: displayConfig.title, text, url: shareUrl });
                    } else {
                      navigator.clipboard.writeText(text);
                      alert('Link copied to clipboard!');
                    }
                  }}
                  className="flex-1 py-3 px-4 border-2" 
                  style={{ borderColor: `var(--${displayConfig.color}-600, #ec4899)`, color: `var(--${displayConfig.color}-600, #ec4899)` }}
                >
                  📤 Share
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Slideshow Preview Section */}
        {(eventType === 'birthday' || eventType === 'wedding' || eventType === 'anniversary') && (
          <div className="mt-8">
            <h3 className="text-2xl font-bold text-gray-800 mb-4">
              🎬 {displayConfig.celebrationName} Slideshow
            </h3>
            <div className="bg-white rounded-2xl shadow-xl p-8">
              <p className="text-gray-600 mb-4">
                Create a beautiful slideshow with memories and messages for this special occasion.
              </p>
              <div className="flex gap-4">
                <Link
                  to={`/slideshow/${eventId || id}`}
                  className="px-6 py-3 bg-gradient-to-r from-rose-500 to-pink-500 text-white rounded-lg font-medium hover:shadow-lg transition"
                >
                  View Slideshow
                </Link>
                <Link
                  to={`/upload/${eventId || id}`}
                  className="px-6 py-3 border-2 border-rose-500 text-rose-500 rounded-lg font-medium hover:bg-rose-50 transition"
                >
                  Add Photos & Messages
                </Link>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default GenericEventView;