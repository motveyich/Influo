import { Injectable, Logger } from '@nestjs/common';
import { DeepSeekRequestDto, AIRequestType, DealStage } from './dto';
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
    if (!dto.dealStage) {
      dto.dealStage = await this.determineDealStage(dto.conversationId, dto.messages.length);
    }

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
        response: 'DeepSeek не настроен. Используйте локальные подсказки AI.',
        cached: false
      };
    }

    this.logger.debug(`API Key present: ${apiKey ? 'Yes' : 'No'}, starts with: ${apiKey?.substring(0, 7)}...`);

    try {
      const prompt = this.buildPrompt(dto);
      const maxTokens = this.getMaxTokens(dto.type);

      this.logger.debug(`Requesting DeepSeek - Type: ${dto.type}, MaxTokens: ${maxTokens}, ConversationId: ${dto.conversationId}`);
      this.logger.debug(`Prompt length: ${prompt.length} characters`);

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
      case AIRequestType.IMPROVE_MESSAGE: return 200;
      case AIRequestType.FORMULATE_NEUTRAL: return 200;
      case AIRequestType.SUGGEST_REPLY: return 250;
      case AIRequestType.SUGGEST_FIRST_MESSAGE: return 300;
      case AIRequestType.RISKS: return 300;
      case AIRequestType.CHECKLIST: return 350;
      case AIRequestType.SUMMARY: return 400;
      case AIRequestType.REVIEW_HELP: return 400;
      case AIRequestType.SUGGEST_NEXT_STEPS: return 250;
      default: return 500;
    }
  }

  private async determineDealStage(conversationId: string, messageCount: number): Promise<DealStage> {
    try {
      const [senderId, receiverId] = conversationId.split('_');
      if (!senderId || !receiverId) {
        return DealStage.UNKNOWN;
      }

      const supabase = this.supabaseService.getClient();
      const { data: offer } = await supabase
        .from('offers')
        .select('status, created_at')
        .or(`and(influencer_id.eq.${senderId},advertiser_id.eq.${receiverId}),and(influencer_id.eq.${receiverId},advertiser_id.eq.${senderId})`)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!offer) {
        return messageCount <= 5 ? DealStage.PRE_CONTACT : DealStage.INITIAL_CONTACT;
      }

      switch (offer.status) {
        case 'pending':
        case 'counter':
          return DealStage.NEGOTIATION;
        case 'accepted':
          return DealStage.DECISION;
        case 'in_progress':
          return DealStage.COLLABORATION;
        case 'pending_completion':
          return DealStage.NEAR_COMPLETION;
        case 'completed':
          return DealStage.COMPLETION;
        default:
          return DealStage.UNKNOWN;
      }
    } catch (error) {
      this.logger.error(`Error determining deal stage: ${error.message}`);
      return DealStage.UNKNOWN;
    }
  }

  private getMessageLimit(stage: DealStage): number {
    switch (stage) {
      case DealStage.PRE_CONTACT: return 5;
      case DealStage.INITIAL_CONTACT: return 8;
      case DealStage.NEGOTIATION: return 12;
      case DealStage.DECISION: return 10;
      case DealStage.COLLABORATION: return 10;
      case DealStage.NEAR_COMPLETION: return 8;
      case DealStage.COMPLETION: return 5;
      default: return 10;
    }
  }

  private getStageContext(stage: DealStage): string {
    switch (stage) {
      case DealStage.PRE_CONTACT:
        return 'Этап: первый контакт. Пользователь только начинает общение.';
      case DealStage.INITIAL_CONTACT:
        return 'Этап: начало диалога. Стороны знакомятся и выясняют возможность сотрудничества.';
      case DealStage.NEGOTIATION:
        return 'Этап: обсуждение условий. Стороны обсуждают детали сотрудничества (цена, сроки, формат).';
      case DealStage.DECISION:
        return 'Этап: принятие решения. Условия согласованы, нужно финализировать договоренности.';
      case DealStage.COLLABORATION:
        return 'Этап: сотрудничество в процессе. Работа началась, идет выполнение условий.';
      case DealStage.NEAR_COMPLETION:
        return 'Этап: близится завершение. Работа почти завершена, обсуждается финализация.';
      case DealStage.COMPLETION:
        return 'Этап: завершение сделки. Работа завершена, время для отзывов и подведения итогов.';
      default:
        return 'Этап: не определен.';
    }
  }

  private buildPrompt(dto: DeepSeekRequestDto): string {
    const dealStage = dto.dealStage ?? DealStage.UNKNOWN;
    const messageLimit = this.getMessageLimit(dealStage);
    const lastMessages = dto.messages.slice(-messageLimit);
    const conversationText = lastMessages
      .map(m => `${m.senderId === dto.userId ? 'Я' : 'Собеседник'}: ${m.content}`)
      .join('\n');

    const stageContext = this.getStageContext(dealStage);

    const systemPrompt = `Ты AI-помощник сделки для платформы Influo (инфлюенсеры + рекламодатели).

Твоя роль: помогать договариваться практично и корректно. Не принимай решения за пользователя, только подсказывай.

${stageContext}

Контекст последних сообщений:
${conversationText}

`;

    switch (dto.type) {
      case AIRequestType.SUMMARY:
        return systemPrompt + 'Сделай краткую сводку договоренностей: что уже согласовано, что нужно уточнить. Структурировано, 4-6 пунктов максимум.';

      case AIRequestType.RISKS:
        return systemPrompt + 'Укажи 2-3 возможных риска или недопонимания в этих договоренностях. Будь конкретным, но не пугай. Формат: список с краткими пояснениями.';

      case AIRequestType.IMPROVE_MESSAGE:
        return systemPrompt + `Пользователь хочет написать: "${dto.customPrompt}"\n\nУлучши формулировку с учетом текущего этапа: профессионально, но дружелюбно. Выведи ТОЛЬКО итоговый текст, без комментариев.`;

      case AIRequestType.SUGGEST_REPLY:
        return systemPrompt + 'Предложи 2-3 варианта ответа на последнее сообщение собеседника. Каждый вариант - 1-2 предложения. Нумерованный список.';

      case AIRequestType.SUGGEST_NEXT_STEPS:
        return systemPrompt + 'Что делать дальше для продвижения на этом этапе? 3 конкретных шага, каждый в 1 предложение. Нумерованный список.';

      case AIRequestType.CHECK_MESSAGE:
        return systemPrompt + `Пользователь собирается отправить: "${dto.customPrompt}"\n\nПроверь сообщение: понятно ли, вежливо ли, есть ли конкретика? Укажи 1-2 совета по улучшению или подтверди что все хорошо.`;

      case AIRequestType.SUGGEST_FIRST_MESSAGE:
        return systemPrompt + 'Предложи 3 варианта первого сообщения для начала контакта. Каждый должен включать: представление, цель обращения, конкретный вопрос. По 2-3 предложения каждый. Нумерованный список.';

      case AIRequestType.CHECKLIST:
        return systemPrompt + 'Создай чеклист для текущего этапа: что важно проверить/уточнить перед переходом к следующему шагу. 5-6 пунктов.';

      case AIRequestType.FORMULATE_NEUTRAL:
        return systemPrompt + `Пользователь хочет сказать: "${dto.customPrompt}"\n\nПерефразируй это нейтрально и конструктивно для разрешения спорной ситуации. Выведи ТОЛЬКО итоговый текст.`;

      case AIRequestType.REVIEW_HELP:
        return systemPrompt + 'Помоги сформулировать конструктивный отзыв о завершенном сотрудничестве. Предложи структуру: что получилось хорошо, что можно улучшить, общая оценка. 3-4 пункта.';

      default:
        return systemPrompt + (dto.customPrompt || 'Помоги разобраться');
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

    const dealStage = dto.dealStage ?? DealStage.UNKNOWN;
    return `${dto.type}:${dto.conversationId}:${dealStage}:${messagesHash}`;
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
