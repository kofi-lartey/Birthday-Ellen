/**
 * REAL-TIME SLIDESHOW SERVICE
 * Live updates for slideshow state across multiple viewers
 * Enables "party mode" where multiple people see the same slide simultaneously
 */

import { useState, useEffect, useCallback } from 'react'
import { supabase, STORAGE_KEYS } from '../supabase';
import { analytics, AnalyticsEvents } from './analytics';

export const RealTimeChannel = {
  SLIDESHOW: 'slideshow-live',
  INTERACTIONS: 'slideshow-interactions'
};

/**
 * Real-time Slideshow State Manager
 * Uses Supabase Realtime for live synchronization
 */
class RealtimeSlideshowService {
  constructor() {
    this.channel = null;
    this.subscribers = new Map();
    this.isConnected = false;
    this.currentEventId = null;
    this.slideshowState = {
      currentSlide: 0,
      isPlaying: true,
      lastUpdate: null,
      updatedBy: null
    };
  }

  /**
   * Connect to slideshow real-time channel
   */
  async connect(eventId, options = {}) {
    if (this.channel) {
      await this.disconnect();
    }

    this.currentEventId = eventId;
    const channelName = `${RealTimeChannel.SLIDESHOW}:${eventId}`;

    this.channel = supabase
      .channel(channelName, {
        config: {
          broadcast: { self: false }, // Don't receive own broadcasts
          presence: { key: `event_${eventId}` }
        }
      })
      .on('broadcast', { event: 'slide_change' }, ({ payload }) => {
        this.handleSlideChange(payload);
      })
      .on('broadcast', { event: 'play_pause' }, ({ payload }) => {
        this.handlePlayPause(payload);
      })
      .on('broadcast', { event: 'user_joined' }, ({ payload }) => {
        this.handleUserJoined(payload);
      })
      .on('presence', { event: 'sync' }, () => {
        this.handlePresenceSync();
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          this.isConnected = true;
          console.log('[Realtime] Connected to slideshow channel:', channelName);
          
          // Announce presence
          await this.broadcast('user_joined', {
            userId: this.getUserId(),
            slideIndex: this.slideshowState.currentSlide,
            isPlaying: this.slideshowState.isPlaying
          });

          // Fetch current state from database
          await this.fetchCurrentState(eventId);
        }
      });

