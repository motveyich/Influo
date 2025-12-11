import React, { useState, useEffect } from 'react';
import { AutoCampaign } from '../../../core/types';
import { autoCampaignService } from '../services/autoCampaignService';
import { useAuth } from '../../../hooks/useAuth';
import { useTranslation } from '../../../hooks/useTranslation';
import { Plus, Target, Users, DollarSign, CheckCircle, Clock, PlayCircle, XCircle, Edit, Eye, Calendar, Sparkles, Send, User, Pause, Play, Briefcase, Instagram, Youtube, Twitter, Facebook, Tv } from 'lucide-react';
import { AutoCampaignModal } from './AutoCampaignModal';
import { AutoCampaignDetailsModal } from './AutoCampaignDetailsModal';
import { UserPublicProfileModal } from '../../profiles/components/UserPublicProfileModal';
import { AutoCampaignApplicationModal } from './AutoCampaignApplicationModal';
import { AutoCampaignCollaborationsModal } from './AutoCampaignCollaborationsModal';
import { UserAvatar } from '../../../components/UserAvatar';
import { supabase } from '../../../core/supabase';
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
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showApplicationModal, setShowApplicationModal] = useState(false);
  const [showCollaborationsModal, setShowCollaborationsModal] = useState(false);
  const [selectedCampaign, setSelectedCampaign] = useState<AutoCampaign | null>(null);
  const [selectedAdvertiserId, setSelectedAdvertiserId] = useState<string | null>(null);
  const [editingCampaign, setEditingCampaign] = useState<AutoCampaign | null>(null);
  const [advertiserProfiles, setAdvertiserProfiles] = useState<Record<string, any>>({});

  const { user } = useAuth();
  const { t } = useTranslation();
  const currentUserId = user?.id || '';

  useEffect(() => {
    if (currentUserId) {
      loadCampaigns();
    }
  }, [currentUserId, activeTab]);

  useEffect(() => {
    const campaigns = activeTab === 'all' ? allCampaigns : myCampaigns;
    loadAdvertiserProfiles(campaigns);
  }, [allCampaigns, myCampaigns, activeTab]);

  const loadAdvertiserProfiles = async (campaigns: AutoCampaign[]) => {
    const advertiserIds = [...new Set(campaigns.map(c => c.advertiserId))];
    const profiles: Record<string, any> = {};

    for (const advertiserId of advertiserIds) {
      try {
        const { data } = await supabase
          .from('user_profiles')
          .select('user_id, full_name, avatar')
          .eq('user_id', advertiserId)
          .maybeSingle();
        if (data) profiles[advertiserId] = data;
      } catch (error) {
        console.error('Failed to load advertiser profile:', error);
      }
    }

    setAdvertiserProfiles(profiles);
  };

  const getPlatformIcon = (platform: string) => {
    const platformLower = platform.toLowerCase();
    const iconProps = { className: "w-3.5 h-3.5" };

    if (platformLower.includes('instagram')) return <Instagram {...iconProps} />;
    if (platformLower.includes('youtube')) return <Youtube {...iconProps} />;
    if (platformLower.includes('twitter') || platformLower.includes('x')) return <Twitter {...iconProps} />;
    if (platformLower.includes('facebook')) return <Facebook {...iconProps} />;
    if (platformLower.includes('tiktok')) return <Tv {...iconProps} />;

    return <Tv {...iconProps} />;
  };

  const loadCampaigns = async () => {
    try {
      setIsLoading(true);

      if (activeTab === 'all') {
        const data = await autoCampaignService.getActiveCampaigns(currentUserId);
        setAllCampaigns(data);
      } else {
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

  const handlePauseCampaign = async (campaign: AutoCampaign) => {
    if (!confirm(`Приостановить автокампанию "${campaign.title}"? Инфлюенсеры не смогут принимать предложения, пока кампания приостановлена.`)) {
      return;
    }

    try {
      await autoCampaignService.pauseCampaign(campaign.id);
      toast.success('Автокампания приостановлена');
      loadCampaigns();
    } catch (error) {
      console.error('Failed to pause campaign:', error);
      toast.error('Не удалось приостановить автокампанию');
    }
  };

  const handleResumeCampaign = async (campaign: AutoCampaign) => {
    if (!confirm(`Возобновить автокампанию "${campaign.title}"?`)) {
      return;
    }

    try {
      await autoCampaignService.resumeCampaign(campaign.id);
      toast.success('Автокампания возобновлена');
      loadCampaigns();
    } catch (error) {
      console.error('Failed to resume campaign:', error);
      toast.error('Не удалось возобновить автокампанию');
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

  const handleApplyToCampaign = (campaign: AutoCampaign) => {
    setSelectedCampaign(campaign);
    setShowApplicationModal(true);
  };

  const handleViewCollaborations = (campaign: AutoCampaign) => {
    setSelectedCampaign(campaign);
    setShowCollaborationsModal(true);
  };

  const handleViewAdvertiserProfile = (campaign: AutoCampaign) => {
    setSelectedAdvertiserId(campaign.advertiserId);
    setShowProfileModal(true);
  };

  const getStatusBadge = (status: string) => {
    const badges = {
      draft: { text: 'Черновик', color: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300' },
      active: { text: 'Активна', color: 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300' },
      in_progress: { text: 'В работе', color: 'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300' },
      paused: { text: 'Приостановлена', color: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300' },
      closed: { text: 'Набор завершён', color: 'bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300' },
      completed: { text: 'Завершена', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300' }
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
      <div className="flex items-center justify-center min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Автоматические кампании</h1>
              <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
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
          <div className="flex items-center space-x-2 border-b border-gray-200 dark:border-gray-700">
            <button
              onClick={() => setActiveTab('all')}
              className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'all'
                  ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
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
                  ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
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
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-12 text-center">
            <Target className="w-16 h-16 text-gray-400 dark:text-gray-500 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
              {activeTab === 'all' ? 'Нет активных автокампаний' : 'Нет автокампаний'}
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
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
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {campaignsToShow.map((campaign) => (
              <div
                key={campaign.id}
                className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 hover:shadow-md transition-all overflow-hidden group relative"
              >
                {/* Status Badges - Floating */}
                <div className="absolute top-4 right-4 z-10 flex flex-col items-end space-y-2">
                  {getStatusBadge(campaign.status)}
                  {campaign.isParticipating && (
                    <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300">
                      Участвую
                    </span>
                  )}
                </div>

                {/* Header */}
                <div
                  className="p-6 bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 cursor-pointer"
                  onClick={() => handleViewDetails(campaign)}
                >
                  <div className="flex items-start space-x-4 pr-20">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedAdvertiserId(campaign.advertiserId);
                        setShowProfileModal(true);
                      }}
                      className="flex-shrink-0 cursor-pointer hover:opacity-80 transition-opacity"
                    >
                      <UserAvatar
                        avatarUrl={advertiserProfiles[campaign.advertiserId]?.avatar}
                        fullName={advertiserProfiles[campaign.advertiserId]?.full_name}
                        size="lg"
                      />
                    </button>
                    <div className="flex-1 min-w-0">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedAdvertiserId(campaign.advertiserId);
                          setShowProfileModal(true);
                        }}
                        className="text-xs text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors mb-1 block"
                      >
                        {advertiserProfiles[campaign.advertiserId]?.full_name || 'Рекламодатель'}
                      </button>
                      <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2 line-clamp-2 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                        {campaign.title}
                      </h3>
                      {campaign.description && (
                        <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">{campaign.description}</p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Stats */}
                <div className="p-6 space-y-4">
                  {/* Budget & Audience */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mb-1.5">Бюджет</p>
                      <p className="text-base font-semibold text-gray-900 dark:text-white">
                        {campaign.budgetMin.toLocaleString()}-{campaign.budgetMax.toLocaleString()} ₽
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mb-1.5">Аудитория</p>
                      <p className="text-base font-semibold text-gray-900 dark:text-white">
                        {campaign.audienceMin.toLocaleString()}-{campaign.audienceMax.toLocaleString()}
                      </p>
                    </div>
                  </div>

                  {/* Progress */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-xs text-gray-500 dark:text-gray-400">Прогресс</p>
                      <p className="text-sm font-medium text-gray-900 dark:text-white">
                        {campaign.acceptedOffersCount}/{campaign.targetInfluencersCount}
                      </p>
                    </div>
                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5">
                      <div
                        className="bg-blue-600 dark:bg-blue-500 h-2.5 rounded-full transition-all"
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
                  <div className="flex flex-wrap gap-2">
                    {campaign.platforms.slice(0, 4).map((platform) => (
                      <span
                        key={platform}
                        className="px-2.5 py-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 text-xs rounded-md capitalize font-medium flex items-center space-x-1"
                      >
                        {getPlatformIcon(platform)}
                        <span>{platform}</span>
                      </span>
                    ))}
                    {campaign.platforms.length > 4 && (
                      <span className="px-2.5 py-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 text-xs rounded-md font-medium">
                        +{campaign.platforms.length - 4}
                      </span>
                    )}
                  </div>

                  {/* Additional Stats */}
                  {activeTab === 'my_campaigns' && (
                    <div className="pt-4 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
                      <span>Отправлено: {campaign.sentOffersCount}</span>
                      <span>Принято: {campaign.acceptedOffersCount}</span>
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="px-6 py-4 bg-gray-50 dark:bg-gray-900/50 border-t border-gray-200 dark:border-gray-700">
                  {activeTab === 'my_campaigns' && isMyCard(campaign) ? (
                    <>
                      {campaign.status === 'draft' ? (
                        <div className="flex items-center justify-between">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleLaunchCampaign(campaign);
                            }}
                            className="flex items-center space-x-1.5 text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 text-sm font-medium transition-colors"
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
                              className="flex items-center space-x-1.5 px-3 py-1.5 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors text-sm font-medium"
                            >
                              <Edit className="w-4 h-4" />
                              <span>Редактировать</span>
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteCampaign(campaign);
                              }}
                              className="p-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                              title="Удалить"
                            >
                              <XCircle className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      ) : campaign.status === 'completed' ? (
                        <div className="space-y-2">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleViewCollaborations(campaign);
                            }}
                            className="w-full flex items-center justify-center space-x-1.5 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                          >
                            <Briefcase className="w-4 h-4" />
                            <span>Мои сотрудничества</span>
                          </button>
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-green-600 dark:text-green-400 font-medium flex items-center space-x-1">
                              <CheckCircle className="w-4 h-4" />
                              <span>Завершена</span>
                            </span>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteCampaign(campaign);
                              }}
                              className="text-sm text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 font-medium transition-colors"
                            >
                              Удалить
                            </button>
                          </div>
                        </div>
                      ) : campaign.status === 'paused' ? (
                        <div className="space-y-2">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleViewCollaborations(campaign);
                            }}
                            className="w-full flex items-center justify-center space-x-1.5 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                          >
                            <Briefcase className="w-4 h-4" />
                            <span>Мои сотрудничества</span>
                          </button>
                          <div className="flex items-center justify-between">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleResumeCampaign(campaign);
                              }}
                              className="flex items-center space-x-1.5 text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 text-sm font-medium transition-colors"
                            >
                              <Play className="w-4 h-4" />
                              <span>Возобновить</span>
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteCampaign(campaign);
                              }}
                              className="text-sm text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 font-medium transition-colors"
                            >
                              Удалить
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {(campaign.status === 'in_progress' || campaign.status === 'closed') && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleViewCollaborations(campaign);
                              }}
                              className="w-full flex items-center justify-center space-x-1.5 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                            >
                              <Briefcase className="w-4 h-4" />
                              <span>Мои сотрудничества</span>
                            </button>
                          )}
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-gray-600 dark:text-gray-400 font-medium">
                              {campaign.status === 'active' && '⚡ Идёт набор'}
                              {campaign.status === 'in_progress' && '⚙️ В работе'}
                              {campaign.status === 'closed' && '✓ Набор завершён'}
                            </span>
                            {(campaign.status === 'active' || campaign.status === 'in_progress') && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handlePauseCampaign(campaign);
                                }}
                                className="flex items-center space-x-1.5 text-yellow-600 dark:text-yellow-400 hover:text-yellow-700 dark:hover:text-yellow-300 text-sm font-medium transition-colors"
                              >
                                <Pause className="w-4 h-4" />
                                <span>Приостановить</span>
                              </button>
                            )}
                          </div>
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="flex items-center justify-between gap-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleApplyToCampaign(campaign);
                        }}
                        className="flex-1 flex items-center justify-center space-x-1.5 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                      >
                        <Send className="w-4 h-4" />
                        <span>Откликнуться</span>
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleViewAdvertiserProfile(campaign);
                        }}
                        className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                        title="Профиль"
                      >
                        <User className="w-4 h-4" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleViewDetails(campaign);
                        }}
                        className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                        title="Подробнее"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>
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

        {showProfileModal && selectedAdvertiserId && (
          <UserPublicProfileModal
            userId={selectedAdvertiserId}
            currentUserId={currentUserId}
            onClose={() => {
              setShowProfileModal(false);
              setSelectedAdvertiserId(null);
            }}
          />
        )}

        {showApplicationModal && selectedCampaign && (
          <AutoCampaignApplicationModal
            isOpen={showApplicationModal}
            onClose={() => {
              setShowApplicationModal(false);
              setSelectedCampaign(null);
            }}
            campaign={selectedCampaign}
            influencerId={currentUserId}
            onSuccess={() => {
              loadCampaigns();
            }}
          />
        )}

        {showCollaborationsModal && selectedCampaign && (
          <AutoCampaignCollaborationsModal
            isOpen={showCollaborationsModal}
            onClose={() => {
              setShowCollaborationsModal(false);
              setSelectedCampaign(null);
            }}
            campaign={selectedCampaign}
          />
        )}
      </div>
    </div>
  );
}
