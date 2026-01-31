import { Injectable, Logger } from '@nestjs/common';
import { DeepSeekRequestDto, AIRequestType } from './dto';
import { SupabaseService } from '../../shared/supabase/supabase.service';

interface CachedResponse {
  response: string;
  timestamp: number;
  expiresAt: number;
}

@Injectable()
export class AIAssistantService {
  private readonly logger = new Logger(AIAssistantService.name);
  private readonly cache = new Map<string, CachedResponse>();
  private readonly CACHE_TTL = 1000 * 60 * 30;

  constructor(private readonly supabaseService: SupabaseService) {}

  async processDeepSeekRequest(dto: DeepSeekRequestDto): Promise<{ response: string; cached: boolean }> {
    const cacheKey = this.generateCacheKey(dto);

    const cached = this.getFromCache(cacheKey);
    if (cached) {
      if (!cached || cached.trim().length === 0) {
        this.logger.warn(`Cache hit for ${dto.type} but value is empty, invalidating cache`);
        this.cache.delete(cacheKey);
      } else {
        this.logger.log(`Cache hit for ${dto.type} - Length: ${cached.length} characters`);
        return { response: cached, cached: true };
      }
    }

    const apiKey = process.env.DEEPSEEK_API_KEY;
    if (!apiKey) {
      this.logger.warn('DeepSeek API key not configured');
      return {
        response: 'DeepSeek не настроен.',
        cached: false
      };
    }

    this.logger.debug(`API Key present: ${apiKey ? 'Yes' : 'No'}, starts with: ${apiKey?.substring(0, 7)}...`);

    try {
      const relevantMessages = await this.getRelevantMessages(dto);
      const prompt = this.buildPrompt(dto, relevantMessages);
      const maxTokens = this.getMaxTokens(dto.type);

      this.logger.debug(`Requesting DeepSeek - Type: ${dto.type}, MaxTokens: ${maxTokens}, ConversationId: ${dto.conversationId}`);
      this.logger.debug(`Prompt length: ${prompt.length} characters, Messages used: ${relevantMessages.length}`);

      const response = await this.callDeepSeek(prompt, apiKey, maxTokens);

      if (!response || response.trim().length === 0) {
        this.logger.warn('DeepSeek returned empty response');
        throw new Error('DeepSeek вернул пустой ответ');
      }

      this.logger.log(`DeepSeek response received - Length: ${response.length} characters`);
      this.saveToCache(cacheKey, response);

      return { response, cached: false };
    } catch (error) {
      this.logger.error(`DeepSeek API error: ${error.message}`, error.stack);
      throw error;
    }
  }

  private getMaxTokens(type: AIRequestType): number {
    switch (type) {
      case AIRequestType.CHECK_MESSAGE: return 150;
      case AIRequestType.SUGGEST_REPLY: return 250;
      case AIRequestType.DIALOG_STATUS: return 400;
      default: return 300;
    }
  }

