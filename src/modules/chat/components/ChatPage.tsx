import React, { useState, useEffect, useRef } from 'react';
import { ChatMessage } from '../../../core/types';
import { Send, Search, MessageCircle, Handshake, AlertTriangle, UserX, UserCheck, Shield } from 'lucide-react';
import { realtimeService } from '../../../core/realtime';
import { chatService } from '../services/chatService';
import { CollaborationRequestModal } from './CollaborationRequestModal';
import { AIChatPanel } from './AIChatPanel';
import { MessageBubble } from './MessageBubble';
import { useAuth } from '../../../hooks/useAuth';
import { useTranslation } from '../../../hooks/useTranslation';
import { useProfileCompletion } from '../../profiles/hooks/useProfileCompletion';
import { analytics } from '../../../core/analytics';
import { formatDistanceToNow, parseISO, format } from 'date-fns';
import { supabase } from '../../../core/supabase';
import toast from 'react-hot-toast';

interface Conversation {
  id: string;
  participantId: string;
  participantName: string;
  participantAvatar?: string;
  lastMessage?: ChatMessage;
  unreadCount: number;
  isOnline: boolean;
  chatType: 'main' | 'new' | 'restricted';
  canSendMessage: boolean;
  isBlocked: boolean;
  initiatedBy?: string;
  hasReceiverResponded: boolean;
}

type ChatTab = 'main' | 'new' | 'restricted';

