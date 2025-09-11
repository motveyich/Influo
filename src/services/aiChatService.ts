import { supabase, TABLES } from '../core/supabase';
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

      // Try to get existing thread from database
      const { data: existingThread, error: fetchError } = await supabase
        .from(TABLES.AI_CHAT_THREADS)
        .select('*')
        .eq('conversation_id', conversationId)
        .maybeSingle();

      if (fetchError) throw fetchError;

      if (existingThread) {
        const thread = this.transformThreadFromDatabase(existingThread);
        this.activeThreads.set(conversationId, thread);
        return thread;
      }

      // Create new thread
      const newThread = {
        conversation_id: conversationId,
        user1_id: userId,
        user2_id: userId, // Same user for personal chat
        metadata: {
          created_by_service: true,
          conversation_type: 'personal_ai_assistant',
          is_personal: true
        },
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      const { data, error } = await supabase
        .from(TABLES.AI_CHAT_THREADS)
        .insert([newThread])
        .select()
        .single();

      if (error) throw error;

      const thread = this.transformThreadFromDatabase(data);
      this.activeThreads.set(conversationId, thread);

      // Send initial AI message
      await this.sendSystemMessage(thread.id, 
        'Привет! Я ваш персональный AI-ассистент. Буду анализировать ваши диалоги и предлагать рекомендации для эффективного сотрудничества. Вся история нашего общения видна только вам.'
      );

      return thread;
    } catch (error) {
      console.error('Failed to get or create AI thread:', error);
      throw error;
    }
  }

  async getThreadMessages(threadId: string): Promise<AIChatMessage[]> {
    try {
      const { data, error } = await supabase
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
      const { data: profiles } = await supabase
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
    try {
      // Check if Supabase is configured
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
      
      if (!supabaseUrl || !supabaseKey || !supabaseUrl.includes('.supabase.co')) {
        throw new Error('Supabase не настроен. AI-анализ недоступен. Нажмите "Connect to Supabase" в правом верхнем углу.');
      }
      
      const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-chat-analysis`;
      
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request)
      });

      if (!response.ok) {
        throw new Error(`Edge function error: ${response.status}`);
      }

      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error || 'AI analysis failed');
      }

      return result.response;
    } catch (error) {
      console.error('Failed to call DeepSeek API:', error);
      
      // Handle specific error types
      if (error instanceof TypeError && error.message === 'Failed to fetch') {
        throw new Error('Не удалось подключиться к AI-сервису. Проверьте настройки Supabase или попробуйте позже.');
      }
      
      if (error instanceof Error) {
        throw error;
      }
      
      throw new Error('AI-анализ временно недоступен');
    }
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

      const { data, error } = await supabase
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

  async triggerAutoAnalysis(currentUserId: string, partnerId: string, chatMessages: ChatMessage[]): Promise<void> {
    try {
      // Only auto-analyze every 3 messages to avoid spam
      if (chatMessages.length % 3 !== 0) return;
      
      const thread = await this.getOrCreatePersonalThread(currentUserId);
      await this.analyzeConversationWithAI(thread.id, chatMessages, currentUserId, partnerId);
    } catch (error) {
      console.error('Failed to trigger auto analysis:', error);
      // Don't throw error for auto-analysis failures
    }
  }
}

export const aiChatService = new AIChatService();