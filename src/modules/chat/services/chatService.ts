import { apiClient } from '../../../core/api';
import { ChatMessage } from '../../../core/types';
import { analytics } from '../../../core/analytics';
import { realtimeService } from '../../../core/realtime';

export class ChatService {
  private messageQueue: ChatMessage[] = [];
  private rateLimitMap = new Map<string, { count: number; resetTime: number }>();
  private readonly RATE_LIMIT_MAX = 10; // messages per minute
  private readonly RATE_LIMIT_WINDOW = 60000; // 1 minute

  async sendMessage(messageData: Partial<ChatMessage>): Promise<ChatMessage> {
    try {
      if (messageData.senderId === messageData.receiverId) {
        throw new Error('Cannot send message to yourself');
      }

      if (!this.checkRateLimit(messageData.senderId!)) {
        throw new Error('Rate limit exceeded. Please wait before sending more messages.');
      }

      this.validateMessageData(messageData);

      const response = await apiClient.post<ChatMessage>('/chat/messages', {
        receiverId: messageData.receiverId,
        messageContent: messageData.messageContent,
        messageType: messageData.messageType || 'text',
        metadata: messageData.metadata || {}
      });

      const transformedMessage = this.transformFromApi(response);

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

  async getConversation(userId1: string, userId2: string): Promise<ChatMessage[]> {
    try {
      if (userId1 === userId2) {
        return [];
      }

      const messages = await apiClient.get<ChatMessage[]>(`/chat/messages/${userId2}`);
      return messages.map(msg => this.transformFromApi(msg));
    } catch (error) {
      console.error('Failed to get conversation:', error);
      throw error;
    }
  }

  async getUserConversations(userId: string): Promise<any[]> {
    try {
      const conversations = await apiClient.get<any[]>('/chat/conversations');
      return conversations;
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

      const messages = await this.getConversation(receiverId, senderId);
      const unreadMessages = messages.filter(msg =>
        msg.senderId === senderId &&
        msg.receiverId === receiverId &&
        !msg.isRead
      );

      for (const message of unreadMessages) {
        await apiClient.patch(`/chat/messages/${message.id}/read`, {});
      }
    } catch (error) {
      console.error('Failed to mark messages as read:', error);
      throw error;
    }
  }


  async getConversationInitiator(userId1: string, userId2: string): Promise<string | null> {
    try {
      const response = await apiClient.get<{ initiatedBy: string | null }>(`/chat/conversations/${userId2}/initiator`);
      return response.initiatedBy;
    } catch (error) {
      console.error('Failed to get conversation initiator:', error);
      return null;
    }
  }

  async initializeConversation(userId1: string, userId2: string): Promise<boolean> {
    try {
      if (userId1 === userId2) {
        throw new Error('Cannot create conversation with yourself');
      }

      const response = await apiClient.post<{ success: boolean; conversationExists: boolean }>('/chat/conversations/initialize', {
        participantId: userId2
      });

      console.log('Conversation initialized:', response);
      return response.success;
    } catch (error) {
      console.error('Failed to initialize conversation:', error);
      throw error;
    }
  }

  private checkRateLimit(userId: string): boolean {
    const now = Date.now();
    const userLimit = this.rateLimitMap.get(userId);

    if (!userLimit || now > userLimit.resetTime) {
      // Reset or create new limit
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

    // conversation_init messages don't require content
    if (messageData.messageType !== 'conversation_init' && !messageData.messageContent?.trim()) {
      errors.push('Message content is required');
    }

    if (messageData.messageContent && messageData.messageContent.length > 1000) {
      errors.push('Message content cannot exceed 1000 characters');
    }

    if (messageData.messageType && !['text', 'image', 'file', 'offer', 'payment_window', 'payment_confirmation', 'conversation_init', 'collaboration_offer', 'collaboration_response', 'system'].includes(messageData.messageType)) {
      errors.push('Invalid message type');
    }

    if (errors.length > 0) {
      throw new Error(errors.join('; '));
    }
  }

  private queueMessage(message: ChatMessage): void {
    this.messageQueue.push(message);
    
    // Try to process queue after delay
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
        
        // Check if this is a permanent validation error that shouldn't be retried
        const isPermanentError = errorMessage.includes('Cannot send message to yourself') ||
                               errorMessage.includes('Sender ID is required') ||
                               errorMessage.includes('Receiver ID is required') ||
                               errorMessage.includes('Invalid message type') ||
                               errorMessage.includes('Message content is required');
        
        if (isPermanentError) {
          console.warn('Removing invalid message from queue:', errorMessage);
          // Don't re-queue permanently invalid messages
        } else {
          console.error('Failed to process queued message:', error);
          // Re-queue only for temporary errors (network issues, etc.)
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

  private transformFromApi(apiData: any): ChatMessage {
    return this.transformMessageFromDatabase(apiData);
  }

  async getUserChats(userId: string): Promise<any[]> {
    return this.getUserConversations(userId);
  }

  async getChatMessages(chatId: string): Promise<ChatMessage[]> {
    try {
      const messages = await apiClient.get<ChatMessage[]>(`/chat/messages/${chatId}`);
      return messages.map(msg => this.transformFromApi(msg));
    } catch (error) {
      console.error('Failed to get chat messages:', error);
      return [];
    }
  }

  async getMessagesBetweenUsers(userId1: string, userId2: string): Promise<ChatMessage[]> {
    return this.getConversation(userId1, userId2);
  }
}

export const chatService = new ChatService();