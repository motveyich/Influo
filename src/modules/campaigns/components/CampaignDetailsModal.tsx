import React, { useState, useEffect } from 'react';
import { X, MapPin, DollarSign, Calendar, Users, Globe, Briefcase, Star, Flag, UserCircle, Send } from 'lucide-react';
import { Campaign } from '../../../core/types';
import { campaignService } from '../services/campaignService';
import { UserPublicProfileModal } from '../../profiles/components/UserPublicProfileModal';
import { ReportModal } from '../../../components/ReportModal';
import toast from 'react-hot-toast';

interface CampaignDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  campaignId: string;
  currentUserId: string;
  onApply?: (campaignId: string) => void;
}

export function CampaignDetailsModal({
  isOpen,
  onClose,
  campaignId,
  currentUserId,
  onApply
}: CampaignDetailsModalProps) {
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);

  useEffect(() => {
    if (isOpen && campaignId) {
      loadCampaignDetails();
    }
  }, [isOpen, campaignId]);

  const loadCampaignDetails = async () => {
    try {
      setIsLoading(true);
      const data = await campaignService.getCampaignById(campaignId);
      setCampaign(data);
    } catch (error) {
      console.error('Failed to load campaign details:', error);
      toast.error('Не удалось загрузить детали кампании');
    } finally {
      setIsLoading(false);
    }
  };

  const handleApply = () => {
    if (onApply && campaign) {
      onApply(campaign.campaignId);
      onClose();
    }
  };

  const formatBudget = (min: number, max: number, currency: string) => {
    const formatter = new Intl.NumberFormat('ru-RU', {
      style: 'currency',
      currency: currency || 'RUB',
      minimumFractionDigits: 0,
    });
    return `${formatter.format(min)} - ${formatter.format(max)}`;
  };

  const formatAudienceSize = (min: number, max: number) => {
    const formatNumber = (num: number) => {
      if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
      if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
      return num.toString();
    };
    return `${formatNumber(min)} - ${formatNumber(max)}`;
  };

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
        <div className="bg-white dark:bg-gray-800 rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
          {/* Header */}
          <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4 flex items-center justify-between z-10">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              Детали кампании
            </h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Content */}
          <div className="p-6 space-y-6">
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
              </div>
            ) : campaign ? (
              <>
                {/* Campaign Title & Brand */}
                <div>
                  <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                    {campaign.title}
                  </h3>
                  <p className="text-lg text-blue-600 dark:text-blue-400 font-medium">
                    {campaign.brand}
                  </p>
                </div>

                {/* Description */}
                <div>
                  <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Описание
                  </h4>
                  <p className="text-gray-600 dark:text-gray-400">
                    {campaign.description}
                  </p>
                </div>

                {/* Budget */}
                <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
                  <div className="flex items-center space-x-2 mb-2">
                    <DollarSign className="w-5 h-5 text-green-600 dark:text-green-400" />
                    <h4 className="text-sm font-medium text-green-900 dark:text-green-300">
                      Бюджет
                    </h4>
                  </div>
                  <p className="text-lg font-semibold text-green-900 dark:text-green-300">
                    {formatBudget(campaign.budget.min, campaign.budget.max, campaign.budget.currency)}
                  </p>
                </div>

                {/* Timeline */}
                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                  <div className="flex items-center space-x-2 mb-2">
                    <Calendar className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                    <h4 className="text-sm font-medium text-blue-900 dark:text-blue-300">
                      Сроки
                    </h4>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm text-blue-900 dark:text-blue-300">
                      Начало: {new Date(campaign.timeline.startDate).toLocaleDateString('ru-RU')}
                    </p>
                    <p className="text-sm text-blue-900 dark:text-blue-300">
                      Окончание: {new Date(campaign.timeline.endDate).toLocaleDateString('ru-RU')}
                    </p>
                  </div>
                </div>

                {/* Preferences */}
                <div>
                  <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                    Требования к инфлюенсеру
                  </h4>

                  <div className="space-y-4">
                    {/* Platforms */}
                    <div>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">Платформы:</p>
                      <div className="flex flex-wrap gap-2">
                        {campaign.preferences.platforms.map((platform) => (
                          <span
                            key={platform}
                            className="px-3 py-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 text-sm rounded-md"
                          >
                            {platform}
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* Content Types */}
                    <div>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">Типы контента:</p>
                      <div className="flex flex-wrap gap-2">
                        {campaign.preferences.contentTypes.map((type) => (
                          <span
                            key={type}
                            className="px-3 py-1 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 text-sm rounded-md"
                          >
                            {type}
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* Audience Size */}
                    <div className="flex items-center space-x-2">
                      <Users className="w-4 h-4 text-gray-500" />
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        Размер аудитории:{' '}
                        <span className="font-medium text-gray-900 dark:text-white">
                          {formatAudienceSize(
                            campaign.preferences.audienceSize.min,
                            campaign.preferences.audienceSize.max
                          )}
                        </span>
                      </p>
                    </div>

                    {/* Demographics */}
                    {campaign.preferences.demographics.countries.length > 0 && (
                      <div className="flex items-center space-x-2">
                        <MapPin className="w-4 h-4 text-gray-500" />
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          Страны:{' '}
                          <span className="font-medium text-gray-900 dark:text-white">
                            {campaign.preferences.demographics.countries.join(', ')}
                          </span>
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Metrics */}
                <div className="grid grid-cols-3 gap-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                  <div className="text-center">
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">
                      {campaign.metrics.applicants}
                    </p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Заявок</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">
                      {campaign.metrics.accepted}
                    </p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Принято</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">
                      {campaign.metrics.impressions ? `${(campaign.metrics.impressions / 1000).toFixed(0)}K` : '0'}
                    </p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Показов</p>
                  </div>
                </div>
              </>
            ) : (
              <p className="text-center text-gray-600 dark:text-gray-400">
                Не удалось загрузить детали кампании
              </p>
            )}
          </div>

          {/* Footer Actions */}
          {campaign && (
            <div className="sticky bottom-0 bg-gray-50 dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700 px-6 py-4">
              <div className="flex space-x-3">
                <button
                  onClick={handleApply}
                  disabled={campaign.status !== 'active'}
                  className={`flex-1 flex items-center justify-center space-x-2 py-3 px-4 rounded-md text-sm font-medium transition-colors ${
                    campaign.status === 'active'
                      ? 'bg-blue-600 hover:bg-blue-700 text-white'
                      : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  }`}
                >
                  <Send className="w-4 h-4" />
                  <span>Подать заявку</span>
                </button>

                <button
                  onClick={() => setShowProfileModal(true)}
                  className="flex items-center justify-center space-x-2 px-4 py-3 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-md text-sm font-medium transition-colors"
                >
                  <UserCircle className="w-4 h-4" />
                  <span>Профиль</span>
                </button>

                <button
                  onClick={() => setShowReportModal(true)}
                  className="px-4 py-3 border border-red-300 dark:border-red-700 text-red-700 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-md text-sm font-medium transition-colors"
                  title="Пожаловаться"
                >
                  <Flag className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Profile Modal */}
      {showProfileModal && campaign && (
        <UserPublicProfileModal
          userId={campaign.advertiserId}
          currentUserId={currentUserId}
          onClose={() => setShowProfileModal(false)}
        />
      )}

      {/* Report Modal */}
      {campaign && (
        <ReportModal
          isOpen={showReportModal}
          onClose={() => setShowReportModal(false)}
          targetType="campaign"
          targetId={campaign.campaignId}
          targetTitle={campaign.title}
        />
      )}
    </>
  );
}
