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

      const response = await apiClient.post<DeepSeekResponse>('/ai-assistant/deepseek', {
        type,
        messages: messageContext,
        conversationId,
        customPrompt
      });

      if (response.data.cached) {
        console.log('AI: Ответ из кэша');
      } else {
        console.log('AI: Новый запрос');
      }

      return response.data.response;
    } catch (error: any) {
      console.error('AI request failed:', error);
      throw new Error(error.response?.data?.message || 'Не удалось получить ответ от AI');
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
}

export const aiAssistantService = new AIAssistantService();
