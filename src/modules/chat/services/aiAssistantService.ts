import { apiClient } from '../../../core/api';
import { ChatMessage } from '../../../core/types';

export type AIRequestType =
  | 'summary'
  | 'risks'
  | 'improve_message'
  | 'suggest_reply'
  | 'suggest_next_steps'
  | 'check_message'
  | 'suggest_first_message'
  | 'checklist'
  | 'formulate_neutral'
  | 'review_help';

export type DealStage =
  | 'pre_contact'
  | 'initial_contact'
  | 'negotiation'
  | 'decision'
  | 'collaboration'
  | 'near_completion'
  | 'completion'
  | 'unknown';

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
    customPrompt?: string,
    dealStage?: DealStage
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
        customPrompt,
        dealStage
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

  async suggestReply(messages: ChatMessage[], conversationId: string): Promise<string> {
    return this.requestDeepSeekAnalysis('suggest_reply', messages, conversationId);
  }

  async suggestNextSteps(messages: ChatMessage[], conversationId: string): Promise<string> {
    return this.requestDeepSeekAnalysis('suggest_next_steps', messages, conversationId);
  }

  async checkMessage(messages: ChatMessage[], conversationId: string, messageText: string): Promise<string> {
    return this.requestDeepSeekAnalysis('check_message', messages, conversationId, messageText);
  }

  async suggestFirstMessage(messages: ChatMessage[], conversationId: string): Promise<string> {
    return this.requestDeepSeekAnalysis('suggest_first_message', messages, conversationId);
  }

  async getChecklist(messages: ChatMessage[], conversationId: string): Promise<string> {
    return this.requestDeepSeekAnalysis('checklist', messages, conversationId);
  }

  async formulateNeutral(messages: ChatMessage[], conversationId: string, messageText: string): Promise<string> {
    return this.requestDeepSeekAnalysis('formulate_neutral', messages, conversationId, messageText);
  }

  async getReviewHelp(messages: ChatMessage[], conversationId: string): Promise<string> {
    return this.requestDeepSeekAnalysis('review_help', messages, conversationId);
  }
}

export const aiAssistantService = new AIAssistantService();
