import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { SupabaseService } from '../../shared/supabase/supabase.service';
import { SendMessageDto, InitializeConversationDto } from './dto';

@Injectable()
export class ChatService {
  constructor(private readonly supabase: SupabaseService) {}

  async initializeConversation(currentUserId: string, dto: InitializeConversationDto) {
    const { participantId } = dto;

    if (currentUserId === participantId) {
      throw new BadRequestException('Cannot start conversation with yourself');
    }

    const client = this.supabase.getClient();

    const existingConversation = await client
      .from('chat_messages')
      .select('id')
      .or(`and(sender_id.eq.${currentUserId},receiver_id.eq.${participantId}),and(sender_id.eq.${participantId},receiver_id.eq.${currentUserId})`)
      .limit(1)
      .maybeSingle();

    if (existingConversation.data) {
      return {
        success: true,
        message: 'Conversation already exists',
        conversationExists: true
      };
    }

    const { data, error } = await client
      .from('chat_messages')
      .insert({
        sender_id: currentUserId,
        receiver_id: participantId,
        message_content: '',
        message_type: 'conversation_init',
        is_read: false,
        metadata: { initialized: true }
      })
      .select()
      .single();

    if (error) {
      throw new BadRequestException(`Failed to initialize conversation: ${error.message}`);
    }

    return {
      success: true,
      message: 'Conversation initialized',
      conversationExists: false,
      data
    };
  }

  async getConversations(userId: string) {
    const client = this.supabase.getClient();

    const { data: messages, error } = await client
      .from('chat_messages')
      .select(`
        id,
        sender_id,
        receiver_id,
        message_content,
        message_type,
        timestamp,
        is_read,
        metadata,
        sender:user_profiles!chat_messages_sender_id_fkey(user_id, full_name, avatar),
        receiver:user_profiles!chat_messages_receiver_id_fkey(user_id, full_name, avatar)
      `)
      .or(`sender_id.eq.${userId},receiver_id.eq.${userId}`)
      .order('timestamp', { ascending: false });

    if (error) {
      throw new BadRequestException(`Failed to fetch conversations: ${error.message}`);
    }

    const conversationsMap = new Map();

    for (const message of messages) {
      const otherUserId = message.sender_id === userId ? message.receiver_id : message.sender_id;

      if (!conversationsMap.has(otherUserId)) {
        const otherUserArray = message.sender_id === userId ? message.receiver : message.sender;
        const otherUser = Array.isArray(otherUserArray) ? otherUserArray[0] : otherUserArray;

        const unreadCount = messages.filter(
          m => m.sender_id === otherUserId &&
               m.receiver_id === userId &&
               !m.is_read
        ).length;

        const initMessage = messages.find(
          m => m.message_type === 'conversation_init' &&
               ((m.sender_id === userId && m.receiver_id === otherUserId) ||
                (m.sender_id === otherUserId && m.receiver_id === userId))
        );

        const firstRealMessage = messages.find(
          m => m.message_type !== 'conversation_init' &&
               ((m.sender_id === userId && m.receiver_id === otherUserId) ||
                (m.sender_id === otherUserId && m.receiver_id === userId))
        );

        const hasReceiverResponded = messages.some(
          m => m.message_type !== 'conversation_init' &&
               m.sender_id === otherUserId &&
               m.receiver_id === userId
        );

        const lastMessageObject = message.message_type === 'conversation_init' ? null : {
          id: message.id,
          senderId: message.sender_id,
          receiverId: message.receiver_id,
          messageContent: message.message_content,
          messageType: message.message_type,
          timestamp: message.timestamp,
          isRead: message.is_read,
          metadata: message.metadata || {}
        };

        conversationsMap.set(otherUserId, {
          id: otherUserId,
          participantId: otherUserId,
          participantName: otherUser?.full_name || 'Unknown User',
          participantAvatar: otherUser?.avatar || null,
          lastMessage: lastMessageObject,
          unreadCount,
          isOnline: false,
          chatType: firstRealMessage ? 'existing' : 'new',
          canSendMessage: true,
          isBlocked: false,
          initiatedBy: initMessage?.sender_id || null,
          hasReceiverResponded
        });
      }
    }

    return Array.from(conversationsMap.values()).sort((a, b) => {
      const timeA = a.lastMessage?.timestamp ? new Date(a.lastMessage.timestamp).getTime() : 0;
      const timeB = b.lastMessage?.timestamp ? new Date(b.lastMessage.timestamp).getTime() : 0;
      return timeB - timeA;
    });
  }

