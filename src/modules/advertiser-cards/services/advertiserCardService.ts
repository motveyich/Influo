import { apiClient, showFeatureNotImplemented } from '../../../core/api';
import { AdvertiserCard } from '../../../core/types';
import { analytics } from '../../../core/analytics';

export class AdvertiserCardService {
  async createCard(cardData: Partial<AdvertiserCard>): Promise<AdvertiserCard> {
    try {
      this.validateCardData(cardData);

      const payload = {
        userId: cardData.userId,
        companyName: cardData.companyName,
        campaignTitle: cardData.campaignTitle,
        campaignDescription: cardData.campaignDescription,
        platform: cardData.platform,
        productCategories: cardData.productCategories,
        budget: cardData.budget,
        serviceFormat: cardData.serviceFormat,
        campaignDuration: cardData.campaignDuration,
        influencerRequirements: cardData.influencerRequirements,
        targetAudience: cardData.targetAudience,
        contactInfo: cardData.contactInfo,
        campaignStats: cardData.campaignStats || {
          completedCampaigns: 0,
          averageRating: 0,
          totalInfluencersWorked: 0,
          successRate: 0
        },
      };

      const { data, error } = await apiClient.post<any>('/advertiser-cards', payload);

      if (error) throw new Error(error.message);

      analytics.track('advertiser_card_created', {
        user_id: cardData.userId,
        company_name: cardData.companyName,
        card_id: data.id
      });

      return this.transformFromApi(data);
    } catch (error) {
      console.error('Failed to create advertiser card:', error);
      throw error;
    }
  }

  async updateCard(cardId: string, updates: Partial<AdvertiserCard>): Promise<AdvertiserCard> {
    try {
      this.validateCardData(updates, false);

      const payload = this.transformToApiPayload(updates);

      const { data, error } = await apiClient.patch<any>(`/advertiser-cards/${cardId}`, payload);

      if (error) throw new Error(error.message);

      analytics.track('advertiser_card_updated', {
        card_id: cardId,
        updated_fields: Object.keys(updates)
      });

      return this.transformFromApi(data);
    } catch (error) {
      console.error('Failed to update advertiser card:', error);
      throw error;
    }
  }

  async getCard(cardId: string): Promise<AdvertiserCard | null> {
    try {
      const { data, error } = await apiClient.get<any>(`/advertiser-cards/${cardId}`);

      if (error) {
        if (error.status === 404) return null;
        throw new Error(error.message);
      }

      return this.transformFromApi(data);
    } catch (error) {
      console.error('Failed to get advertiser card:', error);
      throw error;
    }
  }

  async getUserCards(userId: string): Promise<AdvertiserCard[]> {
    try {
      const { data, error } = await apiClient.get<any[]>(`/advertiser-cards?userId=${userId}`);

      if (error) throw new Error(error.message);

      return (data || []).map(card => this.transformFromApi(card));
    } catch (error) {
      console.error('Failed to get user cards:', error);
      throw error;
    }
  }

  async getAllCards(filters?: {
    platform?: string;
    minBudget?: number;
    maxBudget?: number;
    productCategories?: string[];
    serviceFormats?: string[];
    searchQuery?: string;
    isActive?: boolean;
  }): Promise<AdvertiserCard[]> {
    try {
      const params = new URLSearchParams();

      if (filters?.isActive !== undefined) {
        params.append('isActive', String(filters.isActive));
      }
      if (filters?.platform && filters.platform !== 'all') {
        params.append('platform', filters.platform);
      }
      if (filters?.productCategories && filters.productCategories.length > 0) {
        params.append('productCategories', filters.productCategories.join(','));
      }
      if (filters?.serviceFormats && filters.serviceFormats.length > 0) {
        params.append('serviceFormats', filters.serviceFormats.join(','));
      }
      if (filters?.minBudget) {
        params.append('minBudget', String(filters.minBudget));
      }
      if (filters?.maxBudget) {
        params.append('maxBudget', String(filters.maxBudget));
      }
      if (filters?.searchQuery) {
        params.append('search', filters.searchQuery);
      }

      const queryString = params.toString();
      const endpoint = queryString ? `/advertiser-cards?${queryString}` : '/advertiser-cards';

      const { data, error } = await apiClient.get<any[]>(endpoint);

      if (error) throw new Error(error.message);

      return (data || []).map(card => this.transformFromApi(card));
    } catch (error) {
      console.error('Failed to get all advertiser cards:', error);
      throw error;
    }
  }

