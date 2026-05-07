import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabase';

export default function CreateHangout() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    hangout_name: '',
    hangout_date: '',
    hangout_time: '',
    who_coming: '',
    expected_people: '',
    location: '',
    vibe: 'Chill',
    snacks: '',
    drinks_provided: false,
    chill_activities_json: '[]',
    music_playlist_json: '[]',
    notes: '',
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
      if (!formData.hangout_name?.trim()) {
        alert('Please enter a hangout name');
        setLoading(false);
        return;
      }
      if (!formData.hangout_date) {
        alert('Please select a hangout date');
        setLoading(false);
        return;
      }

      const { data: hangoutData, error } = await supabase
        .from('hangouts')
        .insert({
          user_id: user.id,
          ...formData
        })
        .select();

      if (error) throw error;

      const hangoutId = hangoutData[0].id;

      await supabase.from('event_registry').insert({
        user_id: user.id,
        event_type: 'hangout',
        event_id: hangoutId,
        event_date: formData.hangout_date,
        event_name: formData.hangout_name,
        is_public: formData.is_public
      });

      navigate(`/hangout/${hangoutId}`);
    } catch (err) {
      console.error('Error creating hangout:', err);
      alert('Error creating hangout');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-cyan-100 p-6">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-4xl font-bold text-gray-800 mb-2">👋 Plan a Hangout</h1>
        <p className="text-gray-600 mb-8">No agenda. Just vibes. See you there!</p>

        <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-lg p-8 space-y-6">
          
          {/* Hangout Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">What to Call It</label>
            <input
              type="text"
              name="hangout_name"
              placeholder="e.g., Movie Night, Game Session, Coffee & Chill"
              value={formData.hangout_name}
              onChange={handleChange}
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Date & Time */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">When</label>
              <input
                type="date"
                name="hangout_date"
                value={formData.hangout_date}
                onChange={handleChange}
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Time (Optional)</label>
              <input
                type="time"
                name="hangout_time"
                value={formData.hangout_time}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* Who's Coming */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Who's Coming</label>
            <input
              type="text"
              name="who_coming"
              placeholder="The crew, Besties, Work friends, Family..."
              value={formData.who_coming}
              onChange={handleChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Expected People */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">How Many People</label>
            <input
              type="number"
              name="expected_people"
              placeholder="Just a few or a whole squad?"
              value={formData.expected_people}
              onChange={handleChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Location */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Where At</label>
            <input
              type="text"
              name="location"
              placeholder="Your place, the park, a cafe..."
              value={formData.location}
              onChange={handleChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Vibe */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">The Vibe</label>
            <select
              name="vibe"
              value={formData.vibe}
              onChange={handleChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="Chill">Chill</option>
              <option value="Active">Active</option>
              <option value="Productive">Productive</option>
              <option value="Gaming">Gaming</option>
              <option value="Movie Night">Movie Night</option>
              <option value="Cozy">Cozy</option>
            </select>
          </div>

          {/* Snacks */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Snacks</label>
            <input
              type="text"
              name="snacks"
              placeholder="Chips & dip, Pizza, Popcorn, Charcuterie..."
              value={formData.snacks}
              onChange={handleChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Drinks Provided */}
          <div className="flex items-center gap-3 p-4 bg-blue-50 rounded-lg">
            <input
              type="checkbox"
              name="drinks_provided"
              checked={formData.drinks_provided}
              onChange={handleChange}
              className="w-4 h-4"
            />
            <label className="text-sm font-medium text-gray-700">Someone's bringing drinks</label>
          </div>

          {/* Public Toggle */}
          <div className="flex items-center gap-3 p-4 bg-blue-50 rounded-lg">
            <input
              type="checkbox"
              name="is_public"
              checked={formData.is_public}
              onChange={handleChange}
              className="w-4 h-4"
            />
            <label className="text-sm font-medium text-gray-700">Let people RSVP (make shareable)</label>
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
              className="flex-1 px-6 py-3 bg-gradient-to-r from-blue-500 to-cyan-500 text-white rounded-lg font-medium hover:shadow-lg disabled:opacity-50"
            >
              {loading ? 'Creating...' : 'Plan Hangout'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
