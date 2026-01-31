import { apiClient } from '../../../core/api';
import { ChatMessage } from '../../../core/types';

export type AIRequestType =
  | 'check_message'
  | 'suggest_reply'
  | 'dialog_status';

interface DeepSeekResponse {
  success: boolean;
  response: string;
  cached: boolean;
  message: string;
}

export class AIAssistantService {
  private async requestDeepSeekAnalysis(
    type: AIRequestType,
    messages: ChatMessage[],
    conversationId: string,
    customPrompt?: string
  ): Promise<string> {
    try {
      const messageContext = messages.map(m => ({
        content: m.messageContent || '',
        senderId: m.senderId,
        timestamp: m.timestamp
      }));

      console.log(`[AI] Sending request - Type: ${type}, Messages: ${messageContext.length}`);

      const response = await apiClient.post<DeepSeekResponse>('/ai-assistant/deepseek', {
        type,
        messages: messageContext,
        conversationId,
        customPrompt
      });

      console.log('[AI] Response received:', {
        hasResponse: !!response,
        cached: response.cached,
        responseLength: response.response?.length,
        responsePreview: response.response?.substring(0, 100)
      });

      if (!response || !response.response) {
        console.error('[AI] Invalid response structure:', response);
        throw new Error('AI вернул некорректный ответ');
      }

      if (response.cached) {
        console.log('[AI] ✅ Ответ из кэша');
      } else {
        console.log('[AI] ✅ Новый запрос к DeepSeek');
      }

      return response.response;
    } catch (error: any) {
      console.error('[AI] ❌ Request failed:', {
        message: error.message,
        status: error.status,
        error
      });

      if (error.message?.includes('DeepSeek не настроен')) {
        throw new Error('DeepSeek API не настроен. Пожалуйста, добавьте API ключ в настройках.');
      }

      if (error.message?.includes('401') || error.message?.includes('API ключ')) {
        throw new Error('Неверный API ключ DeepSeek. Проверьте настройки.');
      }

      if (error.message?.includes('429')) {
        throw new Error('Превышен лимит запросов к AI. Попробуйте позже.');
      }

      if (error.message?.includes('402')) {
        throw new Error('Недостаточно средств на балансе DeepSeek.');
      }

      throw new Error(error.message || 'Не удалось получить ответ от AI. Проверьте подключение.');
    }
  }

  async checkMessage(messages: ChatMessage[], conversationId: string, messageText: string): Promise<string> {
    return this.requestDeepSeekAnalysis('check_message', messages, conversationId, messageText);
  }

  async suggestReply(messages: ChatMessage[], conversationId: string): Promise<string> {
    return this.requestDeepSeekAnalysis('suggest_reply', messages, conversationId);
  }

  async getDialogStatus(messages: ChatMessage[], conversationId: string): Promise<string> {
    return this.requestDeepSeekAnalysis('dialog_status', messages, conversationId);
  }

  async testConnection(): Promise<{ configured: boolean; message: string; success: boolean }> {
    try {
      console.log('[AI] Testing DeepSeek connection...');
      const response = await apiClient.get<{ configured: boolean; message: string; success: boolean }>(
        '/ai-assistant/test-connection'
      );

      console.log('[AI] Connection test result:', response);
      return response;
    } catch (error: any) {
      console.error('[AI] Connection test failed:', error);
      return {
        configured: false,
        success: false,
        message: 'Не удалось проверить подключение к AI'
      };
    }
  }
}

export const aiAssistantService = new AIAssistantService();
