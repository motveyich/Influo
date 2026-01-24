import React, { useState, useEffect, useMemo } from 'react';
import { X, User, MessageCircle, DollarSign, Loader2, ExternalLink, FileText, Instagram, Youtube, Twitter, Facebook, Tv, Wallet, Clock, CheckCircle2, HourglassIcon, Eye } from 'lucide-react';
import { AutoCampaign, CollaborationOffer, PaymentRequest } from '../../../core/types';
import { offerService } from '../../offers/services/offerService';
import { paymentRequestService } from '../../offers/services/paymentRequestService';
import { UserPublicProfileModal } from '../../profiles/components/UserPublicProfileModal';
import { OfferDetailsModal } from '../../offers/components/OfferDetailsModal';
import { ViewCompletionModal } from '../../offers/components/ViewCompletionModal';
import { PendingPaymentsModal } from '../../offers/components/PendingPaymentsModal';
import { useAuth } from '../../../hooks/useAuth';
import { useBodyScrollLock } from '../../../hooks/useBodyScrollLock';
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
  hasPendingPayments: boolean;
  pendingPayments: PaymentRequest[];
  offer: CollaborationOffer;
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
  const [selectedOffer, setSelectedOffer] = useState<CollaborationOffer | null>(null);
  const [showOfferDetails, setShowOfferDetails] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showViewCompletionModal, setShowViewCompletionModal] = useState(false);
  const [selectedPayments, setSelectedPayments] = useState<PaymentRequest[]>([]);
  const navigate = useNavigate();
  const { user } = useAuth();
  const currentUserId = user?.id || '';

  useBodyScrollLock(isOpen);

  useEffect(() => {
    if (isOpen) {
      loadCollaborations();
    }
  }, [isOpen, campaign.id]);

  const getPlatformIcon = (platform: string) => {
    const platformLower = platform.toLowerCase();
    const iconProps = { className: "w-4 h-4" };

    if (platformLower.includes('instagram')) return <Instagram {...iconProps} />;
    if (platformLower.includes('youtube')) return <Youtube {...iconProps} />;
    if (platformLower.includes('twitter') || platformLower.includes('x')) return <Twitter {...iconProps} />;
    if (platformLower.includes('facebook')) return <Facebook {...iconProps} />;
    if (platformLower.includes('tiktok')) return <Tv {...iconProps} />;

    return <Tv {...iconProps} />;
  };

  const loadCollaborations = async () => {
    try {
      setIsLoading(true);
      const offers = await offerService.getOffersByCampaign(campaign.id);

      const acceptedOffers = offers.filter(o =>
        ['accepted', 'in_progress', 'pending_completion', 'completed'].includes(o.status)
      );

      const collabs: Collaboration[] = await Promise.all(
        acceptedOffers.map(async (offer) => {
          const profile = await offerService.getUserProfile(offer.influencerId);

          // Получаем формат контента
          let contentFormat = 'Не указан';
          if (offer.contentType) {
            contentFormat = offer.contentType;
          } else if (offer.deliverables && offer.deliverables.length > 0) {
            contentFormat = offer.deliverables[0];
          } else if (offer.details?.deliverables && Array.isArray(offer.details.deliverables) && offer.details.deliverables.length > 0) {
            contentFormat = offer.details.deliverables[0];
          }

          // Получаем платформу
          const platform = offer.platform || offer.details?.platform || campaign.platforms[0] || 'unknown';

          // Загружаем payment requests для этого offer
          let pendingPayments: PaymentRequest[] = [];
          try {
            const allPayments = await paymentRequestService.getOfferPaymentRequests(offer.id);
            // Фильтруем только pending payment requests
            pendingPayments = allPayments.filter(p => p.status === 'pending');
          } catch (error) {
            console.error(`Failed to load payment requests for offer ${offer.id}:`, error);
          }

          return {
            offerId: offer.offer_id || offer.id || '',
            influencerId: offer.influencerId,
            influencerUsername: profile?.username || profile?.fullName || 'Пользователь',
            influencerAvatar: profile?.avatar,
            platform: platform,
            contentFormat: contentFormat,
            status: offer.status,
            proposedRate: offer.proposedRate,
            currency: offer.currency || 'RUB',
            hasPendingPayments: pendingPayments.length > 0,
            pendingPayments: pendingPayments,
            offer: offer
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
      pending_completion: { text: 'Ожидает согласования', color: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300' },
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

  const handleViewOfferDetails = (offer: CollaborationOffer) => {
    setSelectedOffer(offer);
    setShowOfferDetails(true);
  };

  const handleOfferUpdated = (updatedOffer: CollaborationOffer) => {
    const updatedOfferId = updatedOffer.offer_id || updatedOffer.id;
    setCollaborations(prev => prev.map(collab =>
      collab.offerId === updatedOfferId || collab.offer.offer_id === updatedOfferId
        ? { ...collab, offer: updatedOffer, status: updatedOffer.status, proposedRate: updatedOffer.proposedRate }
        : collab
    ));
    setSelectedOffer(updatedOffer);
  };

  const handleOpenPaymentModal = (collab: Collaboration) => {
    setSelectedOffer(collab.offer);
    setSelectedPayments(collab.pendingPayments);
    setShowPaymentModal(true);
  };

  const handleViewCompletion = (offer: CollaborationOffer) => {
    setSelectedOffer(offer);
    setShowViewCompletionModal(true);
  };

  const handleConfirmCompletion = async () => {
    if (!selectedOffer) return;

    try {
      const updatedOffer = await offerService.confirmCompletion(selectedOffer.id, currentUserId);
      handleOfferUpdated(updatedOffer);
      setShowViewCompletionModal(false);
      setSelectedOffer(null);
      toast.success('Выполнение подтверждено');
      loadCollaborations();
    } catch (error: any) {
      console.error('Failed to confirm completion:', error);
      toast.error(error.message || 'Не удалось подтвердить выполнение');
    }
  };

  const handleRejectCompletion = async () => {
    if (!selectedOffer) return;

    try {
      const updatedOffer = await offerService.rejectCompletion(selectedOffer.id, currentUserId);
      handleOfferUpdated(updatedOffer);
      setShowViewCompletionModal(false);
      setSelectedOffer(null);
      toast.success('Выполнение отклонено, сотрудничество возвращено в работу');
      loadCollaborations();
    } catch (error: any) {
      console.error('Failed to reject completion:', error);
      toast.error(error.message || 'Не удалось отклонить выполнение');
    }
  };

  // Вычисляем статистику
  const stats = useMemo(() => {
    return {
      inProgress: collaborations.filter(c => c.status === 'in_progress').length,
      pendingCompletion: collaborations.filter(c => c.status === 'pending_completion').length,
      completed: collaborations.filter(c => c.status === 'completed').length,
      accepted: collaborations.filter(c => c.status === 'accepted').length,
    };
  }, [collaborations]);

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
              <div className="space-y-6">
                {/* Статистика */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <CheckCircle2 className="w-5 h-5 text-green-600 dark:text-green-400" />
                      <span className="text-2xl font-bold text-green-700 dark:text-green-300">
                        {stats.accepted}
                      </span>
                    </div>
                    <p className="text-sm text-green-600 dark:text-green-400 font-medium">
                      Принято
                    </p>
                  </div>

                  <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <Clock className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                      <span className="text-2xl font-bold text-blue-700 dark:text-blue-300">
                        {stats.inProgress}
                      </span>
                    </div>
                    <p className="text-sm text-blue-600 dark:text-blue-400 font-medium">
                      В работе
                    </p>
                  </div>

                  <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <HourglassIcon className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
                      <span className="text-2xl font-bold text-yellow-700 dark:text-yellow-300">
                        {stats.pendingCompletion}
                      </span>
                    </div>
                    <p className="text-sm text-yellow-600 dark:text-yellow-400 font-medium">
                      Ожидают согласования
                    </p>
                  </div>

                  <div className="bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <CheckCircle2 className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                      <span className="text-2xl font-bold text-purple-700 dark:text-purple-300">
                        {stats.completed}
                      </span>
                    </div>
                    <p className="text-sm text-purple-600 dark:text-purple-400 font-medium">
                      Завершены
                    </p>
                  </div>
                </div>

                {/* Список сотрудничеств */}
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
                            <div className="flex items-center space-x-1">
                              {getPlatformIcon(collab.platform)}
                              <span className="capitalize">{collab.platform}</span>
                            </div>
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
                      <div className="flex items-center flex-wrap gap-2">
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
                        <button
                          onClick={() => handleViewOfferDetails(collab.offer)}
                          className="flex items-center space-x-2 px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors text-sm font-medium"
                        >
                          <FileText className="w-4 h-4" />
                          <span>Детали</span>
                        </button>
                        {collab.status === 'pending_completion' && (collab.offer as any).metadata?.completion_screenshot_url && (collab.offer as any).completionInitiatedBy !== currentUserId && (
                          <button
                            onClick={() => handleViewCompletion(collab.offer)}
                            className="flex items-center space-x-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors text-sm font-medium"
                          >
                            <Eye className="w-4 h-4" />
                            <span>Посмотреть выполнение</span>
                          </button>
                        )}
                        {collab.hasPendingPayments && (
                          <button
                            onClick={() => handleOpenPaymentModal(collab)}
                            className="flex items-center space-x-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors text-sm font-medium"
                          >
                            <Wallet className="w-4 h-4" />
                            <span>Окно оплаты ({collab.pendingPayments.length})</span>
                          </button>
                        )}
                      </div>
                    </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* User Profile Modal */}
      {selectedProfile && (
        <UserPublicProfileModal
          userId={selectedProfile}
          currentUserId={currentUserId}
          onClose={() => setSelectedProfile(null)}
        />
      )}

      {/* Offer Details Modal */}
      {showOfferDetails && selectedOffer && (
        <OfferDetailsModal
          isOpen={showOfferDetails}
          offer={selectedOffer}
          currentUserId={currentUserId}
          collaborationType="offer"
          onClose={() => {
            setShowOfferDetails(false);
            setSelectedOffer(null);
          }}
          onOfferUpdated={handleOfferUpdated}
        />
      )}

      {/* Pending Payments Modal */}
      {showPaymentModal && selectedPayments.length > 0 && (
        <PendingPaymentsModal
          isOpen={showPaymentModal}
          onClose={() => {
            setShowPaymentModal(false);
            setSelectedOffer(null);
            setSelectedPayments([]);
          }}
          payments={selectedPayments}
          currentUserId={currentUserId}
          onPaymentUpdated={() => {
            loadCollaborations();
            setShowPaymentModal(false);
            setSelectedOffer(null);
            setSelectedPayments([]);
          }}
        />
      )}

      {/* View Completion Modal */}
      {showViewCompletionModal && selectedOffer && (selectedOffer as any).metadata?.completion_screenshot_url && (
        <ViewCompletionModal
          isOpen={showViewCompletionModal}
          onClose={() => {
            setShowViewCompletionModal(false);
            setSelectedOffer(null);
          }}
          offer={selectedOffer}
          screenshotUrl={(selectedOffer as any).metadata.completion_screenshot_url}
          onConfirm={handleConfirmCompletion}
          onReject={handleRejectCompletion}
        />
      )}
    </>
  );
}
