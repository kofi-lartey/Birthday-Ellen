import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../supabase';
import { formatDateForDB, safeFormatDate } from '../utils/dateUtils';

export default function EditWedding() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    couple_names: '',
    wedding_date: '',
    venue: '',
    venue_address: '',
    photographer: '',
    caterer: '',
    florist: '',
    guest_count: '',
    dress_code: '',
    theme: '',
    vendors_json: '{}',
    guest_list_json: '{"guests":[]}',
    timeline_json: '{"events":[]}',
    is_public: false,
    featured: false,
    status: 'planning'
  });

  useEffect(() => {
    loadWedding();
  }, [id]);

  const loadWedding = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate('/login');
        return;
      }

      const { data, error } = await supabase
        .from('weddings')
        .select('*')
        .eq('id', id)
        .eq('user_id', user.id)
        .single();

      if (error || !data) {
        alert('Wedding not found or access denied');
        navigate('/events');
        return;
      }

      setFormData({
        couple_names: data.couple_names || '',
        wedding_date: data.wedding_date || '',
        venue: data.venue || '',
        venue_address: data.venue_address || '',
        photographer: data.photographer || '',
        caterer: data.caterer || '',
        florist: data.florist || '',
        guest_count: data.guest_count || '',
        dress_code: data.dress_code || '',
        theme: data.theme || '',
        vendors_json: JSON.stringify(data.vendors_json || {}),
        guest_list_json: JSON.stringify(data.guest_list_json || { guests: [] }),
        timeline_json: JSON.stringify(data.timeline_json || { events: [] }),
        is_public: data.is_public || false,
        featured: data.featured || false,
        status: data.status || 'planning'
      });
    } catch (err) {
      console.error('Error loading wedding:', err);
      alert('Error loading wedding');
      navigate('/events');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);

    try {
      // Validate required fields
      if (!formData.couple_names?.trim()) {
        alert('Please enter couple names');
        setSaving(false);
        return;
      }
      if (!formData.wedding_date) {
        alert('Please select a wedding date');
        setSaving(false);
        return;
      }

      const updateData = {
        couple_names: formData.couple_names,
        wedding_date: formData.wedding_date, // Date format from input is YYYY-MM-DD
        venue: formData.venue,
        venue_address: formData.venue_address,
        photographer: formData.photographer,
        caterer: formData.caterer,
        florist: formData.florist,
        guest_count: formData.guest_count ? parseInt(formData.guest_count) : null,
        dress_code: formData.dress_code,
        theme: formData.theme,
        vendors_json: formData.vendors_json ? JSON.parse(formData.vendors_json) : {},
        guest_list_json: formData.guest_list_json ? JSON.parse(formData.guest_list_json) : { guests: [] },
        timeline_json: formData.timeline_json ? JSON.parse(formData.timeline_json) : { events: [] },
        is_public: formData.is_public,
        featured: formData.featured,
        status: formData.status
      };

      const { error } = await supabase
        .from('weddings')
        .update(updateData)
        .eq('id', id);

      if (error) throw error;

      await supabase
        .from('event_registry')
        .update({ 
          event_name: formData.couple_names,
          event_date: formData.wedding_date,
          is_public: formData.is_public
        })
        .eq('event_id', id)
        .eq('event_type', 'wedding');

      alert('Wedding updated successfully!');
      navigate(`/wedding/${id}`);
    } catch (err) {
      console.error('Error updating wedding:', err);
      alert('Error updating wedding: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-pink-50 to-rose-100">
        <div className="text-rose-500 text-2xl animate-pulse">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 to-rose-100 p-6">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold text-gray-800 mb-2">✏️ Edit Wedding</h1>
        <p className="text-gray-600 mb-8">Update your wedding details</p>

        <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-lg p-8 space-y-8">
          <div className="border-t-4 border-rose-200 pt-6">
            <h2 className="text-2xl font-bold text-gray-800 mb-4">Basic Information</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Couple Names *</label>
                <input
                  type="text"
                  name="couple_names"
                  value={formData.couple_names}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-rose-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Wedding Date *</label>
                <input
                  type="date"
                  name="wedding_date"
                  value={formData.wedding_date}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-rose-500 focus:border-transparent"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Venue</label>
                <input
                  type="text"
                  name="venue"
                  value={formData.venue}
                  onChange={handleChange}
                  placeholder="Venue name"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-rose-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Venue Address</label>
                <input
                  type="text"
                  name="venue_address"
                  value={formData.venue_address}
                  onChange={handleChange}
                  placeholder="Full address"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-rose-500 focus:border-transparent"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Theme</label>
                <input
                  type="text"
                  name="theme"
                  value={formData.theme}
                  onChange={handleChange}
                  placeholder="e.g., Garden, Modern, Classic"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-rose-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
                <select
                  name="status"
                  value={formData.status}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-rose-500 focus:border-transparent"
                >
                  <option value="planning">Planning</option>
                  <option value="locked">Locked</option>
                  <option value="completed">Completed</option>
                </select>
              </div>
            </div>
          </div>

          <div className="border-t-4 border-rose-200 pt-6">
            <h2 className="text-2xl font-bold text-gray-800 mb-4">Vendors</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <input
                type="text"
                name="photographer"
                value={formData.photographer}
                onChange={handleChange}
                placeholder="Photographer"
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-rose-500 focus:border-transparent"
              />
              <input
                type="text"
                name="caterer"
                value={formData.caterer}
                onChange={handleChange}
                placeholder="Caterer"
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-rose-500 focus:border-transparent"
              />
              <input
                type="text"
                name="florist"
                value={formData.florist}
                onChange={handleChange}
                placeholder="Florist"
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-rose-500 focus:border-transparent"
              />
            </div>
          </div>

          <div className="border-t-4 border-rose-200 pt-6">
            <h2 className="text-2xl font-bold text-gray-800 mb-4">Guest Information</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Expected Guests</label>
                <input
                  type="number"
                  name="guest_count"
                  value={formData.guest_count}
                  onChange={handleChange}
                  placeholder="0"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-rose-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Dress Code</label>
                <input
                  type="text"
                  name="dress_code"
                  value={formData.dress_code}
                  onChange={handleChange}
                  placeholder="e.g., Black Tie, Cocktail"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-rose-500 focus:border-transparent"
                />
              </div>
            </div>
          </div>

          <div className="border-t-4 border-rose-200 pt-6">
            <h2 className="text-2xl font-bold text-gray-800 mb-4">Advanced Data (JSON)</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Vendors JSON</label>
                <textarea
                  name="vendors_json"
                  value={formData.vendors_json}
                  onChange={handleChange}
                  rows="3"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-rose-500 focus:border-transparent font-mono text-sm"
                  placeholder='{"photographer": {"name": "", "phone": "", "price": ""}}'
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Guest List JSON</label>
                <textarea
                  name="guest_list_json"
                  value={formData.guest_list_json}
                  onChange={handleChange}
                  rows="3"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-rose-500 focus:border-transparent font-mono text-sm"
                  placeholder='{"guests": [{"name": "", "email": "", "status": "attending"}]}'
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Timeline JSON</label>
                <textarea
                  name="timeline_json"
                  value={formData.timeline_json}
                  onChange={handleChange}
                  rows="3"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-rose-500 focus:border-transparent font-mono text-sm"
                  placeholder='{"events": [{"time": "18:00", "description": "Ceremony"}]}'
                />
              </div>
            </div>
          </div>

          <div className="border-t-4 border-rose-200 pt-6">
            <h2 className="text-2xl font-bold text-gray-800 mb-4">Settings</h2>
            <div className="space-y-4">
              <div className="flex items-center gap-3 p-4 bg-rose-50 rounded-lg">
                <input
                  type="checkbox"
                  name="is_public"
                  checked={formData.is_public}
                  onChange={handleChange}
                  className="w-5 h-5"
                />
                <label className="text-sm font-medium text-gray-700">Make wedding public (shareable link)</label>
              </div>
              <div className="flex items-center gap-3 p-4 bg-rose-50 rounded-lg">
                <input
                  type="checkbox"
                  name="featured"
                  checked={formData.featured}
                  onChange={handleChange}
                  className="w-5 h-5"
                />
                <label className="text-sm font-medium text-gray-700">Feature on dashboard</label>
              </div>
            </div>
          </div>

          <div className="flex gap-4 pt-6">
            <button
              type="button"
              onClick={() => navigate(`/wedding/${id}`)}
              className="flex-1 px-6 py-3 bg-gray-300 text-gray-800 rounded-lg font-medium hover:bg-gray-400"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 px-6 py-3 bg-gradient-to-r from-rose-500 to-pink-500 text-white rounded-lg font-medium hover:shadow-lg disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
