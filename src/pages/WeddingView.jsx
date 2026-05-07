import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation, Link } from 'react-router-dom';
import { supabase } from '../supabase';
import { safeFormatDate } from '../utils/dateUtils';

export default function WeddingView() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const isPublicView = location.pathname.startsWith('/public');
  
  const [wedding, setWedding] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isOwner, setIsOwner] = useState(false);
  const [showRSVP, setShowRSVP] = useState(false);
  const [rsvpList, setRsvpList] = useState([]);
  const [shareLink, setShareLink] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    loadWedding();
  }, [id]);

  const loadWedding = async () => {
    try {
      setLoading(true);
      
      // Check auth status
      const { data: { user } } = await supabase.auth.getUser();
      
      // Load wedding
      let query = supabase.from('weddings').select('*').eq('id', id);
      
      // If not public view, enforce RLS (user must be owner)
      // If public view, allow public weddings
      if (isPublicView) {
        query = query.eq('is_public', true);
      }
      
      const { data, error } = await query.single();
      
      if (error) throw error;
      if (!data) throw new Error('Wedding not found');
      
      setWedding(data);
      setIsOwner(user?.id === data.user_id);
      
      // Load RSVPs
      loadRSVPs(data.id);
      
      // Generate share link
      const publicLink = `${window.location.origin}/public/wedding/${data.id}`;
      setShareLink(publicLink);
      
    } catch (err) {
      console.error('Error loading wedding:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const loadRSVPs = async (weddingId) => {
    try {
      const { data, error } = await supabase
        .from('wedding_rsvps')
        .select('*')
        .eq('wedding_id', weddingId)
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
      const { data: wedding } = await supabase
        .from('weddings')
        .select('guest_list_json')
        .eq('id', id)
        .single();

      const guestList = wedding?.guest_list_json?.guests || [];
      
      const newGuest = {
        name: guestName,
        email: guestEmail,
        status,
        message: message || '',
        rsvp_date: new Date().toISOString().split('T')[0]
      };
      
      // Check if guest already exists
      const existingIndex = guestList.findIndex(g => g.email === guestEmail);
      if (existingIndex >= 0) {
        guestList[existingIndex] = newGuest;
      } else {
        guestList.push(newGuest);
      }

      await supabase
        .from('weddings')
        .update({ 
          guest_list_json: { guests: guestList }
        })
        .eq('id', id);

      // Also track in separate RSVP table
      await supabase
        .from('wedding_rsvps')
        .upsert({
          wedding_id: parseInt(id),
          guest_name: guestName,
          guest_email: guestEmail,
          status,
          message: message || '',
          rsvp_date: new Date()
        });

      await loadRSVPs(id);
      await loadWedding();
      
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
      await supabase.from('wedding_rsvps').delete().eq('id', rsvpId);
      await loadRSVPs(id);
    } catch (err) {
      console.error('Error deleting RSVP:', err);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this wedding?')) return;
    try {
      await supabase.from('weddings').delete().eq('id', id);
      await supabase.from('event_registry').delete().eq('event_id', id).eq('event_type', 'wedding');
      navigate('/events');
    } catch (err) {
      console.error('Error deleting wedding:', err);
    }
  };

  const handleEdit = () => {
    navigate(`/edit-wedding/${id}`);
  };

  const copyShareLink = () => {
    navigator.clipboard.writeText(shareLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const togglePublic = async () => {
    try {
      await supabase
        .from('weddings')
        .update({ is_public: !wedding.is_public })
        .eq('id', id);
      
      await supabase
        .from('event_registry')
        .update({ is_public: !wedding.is_public })
        .eq('event_id', id)
        .eq('event_type', 'wedding');
      
      await loadWedding();
    } catch (err) {
      console.error('Error toggling public:', err);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-pink-50 to-rose-100">
        <div className="text-rose-500 text-2xl animate-pulse">Loading wedding details...</div>
      </div>
    );
  }

  if (error || !wedding) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-pink-50 to-rose-100">
        <div className="text-center">
          <div className="text-rose-500 text-2xl mb-4">💍</div>
          <p className="text-gray-600">Wedding not found</p>
          <button onClick={() => navigate('/events')} className="mt-4 px-4 py-2 bg-rose-500 text-white rounded-lg">
            Back to Events
          </button>
        </div>
      </div>
    );
  }

  const guestList = wedding.guest_list_json?.guests || [];
  const timeline = wedding.timeline_json?.events || [];
  const vendorKeys = ['photographer', 'caterer', 'florist'];

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 to-rose-100 pb-12">
      {/* Header */}
      <div className="bg-white shadow-lg sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <button onClick={() => navigate('/events')} className="flex items-center gap-2 text-gray-600 hover:text-rose-500">
            ← Back to Events
          </button>
          {!isPublicView && isOwner && (
            <div className="flex items-center gap-3">
              <button onClick={togglePublic} className={`px-4 py-2 rounded-lg text-sm font-medium transition ${wedding.is_public ? 'bg-green-100 text-green-700' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}>
                {wedding.is_public ? '🌍 Public' : '🔒 Private'}
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
              <h1 className="text-4xl font-bold text-gray-800 mb-2">💍 {wedding.couple_names}</h1>
              <p className="text-rose-500 text-xl font-medium">
                {safeFormatDate(wedding.wedding_date)}
              </p>
            </div>
            <div className="text-right">
              <span className={`inline-block px-4 py-2 rounded-full text-sm font-medium ${wedding.status === 'planning' ? 'bg-yellow-100 text-yellow-700' : wedding.status === 'locked' ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'}`}>
                {wedding.status?.toUpperCase()}
              </span>
              {wedding.is_public && (
                <div className="mt-2">
                  <button onClick={() => setShowRSVP(!showRSVP)} className="text-rose-500 hover:text-rose-600 text-sm font-medium">
                    RSVP to this wedding
                  </button>
                </div>
              )}
            </div>
          </div>

          {wedding.is_public && isOwner && (
            <div className="mb-6 p-4 bg-gradient-to-r from-rose-50 to-pink-50 rounded-xl">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Shareable Public Link</p>
                  <p className="text-xs text-gray-500">Anyone with this link can view and RSVP</p>
                </div>
                <button onClick={copyShareLink} className="px-4 py-2 bg-rose-500 text-white rounded-lg text-sm hover:bg-rose-600 transition flex items-center gap-2">
                  {copied ? '✓ Copied!' : 'Copy Link'}
                </button>
              </div>
              <input type="text" value={shareLink} readOnly className="w-full mt-2 px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm" />
            </div>
          )}
        </div>

        {/* RSVP Section */}
        {(isOwner || wedding.is_public) && (
          <div className="bg-white rounded-2xl shadow-lg p-8 mb-8">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-gray-800">RSVP Responses</h2>
              {wedding.is_public && (
                <button onClick={() => setShowRSVP(!showRSVP)} className="px-4 py-2 bg-rose-500 text-white rounded-lg hover:bg-rose-600">
                  {showRSVP ? 'Cancel' : 'Submit RSVP'}
                </button>
              )}
            </div>

            {showRSVP && (
              <form onSubmit={handleRSVP} className="mb-6 p-6 bg-rose-50 rounded-xl">
                <h3 className="text-lg font-bold text-gray-800 mb-4">RSVP to Wedding</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <input type="text" name="guestName" placeholder="Your Name" required className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-rose-500 focus:border-transparent" />
                  <input type="email" name="guestEmail" placeholder="Your Email" required className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-rose-500 focus:border-transparent" />
                </div>
                <div className="mt-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">RSVP Status</label>
                  <select name="status" required className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-rose-500 focus:border-transparent">
                    <option value="attending">Attending</option>
                    <option value="declined">Declined</option>
                    <option value="maybe">Maybe</option>
                  </select>
                </div>
                <textarea name="message" placeholder="Message to the couple (optional)" rows="3" className="w-full mt-4 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-rose-500 focus:border-transparent"></textarea>
                <div className="flex gap-4 mt-4">
                  <button type="submit" className="px-6 py-2 bg-rose-500 text-white rounded-lg hover:bg-rose-600">Submit RSVP</button>
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

              {/* Slideshow Link */}
              <section className="py-10 text-center" style={{background: 'rgba(255,255,255,0.85)'}}>
                <div className="flex flex-col md:flex-row gap-4 justify-center">
                  <Link
                    to={`/slideshow/${id}`}
                    className="bg-gradient-to-r from-rose-500 to-pink-500 text-white font-bold py-3 px-6 rounded-full shadow-lg hover:scale-105 transition-transform inline-block"
                  >
                    View Slideshow 🎬
                  </Link>
                  <Link
                    to={`/wedding/${id}/slideshow/${id}`}
                    className="bg-gradient-to-r from-rose-500 to-pink-500 text-white font-bold py-3 px-6 rounded-full shadow-lg hover:scale-105 transition-transform inline-block"
                  >
                    Wedding Slideshow 🌹
                  </Link>
                 </div>
               </section>
              </div>
           )}
        </div>
       </div>
     )
   }
