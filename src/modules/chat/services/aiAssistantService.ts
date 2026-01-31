import { apiClient } from '../../../core/api';
import { ChatMessage } from '../../../core/types';

export type AIRequestType = 'summary' | 'risks' | 'improve_message' | 'analyze_tone' | 'suggest_next_steps';

interface DeepSeekResponse {
  success: boolean;
  response: string;
  cached: boolean;
  message: string;
}

export class AIAssistantService {
  async requestDeepSeekAnalysis(
    type: AIRequestType,
    messages: ChatMessage[],
    conversationId: string,
    customPrompt?: string
  ): Promise<string> {
    try {
      const messageContext = messages.map(m => ({
        content: m.content,
        senderId: m.senderId,
        timestamp: m.createdAt
      }));

      const response = await apiClient.post<DeepSeekResponse>('/ai-assistant/deepseek', {
        type,
        messages: messageContext,
        conversationId,
        customPrompt
      });

      if (response.data.cached) {
        console.log('DeepSeek: Ответ из кэша');
      } else {
        console.log('DeepSeek: Новый запрос');
      }

      return response.data.response;
    } catch (error: any) {
      console.error('DeepSeek request failed:', error);
      throw new Error(error.response?.data?.message || 'Не удалось получить ответ от AI');
    }
  }

  async getSummary(messages: ChatMessage[], conversationId: string): Promise<string> {
    return this.requestDeepSeekAnalysis('summary', messages, conversationId);
  }

  async analyzeRisks(messages: ChatMessage[], conversationId: string): Promise<string> {
    return this.requestDeepSeekAnalysis('risks', messages, conversationId);
  }

  async improveMessage(messages: ChatMessage[], conversationId: string, messageToImprove: string): Promise<string> {
    return this.requestDeepSeekAnalysis('improve_message', messages, conversationId, messageToImprove);
  }

  async analyzeTone(messages: ChatMessage[], conversationId: string): Promise<string> {
    return this.requestDeepSeekAnalysis('analyze_tone', messages, conversationId);
  }

  async suggestNextSteps(messages: ChatMessage[], conversationId: string): Promise<string> {
    return this.requestDeepSeekAnalysis('suggest_next_steps', messages, conversationId);
  }
}

export const aiAssistantService = new AIAssistantService();
