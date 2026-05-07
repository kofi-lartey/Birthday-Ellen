import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import supabase from '../supabase';

export default function CreateWedding() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    couple_names: '',
    wedding_date: '',
    venue: '',
    venue_address: '',
    photographer: '',
    caterer: '',
    florist: '',
    guest_count: '',
    dress_code: '',
    theme: '',
    is_public: false,
  });

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        alert('Please log in to create a wedding');
        navigate('/login');
        setLoading(false);
        return;
      }

      // Validate required fields
      if (!formData.couple_names?.trim()) {
        alert('Please enter couple names');
        setLoading(false);
        return;
      }
      if (!formData.wedding_date) {
        alert('Please select a wedding date');
        setLoading(false);
        return;
      }

      // Insert into weddings table
      const { data: weddingData, error: weddingError } = await supabase
        .from('weddings')
        .insert({
          user_id: user.id,
          couple_names: formData.couple_names,
          wedding_date: formData.wedding_date,
          venue: formData.venue,
          venue_address: formData.venue_address,
          photographer: formData.photographer,
          caterer: formData.caterer,
          florist: formData.florist,
          guest_count: formData.guest_count ? parseInt(formData.guest_count) : null,
          dress_code: formData.dress_code,
          theme: formData.theme,
          is_public: formData.is_public,
          status: 'planning',
        })
        .select();

      if (weddingError) throw weddingError;

      const weddingId = weddingData[0].id;

      // Insert into event_registry
      const { error: registryError } = await supabase
        .from('event_registry')
        .insert({
          user_id: user.id,
          event_type: 'wedding',
          event_id: weddingId,
          event_date: formData.wedding_date,
          event_name: formData.couple_names,
          is_public: formData.is_public,
        });

      if (registryError) throw registryError;

      alert('Wedding created successfully!');
      navigate(`/wedding/${weddingId}`);
    } catch (error) {
      console.error('Error creating wedding:', error);
      alert(`Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 to-rose-100 p-8">
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-rose-900 mb-2">💍 Plan Your Wedding</h1>
          <p className="text-rose-700">From engagement to "I do" — every detail captured</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-lg p-8 space-y-6">
          {/* Couple Names */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Couple Names
            </label>
            <input
              type="text"
              name="couple_names"
              value={formData.couple_names}
              onChange={handleChange}
              placeholder="e.g., John & Jane"
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-rose-500 focus:border-transparent"
            />
          </div>

          {/* Wedding Date */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Wedding Date
            </label>
            <input
              type="date"
              name="wedding_date"
              value={formData.wedding_date}
              onChange={handleChange}
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-rose-500 focus:border-transparent"
            />
          </div>

          {/* Venue */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Venue</label>
            <input
              type="text"
              name="venue"
              value={formData.venue}
              onChange={handleChange}
              placeholder="Venue name"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-rose-500 focus:border-transparent"
            />
          </div>

          {/* Venue Address */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Venue Address</label>
            <input
              type="text"
              name="venue_address"
              value={formData.venue_address}
              onChange={handleChange}
              placeholder="Full address"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-rose-500 focus:border-transparent"
            />
          </div>

          {/* Theme & Dress Code */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Theme</label>
              <input
                type="text"
                name="theme"
                value={formData.theme}
                onChange={handleChange}
                placeholder="e.g., Garden, Modern, Classic"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-rose-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Dress Code</label>
              <input
                type="text"
                name="dress_code"
                value={formData.dress_code}
                onChange={handleChange}
                placeholder="e.g., Black Tie, Cocktail"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-rose-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* Vendors */}
          <div className="border-t-2 pt-6">
            <h3 className="text-lg font-bold text-gray-800 mb-4">Vendors</h3>
            <div className="grid grid-cols-2 gap-4">
              <input
                type="text"
                name="photographer"
                value={formData.photographer}
                onChange={handleChange}
                placeholder="Photographer"
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-rose-500"
              />
              <input
                type="text"
                name="caterer"
                value={formData.caterer}
                onChange={handleChange}
                placeholder="Caterer"
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-rose-500"
              />
              <input
                type="text"
                name="florist"
                value={formData.florist}
                onChange={handleChange}
                placeholder="Florist"
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-rose-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Expected Guests</label>
              <input
                type="number"
                name="guest_count"
                value={formData.guest_count}
                onChange={handleChange}
                placeholder="0"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-rose-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* Public Toggle */}
          <div className="flex items-center gap-3 p-4 bg-pink-50 rounded-lg">
            <input
              type="checkbox"
              name="is_public"
              checked={formData.is_public}
              onChange={handleChange}
              className="w-4 h-4"
            />
            <label className="text-sm font-medium text-gray-700">Make this wedding public (shareable link)</label>
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
              className="flex-1 px-6 py-3 bg-gradient-to-r from-pink-500 to-rose-500 text-white rounded-lg font-medium hover:shadow-lg disabled:opacity-50"
            >
              {loading ? 'Creating...' : 'Create Wedding'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
