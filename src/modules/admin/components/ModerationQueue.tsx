import React, { useState, useEffect } from 'react';
import { ModerationQueueItem, ModerationStatus } from '../../../core/types';
import { moderationService } from '../../../services/moderationService';
import { useAuth } from '../../../hooks/useAuth';
import { 
  Clock, 
  CheckCircle, 
  XCircle, 
  AlertTriangle, 
  Eye,
  User,
  Target,
  MessageCircle,
  Grid,
  Shield,
  X
} from 'lucide-react';
import toast from 'react-hot-toast';

interface ModerationQueueProps {
  onStatsUpdate: () => void;
}

export function ModerationQueue({ onStatsUpdate }: ModerationQueueProps) {
  const [queueItems, setQueueItems] = useState<ModerationQueueItem[]>([]);
  const [statusFilter, setStatusFilter] = useState<ModerationStatus | 'all'>('pending');
  const [contentTypeFilter, setContentTypeFilter] = useState<string>('all');
  const [isLoading, setIsLoading] = useState(true);
  const [selectedItem, setSelectedItem] = useState<ModerationQueueItem | null>(null);
  const [reviewNotes, setReviewNotes] = useState('');

  const { user: currentUser } = useAuth();

  useEffect(() => {
    loadQueue();
  }, [statusFilter, contentTypeFilter]);

  const loadQueue = async () => {
    try {
      setIsLoading(true);
      const items = await moderationService.getModerationQueue({
        status: statusFilter !== 'all' ? statusFilter : undefined,
        contentType: contentTypeFilter !== 'all' ? contentTypeFilter : undefined
      });
      setQueueItems(items);
    } catch (error) {
      console.error('Failed to load moderation queue:', error);
      toast.error('Не удалось загрузить очередь модерации');
    } finally {
      setIsLoading(false);
    }
  };

  const handleModerate = async (itemId: string, decision: ModerationStatus) => {
    try {
      await moderationService.moderateContent(itemId, decision, reviewNotes, currentUser!.id);
      await loadQueue();
      onStatsUpdate();
      setSelectedItem(null);
      setReviewNotes('');
      toast.success(`Контент ${decision === 'approved' ? 'одобрен' : decision === 'rejected' ? 'отклонен' : 'помечен'}`);
    } catch (error: any) {
      console.error('Failed to moderate content:', error);
      toast.error(error.message || 'Не удалось обработать контент');
    }
  };

  const getContentTypeIcon = (contentType: string) => {
    switch (contentType) {
      case 'user_profile':
        return <User className="w-4 h-4 text-blue-600" />;
      case 'influencer_card':
        return <Grid className="w-4 h-4 text-purple-600" />;
      case 'campaign':
        return <Target className="w-4 h-4 text-green-600" />;
      case 'chat_message':
        return <MessageCircle className="w-4 h-4 text-orange-600" />;
      default:
        return <Eye className="w-4 h-4 text-gray-600" />;
    }
  };

  const getContentTypeLabel = (contentType: string) => {
    switch (contentType) {
      case 'user_profile':
        return 'Профиль';
      case 'influencer_card':
        return 'Карточка';
      case 'campaign':
        return 'Кампания';
      case 'chat_message':
        return 'Сообщение';
      default:
        return contentType;
    }
  };

  const getPriorityColor = (priority: number) => {
    if (priority >= 4) return 'text-red-600 bg-red-100';
    if (priority >= 3) return 'text-yellow-600 bg-yellow-100';
    return 'text-green-600 bg-green-100';
  };

  const getContentPreview = (item: ModerationQueueItem) => {
    const data = item.contentData;
    switch (item.contentType) {
      case 'user_profile':
        return `${data.full_name} (${data.email})`;
      case 'influencer_card':
        return `${data.platform} - ${data.service_details?.description?.substring(0, 50)}...`;
      case 'campaign':
        return `${data.title} - ${data.brand}`;
      case 'chat_message':
        return data.message_content?.substring(0, 50) + '...';
      default:
        return 'Контент для проверки';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Очередь модерации</h2>
          <p className="text-sm text-gray-600">Контент, требующий проверки модераторами</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex space-x-4">
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as ModerationStatus | 'all')}
          className="border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
        >
          <option value="all">Все статусы</option>
          <option value="pending">На проверке</option>
          <option value="approved">Одобрено</option>
          <option value="flagged">Помечено</option>
          <option value="rejected">Отклонено</option>
        </select>
        
        <select
          value={contentTypeFilter}
          onChange={(e) => setContentTypeFilter(e.target.value)}
          className="border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
        >
          <option value="all">Все типы</option>
          <option value="user_profile">Профили</option>
          <option value="influencer_card">Карточки</option>
          <option value="campaign">Кампании</option>
          <option value="chat_message">Сообщения</option>
        </select>
      </div>

      {/* Queue Items */}
      <div className="space-y-4">
        {isLoading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Загрузка очереди модерации...</p>
          </div>
        ) : queueItems.length === 0 ? (
          <div className="text-center py-12">
            <Shield className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Очередь пуста</h3>
            <p className="text-gray-600">Нет контента, требующего модерации</p>
          </div>
        ) : (
          queueItems.map((item) => (
            <div key={item.id} className="bg-white border border-gray-200 rounded-lg p-6">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-3 mb-2">
                    {getContentTypeIcon(item.contentType)}
                    <span className="text-sm font-medium text-gray-900">
                      {getContentTypeLabel(item.contentType)}
                    </span>
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${getPriorityColor(item.priority)}`}>
                      Приоритет {item.priority}
                    </span>
                    {item.autoFlagged && (
                      <span className="px-2 py-1 text-xs font-medium rounded-full bg-orange-100 text-orange-700">
                        Авто-флаг
                      </span>
                    )}
                  </div>
                  
                  <p className="text-sm text-gray-600 mb-3">
                    {getContentPreview(item)}
                  </p>
                  
                  {item.flaggedReasons.length > 0 && (
                    <div className="mb-3">
                      <p className="text-xs font-medium text-gray-700 mb-1">Причины флага:</p>
                      <div className="flex flex-wrap gap-1">
                        {item.flaggedReasons.map((reason, index) => (
                          <span key={index} className="px-2 py-1 bg-red-100 text-red-700 text-xs rounded-md">
                            {reason}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  <div className="text-xs text-gray-500">
                    Создано: {new Date(item.createdAt).toLocaleString('ru-RU')}
                  </div>
                </div>
                
                {item.moderationStatus === 'pending' && (
                  <div className="flex space-x-2 ml-4">
                    <button
                      onClick={() => setSelectedItem(item)}
                      className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded-md text-sm transition-colors"
                    >
                      Проверить
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Moderation Modal */}
      {selectedItem && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Модерация контента</h3>
              <button
                onClick={() => {
                  setSelectedItem(null);
                  setReviewNotes('');
                }}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto max-h-[60vh]">
              <div className="space-y-4">
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h4 className="font-medium text-gray-900 mb-2">Информация о контенте</h4>
                  <div className="space-y-2 text-sm">
                    <div><strong>Тип:</strong> {getContentTypeLabel(selectedItem.contentType)}</div>
                    <div><strong>Приоритет:</strong> {selectedItem.priority}</div>
                    <div><strong>Авто-флаг:</strong> {selectedItem.autoFlagged ? 'Да' : 'Нет'}</div>
                    <div><strong>Создано:</strong> {new Date(selectedItem.createdAt).toLocaleString('ru-RU')}</div>
                  </div>
                </div>
                
                <div className="bg-white border border-gray-200 p-4 rounded-lg">
                  <h4 className="font-medium text-gray-900 mb-2">Содержимое</h4>
                  <pre className="text-sm text-gray-600 whitespace-pre-wrap">
                    {JSON.stringify(selectedItem.contentData, null, 2)}
                  </pre>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Заметки модератора
                  </label>
                  <textarea
                    value={reviewNotes}
                    onChange={(e) => setReviewNotes(e.target.value)}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    placeholder="Добавьте заметки о решении..."
                  />
                </div>
              </div>
            </div>
            
            <div className="flex items-center justify-between p-6 border-t border-gray-200">
              <button
                onClick={() => {
                  setSelectedItem(null);
                  setReviewNotes('');
                }}
                className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
              >
                Отмена
              </button>
              
              <div className="flex space-x-3">
                <button
                  onClick={() => handleModerate(selectedItem.id, 'rejected')}
                  className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-md transition-colors flex items-center space-x-2"
                >
                  <XCircle className="w-4 h-4" />
                  <span>Отклонить</span>
                </button>
                
                <button
                  onClick={() => handleModerate(selectedItem.id, 'flagged')}
                  className="bg-yellow-600 hover:bg-yellow-700 text-white px-4 py-2 rounded-md transition-colors flex items-center space-x-2"
                >
                  <AlertTriangle className="w-4 h-4" />
                  <span>Пометить</span>
                </button>
                
                <button
                  onClick={() => handleModerate(selectedItem.id, 'approved')}
                  className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md transition-colors flex items-center space-x-2"
                >
                  <CheckCircle className="w-4 h-4" />
                  <span>Одобрить</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}