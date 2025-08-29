import React, { useState, useEffect } from 'react';
import { Campaign } from '../../../core/types';
import { automaticCampaignService } from '../services/automaticCampaignService';
import { X, Save, AlertCircle, Plus, Trash2, Calendar, DollarSign, Target, Users, Zap, Settings } from 'lucide-react';
import toast from 'react-hot-toast';

interface AutomaticCampaignModalProps {
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

export function AutomaticCampaignModal({ 
  isOpen, 
  onClose, 
  currentCampaign, 
  advertiserId, 
  onCampaignSaved 
}: AutomaticCampaignModalProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [currentStep, setCurrentStep] = useState(1);

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
    // Automatic campaign specific fields
    automaticSettings: {
      targetInfluencerCount: 10,
      overbookingPercentage: 25,
      batchSize: 20,
      batchDelay: 30, // minutes
      scoringWeights: {
        followers: 30,
        engagement: 40,
        relevance: 20,
        responseTime: 10
      },
      autoReplacement: true,
      maxReplacements: 3
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
        automaticSettings: (currentCampaign as any).automaticSettings || {
          targetInfluencerCount: 10,
          overbookingPercentage: 25,
          batchSize: 20,
          batchDelay: 30,
          scoringWeights: {
            followers: 30,
            engagement: 40,
            relevance: 20,
            responseTime: 10
          },
          autoReplacement: true,
          maxReplacements: 3
        },
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
        automaticSettings: {
          targetInfluencerCount: 10,
          overbookingPercentage: 25,
          batchSize: 20,
          batchDelay: 30,
          scoringWeights: {
            followers: 30,
            engagement: 40,
            relevance: 20,
            responseTime: 10
          },
          autoReplacement: true,
          maxReplacements: 3
        },
        status: 'draft'
      });
    }
    setErrors({});
    setCurrentStep(1);
  }, [currentCampaign, isOpen]);

  const validateStep = (step: number): boolean => {
    const newErrors: Record<string, string> = {};

    if (step === 1) {
      if (!formData.title.trim()) {
        newErrors.title = 'Название кампании обязательно';
      } else if (formData.title.trim().length < 3) {
        newErrors.title = 'Название должно содержать минимум 3 символа';
      }

      if (!formData.brand.trim()) {
        newErrors.brand = 'Название бренда обязательно';
      }

      if (!formData.description.trim()) {
        newErrors.description = 'Описание обязательно';
      } else if (formData.description.trim().length < 10) {
        newErrors.description = 'Описание должно содержать минимум 10 символов';
      }
    }

    if (step === 2) {
      if (formData.budget.min <= 0) {
        newErrors.minBudget = 'Минимальный бюджет должен быть больше 0';
      }

      if (formData.budget.max <= 0) {
        newErrors.maxBudget = 'Максимальный бюджет должен быть больше 0';
      }

      if (formData.budget.min > formData.budget.max) {
        newErrors.budget = 'Минимальный бюджет не может быть больше максимального';
      }

      if (formData.preferences.platforms.length === 0) {
        newErrors.platforms = 'Выберите хотя бы одну платформу';
      }

      if (formData.preferences.contentTypes.length === 0) {
        newErrors.contentTypes = 'Выберите хотя бы один тип контента';
      }
    }

    if (step === 3) {
      if (!formData.timeline.startDate) {
        newErrors.startDate = 'Дата начала обязательна';
      }

      if (!formData.timeline.endDate) {
        newErrors.endDate = 'Дата окончания обязательна';
      }

      if (formData.timeline.startDate && formData.timeline.endDate) {
        const startDate = new Date(formData.timeline.startDate);
        const endDate = new Date(formData.timeline.endDate);
        
        if (startDate >= endDate) {
          newErrors.timeline = 'Дата окончания должна быть после даты начала';
        }
        
        if (startDate < new Date()) {
          newErrors.startDate = 'Дата начала не может быть в прошлом';
        }
      }
    }

    if (step === 4) {
      if (formData.automaticSettings.targetInfluencerCount <= 0) {
        newErrors.targetCount = 'Количество инфлюенсеров должно быть больше 0';
      }

      if (formData.automaticSettings.overbookingPercentage < 0 || formData.automaticSettings.overbookingPercentage > 100) {
        newErrors.overbooking = 'Овербукинг должен быть от 0 до 100%';
      }

      const totalWeight = Object.values(formData.automaticSettings.scoringWeights).reduce((sum, weight) => sum + weight, 0);
      if (totalWeight !== 100) {
        newErrors.weights = 'Сумма весов должна равняться 100%';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (validateStep(currentStep)) {
      setCurrentStep(prev => Math.min(prev + 1, 4));
    }
  };

  const handlePrevious = () => {
    setCurrentStep(prev => Math.max(prev - 1, 1));
  };

  const handleSave = async () => {
    if (!validateStep(4)) {
      toast.error('Пожалуйста, исправьте ошибки перед сохранением');
      return;
    }

    setIsLoading(true);
    try {
      const campaignData: Partial<Campaign> = {
        advertiserId,
        ...formData,
        // Add automatic campaign metadata
        metadata: {
          isAutomatic: true,
          automaticSettings: formData.automaticSettings
        }
      };

      let savedCampaign: Campaign;
      if (currentCampaign) {
        savedCampaign = await automaticCampaignService.updateCampaign(currentCampaign.campaignId, campaignData);
        toast.success('Автоматическая кампания обновлена!');
      } else {
        savedCampaign = await automaticCampaignService.createCampaign(campaignData);
        toast.success('Автоматическая кампания создана! Начинается подбор инфлюенсеров...');
      }

      onCampaignSaved(savedCampaign);
      onClose();
    } catch (error: any) {
      console.error('Failed to save automatic campaign:', error);
      toast.error(error.message || 'Не удалось сохранить кампанию');
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

  const calculateOverbooking = () => {
    const base = formData.automaticSettings.targetInfluencerCount;
    const overbook = Math.ceil(base * (formData.automaticSettings.overbookingPercentage / 100));
    return base + overbook;
  };

  const calculateBatches = () => {
    const total = calculateOverbooking();
    return Math.ceil(total / formData.automaticSettings.batchSize);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-gradient-to-r from-purple-600 to-blue-600 rounded-lg flex items-center justify-center">
              <Zap className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900">
                {currentCampaign ? 'Редактировать автоматическую кампанию' : 'Создать автоматическую кампанию'}
              </h2>
              <p className="text-sm text-gray-600">Шаг {currentStep} из 4</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Progress Bar */}
        <div className="px-6 py-3 bg-gray-50">
          <div className="flex items-center space-x-2">
            {[1, 2, 3, 4].map((step) => (
              <React.Fragment key={step}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                  step <= currentStep 
                    ? 'bg-purple-600 text-white' 
                    : 'bg-gray-200 text-gray-600'
                }`}>
                  {step}
                </div>
                {step < 4 && (
                  <div className={`flex-1 h-1 rounded ${
                    step < currentStep ? 'bg-purple-600' : 'bg-gray-200'
                  }`} />
                )}
              </React.Fragment>
            ))}
          </div>
          <div className="flex justify-between text-xs text-gray-600 mt-2">
            <span>Основное</span>
            <span>Критерии</span>
            <span>Сроки</span>
            <span>Автоматика</span>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[60vh]">
          {/* Step 1: Basic Information */}
          {currentStep === 1 && (
            <div className="space-y-6">
              <div className="text-center mb-6">
                <Target className="w-12 h-12 text-purple-600 mx-auto mb-3" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Основная информация</h3>
                <p className="text-sm text-gray-600">Расскажите о вашей кампании</p>
              </div>

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
                    placeholder="Летняя коллекция 2024"
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
                    placeholder="EcoStyle"
                  />
                  {errors.brand && (
                    <p className="mt-1 text-sm text-red-600 flex items-center">
                      <AlertCircle className="w-4 h-4 mr-1" />
                      {errors.brand}
                    </p>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Описание кампании *
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  rows={4}
                  className={`w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-purple-500 focus:border-transparent ${
                    errors.description ? 'border-red-300' : 'border-gray-300'
                  }`}
                  placeholder="Опишите цели кампании, продукт и ожидания от сотрудничества..."
                />
                {errors.description && (
                  <p className="mt-1 text-sm text-red-600 flex items-center">
                    <AlertCircle className="w-4 h-4 mr-1" />
                    {errors.description}
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Step 2: Targeting Criteria */}
          {currentStep === 2 && (
            <div className="space-y-6">
              <div className="text-center mb-6">
                <Users className="w-12 h-12 text-blue-600 mx-auto mb-3" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Критерии подбора</h3>
                <p className="text-sm text-gray-600">Настройте параметры для автоматического поиска</p>
              </div>

              {/* Budget */}
              <div>
                <h4 className="text-md font-medium text-gray-900 mb-3">Бюджет</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Минимум *
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
                      Максимум *
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

              {/* Platforms */}
              <div>
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
              <div>
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
            </div>
          )}

          {/* Step 3: Timeline */}
          {currentStep === 3 && (
            <div className="space-y-6">
              <div className="text-center mb-6">
                <Calendar className="w-12 h-12 text-green-600 mx-auto mb-3" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Временные рамки</h3>
                <p className="text-sm text-gray-600">Установите сроки проведения кампании</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                <p className="text-sm text-red-600 flex items-center">
                  <AlertCircle className="w-4 h-4 mr-1" />
                  {errors.timeline}
                </p>
              )}

              {/* Audience Size */}
              <div>
                <h4 className="text-md font-medium text-gray-900 mb-3">Размер аудитории инфлюенсеров</h4>
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
            </div>
          )}

          {/* Step 4: Automatic Settings */}
          {currentStep === 4 && (
            <div className="space-y-6">
              <div className="text-center mb-6">
                <Zap className="w-12 h-12 text-orange-600 mx-auto mb-3" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Настройки автоматики</h3>
                <p className="text-sm text-gray-600">Настройте алгоритм подбора инфлюенсеров</p>
              </div>

              {/* Target Count and Overbooking */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Целевое количество инфлюенсеров *
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="1000"
                    value={formData.automaticSettings.targetInfluencerCount}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      automaticSettings: { 
                        ...prev.automaticSettings, 
                        targetInfluencerCount: parseInt(e.target.value) || 0 
                      }
                    }))}
                    className={`w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-purple-500 focus:border-transparent ${
                      errors.targetCount ? 'border-red-300' : 'border-gray-300'
                    }`}
                    placeholder="10"
                  />
                  {errors.targetCount && (
                    <p className="mt-1 text-sm text-red-600 flex items-center">
                      <AlertCircle className="w-4 h-4 mr-1" />
                      {errors.targetCount}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Овербукинг (%) *
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={formData.automaticSettings.overbookingPercentage}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      automaticSettings: { 
                        ...prev.automaticSettings, 
                        overbookingPercentage: parseInt(e.target.value) || 0 
                      }
                    }))}
                    className={`w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-purple-500 focus:border-transparent ${
                      errors.overbooking ? 'border-red-300' : 'border-gray-300'
                    }`}
                    placeholder="25"
                  />
                  {errors.overbooking && (
                    <p className="mt-1 text-sm text-red-600 flex items-center">
                      <AlertCircle className="w-4 h-4 mr-1" />
                      {errors.overbooking}
                    </p>
                  )}
                  <p className="text-xs text-gray-500 mt-1">
                    Будет отправлено {calculateOverbooking()} предложений
                  </p>
                </div>
              </div>

              {/* Batch Settings */}
              <div>
                <h4 className="text-md font-medium text-gray-900 mb-3">Настройки рассылки</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Размер пакета
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="100"
                      value={formData.automaticSettings.batchSize}
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        automaticSettings: { 
                          ...prev.automaticSettings, 
                          batchSize: parseInt(e.target.value) || 20 
                        }
                      }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      placeholder="20"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Количество предложений в одном пакете
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Задержка между пакетами (мин)
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="1440"
                      value={formData.automaticSettings.batchDelay}
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        automaticSettings: { 
                          ...prev.automaticSettings, 
                          batchDelay: parseInt(e.target.value) || 30 
                        }
                      }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      placeholder="30"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Будет {calculateBatches()} пакетов
                    </p>
                  </div>
                </div>
              </div>

              {/* Scoring Weights */}
              <div>
                <h4 className="text-md font-medium text-gray-900 mb-3">Веса для оценки инфлюенсеров</h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">
                      Подписчики ({formData.automaticSettings.scoringWeights.followers}%)
                    </label>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={formData.automaticSettings.scoringWeights.followers}
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        automaticSettings: {
                          ...prev.automaticSettings,
                          scoringWeights: {
                            ...prev.automaticSettings.scoringWeights,
                            followers: parseInt(e.target.value)
                          }
                        }
                      }))}
                      className="w-full"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">
                      Вовлеченность ({formData.automaticSettings.scoringWeights.engagement}%)
                    </label>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={formData.automaticSettings.scoringWeights.engagement}
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        automaticSettings: {
                          ...prev.automaticSettings,
                          scoringWeights: {
                            ...prev.automaticSettings.scoringWeights,
                            engagement: parseInt(e.target.value)
                          }
                        }
                      }))}
                      className="w-full"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">
                      Релевантность ({formData.automaticSettings.scoringWeights.relevance}%)
                    </label>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={formData.automaticSettings.scoringWeights.relevance}
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        automaticSettings: {
                          ...prev.automaticSettings,
                          scoringWeights: {
                            ...prev.automaticSettings.scoringWeights,
                            relevance: parseInt(e.target.value)
                          }
                        }
                      }))}
                      className="w-full"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">
                      Время ответа ({formData.automaticSettings.scoringWeights.responseTime}%)
                    </label>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={formData.automaticSettings.scoringWeights.responseTime}
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        automaticSettings: {
                          ...prev.automaticSettings,
                          scoringWeights: {
                            ...prev.automaticSettings.scoringWeights,
                            responseTime: parseInt(e.target.value)
                          }
                        }
                      }))}
                      className="w-full"
                    />
                  </div>
                </div>
                
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                  <p className="text-sm text-blue-800">
                    Общий вес: {Object.values(formData.automaticSettings.scoringWeights).reduce((sum, weight) => sum + weight, 0)}%
                  </p>
                  {errors.weights && (
                    <p className="text-sm text-red-600 flex items-center mt-1">
                      <AlertCircle className="w-4 h-4 mr-1" />
                      {errors.weights}
                    </p>
                  )}
                </div>
              </div>

              {/* Auto Replacement */}
              <div>
                <h4 className="text-md font-medium text-gray-900 mb-3">Автозамена</h4>
                <div className="space-y-3">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={formData.automaticSettings.autoReplacement}
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        automaticSettings: { 
                          ...prev.automaticSettings, 
                          autoReplacement: e.target.checked 
                        }
                      }))}
                      className="mr-3 rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                    />
                    <span className="text-sm text-gray-700">
                      Автоматически заменять ушедших инфлюенсеров
                    </span>
                  </label>

                  {formData.automaticSettings.autoReplacement && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Максимум замен на одного инфлюенсера
                      </label>
                      <input
                        type="number"
                        min="1"
                        max="10"
                        value={formData.automaticSettings.maxReplacements}
                        onChange={(e) => setFormData(prev => ({
                          ...prev,
                          automaticSettings: { 
                            ...prev.automaticSettings, 
                            maxReplacements: parseInt(e.target.value) || 3 
                          }
                        }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                        placeholder="3"
                      />
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t border-gray-200">
          <div className="flex space-x-3">
            {currentStep > 1 && (
              <button
                onClick={handlePrevious}
                className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
              >
                Назад
              </button>
            )}
          </div>
          
          <div className="flex space-x-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
            >
              Отмена
            </button>
            
            {currentStep < 4 ? (
              <button
                onClick={handleNext}
                className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-2 rounded-md transition-colors"
              >
                Далее
              </button>
            ) : (
              <button
                onClick={handleSave}
                disabled={isLoading}
                className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white px-6 py-2 rounded-md transition-all flex items-center space-x-2 disabled:opacity-50 shadow-lg"
              >
                <Save className="w-4 h-4" />
                <span>{isLoading ? 'Создание...' : 'Создать автоматическую кампанию'}</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}