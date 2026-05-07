import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../supabase';

export default function EditHangout() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
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
    is_public: false,
    status: 'planned'
  });

  useEffect(() => {
    loadHangout();
  }, [id]);

  const loadHangout = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate('/login');
        return;
      }

      const { data, error } = await supabase
        .from('hangouts')
        .select('*')
        .eq('id', id)
        .eq('user_id', user.id)
        .single();

      if (error || !data) {
        alert('Hangout not found or access denied');
        navigate('/events');
        return;
      }

      setFormData({
        hangout_name: data.hangout_name || '',
        hangout_date: data.hangout_date || '',
        hangout_time: data.hangout_time || '',
        who_coming: data.who_coming || '',
        expected_people: data.expected_people?.toString() || '',
        location: data.location || '',
        vibe: data.vibe || 'Chill',
        snacks: data.snacks || '',
        drinks_provided: data.drinks_provided || false,
        chill_activities_json: data.chill_activities_json ? JSON.stringify(data.chill_activities_json) : '[]',
        music_playlist_json: data.music_playlist_json ? JSON.stringify(data.music_playlist_json) : '[]',
        notes: data.notes || '',
        is_public: data.is_public || false,
        status: data.status || 'planned'
      });
    } catch (err) {
      console.error('Error loading hangout:', err);
      alert('Error loading hangout');
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
      if (!formData.hangout_name?.trim()) {
        alert('Please enter a hangout name');
        setSaving(false);
        return;
      }
      if (!formData.hangout_date) {
        alert('Please select a hangout date');
        setSaving(false);
        return;
      }

      const updateData = {
        hangout_name: formData.hangout_name,
        hangout_date: formData.hangout_date,
        hangout_time: formData.hangout_time,
        who_coming: formData.who_coming,
        expected_people: formData.expected_people ? parseInt(formData.expected_people) : null,
        location: formData.location,
        vibe: formData.vibe,
        snacks: formData.snacks,
        drinks_provided: formData.drinks_provided,
        chill_activities_json: formData.chill_activities_json ? JSON.parse(formData.chill_activities_json) : [],
        music_playlist_json: formData.music_playlist_json ? JSON.parse(formData.music_playlist_json) : [],
        notes: formData.notes,
        is_public: formData.is_public,
        status: formData.status
      };

      const { error } = await supabase
        .from('hangouts')
        .update(updateData)
        .eq('id', id);

      if (error) throw error;

      await supabase
        .from('event_registry')
        .update({
          event_name: formData.hangout_name,
          event_date: formData.hangout_date,
          is_public: formData.is_public
        })
        .eq('event_id', id)
        .eq('event_type', 'hangout');

      alert('Hangout updated successfully!');
      navigate(`/hangout/${id}`);
    } catch (err) {
      console.error('Error updating hangout:', err);
      alert('Error updating hangout: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-cyan-100">
        <div className="text-blue-500 text-2xl animate-pulse">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-cyan-100 p-6">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-4xl font-bold text-gray-800 mb-2">👋 Edit Hangout</h1>
        <p className="text-gray-600 mb-8">Update your hangout details</p>

        <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-lg p-8 space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">What to Name It</label>
            <input
              type="text"
              name="hangout_name"
              value={formData.hangout_name}
              onChange={handleChange}
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="e.g., Movie Night, Game Session, Coffee & Chill"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Date</label>
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

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Who's Coming</label>
            <input
              type="text"
              name="who_coming"
              value={formData.who_coming}
              onChange={handleChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="The crew, Besties, Work friends, Family..."
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Expected People</label>
              <input
                type="number"
                name="expected_people"
                value={formData.expected_people}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Just a few or a whole squad?"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Vibe</label>
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
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Location</label>
            <input
              type="text"
              name="location"
              value={formData.location}
              onChange={handleChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Your place, the park, a cafe..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Snacks</label>
            <input
              type="text"
              name="snacks"
              value={formData.snacks}
              onChange={handleChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Chips & dip, Pizza, Popcorn, Charcuterie..."
            />
          </div>

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

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Chill Activities (JSON)</label>
            <textarea
              name="chill_activities_json"
              value={formData.chill_activities_json}
              onChange={handleChange}
              rows="3"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm"
              placeholder='["gaming", "movies", "board games"]'
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Music Playlist (JSON)</label>
            <textarea
              name="music_playlist_json"
              value={formData.music_playlist_json}
              onChange={handleChange}
              rows="3"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm"
              placeholder='["song1", "song2", "song3"]'
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Notes</label>
            <textarea
              name="notes"
              value={formData.notes}
              onChange={handleChange}
              rows="3"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Reminders, supplies needed, etc..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
            <select
              name="status"
              value={formData.status}
              onChange={handleChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="planned">Planned</option>
              <option value="locked">Locked</option>
              <option value="completed">Completed</option>
            </select>
          </div>

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

          <div className="flex gap-4 pt-6">
            <button
              type="button"
              onClick={() => navigate(`/hangout/${id}`)}
              className="flex-1 px-6 py-3 bg-gray-300 text-gray-800 rounded-lg font-medium hover:bg-gray-400"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 px-6 py-3 bg-gradient-to-r from-blue-500 to-cyan-500 text-white rounded-lg font-medium hover:shadow-lg disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
