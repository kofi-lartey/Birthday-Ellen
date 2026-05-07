/**
 * EVENT ANALYTICS TRACKING SYSTEM
 * Tracks slideshow views, engagement, and event types for analytics
 */

import { supabase, STORAGE_KEYS } from '../supabase';

export const AnalyticsEvents = {
  // Slideshow lifecycle
  SLIDESHOW_VIEW: 'slideshow_view',
  SLIDE_CHANGE: 'slide_change',
  SLIDESHOW_COMPLETE: 'slideshow_complete',
  
  // User interactions
  PLAY_PAUSE: 'play_pause',
  MUSIC_TOGGLE: 'music_toggle',
  DOWNLOAD_SINGLE: 'download_single',
  DOWNLOAD_ALL: 'download_all',
  SHARE_WHATSDAPP: 'share_whatsapp',
  EXPORT_VIDEO: 'export_video',
  
  // Engagement
  TIME_ON_SLIDE: 'time_on_slide',
  TOTAL_WATCH_TIME: 'total_watch_time',
  
  // Errors
  IMAGE_LOAD_ERROR: 'image_load_error',
  VIDEO_EXPORT_ERROR: 'video_export_error'
};

/**
 * Event Analytics Service
 * Tracks all slideshow interactions and event metadata
 */
class EventAnalytics {
  constructor() {
    this.sessionId = this.generateSessionId();
    this.startTime = Date.now();
    this.slideViewTimes = [];
    this.currentSlideStartTime = null;
    this.eventType = null;
    this.eventId = null;
    this.orderCode = null;
  }