  async deleteCard(cardId: string): Promise<void> {
    try {
      const { error } = await apiClient.delete(`/advertiser-cards/${cardId}`);

      if (error) throw new Error(error.message);

      analytics.track('advertiser_card_deleted', {
        card_id: cardId
      });
    } catch (error) {
      console.error('Failed to delete advertiser card:', error);
      throw error;
    }
  }

  async toggleCardStatus(cardId: string, isActive: boolean): Promise<AdvertiserCard> {
    try {
      const { data, error } = await apiClient.patch<any>(`/advertiser-cards/${cardId}`, {
        isActive
      });

      if (error) throw new Error(error.message);

      analytics.track('advertiser_card_status_changed', {
        card_id: cardId,
        is_active: isActive
      });

      return this.transformFromApi(data);
    } catch (error) {
      console.error('Failed to toggle card status:', error);
      throw error;
    }
  }

  private validateCardData(cardData: Partial<AdvertiserCard>, isCreate: boolean = true): void {
    const errors: string[] = [];

    if (isCreate) {
      if (!cardData.userId) errors.push('User ID is required');
      if (!cardData.companyName?.trim()) errors.push('Company name is required');
      if (!cardData.campaignTitle?.trim()) errors.push('Campaign title is required');
    }

    if (cardData.campaignDescription && cardData.campaignDescription.trim().length < 20) {
      errors.push('Campaign description must be at least 20 characters');
    }

    if (cardData.productCategories && cardData.productCategories.length === 0) {
      errors.push('At least one product category is required');
    }

    if (cardData.budget) {
      if (!cardData.budget.amount || cardData.budget.amount <= 0) {
        errors.push('Valid budget amount is required');
      }
    }

    if (cardData.serviceFormat && cardData.serviceFormat.length === 0) {
      errors.push('At least one service format is required');
    }

    if (cardData.contactInfo) {
      if (!cardData.contactInfo.email?.trim()) {
        errors.push('Contact email is required');
      }
    }

    if (errors.length > 0) {
      throw new Error(errors.join('; '));
    }
  }

  private transformFromApi(apiData: any): AdvertiserCard {
    return {
      id: apiData.id,
      userId: apiData.userId || apiData.user_id,
      companyName: apiData.companyName || apiData.company_name,
      campaignTitle: apiData.campaignTitle || apiData.campaign_title,
      campaignDescription: apiData.campaignDescription || apiData.campaign_description,
      platform: apiData.platform,
      productCategories: apiData.productCategories || apiData.product_categories || [],
      budget: apiData.budget,
      serviceFormat: apiData.serviceFormat || apiData.service_format,
      campaignDuration: apiData.campaignDuration || apiData.campaign_duration,
      influencerRequirements: apiData.influencerRequirements || apiData.influencer_requirements,
      targetAudience: apiData.targetAudience || apiData.target_audience || { interests: [] },
      contactInfo: apiData.contactInfo || apiData.contact_info,
      campaignStats: apiData.campaignStats || apiData.campaign_stats,
      isActive: apiData.isActive ?? apiData.is_active,
      createdAt: apiData.createdAt || apiData.created_at,
      updatedAt: apiData.updatedAt || apiData.updated_at
    };
  }

  private transformToApiPayload(cardData: Partial<AdvertiserCard>): any {
    const payload: any = {};

    if (cardData.companyName) payload.companyName = cardData.companyName;
    if (cardData.campaignTitle) payload.campaignTitle = cardData.campaignTitle;
    if (cardData.campaignDescription) payload.campaignDescription = cardData.campaignDescription;
    if (cardData.platform) payload.platform = cardData.platform;
    if (cardData.productCategories) payload.productCategories = cardData.productCategories;
    if (cardData.budget) payload.budget = cardData.budget;
    if (cardData.serviceFormat) payload.serviceFormat = cardData.serviceFormat;
    if (cardData.campaignDuration) payload.campaignDuration = cardData.campaignDuration;
    if (cardData.influencerRequirements) payload.influencerRequirements = cardData.influencerRequirements;
    if (cardData.targetAudience) payload.targetAudience = cardData.targetAudience;
    if (cardData.contactInfo) payload.contactInfo = cardData.contactInfo;
    if (cardData.campaignStats) payload.campaignStats = cardData.campaignStats;
    if (cardData.isActive !== undefined) payload.isActive = cardData.isActive;

    return payload;
  }
}

export const advertiserCardService = new AdvertiserCardService();