    return this.channel;
  }

  /**
   * Disconnect from real-time channel
   */
  async disconnect() {
    if (this.channel) {
      await supabase.removeChannel(this.channel);
      this.channel = null;
      this.isConnected = false;
    }
  }

  /**
   * Broadcast state change to all connected viewers
   */
  async broadcast(event, payload) {
    if (!this.channel) return;

    try {
      await supabase.channel(this.channel.name).send({
        type: 'broadcast',
        event,
        payload: {
          ...payload,
          timestamp: new Date().toISOString(),
          eventId: this.currentEventId
        }
      });
    } catch (err) {
      console.error('Realtime broadcast failed:', err);
    }
  }

  /**
   * Fetch current slideshow state from database
   */
  async fetchCurrentState(eventId) {
    try {
      const { data, error } = await supabase
        .from('slideshow_state')
        .select('*')
        .eq('event_id', eventId)
        .single();

      if (data && !error) {
        this.slideshowState = {
          currentSlide: data.current_slide || 0,
          isPlaying: data.is_playing || false,
          lastUpdate: data.updated_at,
          updatedBy: data.updated_by
        };
        this.notifySubscribers('state_update', this.slideshowState);
      }
    } catch (err) {
      console.error('Failed to fetch slideshow state:', err);
    }
  }

  /**
   * Update state in database and broadcast
   */
  async updateSlide(slideIndex, userId = null) {
    this.slideshowState.currentSlide = slideIndex;
    this.slideshowState.lastUpdate = new Date().toISOString();
    this.slideshowState.updatedBy = userId || this.getUserId();

    // Broadcast to all viewers
    await this.broadcast('slide_change', {
      slideIndex,
      userId: this.slideshowState.updatedBy
    });

    // Persist to database
    await this.persistState();
  }

  /**
   * Toggle play/pause and broadcast
   */
  async togglePlayPause(isPlaying, userId = null) {
    this.slideshowState.isPlaying = isPlaying;
    this.slideshowState.lastUpdate = new Date().toISOString();
    this.slideshowState.updatedBy = userId || this.getUserId();

    await this.broadcast('play_pause', {
      isPlaying,
      userId: this.slideshowState.updatedBy
    });

    await this.persistState();
  }

  /**
   * Persist state to database
   */
  async persistState() {
    if (!this.currentEventId) return;

    try {
      await supabase
        .from('slideshow_state')
        .upsert({
          event_id: this.currentEventId,
          current_slide: this.slideshowState.currentSlide,
          is_playing: this.slideshowState.isPlaying,
          updated_by: this.slideshowState.updatedBy,
          updated_at: this.slideshowState.lastUpdate
        }, {
          onConflict: 'event_id'
        });
    } catch (err) {
      console.error('Failed to persist slideshow state:', err);
    }
  }

  /**
   * Subscribe to state changes
   */
  subscribe(callback) {
    const id = Date.now().toString();
    this.subscribers.set(id, callback);
    return id;
  }

  /**
   * Unsubscribe from state changes
   */
  unsubscribe(id) {
    this.subscribers.delete(id);
  }

  /**
   * Notify all subscribers
   */
  notifySubscribers(event, data) {
    this.subscribers.forEach(callback => {
      try {
        callback(event, data);
      } catch (err) {
        console.error('Subscriber callback error:', err);
      }
    });
  }

  /**
   * Handle incoming slide change
   */
  handleSlideChange({ slideIndex, userId }) {
    if (userId !== this.getUserId()) {
      this.slideshowState.currentSlide = slideIndex;
      this.notifySubscribers('slide_change', { slideIndex });
    }
  }

  /**
   * Handle play/pause from other users
   */
  handlePlayPause({ isPlaying, userId }) {
    if (userId !== this.getUserId()) {
      this.slideshowState.isPlaying = isPlaying;
      this.notifySubscribers('play_pause', { isPlaying });
    }
  }

  /**
   * Handle user join
   */
  handleUserJoined({ userId }) {
    console.log('[Realtime] User joined:', userId);
    // Send current state to new user
    this.broadcast('state_sync', this.slideshowState);
  }

  /**
   * Handle presence sync
   */
  handlePresenceSync() {
    // Sync with all connected users
    this.broadcast('state_sync', this.slideshowState);
  }

  /**
   * Get current user identifier
   */
  getUserId() {
    const user = JSON.parse(localStorage.getItem(STORAGE_KEYS.CURRENT_USER) || 'null');
    return user?.id || `anonymous_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get current state
   */
  getState() {
    return { ...this.slideshowState };
  }
}

/**
 * Singleton instance
 */
export const realtimeSlideshow = new RealtimeSlideshowService();

/**
 * Hook for real-time slideshow functionality
 */
   export const useRealtimeSlideshow = (eventId, options = {}) => {
     const [state, setState] = useState({
       currentSlide: 0,
       isPlaying: true,
       isConnected: false
     });

     useEffect(() => {
       let mounted = true;
       let unsubscribe = null;

       const initialize = async () => {
         // Connect to real-time channel
         await realtimeSlideshow.connect(eventId);
         
         // Subscribe to state changes and store unsubscribe
         unsubscribe = realtimeSlideshow.subscribe((event, data) => {
           if (!mounted) return;
           
           switch (event) {
             case 'state_update':
             case 'slide_change':
               setState(prev => ({
                 ...prev,
                 currentSlide: data.slideIndex || data.currentSlide,
                 isPlaying: data.isPlaying !== undefined ? data.isPlaying : prev.isPlaying,
                 isConnected: true
               }));
               break;
             case 'play_pause':
               setState(prev => ({
                 ...prev,
                 isPlaying: data.isPlaying
               }));
               break;
           }
         });

         // Set initial state
         setState(prev => ({
           ...prev,
           ...realtimeSlideshow.getState(),
           isConnected: true
         }));

         // Track analytics
         analytics.initialize({ eventType: options.eventType, eventId, orderCode: options.orderCode });
       };

       initialize().catch(err => {
         console.error('Failed to initialize realtime:', err);
       });

       return () => {
         mounted = false;
         if (unsubscribe && typeof unsubscribe === 'function') {
           unsubscribe();
         }
         realtimeSlideshow.disconnect();
       };
     }, [eventId]);

  const updateSlide = useCallback(async (slideIndex) => {
    await realtimeSlideshow.updateSlide(slideIndex);
    analytics.trackSlideChange(slideIndex);
  }, []);

  const togglePlay = useCallback(async (isPlaying) => {
    await realtimeSlideshow.togglePlayPause(isPlaying);
    analytics.trackInteraction(AnalyticsEvents.PLAY_PAUSE, { isPlaying });
  }, []);

  return {
    ...state,
    updateSlide,
    togglePlay,
    broadcast: realtimeSlideshow.broadcast.bind(realtimeSlideshow)
  };
};

export default {
  realtimeSlideshow,
  useRealtimeSlideshow,
  RealTimeChannel
};