  /**
   * Generate unique session ID
   */
  generateSessionId() {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Initialize tracking for a specific event
   */
  initialize({ eventType, eventId, orderCode }) {
    this.eventType = eventType;
    this.eventId = eventId;
    this.orderCode = orderCode;

    // Track view immediately
    this.trackView({
      event_type: eventType,
      event_id: eventId,
      order_code: orderCode,
      timestamp: new Date().toISOString(),
      session_id: this.sessionId,
      user_agent: navigator.userAgent,
      viewport: `${window.innerWidth}x${window.innerHeight}`,
      referrer: document.referrer || 'direct'
    });

    // Start slide timer
    this.startSlideTimer();
  }

  /**
   * Track slideshow view
   */
  async trackView(metadata) {
    try {
      // Store locally for fallback
      const views = JSON.parse(localStorage.getItem(STORAGE_KEYS.ANALYTICS_VIEWS) || '[]');
      views.push(metadata);
      localStorage.setItem(STORAGE_KEYS.ANALYTICS_VIEWS, JSON.stringify(views));

      // Send to Supabase (if table exists)
      const { error } = await supabase
        .from('slideshow_analytics')
        .insert({
          event_type: metadata.event_type,
          event_id: metadata.event_id,
          order_code: metadata.order_code,
          session_id: metadata.session_id,
          event_name: AnalyticsEvents.SLIDESHOW_VIEW,
          user_agent: metadata.user_agent,
          viewport_width: window.innerWidth,
          viewport_height: window.innerHeight,
          referrer: metadata.referrer || null,
          metadata: {
            timestamp: metadata.timestamp
          }
        });

      if (error && error.code === 'PGRST116') {
        // Table doesn't exist yet - silently ignore (SQL not run)
        console.debug('Analytics table not found - skipping tracking (run analytics_schema.sql)');
        return;
      }

      if (error) {
        console.warn('Analytics tracking failed:', error.message);
      } else {
        console.debug('[Analytics] View tracked:', metadata.event_type, metadata.order_code);
      }
    } catch (err) {
      console.debug('Analytics error (non-critical):', err);
    }
  }

   * Track slide change with timing
   */
  async trackSlideChange(slideIndex, totalSlides, slideMetadata = {}) {
    const now = Date.now();
    
    if (this.currentSlideStartTime) {
      const timeOnSlide = now - this.currentSlideStartTime;
      this.slideViewTimes.push({
        slideIndex,
        duration: timeOnSlide,
        timestamp: new Date().toISOString()
      });
    }

    this.currentSlideStartTime = now;

    try {
      await supabase
        .from('slideshow_analytics')
        .insert({
          event_type: this.eventType,
          event_id: this.eventId,
          order_code: this.orderCode,
          session_id: this.sessionId,
          event_name: AnalyticsEvents.SLIDE_CHANGE,
          slide_index: slideIndex,
          total_slides: totalSlides,
          metadata: {
            time_on_previous_slide: this.slideViewTimes[this.slideViewTimes.length - 1]?.duration,
            ...slideMetadata
          }
        });
    } catch (err) {
      if (err.code === 'PGRST116') {
        // Table doesn't exist - silently ignore
        return;
      }
      console.debug('Analytics slide tracking failed (non-critical):', err);
    }
  }

  /**
   * Track user interaction
   */
  async trackInteraction(action, additionalData = {}) {
    try {
      await supabase
        .from('slideshow_analytics')
        .insert({
          event_type: this.eventType,
          event_id: this.eventId,
          order_code: this.orderCode,
          session_id: this.sessionId,
          event_name: action,
          metadata: {
            ...additionalData,
            timestamp: new Date().toISOString()
          }
        });
    } catch (err) {
      if (err.code === 'PGRST116') {
        // Table doesn't exist - silently ignore
        return;
      }
      console.debug('Analytics interaction tracking failed (non-critical):', err);
    }
  }

  /**
   * Track error events
   */
  async trackError(errorType, errorMessage, context = {}) {
    try {
      await supabase
        .from('slideshow_analytics')
        .insert({
          event_type: this.eventType,
          event_id: this.eventId,
          order_code: this.orderCode,
          session_id: this.sessionId,
          event_name: AnalyticsEvents[errorType] || 'error',
          error_message: errorMessage,
          metadata: {
            ...context,
            user_agent: navigator.userAgent,
            url: window.location.href
          }
        });
    } catch (err) {
      if (err.code === 'PGRST116') {
        // Table doesn't exist - silently ignore
        return;
      }
      console.debug('Analytics error tracking failed (non-critical):', err);
    }
  }

  /**
   * Track video export
   */
  async trackVideoExport(format, duration, slidesCount, success = true) {
    await this.trackInteraction(AnalyticsEvents.EXPORT_VIDEO, {
      format,
      duration_seconds: duration,
      slides_count: slidesCount,
      success,
      total_watch_time: Date.now() - this.startTime
    });
  }

  /**
   * Track download
   */
  async trackDownload(type, slideIndex = null) {
    await this.trackInteraction(
      type === 'all' ? AnalyticsEvents.DOWNLOAD_ALL : AnalyticsEvents.DOWNLOAD_SINGLE,
      {
        slide_index: slideIndex,
        total_downloads: type === 'all' ? 'bulk' : 'single'
      }
    );
  }

  /**
   * Finalize session - call when slideshow ends
   */
  async finalize() {
    const totalTime = Date.now() - this.startTime;
    const avgTimePerSlide = this.slideViewTimes.length > 0
      ? this.slideViewTimes.reduce((sum, s) => sum + s.duration, 0) / this.slideViewTimes.length
      : 0;

    try {
      await supabase
        .from('slideshow_analytics')
        .insert({
          event_type: this.eventType,
          event_id: this.eventId,
          order_code: this.orderCode,
          session_id: this.sessionId,
          event_name: AnalyticsEvents.SLIDESHOW_COMPLETE,
          metadata: {
            total_duration_ms: totalTime,
            slides_viewed: this.slideViewTimes.length,
            avg_time_per_slide_ms: avgTimePerSlide,
            slide_times: this.slideViewTimes,
            completed_at: new Date().toISOString()
          }
        });
    } catch (err) {
      if (err.code === 'PGRST116') {
        // Table doesn't exist - silently ignore
        return;
      }
      console.debug('Analytics finalize failed (non-critical):', err);
    }
  }

  /**
   * Start slide timer
   */
  startSlideTimer() {
    this.currentSlideStartTime = Date.now();
  }

  /**
   * Get current session stats
   */
  getSessionStats() {
    return {
      sessionId: this.sessionId,
      eventType: this.eventType,
      duration: Date.now() - this.startTime,
      slidesViewed: this.slideViewTimes.length,
      avgTimePerSlide: this.slideViewTimes.length > 0
        ? this.slideViewTimes.reduce((sum, s) => sum + s.duration, 0) / this.slideViewTimes.length
        : 0
    };
  }
}

/**
 * Singleton instance
 */
export const analytics = new EventAnalytics();

/**
 * Hook for easy analytics in components
 */
export const useAnalytics = () => {
  return {
    trackInteraction: (action, data) => analytics.trackInteraction(action, data),
    trackDownload: (type, slideIndex) => analytics.trackDownload(type, slideIndex),
    trackExport: (format, duration, slides) => analytics.trackVideoExport(format, duration, slides),
    trackError: (type, message, context) => analytics.trackError(type, message, context),
    getSessionStats: () => analytics.getSessionStats()
  };
};

export default {
  AnalyticsEvents,
  analytics,
  useAnalytics
};