  async getMessages(userId: string, conversationId: string) {
    const client = this.supabase.getClient();

    const { data, error } = await client
      .from('chat_messages')
      .select('*')
      .or(`and(sender_id.eq.${userId},receiver_id.eq.${conversationId}),and(sender_id.eq.${conversationId},receiver_id.eq.${userId})`)
      .order('timestamp', { ascending: true });

    if (error) {
      throw new BadRequestException(`Failed to fetch messages: ${error.message}`);
    }

    return data.map(msg => ({
      id: msg.id,
      senderId: msg.sender_id,
      receiverId: msg.receiver_id,
      messageContent: msg.message_content,
      messageType: msg.message_type,
      timestamp: msg.timestamp,
      isRead: msg.is_read,
      metadata: msg.metadata || {}
    }));
  }

  async sendMessage(userId: string, dto: SendMessageDto) {
    const { receiverId, messageContent, messageType = 'text', metadata = {} } = dto;

    if (userId === receiverId) {
      throw new BadRequestException('Cannot send message to yourself');
    }

    const client = this.supabase.getClient();

    const { data: receiverProfile } = await client
      .from('user_profiles')
      .select('user_id')
      .eq('user_id', receiverId)
      .maybeSingle();

    if (!receiverProfile) {
      throw new NotFoundException('Receiver not found');
    }

    const { data, error } = await client
      .from('chat_messages')
      .insert({
        sender_id: userId,
        receiver_id: receiverId,
        message_content: messageContent,
        message_type: messageType,
        is_read: false,
        metadata
      })
      .select()
      .single();

    if (error) {
      throw new BadRequestException(`Failed to send message: ${error.message}`);
    }

    return {
      id: data.id,
      senderId: data.sender_id,
      receiverId: data.receiver_id,
      messageContent: data.message_content,
      messageType: data.message_type,
      timestamp: data.timestamp,
      isRead: data.is_read,
      metadata: data.metadata || {}
    };
  }

  async markAsRead(userId: string, messageId: string) {
    const client = this.supabase.getClient();

    const { data: message } = await client
      .from('chat_messages')
      .select('receiver_id')
      .eq('id', messageId)
      .maybeSingle();

    if (!message) {
      throw new NotFoundException('Message not found');
    }

    if (message.receiver_id !== userId) {
      throw new ForbiddenException('You can only mark your own messages as read');
    }

    const { error } = await client
      .from('chat_messages')
      .update({ is_read: true })
      .eq('id', messageId);

    if (error) {
      throw new BadRequestException(`Failed to mark message as read: ${error.message}`);
    }

    return { success: true };
  }

  async getConversationInitiator(userId: string, otherUserId: string) {
    const client = this.supabase.getClient();

    const { data, error } = await client
      .from('chat_messages')
      .select('sender_id, receiver_id')
      .or(`and(sender_id.eq.${userId},receiver_id.eq.${otherUserId}),and(sender_id.eq.${otherUserId},receiver_id.eq.${userId})`)
      .eq('message_type', 'conversation_init')
      .maybeSingle();

    if (error) {
      throw new BadRequestException(`Failed to fetch initiator: ${error.message}`);
    }

    return {
      initiatedBy: data?.sender_id || null
    };
  }
}
