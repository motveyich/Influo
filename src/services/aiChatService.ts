import { database, TABLES } from '../core/database';
import { AIChatThread, AIChatMessage, ChatMessage } from '../core/types';
import { analytics } from '../core/analytics';

export class AIChatService {
  private activeThreads = new Map<string, AIChatThread>();
  private rateLimitMap = new Map<string, { count: number; resetTime: number }>();
  private readonly RATE_LIMIT_MAX = 15; // requests per hour
  private readonly RATE_LIMIT_WINDOW = 3600000; // 1 hour

  async getOrCreatePersonalThread(userId: string): Promise<AIChatThread> {
    try {
      // Create personal conversation ID for this user only
      const conversationId = `personal_${userId}`;
      
      // Check if thread is cached
      if (this.activeThreads.has(conversationId)) {
        return this.activeThreads.get(conversationId)!;
      }

      // Create or get existing thread using upsert
      const newThread = {
        conversation_id: conversationId,
        user1_id: userId,
        user2_id: userId, // Same user for personal chat
        metadata: {
          created_by_service: true,
          conversation_type: 'personal_ai_assistant',
          is_personal: true
        }
      };

      const { data, error } = await database
        .from(TABLES.AI_CHAT_THREADS)
        .upsert([newThread], {
          onConflict: 'conversation_id',
          ignoreDuplicates: false
        })
        .select()
        .single();

      if (error) throw error;

      const thread = this.transformThreadFromDatabase(data);
      this.activeThreads.set(conversationId, thread);

      // Send initial AI message only for newly created threads
      const messages = await this.getThreadMessages(thread.id);
      if (messages.length === 0) {
        await this.sendSystemMessage(thread.id, 
          'Привет! Я ваш персональный AI-ассистент. Буду анализировать ваши диалоги и предлагать рекомендации для эффективного сотрудничества. Вся история нашего общения видна только вам.'
        );
      }

      return thread;
    } catch (error) {
      console.error('Failed to get or create AI thread:', error);
      throw error;
    }
  }

  async getThreadMessages(threadId: string): Promise<AIChatMessage[]> {
    try {
      const { data, error } = await database
        .from(TABLES.AI_CHAT_MESSAGES)
        .select('*')
        .eq('thread_id', threadId)
        .order('created_at', { ascending: true })
        .limit(50); // Limit to last 50 AI messages

      if (error) throw error;

      return data.map(message => this.transformMessageFromDatabase(message));
    } catch (error) {
      console.error('Failed to get thread messages:', error);
      throw error;
    }
  }

  async analyzeConversationWithAI(threadId: string, chatMessages: ChatMessage[], currentUserId: string, partnerId: string): Promise<AIChatMessage> {
    try {
      if (chatMessages.length < 2) {
        throw new Error('Недостаточно сообщений для анализа');
      }

      // Get user roles
      const userRoles = await this.getUserRoles(currentUserId, partnerId);
      
      // Prepare messages for AI analysis
      const formattedMessages = await this.formatMessagesForAI(chatMessages, userRoles);

      // Call DeepSeek API through Edge Function
      const analysisResponse = await this.callDeepSeekAPI({
        messages: formattedMessages,
        threadId,
        user1Role: userRoles.currentUserRole,
        user2Role: userRoles.partnerRole,
        analysisType: 'conversation_analysis'
      });

      // Save AI analysis message
      const aiMessage = await this.saveAIMessage(threadId, 'ai_analysis', analysisResponse, {
        analysis_type: 'conversation_analysis',
        message_count: chatMessages.length,
        confidence: 0.9,
        analyzed_partner: partnerId
      });

      // Track analytics
      analytics.track('ai_conversation_analyzed', {
        thread_id: threadId,
        user_id: currentUserId,
        partner_id: partnerId,
        message_count: chatMessages.length,
        analysis_length: analysisResponse.length
      });

      return aiMessage;
    } catch (error) {
      console.error('Failed to analyze conversation with AI:', error);
      throw error;
    }
  }

