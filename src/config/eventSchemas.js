/**
 * EVENT TYPE SCHEMA CONFIGURATION
 * Centralized, data-driven configuration for all event types
 * This eliminates hardcoded event-specific logic throughout the app
 */

export const EVENT_TYPE_CONFIG = {
  birthday: {
    // Display Configuration
    display: {
      title: 'Happy Birthday',
      personLabel: 'Birthday Person',
      emoji: '🎂',
      celebrationName: 'Birthday',
      defaultMessage: "Another year has passed, and my love for you only grows stronger. You are my sunshine on cloudy days, my smile when I'm sad, my everything. Today we celebrate the day the most amazing person came into this world - YOU!",
      gradient: 'from-rose-500 to-pink-500',
      bgGradient: 'from-rose-50 via-pink-50 to-purple-50',
      color: 'rose'
    },
    // Database mapping
    table: 'orders',
    registryType: 'birthday',
    // Form fields for "Add Details" modal (Dashboard)
    detailFields: [
      {
        name: 'backgroundImage',
        label: 'Main Background Image',
        type: 'file-image',
        accept: 'image/*',
        placeholder: 'https://example.com/background.jpg',
        helpText: 'Upload a beautiful background image or enter URL'
      },
      {
        name: 'heartMessage',
        label: 'Heart Message',
        type: 'text',
        placeholder: 'My heart belongs to you',
        helpText: 'The main heading displayed on the birthday page'
      },
      {
        name: 'nickname',
        label: 'Nickname',
        type: 'text',
        placeholder: 'e.g., Babe, Love, My Queen...',
        helpText: 'A special nickname for the birthday person'
      },
      {
        name: 'dateOfBirth',
        label: 'Date of Birth (for countdown)',
        type: 'date',
        helpText: 'Used to show countdown timer on the birthday page'
      },
      {
        name: 'letter',
        label: 'Letter to the Birthday Person',
        type: 'textarea',
        rows: 6,
        placeholder: 'Write a heartfelt letter...',
        helpText: 'A personal message displayed on the page'
      },
      {
        name: 'audioUrl',
        label: 'Background Music',
        type: 'file-audio',
        accept: 'audio/*',
        placeholder: 'https://example.com/song.mp3',
        helpText: 'Upload music or provide a URL'
      },
      {
        name: 'photos',
        label: 'Photo Gallery',
        type: 'photo-uploader',
        maxPhotos: 50, // varies by package (handled in component)
        helpText: 'Upload photos to create a slideshow'
      }
    ],
    // Form fields for "Create Event" (from Order.jsx step 1)
    creationFields: [
      {
        name: 'recipientName',
        label: "Birthday Person's Name",
        type: 'text',
        placeholder: 'e.g., Sarah, Michael, Mama...',
        required: true,
        step: 1
      },
      {
        name: 'recipientName2',
        label: 'Nickname (optional)',
        type: 'text',
        placeholder: 'e.g., Babe, Love, My Queen...',
        step: 1
      },
      {
        name: 'birthdayDate',
        label: 'Birthday Date',
        type: 'date',
        required: true,
        step: 1
      },
      {
        name: 'giverName',
        label: 'Your Name',
        type: 'text',
        placeholder: 'Who is this from?',
        required: true,
        step: 2
      },
      {
        name: 'giverPhone',
        label: 'Your Phone (optional)',
        type: 'tel',
        placeholder: 'For payment confirmation',
        step: 2
      },
      {
        name: 'selectedPackage',
        label: 'Package',
        type: 'package-selector',
        step: 2
      }
    ]
  },

  wedding: {
    display: {
      title: 'Congratulations',
      personLabel: 'Wedding Couple',
      emoji: '💍',
      celebrationName: 'Wedding',
      defaultMessage: "Today two hearts become one. Your love story is an inspiration to us all. May your journey together be filled with endless love, joy, and beautiful moments. Here's to forever!",
      gradient: 'from-rose-500 to-pink-500',
      bgGradient: 'from-pink-50 to-rose-100',
      color: 'rose'
    },
    table: 'weddings',
    registryType: 'wedding',
    // Fields for CreateWedding form
    detailFields: [
      {
        name: 'couple_names',
        label: 'Couple Names',
        type: 'text',
        placeholder: 'e.g., John & Jane',
        required: true
      },
      {
        name: 'wedding_date',
        label: 'Wedding Date',
        type: 'date',
        required: true
      },
      {
        name: 'venue',
        label: 'Venue Name',
        type: 'text',
        placeholder: 'e.g., The Grand Ballroom'
      },
      {
        name: 'venue_address',
        label: 'Venue Address',
        type: 'text',
        placeholder: 'Full address'
      },
      {
        name: 'photographer',
        label: 'Photographer',
        type: 'text',
        placeholder: 'Photographer name/contact'
      },
      {
        name: 'caterer',
        label: 'Caterer',
        type: 'text',
        placeholder: 'Caterer name/contact'
      },
      {
        name: 'florist',
        label: 'Florist',
        type: 'text',
        placeholder: 'Florist name/contact'
      },
      {
        name: 'guest_count',
        label: 'Guest Count',
        type: 'number',
        placeholder: 'Expected number of guests'
      },
      {
        name: 'dress_code',
        label: 'Dress Code',
        type: 'text',
        placeholder: 'e.g., Black Tie, Formal, Cocktail'
      },
      {
        name: 'theme',
        label: 'Wedding Theme',
        type: 'text',
        placeholder: 'e.g., Garden Romance, Rustic, Beach'
      },
      {
        name: 'is_public',
        label: 'Make this wedding public',
        type: 'checkbox',
        helpText: 'Share with guests and allow RSVPs'
      }
    ],
    creationFields: [] // Not using Order.jsx flow for weddings
  },

  anniversary: {
    display: {
      title: 'Happy Anniversary',
      personLabel: 'Celebration Couple',
      emoji: '💕',
      celebrationName: 'Anniversary',
      defaultMessage: "Another year of love, laughter, and memories. Your relationship grows more beautiful with time. May this anniversary be the start of your most wonderful year yet!",
      gradient: 'from-red-500 to-rose-500',
      bgGradient: 'from-red-50 to-rose-100',
      color: 'red'
    },
    table: 'anniversaries',
    registryType: 'anniversary',
    detailFields: [
      {
        name: 'couple_names',
        label: 'Couple Names',
        type: 'text',
        placeholder: 'e.g., Sarah & Michael',
        required: true
      },
      {
        name: 'anniversary_date',
        label: 'Anniversary Date',
        type: 'date',
        required: true
      },
      {
        name: 'years_married',
        label: 'Years Married',
        type: 'number',
        placeholder: 'e.g., 5'
      },
      {
        name: 'special_memory',
        label: 'A Special Memory',
        type: 'textarea',
        rows: 4,
        placeholder: 'Share a favorite memory or moment from your relationship...'
      },
      {
        name: 'gift_idea',
        label: 'Gift Idea',
        type: 'text',
        placeholder: 'Dream gift, experience, or gesture...'
      },
      {
        name: 'celebration_plan',
        label: 'How You\'ll Celebrate',
        type: 'textarea',
        rows: 3,
        placeholder: 'Dinner at home? Night out? Weekend getaway?'
      },
      {
        name: 'is_public',
        label: 'Share with friends and family',
        type: 'checkbox',
        helpText: 'Make this anniversary page public'
      }
    ],
    creationFields: []
  },

  party: {
    display: {
      title: 'Party Time!',
      personLabel: 'Party Host',
      emoji: '🎉',
      celebrationName: 'Party',
      defaultMessage: "Let's get the party started! Good music, great people, and unforgettable memories await. Get ready to dance the night away!",
      gradient: 'from-purple-500 to-indigo-500',
      bgGradient: 'from-purple-50 to-indigo-100',
      color: 'purple'
    },
    table: 'parties',
    registryType: 'party',
    detailFields: [
      {
        name: 'party_name',
        label: 'Party Name',
        type: 'text',
        placeholder: 'e.g., My Birthday Bash, Summer Vibes',
        required: true
      },
      {
        name: 'party_date',
        label: 'Date',
        type: 'date',
        required: true
      },
      {
        name: 'party_time',
        label: 'Time',
        type: 'time',
        helpText: 'Optional'
      },
      {
        name: 'venue',
        label: 'Where It\'s At',
        type: 'text',
        placeholder: 'Your place, rooftop bar, club...'
      },
      {
        name: 'theme',
        label: 'Theme / Vibe',
        type: 'text',
        placeholder: 'e.g., Tropical, 90s Throwback, All Black'
      },
      {
        name: 'guest_count',
        label: 'Expected Guests',
        type: 'number',
        placeholder: 'How many people?'
      },
      {
        name: 'dress_code',
        label: 'Dress Code',
        type: 'text',
        placeholder: 'Casual, Formal, Costume, etc'
      },
      {
        name: 'music_style',
        label: 'Music Style',
        type: 'text',
        placeholder: 'Hip-hop & R&B, Pop, Electronic, Reggae...'
      },
      {
        name: 'DJ_provided',
        label: 'Hiring a DJ',
        type: 'checkbox',
        helpText: 'Check if you\'re hiring a DJ'
      },
      {
        name: 'food_type',
        label: 'Food Style',
        type: 'text',
        placeholder: 'Catered, BBQ, Pizza, Potluck, Finger Foods...'
      },
      {
        name: 'activities_json',
        label: 'Planned Activities',
        type: 'textarea',
        rows: 3,
        placeholder: 'List activities (one per line)',
        helpText: 'Will be saved as JSON array'
      },
      {
        name: 'is_public',
        label: 'Make party shareable',
        type: 'checkbox',
        helpText: 'Send invite link to friends'
      }
    ],
    creationFields: []
  },

  hangout: {
    display: {
      title: 'Hangout',
      personLabel: 'Host',
      emoji: '👋',
      celebrationName: 'Hangout',
      defaultMessage: "No agenda. Just vibes. See you there!",
      gradient: 'from-blue-500 to-cyan-500',
      bgGradient: 'from-blue-50 to-cyan-100',
      color: 'blue'
    },
    table: 'hangouts',
    registryType: 'hangout',
    detailFields: [
      {
        name: 'hangout_name',
        label: 'What to Call It',
        type: 'text',
        placeholder: 'e.g., Movie Night, Game Session, Coffee & Chill',
        required: true
      },
      {
        name: 'hangout_date',
        label: 'When',
        type: 'date',
        required: true
      },
      {
        name: 'hangout_time',
        label: 'Time (Optional)',
        type: 'time'
      },
      {
        name: 'who_coming',
        label: 'Who\'s Coming',
        type: 'text',
        placeholder: 'The crew, Besties, Work friends, Family...'
      },
      {
        name: 'expected_people',
        label: 'How Many People',
        type: 'number',
        placeholder: 'Just a few or a whole squad?'
      },
      {
        name: 'location',
        label: 'Where At',
        type: 'text',
        placeholder: 'Your place, the park, a cafe...'
      },
      {
        name: 'vibe',
        label: 'The Vibe',
        type: 'select',
        options: ['Chill', 'Active', 'Productive', 'Gaming', 'Movie Night', 'Cozy'],
        placeholder: 'Select vibe'
      },
      {
        name: 'snacks',
        label: 'Snacks',
        type: 'text',
        placeholder: 'Chips & dip, Pizza, Popcorn, Charcuterie...'
      },
      {
        name: 'drinks_provided',
        label: 'Someone\'s bringing drinks',
        type: 'checkbox',
        helpText: 'Check if drinks will be available'
      },
      {
        name: 'chill_activities_json',
        label: 'Planned Activities',
        type: 'textarea',
        rows: 3,
        placeholder: 'List activities (one per line)',
        helpText: 'Will be saved as JSON array'
      },
      {
        name: 'notes',
        label: 'Any Other Details?',
        type: 'textarea',
        rows: 3,
        placeholder: 'Anything else people should know...'
      },
      {
        name: 'is_public',
        label: 'Let people RSVP',
        type: 'checkbox',
        helpText: 'Make shareable with RSVP functionality'
      }
    ],
    creationFields: []
  },

  other: {
    display: {
      title: 'Custom Event',
      personLabel: 'Event Organizer',
      emoji: '📅',
      celebrationName: 'Special Event',
      defaultMessage: "Your special moment, captured and shared with love.",
      gradient: 'from-gray-600 to-gray-800',
      bgGradient: 'from-gray-50 to-gray-100',
      color: 'gray'
    },
    table: 'other_events',
    registryType: 'other',
    detailFields: [
      {
        name: 'event_name',
        label: 'Event Name',
        type: 'text',
        placeholder: 'e.g., Product Launch, Family Reunion, Concert Night',
        required: true
      },
      {
        name: 'event_category',
        label: 'What Kind of Event?',
        type: 'text',
        placeholder: 'Conference, Graduation, Festival, Reunion, etc.'
      },
      {
        name: 'event_date',
        label: 'Date',
        type: 'date',
        required: true
      },
      {
        name: 'event_time',
        label: 'Time (Optional)',
        type: 'time'
      },
      {
        name: 'description',
        label: 'Description',
        type: 'textarea',
        rows: 3,
        placeholder: 'Tell us about this event...'
      },
      {
        name: 'custom_fields',
        label: 'Additional Details',
        type: 'custom-fields',
        fields: [
          { name: 'attendees', label: 'Attendees / Who\'s Invited', type: 'text', placeholder: 'Names or groups' },
          { name: 'location', label: 'Location', type: 'text', placeholder: 'Where is it happening?' },
          { name: 'details', label: 'Additional Info', type: 'textarea', placeholder: 'Theme, dress code, what to bring...', rows: 3 }
        ]
      },
      {
        name: 'is_public',
        label: 'Make event public',
        type: 'checkbox',
        helpText: 'Shareable link'
      }
    ],
    creationFields: []
  },

  // Legacy mapping for backward compatibility
  graduation: {
    display: {
      title: 'Congratulations Graduate',
      personLabel: 'Graduate',
      emoji: '🎓',
      celebrationName: 'Graduation',
      defaultMessage: "Your hard work and dedication have paid off. Today we celebrate your amazing achievement! The future is bright and full of possibilities. Go conquer the world!",
      gradient: 'from-blue-500 to-indigo-500',
      bgGradient: 'from-blue-50 to-indigo-100',
      color: 'blue'
    },
    table: 'other_events', // Uses other_events with category 'graduation'
    registryType: 'other',
    detailFields: [
      {
        name: 'event_name',
        label: 'Graduate\'s Name',
        type: 'text',
        placeholder: 'e.g., John Doe',
        required: true
      },
      {
        name: 'event_category',
        type: 'hidden',
        default: 'graduation'
      },
      {
        name: 'event_date',
        label: 'Graduation Date',
        type: 'date',
        required: true
      },
      {
        name: 'description',
        label: 'Achievement Details',
        type: 'textarea',
        rows: 3,
        placeholder: 'Degree, school, honors...'
      },
      {
        name: 'custom_fields',
        label: 'Celebration Details',
        type: 'custom-fields',
        fields: [
          { name: 'location', label: 'Party Location', type: 'text' },
          { name: 'attendees', label: 'Guests', type: 'text' },
          { name: 'details', label: 'Other Info', type: 'textarea', rows: 3 }
        ]
      },
      {
        name: 'is_public',
        label: 'Share with friends',
        type: 'checkbox'
      }
    ],
    creationFields: []
  }
};