  private async getRelevantMessages(dto: DeepSeekRequestDto): Promise<any[]> {
    try {
      const [senderId, receiverId] = dto.conversationId.split('_');
      if (!senderId || !receiverId) {
        return this.getLimitedMessages(dto.messages, dto.type);
      }

      const supabase = this.supabaseService.getAdminClient();

      // Найти последнее активное сотрудничество (offer) между пользователями
      const { data: latestOffer } = await supabase
        .from('offers')
        .select('created_at')
        .or(`and(influencer_id.eq.${senderId},advertiser_id.eq.${receiverId}),and(influencer_id.eq.${receiverId},advertiser_id.eq.${senderId})`)
        .in('status', ['pending', 'counter', 'accepted', 'in_progress', 'pending_completion'])
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!latestOffer) {
        // Если нет активного offer, берем сообщения за последнюю неделю
        const oneWeekAgo = new Date();
        oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

        const messagesInLastWeek = dto.messages.filter(msg => {
          const msgDate = new Date(msg.timestamp);
          return msgDate >= oneWeekAgo;
        });

        return this.getLimitedMessages(messagesInLastWeek.length > 0 ? messagesInLastWeek : dto.messages, dto.type);
      }

      // Если есть offer, берем сообщения после даты создания offer
      const offerDate = new Date(latestOffer.created_at);
      const messagesAfterOffer = dto.messages.filter(msg => {
        const msgDate = new Date(msg.timestamp);
        return msgDate >= offerDate;
      });

      if (messagesAfterOffer.length === 0) {
        return this.getLimitedMessages(dto.messages, dto.type);
      }

      return this.getLimitedMessages(messagesAfterOffer, dto.type);
    } catch (error) {
      this.logger.error(`Error getting relevant messages: ${error.message}`);
      return this.getLimitedMessages(dto.messages, dto.type);
    }
  }

  private getLimitedMessages(messages: any[], type: AIRequestType): any[] {
    let limit: number;

    switch (type) {
      case AIRequestType.CHECK_MESSAGE:
        limit = 5;
        break;
      case AIRequestType.SUGGEST_REPLY:
        limit = 8;
        break;
      case AIRequestType.DIALOG_STATUS:
        limit = 20;
        break;
      default:
        limit = 10;
    }

    return messages.slice(-limit);
  }

  private buildPrompt(dto: DeepSeekRequestDto, messages: any[]): string {
    const conversationText = messages
      .map(m => `${m.senderId === dto.userId ? 'Я' : 'Собеседник'}: ${m.content}`)
      .join('\n');

    const basePrompt = `Ты AI-помощник для платформы Influo (инфлюенсеры + рекламодатели).

Твоя роль: помогать вести деловую переписку эффективно. Не принимай решения за пользователя, только подсказывай.

Контекст последних сообщений:
${conversationText}

`;

    switch (dto.type) {
      case AIRequestType.CHECK_MESSAGE:
        return basePrompt + `Пользователь хочет отправить: "${dto.customPrompt}"

Проверь это сообщение:
1. Подходит ли для делового общения?
2. Понятно ли, чего хочет пользователь?
3. Нет ли двусмысленностей, резкости или лишней воды?

Дай 2-4 коротких пункта обратной связи. Если нужно, предложи 1 улучшенный вариант.`;

      case AIRequestType.SUGGEST_REPLY:
        return basePrompt + `Предложи 3 варианта ответа на последнее сообщение собеседника:

1. Нейтральный вариант
2. Более деловой вариант
3. Более дружелюбный вариант

Каждый вариант должен быть кратким (1-2 предложения) и конкретным.`;

      case AIRequestType.DIALOG_STATUS:
        return basePrompt + `Проанализируй диалог и составь краткую структурированную выжимку:

**Текущий статус:**
— Краткое описание состояния диалога (1 строка)

**Уже обсуждали:**
— Список согласованных моментов

**Не договорились:**
— Список открытых вопросов

**Рекомендуется уточнить:**
— Что важно обсудить далее

Будь конкретным, не придумывай. Основывайся только на содержании диалога.`;

      default:
        return basePrompt + 'Помоги с этим запросом.';
    }
  }

  private async callDeepSeek(prompt: string, apiKey: string, maxTokens: number): Promise<string> {
    this.logger.debug('Calling DeepSeek API...');

    let response: Response;
    try {
      response = await fetch('https://api.deepseek.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: 'deepseek-chat',
          messages: [
            {
              role: 'user',
              content: prompt
            }
          ],
          max_tokens: maxTokens,
          temperature: 0.7,
          stream: false
        })
      });
    } catch (error) {
      this.logger.error(`Network error calling DeepSeek: ${error.message}`);
      throw new Error(`Ошибка сети при обращении к DeepSeek: ${error.message}`);
    }

    this.logger.debug(`DeepSeek response status: ${response.status} ${response.statusText}`);

    if (!response.ok) {
      let errorDetails = '';
      try {
        const errorData = await response.json();
        errorDetails = JSON.stringify(errorData);
        this.logger.error(`DeepSeek API error response: ${errorDetails}`);
      } catch (e) {
        const errorText = await response.text();
        errorDetails = errorText;
        this.logger.error(`DeepSeek API error text: ${errorText}`);
      }

      if (response.status === 401) {
        throw new Error('DeepSeek API: Неверный API ключ (401 Unauthorized)');
      } else if (response.status === 429) {
        throw new Error('DeepSeek API: Превышен лимит запросов (429 Too Many Requests)');
      } else if (response.status === 402) {
        throw new Error('DeepSeek API: Недостаточно средств на балансе (402 Payment Required)');
      } else {
        throw new Error(`DeepSeek API вернул ошибку ${response.status}: ${errorDetails}`);
      }
    }

    let data: any;
    try {
      data = await response.json();
      this.logger.debug(`DeepSeek response data structure: ${JSON.stringify(Object.keys(data))}`);
    } catch (error) {
      this.logger.error('Failed to parse DeepSeek response as JSON');
      throw new Error('Не удалось разобрать ответ от DeepSeek');
    }

    if (!data.choices || !Array.isArray(data.choices) || data.choices.length === 0) {
      this.logger.error(`Invalid response structure from DeepSeek: ${JSON.stringify(data)}`);
      throw new Error('DeepSeek вернул некорректную структуру ответа');
    }

    const content = data.choices[0]?.message?.content;
    if (!content) {
      this.logger.error(`No content in DeepSeek response: ${JSON.stringify(data.choices[0])}`);
      throw new Error('DeepSeek вернул пустой контент');
    }

    this.logger.debug(`Successfully extracted content from DeepSeek (length: ${content.length})`);
    return content.trim();
  }

  private generateCacheKey(dto: DeepSeekRequestDto): string {
    const messagesHash = dto.messages
      .slice(-5)
      .map(m => m.content.substring(0, 50))
      .join('|');

    const customPromptHash = dto.customPrompt ? dto.customPrompt.substring(0, 30) : '';
    return `${dto.type}:${dto.conversationId}:${customPromptHash}:${messagesHash}`;
  }

  private getFromCache(key: string): string | null {
    const cached = this.cache.get(key);
    if (!cached) return null;

    if (Date.now() > cached.expiresAt) {
      this.cache.delete(key);
      return null;
    }

    return cached.response;
  }

  private saveToCache(key: string, response: string): void {
    this.cache.set(key, {
      response,
      timestamp: Date.now(),
      expiresAt: Date.now() + this.CACHE_TTL
    });

    if (this.cache.size > 100) {
      const oldestKey = Array.from(this.cache.entries())
        .sort((a, b) => a[1].timestamp - b[1].timestamp)[0][0];
      this.cache.delete(oldestKey);
    }
  }

  getCacheStats(): { size: number; maxSize: number; ttl: number } {
    return {
      size: this.cache.size,
      maxSize: 100,
      ttl: this.CACHE_TTL
    };
  }

  clearCache(): void {
    const oldSize = this.cache.size;
    this.cache.clear();
    this.logger.log(`Cache cleared - Removed ${oldSize} entries`);
  }
}