  async askAIQuestion(threadId: string, question: string, userId: string, chatMessages: ChatMessage[], partnerId: string): Promise<AIChatMessage> {
    try {
      // Check rate limit
      if (!this.checkRateLimit(userId)) {
        throw new Error('Слишком много запросов к AI. Попробуйте позже (лимит: 15 запросов в час).');
      }

      // Save user question first
      await this.saveAIMessage(threadId, 'user_question', question, {
        user_id: userId,
        timestamp: new Date().toISOString()
      });

      // Get user roles
      const userRoles = await this.getUserRoles(userId, partnerId);
      
      // Prepare context with real chat messages
      const formattedMessages = await this.formatMessagesForAI(chatMessages, userRoles);

      // Call DeepSeek API
      const aiResponse = await this.callDeepSeekAPI({
        messages: formattedMessages,
        userQuestion: question,
        threadId,
        user1Role: userRoles.currentUserRole,
        user2Role: userRoles.partnerRole,
        analysisType: 'user_question'
      });

      // Save AI response
      const aiMessage = await this.saveAIMessage(threadId, 'ai_response', aiResponse, {
        question: question,
        user_id: userId,
        context_messages: formattedMessages.length,
        partner_id: partnerId
      });

      // Track analytics
      analytics.track('ai_question_asked', {
        thread_id: threadId,
        user_id: userId,
        question_length: question.length,
        context_messages: formattedMessages.length
      });

      return aiMessage;
    } catch (error) {
      console.error('Failed to ask AI question:', error);
      throw error;
    }
  }

  private async getUserRoles(currentUserId: string, partnerId: string): Promise<{ currentUserRole: string; partnerRole: string; currentUserId: string; partnerId: string }> {
    try {
      // Get user profiles
      const { data: profiles } = await database
        .from(TABLES.USER_PROFILES)
        .select('user_id, user_type, full_name')
        .in('user_id', [currentUserId, partnerId]);
      
      const currentUserProfile = profiles?.find(p => p.user_id === currentUserId);
      const partnerProfile = profiles?.find(p => p.user_id === partnerId);
      
      return {
        currentUserRole: this.getUserTypeLabel(currentUserProfile?.user_type || 'user'),
        partnerRole: this.getUserTypeLabel(partnerProfile?.user_type || 'user'),
        currentUserId: currentUserId,
        partnerId: partnerId
      };
    } catch (error) {
      console.error('Failed to get user roles:', error);
      return {
        currentUserRole: 'Пользователь',
        partnerRole: 'Пользователь',
        currentUserId: currentUserId,
        partnerId: partnerId
      };
    }
  }

  private getUserTypeLabel(userType: string): string {
    switch (userType) {
      case 'influencer':
        return 'Инфлюенсер';
      case 'advertiser':
        return 'Рекламодатель';
      default:
        return 'Пользователь';
    }
  }

  private async formatMessagesForAI(chatMessages: ChatMessage[], userRoles: any): Promise<ChatMessage[]> {
    // Take only last 15 messages for optimal context
    const recentMessages = chatMessages.slice(-15);
    
    return recentMessages.map(msg => ({
      content: msg.messageContent,
      senderId: msg.senderId,
      receiverId: msg.receiverId,
      timestamp: msg.timestamp,
      senderRole: msg.senderId === userRoles.currentUserId ? userRoles.currentUserRole : userRoles.partnerRole,
      receiverRole: msg.senderId === userRoles.currentUserId ? userRoles.partnerRole : userRoles.currentUserRole
    }));
  }

  private async callDeepSeekAPI(request: AnalysisRequest): Promise<string> {
    throw new Error('AI service is not available - database not configured');
  }

  private async saveAIMessage(
    threadId: string,
    messageType: AIChatMessage['messageType'],
    content: string,
    metadata: Record<string, any> = {}
  ): Promise<AIChatMessage> {
    try {
      const newMessage = {
        thread_id: threadId,
        message_type: messageType,
        content: content,
        metadata: {
          ...metadata,
          generated_at: new Date().toISOString(),
          model: 'deepseek-reasoner'
        },
        created_at: new Date().toISOString()
      };

      const { data, error } = await database
        .from(TABLES.AI_CHAT_MESSAGES)
        .insert([newMessage])
        .select()
        .single();

      if (error) throw error;

      return this.transformMessageFromDatabase(data);
    } catch (error) {
      console.error('Failed to save AI message:', error);
      throw error;
    }
  }

  private async sendSystemMessage(threadId: string, content: string): Promise<AIChatMessage> {
    return this.saveAIMessage(threadId, 'ai_response', content, {
      system_message: true,
      welcome: true
    });
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

  private transformThreadFromDatabase(dbData: any): AIChatThread {
    return {
      id: dbData.id,
      conversationId: dbData.conversation_id,
      user1Id: dbData.user1_id,
      user2Id: dbData.user2_id,
      metadata: dbData.metadata || {},
      createdAt: dbData.created_at,
      updatedAt: dbData.updated_at
    };
  }

  private transformMessageFromDatabase(dbData: any): AIChatMessage {
    return {
      id: dbData.id,
      threadId: dbData.thread_id,
      messageType: dbData.message_type,
      content: dbData.content,
      metadata: dbData.metadata || {},
      createdAt: dbData.created_at
    };
  }

  // Удаляем автоанализ - теперь только по запросу пользователя
}

export const aiChatService = new AIChatService();