/**
 * Get schema for a specific event type
 */
export const getEventSchema = (eventType) => {
  return EVENT_TYPE_CONFIG[eventType] || EVENT_TYPE_CONFIG.birthday;
};

/**
 * Get table name for event type
 */
export const getEventTable = (eventType) => {
  return getEventSchema(eventType).table;
};

/**
 * Get display config for event type
 */
export const getEventDisplay = (eventType) => {
  return getEventSchema(eventType).display;
};

/**
 * Get fields for event form
 */
export const getEventFields = (eventType, formType = 'details') => {
  const schema = getEventSchema(eventType);
  return formType === 'creation' ? schema.creationFields : schema.detailFields;
};

/**
 * Validate form data against field definitions
 */
export const validateFormData = (eventType, formData, formType = 'details') => {
  const fields = getEventFields(eventType, formType);
  const errors = [];

  for (const field of fields) {
    if (field.required && !formData[field.name]) {
      errors.push(`${field.label} is required`);
    }
    // Add more validation as needed (min length, pattern, etc.)
  }

  return errors;
};

/**
 * Transform form data for database insertion
 */
export const transformFormData = (eventType, formData) => {
  const schema = getEventSchema(eventType);
  const table = schema.table;
  const transformed = {};

  for (const [key, value] of Object.entries(formData)) {
    // Handle special nested fields
    if (key === 'custom_fields') {
      transformed[key] = value; // Store as JSONB
    } else if (key === 'photos' && Array.isArray(value)) {
      transformed[key] = JSON.stringify(value);
    } else if (key === 'is_public' || key === 'DJ_provided' || key === 'drinks_provided') {
      transformed[key] = Boolean(value);
    } else {
      transformed[key] = value;
    }
  }

  return transformed;
};
