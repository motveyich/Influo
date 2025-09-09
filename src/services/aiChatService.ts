import { supabase, TABLES } from '../core/supabase';
import { AIChatThread, AIChatMessage, AIAnalysisResult, ChatMessage } from '../core/types';
import { analytics } from '../core/analytics';

export class AIChatService {
  private rateLimitMap = new Map<string, { count: number; resetTime: number }>();
  private readonly RATE_LIMIT_MAX = 10; // requests per hour
  private readonly RATE_LIMIT_WINDOW = 3600000; // 1 hour
  private analysisCache = new Map<string, { result: AIAnalysisResult; timestamp: number }>();
  private readonly CACHE_DURATION = 300000; // 5 minutes

  async getOrCreateThread(user1Id: string, user2Id: string): Promise<AIChatThread> {
    try {
      // Create consistent conversation ID regardless of user order
      const conversationId = [user1Id, user2Id].sort().join('_');
      
      // Try to get existing thread
      const { data: existingThread, error: fetchError } = await supabase
        .from(TABLES.AI_CHAT_THREADS)
        .select('*')
        .eq('conversation_id', conversationId)
        .maybeSingle();

      if (fetchError) throw fetchError;

      if (existingThread) {
        return this.transformThreadFromDatabase(existingThread);
      }

      // Create new thread
      const newThread = {
        conversation_id: conversationId,
        user1_id: user1Id,
        user2_id: user2Id,
        metadata: {},
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

      // Send welcome message from AI
      await this.sendAIMessage(thread.id, 'ai_response', 
        'Привет! Я ваш AI-помощник. Я буду анализировать ваш диалог и предлагать полезные рекомендации для эффективного общения. Задавайте вопросы, если нужна помощь!',
        { analysisType: 'welcome', confidence: 1.0 }
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
        .order('created_at', { ascending: true });

      if (error) throw error;

      return data.map(message => this.transformMessageFromDatabase(message));
    } catch (error) {
      console.error('Failed to get thread messages:', error);
      throw error;
    }
  }

  async sendUserQuestion(threadId: string, question: string, userId: string): Promise<AIChatMessage> {
    try {
      // Check rate limit
      if (!this.checkRateLimit(userId)) {
        throw new Error('Слишком много запросов к AI. Попробуйте позже.');
      }

      // Get user roles and conversation history
      const { userRoles, conversationHistory } = await this.getConversationContext(threadId);

      // Save user question
      const userMessage = await this.sendAIMessage(threadId, 'user_question', question, {
        userId: userId
      });

      // Generate AI response
      const aiResponse = await this.generateAIResponse(threadId, question, conversationHistory, userRoles);
      
      // Save AI response
      const aiMessage = await this.sendAIMessage(threadId, 'ai_response', aiResponse.content, aiResponse.metadata);

      return aiMessage;
    } catch (error) {
      console.error('Failed to send user question:', error);
      throw error;
    }
  }

  async analyzeConversation(threadId: string, messages: ChatMessage[]): Promise<AIChatMessage | null> {
    try {
      if (messages.length === 0) return null;

      // Only analyze if we have enough messages and haven't analyzed recently
      if (messages.length < 2) return null;
      
      // Check cache to avoid duplicate analysis
      const cacheKey = `${threadId}_${messages.length}`;
      const cached = this.analysisCache.get(cacheKey);
      if (cached && Date.now() - cached.timestamp < this.CACHE_DURATION) {
        return null;
      }

      // Get user roles for context
      const { userRoles } = await this.getConversationContext(threadId);
      
      // Analyze conversation
      const analysis = await this.performConversationAnalysis(messages, userRoles);
      
      // Cache result
      this.analysisCache.set(cacheKey, {
        result: analysis,
        timestamp: Date.now()
      });

      // Send analysis message
      const analysisMessage = await this.sendAIMessage(
        threadId, 
        'ai_analysis', 
        this.formatAnalysisMessage(analysis),
        {
          analysisType: 'conversation_flow',
          confidence: analysis.confidence,
          conversationStatus: analysis.conversationStatus,
          suggestedActions: analysis.nextSteps
        }
      );

      return analysisMessage;
    } catch (error) {
      console.error('Failed to analyze conversation:', error);
      return null; // Don't throw error for analysis failures
    }
  }

  private async sendAIMessage(
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
        metadata: metadata,
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
      console.error('Failed to send AI message:', error);
      throw error;
    }
  }

  async getConversationContext(threadId: string): Promise<{ userRoles: { user1: string; user2: string }; conversationHistory: ChatMessage[] }> {
    try {
      // Get thread info to identify users
      const { data: thread } = await supabase
        .from(TABLES.AI_CHAT_THREADS)
        .select('user1_id, user2_id')
        .eq('id', threadId)
        .single();
      
      if (!thread) throw new Error('Thread not found');
      
      // Get user profiles to determine roles
      const { data: profiles } = await supabase
        .from(TABLES.USER_PROFILES)
        .select('user_id, full_name, user_type')
        .in('user_id', [thread.user1_id, thread.user2_id]);
      
      const user1Profile = profiles?.find(p => p.user_id === thread.user1_id);
      const user2Profile = profiles?.find(p => p.user_id === thread.user2_id);
      
      // Get conversation messages (last 15 messages)
      const { data: messages } = await supabase
        .from(TABLES.CHAT_MESSAGES)
        .select('*')
        .or(`and(sender_id.eq.${thread.user1_id},receiver_id.eq.${thread.user2_id}),and(sender_id.eq.${thread.user2_id},receiver_id.eq.${thread.user1_id})`)
        .order('timestamp', { ascending: false })
        .limit(15);
      
      const conversationHistory = (messages || [])
        .reverse()
        .map(msg => ({
          id: msg.id,
          senderId: msg.sender_id,
          receiverId: msg.receiver_id,
          messageContent: msg.message_content,
          messageType: msg.message_type,
          timestamp: msg.timestamp,
          isRead: msg.is_read,
          metadata: msg.metadata || {}
        }));
      
      return {
        userRoles: {
          user1: user1Profile?.user_type || 'пользователь',
          user2: user2Profile?.user_type || 'пользователь'
        },
        conversationHistory
      };
    } catch (error) {
      console.error('Failed to get conversation context:', error);
      return {
        userRoles: { user1: 'пользователь', user2: 'пользователь' },
        conversationHistory: []
      };
    }
  }

  private async generateAIResponse(
    threadId: string, 
    question: string, 
    conversationHistory: ChatMessage[],
    userRoles: { user1: string; user2: string }
  ): Promise<{ content: string; metadata: Record<string, any> }> {
    try {
      // Get conversation context
      const messages = await this.getThreadMessages(threadId);
      
      // Build comprehensive context
      const historyContext = conversationHistory.length > 0 
        ? conversationHistory.map(msg => {
            const role = msg.senderId === threadId ? userRoles.user1 : userRoles.user2;
            return `${role}: ${msg.messageContent}`;
          }).join('\n')
        : 'Диалог только начался';
      
      const aiContext = messages.slice(-5).map(m => `${m.messageType}: ${m.content}`).join('\n');

      // Simulate AI response (in real implementation, call OpenAI API)
      const response = await this.callAIService(question, historyContext, userRoles);
      
      return {
        content: response.content,
        metadata: {
          confidence: response.confidence,
          analysisType: 'user_question',
          suggestedActions: response.suggestions
        }
      };
    } catch (error) {
      console.error('Failed to generate AI response:', error);
      return {
        content: 'Извините, произошла ошибка при обработке вашего вопроса. Попробуйте переформулировать или задать вопрос позже.',
        metadata: { error: true }
      };
    }
  }

  private async performConversationAnalysis(messages: ChatMessage[], userRoles?: { user1: string; user2: string }): Promise<AIAnalysisResult> {
    try {
      // Get recent messages for analysis
      const recentMessages = messages.slice(-10); // Увеличиваем до 10 последних сообщений
      
      // Format messages with roles for better analysis
      const formattedMessages = recentMessages.map(msg => {
        const senderRole = userRoles ? 
          (userRoles.user1 === 'influencer' ? 'Инфлюенсер' : 'Рекламодатель') + ' (' + msg.senderId.substring(0, 8) + ')' :
          'Пользователь (' + msg.senderId.substring(0, 8) + ')';
        return `${senderRole}: ${msg.messageContent}`;
      });

      // Simulate AI analysis (in real implementation, call OpenAI API)
      const analysis = await this.callAIAnalysis(formattedMessages, userRoles);
      
      return analysis;
    } catch (error) {
      console.error('Failed to perform conversation analysis:', error);
      return {
        conversationStatus: 'neutral',
        sentiment: 'neutral',
        suggestions: [],
        nextSteps: [],
        confidence: 0
      };
    }
  }

  private async callAIService(
    question: string, 
    conversationHistory: string, 
    userRoles: { user1: string; user2: string }
  ): Promise<{ content: string; confidence: number; suggestions: string[] }> {
    try {
      // Call OpenAI API for real analysis
      const response = await fetch('/api/ai-chat-analysis', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          question,
          conversationHistory,
          userRoles,
          type: 'user_question'
        })
      });

