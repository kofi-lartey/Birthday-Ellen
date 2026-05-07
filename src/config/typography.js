/**
 * TYPOGRAPHY SYSTEM FOR SLIDESHOW
 * Professional, accessible, and responsive text scaling
 */

export const TYPOGRAPHY = {
  // Scale factor based on viewport width
  scale: {
    mobile: 375,
    tablet: 768,
    desktop: 1440,
    tv: 1920
  },

  // Base font sizes (multiplicative scale: Major Third = 1.25)
  sizes: {
    xs: '0.75rem',      // 12px
    sm: '0.875rem',     // 14px
    base: '1rem',       // 16px
    lg: '1.125rem',     // 18px
    xl: '1.25rem',      // 20px
    '2xl': '1.5rem',    // 24px
    '3xl': '1.875rem',  // 30px
    '4xl': '2.25rem',   // 36px
    '5xl': '3rem',      // 48px
    '6xl': '3.75rem',   // 60px
    '7xl': '4.5rem',    // 72px
    '8xl': '6rem'       // 96px
  },

  // Font families
  families: {
    display: "'Playfair Display', Georgia, serif",      // For names/highlights
    body: "'Poppins', -apple-system, sans-serif",       // For messages/body
    mono: "'JetBrains Mono', monospace"                 // For counters/numbers
  },

  // Line heights (perfect readability)
  lineHeights: {
    tight: 1.2,    // Headings
    normal: 1.5,   // Body text
    relaxed: 1.75, // Long messages
  },

  // Letter spacing for elegant feel
  letterSpacing: {
    tighter: '-0.025em',
    tight: '-0.015em',
    normal: '0',
    wide: '0.025em',
    wider: '0.05em',
    widest: '0.1em'
  },

  // Font weights
  weights: {
    light: 300,
    normal: 400,
    medium: 500,
    semibold: 600,
    bold: 700,
    black: 800
  },

  // Responsive clamp formula: clamp(min, preferred, max)
  // Preferred = base * (viewport / scale) ^ goldenRatio
  responsive: (minSize, baseSize, maxSize, viewportWidth = 100) => {
    const min = minSize;
    const max = maxSize;
    const preferred = `${baseSize} * ${viewportWidth / 100}vw`;
    return `clamp(${min}, ${preferred}, ${max})`;
  },

  // Preset responsive styles for common elements
  presets: {
    slideTitle: {
      fontFamily: 'display',
      fontWeight: 'bold',
      lineHeight: 'tight',
      letterSpacing: 'tight',
      fontSize: 'clamp(1.75rem, 4.5vw, 2.5rem)',
      mobile: {
        fontSize: 'clamp(1.5rem, 5vw, 2rem)',
        lineHeight: 1.3
      }
    },
    slideMessage: {
      fontFamily: 'body',
      fontWeight: 'normal',
      lineHeight: 'relaxed',
      letterSpacing: 'normal',
      fontSize: 'clamp(1rem, 2.5vw, 1.25rem)',
      mobile: {
        fontSize: 'clamp(0.95rem, 3vw, 1.1rem)'
      }
    },
    introTitle: {
      fontFamily: 'display',
      fontWeight: 'black',
      lineHeight: 1.1,
      letterSpacing: 'tight',
      fontSize: 'clamp(3rem, 8vw, 6rem)',
      mobile: {
        fontSize: 'clamp(2.5rem, 10vw, 4rem)'
      }
    },
    introSubtitle: {
      fontFamily: 'body',
      fontWeight: 'medium',
      lineHeight: 'normal',
      letterSpacing: 'wide',
      fontSize: 'clamp(1.25rem, 3vw, 2rem)',
      mobile: {
        fontSize: 'clamp(1rem, 4vw, 1.5rem)'
      }
    },
    counter: {
      fontFamily: 'mono',
      fontWeight: 'bold',
      fontSize: 'clamp(1.5rem, 4vw, 2.5rem)',
      letterSpacing: 'wider'
    },
    outroTagline: {
      fontFamily: 'display',
      fontWeight: 'semibold',
      lineHeight: 'tight',
      letterSpacing: 'wide',
      fontSize: 'clamp(1.75rem, 4vw, 3rem)'
    },
    credit: {
      fontFamily: 'body',
      fontWeight: 'medium',
      lineHeight: 'normal',
      letterSpacing: 'wider',
      fontSize: 'clamp(0.875rem, 2vw, 1.125rem)'
    }
  }
};

/**
 * Calculate responsive font size based on viewport
 */
export const calculateResponsiveFont = (baseSize, minSize, maxSize, viewportUnit = 'vw') => {
  const min = minSize || baseSize * 0.6;
  const max = maxSize || baseSize * 1.5;
  return `clamp(${min}rem, ${baseSize}${viewportUnit}, ${max}rem)`;
};

/**
 * Convert px to rem (assuming 16px base)
 */
export const pxToRem = (px) => `${px / 16}rem`;

/**
 * Generate fluid type scale using CSS clamp
 * Based on Utopia.fyi type scale calculator
 */
export const fluidType = (minSize, maxSize, minVw = 320, maxVw = 1440) => {
  const min = minSize;
  const max = maxSize;
  const slope = (maxSize - minSize) / (maxVw - minVw);
  const yIntercept = minSize - slope * minVw;
  
  return `clamp(${min}rem, ${yIntercept}rem + ${slope * 100}vw, ${max}rem)`;
};

export default TYPOGRAPHY;
