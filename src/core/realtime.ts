/**
 * ⚠️ REALTIME ВРЕМЕННО ОТКЛЮЧЕН
 *
 * Frontend НЕ использует Supabase realtime напрямую.
 * Realtime функциональность будет реализована через backend WebSockets/SSE позже.
 *
 * Этот файл содержит заглушки для обратной совместимости.
 */

import { RealtimeEvent } from './types';

/**
 * ⚠️ ВАЖНО: Realtime функциональность временно отключена
 *
 * Frontend не имеет прямого доступа к Supabase для realtime subscriptions.
 * Используется polling через backend API вместо realtime.
 *
 * TODO: Реализовать WebSocket/SSE endpoint на backend для realtime обновлений
 */
export class RealtimeService {
  private subscriptions = new Map();

  constructor() {

    console.warn('[RealtimeService] Realtime functionality is disabled. Frontend uses polling through backend API.');
  }

  private sendEvent(event: RealtimeEvent) {
    console.warn('[RealtimeService] sendEvent called but realtime is disabled:', event.type);
  }

  public subscribeToChatMessages(userId: string, callback: (message: any) => void) {
    console.warn('[RealtimeService] subscribeToChatMessages called but realtime is disabled');
    return null;
  }

  public subscribeToOfferUpdates(userId: string, callback: (offer: any) => void) {
    console.warn('[RealtimeService] subscribeToOfferUpdates called but realtime is disabled');
    return null;
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
    console.warn('[RealtimeService] sendChatMessage called but realtime is disabled');
  }

  public sendOfferUpdate(offer: RealtimeEvent) {
    console.warn('[RealtimeService] sendOfferUpdate called but realtime is disabled');
  }

  public sendNotification(notification: RealtimeEvent) {
    console.warn('[RealtimeService] sendNotification called but realtime is disabled');
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