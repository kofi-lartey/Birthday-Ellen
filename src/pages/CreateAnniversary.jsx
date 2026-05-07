import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabase';
import { formatDateForDB } from '../utils/dateUtils';

export default function CreateAnniversary() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    couple_names: '',
    anniversary_date: '',
    years_married: '',
    gift_idea: '',
    special_memory: '',
    celebration_plan: '',
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
      if (!formData.couple_names?.trim()) {
        alert('Please enter couple names');
        setLoading(false);
        return;
      }
      if (!formData.anniversary_date) {
        alert('Please select an anniversary date');
        setLoading(false);
        return;
      }

       const { data: anniversaryData, error } = await supabase
        .from('anniversaries')
        .insert({
          user_id: user.id,
          ...formData,
          anniversary_date: formatDateForDB(formData.anniversary_date)
        })
        .select();

      if (error) throw error;

      const anniversaryId = anniversaryData[0].id;

      await supabase.from('event_registry').insert({
        user_id: user.id,
        event_type: 'anniversary',
        event_id: anniversaryId,
        event_date: formData.anniversary_date,
        event_name: formData.couple_names,
        is_public: formData.is_public
      });

      navigate(`/anniversary/${anniversaryId}`);
    } catch (err) {
      console.error('Error creating anniversary:', err);
      alert('Error creating anniversary');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 to-rose-100 p-6">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-4xl font-bold text-gray-800 mb-2">💕 Celebrate Your Anniversary</h1>
        <p className="text-gray-600 mb-8">Still choosing each other, year after year</p>

        <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-lg p-8 space-y-6">
          
          {/* Couple Names */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Your Names</label>
            <input
              type="text"
              name="couple_names"
              placeholder="e.g., Sarah & Michael"
              value={formData.couple_names}
              onChange={handleChange}
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
            />
          </div>

          {/* Anniversary Date */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Anniversary Date</label>
            <input
              type="date"
              name="anniversary_date"
              value={formData.anniversary_date}
              onChange={handleChange}
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
            />
          </div>

          {/* Years Married */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Years Married</label>
            <input
              type="number"
              name="years_married"
              placeholder="e.g., 5"
              value={formData.years_married}
              onChange={handleChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
            />
          </div>

          {/* Special Memory */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">A Special Memory</label>
            <textarea
              name="special_memory"
              placeholder="Share a favorite memory or moment from your relationship..."
              value={formData.special_memory}
              onChange={handleChange}
              rows="4"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
            />
          </div>

          {/* Gift Idea */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Gift Idea</label>
            <input
              type="text"
              name="gift_idea"
              placeholder="Dream gift, experience, or gesture..."
              value={formData.gift_idea}
              onChange={handleChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
            />
          </div>

          {/* Celebration Plan */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">How You'll Celebrate</label>
            <textarea
              name="celebration_plan"
              placeholder="Dinner at home? Night out? Weekend getaway?"
              value={formData.celebration_plan}
              onChange={handleChange}
              rows="3"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
            />
          </div>

          {/* Public Toggle */}
          <div className="flex items-center gap-3 p-4 bg-red-50 rounded-lg">
            <input
              type="checkbox"
              name="is_public"
              checked={formData.is_public}
              onChange={handleChange}
              className="w-4 h-4"
            />
            <label className="text-sm font-medium text-gray-700">Share with friends and family (optional)</label>
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
              className="flex-1 px-6 py-3 bg-gradient-to-r from-red-500 to-rose-500 text-white rounded-lg font-medium hover:shadow-lg disabled:opacity-50"
            >
              {loading ? 'Creating...' : 'Save Anniversary'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
