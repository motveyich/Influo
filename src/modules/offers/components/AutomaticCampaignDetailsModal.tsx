import React, { useEffect, useState } from 'react';
import {
  X,
  Zap,
  Target,
  DollarSign,
  Calendar,
  Users,
  TrendingUp,
  Award,
  CheckCircle,
  FileText,
  Info,
  AlertCircle,
  CreditCard,
  PlayCircle,
  Package,
  Clock
} from 'lucide-react';
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
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between p-6 border-b border-gray-200 bg-gradient-to-r from-orange-50 to-yellow-50">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-yellow-500 rounded-lg flex items-center justify-center shadow-lg">
              <Zap className="w-7 h-7 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">Автоматическая кампания</h2>
              <p className="text-sm text-gray-600">Детали предложения и условия</p>
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
              <div className="bg-gradient-to-r from-orange-50 to-yellow-50 border-2 border-orange-200 rounded-xl p-5">
                <div className="flex items-start space-x-3">
                  <div className="w-10 h-10 bg-orange-500 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Zap className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-orange-900 text-lg">Что такое автоматическая кампания?</h3>
                    <p className="text-sm text-orange-800 mt-2 leading-relaxed">
                      Это предложение создано автоматически системой на основе анализа вашего профиля,
                      аудитории и опыта. Рекламодатель не участвует в личной переписке -
                      вся работа происходит через систему окон оплаты и проверку результатов.
                    </p>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center">
                  <FileText className="w-5 h-5 mr-2 text-blue-600" />
                  О кампании
                </h3>
                <div className="bg-white border-2 border-gray-200 rounded-xl p-5 space-y-4">
                  <div>
                    <h4 className="font-semibold text-gray-900 text-lg mb-1">{details.campaignDetails?.title}</h4>
                    <p className="text-sm text-gray-600 leading-relaxed">{details.campaignDetails?.description}</p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-gray-200">
                    <div className="flex items-start space-x-3">
                      <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                        <Target className="w-5 h-5 text-blue-600" />
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 uppercase tracking-wide">Бренд</p>
                        <p className="text-sm font-semibold text-gray-900">{details.campaignDetails?.brand || 'Не указан'}</p>
                      </div>
                    </div>

                    <div className="flex items-start space-x-3">
                      <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center flex-shrink-0">
                        <DollarSign className="w-5 h-5 text-green-600" />
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 uppercase tracking-wide">Бюджет кампании</p>
                        <p className="text-sm font-semibold text-gray-900">
                          {details.campaignDetails?.budget?.min} - {details.campaignDetails?.budget?.max} {details.campaignDetails?.budget?.currency}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center">
                  <Package className="w-5 h-5 mr-2 text-purple-600" />
                  Ваше предложение
                </h3>
                <div className="bg-gradient-to-br from-purple-50 to-pink-50 border-2 border-purple-200 rounded-xl p-5 space-y-4">
                  <div className="flex items-start space-x-3">
                    <div className="w-10 h-10 bg-purple-500 rounded-lg flex items-center justify-center flex-shrink-0">
                      <DollarSign className="w-5 h-5 text-white" />
                    </div>
                    <div className="flex-1">
                      <p className="text-xs text-purple-700 uppercase tracking-wide font-medium">Предлагаемое вознаграждение</p>
                      <p className="text-2xl font-bold text-purple-900 mt-1">
                        {details.details?.suggestedBudget || details.details?.proposed_rate || 0} {details.details?.currency || details.campaignDetails?.budget?.currency || 'RUB'}
                      </p>
                      <p className="text-xs text-purple-600 mt-1">
                        Рассчитано на основе ваших тарифов и требований кампании
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start space-x-3">
                    <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                      <Calendar className="w-5 h-5 text-blue-600" />
                    </div>
                    <div className="flex-1">
                      <p className="text-xs text-gray-600 uppercase tracking-wide">Сроки выполнения</p>
                      <p className="text-sm font-semibold text-gray-900 mt-1">
                        {details.timeline?.startDate && details.timeline?.endDate
                          ? `${new Date(details.timeline.startDate).toLocaleDateString('ru-RU')} - ${new Date(details.timeline.endDate).toLocaleDateString('ru-RU')}`
                          : details.details?.timeline || 'Не указаны'
                        }
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {details.details?.deliverables && details.details.deliverables.length > 0 && (
                <div>
                  <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center">
                    <CheckCircle className="w-5 h-5 mr-2 text-green-600" />
                    Что нужно создать
                  </h3>
                  <div className="bg-white border-2 border-gray-200 rounded-xl p-5">
                    <div className="space-y-3">
                      {details.details.deliverables.map((deliverable: any, index: number) => (
                        <div key={index} className="flex items-start space-x-3 p-3 bg-gray-50 rounded-lg">
                          <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center flex-shrink-0">
                            <CheckCircle className="w-4 h-4 text-green-600" />
                          </div>
                          <div className="flex-1">
                            <p className="font-medium text-gray-900">{deliverable.type}</p>
                            {deliverable.quantity && (
                              <p className="text-xs text-gray-600">Количество: {deliverable.quantity}</p>
                            )}
                            {deliverable.description && (
                              <p className="text-sm text-gray-600 mt-1">{deliverable.description}</p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {details.details?.contentTypes && details.details.contentTypes.length > 0 && (
                <div>
                  <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center">
                    <PlayCircle className="w-5 h-5 mr-2 text-indigo-600" />
                    Требуемый контент
                  </h3>
                  <div className="bg-white border-2 border-gray-200 rounded-xl p-5">
                    <div className="flex flex-wrap gap-2">
                      {details.details.contentTypes.map((type: string) => (
                        <span
                          key={type}
                          className="px-4 py-2 bg-indigo-100 text-indigo-700 text-sm font-medium rounded-lg border border-indigo-200"
                        >
                          {type}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {details.metadata?.score && (
                <div>
                  <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center">
                    <Award className="w-5 h-5 mr-2 text-yellow-600" />
                    Почему выбрали вас?
                  </h3>
                  <div className="bg-gradient-to-r from-yellow-50 to-orange-50 border-2 border-yellow-300 rounded-xl p-5">
                    <div className="flex items-start space-x-4">
                      <div className="w-16 h-16 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-xl flex items-center justify-center flex-shrink-0 shadow-lg">
                        <div className="text-center">
                          <div className="text-2xl font-bold text-white">{Math.round(details.metadata.score)}</div>
                          <div className="text-xs text-white opacity-90">из 100</div>
                        </div>
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-900 mb-2">
                          Ваш профиль получил высокую оценку соответствия требованиям кампании!
                        </p>
                        <p className="text-xs text-gray-600 leading-relaxed">
                          Система проанализировала множество факторов: размер и активность вашей аудитории,
                          уровень вовлеченности, общий рейтинг, опыт завершенных кампаний.
                          Вы были выбраны среди лучших кандидатов для этого проекта.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <div>
                <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center">
                  <Info className="w-5 h-5 mr-2 text-blue-600" />
                  Как это работает?
                </h3>
                <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-5">
                  <div className="space-y-4">
                    <div className="flex items-start space-x-3">
                      <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center flex-shrink-0 text-white font-bold text-sm">
                        1
                      </div>
                      <div>
                        <h4 className="font-semibold text-blue-900">Примите предложение</h4>
                        <p className="text-sm text-blue-700">
                          Если условия вас устраивают, примите предложение. Система автоматически создаст окна оплаты.
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start space-x-3">
                      <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center flex-shrink-0 text-white font-bold text-sm">
                        2
                      </div>
                      <div>
                        <h4 className="font-semibold text-blue-900">Создайте контент</h4>
                        <p className="text-sm text-blue-700">
                          Выполните работу согласно требованиям. Загрузите результаты через окно оплаты.
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start space-x-3">
                      <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center flex-shrink-0 text-white font-bold text-sm">
                        3
                      </div>
                      <div>
                        <h4 className="font-semibold text-blue-900">Получите оплату</h4>
                        <p className="text-sm text-blue-700">
                          Рекламодатель проверит результаты и одобрит оплату. Средства поступят на ваши реквизиты.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center">
                  <AlertCircle className="w-5 h-5 mr-2 text-amber-600" />
                  Важно знать
                </h3>
                <div className="bg-amber-50 border-2 border-amber-200 rounded-xl p-5">
                  <ul className="space-y-2 text-sm text-amber-900">
                    <li className="flex items-start space-x-2">
                      <span className="text-amber-600 font-bold mt-0.5">•</span>
                      <span>В автоматических кампаниях нет прямого общения с рекламодателем</span>
                    </li>
                    <li className="flex items-start space-x-2">
                      <span className="text-amber-600 font-bold mt-0.5">•</span>
                      <span>Все условия и требования указаны в этом предложении</span>
                    </li>
                    <li className="flex items-start space-x-2">
                      <span className="text-amber-600 font-bold mt-0.5">•</span>
                      <span>Рекламодатель проверяет только результаты работы через окна оплаты</span>
                    </li>
                    <li className="flex items-start space-x-2">
                      <span className="text-amber-600 font-bold mt-0.5">•</span>
                      <span>Оплата происходит после одобрения результатов</span>
                    </li>
                    <li className="flex items-start space-x-2">
                      <span className="text-amber-600 font-bold mt-0.5">•</span>
                      <span>При возникновении проблем вы можете обратиться в поддержку</span>
                    </li>
                  </ul>
                </div>
              </div>

              <div className="bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-300 rounded-xl p-5">
                <h3 className="font-semibold text-green-900 mb-3 text-lg flex items-center">
                  <CheckCircle className="w-5 h-5 mr-2" />
                  Готовы начать?
                </h3>
                <p className="text-sm text-green-800 mb-3 leading-relaxed">
                  Если условия вам подходят, примите предложение и начните работу над кампанией.
                  Если есть сомнения или предложение не соответствует вашим возможностям - можете его отклонить.
                </p>
                <div className="flex items-center space-x-2 text-xs text-green-700">
                  <Clock className="w-4 h-4" />
                  <span>Предложение действительно до момента принятия другим инфлюенсером</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-64">
              <AlertCircle className="w-12 h-12 text-gray-400 mb-3" />
              <p className="text-gray-600 font-medium">Не удалось загрузить детали кампании</p>
              <p className="text-sm text-gray-500 mt-1">Попробуйте обновить страницу</p>
            </div>
          )}
        </div>

        <div className="flex items-center justify-end space-x-3 p-6 border-t border-gray-200 bg-gray-50">
          <button
            onClick={onClose}
            className="px-6 py-2.5 text-gray-700 hover:text-gray-900 font-semibold transition-colors rounded-lg hover:bg-gray-100"
          >
            Закрыть
          </button>
        </div>
      </div>
    </div>
  );
}
