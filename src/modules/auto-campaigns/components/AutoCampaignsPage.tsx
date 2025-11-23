import React, { useState, useEffect } from 'react';
import { AutoCampaign } from '../../../core/types';
import { autoCampaignService } from '../services/autoCampaignService';
import { useAuth } from '../../../hooks/useAuth';
import { useTranslation } from '../../../hooks/useTranslation';
import { Plus, Target, Users, DollarSign, CheckCircle, Clock, PlayCircle, XCircle } from 'lucide-react';
import { AutoCampaignModal } from './AutoCampaignModal';
import toast from 'react-hot-toast';
import { format } from 'date-fns';

export function AutoCampaignsPage() {
  const [campaigns, setCampaigns] = useState<AutoCampaign[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [selectedCampaign, setSelectedCampaign] = useState<AutoCampaign | null>(null);

  const { user } = useAuth();
  const { t } = useTranslation();
  const currentUserId = user?.id || '';

  useEffect(() => {
    if (currentUserId) {
      loadCampaigns();
    }
  }, [currentUserId]);

  const loadCampaigns = async () => {
    try {
      setIsLoading(true);
      const data = await autoCampaignService.getCampaigns(currentUserId);
      setCampaigns(data);
    } catch (error) {
      console.error('Failed to load campaigns:', error);
      toast.error('Не удалось загрузить автокомпании');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateCampaign = () => {
    setSelectedCampaign(null);
    setShowModal(true);
  };

  const handleLaunchCampaign = async (campaign: AutoCampaign) => {
    if (!confirm(`Запустить автокомпанию "${campaign.title}"? Система автоматически подберёт инфлюенсеров и отправит предложения.`)) {
      return;
    }

    try {
      await autoCampaignService.launchCampaign(campaign.id, currentUserId);
      toast.success('Автокомпания запущена!');
      loadCampaigns();
    } catch (error) {
      console.error('Failed to launch campaign:', error);
      toast.error('Не удалось запустить автокомпанию');
    }
  };

  const handleDeleteCampaign = async (campaign: AutoCampaign) => {
    if (!confirm(`Удалить автокомпанию "${campaign.title}"?`)) {
      return;
    }

    try {
      await autoCampaignService.deleteCampaign(campaign.id);
      toast.success('Автокомпания удалена');
      loadCampaigns();
    } catch (error) {
      console.error('Failed to delete campaign:', error);
      toast.error('Не удалось удалить автокомпанию');
    }
  };

  const getStatusBadge = (status: string) => {
    const badges = {
      draft: { text: 'Черновик', color: 'bg-gray-100 text-gray-700', icon: Clock },
      active: { text: 'Активна', color: 'bg-blue-100 text-blue-700', icon: PlayCircle },
      closed: { text: 'Набор завершён', color: 'bg-orange-100 text-orange-700', icon: XCircle },
      completed: { text: 'Завершена', color: 'bg-green-100 text-green-700', icon: CheckCircle }
    };

    const badge = badges[status as keyof typeof badges] || badges.draft;
    const Icon = badge.icon;

    return (
      <span className={`inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${badge.color}`}>
        <Icon className="w-3 h-3" />
        <span>{badge.text}</span>
      </span>
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Автоматические кампании</h1>
          <p className="mt-2 text-sm text-gray-600">
            Автоматический подбор инфлюенсеров по вашим критериям
          </p>
        </div>
        <button
          onClick={handleCreateCampaign}
          className="bg-gradient-to-r from-blue-600 to-blue-600 hover:from-blue-700 hover:to-blue-700 text-white px-6 py-3 rounded-md text-sm font-medium flex items-center space-x-2 transition-all shadow-lg hover:shadow-xl"
        >
          <Plus className="w-4 h-4" />
          <span>Создать автокомпанию</span>
        </button>
      </div>

      {/* Campaigns list */}
      {campaigns.length === 0 ? (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
          <Target className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Нет автокомпаний</h3>
          <p className="text-gray-600 mb-6">
            Создайте первую автокомпанию для автоматического подбора инфлюенсеров
          </p>
          <button
            onClick={handleCreateCampaign}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-md text-sm font-medium transition-colors"
          >
            Создать первую автокомпанию
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6">
          {campaigns.map((campaign) => (
            <div key={campaign.id} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <div className="flex items-center space-x-3 mb-2">
                    <h3 className="text-lg font-semibold text-gray-900">{campaign.title}</h3>
                    {getStatusBadge(campaign.status)}
                  </div>
                  {campaign.description && (
                    <p className="text-sm text-gray-600 mb-4">{campaign.description}</p>
                  )}
                </div>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-4">
                <div className="flex items-center space-x-2">
                  <DollarSign className="w-5 h-5 text-green-600" />
                  <div>
                    <p className="text-xs text-gray-500">Бюджет</p>
                    <p className="text-sm font-medium text-gray-900">
                      {campaign.budgetMin}-{campaign.budgetMax} ₽
                    </p>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <Users className="w-5 h-5 text-blue-600" />
                  <div>
                    <p className="text-xs text-gray-500">Аудитория</p>
                    <p className="text-sm font-medium text-gray-900">
                      {campaign.audienceMin.toLocaleString()}-{campaign.audienceMax.toLocaleString()}
                    </p>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <Target className="w-5 h-5 text-orange-600" />
                  <div>
                    <p className="text-xs text-gray-500">Цель</p>
                    <p className="text-sm font-medium text-gray-900">
                      {campaign.targetInfluencersCount} инфл.
                    </p>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                  <div>
                    <p className="text-xs text-gray-500">Прогресс</p>
                    <p className="text-sm font-medium text-gray-900">
                      {campaign.acceptedOffersCount}/{campaign.targetInfluencersCount}
                    </p>
                  </div>
                </div>
              </div>

              {/* Additional info */}
              <div className="flex items-center space-x-4 text-xs text-gray-500 mb-4">
                <span>Отправлено: {campaign.sentOffersCount}</span>
                <span>Принято: {campaign.acceptedOffersCount}</span>
                <span>Завершено: {campaign.completedOffersCount}</span>
              </div>

              {/* Actions */}
              <div className="flex items-center space-x-3">
                {campaign.status === 'draft' && (
                  <>
                    <button
                      onClick={() => handleLaunchCampaign(campaign)}
                      className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors"
                    >
                      Запустить
                    </button>
                    <button
                      onClick={() => handleDeleteCampaign(campaign)}
                      className="text-red-600 hover:text-red-700 px-4 py-2 text-sm font-medium transition-colors"
                    >
                      Удалить
                    </button>
                  </>
                )}
                {campaign.status === 'active' && (
                  <span className="text-sm text-blue-600 font-medium">
                    ⚡ Кампания активна, предложения отправляются
                  </span>
                )}
                {campaign.status === 'closed' && (
                  <span className="text-sm text-orange-600 font-medium">
                    ✓ Набор завершён, ожидаем завершения сотрудничеств
                  </span>
                )}
                {campaign.status === 'completed' && (
                  <span className="text-sm text-green-600 font-medium">
                    ✓ Кампания полностью завершена
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <AutoCampaignModal
          isOpen={showModal}
          onClose={() => setShowModal(false)}
          onSuccess={() => {
            setShowModal(false);
            loadCampaigns();
          }}
          advertiserId={currentUserId}
        />
      )}
    </div>
  );
}
