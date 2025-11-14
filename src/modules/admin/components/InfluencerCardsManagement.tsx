import React, { useState, useEffect } from 'react';
import { InfluencerCard, ModerationStatus } from '../../../core/types';
import { adminService } from '../../../services/adminService';
import { useAuth } from '../../../hooks/useAuth';
import {
  Search,
  Filter,
  Grid,
  Trash2,
  Eye,
  AlertTriangle,
  CheckCircle,
  Clock,
  XCircle
} from 'lucide-react';
import toast from 'react-hot-toast';

interface InfluencerCardsManagementProps {
  onStatsUpdate: () => void;
}

export function InfluencerCardsManagement({ onStatsUpdate }: InfluencerCardsManagementProps) {
  const [cards, setCards] = useState<InfluencerCard[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [moderationFilter, setModerationFilter] = useState<ModerationStatus | 'all'>('all');
  const [showDeleted, setShowDeleted] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const { user: currentUser } = useAuth();

  useEffect(() => {
    loadCards();
  }, [moderationFilter, showDeleted]);

  const loadCards = async () => {
    try {
      setIsLoading(true);
      const loadedCards = await adminService.getAllInfluencerCards({
        moderationStatus: moderationFilter !== 'all' ? moderationFilter : undefined,
        isDeleted: showDeleted
      });
      setCards(loadedCards);
    } catch (error) {
      console.error('Failed to load influencer cards:', error);
      toast.error('Не удалось загрузить карточки');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteCard = async (cardId: string) => {
    if (!confirm('Вы уверены, что хотите удалить эту карточку?')) return;

    try {
      await adminService.deleteInfluencerCard(cardId, currentUser!.id);
      await loadCards();
      onStatsUpdate();
      toast.success('Карточка удалена');
    } catch (error: any) {
      console.error('Failed to delete card:', error);
      toast.error(error.message || 'Не удалось удалить карточку');
    }
  };

  const getModerationIcon = (status: ModerationStatus) => {
    switch (status) {
      case 'approved':
        return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'pending':
        return <Clock className="w-4 h-4 text-yellow-600" />;
      case 'flagged':
        return <AlertTriangle className="w-4 h-4 text-red-600" />;
      case 'rejected':
        return <XCircle className="w-4 h-4 text-red-600" />;
      default:
        return <Clock className="w-4 h-4 text-gray-600" />;
    }
  };

  const getPlatformLabel = (platform: string) => {
    const labels: Record<string, string> = {
      instagram: 'Instagram',
      youtube: 'YouTube',
      tiktok: 'TikTok',
      twitter: 'Twitter/X',
      telegram: 'Telegram'
    };
    return labels[platform] || platform;
  };

  const formatNumber = (num: number) => {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num.toString();
  };

  const filteredCards = cards.filter(card => {
    const searchLower = searchQuery.toLowerCase();
    return (
      getPlatformLabel(card.platform).toLowerCase().includes(searchLower) ||
      card.serviceDetails?.description?.toLowerCase().includes(searchLower) ||
      false
    );
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Управление карточками</h2>
          <p className="text-sm text-gray-600">Просмотр и модерация карточек инфлюенсеров</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row space-y-4 sm:space-y-0 sm:space-x-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            type="text"
            placeholder="Поиск карточек..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        <div className="flex space-x-2">
          <select
            value={moderationFilter}
            onChange={(e) => setModerationFilter(e.target.value as ModerationStatus | 'all')}
            className="border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">Все статусы</option>
            <option value="pending">На проверке</option>
            <option value="approved">Одобрено</option>
            <option value="flagged">Помечено</option>
            <option value="rejected">Отклонено</option>
          </select>

          <label className="flex items-center space-x-2 px-3 py-2 border border-gray-300 rounded-md">
            <input
              type="checkbox"
              checked={showDeleted}
              onChange={(e) => setShowDeleted(e.target.checked)}
              className="text-blue-600 border-gray-300 rounded focus:ring-blue-500"
            />
            <span className="text-sm text-gray-700">Удаленные</span>
          </label>
        </div>
      </div>

      {/* Cards Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Загрузка карточек...</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Платформа
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Охват
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Рейтинг
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Модерация
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Создана
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Действия
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredCards.map((card) => (
                  <tr key={card.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {getPlatformLabel(card.platform)}
                        </div>
                        <div className="text-xs text-gray-500 line-clamp-1">
                          {card.serviceDetails?.description || 'Нет описания'}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {formatNumber(card.reach?.followers || 0)} подписчиков
                      </div>
                      <div className="text-xs text-gray-500">
                        {card.reach?.avgViews ? `${formatNumber(card.reach.avgViews)} просмотров` : ''}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <span className="text-sm font-medium text-gray-900">{card.rating?.toFixed(1) || '0.0'}</span>
                        <span className="text-xs text-gray-500 ml-1">/ 5.0</span>
                      </div>
                      <div className="text-xs text-gray-500">
                        {card.completedCampaigns || 0} кампаний
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center space-x-2">
                        {getModerationIcon((card as any).moderationStatus || 'approved')}
                        <span className="text-sm text-gray-900">
                          {(card as any).moderationStatus === 'approved' ? 'Одобрено' :
                           (card as any).moderationStatus === 'pending' ? 'На проверке' :
                           (card as any).moderationStatus === 'flagged' ? 'Помечено' :
                           (card as any).moderationStatus === 'rejected' ? 'Отклонено' : 'Одобрено'}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(card.createdAt).toLocaleDateString('ru-RU')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center justify-end space-x-2">
                        <button
                          onClick={() => window.open(`/cards/${card.id}`, '_blank')}
                          className="text-blue-600 hover:text-blue-900 transition-colors"
                          title="Просмотреть карточку"
                        >
                          <Eye className="w-4 h-4" />
                        </button>

                        <button
                          onClick={() => handleDeleteCard(card.id)}
                          className="text-red-600 hover:text-red-900 transition-colors"
                          title="Удалить карточку"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {!isLoading && filteredCards.length === 0 && (
          <div className="text-center py-12">
            <Grid className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Карточки не найдены</h3>
            <p className="text-gray-600">Попробуйте изменить фильтры поиска</p>
          </div>
        )}
      </div>
    </div>
  );
}
