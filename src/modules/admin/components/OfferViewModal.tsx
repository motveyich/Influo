import React from 'react';
import { X, DollarSign, Calendar, Package, Info } from 'lucide-react';
import { formatDistanceToNow, parseISO } from 'date-fns';

interface OfferViewModalProps {
  isOpen: boolean;
  onClose: () => void;
  offer: any;
}

export function OfferViewModal({ isOpen, onClose, offer }: OfferViewModalProps) {
  if (!isOpen || !offer) return null;

  const integrationDetails = offer.metadata?.integrationDetails;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60] p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              Предложение о сотрудничестве
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              ID: {offer.id}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Basic Info */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-gradient-to-br from-green-50 to-white dark:from-green-900 dark:to-gray-800 border border-green-200 dark:border-green-800 rounded-lg p-4">
              <div className="flex items-center space-x-2 mb-2">
                <DollarSign className="w-5 h-5 text-green-600 dark:text-green-400" />
                <span className="text-xs text-gray-600 dark:text-gray-400">Ставка</span>
              </div>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                ${offer.proposedRate}
              </p>
              {offer.acceptedRate && offer.acceptedRate !== offer.proposedRate && (
                <p className="text-sm text-green-600 dark:text-green-400 mt-1">
                  Принято: ${offer.acceptedRate}
                </p>
              )}
            </div>

            <div className="bg-gradient-to-br from-blue-50 to-white dark:from-blue-900 dark:to-gray-800 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
              <div className="flex items-center space-x-2 mb-2">
                <Calendar className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                <span className="text-xs text-gray-600 dark:text-gray-400">Сроки</span>
              </div>
              <p className="text-lg font-semibold text-gray-900 dark:text-white">
                {offer.timeline || 'Не указано'}
              </p>
            </div>

            <div className="bg-gradient-to-br from-purple-50 to-white dark:from-purple-900 dark:to-gray-800 border border-purple-200 dark:border-purple-800 rounded-lg p-4">
              <div className="flex items-center space-x-2 mb-2">
                <Info className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                <span className="text-xs text-gray-600 dark:text-gray-400">Статус</span>
              </div>
              <p className="text-lg font-semibold text-gray-900 dark:text-white capitalize">
                {offer.status}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                {offer.currentStage}
              </p>
            </div>
          </div>

          {/* Title and Description */}
          {offer.title && (
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                {offer.title}
              </h3>
            </div>
          )}

          {offer.description && (
            <div>
              <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Описание</h4>
              <p className="text-sm text-gray-900 dark:text-white bg-gray-50 dark:bg-gray-900 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
                {offer.description}
              </p>
            </div>
          )}

          {/* Deliverables */}
          {offer.deliverables && offer.deliverables.length > 0 && (
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
                Формат рекламы
              </h3>
              <div className="space-y-2">
                {offer.deliverables.map((deliverable: string, index: number) => (
                  <div
                    key={index}
                    className="flex items-center space-x-2 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-md border border-blue-200 dark:border-blue-800"
                  >
                    <div className="w-2 h-2 bg-blue-600 dark:bg-blue-400 rounded-full"></div>
                    <span className="text-sm text-gray-900 dark:text-white">{deliverable}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Integration Details */}
          {integrationDetails && (
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Детали интеграции
              </h3>
              <div className="bg-gradient-to-br from-amber-50 to-white dark:from-amber-900/20 dark:to-gray-800 border border-amber-200 dark:border-amber-800 rounded-lg p-4 space-y-4">
                {integrationDetails.niche && (
                  <div>
                    <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2 flex items-center space-x-2">
                      <Package className="w-4 h-4" />
                      <span>Ниша</span>
                    </h4>
                    <div className="bg-white dark:bg-gray-800 px-4 py-2 rounded-md border border-amber-200 dark:border-amber-800">
                      <span className="text-sm font-medium text-gray-900 dark:text-white">
                        {integrationDetails.niche}
                      </span>
                    </div>
                  </div>
                )}

                {integrationDetails.productDescription && (
                  <div>
                    <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                      Описание рекламируемого продукта
                    </h4>
                    <div className="bg-white dark:bg-gray-800 px-4 py-3 rounded-md border border-amber-200 dark:border-amber-800">
                      <p className="text-sm text-gray-900 dark:text-white whitespace-pre-wrap">
                        {integrationDetails.productDescription}
                      </p>
                    </div>
                  </div>
                )}

                {integrationDetails.integrationParameters && (
                  <div>
                    <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                      Параметры интеграции
                    </h4>
                    <div className="bg-white dark:bg-gray-800 px-4 py-3 rounded-md border border-amber-200 dark:border-amber-800">
                      <p className="text-sm text-gray-900 dark:text-white whitespace-pre-wrap">
                        {integrationDetails.integrationParameters}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Timestamps */}
          <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-600 dark:text-gray-400">Создано:</span>
                <p className="text-gray-900 dark:text-white font-medium">
                  {formatDistanceToNow(parseISO(offer.createdAt), { addSuffix: true })}
                </p>
              </div>
              {offer.acceptedAt && (
                <div>
                  <span className="text-gray-600 dark:text-gray-400">Принято:</span>
                  <p className="text-gray-900 dark:text-white font-medium">
                    {formatDistanceToNow(parseISO(offer.acceptedAt), { addSuffix: true })}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 dark:border-gray-700 p-4 bg-gray-50 dark:bg-gray-900">
          <button
            onClick={onClose}
            className="w-full px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-md transition-colors"
          >
            Закрыть
          </button>
        </div>
      </div>
    </div>
  );
}
