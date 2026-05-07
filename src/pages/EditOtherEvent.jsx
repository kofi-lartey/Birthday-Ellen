import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../supabase';
import { formatDateForDB, safeFormatDate } from '../utils/dateUtils';

export default function EditOtherEvent() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    event_name: '',
    event_date: '',
    event_time: '',
    event_category: '',
    description: '',
    custom_fields: {},
    is_public: false,
    featured: false,
    status: 'planned'
  });

  useEffect(() => {
    loadEvent();
  }, [id]);

  const loadEvent = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate('/login');
        return;
      }

      const { data, error } = await supabase
        .from('other_events')
        .select('*')
        .eq('id', id)
        .eq('user_id', user.id)
        .single();

      if (error || !data) {
        alert('Event not found or access denied');
        navigate('/events');
        return;
      }

      setFormData({
        event_name: data.event_name || '',
        event_date: data.event_date || '',
        event_time: data.event_time || '',
        event_category: data.event_category || '',
        description: data.description || '',
        custom_fields: data.custom_fields || {},
        is_public: data.is_public || false,
        featured: data.featured || false,
        status: data.status || 'planned'
      });
    } catch (err) {
      console.error('Error loading event:', err);
      alert('Error loading event');
      navigate('/events');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    if (name.startsWith('custom_')) {
      const fieldName = name.replace('custom_', '');
      setFormData(prev => ({
        ...prev,
        custom_fields: {
          ...prev.custom_fields,
          [fieldName]: value
        }
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: type === 'checkbox' ? checked : value
      }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);

    try {
      // Validate required fields
      if (!formData.event_name?.trim()) {
        alert('Please enter an event name');
        setSaving(false);
        return;
      }
      if (!formData.event_date) {
        alert('Please select an event date');
        setSaving(false);
        return;
      }

      const updateData = {
        event_name: formData.event_name,
        event_date: formData.event_date,
        event_time: formData.event_time,
        event_category: formData.event_category,
        description: formData.description,
        custom_fields: formData.custom_fields,
        is_public: formData.is_public,
        featured: formData.featured,
        status: formData.status
      };

      const { error } = await supabase
        .from('other_events')
        .update(updateData)
        .eq('id', id);

      if (error) throw error;

      await supabase
        .from('event_registry')
        .update({
          event_name: formData.event_name,
          event_date: formData.event_date,
          is_public: formData.is_public
        })
        .eq('event_id', id)
        .eq('event_type', 'other');

      alert('Event updated successfully!');
      navigate(`/other-event/${id}`);
    } catch (err) {
      console.error('Error updating event:', err);
      alert('Error updating event: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100">
        <div className="text-gray-500 text-2xl animate-pulse">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-6">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-4xl font-bold text-gray-800 mb-2">📅 Edit Event</h1>
        <p className="text-gray-600 mb-8">Update your event details</p>

        <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-lg p-8 space-y-6">
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Event Name *</label>
            <input
              type="text"
              name="event_name"
              value={formData.event_name}
              onChange={handleChange}
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-500 focus:border-transparent"
              placeholder="e.g., Product Launch, Family Reunion, Concert Night"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Event Category</label>
            <input
              type="text"
              name="event_category"
              value={formData.event_category}
              onChange={handleChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-500 focus:border-transparent"
              placeholder="Conference, Graduation, Festival, Reunion, etc."
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Date *</label>
              <input
                type="date"
                name="event_date"
                value={formData.event_date}
                onChange={handleChange}
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Time (Optional)</label>
              <input
                type="time"
                name="event_time"
                value={formData.event_time}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-500 focus:border-transparent"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleChange}
              rows="3"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-500 focus:border-transparent"
              placeholder="Tell us about this event..."
            />
          </div>

          <div className="border-t-2 pt-6">
            <h3 className="text-lg font-bold text-gray-800 mb-4">Event Details</h3>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Location</label>
              <input
                type="text"
                name="custom_location"
                value={formData.custom_fields.location || ''}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-500 focus:border-transparent"
                placeholder="Where is it happening?"
              />
            </div>

            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">Attendees</label>
              <input
                type="text"
                name="custom_attendees"
                value={formData.custom_fields.attendees || ''}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-500 focus:border-transparent"
                placeholder="Names or groups of people"
              />
            </div>

            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">Additional Details</label>
              <textarea
                name="custom_details"
                value={formData.custom_fields.details || ''}
                onChange={handleChange}
                rows="3"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-500 focus:border-transparent"
                placeholder="Theme, dress code, what to bring..."
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
            <select
              name="status"
              value={formData.status}
              onChange={handleChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-500 focus:border-transparent"
            >
              <option value="planned">Planned</option>
              <option value="locked">Locked</option>
              <option value="completed">Completed</option>
            </select>
          </div>

          <div className="flex items-center gap-3 p-4 bg-gray-100 rounded-lg">
            <input
              type="checkbox"
              name="is_public"
              checked={formData.is_public}
              onChange={handleChange}
              className="w-4 h-4"
            />
            <label className="text-sm font-medium text-gray-700">Make event public (shareable link)</label>
          </div>

          <div className="flex items-center gap-3 p-4 bg-gray-100 rounded-lg">
            <input
              type="checkbox"
              name="featured"
              checked={formData.featured}
              onChange={handleChange}
              className="w-4 h-4"
            />
            <label className="text-sm font-medium text-gray-700">Feature on dashboard</label>
          </div>

          <div className="flex gap-4 pt-6">
            <button
              type="button"
              onClick={() => navigate(`/other-event/${id}`)}
              className="flex-1 px-6 py-3 bg-gray-300 text-gray-800 rounded-lg font-medium hover:bg-gray-400"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 px-6 py-3 bg-gradient-to-r from-gray-600 to-gray-800 text-white rounded-lg font-medium hover:shadow-lg disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
