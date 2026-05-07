import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../supabase';

export default function EditParty() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    party_name: '',
    party_date: '',
    party_time: '',
    theme: '',
    venue: '',
    guest_count: '',
    dress_code: '',
    music_style: '',
    DJ_provided: false,
    food_type: '',
    dietary_restrictions_json: [],
    activities_json: [],
    is_public: false,
    featured: false,
    status: 'planning'
  });

  useEffect(() => {
    loadParty();
  }, [id]);

  const loadParty = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate('/login');
        return;
      }

      const { data, error } = await supabase
        .from('parties')
        .select('*')
        .eq('id', id)
        .eq('user_id', user.id)
        .single();

      if (error || !data) {
        alert('Party not found or access denied');
        navigate('/events');
        return;
      }

      setFormData({
        party_name: data.party_name || '',
        party_date: data.party_date || '',
        party_time: data.party_time || '',
        theme: data.theme || '',
        venue: data.venue || '',
        guest_count: data.guest_count?.toString() || '',
        dress_code: data.dress_code || '',
        music_style: data.music_style || '',
        DJ_provided: data.DJ_provided || false,
        food_type: data.food_type || '',
        dietary_restrictions_json: data.dietary_restrictions_json || [],
        activities_json: data.activities_json || [],
        is_public: data.is_public || false,
        featured: data.featured || false,
        status: data.status || 'planning'
      });
    } catch (err) {
      console.error('Error loading party:', err);
      alert('Error loading party');
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
      if (!formData.party_name?.trim()) {
        alert('Please enter a party name');
        setSaving(false);
        return;
      }
      if (!formData.party_date) {
        alert('Please select a party date');
        setSaving(false);
        return;
      }

      const updateData = {
        party_name: formData.party_name,
        party_date: formData.party_date,
        party_time: formData.party_time,
        theme: formData.theme,
        venue: formData.venue,
        guest_count: formData.guest_count ? parseInt(formData.guest_count) : null,
        dress_code: formData.dress_code,
        music_style: formData.music_style,
        DJ_provided: formData.DJ_provided,
        food_type: formData.food_type,
        dietary_restrictions_json: formData.dietary_restrictions_json,
        activities_json: formData.activities_json,
        is_public: formData.is_public,
        featured: formData.featured,
        status: formData.status
      };

      const { error } = await supabase
        .from('parties')
        .update(updateData)
        .eq('id', id);

      if (error) throw error;

      await supabase
        .from('event_registry')
        .update({ 
          event_name: formData.party_name,
          event_date: formData.party_date,
          is_public: formData.is_public
        })
        .eq('event_id', id)
        .eq('event_type', 'party');

      alert('Party updated successfully!');
      navigate(`/party/${id}`);
    } catch (err) {
      console.error('Error updating party:', err);
      alert('Error updating party: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 to-indigo-100">
        <div className="text-purple-500 text-2xl animate-pulse">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-indigo-100 p-6">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-4xl font-bold text-gray-800 mb-2">✏️ Edit Party</h1>
        <p className="text-gray-600 mb-8">Update your party details</p>

        <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-lg p-8 space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Party Name</label>
            <input
              type="text"
              name="party_name"
              value={formData.party_name}
              onChange={handleChange}
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Date</label>
              <input
                type="date"
                name="party_date"
                value={formData.party_date}
                onChange={handleChange}
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Time</label>
              <input
                type="time"
                name="party_time"
                value={formData.party_time}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Venue</label>
            <input
              type="text"
              name="venue"
              value={formData.venue}
              onChange={handleChange}
              placeholder="Your place, rooftop bar, club..."
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Theme</label>
              <input
                type="text"
                name="theme"
                value={formData.theme}
                onChange={handleChange}
                placeholder="e.g., Tropical, 90s Throwback"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Guests</label>
              <input
                type="number"
                name="guest_count"
                value={formData.guest_count}
                onChange={handleChange}
                placeholder="0"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Music Style</label>
            <input
              type="text"
              name="music_style"
              value={formData.music_style}
              onChange={handleChange}
              placeholder="Hip-hop & R&B, Pop, Electronic..."
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            />
          </div>

          <div className="flex items-center gap-3 p-4 bg-purple-50 rounded-lg">
            <input
              type="checkbox"
              name="DJ_provided"
              checked={formData.DJ_provided}
              onChange={handleChange}
              className="w-4 h-4"
            />
            <label className="text-sm font-medium text-gray-700">Hiring a DJ</label>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Food Style</label>
            <input
              type="text"
              name="food_type"
              value={formData.food_type}
              onChange={handleChange}
              placeholder="Catered, BBQ, Pizza..."
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Dress Code</label>
            <input
              type="text"
              name="dress_code"
              value={formData.dress_code}
              onChange={handleChange}
              placeholder="Casual, Formal, Costume..."
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            />
          </div>

          <div className="flex items-center gap-3 p-4 bg-purple-50 rounded-lg">
            <input
              type="checkbox"
              name="is_public"
              checked={formData.is_public}
              onChange={handleChange}
              className="w-4 h-4"
            />
            <label className="text-sm font-medium text-gray-700">Make party shareable</label>
          </div>

          <div className="flex gap-4 pt-6">
            <button
              type="button"
              onClick={() => navigate(`/party/${id}`)}
              className="flex-1 px-6 py-3 bg-gray-300 text-gray-800 rounded-lg font-medium hover:bg-gray-400"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 px-6 py-3 bg-gradient-to-r from-purple-500 to-indigo-500 text-white rounded-lg font-medium hover:shadow-lg disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
