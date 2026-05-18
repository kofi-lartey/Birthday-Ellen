import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabase';

export default function CreateEvent() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [eventType, setEventType] = useState('birthday');
  const [userPackage, setUserPackage] = useState(null);
  const [formData, setFormData] = useState({
    event_name: '',
    event_date: '',
    is_public: false
  });
  const [user, setUser] = useState(null);

  // All available event types with their details
  const allEventTypes = [
    { value: 'birthday', label: 'Birthday', emoji: '🎂', gradient: 'from-rose-500 to-pink-500', placeholder: 'e.g., Sarah\'s Birthday' },
    { value: 'wedding', label: 'Wedding', emoji: '💍', gradient: 'from-pink-500 to-rose-500', placeholder: 'e.g., Sarah & Michael' },
    { value: 'anniversary', label: 'Anniversary', emoji: '💕', gradient: 'from-red-500 to-rose-500', placeholder: 'e.g., John & Jane' },
    { value: 'party', label: 'Party', emoji: '🎉', gradient: 'from-purple-500 to-indigo-500', placeholder: 'e.g., Summer Bash' },
    { value: 'hangout', label: 'Hangout', emoji: '👋', gradient: 'from-blue-500 to-cyan-500', placeholder: 'e.g., Movie Night' },
    { value: 'other', label: 'Other', emoji: '📅', gradient: 'from-gray-500 to-gray-700', placeholder: 'e.g., Special Event' }
  ];

  // Load user and their package on mount
  useEffect(() => {
    const loadUserAndPackage = async () => {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (authUser) {
        setUser(authUser);
        
        // Get user's package from database
        const { data: userData } = await supabase
          .from('users')
          .select('package_tier')
          .eq('id', authUser.id)
          .single();
        
        if (userData?.package_tier) {
          setUserPackage(userData.package_tier);
        } else {
          // Check localStorage as fallback
          const localUser = JSON.parse(localStorage.getItem('current_user') || 'null');
          if (localUser?.package_tier) {
            setUserPackage(localUser.package_tier);
          } else {
            // Default to free package
            setUserPackage('free');
          }
        }
      }
    };
    loadUserAndPackage();
  }, []);

  // Get allowed event types based on user's package tier
  const getAllowedEventTypes = () => {
    const packageRestrictions = {
      free: ['birthday'],
      basic: ['birthday', 'wedding'],
      premium: ['birthday', 'wedding', 'anniversary', 'party'],
      enterprise: ['birthday', 'wedding', 'anniversary', 'party', 'hangout', 'other']
    };
    
    const allowed = packageRestrictions[userPackage] || packageRestrictions.free;
    return allEventTypes.filter(type => allowed.includes(type.value));
  };

  const allowedEventTypes = getAllowedEventTypes();
  const selectedEventType = allowedEventTypes.find(t => t.value === eventType) || allowedEventTypes[0];

  // Auto-select first allowed type if current type is not allowed
  useEffect(() => {
    if (allowedEventTypes.length > 0 && !allowedEventTypes.find(t => t.value === eventType)) {
      setEventType(allowedEventTypes[0].value);
    }
  }, [userPackage, eventType]);

  const generateCode = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    for (let i = 0; i < 6; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const validateForm = () => {
    if (!formData.event_name.trim()) {
      alert('Please enter the event name!');
      return false;
    }
    if (!formData.event_date) {
      alert('Please select the event date!');
      return false;
    }
    return true;
  };

  const createEvent = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;
    
    setLoading(true);

    try {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser) throw new Error('Not authenticated');

      const code = generateCode();

      // Prepare basic event data
      const eventData = {
        user_id: authUser.id,
        event_type: eventType,
        event_name: formData.event_name.trim(),
        event_date: formData.event_date,
        code: code,
        is_public: formData.is_public,
        status: 'active',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      let eventId = null;

      // For non-birthday events, also create in specific table
      if (eventType !== 'birthday') {
        const tableMap = {
          wedding: 'weddings',
          anniversary: 'anniversaries',
          party: 'parties',
          hangout: 'hangouts',
          other: 'other_events'
        };
        
        const tableName = tableMap[eventType];
        
        const specificTableData = {
          user_id: authUser.id,
          created_at: new Date().toISOString(),
          ...(eventType === 'wedding' && { couple_names: formData.event_name.trim() }),
          ...(eventType === 'anniversary' && { couple_names: formData.event_name.trim() }),
          ...(eventType === 'party' && { party_name: formData.event_name.trim() }),
          ...(eventType === 'hangout' && { hangout_name: formData.event_name.trim() }),
          ...(eventType === 'other' && { event_name: formData.event_name.trim() })
        };

        if (eventType === 'wedding') specificTableData.wedding_date = formData.event_date;
        if (eventType === 'anniversary') specificTableData.anniversary_date = formData.event_date;
        if (eventType === 'party') specificTableData.party_date = formData.event_date;
        if (eventType === 'hangout') specificTableData.hangout_date = formData.event_date;
        if (eventType === 'other') specificTableData.event_date = formData.event_date;

        const { data: specificResult, error: specificError } = await supabase
          .from(tableName)
          .insert(specificTableData)
          .select('id')
          .single();

        if (!specificError && specificResult) {
          eventId = specificResult.id;
          eventData.event_id = eventId;
        }
      }

      // Insert into event_registry
      const { error: registryError } = await supabase
        .from('event_registry')
        .insert(eventData);

      if (registryError) throw registryError;

      alert(`Event created successfully! Code: ${code}`);
      navigate(`/dashboard`);

    } catch (err) {
      console.error('Error creating event:', err);
      alert('Error creating event: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  // Get upgrade message based on package
  const getUpgradeMessage = () => {
    if (userPackage === 'free') {
      return "Upgrade to Basic to create Wedding events!";
    }
    if (userPackage === 'basic') {
      return "Upgrade to Premium to create Anniversary and Party events!";
    }
    if (userPackage === 'premium') {
      return "Upgrade to Enterprise to create Hangout and Other events!";
    }
    return null;
  };

  const upgradeMessage = getUpgradeMessage();

  return (
    <div className="min-h-screen bg-gradient-to-br from-rose-50 via-pink-50 to-purple-50 py-12 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <button
            onClick={() => navigate('/dashboard')}
            className="float-left text-rose-500 hover:text-rose-600 mb-4"
          >
            ← Back to Dashboard
          </button>
          <div className="text-6xl mb-4">{selectedEventType?.emoji}</div>
          <h1 className="text-4xl font-['Dancing_Script'] text-rose-500">
            Create a New Event
          </h1>
          <p className="text-gray-600 mt-2">
            Your plan: <span className="font-semibold capitalize">{userPackage}</span>
          </p>
        </div>

        <form onSubmit={createEvent} className="bg-white rounded-3xl shadow-2xl p-8 space-y-6">
          {/* Event Type Selection - Filtered by package */}
          <div>
            <label className="block text-gray-700 font-semibold mb-3">What type of event?</label>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {allowedEventTypes.map((type) => (
                <button
                  key={type.value}
                  type="button"
                  onClick={() => setEventType(type.value)}
                  className={`p-4 rounded-2xl text-center transition-all ${
                    eventType === type.value
                      ? `bg-gradient-to-r ${type.gradient} text-white shadow-lg`
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  <div className="text-3xl mb-1">{type.emoji}</div>
                  <div className="font-semibold text-sm">{type.label}</div>
                </button>
              ))}
            </div>
            
            {/* Show upgrade message if some event types are locked */}
            {upgradeMessage && (
              <div className="mt-3 p-3 bg-amber-50 rounded-lg border border-amber-200">
                <p className="text-amber-700 text-sm flex items-center gap-2">
                  <span className="text-lg">🔒</span>
                  {upgradeMessage}
                  <button
                    type="button"
                    onClick={() => navigate('/select-package')}
                    className="ml-auto text-amber-800 font-semibold underline hover:no-underline"
                  >
                    Upgrade Now →
                  </button>
                </p>
              </div>
            )}
          </div>

          {/* Event Name */}
          <div>
            <label className="block text-gray-700 font-semibold mb-2">
              {eventType === 'wedding' ? 'Couple Names' : 
               eventType === 'anniversary' ? 'Couple Names' :
               eventType === 'party' ? 'Party Name' :
               eventType === 'hangout' ? 'Hangout Name' : 'Event Name'} *
            </label>
            <input
              type="text"
              name="event_name"
              value={formData.event_name}
              onChange={handleChange}
              required
              className="w-full p-3 border-2 border-rose-200 rounded-xl focus:border-rose-400 focus:outline-none"
              placeholder={selectedEventType?.placeholder}
            />
          </div>

          {/* Event Date */}
          <div>
            <label className="block text-gray-700 font-semibold mb-2">
              {eventType === 'wedding' ? 'Wedding Date' :
               eventType === 'anniversary' ? 'Anniversary Date' :
               eventType === 'party' ? 'Party Date' :
               eventType === 'hangout' ? 'Hangout Date' : 'Event Date'} *
            </label>
            <input
              type="date"
              name="event_date"
              value={formData.event_date}
              onChange={handleChange}
              required
              className="w-full p-3 border-2 border-rose-200 rounded-xl focus:border-rose-400 focus:outline-none"
            />
          </div>

          {/* Public Toggle */}
          <div className="flex items-center gap-3 p-4 bg-rose-50 rounded-xl">
            <input
              type="checkbox"
              name="is_public"
              checked={formData.is_public}
              onChange={handleChange}
              className="w-5 h-5 accent-rose-500"
            />
            <label className="text-gray-700 font-medium">Make this event public (shareable link)</label>
          </div>

          {/* Info Box */}
          <div className="bg-blue-50 rounded-xl p-4">
            <p className="text-blue-800 text-sm flex items-center gap-2">
              <span className="text-xl">💡</span>
              After creating your event, go to the Dashboard and click "Add Details" to add:
            </p>
            <ul className="text-blue-700 text-sm mt-2 space-y-1 ml-6">
              <li>• Background Image</li>
              <li>• Background Music</li>
              <li>• Voice Recording / Personal Message</li>
              <li>• Photo Gallery</li>
              <li>• And more event-specific details!</li>
            </ul>
          </div>

          <div className="flex gap-4 pt-4">
            <button
              type="button"
              onClick={() => navigate('/dashboard')}
              className="flex-1 px-6 py-3 bg-gray-200 text-gray-700 rounded-xl font-semibold hover:bg-gray-300"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className={`flex-1 px-6 py-3 bg-gradient-to-r ${selectedEventType?.gradient} text-white rounded-xl font-semibold hover:shadow-lg disabled:opacity-50`}
            >
              {loading ? 'Creating...' : 'Create Event'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}