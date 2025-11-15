import React, { useEffect, useState } from 'react';
import { X, Zap, Target, DollarSign, Calendar, Users, TrendingUp, Award } from 'lucide-react';
import { automaticOfferService } from '../../campaigns/services/automaticOfferService';

interface AutomaticCampaignDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  offerId: string;
}

export function AutomaticCampaignDetailsModal({
  isOpen,
  onClose,
  offerId
}: AutomaticCampaignDetailsModalProps) {
  const [loading, setLoading] = useState(true);
  const [details, setDetails] = useState<any>(null);

  useEffect(() => {
    if (isOpen && offerId) {
      loadDetails();
    }
  }, [isOpen, offerId]);

  const loadDetails = async () => {
    try {
      setLoading(true);
      const data = await automaticOfferService.getAutomaticOfferDetails(offerId);
      setDetails(data);
    } catch (error) {
      console.error('Failed to load automatic campaign details:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
              <Zap className="w-6 h-6 text-orange-600" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Автоматическая кампания</h2>
              <p className="text-sm text-gray-600">Детали предложения</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600"></div>
            </div>
          ) : details ? (
            <div className="space-y-6">
              <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                <div className="flex items-start space-x-3">
                  <Zap className="w-5 h-5 text-orange-600 mt-0.5" />
                  <div>
                    <h3 className="font-medium text-orange-900">Что такое автоматическая кампания?</h3>
                    <p className="text-sm text-orange-800 mt-1">
                      Это предложение было создано автоматически на основе вашего профиля и предпочтений рекламодателя.
                      Вы были выбраны среди подходящих инфлюенсеров для участия в этой кампании.
                    </p>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">О кампании</h3>
                <div className="bg-white border border-gray-200 rounded-lg p-4">
                  <h4 className="font-medium text-gray-900 mb-2">{details.campaignDetails?.title}</h4>
                  <p className="text-sm text-gray-600 mb-4">{details.campaignDetails?.description}</p>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex items-start space-x-3">
                      <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                        <Target className="w-4 h-4 text-blue-600" />
                      </div>
                      <div>
                        <p className="text-xs text-gray-600">Бренд</p>
                        <p className="text-sm font-medium text-gray-900">{details.campaignDetails?.brand}</p>
                      </div>
                    </div>

                    <div className="flex items-start space-x-3">
                      <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center flex-shrink-0">
                        <DollarSign className="w-4 h-4 text-green-600" />
                      </div>
                      <div>
                        <p className="text-xs text-gray-600">Бюджет</p>
                        <p className="text-sm font-medium text-gray-900">
                          {details.campaignDetails?.budget?.min} - {details.campaignDetails?.budget?.max} {details.campaignDetails?.budget?.currency}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Детали предложения</h3>
                <div className="bg-white border border-gray-200 rounded-lg p-4 space-y-4">
                  <div className="flex items-start space-x-3">
                    <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center flex-shrink-0">
                      <DollarSign className="w-4 h-4 text-purple-600" />
                    </div>
                    <div className="flex-1">
                      <p className="text-xs text-gray-600">Предлагаемый бюджет</p>
                      <p className="text-lg font-semibold text-gray-900">
                        {details.details?.suggestedBudget || 0} {details.campaignDetails?.budget?.currency || 'RUB'}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start space-x-3">
                    <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                      <Calendar className="w-4 h-4 text-blue-600" />
                    </div>
                    <div className="flex-1">
                      <p className="text-xs text-gray-600">Сроки</p>
                      <p className="text-sm font-medium text-gray-900">
                        {new Date(details.timeline?.startDate).toLocaleDateString('ru-RU')} - {new Date(details.timeline?.endDate).toLocaleDateString('ru-RU')}
                      </p>
                    </div>
                  </div>

                  {details.details?.contentTypes && details.details.contentTypes.length > 0 && (
                    <div className="flex items-start space-x-3">
                      <div className="w-8 h-8 bg-indigo-100 rounded-lg flex items-center justify-center flex-shrink-0">
                        <Users className="w-4 h-4 text-indigo-600" />
                      </div>
                      <div className="flex-1">
                        <p className="text-xs text-gray-600">Требуемый контент</p>
                        <div className="flex flex-wrap gap-2 mt-1">
                          {details.details.contentTypes.map((type: string) => (
                            <span
                              key={type}
                              className="px-2 py-1 bg-indigo-100 text-indigo-700 text-xs rounded-md"
                            >
                              {type}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {details.metadata?.score && (
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Почему выбрали вас?</h3>
                  <div className="bg-gradient-to-r from-orange-50 to-yellow-50 border border-orange-200 rounded-lg p-4">
                    <div className="flex items-start space-x-3">
                      <div className="w-8 h-8 bg-orange-100 rounded-lg flex items-center justify-center flex-shrink-0">
                        <Award className="w-4 h-4 text-orange-600" />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm text-gray-900 mb-2">
                          Ваш профиль получил высокую оценку ({Math.round(details.metadata.score)}/100)
                          и идеально подходит для этой кампании.
                        </p>
                        <p className="text-xs text-gray-600">
                          Система проанализировала вашу аудиторию, вовлеченность, рейтинг и опыт работы
                          с другими брендами. Вы были выбраны среди лучших кандидатов.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h3 className="font-medium text-blue-900 mb-2">Что дальше?</h3>
                <ul className="text-sm text-blue-800 space-y-1">
                  <li>• Примите предложение, если условия вам подходят</li>
                  <li>• Или отклоните, если считаете, что это не для вас</li>
                  <li>• При принятии вы сможете обсудить детали с рекламодателем</li>
                  <li>• Можете предложить свои условия</li>
                </ul>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center h-64">
              <p className="text-gray-600">Не удалось загрузить детали кампании</p>
            </div>
          )}
        </div>

        <div className="flex items-center justify-end space-x-3 p-6 border-t border-gray-200">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 hover:text-gray-900 font-medium transition-colors"
          >
            Закрыть
          </button>
        </div>
      </div>
    </div>
  );
}
