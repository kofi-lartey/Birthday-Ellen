import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '../supabase';
import { safeFormatDate } from '../utils/dateUtils';

export default function HangoutView() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const isPublicView = location.pathname.startsWith('/public');
  
  const [hangout, setHangout] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isOwner, setIsOwner] = useState(false);
  const [rsvpList, setRsvpList] = useState([]);
  const [showRSVP, setShowRSVP] = useState(false);
  const [shareLink, setShareLink] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    loadHangout();
  }, [id]);

  const loadHangout = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      
      let query = supabase.from('hangouts').select('*').eq('id', id);
      if (isPublicView) {
        query = query.eq('is_public', true);
      }
      
      const { data, error } = await query.single();
      
      if (error) throw error;
      if (!data) throw new Error('Hangout not found');
      
      setHangout(data);
      setIsOwner(user?.id === data.user_id);
      
      loadRSVPs(data.id);
      
      const publicLink = `${window.location.origin}/public/hangout/${data.id}`;
      setShareLink(publicLink);
      
    } catch (err) {
      console.error('Error loading hangout:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const loadRSVPs = async (hangoutId) => {
    try {
      const { data, error } = await supabase
        .from('hangout_rsvps')
        .select('*')
        .eq('hangout_id', hangoutId)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      setRsvpList(data || []);
    } catch (err) {
      console.error('Error loading RSVPs:', err);
    }
  };

  const handleRSVP = async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const guestName = formData.get('guestName');
    const guestEmail = formData.get('guestEmail');
    const status = formData.get('status');
    const message = formData.get('message');

    try {
      const { data: hangoutData } = await supabase
        .from('hangouts')
        .select('who_coming')
        .eq('id', id)
        .single();

      const current = hangoutData?.who_coming || '';
      const names = current ? current.split(',').map(s => s.trim()).filter(Boolean) : [];
      if (!names.some(n => n.toLowerCase() === guestName.toLowerCase())) {
        names.push(guestName);
      }

      await supabase
        .from('hangouts')
        .update({ 
          who_coming: names.join(', ')
        })
        .eq('id', id);

      await supabase
        .from('hangout_rsvps')
        .upsert({
          hangout_id: parseInt(id),
          guest_name: guestName,
          guest_email: guestEmail,
          status,
          message: message || '',
          rsvp_date: new Date()
        });

      await loadRSVPs(id);
      await loadHangout();
      
      e.target.reset();
      setShowRSVP(false);
      alert('RSVP submitted successfully!');
    } catch (err) {
      console.error('Error submitting RSVP:', err);
      alert('Error submitting RSVP');
    }
  };

  const handleDeleteRSVP = async (rsvpId) => {
    if (!confirm('Remove this RSVP?')) return;
    try {
      await supabase.from('hangout_rsvps').delete().eq('id', rsvpId);
      await loadRSVPs(id);
    } catch (err) {
      console.error('Error deleting RSVP:', err);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this hangout?')) return;
    try {
      await supabase.from('hangouts').delete().eq('id', id);
      await supabase.from('event_registry').delete().eq('event_id', id).eq('event_type', 'hangout');
      navigate('/events');
    } catch (err) {
      console.error('Error deleting hangout:', err);
    }
  };

  const handleEdit = () => {
    navigate(`/edit-hangout/${id}`);
  };

  const togglePublic = async () => {
    try {
      await supabase
        .from('hangouts')
        .update({ is_public: !hangout.is_public })
        .eq('id', id);
      
      await supabase
        .from('event_registry')
        .update({ is_public: !hangout.is_public })
        .eq('event_id', id)
        .eq('event_type', 'hangout');
      
      await loadHangout();
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
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-cyan-100">
        <div className="text-blue-500 text-2xl animate-pulse">Loading hangout...</div>
      </div>
    );
  }

  if (error || !hangout) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-cyan-100">
        <div className="text-center">
          <div className="text-blue-500 text-2xl mb-4">👋</div>
          <p className="text-gray-600">Hangout not found</p>
          <button onClick={() => navigate('/events')} className="mt-4 px-4 py-2 bg-blue-500 text-white rounded-lg">
            Back to Events
          </button>
        </div>
      </div>
    );
  }

  const chillActivities = hangout.chill_activities_json || [];
  const musicPlaylist = hangout.music_playlist_json || [];
  const guestList = hangout.who_coming ? hangout.who_coming.split(',').map(s => s.trim()).filter(Boolean) : [];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-cyan-100 pb-12">
      <div className="bg-white shadow-lg sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <button onClick={() => navigate('/events')} className="flex items-center gap-2 text-gray-600 hover:text-blue-500">
            ← Back to Events
          </button>
          {!isPublicView && isOwner && (
            <div className="flex items-center gap-3">
              <button onClick={togglePublic} className={`px-4 py-2 rounded-lg text-sm font-medium transition ${hangout.is_public ? 'bg-blue-100 text-blue-700' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}>
                {hangout.is_public ? '🌍 Public' : '🔒 Private'}
              </button>
              <button onClick={handleEdit} className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600">
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
        <div className="bg-white rounded-2xl shadow-lg p-8 mt-8 mb-8">
          <div className="flex items-start justify-between mb-6">
            <div>
              <h1 className="text-4xl font-bold text-gray-800 mb-2">👋 {hangout.hangout_name}</h1>
               <p className="text-blue-500 text-xl font-medium">
                 {safeFormatDate(hangout.hangout_date)}
                 {hangout.hangout_time && ` at ${hangout.hangout_time}`}
               </p>
              {hangout.location && <p className="text-gray-600 mt-1">📍 {hangout.location}</p>}
            </div>
            <div className="text-right">
              {hangout.is_public && (
                <div className="mb-2">
                  <span className="inline-block px-4 py-2 bg-blue-100 text-blue-700 rounded-full text-sm font-medium">
                    🔗 Shareable
                  </span>
                </div>
              )}
            </div>
          </div>

          {hangout.is_public && isOwner && (
            <div className="mb-6 p-4 bg-gradient-to-r from-blue-50 to-cyan-50 rounded-xl">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Shareable Public Link</p>
                  <p className="text-xs text-gray-500">Anyone can view and RSVP</p>
                </div>
                <button onClick={copyShareLink} className="px-4 py-2 bg-blue-500 text-white rounded-lg text-sm hover:bg-blue-600 transition flex items-center gap-2">
                  {copied ? '✓ Copied!' : 'Copy Link'}
                </button>
              </div>
              <input type="text" value={shareLink} readOnly className="w-full mt-2 px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm" />
            </div>
          )}
        </div>

        {/* RSVP Section */}
        {(isOwner || hangout.is_public) && (
          <div className="bg-white rounded-2xl shadow-lg p-8 mb-8">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-gray-800">RSVP</h2>
              {hangout.is_public && (
                <button onClick={() => setShowRSVP(!showRSVP)} className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600">
                  {showRSVP ? 'Cancel' : 'RSVP'}
                </button>
              )}
            </div>

            {showRSVP && (
              <form onSubmit={handleRSVP} className="mb-6 p-6 bg-blue-50 rounded-xl">
                <h3 className="text-lg font-bold text-gray-800 mb-4">RSVP to Hangout</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <input type="text" name="guestName" placeholder="Your Name" required className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
                  <input type="email" name="guestEmail" placeholder="Your Email" required className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
                </div>
                <div className="mt-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
                  <select name="status" required className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                    <option value="attending">I'll be there!</option>
                    <option value="declined">Can't make it</option>
                    <option value="maybe">Maybe</option>
                  </select>
                </div>
                <textarea name="message" placeholder="See you there?" rows="3" className="w-full mt-4 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"></textarea>
                <div className="flex gap-4 mt-4">
                  <button type="submit" className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600">Send RSVP</button>
                  <button type="button" onClick={() => setShowRSVP(false)} className="px-6 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400">Cancel</button>
                </div>
              </form>
            )}

            {guestList.length > 0 && (
              <div className="mb-6">
                <h3 className="text-lg font-bold text-gray-800 mb-4">Who's Coming</h3>
                <div className="flex flex-wrap gap-2">
                  {guestList.map((name, i) => (
                    <span key={i} className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm">{name}</span>
                  ))}
                </div>
              </div>
            )}

            {rsvpList.length > 0 && (
              <div>
                <h3 className="text-lg font-bold text-gray-800 mb-4">RSVP Responses</h3>
                <div className="space-y-3 max-h-64 overflow-y-auto">
                  {rsvpList.map((rsvp) => (
                    <div key={rsvp.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div>
                        <span className="font-medium text-gray-800">{rsvp.guest_name}</span>
                        <span className="text-sm text-gray-500 ml-2">{rsvp.guest_email}</span>
                        {rsvp.message && <p className="text-sm text-gray-600 italic">"{rsvp.message}"</p>}
                        <span className="text-xs text-gray-400">{new Date(rsvp.rsvp_date).toLocaleString()}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`px-3 py-1 rounded-full text-sm font-medium ${rsvp.status === 'attending' ? 'bg-green-100 text-green-700' : rsvp.status === 'declined' ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'}`}>
                          {rsvp.status}
                        </span>
                        {isOwner && (
                          <button onClick={() => handleDeleteRSVP(rsvp.id)} className="text-red-500 hover:text-red-700 text-sm">
                            Remove
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          <div className="bg-white rounded-2xl shadow-lg p-8">
            <h2 className="text-2xl font-bold text-gray-800 mb-6">Details</h2>
            
            {hangout.vibe && (
              <div className="mb-6">
                <h3 className="text-sm font-medium text-gray-500 mb-1">Vibe</h3>
                <p className="text-lg text-gray-800">{hangout.vibe}</p>
              </div>
            )}

            {hangout.expected_people && (
              <div className="mb-6">
                <h3 className="text-sm font-medium text-gray-500 mb-1">Expected People</h3>
                <p className="text-lg text-gray-800">{hangout.expected_people}</p>
              </div>
            )}

            {hangout.snacks && (
              <div className="mb-6">
                <h3 className="text-sm font-medium text-gray-500 mb-1">Snacks</h3>
                <p className="text-lg text-gray-800">{hangout.snacks}</p>
              </div>
            )}

            {hangout.drinks_provided && (
              <div className="mb-6 flex items-center gap-2 text-green-600">
                <span className="text-xl">🥤</span>
                <span className="font-medium">Drinks provided</span>
              </div>
            )}
          </div>

          {(chillActivities.length > 0 || musicPlaylist.length > 0 || hangout.notes) && (
            <div className="bg-white rounded-2xl shadow-lg p-8">
              <h2 className="text-2xl font-bold text-gray-800 mb-6">Activities &amp; More</h2>
              
              {chillActivities.length > 0 && (
                <div className="mb-6">
                  <h3 className="text-lg font-bold text-gray-800 mb-4">Activities</h3>
                  <div className="flex flex-wrap gap-2">
                    {chillActivities.map((a, i) => (
                      <span key={i} className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm">{a}</span>
                    ))}
                  </div>
                </div>
              )}

              {musicPlaylist.length > 0 && (
                <div className="mb-6">
                  <h3 className="text-lg font-bold text-gray-800 mb-4">Music Playlist</h3>
                  <ul className="list-disc list-inside space-y-1">
                    {musicPlaylist.slice(0, 5).map((song, i) => (
                      <li key={i} className="text-gray-700">{song}</li>
                    ))}
                    {musicPlaylist.length > 5 && <li className="text-gray-500 text-sm">+{musicPlaylist.length - 5} more</li>}
                  </ul>
                </div>
              )}

              {hangout.notes && (
                <div>
                  <h3 className="text-lg font-bold text-gray-800 mb-4">Notes</h3>
                  <p className="text-gray-700 leading-relaxed">{hangout.notes}</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
