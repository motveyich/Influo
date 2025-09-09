import React, { useState, useEffect } from 'react';
import { CollaborationForm, Campaign } from '../../../core/types';
import { collaborationService } from '../services/collaborationService';
import { campaignService } from '../../campaigns/services/campaignService';
import { X, Send, AlertCircle, DollarSign, Calendar, Package } from 'lucide-react';
import toast from 'react-hot-toast';

interface CollaborationRequestModalProps {
  isOpen: boolean;
  onClose: () => void;
  campaign?: Campaign;
  receiverId: string;
  senderId: string;
  onRequestSent?: (request: CollaborationForm) => void;
}

export function CollaborationRequestModal({
  isOpen,
  onClose,
  campaign,
  receiverId,
  senderId,
  onRequestSent
}: CollaborationRequestModalProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [availableCampaigns, setAvailableCampaigns] = useState<Campaign[]>([]);
  const [selectedCampaignId, setSelectedCampaignId] = useState<string>('');
  const [isLoadingCampaigns, setIsLoadingCampaigns] = useState(false);

  const [formData, setFormData] = useState({
    campaignTitle: campaign?.title || '',
    message: '',
    proposedRate: 0,
    deliverables: [] as string[],
    timeline: '',
    additionalNotes: ''
  });

  const [newDeliverable, setNewDeliverable] = useState('');

  useEffect(() => {
    if (campaign) {
      setFormData(prev => ({
        ...prev,
        campaignTitle: campaign.title
      }));
      setSelectedCampaignId(campaign.campaignId);
    } else if (isOpen && senderId) {
      // Fetch sender's campaigns if no specific campaign is provided
      fetchSenderCampaigns();
    }
  }, [campaign, isOpen, senderId]);

  const fetchSenderCampaigns = async () => {
    try {
      setIsLoadingCampaigns(true);
      const campaigns = await campaignService.getAdvertiserCampaigns(senderId);
      setAvailableCampaigns(campaigns);
      
      // Auto-select first active campaign if available
      const activeCampaign = campaigns.find(c => c.status === 'active');
      if (activeCampaign) {
        setSelectedCampaignId(activeCampaign.campaignId);
        setFormData(prev => ({
          ...prev,
          campaignTitle: activeCampaign.title
        }));
      }
    } catch (error) {
      console.error('Failed to fetch campaigns:', error);
      toast.error('Failed to load your campaigns');
    } finally {
      setIsLoadingCampaigns(false);
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.campaignTitle.trim()) {
      newErrors.campaignTitle = 'Campaign title is required';
    }

    if (!formData.message.trim()) {
      newErrors.message = 'Message is required';
    } else if (formData.message.length < 10) {
      newErrors.message = 'Message must be at least 10 characters long';
    }

    if (!formData.proposedRate || formData.proposedRate <= 0) {
      newErrors.proposedRate = 'Valid proposed rate is required';
    }

    if (formData.deliverables.length === 0) {
      newErrors.deliverables = 'At least one deliverable is required';
    }

    if (!formData.timeline.trim()) {
      newErrors.timeline = 'Timeline is required';
    }

    if (!campaign && !selectedCampaignId) {
      newErrors.selectedCampaign = 'Please select a campaign to link this collaboration request';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSendRequest = async () => {
    if (!validateForm()) {
      toast.error('Please fix the errors before sending');
      return;
    }

    setIsLoading(true);
    try {
      const requestData: Partial<CollaborationForm> = {
        formFields: formData,
        linkedCampaign: campaign?.campaignId || selectedCampaignId,
        senderId,
        receiverId
      };

      const sentRequest = await collaborationService.sendCollaborationRequest(requestData);
      
      toast.success('Collaboration request sent successfully!');
      onRequestSent?.(sentRequest);
      onClose();
    } catch (error: any) {
      console.error('Failed to send collaboration request:', error);
      
      if (error.message.includes('Rate limit exceeded')) {
        toast.error('You are sending requests too quickly. Please wait before sending another.');
      } else if (error.message.includes('queued due to delivery delay')) {
        toast.warning('Request queued due to network issues. It will be delivered shortly.');
      } else {
        toast.error(error.message || 'Failed to send collaboration request');
      }
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

  const handleCampaignSelect = (campaignId: string) => {
    setSelectedCampaignId(campaignId);
    const selectedCampaign = availableCampaigns.find(c => c.campaignId === campaignId);
    if (selectedCampaign) {
      setFormData(prev => ({
        ...prev,
        campaignTitle: selectedCampaign.title
      }));
    }
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
            Отправить запрос на сотрудничество
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
          {/* Campaign Selection - only show if no specific campaign provided */}
          {!campaign && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Выберите кампанию *
              </label>
              {isLoadingCampaigns ? (
                <div className="flex items-center justify-center p-4 border border-gray-300 rounded-md">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-purple-600"></div>
                  <span className="ml-2 text-gray-600">Загрузка кампаний...</span>
                </div>
              ) : availableCampaigns.length > 0 ? (
                <select
                  value={selectedCampaignId}
                  onChange={(e) => handleCampaignSelect(e.target.value)}
                  className={`w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-purple-500 focus:border-transparent ${
                    errors.selectedCampaign ? 'border-red-300' : 'border-gray-300'
                  }`}
                >
                  <option value="">Выберите кампанию...</option>
                  {availableCampaigns.map((campaign) => (
                    <option key={campaign.campaignId} value={campaign.campaignId}>
                      {campaign.title} ({campaign.status})
                    </option>
                  ))}
                </select>
              ) : (
                <div className="p-4 border border-gray-300 rounded-md bg-gray-50">
                  <p className="text-gray-600 text-center">
                    У вас нет активных кампаний. Создайте кампанию, чтобы отправлять запросы на сотрудничество.
                  </p>
                </div>
              )}
              {errors.selectedCampaign && (
                <p className="mt-1 text-sm text-red-600 flex items-center">
                  <AlertCircle className="w-4 h-4 mr-1" />
                  {errors.selectedCampaign}
                </p>
              )}
            </div>
          )}

          {/* Campaign Title */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Название кампании *
            </label>
            <input
              type="text"
              value={formData.campaignTitle}
              onChange={(e) => setFormData(prev => ({ ...prev, campaignTitle: e.target.value }))}
              className={`w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-purple-500 focus:border-transparent ${
                errors.campaignTitle ? 'border-red-300' : 'border-gray-300'
              }`}
              placeholder="Введите название кампании"
              disabled={!!campaign || !!selectedCampaignId}
            />
            {errors.campaignTitle && (
              <p className="mt-1 text-sm text-red-600 flex items-center">
                <AlertCircle className="w-4 h-4 mr-1" />
                {errors.campaignTitle}
              </p>
            )}
          </div>

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
              placeholder="Опишите ваше предложение о сотрудничестве, соответствие бренду и почему вы заинтересованы..."
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

          {/* Proposed Rate */}
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

          {/* Additional Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Дополнительные заметки
            </label>
            <textarea
              value={formData.additionalNotes}
              onChange={(e) => setFormData(prev => ({ ...prev, additionalNotes: e.target.value }))}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              placeholder="Любая дополнительная информация, требования или вопросы..."
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
            onClick={handleSendRequest}
            disabled={isLoading}
            className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-2 rounded-md transition-colors flex items-center space-x-2 disabled:opacity-50"
          >
            <Send className="w-4 h-4" />
            <span>{isLoading ? 'Отправка...' : 'Отправить запрос'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}