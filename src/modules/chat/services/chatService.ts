import { apiClient } from '../../../core/api';
import { ChatMessage } from '../../../core/types';
import { analytics } from '../../../core/analytics';
import { realtimeService } from '../../../core/realtime';

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

      const transformedMessage = await apiClient.post<ChatMessage>('/chat/messages', {
        receiverId: messageData.receiverId,
        messageContent: messageData.messageContent,
        messageType: messageData.messageType || 'text',
        metadata: messageData.metadata || {},
      });

      realtimeService.sendChatMessage({
        type: 'chat_message',
        data: transformedMessage,
        userId: messageData.receiverId!,
        timestamp: transformedMessage.timestamp
      });

      analytics.trackChatMessage(messageData.senderId!, messageData.receiverId!);

      return transformedMessage;
    } catch (error) {
      console.error('Failed to send message:', error);
      throw error;
    }
  }

  async getConversation(userId1: string, userId2: string, limit = 50, offset = 0): Promise<ChatMessage[]> {
    try {
      if (userId1 === userId2) {
        return [];
      }

      return await apiClient.get<ChatMessage[]>(
        `/chat/conversations/${userId2}?limit=${limit}&offset=${offset}`
      );
    } catch (error) {
      console.error('Failed to get conversation:', error);
      throw error;
    }
  }

  async getUserConversations(userId: string): Promise<any[]> {
    try {
      return await apiClient.get<any[]>('/chat/chats');
    } catch (error) {
      console.error('Failed to get user conversations:', error);
      throw error;
    }
  }

  async markMessagesAsRead(messageIds: string[]): Promise<void> {
    try {
      if (!messageIds || messageIds.length === 0) {
        return;
      }

      await apiClient.patch('/chat/messages/read', {
        messageIds,
      });
    } catch (error) {
      console.error('Failed to mark messages as read:', error);
      throw error;
    }
  }

  async getUnreadCount(): Promise<number> {
    try {
      const result = await apiClient.get<{ count: number }>('/chat/unread-count');
      return result.count;
    } catch (error) {
      console.error('Failed to get unread count:', error);
      return 0;
    }
  }

  async hasReceiverResponded(userId1: string, userId2: string): Promise<boolean> {
    try {
      const conversation = await this.getConversation(userId1, userId2, 1);
      return conversation.some(msg => msg.senderId === userId1 && msg.receiverId === userId2);
    } catch (error) {
      console.error('Failed to check receiver response:', error);
      return false;
    }
  }

  async getConversationInitiator(userId1: string, userId2: string): Promise<string | null> {
    try {
      const conversation = await this.getConversation(userId1, userId2, 1);
      return conversation.length > 0 ? conversation[0].senderId : null;
    } catch (error) {
      console.error('Failed to get conversation initiator:', error);
      return null;
    }
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

    if (messageData.messageContent && messageData.messageContent.length > 5000) {
      errors.push('Message content cannot exceed 5000 characters');
    }

    if (messageData.messageType && !['text', 'offer', 'system'].includes(messageData.messageType)) {
      errors.push('Invalid message type');
    }

    if (errors.length > 0) {
      throw new Error(errors.join('; '));
    }
  }

  private queueMessage(message: ChatMessage): void {
    this.messageQueue.push(message);

    setTimeout(() => {
      this.processMessageQueue();
    }, 5000);
  }

  private async processMessageQueue(): Promise<void> {
    if (this.messageQueue.length === 0) return;

    const messagesToProcess = [...this.messageQueue];
    this.messageQueue = [];

    for (const message of messagesToProcess) {
      try {
        await this.sendMessage(message);
      } catch (error) {
        const errorMessage = (error as Error).message || '';

        const isPermanentError = errorMessage.includes('Cannot send message to yourself') ||
          errorMessage.includes('Sender ID is required') ||
          errorMessage.includes('Receiver ID is required') ||
          errorMessage.includes('Invalid message type') ||
          errorMessage.includes('Message content is required');

        if (isPermanentError) {
          console.warn('Removing invalid message from queue:', errorMessage);
        } else {
          console.error('Failed to process queued message:', error);
          this.messageQueue.push(message);
        }
      }
    }
  }

  public transformMessageFromDatabase(dbData: any): ChatMessage {
    return {
      id: dbData.id,
      senderId: dbData.senderId || dbData.sender_id,
      receiverId: dbData.receiverId || dbData.receiver_id,
      messageContent: dbData.messageContent || dbData.message_content,
      messageType: dbData.messageType || dbData.message_type,
      timestamp: dbData.timestamp,
      isRead: dbData.isRead !== undefined ? dbData.isRead : dbData.is_read,
      metadata: dbData.metadata || {}
    };
  }

  private transformFromDatabase(dbData: any): ChatMessage {
    return this.transformMessageFromDatabase(dbData);
  }

  async getUserChats(userId: string): Promise<any[]> {
    return this.getUserConversations(userId);
  }

  async getChatMessages(chatId: string): Promise<ChatMessage[]> {
    return [];
  }

  async getMessagesBetweenUsers(userId1: string, userId2: string): Promise<ChatMessage[]> {
    return this.getConversation(userId1, userId2);
  }
}

export const chatService = new ChatService();
