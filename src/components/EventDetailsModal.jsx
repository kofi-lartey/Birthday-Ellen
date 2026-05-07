import { useState, useEffect } from 'react';
import DynamicEventForm from './DynamicEventForm';

/**
 * EventDetailsModal - Universal modal for viewing/editing event details
 * Replaces the hardcoded birthday details modal
 * Works with any event type (birthday, wedding, anniversary, etc.)
 */
export default function EventDetailsModal({
  show,
  onClose,
  eventType = 'birthday',
  orderData, // { code, recipientName, package, birthdayDetails, ... }
  onSave,
  maxPhotos = 50
}) {
  const [formData, setFormData] = useState(null);
  const [rawFormData, setRawFormData] = useState(null); // Keep un-transformed data
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Initialize form data when modal opens or orderData changes
  useEffect(() => {
    if (show && orderData) {
      // Extract birthdayDetails or fallback to order-level fields
      const details = orderData.birthdayDetails || orderData;
      setFormData(details || {});
      setRawFormData(details || {});
    }
  }, [show, orderData]);

  if (!show || !orderData) return null;

  const handleSubmit = async (transformedData, raw) => {
    setIsSubmitting(true);
    try {
      // Delegate to parent handler
      if (onSave) {
        await onSave(transformedData, raw);
      }
      onClose();
    } catch (err) {
      console.error('Error saving event details:', err);
      alert('Error saving details. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl p-6 max-w-2xl w-full my-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-xl font-bold text-gray-700">
              Edit {eventType.charAt(0).toUpperCase() + eventType.slice(1)} Details
            </h3>
            <p className="text-sm text-gray-500">
              for {orderData.recipientName || orderData.couple_names || orderData.party_name || 'this event'} ({orderData.package || 'Standard'} package)
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-2xl"
          >
            ✕
          </button>
        </div>

        {/* Dynamic Form */}
        <div className="max-h-[60vh] overflow-y-auto pr-2">
          <DynamicEventForm
            eventType={eventType}
            mode="details"
            initialData={formData}
            onSubmit={handleSubmit}
            onCancel={onClose}
            userId={orderData.userId}
            maxPhotos={maxPhotos}
            isSubmitting={isSubmitting}
          />
        </div>
      </div>
    </div>
  );
}
