import { supabase } from './supabase';
import { RealtimeEvent } from './types';
import { REALTIME_CONFIG } from './config';

export class RealtimeService {
  private subscriptions = new Map();
  private broadcastChannel: any;

  constructor() {
    this.broadcastChannel = supabase.channel(REALTIME_CONFIG.BROADCAST_CHANNEL_NAME);
  }

  private sendEvent(event: RealtimeEvent) {
    try {
      this.broadcastChannel.send({
        type: 'broadcast',
        event: event.type,
        payload: event,
      });
    } catch (error) {
      console.error('Failed to send real-time event:', error);
      throw error;
    }
  }

  public subscribeToChatMessages(userId: string, callback: (message: any) => void) {
    const channelName = `chat_${userId}`;
    
    if (this.subscriptions.has(channelName)) {
      return this.subscriptions.get(channelName);
    }

    const channel = supabase
      .channel(channelName)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'chat_messages',
        filter: `receiver_id=eq.${userId}`,
      }, callback)
      .subscribe();

    this.subscriptions.set(channelName, channel);
    return channel;
  }

  public subscribeToOfferUpdates(userId: string, callback: (offer: any) => void) {
    const channelName = `offers_${userId}`;
    
    if (this.subscriptions.has(channelName)) {
      return this.subscriptions.get(channelName);
    }

    const channel = supabase
      .channel(channelName)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'offers',
        filter: `influencer_id=eq.${userId}`,
      }, callback)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'offers',
        filter: `advertiser_id=eq.${userId}`,
      }, callback)
      .subscribe();

    this.subscriptions.set(channelName, channel);
    return channel;
  }

  public sendChatMessage(message: RealtimeEvent) {
    this.sendEvent({
      ...message,
      type: 'chat_message',
      timestamp: new Date().toISOString(),
    });
  }

  public sendOfferUpdate(offer: RealtimeEvent) {
    this.sendEvent({
      ...offer,
      type: 'offer_update',
      timestamp: new Date().toISOString(),
    });
  }

  public sendNotification(notification: RealtimeEvent) {
    this.sendEvent({
      ...notification,
      type: 'notification',
      timestamp: new Date().toISOString(),
    });
  }

  public unsubscribe(channelName: string) {
    const channel = this.subscriptions.get(channelName);
    if (channel) {
      supabase.removeChannel(channel);
      this.subscriptions.delete(channelName);
    }
  }

  public unsubscribeAll() {
    this.subscriptions.forEach((channel, channelName) => {
      supabase.removeChannel(channel);
    });
    this.subscriptions.clear();
    
    if (this.broadcastChannel) {
      supabase.removeChannel(this.broadcastChannel);
    }
  }
}

export const realtimeService = new RealtimeService();