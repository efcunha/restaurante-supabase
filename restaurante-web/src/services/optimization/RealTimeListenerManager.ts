/**
 * Real-Time Listener Manager - Optimized Supabase Real-Time Subscriptions
 * 
 * Implements intelligent real-time subscription management with:
 * - Filtered subscriptions (company_id, date_key)
 * - Shared subscription deduplication
 * - Automatic cleanup on unmount
 * - Update debouncing (500ms)
 * - Subscription limit enforcement (max 5 concurrent)
 * - Exponential backoff reconnection
 * - Subscription metrics tracking
 * 
 * Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 11.4
 */

import { RealtimeChannel, RealtimePostgresChangesPayload } from '@supabase/supabase-js';
import { supabase } from '../../config/SupabaseConfig';

/**
 * Real-time filter configuration
 */
export interface RealtimeFilter {
  table: string;
  event: 'INSERT' | 'UPDATE' | 'DELETE' | '*';
  filter?: string; // e.g., "company_id=eq.123"
  schema?: string;
}

/**
 * Subscription callback type
 */
export type SubscriptionCallback = (payload: RealtimePostgresChangesPayload<any>) => void;

/**
 * Subscription handle
 */
export interface Subscription {
  id: string;
  channel: RealtimeChannel;
  filter: RealtimeFilter;
  callbacks: Set<SubscriptionCallback>;
  createdAt: number;
  messageCount: number;
}

/**
 * Subscription statistics
 */
export interface SubscriptionStats {
  activeSubscriptions: number;
  messagesReceived: number;
  averageLatency: number;
  reconnections: number;
  totalCallbacks: number;
}

/**
 * Debounce configuration
 */
interface DebounceConfig {
  delay: number;
  timer: NodeJS.Timeout | null;
  pendingPayload: RealtimePostgresChangesPayload<any> | null;
}

/**
 * Real-Time Listener Manager
 */
export class RealTimeListenerManager {
  private subscriptions: Map<string, Subscription> = new Map();
  private debounceTimers: Map<string, DebounceConfig> = new Map();
  
  private stats = {
    messagesReceived: 0,
    reconnections: 0,
    latencies: [] as number[]
  };

  private readonly MAX_SUBSCRIPTIONS = 5;
  private readonly DEBOUNCE_DELAY_MS = 500;
  private readonly MAX_RECONNECT_ATTEMPTS = 5;
  private readonly RECONNECT_BASE_DELAY_MS = 1000;

