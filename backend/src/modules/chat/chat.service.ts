import { Injectable, BadRequestException, NotFoundException, Logger } from '@nestjs/common';
import { SupabaseService } from '../../shared/supabase/supabase.service';
import { SendMessageDto, MarkReadDto } from './dto';

@Injectable()
export class ChatService {
  private readonly logger = new Logger(ChatService.name);

  constructor(private supabaseService: SupabaseService) {}

  async sendMessage(senderId: string, sendMessageDto: SendMessageDto) {
    const supabase = this.supabaseService.getClient();

    if (senderId === sendMessageDto.receiverId) {
      throw new BadRequestException('Cannot send message to yourself');
    }

    const newMessage = {
      sender_id: senderId,
      receiver_id: sendMessageDto.receiverId,
      message_content: sendMessageDto.messageContent,
      message_type: sendMessageDto.messageType || 'text',
      timestamp: new Date().toISOString(),
      is_read: false,
      metadata: sendMessageDto.metadata || {},
    };

    const { data, error } = await supabase
      .from('chat_messages')
      .insert([newMessage])
      .select()
      .single();

    if (error) {
      this.logger.error(`Failed to send message: ${error.message}`);
      throw new BadRequestException('Failed to send message');
    }

    return {
      success: true,
      data: this.transformMessage(data),
    };
  }

  async getConversation(userId: string, otherUserId: string, limit = 50, offset = 0) {
    const supabase = this.supabaseService.getClient();

    const { data, error } = await supabase
      .from('chat_messages')
      .select('*')
      .or(`and(sender_id.eq.${userId},receiver_id.eq.${otherUserId}),and(sender_id.eq.${otherUserId},receiver_id.eq.${userId})`)
      .order('timestamp', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      this.logger.error(`Failed to get conversation: ${error.message}`);
      throw new BadRequestException('Failed to get conversation');
    }

    return {
      success: true,
      data: data.map(msg => this.transformMessage(msg)),
    };
  }

  async getChatList(userId: string) {
    const supabase = this.supabaseService.getClient();

    const { data, error } = await supabase.rpc('get_user_chats', {
      p_user_id: userId,
    });

    if (error) {
      this.logger.warn(`RPC get_user_chats failed, falling back to manual query: ${error.message}`);
      return this.getChatListFallback(userId);
    }

    return {
      success: true,
      data: data || [],
    };
  }

  private async getChatListFallback(userId: string) {
    const supabase = this.supabaseService.getClient();

    const { data: messages, error } = await supabase
      .from('chat_messages')
      .select('sender_id, receiver_id, message_content, timestamp, is_read')
      .or(`sender_id.eq.${userId},receiver_id.eq.${userId}`)
      .order('timestamp', { ascending: false });

    if (error) {
      this.logger.error(`Failed to get chat list: ${error.message}`);
      throw new BadRequestException('Failed to get chat list');
    }

    const chatMap = new Map();

    for (const msg of messages) {
      const otherUserId = msg.sender_id === userId ? msg.receiver_id : msg.sender_id;

      if (!chatMap.has(otherUserId)) {
        chatMap.set(otherUserId, {
          userId: otherUserId,
          lastMessage: msg.message_content,
          lastMessageTime: msg.timestamp,
          unreadCount: 0,
        });
      }

      if (msg.receiver_id === userId && !msg.is_read) {
        chatMap.get(otherUserId).unreadCount++;
      }
    }

    const { data: profiles, error: profileError } = await supabase
      .from('user_profiles')
      .select('user_id, full_name, avatar')
      .in('user_id', Array.from(chatMap.keys()));

    if (profileError) {
      this.logger.error(`Failed to get user profiles: ${profileError.message}`);
    }

    const profileMap = new Map(profiles?.map(p => [p.user_id, p]) || []);

    const chatList = Array.from(chatMap.values()).map(chat => {
      const profile = profileMap.get(chat.userId);
      return {
        ...chat,
        userName: profile?.full_name || 'Unknown User',
        userAvatar: profile?.avatar || null,
      };
    });

    return {
      success: true,
      data: chatList,
    };
  }

  async markMessagesAsRead(userId: string, markReadDto: MarkReadDto) {
    const supabase = this.supabaseService.getClient();

    const { error } = await supabase
      .from('chat_messages')
      .update({ is_read: true })
      .in('id', markReadDto.messageIds)
      .eq('receiver_id', userId);

    if (error) {
      this.logger.error(`Failed to mark messages as read: ${error.message}`);
      throw new BadRequestException('Failed to mark messages as read');
    }

    return {
      success: true,
      message: 'Messages marked as read',
    };
  }

  async getUnreadCount(userId: string) {
    const supabase = this.supabaseService.getClient();

    const { count, error } = await supabase
      .from('chat_messages')
      .select('*', { count: 'exact', head: true })
      .eq('receiver_id', userId)
      .eq('is_read', false);

    if (error) {
      this.logger.error(`Failed to get unread count: ${error.message}`);
      throw new BadRequestException('Failed to get unread count');
    }

    return {
      success: true,
      data: { count: count || 0 },
    };
  }

  private transformMessage(dbMessage: any) {
    return {
      id: dbMessage.id,
      senderId: dbMessage.sender_id,
      receiverId: dbMessage.receiver_id,
      messageContent: dbMessage.message_content,
      messageType: dbMessage.message_type,
      timestamp: dbMessage.timestamp,
      isRead: dbMessage.is_read,
      metadata: dbMessage.metadata || {},
    };
  }
}
