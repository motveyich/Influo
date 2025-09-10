import { useState, useEffect } from 'react';
import { AIChatThread, AIChatMessage, ChatMessage } from '../../../core/types';
import { aiChatService } from '../../../services/aiChatService';

export function useAIChat(user1Id: string, user2Id: string) {
  const [thread, setThread] = useState<AIChatThread | null>(null);
  const [messages, setMessages] = useState<AIChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (user1Id && user2Id) {
      initializeThread();
    }
  }, [user1Id, user2Id]);

  const initializeThread = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const aiThread = await aiChatService.getOrCreateThread(user1Id, user2Id);
      setThread(aiThread);
      
      const threadMessages = await aiChatService.getThreadMessages(aiThread.id);
      setMessages(threadMessages);
    } catch (err: any) {
      console.error('Failed to initialize AI thread:', err);
      setError(err.message || 'Failed to initialize AI chat');
    } finally {
      setIsLoading(false);
    }
  };

  const sendQuestion = async (question: string): Promise<AIChatMessage | null> => {
    if (!thread) return null;

    try {
      setIsLoading(true);
      const response = await aiChatService.sendUserQuestion(thread.id, question, user1Id);
      
      // Reload messages to get the latest
      const updatedMessages = await aiChatService.getThreadMessages(thread.id);
      setMessages(updatedMessages);
      
      return response;
    } catch (err: any) {
      console.error('Failed to send question:', err);
      
      // Show user-friendly error messages
      if (err.message.includes('Supabase не настроен')) {
        setError('AI-анализ недоступен: требуется настройка Supabase');
      } else if (err.message.includes('Не удалось подключиться к AI-сервису')) {
        setError('AI-сервис временно недоступен');
      } else {
        setError(err.message || 'Failed to send question');
      }
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  const analyzeConversation = async (conversationMessages: ChatMessage[]): Promise<void> => {
    if (!thread) return;

    try {
      const analysisMessage = await aiChatService.analyzeConversation(thread.id, conversationMessages);
      
      if (analysisMessage) {
        setMessages(prev => [...prev, analysisMessage]);
      }
    } catch (err: any) {
      console.error('Failed to analyze conversation:', err);
      // Don't set error for analysis failures as they're not critical
    }
  };

  const refresh = async () => {
    if (thread) {
      try {
        const updatedMessages = await aiChatService.getThreadMessages(thread.id);
        setMessages(updatedMessages);
      } catch (err: any) {
        console.error('Failed to refresh AI messages:', err);
        setError(err.message || 'Failed to refresh messages');
      }
    }
  };

  return {
    thread,
    messages,
    isLoading,
    error,
    sendQuestion,
    analyzeConversation,
    refresh
  };
}