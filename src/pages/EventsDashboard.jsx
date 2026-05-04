import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabase';

export default function EventsDashboard() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('all');
  const navigate = useNavigate();

  useEffect(() => {
    fetchAllEvents();
  }, []);

  const fetchAllEvents = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('event_registry')
        .select('*')
        .eq('user_id', user.id)
        .order('event_date', { ascending: true });

      if (error) throw error;
      setEvents(data || []);
    } catch (err) {
      console.error('Error fetching events:', err);
    } finally {
      setLoading(false);
    }
  };

  const filteredEvents = activeTab === 'all' 
    ? events 
    : events.filter(e => e.event_type === activeTab);

  const getEventIcon = (type) => {
    const icons = {
      birthday: '🎂',
      wedding: '💍',
      anniversary: '💕',
      party: '🎉',
      hangout: '👋',
      other: '📅'
    };
    return icons[type] || '📅';
  };

  const getEventColor = (type) => {
    const colors = {
      birthday: 'bg-yellow-50 border-yellow-200',
      wedding: 'bg-pink-50 border-pink-200',
      anniversary: 'bg-red-50 border-red-200',
      party: 'bg-purple-50 border-purple-200',
      hangout: 'bg-blue-50 border-blue-200',
      other: 'bg-gray-50 border-gray-200'
    };
    return colors[type] || 'bg-gray-50';
  };

  const navigateToEvent = (event) => {
    const routes = {
      birthday: `/birthday/${event.event_id}`,
      wedding: `/wedding/${event.event_id}`,
      anniversary: `/anniversary/${event.event_id}`,
      party: `/party/${event.event_id}`,
      hangout: `/hangout/${event.event_id}`,
      other: `/other-event/${event.event_id}`
    };
    navigate(routes[event.event_type] || '/');
  };

  const navigateToCreate = (type) => {
    const routes = {
      birthday: '/birthday',
      wedding: '/create-wedding',
      anniversary: '/create-anniversary',
      party: '/create-party',
      hangout: '/create-hangout',
      other: '/create-other-event'
    };
    navigate(routes[type]);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-6">
      <div className="max-w-7xl mx-auto">
        
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-800 mb-2">Your Events</h1>
          <p className="text-gray-600">Celebrate every moment of your life</p>
        </div>

        {/* Create Event Buttons */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-8">
          {[
            { type: 'wedding', label: 'Wedding', icon: '💍' },
            { type: 'anniversary', label: 'Anniversary', icon: '💕' },
            { type: 'party', label: 'Party', icon: '🎉' },
            { type: 'hangout', label: 'Hangout', icon: '👋' },
            { type: 'birthday', label: 'Birthday', icon: '🎂' },
            { type: 'other', label: 'Other', icon: '📅' }
          ].map(btn => (
            <button
              key={btn.type}
              onClick={() => navigateToCreate(btn.type)}
              className="p-4 bg-white rounded-lg shadow hover:shadow-lg transition transform hover:scale-105 text-center"
            >
              <div className="text-2xl mb-2">{btn.icon}</div>
              <div className="text-sm font-medium text-gray-700">{btn.label}</div>
            </button>
          ))}
        </div>

        {/* Tab Navigation */}
        <div className="flex overflow-x-auto gap-2 mb-6 pb-2">
          {['all', 'birthday', 'wedding', 'anniversary', 'party', 'hangout', 'other'].map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 rounded-lg font-medium whitespace-nowrap transition ${
                activeTab === tab
                  ? 'bg-indigo-600 text-white'
                  : 'bg-white text-gray-700 hover:bg-gray-100'
              }`}
            >
              {tab === 'all' ? '📅 All' : `${getEventIcon(tab)} ${tab.charAt(0).toUpperCase() + tab.slice(1)}`}
            </button>
          ))}
        </div>

        {/* Events Grid */}
        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
          </div>
        ) : filteredEvents.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-lg">
            <p className="text-gray-500 mb-4">No {activeTab !== 'all' ? activeTab : 'upcoming'} events yet</p>
            <button
              onClick={() => navigateToCreate(activeTab === 'all' ? 'wedding' : activeTab)}
              className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
            >
              Create Your First Event
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredEvents.map(event => (
              <div
                key={`${event.event_type}-${event.event_id}`}
                onClick={() => navigateToEvent(event)}
                className={`p-6 rounded-lg shadow hover:shadow-lg transition cursor-pointer border-2 ${getEventColor(event.event_type)}`}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <span className="text-3xl">{getEventIcon(event.event_type)}</span>
                    <div>
                      <h3 className="font-bold text-lg text-gray-800">{event.event_name}</h3>
                      <p className="text-sm text-gray-600 capitalize">{event.event_type}</p>
                    </div>
                  </div>
                  {event.featured && <span className="text-lg">⭐</span>}
                </div>
                
                <div className="flex items-center gap-2 text-gray-700 mb-3">
                  <span className="text-lg">📅</span>
                  <span className="font-medium">{new Date(event.event_date).toLocaleDateString()}</span>
                </div>

                {event.is_public && (
                  <div className="text-xs font-medium text-indigo-600 bg-indigo-100 px-3 py-1 rounded-full inline-block">
                    🔗 Public
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
