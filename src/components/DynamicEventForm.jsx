import { useState, useEffect } from 'react';
import { EVENT_TYPE_CONFIG, getEventFields, getEventDisplay, validateFormData, transformFormData } from '../config/eventSchemas';
import { supabase } from '../supabase';

/**
 * DynamicEventForm - A universal form component for all event types
 * Renders fields based on event schema configuration
 * Handles both creation and editing of any event type
 */
export default function DynamicEventForm({
  eventType = 'birthday',
  mode = 'create', // 'create' | 'edit' | 'details'
  initialData = {},
  onSubmit,
  onCancel,
  userId,
  maxPhotos = 50,
  isSubmitting = false
}) {
  // Get schema and display config
  const schema = EVENT_TYPE_CONFIG[eventType] || EVENT_TYPE_CONFIG.birthday;
  const display = schema.display;
  const fields = mode === 'details' ? schema.detailFields : schema.detailFields; // Use detailFields for both

  // Initialize form state from schema defaults and initialData
  const initializeFormData = () => {
    const data = {};
    const safeInitialData = initialData || {};
    fields.forEach(field => {
      if (field.name in safeInitialData) {
        data[field.name] = safeInitialData[field.name];
      } else if (field.default !== undefined) {
        data[field.name] = field.default;
      } else if (field.type === 'checkbox') {
        data[field.name] = false;
      } else if (field.type === 'photo-uploader' || field.name === 'photos') {
        data[field.name] = [];
      } else if (field.type === 'custom-fields') {
        data[field.name] = field.fields.reduce((acc, f) => ({ ...acc, [f.name]: '' }), {});
      } else {
        data[field.name] = '';
      }
    });
    return data;
  };

  const [formData, setFormData] = useState(initializeFormData);
  const [errors, setErrors] = useState([]);
  const [uploading, setUploading] = useState(false);

  // Sync when initialData changes (e.g., when editing)
  useEffect(() => {
    setFormData(initializeFormData());
  }, [eventType, initialData, fields]);

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

    // Clear error for this field
    if (errors.length > 0) {
      setErrors(errors.filter(err => !err.toLowerCase().includes(name)));
    }
  };

  const handlePhotoUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (!files.length) return;

    if (formData.photos.length + files.length > maxPhotos) {
      alert(`Maximum ${maxPhotos} photos allowed for your package`);
      return;
    }

    for (const file of files) {
      if (file.size > 5 * 1024 * 1024) {
        alert('Each photo must be less than 5MB');
        return;
      }
    }

    setUploading(true);
    const uploadedUrls = [];

    try {
      for (const file of files) {
        const formDataUpload = new FormData();
        formDataUpload.append('file', file);
        formDataUpload.append('upload_preset', 'ml_default');

        const res = await fetch('https://api.cloudinary.com/v1_1/djjgkezui/image/upload', {
          method: 'POST',
          body: formDataUpload
        });

        const data = await res.json();
        if (data.secure_url) {
          uploadedUrls.push({
            url: data.secure_url,
            publicId: data.public_id,
            tag: 'slideshow'
          });
        }
      }

      setFormData(prev => ({
        ...prev,
        photos: [...prev.photos, ...uploadedUrls]
      }));
    } catch (err) {
      console.error('Upload error:', err);
      alert('Error uploading photos');
    } finally {
      setUploading(false);
    }
  };

  const handleAudioUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      alert('Audio must be less than 10MB');
      return;
    }

    setUploading(true);
    try {
      const formDataUpload = new FormData();
      formDataUpload.append('file', file);
      formDataUpload.append('upload_preset', 'ml_default');
      formDataUpload.append('resource_type', 'video');

      const res = await fetch('https://api.cloudinary.com/v1_1/djjgkezui/video/upload', {
        method: 'POST',
        body: formDataUpload
      });

      const data = await res.json();
      if (data.secure_url) {
        setFormData(prev => ({ ...prev, audioUrl: data.secure_url }));
      }
    } catch (err) {
      console.error('Audio upload error:', err);
      alert('Error uploading audio');
    } finally {
      setUploading(false);
    }
  };

  const handleBackgroundImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      alert('Image must be less than 5MB');
      return;
    }

    setUploading(true);
    try {
      const formDataUpload = new FormData();
      formDataUpload.append('file', file);
      formDataUpload.append('upload_preset', 'ml_default');

      const res = await fetch('https://api.cloudinary.com/v1_1/djjgkezui/image/upload', {
        method: 'POST',
        body: formDataUpload
      });

      const data = await res.json();
      if (data.secure_url) {
        setFormData(prev => ({ ...prev, backgroundImage: data.secure_url }));
      }
    } catch (err) {
      console.error('Background upload error:', err);
      alert('Error uploading image');
    } finally {
      setUploading(false);
    }
  };

  const removePhoto = (index) => {
    setFormData(prev => ({
      ...prev,
      photos: prev.photos.filter((_, i) => i !== index)
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const validationErrors = validateFormData(eventType, formData, mode);

    if (validationErrors.length > 0) {
      setErrors(validationErrors);
      return;
    }

    const transformed = transformFormData(eventType, formData);

    if (onSubmit) {
      await onSubmit(transformed, formData);
    }
  };

  // Render individual field based on its type
  const renderField = (field) => {
    const value = formData[field.name];
    const fieldErrors = errors.filter(err => err.toLowerCase().includes(field.name));

    // Skip rendering for hidden fields
    if (field.type === 'hidden') return null;

    const baseInputClass = `w-full p-3 border-2 rounded-xl focus:outline-none focus:border-${schema.display.color}-500 ${fieldErrors.length ? 'border-red-500' : 'border-gray-300'}`;

    switch (field.type) {
      case 'text':
      case 'date':
      case 'time':
      case 'tel':
      case 'url':
      case 'number':
        return (
          <div key={field.name} className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {field.label} {field.required && <span className="text-red-500">*</span>}
            </label>
            <input
              type={field.type}
              name={field.name}
              value={value || ''}
              onChange={handleChange}
              placeholder={field.placeholder}
              required={field.required}
              step={field.step}
              rows={field.rows}
              className={baseInputClass}
            />
            {field.helpText && <p className="text-xs text-gray-500 mt-1">{field.helpText}</p>}
            {fieldErrors.length > 0 && <p className="text-xs text-red-500 mt-1">{fieldErrors[0]}</p>}
          </div>
        );

      case 'textarea':
        return (
          <div key={field.name} className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {field.label} {field.required && <span className="text-red-500">*</span>}
            </label>
            <textarea
              name={field.name}
              value={value || ''}
              onChange={handleChange}
              placeholder={field.placeholder}
              required={field.required}
              rows={field.rows || 4}
              className={baseInputClass}
            />
            {field.helpText && <p className="text-xs text-gray-500 mt-1">{field.helpText}</p>}
            {fieldErrors.length > 0 && <p className="text-xs text-red-500 mt-1">{fieldErrors[0]}</p>}
          </div>
        );

      case 'checkbox':
        return (
          <div key={field.name} className="flex items-center gap-3 mb-4 p-4 bg-gray-50 rounded-lg">
            <input
              type="checkbox"
              name={field.name}
              checked={value || false}
              onChange={handleChange}
              className="w-4 h-4 text-rose-600 focus:ring-rose-500"
            />
            <div>
              <label className="text-sm font-medium text-gray-700">{field.label}</label>
              {field.helpText && <p className="text-xs text-gray-500">{field.helpText}</p>}
            </div>
          </div>
        );

      case 'select':
        return (
          <div key={field.name} className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {field.label} {field.required && <span className="text-red-500">*</span>}
            </label>
            <select
              name={field.name}
              value={value || ''}
              onChange={handleChange}
              required={field.required}
              className={baseInputClass}
            >
              <option value="">{field.placeholder || `Select ${field.label}`}</option>
              {field.options.map(opt => (
                <option key={opt} value={opt}>{opt}</option>
              ))}
            </select>
            {field.helpText && <p className="text-xs text-gray-500 mt-1">{field.helpText}</p>}
          </div>
        );

      case 'file-image':
        return (
          <div key={field.name} className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">{field.label}</label>
            <div className="space-y-2">
              <input
                type="file"
                accept={field.accept}
                onChange={field.name === 'backgroundImage' ? handleBackgroundImageUpload : handlePhotoUpload}
                className="w-full p-3 border-2 border-gray-300 rounded-xl"
                disabled={uploading}
              />
              <p className="text-xs text-gray-500 text-center">or enter URL below</p>
              <input
                type="url"
                name={field.name}
                value={value || ''}
                onChange={handleChange}
                className={baseInputClass}
                placeholder={field.placeholder}
              />
            </div>
            {value && (
              <img
                src={value}
                alt="Preview"
                className="mt-2 w-full h-32 object-cover rounded-xl"
                onError={(e) => e.target.style.display = 'none'}
              />
            )}
            {field.helpText && <p className="text-xs text-gray-500 mt-1">{field.helpText}</p>}
          </div>
        );

      case 'file-audio':
        return (
          <div key={field.name} className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">{field.label}</label>
            <div className="space-y-2">
              <input
                type="file"
                accept={field.accept}
                onChange={handleAudioUpload}
                className="w-full p-3 border-2 border-gray-300 rounded-xl"
                disabled={uploading}
              />
              <p className="text-xs text-gray-500 text-center">or enter URL below</p>
              <input
                type="url"
                name={field.name}
                value={value || ''}
                onChange={handleChange}
                className={baseInputClass}
                placeholder={field.placeholder}
              />
            </div>
            {field.helpText && <p className="text-xs text-gray-500 mt-1">{field.helpText}</p>}
          </div>
        );

      case 'photo-uploader':
        return (
          <div key={field.name} className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {field.label} ({formData.photos?.length || 0}/{maxPhotos}) - Max 5MB each
            </label>
            <input
              type="file"
              accept="image/*"
              multiple
              onChange={handlePhotoUpload}
              className="w-full p-3 border-2 border-gray-300 rounded-xl"
              disabled={uploading || (formData.photos?.length >= maxPhotos)}
            />
            <p className="text-xs text-gray-500 mt-1">
              Photos will be used in the slideshow
            </p>

            {formData.photos?.length > 0 && (
              <div className="grid grid-cols-3 gap-2 mt-3">
                {formData.photos.map((photo, index) => (
                  <div key={index} className="relative">
                    <img
                      src={photo.url}
                      alt={`Photo ${index + 1}`}
                      className="w-full h-20 object-cover rounded-lg"
                    />
                    <button
                      type="button"
                      onClick={() => removePhoto(index)}
                      className="absolute top-1 right-1 bg-red-500 text-white rounded-full w-5 h-5 text-xs flex items-center justify-center"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        );

      case 'custom-fields':
        return (
          <div key={field.name} className="mb-4 border-t-2 pt-4">
            <h3 className="text-lg font-bold text-gray-800 mb-4">{field.label || 'Additional Details'}</h3>
            <div className="space-y-4">
              {field.fields.map(subField => (
                <div key={subField.name}>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {subField.label}
                    {subField.required && <span className="text-red-500">*</span>}
                  </label>
                  {subField.type === 'textarea' ? (
                    <textarea
                      name={`custom_${subField.name}`}
                      value={formData.custom_fields?.[subField.name] || ''}
                      onChange={handleChange}
                      placeholder={subField.placeholder}
                      rows={subField.rows || 3}
                      className={baseInputClass}
                    />
                  ) : (
                    <input
                      type="text"
                      name={`custom_${subField.name}`}
                      value={formData.custom_fields?.[subField.name] || ''}
                      onChange={handleChange}
                      placeholder={subField.placeholder}
                      className={baseInputClass}
                    />
                  )}
                </div>
              ))}
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-lg p-6 md:p-8 space-y-6">
      {/* Header */}
      <div className="text-center mb-6">
        <div className="text-5xl mb-3">{display.emoji}</div>
        <h2 className="text-2xl font-bold text-gray-700">
          {mode === 'create' ? `Create ${display.celebrationName}` : `Edit ${display.celebrationName} Details`}
        </h2>
        <p className="text-gray-500">{display.defaultMessage.substring(0, 80)}...</p>
      </div>

      {/* Errors Summary */}
      {errors.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-4">
          <h4 className="font-semibold text-red-700 mb-2">Please fix the following:</h4>
          <ul className="list-disc list-inside text-sm text-red-600">
            {errors.map((err, i) => (
              <li key={i}>{err}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Dynamically rendered fields */}
      <div className="max-h-[60vh] overflow-y-auto pr-2">
        {fields.map(field => renderField(field))}
      </div>

      {/* Action Buttons */}
      <div className="flex gap-4 pt-6 border-t">
        <button
          type="button"
          onClick={onCancel || (() => window.history.back())}
          className="flex-1 px-6 py-3 bg-gray-300 text-gray-800 rounded-lg font-medium hover:bg-gray-400 disabled:opacity-50"
          disabled={isSubmitting}
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isSubmitting || uploading}
          className={`flex-1 px-6 py-3 text-white rounded-lg font-medium hover:shadow-lg disabled:opacity-50 bg-gradient-to-r ${schema.display.gradient}`}
        >
          {isSubmitting ? 'Saving...' : mode === 'create' ? `Create ${display.celebrationName}` : 'Save Changes'}
        </button>
      </div>

      {/* Footer note */}
      <p className="text-xs text-center text-gray-500 mt-4">
        * Required fields
      </p>
    </form>
  );
}

/**
 * HOC to use DynamicEventForm with common props
 */
export const createEventFormHandler = (eventType, supabase, navigate) => {
  return async (transformedData, rawFormData) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const schema = eventSchema[eventType];
      const table = schema.table;

      // Insert into specific event table
      const { data, error } = await supabase
        .from(table)
        .insert({
          user_id: user.id,
          ...transformedData
        })
        .select();

      if (error) throw error;

      const eventId = data[0].id;

      // Register in event_registry
      await supabase.from('event_registry').insert({
        user_id: user.id,
        event_type: schema.registryType,
        event_id: eventId,
        event_date: rawFormData[Object.keys(rawFormData).find(k => k.includes('date'))] || new Date().toISOString().split('T')[0],
        event_name: rawFormData[Object.keys(rawFormData).find(k => k.includes('name') && !k.includes('nickname'))] || 'Untitled',
        is_public: rawFormData.is_public || false
      });

      // Navigate to the created event page
      navigate(`/${eventType}/${eventId}`);
    } catch (err) {
      console.error('Error creating event:', err);
      alert(`Error creating ${eventType}: ${err.message}`);
    }
  };
};
