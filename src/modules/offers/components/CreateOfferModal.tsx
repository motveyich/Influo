import React, { useState } from 'react';
import { Offer, Campaign } from '../../../core/types';
import { offerService } from '../services/offerService';
import { X, Send, AlertCircle, DollarSign, Calendar, Package } from 'lucide-react';
import toast from 'react-hot-toast';

interface CreateOfferModalProps {
  isOpen: boolean;
  onClose: () => void;
  campaign?: Campaign;
  influencerId: string;
  advertiserId: string;
  onOfferSent?: (offer: Offer) => void;
}

export function CreateOfferModal({
  isOpen,
  onClose,
  campaign,
  influencerId,
  advertiserId,
  onOfferSent
}: CreateOfferModalProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [formData, setFormData] = useState({
    rate: campaign?.budget.min || 0,
    currency: campaign?.budget.currency || 'USD',
    deliverables: [] as string[],
    timeline: '',
    terms: ''
  });

  const [newDeliverable, setNewDeliverable] = useState('');

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.rate || formData.rate <= 0) {
      newErrors.rate = 'Valid rate is required';
    }

    if (formData.deliverables.length === 0) {
      newErrors.deliverables = 'At least one deliverable is required';
    }

    if (!formData.timeline.trim()) {
      newErrors.timeline = 'Timeline is required';
    }

    if (!formData.terms.trim()) {
      newErrors.terms = 'Terms and conditions are required';
    } else if (formData.terms.length < 20) {
      newErrors.terms = 'Terms must be at least 20 characters long';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSendOffer = async () => {
    if (!validateForm()) {
      toast.error('Please fix the errors before sending');
      return;
    }

    setIsLoading(true);
    try {
      const offerData: Partial<Offer> = {
        influencerId,
        campaignId: campaign?.campaignId,
        advertiserId,
        details: formData
      };

      const sentOffer = await offerService.createOffer(offerData);
      
      toast.success('Offer sent successfully!');
      onOfferSent?.(sentOffer);
      onClose();
    } catch (error: any) {
      console.error('Failed to send offer:', error);
      toast.error(error.message || 'Failed to send offer');
    } finally {
      setIsLoading(false);
    }
  };

  const addDeliverable = () => {
    if (!newDeliverable.trim()) return;
    
    setFormData(prev => ({
      ...prev,
      deliverables: [...prev.deliverables, newDeliverable.trim()]
    }));
    setNewDeliverable('');
  };

  const removeDeliverable = (index: number) => {
    setFormData(prev => ({
      ...prev,
      deliverables: prev.deliverables.filter((_, i) => i !== index)
    }));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">
            Отправить предложение о сотрудничестве
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
          {/* Campaign Info */}
          {campaign && (
            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="font-medium text-gray-900 mb-2">Кампания: {campaign.title}</h3>
              <p className="text-sm text-gray-600">{campaign.description}</p>
              <div className="mt-2 text-sm text-gray-600">
                Диапазон бюджета: ${campaign.budget.min.toLocaleString()} - ${campaign.budget.max.toLocaleString()} {campaign.budget.currency}
              </div>
            </div>
          )}

          {/* Rate */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Ставка предложения *
            </label>
            <div className="relative">
              <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="number"
                value={formData.rate}
                onChange={(e) => setFormData(prev => ({ ...prev, rate: parseInt(e.target.value) || 0 }))}
                className={`w-full pl-10 pr-4 py-2 border rounded-md focus:ring-2 focus:ring-purple-500 focus:border-transparent ${
                  errors.rate ? 'border-red-300' : 'border-gray-300'
                }`}
                placeholder="2500"
              />
            </div>
            {errors.rate && (
              <p className="mt-1 text-sm text-red-600 flex items-center">
                <AlertCircle className="w-4 h-4 mr-1" />
                {errors.rate}
              </p>
            )}
          </div>

          {/* Deliverables */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Результаты *
            </label>
            
            {/* Add new deliverable */}
            <div className="flex space-x-2 mb-3">
              <input
                type="text"
                value={newDeliverable}
                onChange={(e) => setNewDeliverable(e.target.value)}
                placeholder="например, 1 пост в Instagram, 3 слайда в Stories"
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                onKeyPress={(e) => e.key === 'Enter' && addDeliverable()}
              />
              <button
                type="button"
                onClick={addDeliverable}
                className="bg-purple-600 text-white px-4 py-2 rounded-md hover:bg-purple-700 transition-colors"
              >
                Добавить
              </button>
            </div>

            {/* Deliverables list */}
            <div className="space-y-2">
              {formData.deliverables.map((deliverable, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-md">
                  <div className="flex items-center space-x-2">
                    <Package className="w-4 h-4 text-purple-600" />
                    <span className="text-sm text-gray-900">{deliverable}</span>
                  </div>
                  <button
                    onClick={() => removeDeliverable(index)}
                    className="text-red-600 hover:text-red-800 transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
            
            {errors.deliverables && (
              <p className="mt-1 text-sm text-red-600 flex items-center">
                <AlertCircle className="w-4 h-4 mr-1" />
                {errors.deliverables}
              </p>
            )}
          </div>

          {/* Timeline */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Временные рамки *
            </label>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                value={formData.timeline}
                onChange={(e) => setFormData(prev => ({ ...prev, timeline: e.target.value }))}
                className={`w-full pl-10 pr-4 py-2 border rounded-md focus:ring-2 focus:ring-purple-500 focus:border-transparent ${
                  errors.timeline ? 'border-red-300' : 'border-gray-300'
                }`}
                placeholder="например, 2 недели с момента принятия, до 15 марта"
              />
            </div>
            {errors.timeline && (
              <p className="mt-1 text-sm text-red-600 flex items-center">
                <AlertCircle className="w-4 h-4 mr-1" />
                {errors.timeline}
              </p>
            )}
          </div>

          {/* Terms */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Условия и положения *
            </label>
            <textarea
              value={formData.terms}
              onChange={(e) => setFormData(prev => ({ ...prev, terms: e.target.value }))}
              rows={4}
              className={`w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-purple-500 focus:border-transparent ${
                errors.terms ? 'border-red-300' : 'border-gray-300'
              }`}
              placeholder="Опишите права использования, эксклюзивность, политику правок, условия оплаты и т.д..."
            />
            <div className="flex justify-between items-center mt-1">
              {errors.terms && (
                <p className="text-sm text-red-600 flex items-center">
                  <AlertCircle className="w-4 h-4 mr-1" />
                  {errors.terms}
                </p>
              )}
              <p className="text-sm text-gray-500 ml-auto">
                {formData.terms.length}/500 characters
              </p>
            </div>
          </div>

          {/* Preview */}
          <div className="bg-blue-50 p-4 rounded-lg">
            <h4 className="font-medium text-blue-900 mb-2">Предварительный просмотр предложения</h4>
            <div className="text-sm text-blue-800 space-y-1">
              <p><strong>Ставка:</strong> ${formData.rate.toLocaleString()} {formData.currency}</p>
              <p><strong>Временные рамки:</strong> {formData.timeline || 'Не указано'}</p>
              <p><strong>Результаты:</strong> {formData.deliverables.length} элементов</p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t border-gray-200">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
          >
            Отмена
          </button>
          <button
            onClick={handleSendOffer}
            disabled={isLoading}
            className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-2 rounded-md transition-colors flex items-center space-x-2 disabled:opacity-50"
          >
            <Send className="w-4 h-4" />
            <span>{isLoading ? 'Отправка...' : 'Отправить предложение'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}