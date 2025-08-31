import React from 'react';
import { Campaign } from '../../../core/types';
import { CreateOfferModal } from '../../offers/components/CreateOfferModal';
import { useTranslation } from '../../../hooks/useTranslation';
import { Calendar, DollarSign, Users, MapPin, Clock, Edit, Trash2, Search, MoreVertical, Zap, Target, TrendingUp, Pause, Play, Flag } from 'lucide-react';
import { formatDistanceToNow, parseISO } from 'date-fns';
import { ReportModal } from '../../../components/ReportModal';

interface CampaignCardProps {
  campaign: Campaign;
  onApply?: (campaignId: string) => void;
  showActions?: boolean;
  onEdit?: (campaign: Campaign) => void;
  onDelete?: (campaignId: string) => void;
  onFindInfluencers?: (campaign: Campaign) => void;
  currentUserId?: string;
}

export function CampaignCard({ 
  campaign, 
  onApply, 
  showActions = false,
  onEdit,
  onDelete,
  onFindInfluencers,
  currentUserId
}: CampaignCardProps) {
  const [showOfferModal, setShowOfferModal] = React.useState(false);
  const [showReportModal, setShowReportModal] = React.useState(false);
  const { t } = useTranslation();

  // Check if this is an automatic campaign
  const isAutomaticCampaign = (campaign as any).metadata?.isAutomatic;
  const automaticSettings = (campaign as any).metadata?.automaticSettings;

  const getStatusColor = (status: Campaign['status']) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800';
      case 'draft':
        return 'bg-gray-100 text-gray-800';
      case 'paused':
        return 'bg-yellow-100 text-yellow-800';
      case 'completed':
        return 'bg-blue-100 text-blue-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      case 'paused':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: Campaign['status']) => {
    switch (status) {
      case 'active':
        return <Play className="w-3 h-3" />;
      case 'paused':
        return <Pause className="w-3 h-3" />;
      case 'completed':
        return <Target className="w-3 h-3" />;
      default:
        return null;
    }
  };

  const formatBudget = (min: number, max: number, currency: string) => {
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

  const formatAudienceSize = (min: number, max: number) => {
    const formatNumber = (num: number) => {
      if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
      if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
      return num.toString();
    };

    if (min === max) {
      return formatNumber(min);
    }
    return `${formatNumber(min)} - ${formatNumber(max)}`;
  };

  return (
    <div className="bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow duration-200 p-6">
      {/* Header */}
      <div className="flex justify-between items-start mb-4">
        <div className="flex-1">
          <div className="flex items-center space-x-3 mb-2">
            {isAutomaticCampaign && (
              <div className="flex items-center space-x-1 px-2 py-1 bg-gradient-to-r from-purple-100 to-blue-100 text-purple-700 rounded-md">
                <Zap className="w-3 h-3" />
                <span className="text-xs font-medium">Автоматическая</span>
              </div>
            )}
            <h3 className="text-lg font-semibold text-gray-900 line-clamp-1">
              {campaign.title}
            </h3>
            <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(campaign.status)}`}>
              <div className="flex items-center space-x-1">
                {getStatusIcon(campaign.status)}
                <span>
                  {campaign.status === 'active' ? 'Активная' :
               campaign.status === 'draft' ? 'Черновик' :
               campaign.status === 'paused' ? 'Приостановлена' :
               campaign.status === 'completed' ? 'Завершена' :
               campaign.status === 'cancelled' ? 'Отменена' :
                   campaign.status}
                </span>
              </div>
            </span>
          </div>
          <p className="text-sm font-medium text-purple-600 mb-2">{campaign.brand}</p>
          <p className="text-sm text-gray-600 line-clamp-2">{campaign.description}</p>
        </div>
        
        {showActions && (
          <div className="flex items-center space-x-2 ml-4">
            <button
              onClick={() => onFindInfluencers?.(campaign)}
              className="p-2 text-gray-400 hover:text-blue-600 transition-colors"
              title="Find influencers"
            >
              <Search className="w-4 h-4" />
            </button>
            <button
              onClick={() => onEdit?.(campaign)}
              className="p-2 text-gray-400 hover:text-green-600 transition-colors"
              title="Edit campaign"
            >
              <Edit className="w-4 h-4" />
            </button>
            <button
              onClick={() => onDelete?.(campaign.campaignId)}
              className="p-2 text-gray-400 hover:text-red-600 transition-colors"
              title="Delete campaign"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {/* Budget and Timeline */}
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div className="flex items-center space-x-2">
          <DollarSign className="w-4 h-4 text-green-600" />
          <div>
            <p className="text-sm font-medium text-gray-900">
              {formatBudget(campaign.budget.min, campaign.budget.max, campaign.budget.currency)}
            </p>
            <p className="text-xs text-gray-600">{t('campaigns.budget')}</p>
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          <Calendar className="w-4 h-4 text-blue-600" />
          <div>
            <p className="text-sm font-medium text-gray-900">
              {campaign.timeline.endDate 
                ? formatDistanceToNow(parseISO(campaign.timeline.endDate))
                : 'Без дедлайна'
              }
            </p>
            <p className="text-xs text-gray-600">Дедлайн</p>
          </div>
        </div>
      </div>

      {/* Preferences */}
      <div className="space-y-3 mb-4">
        {/* Platforms */}
        <div className="flex items-center space-x-2">
          <span className="text-sm font-medium text-gray-700">{t('campaigns.platforms')}:</span>
          <div className="flex flex-wrap gap-1">
            {campaign.preferences.platforms.slice(0, 3).map((platform) => (
              <span
                key={platform}
                className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded-md"
              >
                {platform}
              </span>
            ))}
            {campaign.preferences.platforms.length > 3 && (
              <span className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded-md">
                +{campaign.preferences.platforms.length - 3} more
              </span>
            )}
          </div>
        </div>

        {/* Audience Size */}
        <div className="flex items-center space-x-2">
          <Users className="w-4 h-4 text-purple-600" />
          <span className="text-sm text-gray-600">
            Аудитория: {formatAudienceSize(
              campaign.preferences.audienceSize.min,
              campaign.preferences.audienceSize.max
            )} подписчиков
          </span>
        </div>

        {/* Countries */}
        {campaign.preferences.demographics.countries.length > 0 && (
          <div className="flex items-center space-x-2">
            <MapPin className="w-4 h-4 text-red-600" />
            <span className="text-sm text-gray-600">
              {campaign.preferences.demographics.countries.slice(0, 3).join(', ')}
              {campaign.preferences.demographics.countries.length > 3 && 
                ` +${campaign.preferences.demographics.countries.length - 3} more`
              }
            </span>
          </div>
        )}
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-3 gap-4 mb-4 pt-4 border-t border-gray-200">
        <div className="text-center">
          <p className="text-lg font-semibold text-gray-900">
            {isAutomaticCampaign ? 'Авто' : campaign.metrics.applicants}
          </p>
          <p className="text-xs text-gray-600">
            {isAutomaticCampaign ? 'Подбор' : t('campaigns.stats.applicants')}
          </p>
        </div>
        <div className="text-center">
          <p className="text-lg font-semibold text-gray-900">{campaign.metrics.accepted}</p>
          <p className="text-xs text-gray-600">{t('campaigns.stats.accepted')}</p>
        </div>
        <div className="text-center">
          <p className="text-lg font-semibold text-gray-900">
            {campaign.metrics.impressions ? `${(campaign.metrics.impressions / 1000).toFixed(0)}K` : '0'}
          </p>
          <p className="text-xs text-gray-600">{t('campaigns.stats.impressions')}</p>
        </div>
      </div>

      {/* Automatic Campaign Info */}
      {isAutomaticCampaign && automaticSettings && (
        <div className="bg-gradient-to-r from-purple-50 to-blue-50 border border-purple-200 rounded-lg p-3 mb-4">
          <div className="flex items-center space-x-2 mb-2">
            <Zap className="w-4 h-4 text-purple-600" />
            <span className="text-sm font-medium text-purple-800">Автоматические настройки</span>
          </div>
          <div className="grid grid-cols-2 gap-2 text-xs text-purple-700">
            <span>Цель: {automaticSettings.targetInfluencerCount} инфлюенсеров</span>
            <span>Овербукинг: {automaticSettings.overbookingPercentage}%</span>
            <span>Размер пакета: {automaticSettings.batchSize}</span>
            <span>Задержка: {automaticSettings.batchDelay} мин</span>
          </div>
        </div>
      )}

      {/* Created Date */}
      <div className="flex items-center space-x-2 text-xs text-gray-500 mb-4">
        <Clock className="w-3 h-3" />
        <span>Создано {formatDistanceToNow(parseISO(campaign.createdAt), { addSuffix: true })}</span>
      </div>

      {/* Actions */}
      {onApply && (
        <div className="flex space-x-3">
          <button
            onClick={() => onApply?.(campaign.campaignId)}
            disabled={campaign.status !== 'active'}
            className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
              campaign.status === 'active'
                ? 'bg-purple-600 hover:bg-purple-700 text-white'
                : 'bg-gray-100 text-gray-400 cursor-not-allowed'
            }`}
          >
            {campaign.status === 'active' ? 'Подать заявку' : 'Недоступно'}
          </button>
          <button 
            onClick={() => setShowOfferModal(true)}
            disabled={campaign.status !== 'active'}
            className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            Отправить предложение
          </button>
          <button
            onClick={() => setShowReportModal(true)}
            className="px-3 py-2 border border-red-300 text-red-700 hover:bg-red-50 rounded-md text-sm font-medium transition-colors"
            title="Пожаловаться"
          >
            <Flag className="w-4 h-4" />
          </button>
        </div>
      )}

      {showActions && (
        <div className="flex space-x-3 mt-4 pt-4 border-t border-gray-200">
          <button
            onClick={() => onFindInfluencers?.(campaign)}
            disabled={!isAutomaticCampaign}
            className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors flex items-center justify-center space-x-2 ${
              isAutomaticCampaign
                ? 'bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white'
                : 'bg-gray-100 text-gray-400 cursor-not-allowed'
            }`}
          >
            <Zap className="w-4 h-4" />
            <span>{isAutomaticCampaign ? 'Перезапустить подбор' : 'Только для автоматических'}</span>
          </button>
          <button
            onClick={() => onEdit?.(campaign)}
            className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
          >
            {t('common.edit')}
          </button>
        </div>
      )}

      {/* Create Offer Modal */}
      <CreateOfferModal
        isOpen={showOfferModal}
        onClose={() => setShowOfferModal(false)}
        campaign={campaign}
        influencerId={currentUserId || ''}
        advertiserId={campaign.advertiserId}
        onOfferSent={() => {
          setShowOfferModal(false);
          // Could show success message or redirect
        }}
      />

      {/* Report Modal */}
      <ReportModal
        isOpen={showReportModal}
        onClose={() => setShowReportModal(false)}
        targetType="campaign"
        targetId={campaign.campaignId}
        targetTitle={campaign.title}
      />
    </div>
  );
}