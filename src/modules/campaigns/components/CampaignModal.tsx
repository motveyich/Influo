import React, { useState, useEffect } from 'react';
import { Campaign } from '../../../core/types';
import { campaignService } from '../services/campaignService';
import { X, Save, AlertCircle, Plus, Trash2, Calendar, DollarSign } from 'lucide-react';
import toast from 'react-hot-toast';

interface CampaignModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentCampaign?: Campaign | null;
  advertiserId: string;
  onCampaignSaved: (campaign: Campaign) => void;
}

const PLATFORMS = ['instagram', 'youtube', 'twitter', 'tiktok'];
const CONTENT_TYPES = ['post', 'story', 'reel', 'video', 'live', 'igtv', 'shorts'];
const COUNTRIES = ['US', 'UK', 'CA', 'AU', 'DE', 'FR', 'ES', 'IT', 'NL', 'BR', 'MX', 'IN'];
const GENDERS = ['male', 'female', 'non-binary'];

export function CampaignModal({ 
  isOpen, 
  onClose, 
  currentCampaign, 
  advertiserId, 
  onCampaignSaved 
}: CampaignModalProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Form state
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    brand: '',
    budget: {
      min: 0,
      max: 0,
      currency: 'USD'
    },
    preferences: {
      platforms: [] as string[],
      contentTypes: [] as string[],
      audienceSize: {
        min: 0,
        max: 0
      },
      demographics: {
        ageRange: [18, 65] as [number, number],
        genders: [] as string[],
        countries: [] as string[]
      }
    },
    timeline: {
      startDate: '',
      endDate: '',
      deliverables: [] as Array<{
        type: string;
        dueDate: string;
        completed: boolean;
      }>
    },
    status: 'draft' as Campaign['status']
  });

  useEffect(() => {
    if (currentCampaign) {
      setFormData({
        title: currentCampaign.title,
        description: currentCampaign.description,
        brand: currentCampaign.brand,
        budget: currentCampaign.budget,
        preferences: currentCampaign.preferences,
        timeline: currentCampaign.timeline,
        status: currentCampaign.status
      });
    } else {
      // Reset form for new campaign
      setFormData({
        title: '',
        description: '',
        brand: '',
        budget: { min: 0, max: 0, currency: 'USD' },
        preferences: {
          platforms: [],
          contentTypes: [],
          audienceSize: { min: 0, max: 0 },
          demographics: {
            ageRange: [18, 65],
            genders: [],
            countries: []
          }
        },
        timeline: {
          startDate: '',
          endDate: '',
          deliverables: []
        },
        status: 'draft'
      });
    }
    setErrors({});
  }, [currentCampaign, isOpen]);

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.title.trim()) {
      newErrors.title = 'Campaign title is required';
    } else if (formData.title.trim().length < 3) {
      newErrors.title = 'Title must be at least 3 characters';
    }

    if (!formData.brand.trim()) {
      newErrors.brand = 'Brand name is required';
    }

    if (!formData.description.trim()) {
      newErrors.description = 'Description is required';
    } else if (formData.description.trim().length < 10) {
      newErrors.description = 'Description must be at least 10 characters';
    }

    if (formData.budget.min <= 0) {
      newErrors.minBudget = 'Minimum budget must be greater than 0';
    }

    if (formData.budget.max <= 0) {
      newErrors.maxBudget = 'Maximum budget must be greater than 0';
    }

    if (formData.budget.min > formData.budget.max) {
      newErrors.budget = 'Minimum budget cannot be greater than maximum budget';
    }

    if (formData.preferences.platforms.length === 0) {
      newErrors.platforms = 'Select at least one platform';
    }

    if (formData.preferences.contentTypes.length === 0) {
      newErrors.contentTypes = 'Select at least one content type';
    }

    if (!formData.timeline.startDate) {
      newErrors.startDate = 'Start date is required';
    }

    if (!formData.timeline.endDate) {
      newErrors.endDate = 'End date is required';
    }

    if (formData.timeline.startDate && formData.timeline.endDate) {
      const startDate = new Date(formData.timeline.startDate);
      const endDate = new Date(formData.timeline.endDate);
      
      if (startDate >= endDate) {
        newErrors.timeline = 'End date must be after start date';
      }
      
      if (startDate < new Date()) {
        newErrors.startDate = 'Start date cannot be in the past';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!validateForm()) {
      toast.error('Please fix the errors before saving');
      return;
    }

    setIsLoading(true);
    try {
      const campaignData: Partial<Campaign> = {
        advertiserId,
        ...formData
      };

      let savedCampaign: Campaign;
      if (currentCampaign) {
        savedCampaign = await campaignService.updateCampaign(currentCampaign.campaignId, campaignData);
        toast.success('Campaign updated successfully!');
      } else {
        savedCampaign = await campaignService.createCampaign(campaignData);
        toast.success('Campaign created successfully!');
      }

      onCampaignSaved(savedCampaign);
      onClose();
    } catch (error: any) {
      console.error('Failed to save campaign:', error);
      toast.error(error.message || 'Failed to save campaign');
    } finally {
      setIsLoading(false);
    }
  };

  const handleArrayToggle = (array: string[], item: string, setter: (newArray: string[]) => void) => {
    if (array.includes(item)) {
      setter(array.filter(i => i !== item));
    } else {
      setter([...array, item]);
    }
  };

  const addDeliverable = () => {
    setFormData(prev => ({
      ...prev,
      timeline: {
        ...prev.timeline,
        deliverables: [
          ...prev.timeline.deliverables,
          {
            type: '',
            dueDate: '',
            completed: false
          }
        ]
      }
    }));
  };

  const removeDeliverable = (index: number) => {
    setFormData(prev => ({
      ...prev,
      timeline: {
        ...prev.timeline,
        deliverables: prev.timeline.deliverables.filter((_, i) => i !== index)
      }
    }));
  };

  const updateDeliverable = (index: number, field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      timeline: {
        ...prev.timeline,
        deliverables: prev.timeline.deliverables.map((deliverable, i) =>
          i === index ? { ...deliverable, [field]: value } : deliverable
        )
      }
    }));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">
            {currentCampaign ? 'Редактировать кампанию' : 'Создать кампанию'}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[70vh] space-y-8">
          {/* Basic Information */}
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4">Основная информация</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Название кампании *
                </label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                  className={`w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-purple-500 focus:border-transparent ${
                    errors.title ? 'border-red-300' : 'border-gray-300'
                  }`}
                  placeholder="Введите название кампании"
                />
                {errors.title && (
                  <p className="mt-1 text-sm text-red-600 flex items-center">
                    <AlertCircle className="w-4 h-4 mr-1" />
                    {errors.title}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Название бренда *
                </label>
                <input
                  type="text"
                  value={formData.brand}
                  onChange={(e) => setFormData(prev => ({ ...prev, brand: e.target.value }))}
                  className={`w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-purple-500 focus:border-transparent ${
                    errors.brand ? 'border-red-300' : 'border-gray-300'
                  }`}
                  placeholder="Введите название бренда"
                />
                {errors.brand && (
                  <p className="mt-1 text-sm text-red-600 flex items-center">
                    <AlertCircle className="w-4 h-4 mr-1" />
                    {errors.brand}
                  </p>
                )}
              </div>
            </div>

            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Описание *
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                rows={4}
                className={`w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-purple-500 focus:border-transparent ${
                  errors.description ? 'border-red-300' : 'border-gray-300'
                }`}
                placeholder="Опишите цели кампании, требования и ожидания..."
              />
              {errors.description && (
                <p className="mt-1 text-sm text-red-600 flex items-center">
                  <AlertCircle className="w-4 h-4 mr-1" />
                  {errors.description}
                </p>
              )}
            </div>
          </div>

          {/* Budget */}
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4">Бюджет</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Минимальный бюджет *
                </label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <input
                    type="number"
                    value={formData.budget.min}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      budget: { ...prev.budget, min: parseInt(e.target.value) || 0 }
                    }))}
                    className={`w-full pl-10 pr-4 py-2 border rounded-md focus:ring-2 focus:ring-purple-500 focus:border-transparent ${
                      errors.minBudget ? 'border-red-300' : 'border-gray-300'
                    }`}
                    placeholder="1000"
                  />
                </div>
                {errors.minBudget && (
                  <p className="mt-1 text-sm text-red-600 flex items-center">
                    <AlertCircle className="w-4 h-4 mr-1" />
                    {errors.minBudget}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Максимальный бюджет *
                </label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <input
                    type="number"
                    value={formData.budget.max}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      budget: { ...prev.budget, max: parseInt(e.target.value) || 0 }
                    }))}
                    className={`w-full pl-10 pr-4 py-2 border rounded-md focus:ring-2 focus:ring-purple-500 focus:border-transparent ${
                      errors.maxBudget ? 'border-red-300' : 'border-gray-300'
                    }`}
                    placeholder="5000"
                  />
                </div>
                {errors.maxBudget && (
                  <p className="mt-1 text-sm text-red-600 flex items-center">
                    <AlertCircle className="w-4 h-4 mr-1" />
                    {errors.maxBudget}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Валюта
                </label>
                <select
                  value={formData.budget.currency}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    budget: { ...prev.budget, currency: e.target.value }
                  }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                >
                  <option value="USD">USD</option>
                  <option value="EUR">EUR</option>
                  <option value="GBP">GBP</option>
                </select>
              </div>
            </div>
            {errors.budget && (
              <p className="mt-2 text-sm text-red-600 flex items-center">
                <AlertCircle className="w-4 h-4 mr-1" />
                {errors.budget}
              </p>
            )}
          </div>

          {/* Preferences */}
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4">Предпочтения кампании</h3>
            
            {/* Platforms */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Платформы *
              </label>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                {PLATFORMS.map((platform) => (
                  <button
                    key={platform}
                    type="button"
                    onClick={() => handleArrayToggle(
                      formData.preferences.platforms,
                      platform,
                      (newPlatforms) => setFormData(prev => ({
                        ...prev,
                        preferences: { ...prev.preferences, platforms: newPlatforms }
                      }))
                    )}
                    className={`px-3 py-2 text-sm rounded-md border transition-colors capitalize ${
                      formData.preferences.platforms.includes(platform)
                        ? 'bg-purple-100 border-purple-300 text-purple-700'
                        : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    {platform}
                  </button>
                ))}
              </div>
              {errors.platforms && (
                <p className="mt-1 text-sm text-red-600 flex items-center">
                  <AlertCircle className="w-4 h-4 mr-1" />
                  {errors.platforms}
                </p>
              )}
            </div>

            {/* Content Types */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Типы контента *
              </label>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                {CONTENT_TYPES.map((type) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => handleArrayToggle(
                      formData.preferences.contentTypes,
                      type,
                      (newTypes) => setFormData(prev => ({
                        ...prev,
                        preferences: { ...prev.preferences, contentTypes: newTypes }
                      }))
                    )}
                    className={`px-3 py-2 text-sm rounded-md border transition-colors capitalize ${
                      formData.preferences.contentTypes.includes(type)
                        ? 'bg-purple-100 border-purple-300 text-purple-700'
                        : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    {type}
                  </button>
                ))}
              </div>
              {errors.contentTypes && (
                <p className="mt-1 text-sm text-red-600 flex items-center">
                  <AlertCircle className="w-4 h-4 mr-1" />
                  {errors.contentTypes}
                </p>
              )}
            </div>

            {/* Audience Size */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Размер целевой аудитории
              </label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    Минимум подписчиков
                  </label>
                  <input
                    type="number"
                    value={formData.preferences.audienceSize.min}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      preferences: {
                        ...prev.preferences,
                        audienceSize: {
                          ...prev.preferences.audienceSize,
                          min: parseInt(e.target.value) || 0
                        }
                      }
                    }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    placeholder="10000"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    Максимум подписчиков
                  </label>
                  <input
                    type="number"
                    value={formData.preferences.audienceSize.max}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      preferences: {
                        ...prev.preferences,
                        audienceSize: {
                          ...prev.preferences.audienceSize,
                          max: parseInt(e.target.value) || 0
                        }
                      }
                    }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    placeholder="1000000"
                  />
                </div>
              </div>
            </div>

            {/* Demographics */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Целевая демография
              </label>
              
              {/* Age Range */}
              <div className="mb-4">
                <label className="block text-xs font-medium text-gray-600 mb-2">
                  Возрастной диапазон: {formData.preferences.demographics.ageRange[0]} - {formData.preferences.demographics.ageRange[1]}
                </label>
                <div className="flex space-x-4">
                  <input
                    type="range"
                    min="13"
                    max="65"
                    value={formData.preferences.demographics.ageRange[0]}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      preferences: {
                        ...prev.preferences,
                        demographics: {
                          ...prev.preferences.demographics,
                          ageRange: [parseInt(e.target.value), prev.preferences.demographics.ageRange[1]]
                        }
                      }
                    }))}
                    className="flex-1"
                  />
                  <input
                    type="range"
                    min="13"
                    max="65"
                    value={formData.preferences.demographics.ageRange[1]}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      preferences: {
                        ...prev.preferences,
                        demographics: {
                          ...prev.preferences.demographics,
                          ageRange: [prev.preferences.demographics.ageRange[0], parseInt(e.target.value)]
                        }
                      }
                    }))}
                    className="flex-1"
                  />
                </div>
              </div>

              {/* Genders */}
              <div className="mb-4">
                <label className="block text-xs font-medium text-gray-600 mb-2">
                  Целевые гендеры
                </label>
                <div className="flex space-x-2">
                  {GENDERS.map((gender) => (
                    <button
                      key={gender}
                      type="button"
                      onClick={() => handleArrayToggle(
                        formData.preferences.demographics.genders,
                        gender,
                        (newGenders) => setFormData(prev => ({
                          ...prev,
                          preferences: {
                            ...prev.preferences,
                            demographics: {
                              ...prev.preferences.demographics,
                              genders: newGenders
                            }
                          }
                        }))
                      )}
                      className={`px-3 py-1 text-sm rounded-md border transition-colors capitalize ${
                        formData.preferences.demographics.genders.includes(gender)
                          ? 'bg-purple-100 border-purple-300 text-purple-700'
                          : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      {gender}
                    </button>
                  ))}
                </div>
              </div>

              {/* Countries */}
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-2">
                  Целевые страны
                </label>
                <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
                  {COUNTRIES.map((country) => (
                    <button
                      key={country}
                      type="button"
                      onClick={() => handleArrayToggle(
                        formData.preferences.demographics.countries,
                        country,
                        (newCountries) => setFormData(prev => ({
                          ...prev,
                          preferences: {
                            ...prev.preferences,
                            demographics: {
                              ...prev.preferences.demographics,
                              countries: newCountries
                            }
                          }
                        }))
                      )}
                      className={`px-2 py-1 text-xs rounded-md border transition-colors ${
                        formData.preferences.demographics.countries.includes(country)
                          ? 'bg-purple-100 border-purple-300 text-purple-700'
                          : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      {country}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Timeline */}
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4">Временные рамки</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Дата начала *
                </label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <input
                    type="date"
                    value={formData.timeline.startDate}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      timeline: { ...prev.timeline, startDate: e.target.value }
                    }))}
                    className={`w-full pl-10 pr-4 py-2 border rounded-md focus:ring-2 focus:ring-purple-500 focus:border-transparent ${
                      errors.startDate ? 'border-red-300' : 'border-gray-300'
                    }`}
                  />
                </div>
                {errors.startDate && (
                  <p className="mt-1 text-sm text-red-600 flex items-center">
                    <AlertCircle className="w-4 h-4 mr-1" />
                    {errors.startDate}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Дата окончания *
                </label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <input
                    type="date"
                    value={formData.timeline.endDate}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      timeline: { ...prev.timeline, endDate: e.target.value }
                    }))}
                    className={`w-full pl-10 pr-4 py-2 border rounded-md focus:ring-2 focus:ring-purple-500 focus:border-transparent ${
                      errors.endDate ? 'border-red-300' : 'border-gray-300'
                    }`}
                  />
                </div>
                {errors.endDate && (
                  <p className="mt-1 text-sm text-red-600 flex items-center">
                    <AlertCircle className="w-4 h-4 mr-1" />
                    {errors.endDate}
                  </p>
                )}
              </div>
            </div>
            {errors.timeline && (
              <p className="mb-4 text-sm text-red-600 flex items-center">
                <AlertCircle className="w-4 h-4 mr-1" />
                {errors.timeline}
              </p>
            )}

            {/* Deliverables */}
            <div>
              <div className="flex justify-between items-center mb-3">
                <label className="block text-sm font-medium text-gray-700">
                  Результаты
                </label>
                <button
                  type="button"
                  onClick={addDeliverable}
                  className="bg-purple-600 text-white px-3 py-1 rounded-md text-sm hover:bg-purple-700 transition-colors flex items-center space-x-1"
                >
                  <Plus className="w-4 h-4" />
                  <span>Добавить</span>
                </button>
              </div>
              
              <div className="space-y-3">
                {formData.timeline.deliverables.map((deliverable, index) => (
                  <div key={index} className="flex space-x-3 items-center">
                    <input
                      type="text"
                      value={deliverable.type}
                      onChange={(e) => updateDeliverable(index, 'type', e.target.value)}
                      placeholder="Тип результата (например, пост в Instagram)"
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    />
                    <input
                      type="date"
                      value={deliverable.dueDate}
                      onChange={(e) => updateDeliverable(index, 'dueDate', e.target.value)}
                      className="px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    />
                    <button
                      type="button"
                      onClick={() => removeDeliverable(index)}
                      className="text-red-600 hover:text-red-800 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Status */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Статус кампании
            </label>
            <select
              value={formData.status}
              onChange={(e) => setFormData(prev => ({ ...prev, status: e.target.value as Campaign['status'] }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            >
              <option value="draft">Черновик</option>
              <option value="active">Активная</option>
              <option value="paused">Приостановлена</option>
              <option value="completed">Завершена</option>
              <option value="cancelled">Отменена</option>
            </select>
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
            className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-2 rounded-md transition-colors flex items-center space-x-2 disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            <span>{isLoading ? 'Сохранение...' : 'Сохранить кампанию'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}