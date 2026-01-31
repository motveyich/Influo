import { Injectable, Logger } from '@nestjs/common';
import { DeepSeekRequestDto, AIRequestType } from './dto';

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

  async processDeepSeekRequest(dto: DeepSeekRequestDto): Promise<{ response: string; cached: boolean }> {
    const cacheKey = this.generateCacheKey(dto);

    const cached = this.getFromCache(cacheKey);
    if (cached) {
      this.logger.log(`Cache hit for ${dto.type}`);
      return { response: cached, cached: true };
    }

    const apiKey = process.env.DEEPSEEK_API_KEY;
    if (!apiKey) {
      this.logger.warn('DeepSeek API key not configured');
      return {
        response: 'DeepSeek не настроен. Используйте локальные подсказки AI.',
        cached: false
      };
    }

    try {
      const prompt = this.buildPrompt(dto);
      const response = await this.callDeepSeek(prompt, apiKey);

      this.saveToCache(cacheKey, response);

      return { response, cached: false };
    } catch (error) {
      this.logger.error(`DeepSeek API error: ${error.message}`);
      throw new Error('Не удалось получить ответ от AI');
    }
  }

  private buildPrompt(dto: DeepSeekRequestDto): string {
    const lastMessages = dto.messages.slice(-12);
    const conversationText = lastMessages
      .map(m => `${m.senderId === dto.userId ? 'Я' : 'Собеседник'}: ${m.content}`)
      .join('\n');

    const systemPrompt = `Ты AI-помощник по деловым переговорам для платформы Influo (инфлюенсеры + рекламодатели).

Твоя роль: помогать договариваться практично и корректно. Не принимай решения за пользователя, только подсказывай.

Контекст последних сообщений:
${conversationText}

`;

    switch (dto.type) {
      case AIRequestType.SUMMARY:
        return systemPrompt + 'Сделай краткую сводку договоренностей: что уже согласовано, что нужно уточнить. Структурировано, 4-6 пунктов максимум.';

      case AIRequestType.RISKS:
        return systemPrompt + 'Укажи 2-3 возможных риска или недопонимания. Будь конкретным, но не пугай. Формат: список с краткими пояснениями.';

      case AIRequestType.IMPROVE_MESSAGE:
        return systemPrompt + `Пользователь хочет написать: "${dto.customPrompt}"\n\nУлучши формулировку: профессионально, но дружелюбно. Выведи ТОЛЬКО итоговый текст, без комментариев.`;

      case AIRequestType.SUGGEST_REPLY:
        return systemPrompt + 'Предложи 2-3 варианта ответа на последнее сообщение собеседника. Каждый вариант - 1-2 предложения. Нумерованный список.';

      case AIRequestType.SUGGEST_NEXT_STEPS:
        return systemPrompt + 'Что делать дальше для продвижения? 3 конкретных шага, каждый в 1 предложение. Нумерованный список.';

      default:
        return systemPrompt + (dto.customPrompt || 'Помоги разобраться');
    }
  }

  private async callDeepSeek(prompt: string, apiKey: string): Promise<string> {
    const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
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
        max_tokens: 500,
        temperature: 0.7,
        stream: false
      })
    });

    if (!response.ok) {
      throw new Error(`DeepSeek API returned ${response.status}`);
    }

    const data = await response.json();
    return data.choices[0]?.message?.content || 'Не удалось получить ответ';
  }

  private generateCacheKey(dto: DeepSeekRequestDto): string {
    const messagesHash = dto.messages
      .slice(-5)
      .map(m => m.content.substring(0, 50))
      .join('|');

    return `${dto.type}:${dto.conversationId}:${messagesHash}`;
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
}
