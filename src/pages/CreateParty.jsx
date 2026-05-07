import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabase';
import { formatDateForDB } from '../utils/dateUtils';

export default function CreateParty() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
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
    is_public: false
  });

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Validate required fields
      if (!formData.party_name?.trim()) {
        alert('Please enter a party name');
        setLoading(false);
        return;
      }
      if (!formData.party_date) {
        alert('Please select a party date');
        setLoading(false);
        return;
      }

       const { data: partyData, error } = await supabase
        .from('parties')
        .insert({
          user_id: user.id,
          ...formData,
          party_date: formatDateForDB(formData.party_date)
        })
        .select();

      if (error) throw error;

      const partyId = partyData[0].id;

      await supabase.from('event_registry').insert({
        user_id: user.id,
        event_type: 'party',
        event_id: partyId,
        event_date: formData.party_date,
        event_name: formData.party_name,
        is_public: formData.is_public
      });

      navigate(`/party/${partyId}`);
    } catch (err) {
      console.error('Error creating party:', err);
      alert('Error creating party');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-indigo-100 p-6">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-4xl font-bold text-gray-800 mb-2">🎉 Throw a Party</h1>
        <p className="text-gray-600 mb-8">Good music. Great people. Zero stress.</p>

        <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-lg p-8 space-y-6">
          
          {/* Party Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Party Name</label>
            <input
              type="text"
              name="party_name"
              placeholder="e.g., My Birthday Bash, Summer Vibes"
              value={formData.party_name}
              onChange={handleChange}
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            />
          </div>

          {/* Date & Time */}
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

          {/* Venue */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Where It's At</label>
            <input
              type="text"
              name="venue"
              placeholder="Your place, rooftop bar, club..."
              value={formData.venue}
              onChange={handleChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            />
          </div>

          {/* Theme */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Theme / Vibe</label>
            <input
              type="text"
              name="theme"
              placeholder="e.g., Tropical, 90s Throwback, All Black"
              value={formData.theme}
              onChange={handleChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            />
          </div>

          {/* Guest Count */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">How Many?</label>
            <input
              type="number"
              name="guest_count"
              placeholder="Expected guests"
              value={formData.guest_count}
              onChange={handleChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            />
          </div>

          {/* Music & Entertainment */}
          <div className="border-t-2 pt-6">
            <h3 className="text-lg font-bold text-gray-800 mb-4">🎵 Entertainment</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Music Style</label>
                <input
                  type="text"
                  name="music_style"
                  placeholder="Hip-hop & R&B, Pop, Electronic, Reggae..."
                  value={formData.music_style}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
              </div>
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  name="DJ_provided"
                  checked={formData.DJ_provided}
                  onChange={handleChange}
                  className="w-4 h-4"
                />
                <label className="text-sm font-medium text-gray-700">Hiring a DJ</label>
              </div>
            </div>
          </div>

          {/* Food & Drinks */}
          <div className="border-t-2 pt-6">
            <h3 className="text-lg font-bold text-gray-800 mb-4">🍽️ Food & Drinks</h3>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Food Style</label>
              <input
                type="text"
                name="food_type"
                placeholder="Catered, BBQ, Pizza, Potluck, Finger Foods..."
                value={formData.food_type}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* Dress Code */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Dress Code</label>
            <input
              type="text"
              name="dress_code"
              placeholder="Casual, Formal, Costume, etc"
              value={formData.dress_code}
              onChange={handleChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            />
          </div>

          {/* Public Toggle */}
          <div className="flex items-center gap-3 p-4 bg-purple-50 rounded-lg">
            <input
              type="checkbox"
              name="is_public"
              checked={formData.is_public}
              onChange={handleChange}
              className="w-4 h-4"
            />
            <label className="text-sm font-medium text-gray-700">Make party shareable (send invite link)</label>
          </div>

          {/* Submit */}
          <div className="flex gap-4 pt-6">
            <button
              type="button"
              onClick={() => navigate('/events')}
              className="flex-1 px-6 py-3 bg-gray-300 text-gray-800 rounded-lg font-medium hover:bg-gray-400"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-6 py-3 bg-gradient-to-r from-purple-500 to-indigo-500 text-white rounded-lg font-medium hover:shadow-lg disabled:opacity-50"
            >
              {loading ? 'Creating...' : 'Plan Party'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
