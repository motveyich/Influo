import React, { useState, useEffect } from 'react';
import { Campaign } from '../../../core/types';
import { automaticCampaignService } from '../services/automaticCampaignService';
import { campaignValidationService } from '../services/campaignValidationService';
import { X, Save, AlertCircle, Plus, Trash2, Calendar, Target, Users, Zap, Settings, BadgeRussianRuble } from 'lucide-react';
import toast from 'react-hot-toast';
import { CONTENT_TYPES } from '../../../core/constants';

interface AutomaticCampaignModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentCampaign?: Campaign | null;
  advertiserId: string;
  onCampaignSaved: (campaign: Campaign) => void;
}
const COUNTRIES = ['Россия', 'США', 'Великобритания', 'Германия', 'Франция', 'Италия', 'Испания', 'Казахстан', 'Беларусь', 'Украина'];
const GENDERS = ['male', 'female', 'other'];
const AGE_GROUPS = ['13-17', '18-24', '25-34', '35-44', '45-54', '55-64', '65+'];

const PRODUCT_CATEGORIES = [
  { value: 'fashion', label: 'Мода и стиль' },
  { value: 'beauty', label: 'Красота и косметика' },
  { value: 'health', label: 'Здоровье и фитнес' },
  { value: 'travel', label: 'Путешествия' },
  { value: 'food', label: 'Еда и кулинария' },
  { value: 'tech', label: 'Технологии' },
  { value: 'gaming', label: 'Игры' },
  { value: 'entertainment', label: 'Развлечения' },
  { value: 'sport', label: 'Спорт' },
  { value: 'education', label: 'Образование' },
  { value: 'business', label: 'Бизнес' },
  { value: 'automotive', label: 'Автомобили' },
  { value: 'realestate', label: 'Недвижимость' },
  { value: 'family', label: 'Семья и дети' },
  { value: 'pets', label: 'Животные' },
  { value: 'art', label: 'Искусство' },
  { value: 'finance', label: 'Финансы' },
  { value: 'other', label: 'Другое' }
];

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
  const [platforms, setPlatforms] = useState<Array<{ name: string; displayName: string; icon: string }>>([]);
  const [interests, setInterests] = useState<Array<{ name: string; category: string }>>([]);
  const [marketBudget, setMarketBudget] = useState<{ min: number; max: number; currency: string } | null>(null);
  const [isCalculatingBudget, setIsCalculatingBudget] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    brand: '',
    productCategories: [] as string[],
    targetCountries: [] as string[],
    budget: {
      min: 0,
      max: 0,
      currency: 'RUB'
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
        countries: [] as string[],
        interests: [] as string[],
        genderDistribution: {
          male: { min: 0, max: 100 },
          female: { min: 0, max: 100 },
          other: { min: 0, max: 100 }
        },
        ageDistribution: {} as Record<string, { min: number; max: number }>,
        interestMatch: {
          required: [] as string[],
          optional: [] as string[]
        }
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
      batchSize: 30,
      batchDelay: 2,
      followersDeviation: 20,
      minRating: 3.0
    },
    enableChat: false,
    status: 'draft' as Campaign['status']
  });

  useEffect(() => {
    if (currentCampaign) {
      setFormData({
        title: currentCampaign.title,
        description: currentCampaign.description,
        brand: currentCampaign.brand,
        productCategories: (currentCampaign as any).productCategories || [],
        targetCountries: (currentCampaign as any).targetCountries || [],
        budget: currentCampaign.budget,
        preferences: currentCampaign.preferences,
        timeline: currentCampaign.timeline,
        automaticSettings: (currentCampaign as any).automaticSettings || {
          targetInfluencerCount: 10,
          overbookingPercentage: 25,
          batchSize: 30,
          batchDelay: 2,
          followersDeviation: 20,
          minRating: 3.0
        },
        enableChat: currentCampaign.enableChat || false,
        status: currentCampaign.status
      });
    } else {
      // Reset form for new campaign
      setFormData({
        title: '',
        description: '',
        brand: '',
        productCategories: [],
        targetCountries: [],
        budget: { min: 0, max: 0, currency: 'RUB' },
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
          batchSize: 30,
          batchDelay: 2,
          followersDeviation: 20,
          minRating: 3.0
        },
        status: 'draft'
      });
    }
    setErrors({});
    setCurrentStep(1);
  }, [currentCampaign, isOpen]);

  useEffect(() => {
    const loadPlatformsAndInterests = async () => {
      const [loadedPlatforms, loadedInterests] = await Promise.all([
        campaignValidationService.getAvailablePlatforms(),
        campaignValidationService.getAvailableInterests()
      ]);
      setPlatforms(loadedPlatforms);
      setInterests(loadedInterests);
    };

    if (isOpen) {
      loadPlatformsAndInterests();
    }
  }, [isOpen]);

  // Real-time budget calculation - triggers after platforms and audience size are filled
  useEffect(() => {
    if (formData.preferences.platforms.length > 0 &&
        formData.preferences.audienceSize.min > 0 &&
        formData.preferences.audienceSize.max > 0) {
      const timer = setTimeout(async () => {
        setIsCalculatingBudget(true);
        try {
          const budget = await automaticCampaignService.calculateMarketBudgetRecommendation(
            formData.preferences.audienceSize.min,
            formData.preferences.audienceSize.max,
            formData.automaticSettings.targetInfluencerCount,
            formData.preferences.platforms
          );
          setMarketBudget(budget);
        } catch (error) {
          console.error('Failed to calculate market budget:', error);
        } finally {
          setIsCalculatingBudget(false);
        }
      }, 800);
      return () => clearTimeout(timer);
    }
  }, [
    formData.preferences.platforms,
    formData.preferences.audienceSize.min,
    formData.preferences.audienceSize.max,
    formData.automaticSettings.targetInfluencerCount,
    formData.preferences.contentTypes
  ]);

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

      if (formData.productCategories.length === 0) {
        newErrors.productCategories = 'Выберите хотя бы одну категорию товара';
      }

      if (formData.targetCountries.length === 0) {
        newErrors.targetCountries = 'Выберите хотя бы одну страну';
      }
    }

    if (step === 2) {
      if (formData.preferences.platforms.length === 0) {
        newErrors.platforms = 'Выберите хотя бы одну платформу';
      }

      if (formData.preferences.audienceSize.min <= 0) {
        newErrors.audienceMin = 'Минимальный размер аудитории должен быть больше 0';
      }

      if (formData.budget.min <= 0) {
        newErrors.minBudget = 'Минимальный бюджет должен быть больше 0';
      }

      if (formData.budget.max <= 0) {
        newErrors.maxBudget = 'Максимальный бюджет должен быть больше 0';
      }

      if (formData.budget.min > formData.budget.max) {
        newErrors.budget = 'Минимальный бюджет не может быть больше максимального';
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

      if (formData.automaticSettings.followersDeviation < 0 || formData.automaticSettings.followersDeviation > 100) {
        newErrors.followersDeviation = 'Отклонение должно быть от 0 до 100%';
      }

      if (formData.automaticSettings.minRating < 0 || formData.automaticSettings.minRating > 5) {
        newErrors.minRating = 'Минимальный рейтинг должен быть от 0 до 5';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validateInfluencerAvailability = async (): Promise<boolean> => {
    const result = await campaignValidationService.validateCampaignInfluencerAvailability(
      {
        platforms: formData.preferences.platforms,
        contentTypes: formData.preferences.contentTypes,
        audienceSize: formData.preferences.audienceSize,
        demographics: formData.preferences.demographics
      },
      { followersDeviation: formData.automaticSettings.followersDeviation, minRating: formData.automaticSettings.minRating },
      formData.automaticSettings.targetInfluencerCount,
      formData.automaticSettings.overbookingPercentage
    );

    if (!result.isValid) {
      setErrors(prev => ({ ...prev, availability: result.error || 'Недостаточно инфлюенсеров' }));
      toast.error(result.error || 'Недостаточно инфлюенсеров для создания кампании');
      return false;
    }

    toast.success(`Найдено ${result.matchedInfluencersCount} подходящих инфлюенсеров`);
    return true;
  };

  const handleNext = async () => {
    if (validateStep(currentStep)) {
      setCurrentStep(prev => Math.min(prev + 1, 4));
    }
  };

  const calculateMarketBudget = async () => {
    if (formData.preferences.platforms.length === 0 ||
        formData.preferences.audienceSize.min === 0) {
      return;
    }

    setIsCalculatingBudget(true);
    try {
      const budget = await automaticCampaignService.calculateMarketBudgetRecommendation(
        formData.preferences.audienceSize.min,
        formData.preferences.audienceSize.max,
        formData.automaticSettings.targetInfluencerCount,
        formData.preferences.platforms
      );
      setMarketBudget(budget);
    } catch (error) {
      console.error('Failed to calculate market budget:', error);
    } finally {
      setIsCalculatingBudget(false);
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

    const isAvailable = await validateInfluencerAvailability();
    if (!isAvailable) {
      setIsLoading(false);
      return;
    }

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

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-gradient-to-r from-blue-600 to-blue-600 rounded-lg flex items-center justify-center">
              <Zap className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                {currentCampaign ? 'Редактировать автоматическую кампанию' : 'Создать автоматическую кампанию'}
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-400">Шаг {currentStep} из 4</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Progress Bar */}
        <div className="px-6 py-3 bg-gray-50 dark:bg-gray-700">
          <div className="flex items-center space-x-2">
            {[1, 2, 3, 4].map((step) => (
              <React.Fragment key={step}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                  step <= currentStep 
                    ? 'bg-blue-600 text-white' 
                    : 'bg-gray-200 text-gray-600'
                }`}>
                  {step}
                </div>
                {step < 4 && (
                  <div className={`flex-1 h-1 rounded ${
                    step < currentStep ? 'bg-blue-600' : 'bg-gray-200'
                  }`} />
                )}
              </React.Fragment>
            ))}
          </div>
          <div className="flex justify-between text-xs text-gray-600 mt-2">
            <span>Основное</span>
            <span>Критерии</span>
            <span>Сроки</span>
            <span>Заключающие</span>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[60vh]">
          {/* Step 1: Basic Information */}
          {currentStep === 1 && (
            <div className="space-y-6">
              <div className="text-center mb-6">
                <Target className="w-12 h-12 text-blue-600 mx-auto mb-3" />
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">Основная информация</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">Расскажите о вашей кампании</p>
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
                    className={`w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
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
                    className={`w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
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
                  className={`w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
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

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Категории рекламируемого товара * (можно выбрать несколько)
                </label>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                  {PRODUCT_CATEGORIES.map((category) => (
                    <button
                      key={category.value}
                      type="button"
                      onClick={() => handleArrayToggle(
                        formData.productCategories,
                        category.value,
                        (newCategories) => setFormData(prev => ({ ...prev, productCategories: newCategories }))
                      )}
                      className={`px-3 py-2 text-xs rounded-md border transition-colors text-left ${
                        formData.productCategories.includes(category.value)
                          ? 'bg-purple-100 border-purple-300 text-purple-700'
                          : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      {category.label}
                    </button>
                  ))}
                </div>
                {errors.productCategories && (
                  <p className="mt-1 text-sm text-red-600 flex items-center">
                    <AlertCircle className="w-4 h-4 mr-1" />
                    {errors.productCategories}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Целевые страны * (можно выбрать несколько)
                </label>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                  {COUNTRIES.map((country) => (
                    <button
                      key={country}
                      type="button"
                      onClick={() => handleArrayToggle(
                        formData.targetCountries,
                        country,
                        (newCountries) => setFormData(prev => ({ ...prev, targetCountries: newCountries }))
                      )}
                      className={`px-3 py-2 text-xs rounded-md border transition-colors text-left ${
                        formData.targetCountries.includes(country)
                          ? 'bg-blue-100 border-blue-300 text-blue-700'
                          : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      {country}
                    </button>
                  ))}
                </div>
                {errors.targetCountries && (
                  <p className="mt-1 text-sm text-red-600 flex items-center">
                    <AlertCircle className="w-4 h-4 mr-1" />
                    {errors.targetCountries}
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
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">Критерии подбора</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">Сначала платформа, объем аудитории, потом бюджет</p>
              </div>

              {/* Platforms */}
              <div>
                <label className="block text-sm font-medium text-gray-900 dark:text-gray-100 mb-3">
                  Платформы *
                </label>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  {platforms.map((platform) => (
                    <button
                      key={platform.name}
                      type="button"
                      onClick={() => handleArrayToggle(
                        formData.preferences.platforms,
                        platform.name,
                        (newPlatforms) => setFormData(prev => ({
                          ...prev,
                          preferences: { ...prev.preferences, platforms: newPlatforms }
                        }))
                      )}
                      className={`px-3 py-2 text-sm rounded-md border transition-colors capitalize ${
                        formData.preferences.platforms.includes(platform.name)
                          ? 'bg-blue-100 border-blue-300 text-blue-700'
                          : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      {platform.displayName}
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

              {/* Audience Size */}
              <div>
                <h4 className="text-md font-medium text-gray-900 dark:text-gray-100 mb-3">Размер аудитории инфлюенсеров *</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
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
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                      placeholder="10000"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
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
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                      placeholder="1000000"
                    />
                  </div>
                </div>
              </div>

              {/* Budget */}
              <div>
                <h4 className="text-md font-medium text-gray-900 dark:text-gray-100 mb-3">Бюджет *</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Минимум *
                    </label>
                    <div className="relative">
                      <BadgeRussianRuble className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                      <input
                        type="number"
                        value={formData.budget.min}
                        onChange={(e) => setFormData(prev => ({
                          ...prev,
                          budget: { ...prev.budget, min: parseInt(e.target.value) || 0 }
                        }))}
                        className={`w-full pl-10 pr-4 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
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
                      <BadgeRussianRuble className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                      <input
                        type="number"
                        value={formData.budget.max}
                        onChange={(e) => setFormData(prev => ({
                          ...prev,
                          budget: { ...prev.budget, max: parseInt(e.target.value) || 0 }
                        }))}
                        className={`w-full pl-10 pr-4 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
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
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Валюта
                    </label>
                    <select
                      value={formData.budget.currency}
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        budget: { ...prev.budget, currency: e.target.value }
                      }))}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 opacity-60 cursor-not-allowed"
                      disabled
                    >
                      <option value="RUB">RUB</option>
                    </select>
                  </div>
                </div>
                {errors.budget && (
                  <p className="mt-2 text-sm text-red-600 flex items-center">
                    <AlertCircle className="w-4 h-4 mr-1" />
                    {errors.budget}
                  </p>
                )}
                <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                  Инфлюенсеры будут выбраны по средней рыночной цене, а цена за интеграцию будет выставлена исходя из стоимости, указанной в карточке инфлюенсера.
                </p>
                {marketBudget && (
                  <div className="mt-3 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                    <p className="text-sm font-medium text-blue-900 dark:text-blue-300 mb-1">
                      Рекомендованный рыночный бюджет:
                    </p>
                    <p className="text-lg font-semibold text-blue-700 dark:text-blue-400">
                      {marketBudget.min.toLocaleString()} - {marketBudget.max.toLocaleString()} {marketBudget.currency}
                    </p>
                    <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                      На основе анализа рыночных данных инфлюенсеров с выбранными параметрами
                    </p>
                  </div>
                )}
              </div>

              {/* Audience Interests */}
              <div>
                <h4 className="text-md font-medium text-gray-900 dark:text-gray-100 mb-3">Интересы аудитории (по желанию)</h4>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                  {interests.slice(0, 12).map((interest) => (
                    <button
                      key={interest.name}
                      type="button"
                      onClick={() => handleArrayToggle(
                        formData.preferences.demographics.interests || [],
                        interest.name,
                        (newInterests) => setFormData(prev => ({
                          ...prev,
                          preferences: {
                            ...prev.preferences,
                            demographics: {
                              ...prev.preferences.demographics,
                              interests: newInterests
                            }
                          }
                        }))
                      )}
                      className={`px-3 py-2 text-xs rounded-md border transition-colors ${
                        (formData.preferences.demographics.interests || []).includes(interest.name)
                          ? 'bg-green-100 border-green-300 text-green-700'
                          : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      {interest.name}
                    </button>
                  ))}
                </div>
                <p className="text-xs text-gray-500 mt-2">Выбранные интересы помогут найти более релевантных инфлюенсеров</p>
              </div>

              {/* Content Types */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-md font-medium text-gray-900 dark:text-gray-100">Типы контента *</h4>
                  <button
                    type="button"
                    onClick={() => {
                      const allSelected = formData.preferences.contentTypes.length === CONTENT_TYPES.length;
                      setFormData(prev => ({
                        ...prev,
                        preferences: {
                          ...prev.preferences,
                          contentTypes: allSelected ? [] : [...CONTENT_TYPES]
                        }
                      }));
                    }}
                    className="text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 font-medium"
                  >
                    {formData.preferences.contentTypes.length === CONTENT_TYPES.length ? 'Снять все' : 'Выбрать все'}
                  </button>
                </div>
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
                          ? 'bg-blue-100 dark:bg-blue-900/30 border-blue-300 dark:border-blue-700 text-blue-700 dark:text-blue-300'
                          : 'bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600'
                      }`}
                    >
                      {type}
                    </button>
                  ))}
                </div>
                {errors.contentTypes && (
                  <p className="mt-1 text-sm text-red-600 dark:text-red-400 flex items-center">
                    <AlertCircle className="w-4 h-4 mr-1" />
                    {errors.contentTypes}
                  </p>
                )}
                <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                  Реклама будет произведена только по одному из выбранных типов контента. Выбор интеграции выполняется автоматически — выбирается формат с минимальной ценой в карточке инфлюенсера.
                </p>
              </div>
            </div>
          )}

          {/* Step 3: Timeline */}
          {currentStep === 3 && (
            <div className="space-y-6">
              <div className="text-center mb-6">
                <Calendar className="w-12 h-12 text-green-600 mx-auto mb-3" />
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">Временные рамки</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">Установите сроки проведения кампании</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Дата начала *
                  </label>
                  <label className="relative block cursor-pointer">
                    <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4 pointer-events-none" />
                    <input
                      type="date"
                      value={formData.timeline.startDate}
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        timeline: { ...prev.timeline, startDate: e.target.value }
                      }))}
                      className={`w-full pl-10 pr-4 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent cursor-pointer ${
                        errors.startDate ? 'border-red-300' : 'border-gray-300'
                      }`}
                    />
                  </label>
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
                  <label className="relative block cursor-pointer">
                    <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4 pointer-events-none" />
                    <input
                      type="date"
                      value={formData.timeline.endDate}
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        timeline: { ...prev.timeline, endDate: e.target.value }
                      }))}
                      className={`w-full pl-10 pr-4 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent cursor-pointer ${
                        errors.endDate ? 'border-red-300' : 'border-gray-300'
                      }`}
                    />
                  </label>
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
            </div>
          )}

          {/* Step 4: Automatic Settings */}
          {currentStep === 4 && (
            <div className="space-y-6">
              <div className="text-center mb-6">
                <Zap className="w-12 h-12 text-orange-600 mx-auto mb-3" />
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">Заключающие настройки</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">Настройте параметры подбора инфлюенсеров</p>
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
                    className={`w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
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
                    Отклонение по подписчикам (%) *
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={formData.automaticSettings.followersDeviation}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      automaticSettings: {
                        ...prev.automaticSettings,
                        followersDeviation: parseInt(e.target.value) || 20
                      }
                    }))}
                    className="w-full"
                  />
                  <div className="flex justify-between text-xs text-gray-600 mt-1">
                    <span>0%</span>
                    <span className="font-semibold text-blue-600">{formData.automaticSettings.followersDeviation}%</span>
                    <span>100%</span>
                  </div>
                  {errors.followersDeviation && (
                    <p className="mt-1 text-sm text-red-600 flex items-center">
                      <AlertCircle className="w-4 h-4 mr-1" />
                      {errors.followersDeviation}
                    </p>
                  )}
                  <p className="text-xs text-gray-500 mt-2">
                    Допустимое отклонение от целевого количества подписчиков
                  </p>
                </div>
              </div>

              {/* Min Rating */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Минимальный рейтинг *
                </label>
                <input
                  type="number"
                  min="0"
                  max="5"
                  step="0.1"
                  value={formData.automaticSettings.minRating}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    automaticSettings: {
                      ...prev.automaticSettings,
                      minRating: parseFloat(e.target.value) || 0
                    }
                  }))}
                  className={`w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                    errors.minRating ? 'border-red-300' : 'border-gray-300'
                  }`}
                  placeholder="3.0"
                />
                {errors.minRating && (
                  <p className="mt-1 text-sm text-red-600 flex items-center">
                    <AlertCircle className="w-4 h-4 mr-1" />
                    {errors.minRating}
                  </p>
                )}
                <p className="text-xs text-gray-500 mt-1">
                  Будут отобраны только инфлюенсеры с рейтингом не ниже указанного
                </p>
              </div>

              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                <p className="text-sm text-blue-900 dark:text-blue-300">
                  <strong>Системные настройки:</strong>
                </p>
                <ul className="text-sm text-blue-800 dark:text-blue-400 mt-2 space-y-1 list-disc list-inside">
                  <li>Овербукинг: 25% (автоматически)</li>
                  <li>Рассылка: 30 предложений в минуту</li>
                  <li>Автозамена: включена при отказе инфлюенсера</li>
                </ul>
              </div>

              {/* Chat Settings */}
              <div>
                <h4 className="text-md font-medium text-gray-900 mb-3">Настройки коммуникации</h4>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={formData.enableChat}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      enableChat: e.target.checked
                    }))}
                    className="mr-3 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <div>
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300 block">
                      Ведение диалога через чат
                    </span>
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      Инфлюенсеры смогут связаться с вами напрямую через встроенный чат
                    </span>
                  </div>
                </label>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t border-gray-200 dark:border-gray-600">
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
                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-md transition-colors"
              >
                Далее
              </button>
            ) : (
              <button
                onClick={handleSave}
                disabled={isLoading}
                className="bg-gradient-to-r from-blue-600 to-blue-600 hover:from-blue-700 hover:to-blue-700 text-white px-6 py-2 rounded-md transition-all flex items-center space-x-2 disabled:opacity-50 shadow-lg"
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