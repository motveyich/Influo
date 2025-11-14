import React, { useState, useEffect } from 'react';
import { Campaign } from '../../../core/types';
import { campaignService } from '../services/campaignService';
import { X, Search, Users, TrendingUp, MapPin, Star, Send } from 'lucide-react';
import toast from 'react-hot-toast';

interface InfluencerMatchingModalProps {
  isOpen: boolean;
  onClose: () => void;
  campaign: Campaign;
}

interface MatchedInfluencer {
  id: string;
  userId: string;
  platform: string;
  reach: {
    followers: number;
    averageViews: number;
    engagementRate: number;
  };
  audienceDemographics: {
    topCountries: string[];
    interests: string[];
  };
  serviceDetails: {
    contentTypes: string[];
    pricing: {
      post: number;
      story: number;
      reel: number;
      video: number;
    };
    description: string;
  };
  rating: number;
  completedCampaigns: number;
}

export function InfluencerMatchingModal({ isOpen, onClose, campaign }: InfluencerMatchingModalProps) {
  const [matchedInfluencers, setMatchedInfluencers] = useState<MatchedInfluencer[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedInfluencers, setSelectedInfluencers] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'followers' | 'engagement' | 'rating'>('followers');

  useEffect(() => {
    if (isOpen) {
      findMatches();
    }
  }, [isOpen, campaign.campaignId]);

  const findMatches = async () => {
    setIsLoading(true);
    try {
      const matches = await campaignService.findMatchingInfluencers(campaign.campaignId);
      setMatchedInfluencers(matches);
      
      if (matches.length === 0) {
        toast.error('No matching influencers found. Try expanding your criteria.');
      } else {
        toast.success(`Found ${matches.length} matching influencers!`);
      }
    } catch (error) {
      console.error('Failed to find matches:', error);
      toast.error('Failed to find matching influencers');
    } finally {
      setIsLoading(false);
    }
  };

  const handleInfluencerToggle = (influencerId: string) => {
    setSelectedInfluencers(prev =>
      prev.includes(influencerId)
        ? prev.filter(id => id !== influencerId)
        : [...prev, influencerId]
    );
  };

  const handleSendOffers = () => {
    if (selectedInfluencers.length === 0) {
      toast.error('Please select at least one influencer');
      return;
    }

    // Here you would integrate with the offers system
    toast.success(`Offers sent to ${selectedInfluencers.length} influencers!`);
    onClose();
  };

  const formatNumber = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const getLowestPrice = (pricing: any) => {
    const prices = Object.values(pricing).filter((price: any) => price > 0);
    return prices.length > 0 ? Math.min(...prices as number[]) : 0;
  };

  const filteredAndSortedInfluencers = matchedInfluencers
    .filter(influencer =>
      influencer.serviceDetails.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      influencer.serviceDetails.contentTypes.some(type =>
        type.toLowerCase().includes(searchQuery.toLowerCase())
      )
    )
    .sort((a, b) => {
      switch (sortBy) {
        case 'followers':
          return b.reach.followers - a.reach.followers;
        case 'engagement':
          return b.reach.engagementRate - a.reach.engagementRate;
        case 'rating':
          return b.rating - a.rating;
        default:
          return 0;
      }
    });

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-6xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">
              Подходящие инфлюенсеры
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              Кампания: {campaign.title}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Search and Filters */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex flex-col sm:flex-row space-y-4 sm:space-y-0 sm:space-x-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Поиск инфлюенсеров..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="border border-gray-300 rounded-md px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="followers">Сортировать по подписчикам</option>
              <option value="engagement">Сортировать по вовлеченности</option>
              <option value="rating">Сортировать по рейтингу</option>
            </select>
          </div>

          {selectedInfluencers.length > 0 && (
            <div className="mt-4 flex items-center justify-between bg-blue-50 p-3 rounded-md">
              <span className="text-sm text-blue-700">
                Выбрано {selectedInfluencers.length} инфлюенсер(ов)
              </span>
              <button
                onClick={handleSendOffers}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors flex items-center space-x-2"
              >
                <Send className="w-4 h-4" />
                <span>Отправить предложения</span>
              </button>
            </div>
          )}
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[60vh]">
          {isLoading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-600">Поиск подходящих инфлюенсеров...</p>
            </div>
          ) : filteredAndSortedInfluencers.length === 0 ? (
            <div className="text-center py-12">
              <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                {matchedInfluencers.length === 0 ? 'Совпадений не найдено' : 'Нет результатов'}
              </h3>
              <p className="text-gray-600 mb-6">
                {matchedInfluencers.length === 0
                  ? 'Попробуйте расширить критерии кампании для поиска большего количества инфлюенсеров'
                  : 'Попробуйте изменить поисковый запрос'
                }
              </p>
              {matchedInfluencers.length === 0 && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-left max-w-md mx-auto">
                  <h4 className="font-medium text-yellow-800 mb-2">Предложения для расширения охвата:</h4>
                  <ul className="text-sm text-yellow-700 space-y-1">
                    <li>• Увеличьте диапазон бюджета</li>
                    <li>• Добавьте больше платформ</li>
                    <li>• Расширьте диапазон размера аудитории</li>
                    <li>• Включите больше стран</li>
                    <li>• Добавьте больше типов контента</li>
                  </ul>
                </div>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredAndSortedInfluencers.map((influencer) => (
                <div
                  key={influencer.id}
                  className={`bg-white rounded-lg border-2 transition-all duration-200 p-4 cursor-pointer ${
                    selectedInfluencers.includes(influencer.id)
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                  onClick={() => handleInfluencerToggle(influencer.id)}
                >
                  {/* Header */}
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex items-center space-x-2">
                      <span className="px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-700 capitalize">
                        {influencer.platform}
                      </span>
                      {influencer.rating > 0 && (
                        <div className="flex items-center space-x-1">
                          <Star className="w-3 h-3 text-yellow-400 fill-current" />
                          <span className="text-xs font-medium text-gray-900">
                            {influencer.rating.toFixed(1)}
                          </span>
                        </div>
                      )}
                    </div>
                    <input
                      type="checkbox"
                      checked={selectedInfluencers.includes(influencer.id)}
                      onChange={() => handleInfluencerToggle(influencer.id)}
                      className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                  </div>

                  {/* Metrics */}
                  <div className="grid grid-cols-3 gap-2 mb-4">
                    <div className="text-center">
                      <div className="flex items-center justify-center space-x-1 mb-1">
                        <Users className="w-3 h-3 text-blue-600" />
                        <span className="text-sm font-semibold text-gray-900">
                          {formatNumber(influencer.reach.followers)}
                        </span>
                      </div>
                      <p className="text-xs text-gray-600">Подписчики</p>
                    </div>
                    
                    <div className="text-center">
                      <div className="flex items-center justify-center space-x-1 mb-1">
                        <TrendingUp className="w-3 h-3 text-green-600" />
                        <span className="text-sm font-semibold text-gray-900">
                          {influencer.reach.engagementRate.toFixed(1)}%
                        </span>
                      </div>
                      <p className="text-xs text-gray-600">Вовлеченность</p>
                    </div>
                    
                    <div className="text-center">
                      <span className="text-sm font-semibold text-green-600">
                        {formatCurrency(getLowestPrice(influencer.serviceDetails.pricing))}
                      </span>
                      <p className="text-xs text-gray-600">От</p>
                    </div>
                  </div>

                  {/* Description */}
                  <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                    {influencer.serviceDetails.description}
                  </p>

                  {/* Content Types */}
                  <div className="mb-3">
                    <div className="flex flex-wrap gap-1">
                      {influencer.serviceDetails.contentTypes.slice(0, 3).map((type, index) => (
                        <span
                          key={index}
                          className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded-md"
                        >
                          {type}
                        </span>
                      ))}
                      {influencer.serviceDetails.contentTypes.length > 3 && (
                        <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-md">
                          +{influencer.serviceDetails.contentTypes.length - 3}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Countries */}
                  <div className="flex items-center space-x-2 text-xs text-gray-600">
                    <MapPin className="w-3 h-3" />
                    <span>
                      {influencer.audienceDemographics.topCountries.slice(0, 2).join(', ')}
                      {influencer.audienceDemographics.topCountries.length > 2 && 
                        ` +${influencer.audienceDemographics.topCountries.length - 2}`
                      }
                    </span>
                  </div>

                  {/* Campaigns completed */}
                  {influencer.completedCampaigns > 0 && (
                    <div className="mt-2 text-xs text-gray-600">
                      {influencer.completedCampaigns} кампаний завершено
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t border-gray-200">
          <div className="text-sm text-gray-600">
            Показано {filteredAndSortedInfluencers.length} из {matchedInfluencers.length} инфлюенсеров
          </div>
          <div className="flex space-x-3">
            <button
              onClick={findMatches}
              disabled={isLoading}
              className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50"
            >
              Обновить совпадения
            </button>
            <button
              onClick={onClose}
              className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-md text-sm font-medium transition-colors"
            >
              Закрыть
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}