export function ChatPage() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<ChatTab>('main');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [showCollaborationModal, setShowCollaborationModal] = useState(false);
  const [rateLimitWarning, setRateLimitWarning] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'connecting' | 'disconnected'>('connected');
  const [blockedUsers, setBlockedUsers] = useState<Set<string>>(new Set());
  const [showAIPanel, setShowAIPanel] = useState(true);
  
  const { user, loading } = useAuth();
  const { t } = useTranslation();
  const currentUserId = user?.id || '';
  const { profile: currentUserProfile } = useProfileCompletion(currentUserId);
  const [targetUserId, setTargetUserId] = useState<string | null>(null);

  useEffect(() => {
    // Check for userId parameter in URL
    const urlParams = new URLSearchParams(window.location.search);
    const userIdParam = urlParams.get('userId');
    if (userIdParam) {
      setTargetUserId(userIdParam);
      // Clear the URL parameter
      window.history.replaceState({}, '', '/chat');
    }
    
    if (currentUserId && !loading) {
      loadConversations();
      loadBlockedUsers();
    }
    
    // Subscribe to real-time chat messages
    if (currentUserId) {
      const subscription = realtimeService.subscribeToChatMessages(
        currentUserId,
        handleNewMessage
      );

      return () => {
        realtimeService.unsubscribe(`chat_${currentUserId}`);
      };
    }
  }, [currentUserId, loading]);

  useEffect(() => {
    if (selectedConversation && currentUserId) {
      loadMessages(selectedConversation.id);
      // Mark messages as read when conversation is selected
      markConversationAsRead(selectedConversation.participantId);
    }
  }, [selectedConversation, currentUserId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const loadBlockedUsers = async () => {
    try {
      // Load blocked users from user profile or separate table
      // For now, using localStorage as a simple implementation
      const blocked = localStorage.getItem(`blocked_users_${currentUserId}`);
      if (blocked) {
        setBlockedUsers(new Set(JSON.parse(blocked)));
      }
    } catch (error) {
      console.error('Failed to load blocked users:', error);
    }
  };

  const loadConversations = async () => {
    try {
      setIsLoading(true);
      const loadedConversations = await chatService.getUserConversations(currentUserId);
      
      // Enhance conversations with chat type and restrictions
      const enhancedConversations = await Promise.all(
        loadedConversations.map(async (conv) => {
          const isBlocked = blockedUsers.has(conv.participantId);
          const hasReceiverResponded = await chatService.hasReceiverResponded(currentUserId, conv.participantId);
          const initiatedBy = await chatService.getConversationInitiator(currentUserId, conv.participantId);
          
          let chatType: 'main' | 'new' | 'restricted' = 'main';
          let canSendMessage = true;

          if (isBlocked) {
            chatType = 'restricted';
            canSendMessage = false;
          } else if (!hasReceiverResponded && initiatedBy !== currentUserId) {
            // This is a new chat where current user is receiver and hasn't responded
            chatType = 'new';
            canSendMessage = true;
          } else if (!hasReceiverResponded && initiatedBy === currentUserId) {
            // This is a new chat where current user initiated and receiver hasn't responded
            chatType = 'new';
            canSendMessage = false; // Can't send more messages until receiver responds
          }

          return {
            ...conv,
            chatType,
            canSendMessage,
            isBlocked,
            initiatedBy,
            hasReceiverResponded
          };
        })
      );
      
      setConversations(enhancedConversations);
      
      // If we have a target user ID, try to find or create that conversation
      if (targetUserId) {
        const existingConversation = enhancedConversations.find(conv => conv.participantId === targetUserId);
        if (existingConversation) {
          setSelectedConversation(existingConversation);
        } else {
          // Create a new conversation entry for the target user
          await createNewConversation(targetUserId);
        }
        setTargetUserId(null); // Clear after processing
      } else if (!selectedConversation && enhancedConversations.length > 0) {
        // Auto-select first conversation in current tab
        const tabConversations = enhancedConversations.filter(conv => conv.chatType === activeTab);
        if (tabConversations.length > 0) {
          setSelectedConversation(tabConversations[0]);
        }
      }
    } catch (error) {
      console.error('Failed to load conversations:', error);
      setConversations([]);
    } finally {
      setIsLoading(false);
    }
  };

  const createNewConversation = async (userId: string) => {
    try {
      // Get user profile to create conversation entry
      const { data: userProfile } = await supabase
        .from('user_profiles')
        .select('user_id, full_name, avatar')
        .eq('user_id', userId)
        .single();
      
      if (userProfile) {
        const newConversation: Conversation = {
          id: userId,
          participantId: userId,
          participantName: userProfile.full_name || 'Пользователь',
          participantAvatar: userProfile.avatar,
          unreadCount: 0,
          isOnline: false,
          chatType: 'new',
          canSendMessage: true, // Can send initial message
          isBlocked: false,
          initiatedBy: currentUserId,
          hasReceiverResponded: false
        };
        
        setConversations(prev => [newConversation, ...prev]);
        setSelectedConversation(newConversation);
      }
    } catch (error) {
      console.error('Failed to create new conversation:', error);
      toast.error('Не удалось создать диалог');
    }
  };

  const loadMessages = async (conversationId: string) => {
    try {
      setIsLoading(true);
      const partnerId = selectedConversation?.participantId;
      if (partnerId) {
        const loadedMessages = await chatService.getConversation(currentUserId, partnerId);
        setMessages(loadedMessages);
      }
    } catch (error) {
      console.error('Failed to load messages:', error);
      setMessages([]);
    } finally {
      setIsLoading(false);
    }
  };

  const markConversationAsRead = async (partnerId: string) => {
    try {
      await chatService.markMessagesAsRead(partnerId, currentUserId);
      
      // Update conversation unread count in UI
      setConversations(prev => prev.map(conv => {
        if (conv.participantId === partnerId) {
          return {
            ...conv,
            unreadCount: 0
          };
        }
        return conv;
      }));
    } catch (error) {
      console.error('Failed to mark messages as read:', error);
    }
  };

  const handleNewMessage = (message: any) => {
    console.log('New message received:', message);
    // Update messages list and conversations
    if (message.new) {
      const transformedMessage = chatService.transformMessageFromDatabase(message.new);
      setMessages(prev => [...prev, transformedMessage]);
      updateConversationLastMessage(transformedMessage);
      
      // Check if this moves conversation from 'new' to 'main'
      if (transformedMessage.receiverId === currentUserId) {
        // Current user received a message, check if this should move chat to main
        updateConversationStatus(transformedMessage.senderId);
      }
      
      // Trigger AI analysis for new messages
      if (selectedConversation && transformedMessage.senderId === selectedConversation.participantId) {
        // Update messages state and trigger analysis
        setTimeout(() => {
          const updatedMessages = [...messages, transformedMessage];
          if (updatedMessages.length >= 2) {
            // Trigger AI analysis through the AI panel
            window.dispatchEvent(new CustomEvent('triggerAIAnalysis', { 
              detail: { messages: updatedMessages } 
            }));
          }
        }, 500);
      }
    }
  };

  const updateConversationStatus = async (partnerId: string) => {
    try {
      const hasResponded = await chatService.hasReceiverResponded(currentUserId, partnerId);
      
      setConversations(prev => prev.map(conv => {
        if (conv.participantId === partnerId) {
          const newChatType = hasResponded ? 'main' : conv.chatType;
          return {
            ...conv,
            chatType: newChatType,
            canSendMessage: !conv.isBlocked && (newChatType === 'main' || conv.initiatedBy !== currentUserId),
            hasReceiverResponded: hasResponded
          };
        }
        return conv;
      }));
    } catch (error) {
      console.error('Failed to update conversation status:', error);
    }
  };

  const updateConversationLastMessage = (message: ChatMessage) => {
    setConversations(prev => prev.map(conv => {
      if (conv.participantId === message.senderId || conv.participantId === message.receiverId) {
        return {
          ...conv,
          lastMessage: message,
          unreadCount: message.senderId !== currentUserId ? conv.unreadCount + 1 : conv.unreadCount
        };
      }
      return conv;
    }));
  };

  const handleMessageInteraction = async (action: string, messageId: string, dealId?: string) => {
    try {
      if (action === 'update_payment_status') {
        // Handle payment request status updates
        const paymentRequestId = messages.find(m => m.id === messageId)?.metadata?.paymentRequestId;
        const newStatus = messages.find(m => m.id === messageId)?.metadata?.buttons?.find((b: any) => b.action === action)?.status;
        
        if (paymentRequestId && newStatus) {
          // Refresh messages to show updated status
          if (selectedConversation) {
            await loadMessages(selectedConversation.id);
          }
          return;
        }
      } else if (action === 'confirm_payment' && dealId) {
        // Отправляем уведомление о том, что платеж был произведен
        await chatService.sendMessage({
          senderId: currentUserId,
          receiverId: selectedConversation!.participantId,
          messageContent: '✅ Оплачено! Ожидание подтверждения получения.',
          messageType: 'payment_confirmation',
          metadata: {
            dealId: dealId,
            actionType: 'payment_confirmed_by_payer',
            originalMessageId: messageId,
            isInteractive: true,
            buttons: [
              {
                id: 'confirm_received',
                label: 'Оплата поступила',
                action: 'confirm_received',
                dealId: dealId,
                style: 'success'
              },
              {
                id: 'payment_not_received',
                label: 'Оплата не поступила',
                action: 'payment_not_received',
                dealId: dealId,
                style: 'warning'
              }
            ]
          }
        });
        
        toast.success('Подтверждение оплаты отправлено');
      } else if (action === 'confirm_received' && dealId) {
        // Подтверждение получения оплаты
        await chatService.sendMessage({
          senderId: currentUserId,
          receiverId: selectedConversation!.participantId,
          messageContent: '💚 Оплата получена! Сотрудничество можно начинать.',
          messageType: 'text',
          metadata: {
            dealId: dealId,
            actionType: 'payment_received_confirmed'
          }
        });
        
        toast.success('Получение оплаты подтверждено');
      } else if (action === 'payment_not_received' && dealId) {
        // Сообщение о том, что оплата не поступила
        await chatService.sendMessage({
          senderId: currentUserId,
          receiverId: selectedConversation!.participantId,
          messageContent: '❌ Оплата не поступила. Свяжитесь для решения проблемы.',
          messageType: 'text',
          metadata: {
            dealId: dealId,
            actionType: 'payment_not_received'
          }
        });
        
        toast.error('Сообщение о проблеме с оплатой отправлено');
      }
      
      // Обновляем сообщения
      if (selectedConversation) {
        await loadMessages(selectedConversation.id);
      }
    } catch (error: any) {
      console.error('Failed to handle message interaction:', error);
      toast.error('Не удалось обработать действие');
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !selectedConversation) return;

    // Check if user can send message
    if (!selectedConversation.canSendMessage) {
      if (selectedConversation.isBlocked) {
        toast.error('Переписка с этим пользователем ограничена');
      } else if (selectedConversation.chatType === 'new' && selectedConversation.initiatedBy === currentUserId) {
        toast.error('Дождитесь ответа получателя перед отправкой следующего сообщения');
      }
      return;
    }

    // Check basic profile completion
    if (!currentUserProfile?.profileCompletion.basicInfo) {
      toast.error('Заполните основную информацию профиля для отправки сообщений');
      return;
    }

    const messageData: Partial<ChatMessage> = {
      senderId: currentUserId,
      receiverId: selectedConversation.participantId,
      messageContent: newMessage,
      messageType: 'text',
    };

    setNewMessage('');
    setRateLimitWarning(false);

    try {
      const sentMessage = await chatService.sendMessage(messageData);
      
      // Optimistically add message
      setMessages(prev => [...prev, sentMessage]);

      // Update conversation
      updateConversationLastMessage(sentMessage);
      
      // If this was the first message from initiator, disable further messages until response
      if (selectedConversation.chatType === 'new' && selectedConversation.initiatedBy === currentUserId) {
        setSelectedConversation(prev => prev ? {
          ...prev,
          canSendMessage: false
        } : null);
      }
    } catch (error: any) {
      console.error('Failed to send message:', error);
      
      if (error.message.includes('Rate limit exceeded')) {
        setRateLimitWarning(true);
        setTimeout(() => setRateLimitWarning(false), 5000);
      } else if (error.message.includes('queued due to delivery delay')) {
        setConnectionStatus('connecting');
        setTimeout(() => setConnectionStatus('connected'), 3000);
      }
      
      console.warn('Message delivery issue:', error.message);
    }
  };

  const handleBlockUser = async (userId: string) => {
    try {
      const newBlockedUsers = new Set(blockedUsers);
      newBlockedUsers.add(userId);
      setBlockedUsers(newBlockedUsers);
      
      // Save to localStorage
      localStorage.setItem(`blocked_users_${currentUserId}`, JSON.stringify([...newBlockedUsers]));
      
      // Update conversation status
      setConversations(prev => prev.map(conv => {
        if (conv.participantId === userId) {
          return {
            ...conv,
            chatType: 'restricted',
            canSendMessage: false,
            isBlocked: true
          };
        }
        return conv;
      }));

      // Clear selected conversation if it's the blocked user
      if (selectedConversation?.participantId === userId) {
        setSelectedConversation(null);
      }

      toast.success('Пользователь заблокирован');
    } catch (error) {
      console.error('Failed to block user:', error);
      toast.error('Не удалось заблокировать пользователя');
    }
  };

  const handleUnblockUser = async (userId: string) => {
    try {
      const newBlockedUsers = new Set(blockedUsers);
      newBlockedUsers.delete(userId);
      setBlockedUsers(newBlockedUsers);
      
      // Save to localStorage
      localStorage.setItem(`blocked_users_${currentUserId}`, JSON.stringify([...newBlockedUsers]));
      
      // Update conversation status
      setConversations(prev => prev.map(conv => {
        if (conv.participantId === userId) {
          return {
            ...conv,
            chatType: 'main',
            canSendMessage: true,
            isBlocked: false
          };
        }
        return conv;
      }));

      toast.success('Пользователь разблокирован');
    } catch (error) {
      console.error('Failed to unblock user:', error);
      toast.error('Не удалось разблокировать пользователя');
    }
  };

  const handleSendCollaborationRequest = () => {
    if (!selectedConversation) return;
    
    // Check if user has influencer profile setup
    if (!currentUserProfile?.profileCompletion.influencerSetup) {
      toast.error('Заполните раздел "Инфлюенсер" для отправки запросов на сотрудничество');
      return;
    }
    
    setShowCollaborationModal(true);
  };

  const handleCollaborationRequestSent = () => {
    // Refresh messages to show the collaboration request
    if (selectedConversation) {
      loadMessages(selectedConversation.id);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Filter conversations by active tab
  const getTabConversations = (tab: ChatTab) => {
    return conversations.filter(conv => conv.chatType === tab);
  };

  const filteredConversations = getTabConversations(activeTab).filter(conv =>
    conv.participantName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getTabCounts = () => {
    return {
      main: getTabConversations('main').length,
      new: getTabConversations('new').length,
      restricted: getTabConversations('restricted').length
    };
  };

  const tabCounts = getTabCounts();

  const formatMessageTime = (timestamp: string) => {
    const date = parseISO(timestamp);
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);
    
    if (diffInHours < 24) {
      return format(date, 'HH:mm');
    } else if (diffInHours < 24 * 7) {
      return format(date, 'EEE HH:mm');
    } else {
      return format(date, 'MMM dd');
    }
  };

  const getTabIcon = (tab: ChatTab) => {
    switch (tab) {
      case 'main':
        return <MessageCircle className="w-4 h-4" />;
      case 'new':
        return <Handshake className="w-4 h-4" />;
      case 'restricted':
        return <Shield className="w-4 h-4" />;
    }
  };

  const getTabLabel = (tab: ChatTab) => {
    switch (tab) {
      case 'main':
        return 'Основные';
      case 'new':
        return 'Новые';
      case 'restricted':
        return 'Ограниченные';
    }
  };

  const getEmptyStateMessage = (tab: ChatTab) => {
    switch (tab) {
      case 'main':
        return {
          title: 'Нет активных чатов',
          subtitle: 'Активные диалоги появятся здесь после первого ответа получателя',
          tip: 'Отправьте заявку на карточку или кампанию, чтобы начать диалог'
        };
      case 'new':
        return {
          title: 'Нет новых чатов',
          subtitle: 'Новые диалоги и предложения появятся здесь',
          tip: 'Отправляйте заявки и предложения для начала новых диалогов'
        };
      case 'restricted':
        return {
          title: 'Нет ограниченных чатов',
          subtitle: 'Заблокированные пользователи появятся здесь',
          tip: 'Вы можете заблокировать пользователей из активных чатов'
        };
    }
  };

  return (
    <div className="flex h-[calc(100vh-200px)] bg-white rounded-lg shadow-lg overflow-hidden">
      {/* Conversations Sidebar */}
      <div className="w-1/3 border-r border-gray-300 flex flex-col">
        {/* Chat Tabs */}
        <div className="border-b border-gray-200">
          <div className="flex">
            {(['main', 'new', 'restricted'] as ChatTab[]).map((tab) => (
              <button
                key={tab}
                onClick={() => {
                  setActiveTab(tab);
                  setSelectedConversation(null);
                }}
                className={`flex-1 px-4 py-3 text-sm font-medium transition-colors border-b-2 ${
                  activeTab === tab
                    ? 'text-purple-600 border-purple-600 bg-purple-50'
                    : 'text-gray-600 border-transparent hover:text-gray-900 hover:bg-gray-50'
                }`}
              >
                <div className="flex items-center justify-center space-x-2">
                  {getTabIcon(tab)}
                  <span>{getTabLabel(tab)}</span>
                  {tabCounts[tab] > 0 && (
                    <span className={`px-2 py-1 text-xs rounded-full ${
                      activeTab === tab
                        ? 'bg-purple-600 text-white'
                        : 'bg-gray-200 text-gray-600'
                    }`}>
                      {tabCounts[tab]}
                    </span>
                  )}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Search */}
        <div className="p-4 border-b border-gray-200">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder={t('chat.searchConversations')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm"
            />
          </div>
        </div>

        {/* Conversations List */}
        <div className="flex-1 overflow-y-auto">
          {isLoading ? (
            <div className="space-y-2 p-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="flex items-center space-x-3 p-3 animate-pulse">
                  <div className="w-12 h-12 bg-gray-300 rounded-full"></div>
                  <div className="flex-1">
                    <div className="h-4 bg-gray-300 rounded mb-2"></div>
                    <div className="h-3 bg-gray-300 rounded w-3/4"></div>
                  </div>
                </div>
              ))}
            </div>
          ) : filteredConversations.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full p-8 text-center">
              {getTabIcon(activeTab)}
              <div className="w-12 h-12 text-gray-400 mb-4">
                {getTabIcon(activeTab)}
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                {getEmptyStateMessage(activeTab).title}
              </h3>
              <p className="text-sm text-gray-600 mb-4">
                {getEmptyStateMessage(activeTab).subtitle}
              </p>
              <div className="space-y-2 text-sm text-gray-500">
                <p>💡 Совет:</p>
                <p>{getEmptyStateMessage(activeTab).tip}</p>
              </div>
            </div>
          ) : (
            <div className="space-y-1">
              {filteredConversations.map((conversation) => (
                <div
                  key={conversation.id}
                  onClick={() => setSelectedConversation(conversation)}
                  className={`flex items-center space-x-3 p-4 hover:bg-gray-50 cursor-pointer transition-colors relative ${
                    selectedConversation?.id === conversation.id ? 'bg-purple-50 border-r-2 border-purple-500' : ''
                  }`}
                >
                  <div className="relative">
                    <div className="w-12 h-12 bg-gradient-to-r from-purple-400 to-blue-400 rounded-full flex items-center justify-center">
                      {conversation.participantAvatar ? (
                        <img 
                          src={conversation.participantAvatar} 
                          alt={conversation.participantName}
                          className="w-12 h-12 rounded-full object-cover"
                        />
                      ) : (
                        <span className="text-white font-semibold">
                          {conversation.participantName.charAt(0).toUpperCase()}
                        </span>
                      )}
                    </div>
                    {conversation.isOnline && (
                      <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-400 rounded-full border-2 border-white"></div>
                    )}
                    {conversation.isBlocked && (
                      <div className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full flex items-center justify-center">
                        <UserX className="w-2 h-2 text-white" />
                      </div>
                    )}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-start">
                      <h3 className="text-sm font-semibold text-gray-900 truncate">
                        {conversation.participantName}
                      </h3>
                      {conversation.lastMessage && (
                        <span className="text-xs text-gray-500">
                          {formatMessageTime(conversation.lastMessage.timestamp)}
                        </span>
                      )}
                    </div>
                    {conversation.lastMessage && (
                      <p className="text-sm text-gray-600 truncate mt-1">
                        {conversation.lastMessage.messageContent}
                      </p>
                    )}
                    
                    {/* Chat type indicator */}
                    {conversation.chatType === 'new' && (
                      <div className="flex items-center space-x-1 mt-1">
                        <div className="w-2 h-2 bg-yellow-400 rounded-full"></div>
                        <span className="text-xs text-yellow-600">
                          {conversation.initiatedBy === currentUserId ? 'Ожидание ответа' : 'Новое предложение'}
                        </span>
                      </div>
                    )}
                    
                    {conversation.chatType === 'restricted' && (
                      <div className="flex items-center space-x-1 mt-1">
                        <div className="w-2 h-2 bg-red-400 rounded-full"></div>
                        <span className="text-xs text-red-600">Заблокирован</span>
                      </div>
                    )}
                  </div>
                  
                  {conversation.unreadCount > 0 && (
                    <div className="w-5 h-5 bg-purple-600 rounded-full flex items-center justify-center">
                      <span className="text-xs text-white font-medium">
                        {conversation.unreadCount}
                      </span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Chat Area */}
      <div className={`${showAIPanel ? 'flex-1' : 'flex-1'} flex flex-col`}>
        {selectedConversation ? (
          <>
            {/* Chat Header */}
            <div className="p-4 border-b border-gray-200 flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="relative">
                  <div className="w-10 h-10 bg-gradient-to-r from-purple-400 to-blue-400 rounded-full flex items-center justify-center">
                    <span className="text-white font-semibold">
                      {selectedConversation.participantName.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  {selectedConversation.isOnline && (
                    <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-400 rounded-full border-2 border-white"></div>
                  )}
                </div>
                <div>
                  <div className="flex items-center space-x-2">
                    <h3 className="text-sm font-semibold text-gray-900">
                      {selectedConversation.participantName}
                    </h3>
                    {selectedConversation.chatType === 'new' && (
                      <span className="px-2 py-1 text-xs font-medium bg-yellow-100 text-yellow-700 rounded-full">
                        Новый чат
                      </span>
                    )}
                    {selectedConversation.isBlocked && (
                      <span className="px-2 py-1 text-xs font-medium bg-red-100 text-red-700 rounded-full">
                        Заблокирован
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-600">
                    {selectedConversation.isOnline ? t('common.online') : `${t('chat.lastSeen')} ${formatDistanceToNow(parseISO(selectedConversation.lastMessage?.timestamp || ''), { addSuffix: true })}`}
                  </p>
                </div>
              </div>
              
              <div className="flex items-center space-x-2">
                {selectedConversation.chatType !== 'restricted' && (
                  <button
                    onClick={handleSendCollaborationRequest}
                    className="p-2 text-gray-400 hover:text-purple-600 rounded-md hover:bg-gray-100"
                    title="Отправить запрос на сотрудничество"
                  >
                    <Handshake className="w-5 h-5" />
                  </button>
                )}
                
                {/* Block/Unblock button */}
                {selectedConversation.isBlocked ? (
                  <button
                    onClick={() => handleUnblockUser(selectedConversation.participantId)}
                    className="p-2 text-green-600 hover:text-green-700 rounded-md hover:bg-green-50"
                    title="Разблокировать пользователя"
                  >
                    <UserCheck className="w-5 h-5" />
                  </button>
                ) : (
                  <button
                    onClick={() => handleBlockUser(selectedConversation.participantId)}
                    className="p-2 text-red-600 hover:text-red-700 rounded-md hover:bg-red-50"
                    title="Заблокировать пользователя"
                  >
                    <UserX className="w-5 h-5" />
                  </button>
                )}
              </div>
            </div>

            {/* Connection Status */}
            {connectionStatus !== 'connected' && (
              <div className="px-4 py-2 bg-yellow-50 border-b border-yellow-200">
                <div className="flex items-center space-x-2 text-sm text-yellow-800">
                  <AlertTriangle className="w-4 h-4" />
                  <span>
                    {connectionStatus === 'connecting' ? t('chat.reconnecting') : t('chat.connectionLost')}
                  </span>
                </div>
              </div>
            )}

            {/* Rate Limit Warning */}
            {rateLimitWarning && (
              <div className="px-4 py-2 bg-red-50 border-b border-red-200">
                <div className="flex items-center space-x-2 text-sm text-red-800">
                  <AlertTriangle className="w-4 h-4" />
                  <span>{t('chat.rateLimitWarning')}</span>
                </div>
              </div>
            )}

            {/* Chat Restrictions Notice */}
            {selectedConversation.chatType === 'new' && selectedConversation.initiatedBy === currentUserId && !selectedConversation.canSendMessage && (
              <div className="px-4 py-2 bg-blue-50 border-b border-blue-200">
                <div className="flex items-center space-x-2 text-sm text-blue-800">
                  <Handshake className="w-4 h-4" />
                  <span>Дождитесь ответа получателя перед отправкой следующего сообщения</span>
                </div>
              </div>
            )}

            {selectedConversation.isBlocked && (
              <div className="px-4 py-2 bg-red-50 border-b border-red-200">
                <div className="flex items-center space-x-2 text-sm text-red-800">
                  <Shield className="w-4 h-4" />
                  <span>Переписка с этим пользователем ограничена</span>
                </div>
              </div>
            )}

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.map((message) => (
                <MessageBubble
                  key={message.id}
                  message={message}
                  currentUserId={currentUserId}
                  onInteraction={handleMessageInteraction}
                />
              ))}
              <div ref={messagesEndRef} />
            </div>

            {/* Message Input */}
            <div className="p-4 border-t border-gray-200">
              {selectedConversation.canSendMessage ? (
                <div className="flex items-center space-x-3">
                  <input
                    type="text"
                    placeholder={
                      selectedConversation.chatType === 'new' && selectedConversation.initiatedBy === currentUserId
                        ? "Отправьте приветственное сообщение..."
                        : t('chat.typeMessage')
                    }
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  />
                  <button
                    onClick={sendMessage}
                    disabled={!newMessage.trim()}
                    className="p-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    <Send className="w-5 h-5" />
                  </button>
                </div>
              ) : (
                <div className="text-center py-4">
                  <div className="bg-gray-100 rounded-lg p-4">
                    <Shield className="w-6 h-6 text-gray-400 mx-auto mb-2" />
                    <p className="text-sm text-gray-600">
                      {selectedConversation.isBlocked 
                        ? 'Переписка ограничена'
                        : 'Дождитесь ответа получателя'
                      }
                    </p>
                  </div>
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                {getTabIcon(activeTab)}
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                {getEmptyStateMessage(activeTab).title}
              </h3>
              <p className="text-gray-600">{getEmptyStateMessage(activeTab).subtitle}</p>
            </div>
          </div>
        )}
      </div>

      {/* AI Chat Panel */}
      {selectedConversation && showAIPanel && (
        <AIChatPanel
          currentUserId={currentUserId}
          partnerId={selectedConversation.participantId}
          isVisible={showAIPanel}
          onToggleVisibility={() => setShowAIPanel(!showAIPanel)}
          conversationMessages={messages}
        />
      )}

      {/* Collaboration Request Modal */}
      <CollaborationRequestModal
        isOpen={showCollaborationModal}
        onClose={() => setShowCollaborationModal(false)}
        receiverId={selectedConversation?.participantId || ''}
        senderId={currentUserId}
        onRequestSent={handleCollaborationRequestSent}
      />
    </div>
  );
}