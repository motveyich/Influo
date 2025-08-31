import { supabase, TABLES } from '../../../core/supabase';
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
      // Prevent sending messages to self
      if (messageData.senderId === messageData.receiverId) {
        throw new Error('Cannot send message to yourself');
      }
      
      // Rate limiting check
      if (!this.checkRateLimit(messageData.senderId!)) {
        throw new Error('Rate limit exceeded. Please wait before sending more messages.');
      }

      // Validate message data
      this.validateMessageData(messageData);

      const newMessage: Partial<ChatMessage> = {
        sender_id: messageData.senderId,
        receiver_id: messageData.receiverId,
        message_content: messageData.messageContent,
        message_type: messageData.messageType || 'text',
        timestamp: new Date().toISOString(),
        is_read: false,
        metadata: messageData.metadata || {}
      };

      // Try to send via real-time first
      try {
        const { data, error } = await supabase
          .from(TABLES.CHAT_MESSAGES)
          .insert([newMessage])
          .select()
          .single();

        if (error) throw error;

        const transformedMessage = this.transformFromDatabase(data);

        // Send real-time notification
        realtimeService.sendChatMessage({
          type: 'chat_message',
          data: transformedMessage,
          userId: messageData.receiverId!,
          timestamp: transformedMessage.timestamp
        });

        // Track analytics
        analytics.trackChatMessage(messageData.senderId!, messageData.receiverId!);

        return transformedMessage;
      } catch (realtimeError) {
        // Queue message if real-time fails
        console.warn('Real-time delivery failed, queuing message:', realtimeError);
        this.queueMessage(newMessage as ChatMessage);
        throw new Error('Message queued due to delivery delay. The recipient will receive it shortly.');
      }
    } catch (error) {
      console.error('Failed to send message:', error);
      throw error;
    }
  }

  async getConversation(userId1: string, userId2: string): Promise<ChatMessage[]> {
    try {
      // Prevent getting conversation with self
      if (userId1 === userId2) {
        return [];
      }
      
      const { data, error } = await supabase
        .from(TABLES.CHAT_MESSAGES)
        .select('*')
        .or(`and(sender_id.eq.${userId1},receiver_id.eq.${userId2}),and(sender_id.eq.${userId2},receiver_id.eq.${userId1})`)
        .order('timestamp', { ascending: true });

      if (error) throw error;

      return data.map(message => this.transformFromDatabase(message));
    } catch (error) {
      console.error('Failed to get conversation:', error);
      throw error;
    }
  }

  async getUserConversations(userId: string): Promise<any[]> {
    try {
      // Get latest message for each conversation
      const { data, error } = await supabase
        .from(TABLES.CHAT_MESSAGES)
        .select(`
          *,
          sender:user_profiles!sender_id(user_id, full_name, avatar),
          receiver:user_profiles!receiver_id(user_id, full_name, avatar)
        `)
        .or(`sender_id.eq.${userId},receiver_id.eq.${userId}`)
        .order('timestamp', { ascending: false });

      if (error) throw error;

      // Group by conversation partner
      const conversationsMap = new Map();
      
      data.forEach(message => {
        const partnerId = message.sender_id === userId ? message.receiver_id : message.sender_id;
        const partner = message.sender_id === userId ? message.receiver : message.sender;
        
        // Skip if partner is the same as current user (self-conversation)
        if (partnerId === userId) {
          return;
        }
        
        if (!conversationsMap.has(partnerId)) {
          conversationsMap.set(partnerId, {
            id: partnerId,
            participantId: partnerId,
            participantName: partner.full_name,
            participantAvatar: partner.avatar,
            lastMessage: this.transformFromDatabase(message),
            unreadCount: 0,
            isOnline: false // This would need real-time presence tracking
          });
        }
        
        // Count unread messages
        if (message.receiver_id === userId && !message.is_read) {
          const conversation = conversationsMap.get(partnerId);
          conversation.unreadCount++;
        }
      });

      return Array.from(conversationsMap.values());
    } catch (error) {
      console.error('Failed to get user conversations:', error);
      throw error;
    }
  }

  async markMessagesAsRead(senderId: string, receiverId: string): Promise<void> {
    try {
      // Prevent marking messages as read for self-conversation
      if (senderId === receiverId) {
        return;
      }
      
      const { error } = await supabase
        .from(TABLES.CHAT_MESSAGES)
        .update({ is_read: true })
        .eq('sender_id', senderId)
        .eq('receiver_id', receiverId)
        .eq('is_read', false);

      if (error) throw error;
    } catch (error) {
      console.error('Failed to mark messages as read:', error);
      throw error;
    }
  }

  async hasReceiverResponded(userId1: string, userId2: string): Promise<boolean> {
    try {
      // Check if the receiver (userId1) has sent any messages to the sender (userId2)
      const { data, error } = await supabase
        .from(TABLES.CHAT_MESSAGES)
        .select('id')
        .eq('sender_id', userId1)
        .eq('receiver_id', userId2)
        .limit(1);

      if (error) throw error;
      return (data?.length || 0) > 0;
    } catch (error) {
      console.error('Failed to check receiver response:', error);
      return false;
    }
  }

  async getConversationInitiator(userId1: string, userId2: string): Promise<string | null> {
    try {
      // Get the first message in the conversation to determine who initiated
      const { data, error } = await supabase
        .from(TABLES.CHAT_MESSAGES)
        .select('sender_id')
        .or(`and(sender_id.eq.${userId1},receiver_id.eq.${userId2}),and(sender_id.eq.${userId2},receiver_id.eq.${userId1})`)
        .order('timestamp', { ascending: true })
        .limit(1);

      if (error) throw error;
      return data?.[0]?.sender_id || null;
    } catch (error) {
      console.error('Failed to get conversation initiator:', error);
      return null;
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
    if (!messageData.messageContent?.trim()) errors.push('Message content is required');
    
    if (messageData.messageContent && messageData.messageContent.length > 1000) {
      errors.push('Message content cannot exceed 1000 characters');
    }

    if (messageData.messageType && !['text', 'image', 'file', 'offer'].includes(messageData.messageType)) {
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
        console.error('Failed to process queued message:', error);
        // Re-queue if still failing
        this.messageQueue.push(message);
      }
    }
  }

  public transformMessageFromDatabase(dbData: any): ChatMessage {
    return {
      id: dbData.id,
      senderId: dbData.sender_id,
      receiverId: dbData.receiver_id,
      messageContent: dbData.message_content,
      messageType: dbData.message_type,
      timestamp: dbData.timestamp,
      isRead: dbData.is_read,
      metadata: dbData.metadata || {}
    };
  }

  private transformFromDatabase(dbData: any): ChatMessage {
    return this.transformMessageFromDatabase(dbData);
  }
}

export const chatService = new ChatService();