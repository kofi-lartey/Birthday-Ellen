import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabase';
import { formatDateForDB } from '../utils/dateUtils';

export default function CreateOtherEvent() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    event_name: '',
    event_date: '',
    event_time: '',
    event_category: '',
    description: '',
    custom_fields: {
      attendees: '',
      location: '',
      details: ''
    },
    is_public: false
  });

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
    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Validate required fields
      if (!formData.event_name?.trim()) {
        alert('Please enter an event name');
        setLoading(false);
        return;
      }
      if (!formData.event_date) {
        alert('Please select an event date');
        setLoading(false);
        return;
      }

       const { data: eventData, error } = await supabase
        .from('other_events')
        .insert({
          user_id: user.id,
          ...formData,
          event_date: formatDateForDB(formData.event_date)
        })
        .select();

      if (error) throw error;

      const eventId = eventData[0].id;

      await supabase.from('event_registry').insert({
        user_id: user.id,
        event_type: 'other',
        event_id: eventId,
        event_date: formData.event_date,
        event_name: formData.event_name,
        is_public: formData.is_public
      });

      navigate(`/other-event/${eventId}`);
    } catch (err) {
      console.error('Error creating event:', err);
      alert('Error creating event');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-6">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-4xl font-bold text-gray-800 mb-2">📅 Create an Event</h1>
        <p className="text-gray-600 mb-8">Your moment. Your way. We'll handle the rest.</p>

        <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-lg p-8 space-y-6">
          
          {/* Event Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Event Name *</label>
            <input
              type="text"
              name="event_name"
              placeholder="e.g., Product Launch, Family Reunion, Concert Night"
              value={formData.event_name}
              onChange={handleChange}
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-500 focus:border-transparent"
            />
          </div>

          {/* Event Category */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">What Kind of Event?</label>
            <input
              type="text"
              name="event_category"
              placeholder="Conference, Graduation, Festival, Reunion, etc."
              value={formData.event_category}
              onChange={handleChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-500 focus:border-transparent"
            />
          </div>

          {/* Date & Time */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">When *</label>
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

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
            <textarea
              name="description"
              placeholder="Tell us about this event..."
              value={formData.description}
              onChange={handleChange}
              rows="3"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-500 focus:border-transparent"
            />
          </div>

          {/* Custom Fields */}
          <div className="border-t-2 pt-6">
            <h3 className="text-lg font-bold text-gray-800 mb-4">Event Details</h3>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Location</label>
              <input
                type="text"
                name="custom_location"
                placeholder="Where is it happening?"
                value={formData.custom_fields.location}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-500 focus:border-transparent"
              />
            </div>

            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">Attendees / Who's Invited</label>
              <input
                type="text"
                name="custom_attendees"
                placeholder="Names or groups of people"
                value={formData.custom_fields.attendees}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-500 focus:border-transparent"
              />
            </div>

            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">Additional Details</label>
              <textarea
                name="custom_details"
                placeholder="Theme, dress code, what to bring..."
                value={formData.custom_fields.details}
                onChange={handleChange}
                rows="3"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* Public Toggle */}
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
              className="flex-1 px-6 py-3 bg-gradient-to-r from-gray-600 to-gray-800 text-white rounded-lg font-medium hover:shadow-lg disabled:opacity-50"
            >
              {loading ? 'Creating...' : 'Create Event'}
            </button>
          </div>
        </form>

        <p className="text-xs text-gray-500 text-center mt-6">* Required fields</p>
      </div>
    </div>
  );
}
