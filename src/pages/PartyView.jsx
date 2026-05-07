import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '../supabase';
import { safeFormatDate } from '../utils/dateUtils';

export default function PartyView() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const isPublicView = location.pathname.startsWith('/public');
  
  const [party, setParty] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isOwner, setIsOwner] = useState(false);
  const [rsvpList, setRsvpList] = useState([]);
  const [showRSVP, setShowRSVP] = useState(false);
  const [shareLink, setShareLink] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    loadParty();
  }, [id]);

  const loadParty = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      
      let query = supabase.from('parties').select('*').eq('id', id);
      if (isPublicView) {
        query = query.eq('is_public', true);
      }
      
      const { data, error } = await query.single();
      
      if (error) throw error;
      if (!data) throw new Error('Party not found');
      
      setParty(data);
      setIsOwner(user?.id === data.user_id);
      
      loadRSVPs(data.id);
      
      const publicLink = `${window.location.origin}/public/party/${data.id}`;
      setShareLink(publicLink);
      
    } catch (err) {
      console.error('Error loading party:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const loadRSVPs = async (partyId) => {
    try {
      const { data, error } = await supabase
        .from('party_rsvps')
        .select('*')
        .eq('party_id', partyId)
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
      const { data: partyData } = await supabase
        .from('parties')
        .select('guest_list_json')
        .eq('id', id)
        .single();

      const guestList = partyData?.guest_list_json?.guests || [];
      
      const newGuest = {
        name: guestName,
        email: guestEmail,
        status,
        message: message || '',
        rsvp_date: new Date().toISOString().split('T')[0]
      };
      
      const existingIndex = guestList.findIndex(g => g.email === guestEmail);
      if (existingIndex >= 0) {
        guestList[existingIndex] = newGuest;
      } else {
        guestList.push(newGuest);
      }

      await supabase
        .from('parties')
        .update({ 
          guest_list_json: { guests: guestList }
        })
        .eq('id', id);

      await supabase
        .from('party_rsvps')
        .upsert({
          party_id: parseInt(id),
          guest_name: guestName,
          guest_email: guestEmail,
          status,
          message: message || '',
          rsvp_date: new Date()
        });

      await loadRSVPs(id);
      await loadParty();
      
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
      await supabase.from('party_rsvps').delete().eq('id', rsvpId);
      await loadRSVPs(id);
    } catch (err) {
      console.error('Error deleting RSVP:', err);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this party?')) return;
    try {
      await supabase.from('parties').delete().eq('id', id);
      await supabase.from('event_registry').delete().eq('event_id', id).eq('event_type', 'party');
      navigate('/events');
    } catch (err) {
      console.error('Error deleting party:', err);
    }
  };

  const handleEdit = () => {
    navigate(`/edit-party/${id}`);
  };

  const togglePublic = async () => {
    try {
      await supabase
        .from('parties')
        .update({ is_public: !party.is_public })
        .eq('id', id);
      
      await supabase
        .from('event_registry')
        .update({ is_public: !party.is_public })
        .eq('event_id', id)
        .eq('event_type', 'party');
      
      await loadParty();
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
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 to-indigo-100">
        <div className="text-indigo-500 text-2xl animate-pulse">Loading party...</div>
      </div>
    );
  }

  if (error || !party) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 to-indigo-100">
        <div className="text-center">
          <div className="text-indigo-500 text-2xl mb-4">🎉</div>
          <p className="text-gray-600">Party not found</p>
          <button onClick={() => navigate('/events')} className="mt-4 px-4 py-2 bg-indigo-500 text-white rounded-lg">
            Back to Events
          </button>
        </div>
      </div>
    );
  }

  const guestList = party.guest_list_json?.guests || [];
  const activities = party.activities_json || [];
  const playlist = party.playlist_json || [];
  const dietary = party.dietary_restrictions_json || [];

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-indigo-100 pb-12">
      {/* Header */}
      <div className="bg-white shadow-lg sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <button onClick={() => navigate('/events')} className="flex items-center gap-2 text-gray-600 hover:text-indigo-500">
            ← Back to Events
          </button>
          {!isPublicView && isOwner && (
            <div className="flex items-center gap-3">
              <button onClick={togglePublic} className={`px-4 py-2 rounded-lg text-sm font-medium transition ${party.is_public ? 'bg-indigo-100 text-indigo-700' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}>
                {party.is_public ? '🌍 Public' : '🔒 Private'}
              </button>
              <button onClick={handleEdit} className="px-4 py-2 bg-indigo-500 text-white rounded-lg hover:bg-indigo-600">
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
              <h1 className="text-4xl font-bold text-gray-800 mb-2">🎉 {party.party_name}</h1>
               <p className="text-indigo-500 text-xl font-medium">
                 {safeFormatDate(party.party_date)}
                 {party.party_time && ` at ${party.party_time}`}
               </p>
            </div>
            <div className="text-right">
              {party.is_public && (
                <div className="mb-2">
                  <span className="inline-block px-4 py-2 bg-indigo-100 text-indigo-700 rounded-full text-sm font-medium">
                    🔗 Shareable
                  </span>
                </div>
              )}
            </div>
          </div>

          {party.is_public && isOwner && (
            <div className="mb-6 p-4 bg-gradient-to-r from-indigo-50 to-purple-50 rounded-xl">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Shareable Public Link</p>
                  <p className="text-xs text-gray-500">Anyone can view and RSVP</p>
                </div>
                <button onClick={copyShareLink} className="px-4 py-2 bg-indigo-500 text-white rounded-lg text-sm hover:bg-indigo-600 transition flex items-center gap-2">
                  {copied ? '✓ Copied!' : 'Copy Link'}
                </button>
              </div>
              <input type="text" value={shareLink} readOnly className="w-full mt-2 px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm" />
            </div>
          )}
        </div>

        {/* RSVP Section */}
        {(isOwner || party.is_public) && (
          <div className="bg-white rounded-2xl shadow-lg p-8 mb-8">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-gray-800">RSVP Responses</h2>
              {party.is_public && (
                <button onClick={() => setShowRSVP(!showRSVP)} className="px-4 py-2 bg-indigo-500 text-white rounded-lg hover:bg-indigo-600">
                  {showRSVP ? 'Cancel' : 'RSVP'}</button>
              )}
            </div>

            {showRSVP && (
              <form onSubmit={handleRSVP} className="mb-6 p-6 bg-indigo-50 rounded-xl">
                <h3 className="text-lg font-bold text-gray-800 mb-4">RSVP to Party</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <input type="text" name="guestName" placeholder="Your Name" required className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent" />
                  <input type="email" name="guestEmail" placeholder="Your Email" required className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent" />
                </div>
                <div className="mt-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Will you come?</label>
                  <select name="status" required className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent">
                    <option value="attending">I'll be there!</option>
                    <option value="declined">Can't make it</option>
                    <option value="maybe">Maybe</option>
                  </select>
                </div>
                <textarea name="message" placeholder="See you there? (optional)" rows="3" className="w-full mt-4 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"></textarea>
                <div className="flex gap-4 mt-4">
                  <button type="submit" className="px-6 py-2 bg-indigo-500 text-white rounded-lg hover:bg-indigo-600">Send RSVP</button>
                  <button type="button" onClick={() => setShowRSVP(false)} className="px-6 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400">Cancel</button>
                </div>
              </form>
            )}

            {guestList.length > 0 && (
              <div className="mb-6">
                <h3 className="text-lg font-bold text-gray-800 mb-4">Guest List</h3>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {guestList.map((guest, i) => (
                    <div key={i} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div>
                        <span className="font-medium text-gray-800">{guest.name}</span>
                        <span className="text-sm text-gray-500 ml-2">{guest.email}</span>
                        {guest.message && <p className="text-sm text-gray-600 italic">"{guest.message}"</p>}
                      </div>
                      <span className={`px-3 py-1 rounded-full text-sm font-medium ${guest.status === 'attending' ? 'bg-green-100 text-green-700' : guest.status === 'declined' ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'}`}>
                        {guest.status}
                      </span>
                    </div>
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

        {/* Main Info */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          <div className="bg-white rounded-2xl shadow-lg p-8">
            <h2 className="text-2xl font-bold text-gray-800 mb-6">Party Details</h2>
            
            {party.theme && (
              <div className="mb-6">
                <h3 className="text-sm font-medium text-gray-500 mb-1">Theme / Vibe</h3>
                <p className="text-lg text-gray-800">{party.theme}</p>
              </div>
            )}

            {party.venue && (
              <div className="mb-6">
                <h3 className="text-sm font-medium text-gray-500 mb-1">Location</h3>
                <p className="text-lg text-gray-800">{party.venue}</p>
              </div>
            )}

            {party.guest_count && (
              <div className="mb-6">
                <h3 className="text-sm font-medium text-gray-500 mb-1">Guests</h3>
                <p className="text-lg text-gray-800">{party.guest_count} expected</p>
              </div>
            )}

            {party.dress_code && (
              <div className="mb-6">
                <h3 className="text-sm font-medium text-gray-500 mb-1">Dress Code</h3>
                <p className="text-lg text-gray-800">{party.dress_code}</p>
              </div>
            )}
          </div>

          {(party.music_style || party.DJ_provided || party.food_type || activities.length > 0 || playlist.length > 0) && (
            <div className="bg-white rounded-2xl shadow-lg p-8">
              <h2 className="text-2xl font-bold text-gray-800 mb-6">Entertainment &amp; Food</h2>
              
              {party.music_style && (
                <div className="mb-4">
                  <h3 className="text-sm font-medium text-gray-500 mb-1">Music Style</h3>
                  <p className="text-lg text-gray-800">{party.music_style}</p>
                </div>
              )}
              
              {party.DJ_provided && (
                <div className="mb-4 flex items-center gap-2 text-green-600">
                  <span className="text-xl">🎧</span>
                  <span className="font-medium">DJ is provided</span>
                </div>
              )}

              {party.food_type && (
                <div className="mb-4">
                  <h3 className="text-sm font-medium text-gray-500 mb-1">Food</h3>
                  <p className="text-lg text-gray-800">{party.food_type}</p>
                </div>
              )}

              {dietary.length > 0 && (
                <div className="mb-4">
                  <h3 className="text-sm font-medium text-gray-500 mb-2">Dietary Restrictions</h3>
                  <div className="flex flex-wrap gap-2">
                    {dietary.map((d, i) => (
                      <span key={i} className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-sm">{d}</span>
                    ))}
                  </div>
                </div>
              )}

              {activities.length > 0 && (
                <div className="mb-4">
                  <h3 className="text-sm font-medium text-gray-500 mb-2">Activities</h3>
                  <ul className="list-disc list-inside space-y-1">
                    {activities.map((a, i) => (
                      <li key={i} className="text-gray-700">{a}</li>
                    ))}
                  </ul>
                </div>
              )}

              {playlist.length > 0 && (
                <div>
                  <h3 className="text-sm font-medium text-gray-500 mb-2">Playlist</h3>
                  <ul className="list-disc list-inside space-y-1">
                    {playlist.slice(0, 5).map((song, i) => (
                      <li key={i} className="text-gray-700">{song}</li>
                    ))}
                    {playlist.length > 5 && <li className="text-gray-500 text-sm">+{playlist.length - 5} more</li>}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