  /**
   * Subscribe to real-time channel with filters
   * Requirements: 5.1
   */
  subscribe(
    channelName: string,
    filter: RealtimeFilter,
    callback: SubscriptionCallback
  ): Subscription {
    // Check subscription limit
    if (this.subscriptions.size >= this.MAX_SUBSCRIPTIONS) {
      throw new Error(
        `Subscription limit reached. Maximum ${this.MAX_SUBSCRIPTIONS} concurrent subscriptions allowed.`
      );
    }

    // Generate subscription key
    const subscriptionKey = this.generateSubscriptionKey(channelName, filter);

    // Check if subscription already exists (shared subscription)
    const existingSubscription = this.subscriptions.get(subscriptionKey);
    if (existingSubscription) {
      // Add callback to existing subscription
      existingSubscription.callbacks.add(callback);
      return existingSubscription;
    }

    // Create new subscription
    const channel = this.createChannel(channelName, filter, subscriptionKey);
    
    const subscription: Subscription = {
      id: subscriptionKey,
      channel,
      filter,
      callbacks: new Set([callback]),
      createdAt: Date.now(),
      messageCount: 0
    };

    this.subscriptions.set(subscriptionKey, subscription);

    // Subscribe to channel
    channel.subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        console.log(`[RealTimeListenerManager] Subscribed to ${channelName}`);
      } else if (status === 'CHANNEL_ERROR') {
        console.error(`[RealTimeListenerManager] Channel error for ${channelName}`);
        this.handleDisconnection(subscriptionKey);
      } else if (status === 'TIMED_OUT') {
        console.error(`[RealTimeListenerManager] Subscription timed out for ${channelName}`);
        this.handleDisconnection(subscriptionKey);
      } else if (status === 'CLOSED') {
        console.log(`[RealTimeListenerManager] Channel closed for ${channelName}`);
      }
    });

    return subscription;
  }

  /**
   * Get or create shared subscription
   * Requirements: 5.2
   */
  getSharedSubscription(
    channelName: string,
    filter: RealtimeFilter
  ): Subscription | null {
    const subscriptionKey = this.generateSubscriptionKey(channelName, filter);
    return this.subscriptions.get(subscriptionKey) || null;
  }

  /**
   * Unsubscribe from channel
   * Requirements: 5.3
   */
  async unsubscribe(subscription: Subscription, callback?: SubscriptionCallback): Promise<void> {
    const existingSubscription = this.subscriptions.get(subscription.id);
    if (!existingSubscription) {
      return;
    }

    // If specific callback provided, remove only that callback
    if (callback) {
      existingSubscription.callbacks.delete(callback);
      
      // If no more callbacks, remove subscription entirely
      if (existingSubscription.callbacks.size === 0) {
        await this.removeSubscription(subscription.id);
      }
    } else {
      // Remove entire subscription
      await this.removeSubscription(subscription.id);
    }
  }

  /**
   * Unsubscribe all subscriptions (cleanup)
   * Requirements: 5.3
   */
  async unsubscribeAll(): Promise<void> {
    const subscriptionIds = Array.from(this.subscriptions.keys());
    
    for (const id of subscriptionIds) {
      await this.removeSubscription(id);
    }
  }

  /**
   * Debounce updates for a subscription
   * Requirements: 5.4
   */
  debounceUpdates(
    subscriptionKey: string,
    payload: RealtimePostgresChangesPayload<any>,
    callback: SubscriptionCallback
  ): void {
    // Get or create debounce config
    let debounceConfig = this.debounceTimers.get(subscriptionKey);
    
    if (!debounceConfig) {
      debounceConfig = {
        delay: this.DEBOUNCE_DELAY_MS,
        timer: null,
        pendingPayload: null
      };
      this.debounceTimers.set(subscriptionKey, debounceConfig);
    }

    // Clear existing timer
    if (debounceConfig.timer) {
      clearTimeout(debounceConfig.timer);
    }

    // Store latest payload
    debounceConfig.pendingPayload = payload;

    // Set new timer
    debounceConfig.timer = setTimeout(() => {
      if (debounceConfig!.pendingPayload) {
        callback(debounceConfig!.pendingPayload);
        debounceConfig!.pendingPayload = null;
      }
      debounceConfig!.timer = null;
    }, debounceConfig.delay);
  }

  /**
   * Get subscription statistics
   * Requirements: 11.4
   */
  getStats(): SubscriptionStats {
    let totalCallbacks = 0;
    
    for (const subscription of this.subscriptions.values()) {
      totalCallbacks += subscription.callbacks.size;
    }

    const averageLatency = this.stats.latencies.length > 0
      ? this.stats.latencies.reduce((sum, lat) => sum + lat, 0) / this.stats.latencies.length
      : 0;

    return {
      activeSubscriptions: this.subscriptions.size,
      messagesReceived: this.stats.messagesReceived,
      averageLatency,
      reconnections: this.stats.reconnections,
      totalCallbacks
    };
  }

  /**
   * Create Supabase real-time channel with filters
   * Requirements: 5.1
   */
  private createChannel(
    channelName: string,
    filter: RealtimeFilter,
    subscriptionKey: string
  ): RealtimeChannel {
    const channel = supabase.channel(channelName);

    // Configure postgres changes listener with filters
    const changeConfig: any = {
      event: filter.event,
      schema: filter.schema || 'public',
      table: filter.table
    };

    // Add filter if provided
    if (filter.filter) {
      changeConfig.filter = filter.filter;
    }

    channel.on(
      'postgres_changes',
      changeConfig,
      (payload: RealtimePostgresChangesPayload<any>) => {
        const startTime = Date.now();
        
        // Update stats
        this.stats.messagesReceived++;
        
        const subscription = this.subscriptions.get(subscriptionKey);
        if (subscription) {
          subscription.messageCount++;
          
          // Debounce and call all callbacks
          for (const callback of subscription.callbacks) {
            this.debounceUpdates(subscriptionKey, payload, callback);
          }
        }

        // Track latency
        const latency = Date.now() - startTime;
        this.stats.latencies.push(latency);
        
        // Keep only last 100 latency measurements
        if (this.stats.latencies.length > 100) {
          this.stats.latencies.shift();
        }
      }
    );

    return channel;
  }

  /**
   * Generate unique subscription key
   */
  private generateSubscriptionKey(channelName: string, filter: RealtimeFilter): string {
    const filterStr = filter.filter || 'no-filter';
    return `${channelName}:${filter.table}:${filter.event}:${filterStr}`;
  }

  /**
   * Remove subscription and cleanup
   */
  private async removeSubscription(subscriptionId: string): Promise<void> {
    const subscription = this.subscriptions.get(subscriptionId);
    if (!subscription) {
      return;
    }

    // Clear debounce timer if exists
    const debounceConfig = this.debounceTimers.get(subscriptionId);
    if (debounceConfig?.timer) {
      clearTimeout(debounceConfig.timer);
    }
    this.debounceTimers.delete(subscriptionId);

    // Unsubscribe from channel
    await supabase.removeChannel(subscription.channel);

    // Remove from subscriptions map
    this.subscriptions.delete(subscriptionId);
  }

  /**
   * Handle disconnection with exponential backoff reconnection
   * Requirements: 5.6
   */
  private async handleDisconnection(subscriptionKey: string): Promise<void> {
    const subscription = this.subscriptions.get(subscriptionKey);
    if (!subscription) {
      return;
    }

    console.log(`[RealTimeListenerManager] Handling disconnection for ${subscriptionKey}`);

    // Attempt reconnection with exponential backoff
    let attempt = 0;
    let success = false;

    while (attempt < this.MAX_RECONNECT_ATTEMPTS && !success) {
      attempt++;
      const delay = Math.min(
        this.RECONNECT_BASE_DELAY_MS * Math.pow(2, attempt - 1),
        30000 // Max 30 seconds
      );

      console.log(
        `[RealTimeListenerManager] Reconnection attempt ${attempt}/${this.MAX_RECONNECT_ATTEMPTS} in ${delay}ms`
      );

      await new Promise(resolve => setTimeout(resolve, delay));

      try {
        // Remove old channel
        await supabase.removeChannel(subscription.channel);

        // Create new channel with same configuration
        const newChannel = this.createChannel(
          subscription.channel.topic,
          subscription.filter,
          subscriptionKey
        );

        // Subscribe to new channel
        await new Promise<void>((resolve, reject) => {
          newChannel.subscribe((status) => {
            if (status === 'SUBSCRIBED') {
              console.log(`[RealTimeListenerManager] Reconnected successfully`);
              success = true;
              this.stats.reconnections++;
              resolve();
            } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
              reject(new Error(`Reconnection failed with status: ${status}`));
            }
          });
        });

        // Update subscription with new channel
        subscription.channel = newChannel;
      } catch (error) {
        console.error(`[RealTimeListenerManager] Reconnection attempt ${attempt} failed:`, error);
      }
    }

    if (!success) {
      console.error(
        `[RealTimeListenerManager] Failed to reconnect after ${this.MAX_RECONNECT_ATTEMPTS} attempts`
      );
      // Remove failed subscription
      await this.removeSubscription(subscriptionKey);
    }
  }

  /**
   * Clear all debounce timers (for cleanup)
   */
  clearAllDebounceTimers(): void {
    for (const config of this.debounceTimers.values()) {
      if (config.timer) {
        clearTimeout(config.timer);
      }
    }
    this.debounceTimers.clear();
  }
}

// Singleton instance
export const realTimeListenerManager = new RealTimeListenerManager();
