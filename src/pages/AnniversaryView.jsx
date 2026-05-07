import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '../supabase';
import { safeFormatDate } from '../utils/dateUtils';

export default function AnniversaryView() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const isPublicView = location.pathname.startsWith('/public');
  
  const [anniversary, setAnniversary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isOwner, setIsOwner] = useState(false);
  const [shareLink, setShareLink] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    loadAnniversary();
  }, [id]);

  const loadAnniversary = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      
      let query = supabase.from('anniversaries').select('*').eq('id', id);
      if (isPublicView) {
        query = query.eq('is_public', true);
      }
      
      const { data, error } = await query.single();
      
      if (error) throw error;
      if (!data) throw new Error('Anniversary not found');
      
      setAnniversary(data);
      setIsOwner(user?.id === data.user_id);
      
      const publicLink = `${window.location.origin}/public/anniversary/${data.id}`;
      setShareLink(publicLink);
      
    } catch (err) {
      console.error('Error loading anniversary:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this anniversary?')) return;
    try {
      await supabase.from('anniversaries').delete().eq('id', id);
      await supabase.from('event_registry').delete().eq('event_id', id).eq('event_type', 'anniversary');
      navigate('/events');
    } catch (err) {
      console.error('Error deleting anniversary:', err);
    }
  };

  const handleEdit = () => {
    navigate(`/edit-anniversary/${id}`);
  };

  const togglePublic = async () => {
    try {
      await supabase
        .from('anniversaries')
        .update({ is_public: !anniversary.is_public })
        .eq('id', id);
      
      await supabase
        .from('event_registry')
        .update({ is_public: !anniversary.is_public })
        .eq('event_id', id)
        .eq('event_type', 'anniversary');
      
      await loadAnniversary();
    } catch (err) {
      console.error('Error toggling public:', err);
    }
  };

  const copyShareLink = () => {
    navigator.clipboard.writeText(shareLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-50 to-rose-100">
        <div className="text-rose-500 text-2xl animate-pulse">Loading anniversary...</div>
      </div>
    );
  }

  if (error || !anniversary) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-50 to-rose-100">
        <div className="text-center">
          <div className="text-rose-500 text-2xl mb-4">💕</div>
          <p className="text-gray-600">Anniversary not found</p>
          <button onClick={() => navigate('/events')} className="mt-4 px-4 py-2 bg-rose-500 text-white rounded-lg">
            Back to Events
          </button>
        </div>
      </div>
    );
  }

  const memoryPhotos = anniversary.memory_photos_json || [];
  const milestones = anniversary.memories_json?.milestones || [];

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 to-rose-100 pb-12">
      {/* Header */}
      <div className="bg-white shadow-lg sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <button onClick={() => navigate('/events')} className="flex items-center gap-2 text-gray-600 hover:text-rose-500">
            ← Back to Events
          </button>
          {!isPublicView && isOwner && (
            <div className="flex items-center gap-3">
              <button onClick={togglePublic} className={`px-4 py-2 rounded-lg text-sm font-medium transition ${anniversary.is_public ? 'bg-red-100 text-red-700' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}>
                {anniversary.is_public ? '🌍 Public' : '🔒 Private'}
              </button>
              <button onClick={handleEdit} className="px-4 py-2 bg-rose-500 text-white rounded-lg hover:bg-rose-600">
                Edit
              </button>
              <button onClick={handleDelete} className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600">
                Delete
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6">
        {/* Hero Section */}
        <div className="bg-white rounded-2xl shadow-lg p-8 mt-8 mb-8">
          <div className="flex items-start justify-between mb-6">
            <div>
              <h1 className="text-4xl font-bold text-gray-800 mb-2">💕 {anniversary.couple_names}</h1>
               <p className="text-red-500 text-xl font-medium">
                 {safeFormatDate(anniversary.anniversary_date)}
               </p>
              {anniversary.years_married && (
                <p className="text-lg text-gray-600 mt-1">
                  Celebrating {anniversary.years_married} {anniversary.years_married === 1 ? 'year' : 'years'} together 💍
                </p>
              )}
            </div>
            <div className="text-right">
              {anniversary.is_public && (
                <div className="mb-2">
                  <span className="inline-block px-4 py-2 bg-red-100 text-red-700 rounded-full text-sm font-medium">
                    🔗 Shareable Link
                  </span>
                </div>
              )}
            </div>
          </div>

          {anniversary.is_public && isOwner && (
            <div className="mb-6 p-4 bg-gradient-to-r from-red-50 to-pink-50 rounded-xl">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Shareable Public Link</p>
                  <p className="text-xs text-gray-500">Anyone with this link can view</p>
                </div>
                <button onClick={copyShareLink} className="px-4 py-2 bg-red-500 text-white rounded-lg text-sm hover:bg-red-600 transition flex items-center gap-2">
                  {copied ? '✓ Copied!' : 'Copy Link'}
                </button>
              </div>
              <input type="text" value={shareLink} readOnly className="w-full mt-2 px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm" />
            </div>
          )}
        </div>

        {/* Details Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* About */}
          <div className="bg-white rounded-2xl shadow-lg p-8">
            <h2 className="text-2xl font-bold text-gray-800 mb-6">Our Story</h2>
            
            {anniversary.special_memory && (
              <div className="mb-6">
                <h3 className="text-sm font-medium text-gray-500 mb-2">A Special Memory</h3>
                <p className="text-gray-700 leading-relaxed bg-red-50 p-4 rounded-lg border-l-4 border-red-300">
                  {anniversary.special_memory}
                </p>
              </div>
            )}

            {anniversary.gift_idea && (
              <div className="mb-6">
                <h3 className="text-sm font-medium text-gray-500 mb-2">Gift Idea</h3>
                <p className="text-gray-700">{anniversary.gift_idea}</p>
              </div>
            )}

            {anniversary.celebration_plan && (
              <div className="mb-6">
                <h3 className="text-sm font-medium text-gray-500 mb-2">Celebration Plan</h3>
                <p className="text-gray-700">{anniversary.celebration_plan}</p>
              </div>
            )}
          </div>

          {/* Memories */}
          {(milestones.length > 0 || memoryPhotos.length > 0) && (
            <div className="bg-white rounded-2xl shadow-lg p-8">
              <h2 className="text-2xl font-bold text-gray-800 mb-6">Memories</h2>
              
              {memoryPhotos.length > 0 && (
                <div className="mb-6">
                  <h3 className="text-lg font-bold text-gray-800 mb-4">Photo Memories</h3>
                  <div className="grid grid-cols-2 gap-3">
                    {memoryPhotos.slice(0, 4).map((photo, i) => (
                      <div key={i} className="aspect-square bg-gray-100 rounded-lg flex items-center justify-center text-gray-400">
                        {typeof photo === 'string' ? (
                          <img src={photo} alt={`Memory ${i + 1}`} className="w-full h-full object-cover rounded-lg" />
                        ) : (
                          '📷'
                        )}
                      </div>
                    ))}
                    {memoryPhotos.length > 4 && (
                      <div className="aspect-square bg-gray-100 rounded-lg flex items-center justify-center text-gray-400">
                        +{memoryPhotos.length - 4}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {milestones.length > 0 && (
                <div>
                  <h3 className="text-lg font-bold text-gray-800 mb-4">Our Journey</h3>
                  <div className="space-y-4">
                    {milestones.map((milestone, i) => (
                      <div key={i} className="flex items-start gap-3 p-3 bg-red-50 rounded-lg">
                        <span className="text-rose-500 font-bold mt-0.5">❤️</span>
                        <div>
                          <p className="font-medium text-gray-800">{milestone.title || milestone}</p>
                          {milestone.description && <p className="text-sm text-gray-600">{milestone.description}</p>}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
