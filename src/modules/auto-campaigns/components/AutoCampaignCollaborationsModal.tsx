import React, { useState, useEffect } from 'react';
import { X, User, MessageCircle, DollarSign, Loader2, ExternalLink } from 'lucide-react';
import { AutoCampaign } from '../../../core/types';
import { offerService } from '../../offers/services/offerService';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';

interface Collaboration {
  offerId: string;
  influencerId: string;
  influencerUsername: string;
  influencerAvatar?: string;
  platform: string;
  contentFormat: string;
  status: string;
  proposedRate: number;
  currency: string;
  hasPaymentWindow: boolean;
}

interface AutoCampaignCollaborationsModalProps {
  isOpen: boolean;
  onClose: () => void;
  campaign: AutoCampaign;
}

export function AutoCampaignCollaborationsModal({
  isOpen,
  onClose,
  campaign
}: AutoCampaignCollaborationsModalProps) {
  const [collaborations, setCollaborations] = useState<Collaboration[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedProfile, setSelectedProfile] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (isOpen) {
      loadCollaborations();
    }
  }, [isOpen, campaign.id]);

  const loadCollaborations = async () => {
    try {
      setIsLoading(true);
      const offers = await offerService.getOffersByCampaign(campaign.id);

      const acceptedOffers = offers.filter(o =>
        ['accepted', 'in_progress', 'completed'].includes(o.status)
      );

      const collabs: Collaboration[] = await Promise.all(
        acceptedOffers.map(async (offer) => {
          const profile = await offerService.getUserProfile(offer.influencerId);

          const deliverables = Array.isArray(offer.details?.deliverables)
            ? offer.details.deliverables
            : [];

          return {
            offerId: offer.offerId,
            influencerId: offer.influencerId,
            influencerUsername: profile?.username || profile?.fullName || 'Пользователь',
            influencerAvatar: profile?.avatar,
            platform: offer.details?.platform || campaign.platforms[0] || 'unknown',
            contentFormat: deliverables[0] || 'Не указан',
            status: offer.status,
            proposedRate: offer.proposedRate,
            currency: offer.currency || 'RUB',
            hasPaymentWindow: offer.status === 'completed'
          };
        })
      );

      setCollaborations(collabs);
    } catch (error) {
      console.error('Failed to load collaborations:', error);
      toast.error('Не удалось загрузить сотрудничества');
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const badges: Record<string, { text: string; color: string }> = {
      accepted: { text: 'Принято', color: 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300' },
      in_progress: { text: 'В работе', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300' },
      completed: { text: 'Завершено', color: 'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300' }
    };

    const badge = badges[status] || { text: status, color: 'bg-gray-100 text-gray-700' };

    return (
      <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${badge.color}`}>
        {badge.text}
      </span>
    );
  };

  const handleOpenChat = (influencerId: string) => {
    navigate(`/app/chat?userId=${influencerId}`);
    onClose();
  };

  const handleViewProfile = (influencerId: string) => {
    setSelectedProfile(influencerId);
  };

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white dark:bg-gray-800 rounded-lg max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
          {/* Header */}
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                Мои сотрудничества
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                {campaign.title}
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-gray-500 dark:text-gray-400" />
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6">
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
              </div>
            ) : collaborations.length === 0 ? (
              <div className="text-center py-12">
                <User className="w-16 h-16 text-gray-400 dark:text-gray-500 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                  Нет активных сотрудничеств
                </h3>
                <p className="text-gray-600 dark:text-gray-400">
                  Пока нет принятых предложений по этой кампании
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {collaborations.map((collab) => (
                  <div
                    key={collab.offerId}
                    className="bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 p-4"
                  >
                    <div className="flex items-start justify-between gap-4">
                      {/* User Info */}
                      <div className="flex items-center space-x-3 flex-1 min-w-0">
                        {collab.influencerAvatar ? (
                          <img
                            src={collab.influencerAvatar}
                            alt={collab.influencerUsername}
                            className="w-12 h-12 rounded-full object-cover flex-shrink-0"
                          />
                        ) : (
                          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center flex-shrink-0">
                            <User className="w-6 h-6 text-white" />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-gray-900 dark:text-white truncate">
                            {collab.influencerUsername}
                          </p>
                          <div className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-400 mt-1">
                            <span className="capitalize">{collab.platform}</span>
                            <span>•</span>
                            <span>{collab.contentFormat}</span>
                          </div>
                        </div>
                      </div>

                      {/* Status & Payment */}
                      <div className="flex items-center space-x-3">
                        {getStatusBadge(collab.status)}
                        <div className="flex items-center space-x-1 text-gray-900 dark:text-white font-medium">
                          <DollarSign className="w-4 h-4" />
                          <span>{collab.proposedRate.toLocaleString()} {collab.currency}</span>
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => handleViewProfile(collab.influencerId)}
                          className="flex items-center space-x-2 px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors text-sm font-medium"
                        >
                          <User className="w-4 h-4" />
                          <span>Профиль</span>
                        </button>
                        <button
                          onClick={() => handleOpenChat(collab.influencerId)}
                          className="flex items-center space-x-2 px-4 py-2 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors text-sm font-medium"
                        >
                          <MessageCircle className="w-4 h-4" />
                          <span>Сообщения</span>
                        </button>
                      </div>
                      {collab.hasPaymentWindow && (
                        <button
                          onClick={() => {
                            navigate(`/offers?offerId=${collab.offerId}`);
                            onClose();
                          }}
                          className="flex items-center space-x-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors text-sm font-medium"
                        >
                          <ExternalLink className="w-4 h-4" />
                          <span>Окно оплаты</span>
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* User Profile Modal */}
      {selectedProfile && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60] p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Профиль пользователя
                </h3>
                <button
                  onClick={() => setSelectedProfile(null)}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                </button>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Функция просмотра профиля будет добавлена
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
