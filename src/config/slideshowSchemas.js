/**
 * SLIDESHOW CONTENT SCHEMA
 * Dynamic content configuration for all event types
 * Eliminates hardcoded "Happy Birthday" text and provides typography settings
 */

export const SLIDESHOW_CONFIG = {
  birthday: {
    // Typography & Theme
    fonts: {
      title: 'Playfair Display, serif', // For names
      subtitle: 'Poppins, sans-serif', // For messages
      caption: 'Poppins, sans-serif'
    },
    colors: {
      primary: '#ec4899', // pink-500
      secondary: '#f43f5e', // rose-500
      accent: '#fbbf24', // amber-400 (sparkles)
      text: '#ffffff',
      background: {
        intro: ['#1a1a2e', '#16213e'], // radial gradient
        outro: ['#0f0f23', '#1a1a3e'] // dark blue-purple
      }
    },
    // Title overlay content
    title: {
      greeting: 'Happy Birthday',
      suffix: '🎂',
      subtitle: 'With love from your friends & family 💕',
      lineHeight: 1.2,
      letterSpacing: { title: '0.02em', subtitle: '0.01em' }
    },
    // Intro animation text
    intro: {
      mainHeading: 'Happy Birthday',
      nameSuffix: '🎂',
      fallbackName: 'Birthday Star!'
    },
    // Outro animation text
    outro: {
      thankYou: 'Thank You',
      tagline: 'Made with Love',
      taglineSuffix: '❤️ Happy Birthday! 🎂',
      credit: 'Designed by KofiLartey'
    },
    // WhatsApp share message
    shareMessage: (name, message) => 
      `"${message}"\n\n- ${name}\n\n🎂 Happy Birthday! 💕`,
    // Download modal
    downloadTitle: 'Save This Memory 📸',
    // Empty state
    emptyTitle: 'No photos yet!',
    emptySubtitle: 'Go to upload page to add photos',
    emptyButton: 'Upload Photos 📸'
  },

  wedding: {
    fonts: {
      title: 'Playfair Display, serif',
      subtitle: 'Poppins, sans-serif',
      caption: 'Poppins, sans-serif'
    },
    colors: {
      primary: '#ec4899', // pink-500
      secondary: '#f43f5e', // rose-500
      accent: '#fbbf24',
      text: '#ffffff',
      background: {
        intro: ['#1a1a2e', '#16213e'],
        outro: ['#0f0f23', '#1a1a3e']
      }
    },
    title: {
      greeting: 'Congratulations',
      suffix: '💍',
      subtitle: 'With love from your friends & family 💕',
      lineHeight: 1.2,
      letterSpacing: { title: '0.02em', subtitle: '0.01em' }
    },
    intro: {
      mainHeading: 'Happy Married Couple',
      nameSuffix: ' 💍',
      fallbackName: 'Together Forever'
    },
    outro: {
      thankYou: 'Thank You',
      tagline: 'Together Forever',
      taglineSuffix: '❤️ Happy Married Life! 💍',
      credit: 'Designed by KofiLartey'
    },
    shareMessage: (name, message) =>
      `"${message}"\n\n- ${name}\n\n💍 Happy Married Couple! 💕`,
    downloadTitle: 'Save This Memory 📸',
    emptyTitle: 'No photos yet!',
    emptySubtitle: 'Go to upload page to add photos',
    emptyButton: 'Upload Photos 📸'
  },

  anniversary: {
    fonts: {
      title: 'Playfair Display, serif',
      subtitle: 'Poppins, sans-serif',
      caption: 'Poppins, sans-serif'
    },
    colors: {
      primary: '#ef4444', // red-500
      secondary: '#f43f5e', // rose-500
      accent: '#fbbf24',
      text: '#ffffff',
      background: {
        intro: ['#1a1a2e', '#16213e'],
        outro: ['#0f0f23', '#1a1a3e']
      }
    },
    title: {
      greeting: 'Happy Anniversary',
      suffix: '💕',
      subtitle: 'Celebrate love that grows stronger each year 💞',
      lineHeight: 1.2,
      letterSpacing: { title: '0.02em', subtitle: '0.01em' }
    },
    intro: {
      mainHeading: 'Happy Anniversary',
      nameSuffix: ' 💕',
      fallbackName: 'Beloved Couple'
    },
    outro: {
      thankYou: 'Thank You',
      tagline: 'Forever in Love',
      taglineSuffix: '❤️ Happy Anniversary! 💕',
      credit: 'Designed by KofiLartey'
    },
    shareMessage: (name, message) =>
      `"${message}"\n\n- ${name}\n\n💕 Happy Anniversary! 💞`,
    downloadTitle: 'Save This Memory 📸',
    emptyTitle: 'No memories yet!',
    emptySubtitle: 'Go to upload page to add photos',
    emptyButton: 'Upload Photos 📸'
  },

  party: {
    fonts: {
      title: 'Poppins, sans-serif', // More energetic
      subtitle: 'Poppins, sans-serif',
      caption: 'Poppins, sans-serif'
    },
    colors: {
      primary: '#a855f7', // purple-500
      secondary: '#4f46e5', // indigo-500
      accent: '#fbbf24',
      text: '#ffffff',
      background: {
        intro: ['#1a1a2e', '#16213e'],
        outro: ['#0f0f23', '#1a1a3e']
      }
    },
    title: {
      greeting: 'Let\'s Party!',
      suffix: '🎉',
      subtitle: 'Good music. Great people. Zero stress. 🎵',
      lineHeight: 1.3,
      letterSpacing: { title: '0.03em', subtitle: '0.01em' }
    },
    intro: {
      mainHeading: 'Party Time!',
      nameSuffix: ' 🎉',
      fallbackName: 'Let\'s Go!'
    },
    outro: {
      thankYou: 'Thanks for Coming!',
      tagline: 'Party On!',
      taglineSuffix: '🎉 Remember the Night! 🕺',
      credit: 'Designed by KofiLartey'
    },
    shareMessage: (name, message) =>
      `"${message}"\n\n- ${name}\n\n🎉 Let\'s Party! 🕺`,
    downloadTitle: 'Save This Moment 📸',
    emptyTitle: 'No party photos yet!',
    emptySubtitle: 'Upload photos from the event',
    emptyButton: 'Upload Photos 📸'
  },

  hangout: {
    fonts: {
      title: 'Poppins, sans-serif',
      subtitle: 'Poppins, sans-serif',
      caption: 'Poppins, sans-serif'
    },
    colors: {
      primary: '#3b82f6', // blue-500
      secondary: '#06b6d4', // cyan-500
      accent: '#fbbf24',
      text: '#ffffff',
      background: {
        intro: ['#1a1a2e', '#16213e'],
        outro: ['#0f0f23', '#1a1a3e']
      }
    },
    title: {
      greeting: 'Hangout',
      suffix: '👋',
      subtitle: 'No agenda. Just vibes. See you there! 🌟',
      lineHeight: 1.3,
      letterSpacing: { title: '0.02em', subtitle: '0.01em' }
    },
    intro: {
      mainHeading: 'Hangout Time',
      nameSuffix: ' 👋',
      fallbackName: 'The Crew'
    },
    outro: {
      thankYou: 'Good Times!',
      tagline: 'Vibe Check!',
      taglineSuffix: '👋 Until Next Time! 🌟',
      credit: 'Designed by KofiLartey'
    },
    shareMessage: (name, message) =>
      `"${message}"\n\n- ${name}\n\n👋 Hangout Vibes! 🌟`,
    downloadTitle: 'Save This Memory 📸',
    emptyTitle: 'No photos yet!',
    emptySubtitle: 'Upload photos from the hangout',
    emptyButton: 'Upload Photos 📸'
  },

  other: {
    fonts: {
      title: 'Poppins, sans-serif',
      subtitle: 'Poppins, sans-serif',
      caption: 'Poppins, sans-serif'
    },
    colors: {
      primary: '#6b7280', // gray-600
      secondary: '#374151', // gray-700
      accent: '#fbbf24',
      text: '#ffffff',
      background: {
        intro: ['#1a1a2e', '#16213e'],
        outro: ['#0f0f23', '#1a1a3e']
      }
    },
    title: {
      greeting: 'Special Event',
      suffix: '📅',
      subtitle: 'Your moment. Your way. We\'ll handle the rest.',
      lineHeight: 1.3,
      letterSpacing: { title: '0.02em', subtitle: '0.01em' }
    },
    intro: {
      mainHeading: 'Celebrate!',
      nameSuffix: ' 📅',
      fallbackName: 'Special Day'
    },
    outro: {
      thankYou: 'Thank You',
      tagline: 'Memories to Last',
      taglineSuffix: '📅 Celebrate Life! 🎊',
      credit: 'Designed by KofiLartey'
    },
    shareMessage: (name, message) =>
      `"${message}"\n\n- ${name}\n\n📅 Special Event! 🎊`,
    downloadTitle: 'Save This Memory 📸',
    emptyTitle: 'No photos yet!',
    emptySubtitle: 'Upload photos from the event',
    emptyButton: 'Upload Photos 📸'
  },

  // Legacy support
  graduation: {
    fonts: {
      title: 'Playfair Display, serif',
      subtitle: 'Poppins, sans-serif',
      caption: 'Poppins, sans-serif'
    },
    colors: {
      primary: '#3b82f6', // blue-500
      secondary: '#6366f1', // indigo-500
      accent: '#fbbf24',
      text: '#ffffff',
      background: {
        intro: ['#1a1a2e', '#16213e'],
        outro: ['#0f0f23', '#1a1a3e']
      }
    },
    title: {
      greeting: 'Congratulations Graduate',
      suffix: '🎓',
      subtitle: 'Your hard work has paid off. The future is bright! ✨',
      lineHeight: 1.2,
      letterSpacing: { title: '0.02em', subtitle: '0.01em' }
    },
    intro: {
      mainHeading: 'Congratulations!',
      nameSuffix: ' 🎓',
      fallbackName: 'Graduate'
    },
    outro: {
      thankYou: 'Well Done!',
      tagline: 'Go Conquer the World!',
      taglineSuffix: '🎓 Future is Bright! ✨',
      credit: 'Designed by KofiLartey'
    },
    shareMessage: (name, message) =>
      `"${message}"\n\n- ${name}\n\n🎓 Congratulations Graduate! ✨`,
    downloadTitle: 'Save This Memory 📸',
    emptyTitle: 'No photos yet!',
    emptySubtitle: 'Upload graduation photos',
    emptyButton: 'Upload Photos 📸'
  }
};

/**
 * Get slideshow config for an event type
 */
export const getSlideshowConfig = (eventType) => {
  return SLIDESHOW_CONFIG[eventType] || SLIDESHOW_CONFIG.birthday;
};

/**
 * Get event display names (plural forms)
 */
export const EVENT_TYPE_LABELS = {
  birthday: 'Birthday',
  wedding: 'Wedding',
  anniversary: 'Anniversary',
  party: 'Party',
  hangout: 'Hangout',
  other: 'Event',
  graduation: 'Graduation'
};
