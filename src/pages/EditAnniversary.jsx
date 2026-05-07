import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../supabase';

export default function EditAnniversary() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    couple_names: '',
    anniversary_date: '',
    years_married: '',
    gift_idea: '',
    special_memory: '',
    celebration_plan: '',
    is_public: false,
    featured: false
  });

  useEffect(() => {
    loadAnniversary();
  }, [id]);

  const loadAnniversary = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate('/login');
        return;
      }

      const { data, error } = await supabase
        .from('anniversaries')
        .select('*')
        .eq('id', id)
        .eq('user_id', user.id)
        .single();

      if (error || !data) {
        alert('Anniversary not found or access denied');
        navigate('/events');
        return;
      }

      setFormData({
        couple_names: data.couple_names || '',
        anniversary_date: data.anniversary_date || '',
        years_married: data.years_married?.toString() || '',
        gift_idea: data.gift_idea || '',
        special_memory: data.special_memory || '',
        celebration_plan: data.celebration_plan || '',
        is_public: data.is_public || false,
        featured: data.featured || false
      });
    } catch (err) {
      console.error('Error loading anniversary:', err);
      alert('Error loading anniversary');
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
      if (!formData.anniversary_date) {
        alert('Please select an anniversary date');
        setSaving(false);
        return;
      }

      const updateData = {
        couple_names: formData.couple_names,
        anniversary_date: formData.anniversary_date,
        years_married: formData.years_married ? parseInt(formData.years_married) : null,
        gift_idea: formData.gift_idea,
        special_memory: formData.special_memory,
        celebration_plan: formData.celebration_plan,
        is_public: formData.is_public,
        featured: formData.featured
      };

      const { error } = await supabase
        .from('anniversaries')
        .update(updateData)
        .eq('id', id);

      if (error) throw error;

      await supabase
        .from('event_registry')
        .update({ 
          event_name: formData.couple_names,
          event_date: formData.anniversary_date,
          is_public: formData.is_public
        })
        .eq('event_id', id)
        .eq('event_type', 'anniversary');

      alert('Anniversary updated successfully!');
      navigate(`/anniversary/${id}`);
    } catch (err) {
      console.error('Error updating anniversary:', err);
      alert('Error updating anniversary: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-50 to-rose-100">
        <div className="text-rose-500 text-2xl animate-pulse">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 to-rose-100 p-6">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-4xl font-bold text-gray-800 mb-2">✏️ Edit Anniversary</h1>
        <p className="text-gray-600 mb-8">Update your anniversary details</p>

        <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-lg p-8 space-y-8">
          <div className="border-t-4 border-red-200 pt-6">
            <h2 className="text-2xl font-bold text-gray-800 mb-4">Basic Information</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Your Names *</label>
                <input
                  type="text"
                  name="couple_names"
                  value={formData.couple_names}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Anniversary Date *</label>
                <input
                  type="date"
                  name="anniversary_date"
                  value={formData.anniversary_date}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Years Married</label>
                <input
                  type="number"
                  name="years_married"
                  value={formData.years_married}
                  onChange={handleChange}
                  placeholder="e.g., 5"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                />
              </div>
            </div>
          </div>

          <div className="border-t-4 border-red-200 pt-6">
            <h2 className="text-2xl font-bold text-gray-800 mb-4">Special Memory</h2>
            <textarea
              name="special_memory"
              value={formData.special_memory}
              onChange={handleChange}
              rows="4"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
              placeholder="Share a favorite memory or moment from your relationship..."
            />
          </div>

          <div className="border-t-4 border-red-200 pt-6">
            <h2 className="text-2xl font-bold text-gray-800 mb-4">Gift Idea</h2>
            <input
              type="text"
              name="gift_idea"
              value={formData.gift_idea}
              onChange={handleChange}
              placeholder="Dream gift, experience, or gesture..."
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
            />
          </div>

          <div className="border-t-4 border-red-200 pt-6">
            <h2 className="text-2xl font-bold text-gray-800 mb-4">How You'll Celebrate</h2>
            <textarea
              name="celebration_plan"
              value={formData.celebration_plan}
              onChange={handleChange}
              rows="3"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
              placeholder="Dinner at home? Night out? Weekend getaway?"
            />
          </div>

          <div className="flex items-center gap-3 p-4 bg-red-50 rounded-lg">
            <input
              type="checkbox"
              name="is_public"
              checked={formData.is_public}
              onChange={handleChange}
              className="w-4 h-4"
            />
            <label className="text-sm font-medium text-gray-700">Share with friends and family</label>
          </div>

          <div className="flex gap-4 pt-6">
            <button
              type="button"
              onClick={() => navigate(`/anniversary/${id}`)}
              className="flex-1 px-6 py-3 bg-gray-300 text-gray-800 rounded-lg font-medium hover:bg-gray-400"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 px-6 py-3 bg-gradient-to-r from-red-500 to-rose-500 text-white rounded-lg font-medium hover:shadow-lg disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
