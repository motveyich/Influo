import React, { useState, useEffect } from 'react';
import { AutoCampaign } from '../../../core/types';
import { autoCampaignService } from '../services/autoCampaignService';
import { useAuth } from '../../../hooks/useAuth';
import { useTranslation } from '../../../hooks/useTranslation';
import { Plus, Target, Users, DollarSign, CheckCircle, Clock, PlayCircle, XCircle, Edit, Eye, Calendar, Sparkles } from 'lucide-react';
import { AutoCampaignModal } from './AutoCampaignModal';
import { AutoCampaignDetailsModal } from './AutoCampaignDetailsModal';
import toast from 'react-hot-toast';
import { format } from 'date-fns';

type TabType = 'all' | 'my_campaigns';

export function AutoCampaignsPage() {
  const [activeTab, setActiveTab] = useState<TabType>('all');
  const [allCampaigns, setAllCampaigns] = useState<AutoCampaign[]>([]);
  const [myCampaigns, setMyCampaigns] = useState<AutoCampaign[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedCampaign, setSelectedCampaign] = useState<AutoCampaign | null>(null);
  const [editingCampaign, setEditingCampaign] = useState<AutoCampaign | null>(null);

  const { user } = useAuth();
  const { t } = useTranslation();
  const currentUserId = user?.id || '';

  useEffect(() => {
    if (currentUserId) {
      loadCampaigns();
    }
  }, [currentUserId, activeTab]);

  const loadCampaigns = async () => {
    try {
      setIsLoading(true);

      if (activeTab === 'all') {
        // Загружаем все активные кампании для просмотра
        const data = await autoCampaignService.getActiveCampaigns();
        setAllCampaigns(data);
      } else {
        // Загружаем только свои кампании
        const data = await autoCampaignService.getCampaigns(currentUserId);
        setMyCampaigns(data);
      }
    } catch (error) {
      console.error('Failed to load campaigns:', error);
      toast.error('Не удалось загрузить автокампании');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateCampaign = () => {
    setEditingCampaign(null);
    setShowModal(true);
  };

  const handleLaunchCampaign = async (campaign: AutoCampaign) => {
    if (!confirm(`Запустить автокампанию "${campaign.title}"? Система автоматически подберёт инфлюенсеров и отправит предложения.`)) {
      return;
    }

    try {
      await autoCampaignService.launchCampaign(campaign.id, currentUserId);
      toast.success('Автокампания запущена!');
      loadCampaigns();
    } catch (error) {
      console.error('Failed to launch campaign:', error);

      const errorMessage = error instanceof Error
        ? error.message
        : 'Не удалось запустить автокампанию';

      toast.error(errorMessage);
    }
  };

  const handleDeleteCampaign = async (campaign: AutoCampaign) => {
    if (!confirm(`Удалить автокампанию "${campaign.title}"?`)) {
      return;
    }

    try {
      await autoCampaignService.deleteCampaign(campaign.id);
      toast.success('Автокампания удалена');
      loadCampaigns();
    } catch (error) {
      console.error('Failed to delete campaign:', error);
      toast.error('Не удалось удалить автокампанию');
    }
  };

  const handleViewDetails = (campaign: AutoCampaign) => {
    setSelectedCampaign(campaign);
    setShowDetailsModal(true);
  };

  const handleEditCampaign = (campaign: AutoCampaign) => {
    setEditingCampaign(campaign);
    setShowModal(true);
  };

  const getStatusBadge = (status: string) => {
    const badges = {
      draft: { text: 'Черновик', color: 'bg-gray-100 text-gray-700' },
      active: { text: 'Активна', color: 'bg-green-100 text-green-700' },
      closed: { text: 'Набор завершён', color: 'bg-orange-100 text-orange-700' },
      completed: { text: 'Завершена', color: 'bg-blue-100 text-blue-700' }
    };

    const badge = badges[status as keyof typeof badges] || badges.draft;

    return (
      <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${badge.color}`}>
        {badge.text}
      </span>
    );
  };

  const isMyCard = (campaign: AutoCampaign) => {
    return campaign.advertiserId === currentUserId;
  };

  const campaignsToShow = activeTab === 'all' ? allCampaigns : myCampaigns;

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
      <div className="mb-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Автоматические кампании</h1>
            <p className="mt-2 text-sm text-gray-600">
              Автоматический подбор инфлюенсеров по вашим критериям
            </p>
          </div>
          <button
            onClick={handleCreateCampaign}
            className="bg-gradient-to-r from-blue-600 to-blue-600 hover:from-blue-700 hover:to-blue-700 text-white px-6 py-3 rounded-lg text-sm font-medium flex items-center space-x-2 transition-all shadow-lg hover:shadow-xl"
          >
            <Plus className="w-4 h-4" />
            <span>Создать автокампанию</span>
          </button>
        </div>

        {/* Tabs */}
        <div className="flex items-center space-x-2 border-b border-gray-200">
          <button
            onClick={() => setActiveTab('all')}
            className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'all'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <div className="flex items-center space-x-2">
              <Sparkles className="w-4 h-4" />
              <span>Все кампании</span>
            </div>
          </button>
          <button
            onClick={() => setActiveTab('my_campaigns')}
            className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'my_campaigns'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <div className="flex items-center space-x-2">
              <Target className="w-4 h-4" />
              <span>Мои кампании</span>
            </div>
          </button>
        </div>
      </div>

      {/* Campaigns Grid */}
      {campaignsToShow.length === 0 ? (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
          <Target className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            {activeTab === 'all' ? 'Нет активных автокампаний' : 'Нет автокампаний'}
          </h3>
          <p className="text-gray-600 mb-6">
            {activeTab === 'all'
              ? 'Пока нет активных кампаний для участия'
              : 'Создайте первую автокампанию для автоматического подбора инфлюенсеров'
            }
          </p>
          {activeTab === 'my_campaigns' && (
            <button
              onClick={handleCreateCampaign}
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg text-sm font-medium transition-colors"
            >
              Создать первую автокампанию
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {campaignsToShow.map((campaign) => (
            <div
              key={campaign.id}
              className="bg-white rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-all overflow-hidden group cursor-pointer"
              onClick={() => handleViewDetails(campaign)}
            >
              {/* Status Badge - Floating */}
              <div className="absolute top-3 right-3 z-10">
                {getStatusBadge(campaign.status)}
              </div>

              {/* Header */}
              <div className="p-6 bg-gradient-to-br from-blue-50 to-white relative">
                <div className="flex items-start space-x-3">
                  <div className="flex-shrink-0 w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                    <Target className="w-6 h-6 text-blue-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-lg font-semibold text-gray-900 mb-1 line-clamp-1 group-hover:text-blue-600 transition-colors">
                      {campaign.title}
                    </h3>
                    {campaign.description && (
                      <p className="text-sm text-gray-600 line-clamp-2">{campaign.description}</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Stats */}
              <div className="p-6 space-y-4">
                {/* Budget & Audience */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Бюджет</p>
                    <p className="text-sm font-semibold text-gray-900">
                      {campaign.budgetMin.toLocaleString()}-{campaign.budgetMax.toLocaleString()} ₽
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Аудитория</p>
                    <p className="text-sm font-semibold text-gray-900">
                      {campaign.audienceMin.toLocaleString()}-{campaign.audienceMax.toLocaleString()}
                    </p>
                  </div>
                </div>

                {/* Progress */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-xs text-gray-500">Прогресс</p>
                    <p className="text-xs font-medium text-gray-900">
                      {campaign.acceptedOffersCount}/{campaign.targetInfluencersCount}
                    </p>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-blue-600 h-2 rounded-full transition-all"
                      style={{
                        width: `${Math.min(
                          (campaign.acceptedOffersCount / campaign.targetInfluencersCount) * 100,
                          100
                        )}%`
                      }}
                    />
                  </div>
                </div>

                {/* Platforms & Content Types */}
                <div className="flex flex-wrap gap-1.5">
                  {campaign.platforms.slice(0, 3).map((platform) => (
                    <span
                      key={platform}
                      className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded-md capitalize"
                    >
                      {platform}
                    </span>
                  ))}
                  {campaign.platforms.length > 3 && (
                    <span className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded-md">
                      +{campaign.platforms.length - 3}
                    </span>
                  )}
                </div>

                {/* Additional Stats */}
                {activeTab === 'my_campaigns' && (
                  <div className="pt-4 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500">
                    <span>Отправлено: {campaign.sentOffersCount}</span>
                    <span>Принято: {campaign.acceptedOffersCount}</span>
                  </div>
                )}
              </div>

              {/* Actions */}
              {activeTab === 'my_campaigns' && isMyCard(campaign) && (
                <div
                  className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex items-center justify-between"
                  onClick={(e) => e.stopPropagation()}
                >
                  {campaign.status === 'draft' ? (
                    <>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleLaunchCampaign(campaign);
                        }}
                        className="flex items-center space-x-1.5 text-blue-600 hover:text-blue-700 text-sm font-medium transition-colors"
                      >
                        <PlayCircle className="w-4 h-4" />
                        <span>Запустить</span>
                      </button>
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleEditCampaign(campaign);
                          }}
                          className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
                          title="Редактировать"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteCampaign(campaign);
                          }}
                          className="p-2 text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
                          title="Удалить"
                        >
                          <XCircle className="w-4 h-4" />
                        </button>
                      </div>
                    </>
                  ) : (
                    <>
                      <span className="text-sm text-gray-600 font-medium">
                        {campaign.status === 'active' && '⚡ Идёт набор'}
                        {campaign.status === 'closed' && '✓ Набор завершён'}
                        {campaign.status === 'completed' && '✓ Завершена'}
                      </span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteCampaign(campaign);
                        }}
                        className="text-sm text-red-600 hover:text-red-700 font-medium transition-colors"
                      >
                        Удалить
                      </button>
                    </>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Modals */}
      {showDetailsModal && selectedCampaign && (
        <AutoCampaignDetailsModal
          isOpen={showDetailsModal}
          onClose={() => {
            setShowDetailsModal(false);
            setSelectedCampaign(null);
          }}
          campaign={selectedCampaign}
        />
      )}

      {showModal && (
        <AutoCampaignModal
          isOpen={showModal}
          onClose={() => {
            setShowModal(false);
            setEditingCampaign(null);
          }}
          onSuccess={() => {
            setShowModal(false);
            setEditingCampaign(null);
            loadCampaigns();
          }}
          advertiserId={currentUserId}
          editingCampaign={editingCampaign}
        />
      )}
    </div>
  );
}
