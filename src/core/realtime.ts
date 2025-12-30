/**
 * ⚠️ REALTIME ВРЕМЕННО ОТКЛЮЧЕН
 *
 * Frontend НЕ использует Supabase realtime напрямую.
 * Realtime функциональность будет реализована через backend WebSockets/SSE позже.
 *
 * Этот файл содержит заглушки для обратной совместимости.
 */

import { RealtimeEvent } from './types';

export class RealtimeService {
  private subscriptions = new Map();

  constructor() {
    console.warn('[Realtime] Realtime функциональность временно отключена. Используйте polling через backend API.');
  }

  private sendEvent(event: RealtimeEvent) {
    console.warn('[Realtime] sendEvent вызван, но realtime отключен:', event.type);
  }

  public subscribeToChatMessages(userId: string, callback: (message: any) => void) {
    console.warn('[Realtime] subscribeToChatMessages вызван для userId:', userId);
    return () => {};
  }

  public subscribeToOfferUpdates(userId: string, callback: (offer: any) => void) {
    console.warn('[Realtime] subscribeToOfferUpdates вызван для userId:', userId);
    return () => {};
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
    console.warn('[Realtime] unsubscribe вызван для channel:', channelName);
    this.subscriptions.delete(channelName);
  }

  public unsubscribeAll() {
    console.warn('[Realtime] unsubscribeAll вызван');
    this.subscriptions.clear();
  }
}

export const realtimeService = new RealtimeService();