import React, { useState, useEffect } from 'react';
import { Campaign, ModerationStatus } from '../../../core/types';
import { adminService } from '../../../services/adminService';
import { useAuth } from '../../../hooks/useAuth';
import { 
  Search, 
  Filter, 
  Target, 
  Trash2, 
  Eye, 
  AlertTriangle,
  CheckCircle,
  Clock,
  XCircle
} from 'lucide-react';
import toast from 'react-hot-toast';

interface CampaignsManagementProps {
  onStatsUpdate: () => void;
}

export function CampaignsManagement({ onStatsUpdate }: CampaignsManagementProps) {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [moderationFilter, setModerationFilter] = useState<ModerationStatus | 'all'>('all');
  const [showDeleted, setShowDeleted] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const { user: currentUser } = useAuth();

  useEffect(() => {
    loadCampaigns();
  }, [statusFilter, moderationFilter, showDeleted]);

  const loadCampaigns = async () => {
    try {
      setIsLoading(true);
      const loadedCampaigns = await adminService.getAllCampaigns({
        status: statusFilter !== 'all' ? statusFilter : undefined,
        moderationStatus: moderationFilter !== 'all' ? moderationFilter : undefined,
        isDeleted: showDeleted
      });
      setCampaigns(loadedCampaigns);
    } catch (error) {
      console.error('Failed to load campaigns:', error);
      toast.error('Не удалось загрузить кампании');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteCampaign = async (campaignId: string) => {
    if (!confirm('Вы уверены, что хотите удалить эту кампанию?')) return;

    try {
      await adminService.deleteCampaign(campaignId, currentUser!.id);
      await loadCampaigns();
      onStatsUpdate();
      toast.success('Кампания удалена');
    } catch (error: any) {
      console.error('Failed to delete campaign:', error);
      toast.error(error.message || 'Не удалось удалить кампанию');
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active':
        return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'paused':
        return <Clock className="w-4 h-4 text-yellow-600" />;
      case 'completed':
        return <CheckCircle className="w-4 h-4 text-blue-600" />;
      case 'cancelled':
        return <XCircle className="w-4 h-4 text-red-600" />;
      default:
        return <Clock className="w-4 h-4 text-gray-600" />;
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

  const formatCurrency = (min: number, max: number, currency: string) => {
    const formatter = new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency || 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    });
    
    if (min === max) {
      return formatter.format(min);
    }
    return `${formatter.format(min)} - ${formatter.format(max)}`;
  };

  const filteredCampaigns = campaigns.filter(campaign =>
    campaign.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    campaign.brand.toLowerCase().includes(searchQuery.toLowerCase()) ||
    campaign.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Управление кампаниями</h2>
          <p className="text-sm text-gray-600">Просмотр и модерация рекламных кампаний</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row space-y-4 sm:space-y-0 sm:space-x-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            type="text"
            placeholder="Поиск кампаний..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
        
        <div className="flex space-x-2">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">Все статусы</option>
            <option value="active">Активные</option>
            <option value="draft">Черновики</option>
            <option value="paused">Приостановленные</option>
            <option value="completed">Завершенные</option>
            <option value="cancelled">Отмененные</option>
          </select>
          
          <select
            value={moderationFilter}
            onChange={(e) => setModerationFilter(e.target.value as ModerationStatus | 'all')}
            className="border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">Все модерации</option>
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

      {/* Campaigns Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Загрузка кампаний...</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Кампания
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Бюджет
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Статус
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
                {filteredCampaigns.map((campaign) => (
                  <tr key={campaign.campaignId} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div>
                        <div className="text-sm font-medium text-gray-900 line-clamp-1">
                          {campaign.title}
                        </div>
                        <div className="text-sm text-gray-500">{campaign.brand}</div>
                        <div className="text-xs text-gray-400 line-clamp-1 mt-1">
                          {campaign.description}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatCurrency(campaign.budget.min, campaign.budget.max, campaign.budget.currency)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center space-x-2">
                        {getStatusIcon(campaign.status)}
                        <span className="text-sm text-gray-900 capitalize">{campaign.status}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center space-x-2">
                        {getModerationIcon((campaign as any).moderationStatus || 'approved')}
                        <span className="text-sm text-gray-900">
                          {(campaign as any).moderationStatus === 'approved' ? 'Одобрено' :
                           (campaign as any).moderationStatus === 'pending' ? 'На проверке' :
                           (campaign as any).moderationStatus === 'flagged' ? 'Помечено' :
                           (campaign as any).moderationStatus === 'rejected' ? 'Отклонено' : 'Одобрено'}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(campaign.createdAt).toLocaleDateString('ru-RU')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center justify-end space-x-2">
                        <button
                          onClick={() => window.open(`/campaigns/${campaign.campaignId}`, '_blank')}
                          className="text-blue-600 hover:text-blue-900 transition-colors"
                          title="Просмотреть кампанию"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        
                        <button
                          onClick={() => handleDeleteCampaign(campaign.campaignId)}
                          className="text-red-600 hover:text-red-900 transition-colors"
                          title="Удалить кампанию"
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

        {!isLoading && filteredCampaigns.length === 0 && (
          <div className="text-center py-12">
            <Target className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Кампании не найдены</h3>
            <p className="text-gray-600">Попробуйте изменить фильтры поиска</p>
          </div>
        )}
      </div>
    </div>
  );
}