      if (!response.ok) {
        throw new Error('AI service unavailable');
      }

      const result = await response.json();
      return result;
    } catch (error) {
      console.warn('AI service failed, using fallback response:', error);
      
      // Intelligent fallback based on question content
      const questionLower = question.toLowerCase();
      
      if (questionLower.includes('бюджет') || questionLower.includes('цена') || questionLower.includes('стоимость')) {
        return {
          content: 'Вопрос о бюджете важен для успешного сотрудничества. Рекомендую обсудить диапазон цен и условия оплаты открыто.',
          confidence: 0.8,
          suggestions: ['Уточните бюджет', 'Обсудите условия оплаты', 'Предложите варианты']
        };
      } else if (questionLower.includes('сроки') || questionLower.includes('время') || questionLower.includes('дедлайн')) {
        return {
          content: 'Четкие временные рамки помогают избежать недопониманий. Обсудите реалистичные сроки с учетом качества работы.',
          confidence: 0.8,
          suggestions: ['Установите дедлайны', 'Обсудите этапы', 'Согласуйте график']
        };
      } else if (questionLower.includes('портфолио') || questionLower.includes('примеры') || questionLower.includes('работы')) {
        return {
          content: 'Демонстрация портфолио повышает доверие. Покажите релевантные примеры работ и объясните подход к проектам.',
          confidence: 0.8,
          suggestions: ['Покажите портфолио', 'Расскажите о подходе', 'Поделитесь кейсами']
        };
      } else {
        return {
          content: 'Для эффективного сотрудничества важно открытое общение. Задавайте вопросы, делитесь ожиданиями и будьте честными.',
          confidence: 0.7,
          suggestions: ['Задайте уточняющие вопросы', 'Поделитесь ожиданиями', 'Обсудите детали']
        };
      }
    }
  }

  private async callAIAnalysis(
    formattedMessages: string[], 
    userRoles?: { user1: string; user2: string }
  ): Promise<AIAnalysisResult> {
    try {
      // Call real AI analysis service
      const response = await fetch('/api/ai-chat-analysis', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          formattedMessages,
          userRoles,
          analysisType: 'conversation_flow'
        })
      });

      if (!response.ok) {
        throw new Error('AI analysis service unavailable');
      }

      const result = await response.json();
      return result;
    } catch (error) {
      console.warn('AI analysis failed, using intelligent fallback:', error);
      
      // Intelligent analysis based on conversation content
      const text = formattedMessages.join('\n').toLowerCase();
      
      // Analyze keywords and patterns
      const positiveWords = ['спасибо', 'отлично', 'согласен', 'хорошо', 'интересно', 'подходит', 'да', 'понятно'];
      const negativeWords = ['нет', 'не подходит', 'проблема', 'сложно', 'невозможно', 'не согласен', 'отказ'];
      const businessWords = ['бюджет', 'сроки', 'условия', 'договор', 'оплата', 'встреча', 'проект', 'работа'];
      const questionWords = ['как', 'что', 'когда', 'где', 'почему', 'можно', 'возможно', '?'];
      
      const positiveCount = positiveWords.filter(word => text.includes(word)).length;
      const negativeCount = negativeWords.filter(word => text.includes(word)).length;
      const businessCount = businessWords.filter(word => text.includes(word)).length;
      const questionCount = questionWords.filter(word => text.includes(word)).length;
      
      let conversationStatus: 'constructive' | 'neutral' | 'concerning' = 'neutral';
      let sentiment: 'positive' | 'neutral' | 'negative' = 'neutral';
      let suggestions: string[] = [];
      let nextSteps: string[] = [];
      let riskFactors: string[] = [];
      
      // Add role-specific analysis
      const roleContext = userRoles ? 
        `Диалог между ${userRoles.user1} и ${userRoles.user2}` : 
        'Диалог между участниками';
      
      // Determine status based on analysis
      if (positiveCount > negativeCount && businessCount > 0) {
        conversationStatus = 'constructive';
        sentiment = 'positive';
        suggestions = [
          roleContext,
          'Диалог развивается позитивно',
          'Обе стороны проявляют заинтересованность',
          'Обсуждаются деловые вопросы'
        ];
        nextSteps = [
          'Переходите к конкретным деталям',
          'Обсудите следующие шаги',
          'Зафиксируйте договоренности'
        ];
      } else if (negativeCount > positiveCount) {
        conversationStatus = 'concerning';
        sentiment = 'negative';
        suggestions = [
          roleContext,
          'Возможны разногласия в ожиданиях',
          'Стоит прояснить спорные моменты'
        ];
        nextSteps = [
          'Уточните требования',
          'Найдите компромисс',
          'Обратитесь к модератору при необходимости'
        ];
        riskFactors = ['Потенциальное недопонимание', 'Разные ожидания'];
      } else if (questionCount > 2) {
        conversationStatus = 'neutral';
        suggestions = [
          roleContext,
          'Активно задаются вопросы',
          'Стороны изучают возможности'
        ];
        nextSteps = [
          'Предоставьте подробные ответы',
          'Покажите примеры работ',
          'Уточните детали проекта'
        ];
      } else {
        suggestions = [roleContext, 'Диалог в начальной стадии'];
        nextSteps = ['Расскажите больше о себе', 'Задайте вопросы партнеру'];
      }
      
      return {
        conversationStatus,
        sentiment,
        suggestions,
        nextSteps,
        confidence: Math.min(0.9, 0.5 + (businessCount * 0.1) + (Math.abs(positiveCount - negativeCount) * 0.05) + (formattedMessages.length * 0.02)),
        riskFactors: riskFactors.length > 0 ? riskFactors : undefined
      };
    }
  }

  private formatAnalysisMessage(analysis: AIAnalysisResult): string {
    let message = '';

    // Status
    if (analysis.conversationStatus === 'constructive') {
      message += '✅ Диалог развивается конструктивно\n\n';
    } else if (analysis.conversationStatus === 'concerning') {
      message += '⚠️ Обнаружены потенциальные проблемы\n\n';
    } else {
      message += 'ℹ️ Диалог в нейтральной стадии\n\n';
    }

    // Suggestions
    if (analysis.suggestions.length > 0) {
      message += '💡 Наблюдения:\n';
      analysis.suggestions.forEach(suggestion => {
        message += `• ${suggestion}\n`;
      });
      message += '\n';
    }

    // Next steps
    if (analysis.nextSteps.length > 0) {
      message += '🎯 Рекомендации:\n';
      analysis.nextSteps.forEach(step => {
        message += `• ${step}\n`;
      });
      message += '\n';
    }

    // Risk factors
    if (analysis.riskFactors && analysis.riskFactors.length > 0) {
      message += '⚠️ Факторы риска:\n';
      analysis.riskFactors.forEach(risk => {
        message += `• ${risk}\n`;
      });
    }

    return message.trim();
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

  // Public method for external analysis triggers
  async triggerConversationAnalysis(user1Id: string, user2Id: string, messages: ChatMessage[]): Promise<void> {
    try {
      const thread = await this.getOrCreateThread(user1Id, user2Id);
      await this.analyzeConversation(thread.id, messages);
    } catch (error) {
      console.error('Failed to trigger conversation analysis:', error);
    }
  }

  // Track analytics
  private trackAIInteraction(type: string, userId: string, metadata: Record<string, any> = {}) {
    analytics.track('ai_chat_interaction', {
      interaction_type: type,
      user_id: userId,
      ...metadata
    });
  }
}

export const aiChatService = new AIChatService();