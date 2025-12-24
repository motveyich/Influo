import { database } from '../../../core/database';
import { apiClient } from '../../../core/apiClient';
import { showFeatureNotImplemented } from '../../../core/utils';
import { ChatMessage } from '../../../core/types';
import { analytics } from '../../../core/analytics';

export class ChatService {
  private messageQueue: ChatMessage[] = [];
  private rateLimitMap = new Map<string, { count: number; resetTime: number }>();
  private readonly RATE_LIMIT_MAX = 10;
  private readonly RATE_LIMIT_WINDOW = 60000;

  async sendMessage(messageData: Partial<ChatMessage>): Promise<ChatMessage> {
    try {
      if (messageData.senderId === messageData.receiverId) {
        throw new Error('Cannot send message to yourself');
      }

      if (!this.checkRateLimit(messageData.senderId!)) {
        throw new Error('Rate limit exceeded. Please wait before sending more messages.');
      }

      this.validateMessageData(messageData);

      const payload = {
        senderId: messageData.senderId,
        receiverId: messageData.receiverId,
        messageContent: messageData.messageContent,
        messageType: messageData.messageType || 'text',
        metadata: messageData.metadata || {}
      };

      const { data, error } = await apiClient.post<any>('/chat/messages', payload);

      if (error) throw new Error(error.message);

      analytics.trackChatMessage(messageData.senderId!, messageData.receiverId!);

      return this.transformFromApi(data);
    } catch (error) {
      console.error('Failed to send message:', error);
      throw error;
    }
  }

  async getConversation(userId1: string, userId2: string): Promise<ChatMessage[]> {
    try {
      if (userId1 === userId2) {
        return [];
      }

      const { data, error } = await apiClient.get<any[]>(`/chat/messages?userId1=${userId1}&userId2=${userId2}`);

      if (error) throw new Error(error.message);

      return (data || []).map(message => this.transformFromApi(message));
    } catch (error) {
      console.error('Failed to get conversation:', error);
      throw error;
    }
  }

  async getUserConversations(userId: string): Promise<any[]> {
    try {
      const { data, error } = await apiClient.get<any[]>(`/chat/conversations?userId=${userId}`);

      if (error) throw new Error(error.message);

      return (data || []).map(conv => ({
        id: conv.id,
        participantId: conv.participantId || conv.participant_id,
        participantName: conv.participantName || conv.participant_name,
        participantAvatar: conv.participantAvatar || conv.participant_avatar,
        lastMessage: conv.lastMessage ? this.transformFromApi(conv.lastMessage) : null,
        unreadCount: conv.unreadCount || conv.unread_count || 0,
        isOnline: conv.isOnline || false
      }));
    } catch (error) {
      console.error('Failed to get user conversations:', error);
      throw error;
    }
  }

  async markMessagesAsRead(senderId: string, receiverId: string): Promise<void> {
    try {
      if (senderId === receiverId) {
        return;
      }

      const { error } = await apiClient.post('/chat/read', {
        senderId,
        receiverId
      });

      if (error) throw new Error(error.message);
    } catch (error) {
      console.error('Failed to mark messages as read:', error);
      throw error;
    }
  }

  async hasReceiverResponded(userId1: string, userId2: string): Promise<boolean> {
    try {
      const { data, error } = await apiClient.get<any>(`/chat/messages?senderId=${userId1}&receiverId=${userId2}&limit=1`);

      if (error) throw new Error(error.message);

      return (data?.length || 0) > 0;
    } catch (error) {
      console.error('Failed to check receiver response:', error);
      return false;
    }
  }

  async getConversationInitiator(userId1: string, userId2: string): Promise<string | null> {
    try {
      const { data, error } = await apiClient.get<any[]>(`/chat/messages?userId1=${userId1}&userId2=${userId2}&limit=1&order=asc`);

      if (error) throw new Error(error.message);

      return data?.[0]?.senderId || data?.[0]?.sender_id || null;
    } catch (error) {
      console.error('Failed to get conversation initiator:', error);
      return null;
    }
  }

  async getUnreadCount(userId: string): Promise<number> {
    try {
      const { data, error } = await apiClient.get<any>(`/chat/unread-count?userId=${userId}`);

      if (error) throw new Error(error.message);

      return data?.count || 0;
    } catch (error) {
      console.error('Failed to get unread count:', error);
      return 0;
    }
  }

  async getUserChats(userId: string): Promise<any[]> {
    try {
      const { data, error } = await apiClient.get<any[]>(`/chat/chats?userId=${userId}`);

      if (error) throw new Error(error.message);

      return data || [];
    } catch (error) {
      console.error('Failed to get user chats:', error);
      return this.getUserConversations(userId);
    }
  }

  async getChatMessages(chatId: string): Promise<ChatMessage[]> {
    try {
      const { data, error } = await apiClient.get<any[]>(`/chat/messages?chatId=${chatId}`);

      if (error) throw new Error(error.message);

      return (data || []).map(message => this.transformFromApi(message));
    } catch (error) {
      console.error('Failed to get chat messages:', error);
      return [];
    }
  }

  async getMessagesBetweenUsers(userId1: string, userId2: string): Promise<ChatMessage[]> {
    return this.getConversation(userId1, userId2);
  }

  private checkRateLimit(userId: string): boolean {
    const now = Date.now();
    const userLimit = this.rateLimitMap.get(userId);

    if (!userLimit || now > userLimit.resetTime) {
      this.rateLimitMap.set(userId, {
        count: 1,
        resetTime: now + this.RATE_LIMIT_WINDOW
      });
      return true;
    }

    if (userLimit.count >= this.RATE_LIMIT_MAX) {
      return false;
    }

    userLimit.count++;
    return true;
  }

  private validateMessageData(messageData: Partial<ChatMessage>): void {
    const errors: string[] = [];

    if (!messageData.senderId) errors.push('Sender ID is required');
    if (!messageData.receiverId) errors.push('Receiver ID is required');
    if (messageData.senderId === messageData.receiverId) errors.push('Cannot send message to yourself');
    if (!messageData.messageContent?.trim()) errors.push('Message content is required');

    if (messageData.messageContent && messageData.messageContent.length > 1000) {
      errors.push('Message content cannot exceed 1000 characters');
    }

    if (messageData.messageType && !['text', 'image', 'file', 'offer', 'payment_window', 'payment_confirmation'].includes(messageData.messageType)) {
      errors.push('Invalid message type');
    }

    if (errors.length > 0) {
      throw new Error(errors.join('; '));
    }
  }

  public transformMessageFromDatabase(dbData: any): ChatMessage {
    return this.transformFromApi(dbData);
  }

  private transformFromApi(apiData: any): ChatMessage {
    return {
      id: apiData.id,
      senderId: apiData.senderId || apiData.sender_id,
      receiverId: apiData.receiverId || apiData.receiver_id,
      messageContent: apiData.messageContent || apiData.message_content,
      messageType: apiData.messageType || apiData.message_type,
      timestamp: apiData.timestamp,
      isRead: apiData.isRead ?? apiData.is_read,
      metadata: apiData.metadata || {}
    };
  }
}

export const chatService = new ChatService();
