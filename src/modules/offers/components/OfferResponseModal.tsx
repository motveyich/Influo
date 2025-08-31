import React, { useState } from 'react';
import { useAuth } from '../../../hooks/useAuth';
import { Offer } from '../../../core/types';
import { offerService } from '../services/offerService';
import { applicationService } from '../../applications/services/applicationService';
import { X, Check, XCircle, MessageCircle, AlertCircle, DollarSign, Calendar } from 'lucide-react';
import toast from 'react-hot-toast';

interface OfferResponseModalProps {
  isOpen: boolean;
  onClose: () => void;
  offer: Offer;
  onResponseSent?: (response: 'accepted' | 'declined' | 'counter') => void;
}

export function OfferResponseModal({
  isOpen,
  onClose,
  offer,
  onResponseSent
}: OfferResponseModalProps) {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [responseType, setResponseType] = useState<'accepted' | 'declined' | 'counter' | 'info' | null>(null);
  const [counterOffer, setCounterOffer] = useState({
    rate: offer.details.rate,
    timeline: offer.details.timeline,
    deliverables: [...offer.details.deliverables],
    additionalTerms: ''
  });
  const [declineReason, setDeclineReason] = useState('');
  const [infoRequest, setInfoRequest] = useState('');

  const handleResponse = async (response: 'accepted' | 'declined' | 'counter') => {
    setIsLoading(true);
    try {
      let responseData = undefined;
      
      if (response === 'counter') {
        responseData = {
          ...offer.details,
          rate: counterOffer.rate,
          timeline: counterOffer.timeline,
          deliverables: counterOffer.deliverables,
          counterOffer: {
            originalRate: offer.details.rate,
            newRate: counterOffer.rate,
            originalTimeline: offer.details.timeline,
            newTimeline: counterOffer.timeline,
            additionalTerms: counterOffer.additionalTerms
          }
        };
      } else if (response === 'declined' && declineReason.trim()) {
        responseData = {
          ...offer.details,
          declineReason: declineReason
        };
      }

      // Check if this is an application or an offer
      if ((offer as any).type === 'application') {
        // Map counter response to in_progress for applications
        const applicationResponse = response === 'counter' ? 'in_progress' : response;
        await applicationService.respondToApplication(offer.offerId, applicationResponse, responseData);
      } else {
        await offerService.respondToOffer(offer.offerId, response, responseData, user?.id);
      }
      
      toast.success(`Offer ${response} successfully!`);
      onResponseSent?.(response);
      onClose();
    } catch (error: any) {
      console.error('Failed to respond to offer:', error);
      
      if (error.message.includes('multiple attempts')) {
        toast.error('Failed to save response. Please check your connection and try again.');
      } else {
        toast.error(error.message || 'Failed to send response');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleRequestInfo = async () => {
    if (!infoRequest.trim()) {
      toast.error('Please enter your question or request');
      return;
    }

    setIsLoading(true);
    try {
      await offerService.requestMoreInfo(offer.offerId, infoRequest);
      toast.success('Information request sent successfully!');
      onClose();
    } catch (error: any) {
      console.error('Failed to request info:', error);
      toast.error(error.message || 'Failed to send information request');
    } finally {
      setIsLoading(false);
    }
  };

  const addDeliverable = () => {
    setCounterOffer(prev => ({
      ...prev,
      deliverables: [...prev.deliverables, '']
    }));
  };

  const updateDeliverable = (index: number, value: string) => {
    setCounterOffer(prev => ({
      ...prev,
      deliverables: prev.deliverables.map((item, i) => i === index ? value : item)
    }));
  };

  const removeDeliverable = (index: number) => {
    setCounterOffer(prev => ({
      ...prev,
      deliverables: prev.deliverables.filter((_, i) => i !== index)
    }));
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: offer.details.currency || 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">
            Ответить на предложение
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[70vh] space-y-6">
          {/* Offer Details */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <h3 className="font-medium text-gray-900 mb-3">Детали предложения</h3>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm font-medium text-gray-600">Ставка:</span>
                <span className="text-sm text-gray-900">{formatCurrency(offer.details.rate)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm font-medium text-gray-600">Временные рамки:</span>
                <span className="text-sm text-gray-900">{offer.details.timeline}</span>
              </div>
              <div>
                <span className="text-sm font-medium text-gray-600">Результаты:</span>
                <ul className="mt-1 space-y-1">
                  {offer.details.deliverables.map((deliverable, index) => (
                    <li key={index} className="text-sm text-gray-900 ml-4">• {deliverable}</li>
                  ))}
                </ul>
              </div>
              <div>
                <span className="text-sm font-medium text-gray-600">Условия:</span>
                <p className="mt-1 text-sm text-gray-900">{offer.details.terms}</p>
              </div>
            </div>
          </div>

          {/* Response Options */}
          <div>
            <h3 className="font-medium text-gray-900 mb-3">Ваш ответ</h3>
            <div className="grid grid-cols-2 gap-3 mb-4">
              <button
                onClick={() => setResponseType('accepted')}
                className={`p-3 border-2 rounded-lg transition-colors ${
                  responseType === 'accepted'
                    ? 'border-green-500 bg-green-50'
                    : 'border-gray-300 hover:border-green-300'
                }`}
              >
                <div className="flex items-center space-x-2">
                  <Check className="w-5 h-5 text-green-600" />
                  <span className="font-medium text-green-700">Принять</span>
                </div>
              </button>

              <button
                onClick={() => setResponseType('declined')}
                className={`p-3 border-2 rounded-lg transition-colors ${
                  responseType === 'declined'
                    ? 'border-red-500 bg-red-50'
                    : 'border-gray-300 hover:border-red-300'
                }`}
              >
                <div className="flex items-center space-x-2">
                  <XCircle className="w-5 h-5 text-red-600" />
                  <span className="font-medium text-red-700">Отклонить</span>
                </div>
              </button>

              <button
                onClick={() => setResponseType('counter')}
                className={`p-3 border-2 rounded-lg transition-colors ${
                  responseType === 'counter'
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-300 hover:border-blue-300'
                }`}
              >
                <div className="flex items-center space-x-2">
                  <DollarSign className="w-5 h-5 text-blue-600" />
                  <span className="font-medium text-blue-700">Встречное предложение</span>
                </div>
              </button>

              <button
                onClick={() => setResponseType('info')}
                className={`p-3 border-2 rounded-lg transition-colors ${
                  responseType === 'info'
                    ? 'border-purple-500 bg-purple-50'
                    : 'border-gray-300 hover:border-purple-300'
                }`}
              >
                <div className="flex items-center space-x-2">
                  <MessageCircle className="w-5 h-5 text-purple-600" />
                  <span className="font-medium text-purple-700">Запросить информацию</span>
                </div>
              </button>
            </div>
          </div>

          {/* Counter Offer Details */}
          {responseType === 'counter' && (
            <div className="bg-blue-50 p-4 rounded-lg">
              <h4 className="font-medium text-blue-900 mb-3">Детали встречного предложения</h4>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Предлагаемая ставка
                  </label>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <input
                      type="number"
                      value={counterOffer.rate}
                      onChange={(e) => setCounterOffer(prev => ({ ...prev, rate: parseInt(e.target.value) || 0 }))}
                      className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Временные рамки
                  </label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <input
                      type="text"
                      value={counterOffer.timeline}
                      onChange={(e) => setCounterOffer(prev => ({ ...prev, timeline: e.target.value }))}
                      className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Результаты
                  </label>
                  <div className="space-y-2">
                    {counterOffer.deliverables.map((deliverable, index) => (
                      <div key={index} className="flex space-x-2">
                        <input
                          type="text"
                          value={deliverable}
                          onChange={(e) => updateDeliverable(index, e.target.value)}
                          className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          placeholder="Описание результата"
                        />
                        <button
                          onClick={() => removeDeliverable(index)}
                          className="text-red-600 hover:text-red-800 transition-colors"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                    <button
                      onClick={addDeliverable}
                      className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                    >
                      + Добавить результат
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Дополнительные условия
                  </label>
                  <textarea
                    value={counterOffer.additionalTerms}
                    onChange={(e) => setCounterOffer(prev => ({ ...prev, additionalTerms: e.target.value }))}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Любые дополнительные условия или требования..."
                  />
                </div>
              </div>
            </div>
          )}

          {/* Decline Reason */}
          {responseType === 'declined' && (
            <div className="bg-red-50 p-4 rounded-lg">
              <h4 className="font-medium text-red-900 mb-3">Причина отклонения (необязательно)</h4>
              <textarea
                value={declineReason}
                onChange={(e) => setDeclineReason(e.target.value)}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-red-500 focus:border-transparent"
                placeholder="Сообщите им, почему вы отклоняете..."
              />
            </div>
          )}

          {/* Information Request */}
          {responseType === 'info' && (
            <div className="bg-purple-50 p-4 rounded-lg">
              <h4 className="font-medium text-purple-900 mb-3">Какая информация вам нужна?</h4>
              <textarea
                value={infoRequest}
                onChange={(e) => setInfoRequest(e.target.value)}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                placeholder="Спросите о деталях кампании, временных рамках, требованиях и т.д..."
              />
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t border-gray-200">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
          >
            Отмена
          </button>
          
          {responseType && responseType !== 'info' && (
            <button
              onClick={() => handleResponse(responseType as 'accepted' | 'declined' | 'counter')}
              disabled={isLoading}
              className={`px-6 py-2 rounded-md transition-colors flex items-center space-x-2 disabled:opacity-50 ${
                responseType === 'accepted'
                  ? 'bg-green-600 hover:bg-green-700 text-white'
                  : responseType === 'declined'
                  ? 'bg-red-600 hover:bg-red-700 text-white'
                  : 'bg-blue-600 hover:bg-blue-700 text-white'
              }`}
            >
              {responseType === 'accepted' ? (
                <Check className="w-4 h-4" />
              ) : responseType === 'declined' ? (
                <XCircle className="w-4 h-4" />
              ) : (
                <DollarSign className="w-4 h-4" />
              )}
              <span>
                {isLoading ? 'Отправка...' : 
                 responseType === 'accepted' ? 'Принять предложение' :
                 responseType === 'declined' ? 'Отклонить предложение' : 'Отправить встречное предложение'}
              </span>
            </button>
          )}

          {responseType === 'info' && (
            <button
              onClick={handleRequestInfo}
              disabled={isLoading || !infoRequest.trim()}
              className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-2 rounded-md transition-colors flex items-center space-x-2 disabled:opacity-50"
            >
              <MessageCircle className="w-4 h-4" />
              <span>{isLoading ? 'Отправка...' : 'Запросить информацию'}</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}