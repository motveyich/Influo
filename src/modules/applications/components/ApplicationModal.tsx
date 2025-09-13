import React, { useState } from 'react';
import { Application } from '../../../core/types';
import { applicationService } from '../services/applicationService';
import { X, Send, AlertCircle, DollarSign, Calendar, Package } from 'lucide-react';
import toast from 'react-hot-toast';

interface ApplicationModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetId: string;
  targetType: 'influencer_card' | 'advertiser_card' | 'campaign';
  targetReferenceId: string;
  applicantId: string;
  onApplicationSent?: (application: Application) => void;
  completedApplicationId?: string; // For showing review option
  showReviewOption?: boolean;
}

export function ApplicationModal({
  isOpen,
  onClose,
  targetId,
  targetType,
  targetReferenceId,
  applicantId,
  onApplicationSent,
  completedApplicationId,
  showReviewOption = false
}: ApplicationModalProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [formData, setFormData] = useState({
    message: '',
    proposedRate: 0,
    timeline: '',
    deliverables: [] as string[],
    additionalInfo: '',
    status: 'pending'
  });

  const [newDeliverable, setNewDeliverable] = useState('');

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.message.trim()) {
      newErrors.message = 'Сообщение обязательно';
    } else if (formData.message.length < 10) {
      newErrors.message = 'Сообщение должно содержать минимум 10 символов';
    }

    if (targetType !== 'campaign' && (!formData.proposedRate || formData.proposedRate <= 0)) {
      newErrors.proposedRate = 'Укажите предлагаемую ставку';
    }

    if (!formData.timeline.trim()) {
      newErrors.timeline = 'Временные рамки обязательны';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSendApplication = async () => {
    if (!validateForm()) {
      toast.error('Пожалуйста, исправьте ошибки перед отправкой');
      return;
    }

    setIsLoading(true);
    try {
      const applicationData: Partial<Application> = {
        applicantId,
        targetId,
        targetType,
        targetReferenceId,
        applicationData: formData
      };

      const sentApplication = await applicationService.createApplication(applicationData);
      
      toast.success('Заявка отправлена успешно!');
      onApplicationSent?.(sentApplication);
      onClose();
    } catch (error: any) {
      console.error('Failed to send application:', error);
      toast.error(error.message || 'Не удалось отправить заявку');
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
            Отправить заявку на сотрудничество
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
          {/* Message */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Сообщение *
            </label>
            <textarea
              value={formData.message}
              onChange={(e) => setFormData(prev => ({ ...prev, message: e.target.value }))}
              rows={4}
              className={`w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-purple-500 focus:border-transparent ${
                errors.message ? 'border-red-300' : 'border-gray-300'
              }`}
              placeholder="Расскажите о себе, своем опыте и почему вы заинтересованы в сотрудничестве..."
            />
            <div className="flex justify-between items-center mt-1">
              {errors.message && (
                <p className="text-sm text-red-600 flex items-center">
                  <AlertCircle className="w-4 h-4 mr-1" />
                  {errors.message}
                </p>
              )}
              <p className="text-sm text-gray-500 ml-auto">
                {formData.message.length}/1000 символов
              </p>
            </div>
          </div>

          {/* Proposed Rate (for non-campaign applications) */}
          {targetType !== 'campaign' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Предлагаемая ставка (USD) *
              </label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="number"
                  value={formData.proposedRate}
                  onChange={(e) => setFormData(prev => ({ ...prev, proposedRate: parseInt(e.target.value) || 0 }))}
                  className={`w-full pl-10 pr-4 py-2 border rounded-md focus:ring-2 focus:ring-purple-500 focus:border-transparent ${
                    errors.proposedRate ? 'border-red-300' : 'border-gray-300'
                  }`}
                  placeholder="1000"
                />
              </div>
              {errors.proposedRate && (
                <p className="mt-1 text-sm text-red-600 flex items-center">
                  <AlertCircle className="w-4 h-4 mr-1" />
                  {errors.proposedRate}
                </p>
              )}
            </div>
          )}

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

          {/* Deliverables */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Что вы предлагаете
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
          </div>

          {/* Additional Info */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Дополнительная информация
            </label>
            <textarea
              value={formData.additionalInfo}
              onChange={(e) => setFormData(prev => ({ ...prev, additionalInfo: e.target.value }))}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              placeholder="Любая дополнительная информация, портфолио, опыт работы..."
            />
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
            onClick={handleSendApplication}
            disabled={isLoading}
            className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-2 rounded-md transition-colors flex items-center space-x-2 disabled:opacity-50"
          >
            <Send className="w-4 h-4" />
            <span>{isLoading ? 'Отправка...' : 'Отправить заявку'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}