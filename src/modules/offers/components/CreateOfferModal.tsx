import React, { useState, useEffect } from 'react';
import { CollaborationOffer, Campaign, InfluencerCard } from '../../../core/types';
import { offerService } from '../services/offerService';
import { campaignService } from '../../campaigns/services/campaignService';
import { supabase } from '../../../core/supabase';
import { X, Save, AlertCircle, Plus, Trash2, Search, Target, Users } from 'lucide-react';
import toast from 'react-hot-toast';

interface CreateOfferModalProps {
  isOpen: boolean;
  onClose: () => void;
  influencerId: string;
  targetAdvertiserId?: string;
  targetCampaignId?: string;
  onOfferCreated: (offer: CollaborationOffer) => void;
}

export function CreateOfferModal({ 
  isOpen, 
  onClose, 
  influencerId, 
  targetAdvertiserId,
  targetCampaignId,
  onOfferCreated 
}: CreateOfferModalProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [availableAdvertisers, setAvailableAdvertisers] = useState<any[]>([]);
  const [availableCampaigns, setAvailableCampaigns] = useState<Campaign[]>([]);
  const [isLoadingData, setIsLoadingData] = useState(false);

  const [formData, setFormData] = useState({
    advertiserId: targetAdvertiserId || '',
    campaignId: targetCampaignId || '',
    title: '',
    description: '',
    proposedRate: 0,
    currency: 'USD',
    deliverables: [] as string[],
    timeline: ''
  });

  const [newDeliverable, setNewDeliverable] = useState('');
  const [advertiserSearch, setAdvertiserSearch] = useState('');

  useEffect(() => {
    if (isOpen) {
      loadAvailableData();
    }
  }, [isOpen]);

  const loadAvailableData = async () => {
    try {
      setIsLoadingData(true);
      
      // Load advertisers
      const { data: advertisers, error: advertisersError } = await supabase
        .from('user_profiles')
        .select('user_id, full_name, avatar, advertiser_data')
        .eq('user_type', 'advertiser')
        .not('user_id', 'eq', influencerId)
        .limit(20);

      if (advertisersError) throw advertisersError;
      setAvailableAdvertisers(advertisers || []);

      // Load campaigns if advertiser is selected
      if (formData.advertiserId) {
        const campaigns = await campaignService.getAdvertiserCampaigns(formData.advertiserId);
        setAvailableCampaigns(campaigns.filter(c => c.status === 'active'));
      }
    } catch (error) {
      console.error('Failed to load available data:', error);
      toast.error('Не удалось загрузить данные');
    } finally {
      setIsLoadingData(false);
    }
  };

  const loadCampaignsForAdvertiser = async (advertiserId: string) => {
    try {
      const campaigns = await campaignService.getAdvertiserCampaigns(advertiserId);
      setAvailableCampaigns(campaigns.filter(c => c.status === 'active'));
    } catch (error) {
      console.error('Failed to load campaigns:', error);
      setAvailableCampaigns([]);
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.advertiserId) {
      newErrors.advertiserId = 'Выберите рекламодателя';
    }

    if (!formData.title.trim()) {
      newErrors.title = 'Название предложения обязательно';
    } else if (formData.title.length < 5) {
      newErrors.title = 'Название должно содержать минимум 5 символов';
    }

    if (!formData.description.trim()) {
      newErrors.description = 'Описание предложения обязательно';
    } else if (formData.description.length < 20) {
      newErrors.description = 'Описание должно содержать минимум 20 символов';
    }

    if (!formData.proposedRate || formData.proposedRate <= 0) {
      newErrors.proposedRate = 'Укажите корректную ставку';
    }

    if (!formData.timeline.trim()) {
      newErrors.timeline = 'Временные рамки обязательны';
    }

    if (formData.deliverables.length === 0) {
      newErrors.deliverables = 'Добавьте хотя бы один результат';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!validateForm()) {
      toast.error('Пожалуйста, исправьте ошибки перед отправкой');
      return;
    }

    setIsLoading(true);
    try {
      const offerData: Partial<CollaborationOffer> = {
        influencerId,
        advertiserId: formData.advertiserId,
        campaignId: formData.campaignId || undefined,
        title: formData.title,
        description: formData.description,
        proposedRate: formData.proposedRate,
        currency: formData.currency,
        deliverables: formData.deliverables,
        timeline: formData.timeline
      };

      const createdOffer = await offerService.createOffer(offerData);
      toast.success('Предложение отправлено успешно!');
      onOfferCreated(createdOffer);
      onClose();
    } catch (error: any) {
      console.error('Failed to create offer:', error);
      toast.error(error.message || 'Не удалось создать предложение');
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

  const handleAdvertiserSelect = async (advertiserId: string) => {
    setFormData(prev => ({ ...prev, advertiserId, campaignId: '' }));
    await loadCampaignsForAdvertiser(advertiserId);
  };

  const filteredAdvertisers = availableAdvertisers.filter(advertiser =>
    advertiser.full_name.toLowerCase().includes(advertiserSearch.toLowerCase())
  );

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">
            Создать предложение о сотрудничестве
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
          {/* Advertiser Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Рекламодатель *
            </label>
            {!targetAdvertiserId ? (
              <div className="space-y-3">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <input
                    type="text"
                    placeholder="Поиск рекламодателей..."
                    value={advertiserSearch}
                    onChange={(e) => setAdvertiserSearch(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                
                <div className="max-h-32 overflow-y-auto border border-gray-300 rounded-md">
                  {isLoadingData ? (
                    <div className="p-4 text-center text-gray-600">Загрузка...</div>
                  ) : filteredAdvertisers.length === 0 ? (
                    <div className="p-4 text-center text-gray-600">Рекламодатели не найдены</div>
                  ) : (
                    filteredAdvertisers.map((advertiser) => (
                      <button
                        key={advertiser.user_id}
                        onClick={() => handleAdvertiserSelect(advertiser.user_id)}
                        className={`w-full p-3 text-left hover:bg-gray-50 border-b border-gray-100 last:border-b-0 ${
                          formData.advertiserId === advertiser.user_id ? 'bg-blue-50' : ''
                        }`}
                      >
                        <div className="flex items-center space-x-3">
                          <div className="w-8 h-8 bg-gradient-to-r from-blue-400 to-green-400 rounded-full flex items-center justify-center">
                            {advertiser.avatar ? (
                              <img 
                                src={advertiser.avatar} 
                                alt={advertiser.full_name}
                                className="w-8 h-8 rounded-full object-cover"
                              />
                            ) : (
                              <span className="text-white font-semibold text-sm">
                                {advertiser.full_name.charAt(0).toUpperCase()}
                              </span>
                            )}
                          </div>
                          <div>
                            <p className="text-sm font-medium text-gray-900">{advertiser.full_name}</p>
                            <p className="text-xs text-gray-600">
                              {advertiser.advertiser_data?.companyName || 'Рекламодатель'}
                            </p>
                          </div>
                        </div>
                      </button>
                    ))
                  )}
                </div>
              </div>
            ) : (
              <div className="p-3 bg-gray-50 rounded-md">
                <p className="text-sm text-gray-900">Выбранный рекламодатель</p>
              </div>
            )}
            {errors.advertiserId && (
              <p className="mt-1 text-sm text-red-600 flex items-center">
                <AlertCircle className="w-4 h-4 mr-1" />
                {errors.advertiserId}
              </p>
            )}
          </div>

          {/* Campaign Selection */}
          {formData.advertiserId && !targetCampaignId && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Кампания (опционально)
              </label>
              <select
                value={formData.campaignId}
                onChange={(e) => setFormData(prev => ({ ...prev, campaignId: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Выберите кампанию...</option>
                {availableCampaigns.map((campaign) => (
                  <option key={campaign.campaignId} value={campaign.campaignId}>
                    {campaign.title} ({campaign.brand})
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Title */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Название предложения *
            </label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
              className={`w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                errors.title ? 'border-red-300' : 'border-gray-300'
              }`}
              placeholder="Сотрудничество с брендом XYZ"
            />
            {errors.title && (
              <p className="mt-1 text-sm text-red-600 flex items-center">
                <AlertCircle className="w-4 h-4 mr-1" />
                {errors.title}
              </p>
            )}
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Описание предложения *
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              rows={4}
              className={`w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                errors.description ? 'border-red-300' : 'border-gray-300'
              }`}
              placeholder="Опишите ваше предложение, опыт и почему вы подходите для этого сотрудничества..."
            />
            <div className="flex justify-between items-center mt-1">
              {errors.description && (
                <p className="text-sm text-red-600 flex items-center">
                  <AlertCircle className="w-4 h-4 mr-1" />
                  {errors.description}
                </p>
              )}
              <p className="text-sm text-gray-500 ml-auto">
                {formData.description.length}/1000 символов
              </p>
            </div>
          </div>

          {/* Proposed Rate */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Предлагаемая ставка *
              </label>
              <input
                type="number"
                value={formData.proposedRate}
                onChange={(e) => setFormData(prev => ({ ...prev, proposedRate: parseInt(e.target.value) || 0 }))}
                className={`w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  errors.proposedRate ? 'border-red-300' : 'border-gray-300'
                }`}
                placeholder="1000"
              />
              {errors.proposedRate && (
                <p className="mt-1 text-sm text-red-600 flex items-center">
                  <AlertCircle className="w-4 h-4 mr-1" />
                  {errors.proposedRate}
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Валюта
              </label>
              <select
                value={formData.currency}
                onChange={(e) => setFormData(prev => ({ ...prev, currency: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="USD">USD</option>
                <option value="EUR">EUR</option>
                <option value="RUB">RUB</option>
              </select>
            </div>
          </div>

          {/* Timeline */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Временные рамки *
            </label>
            <input
              type="text"
              value={formData.timeline}
              onChange={(e) => setFormData(prev => ({ ...prev, timeline: e.target.value }))}
              className={`w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                errors.timeline ? 'border-red-300' : 'border-gray-300'
              }`}
              placeholder="например, 2 недели с момента принятия, до 15 марта"
            />
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
              Что вы предлагаете *
            </label>
            
            <div className="flex space-x-2 mb-3">
              <input
                type="text"
                value={newDeliverable}
                onChange={(e) => setNewDeliverable(e.target.value)}
                placeholder="например, 1 пост в Instagram, 3 Stories"
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                onKeyPress={(e) => e.key === 'Enter' && addDeliverable()}
              />
              <button
                type="button"
                onClick={addDeliverable}
                className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2">
              {formData.deliverables.map((deliverable, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-md">
                  <span className="text-sm text-gray-900">{deliverable}</span>
                  <button
                    onClick={() => removeDeliverable(index)}
                    className="text-red-600 hover:text-red-800 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
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
            onClick={handleSave}
            disabled={isLoading}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-md transition-colors flex items-center space-x-2 disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            <span>{isLoading ? 'Отправка...' : 'Отправить предложение'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}