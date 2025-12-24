import { RealtimeEvent } from './types';
import { REALTIME_CONFIG } from './config';

export class RealtimeService {
  private subscriptions = new Map();
  private broadcastChannel: any;

  constructor() {
    // Realtime disabled for now
  }

  private sendEvent(event: RealtimeEvent) {
    console.log('Realtime event:', event);
  }

  public subscribeToChatMessages(userId: string, callback: (message: any) => void) {
    const channelName = `chat_${userId}`;

    if (this.subscriptions.has(channelName)) {
      return this.subscriptions.get(channelName);
    }

    const subscription = { unsubscribe: () => {} };
    this.subscriptions.set(channelName, subscription);
    return subscription;
  }

  public subscribeToOfferUpdates(userId: string, callback: (offer: any) => void) {
    const channelName = `offers_${userId}`;

    if (this.subscriptions.has(channelName)) {
      return this.subscriptions.get(channelName);
    }

    const subscription = { unsubscribe: () => {} };
    this.subscriptions.set(channelName, subscription);
    return subscription;
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
      this.subscriptions.delete(channelName);
    }
  }

  public unsubscribeAll() {
    this.subscriptions.clear();
  }
}

export const realtimeService = new RealtimeService();
