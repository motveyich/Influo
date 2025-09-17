import { supabase, TABLES } from '../../../core/supabase';
import { AdvertiserCard } from '../../../core/types';
import { analytics } from '../../../core/analytics';

export class AdvertiserCardService {
  async createCard(cardData: Partial<AdvertiserCard>): Promise<AdvertiserCard> {
    try {
      // Validate required fields
      this.validateCardData(cardData);

      const newCard = {
        user_id: cardData.userId,
        company_name: cardData.companyName,
        campaign_title: cardData.campaignTitle,
        campaign_description: cardData.campaignDescription,
        platform: cardData.platform,
        product_categories: cardData.productCategories,
        budget: cardData.budget,
        service_format: cardData.serviceFormat,
        campaign_duration: cardData.campaignDuration,
        influencer_requirements: cardData.influencerRequirements,
        target_audience: cardData.targetAudience,
        contact_info: cardData.contactInfo,
        campaign_stats: cardData.campaignStats || {
          completedCampaigns: 0,
          averageRating: 0,
          totalInfluencersWorked: 0,
          successRate: 0
        },
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      // For now, store in localStorage since we don't have advertiser_cards table
      const existingCards = this.getStoredCards();
      const cardWithId = {
        ...this.transformFromStorage(newCard),
        id: `adv_card_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      };
      
      existingCards.push(cardWithId);
      localStorage.setItem('advertiser_cards', JSON.stringify(existingCards));

      // Track card creation
      analytics.track('advertiser_card_created', {
        user_id: cardData.userId,
        company_name: cardData.companyName,
        card_id: cardWithId.id
      });

      return cardWithId;
    } catch (error) {
      console.error('Failed to create advertiser card:', error);
      throw error;
    }
  }

  async updateCard(cardId: string, updates: Partial<AdvertiserCard>): Promise<AdvertiserCard> {
    try {
      this.validateCardData(updates, false);

      const existingCards = this.getStoredCards();
      const cardIndex = existingCards.findIndex(card => card.id === cardId);
      
      if (cardIndex === -1) {
        throw new Error('Card not found');
      }

      const updatedCard = {
        ...existingCards[cardIndex],
        ...updates,
        updatedAt: new Date().toISOString()
      };

      existingCards[cardIndex] = updatedCard;
      localStorage.setItem('advertiser_cards', JSON.stringify(existingCards));

      // Track card update
      analytics.track('advertiser_card_updated', {
        card_id: cardId,
        updated_fields: Object.keys(updates)
      });

      return updatedCard;
    } catch (error) {
      console.error('Failed to update advertiser card:', error);
      throw error;
    }
  }

  async getCard(cardId: string): Promise<AdvertiserCard | null> {
    try {
      const existingCards = this.getStoredCards();
      return existingCards.find(card => card.id === cardId) || null;
    } catch (error) {
      console.error('Failed to get advertiser card:', error);
      throw error;
    }
  }

  async getUserCards(userId: string): Promise<AdvertiserCard[]> {
    try {
      const existingCards = this.getStoredCards();
      return existingCards.filter(card => card.userId === userId);
    } catch (error) {
      console.error('Failed to get user cards:', error);
      throw error;
    }
  }

  async getAllCards(filters?: {
    productType?: string;
    minBudget?: number;
    maxBudget?: number;
    campaignFormat?: string;
    countries?: string[];
    isActive?: boolean;
    priority?: string;
  }): Promise<AdvertiserCard[]> {
    try {
      let cards = this.getStoredCards();

      if (filters?.isActive !== undefined) {
        cards = cards.filter(card => card.isActive === filters.isActive);
      }

      if (filters?.productType && filters.productType !== 'all') {
        cards = cards.filter(card => card.productType === filters.productType);
      }

      if (filters?.campaignFormat && filters.campaignFormat !== 'all') {
        cards = cards.filter(card => card.campaignFormat.includes(filters.campaignFormat));
      }

      if (filters?.minBudget) {
        cards = cards.filter(card => {
          const budget = card.budget.type === 'fixed' ? card.budget.amount : card.budget.min;
          return budget && budget >= filters.minBudget!;
        });
      }

      if (filters?.maxBudget) {
        cards = cards.filter(card => {
          const budget = card.budget.type === 'fixed' ? card.budget.amount : card.budget.max;
          return budget && budget <= filters.maxBudget!;
        });
      }

      if (filters?.countries && filters.countries.length > 0) {
        cards = cards.filter(card =>
          filters.countries!.some(country =>
            card.targetAudience.countries.includes(country)
          )
        );
      }

      if (filters?.priority && filters.priority !== 'all') {
        cards = cards.filter(card => card.priority === filters.priority);
      }

      return cards.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    } catch (error) {
      console.error('Failed to get all advertiser cards:', error);
      throw error;
    }
  }

  async deleteCard(cardId: string): Promise<void> {
    try {
      const existingCards = this.getStoredCards();
      const filteredCards = existingCards.filter(card => card.id !== cardId);
      localStorage.setItem('advertiser_cards', JSON.stringify(filteredCards));

      // Track card deletion
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
      const existingCards = this.getStoredCards();
      const cardIndex = existingCards.findIndex(card => card.id === cardId);
      
      if (cardIndex === -1) {
        throw new Error('Card not found');
      }

      existingCards[cardIndex].isActive = isActive;
      existingCards[cardIndex].updatedAt = new Date().toISOString();
      
      localStorage.setItem('advertiser_cards', JSON.stringify(existingCards));

      // Track status change
      analytics.track('advertiser_card_status_changed', {
        card_id: cardId,
        is_active: isActive
      });

      return existingCards[cardIndex];
    } catch (error) {
      console.error('Failed to toggle card status:', error);
      throw error;
    }
  }

  private getStoredCards(): AdvertiserCard[] {
    try {
      const stored = localStorage.getItem('advertiser_cards');
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.error('Failed to load stored cards:', error);
      return [];
    }
  }

  private getMockCards(): AdvertiserCard[] {
    return [
      {
        id: 'adv_1',
        userId: '2',
        companyName: 'EcoStyle',
        campaignTitle: 'Summer Sustainable Fashion Campaign',
        campaignDescription: 'Promote our new eco-friendly summer collection. Looking for fashion influencers who align with sustainability values.',
        platform: 'instagram',
        productCategories: ['Мода и стиль', 'Экология и устойчивое развитие'],
        budget: {
          amount: 50000,
          currency: 'RUB'
        },
        serviceFormat: ['Пост', 'Рилс'],
        campaignDuration: {
          startDate: '2024-02-01T00:00:00Z',
          endDate: '2024-03-01T00:00:00Z'
        },
        influencerRequirements: {
          minFollowers: 10000,
          maxFollowers: 500000,
          minEngagementRate: 3.0
        },
        targetAudience: {
          interests: ['Мода и стиль', 'Красота и косметика', 'Экология и устойчивое развитие']
        },
        contactInfo: {
          email: 'partnerships@ecostyle.com',
          website: 'https://ecostyle.com'
        },
        campaignStats: {
          completedCampaigns: 12,
          averageRating: 4.6,
          totalInfluencersWorked: 45,
          successRate: 85
        },
        isActive: true,
        createdAt: '2024-01-15T00:00:00Z',
        updatedAt: '2024-01-20T10:30:00Z'
      },
      {
        id: 'adv_2',
        userId: '3',
        companyName: 'TechWave',
        campaignTitle: 'Wireless Headphones Product Launch',
        campaignDescription: 'Launch campaign for our new premium wireless headphones. Seeking tech reviewers and lifestyle influencers.',
        platform: 'youtube',
        productCategories: ['Технологии и гаджеты', 'Музыка и развлечения'],
        budget: {
          amount: 2500,
          currency: 'RUB'
        },
        serviceFormat: ['Видео', 'Пост'],
        campaignDuration: {
          startDate: '2024-01-20T00:00:00Z',
          endDate: '2024-02-15T00:00:00Z'
        },
        influencerRequirements: {
          minFollowers: 5000,
          maxFollowers: 200000,
          minEngagementRate: 2.5
        },
        targetAudience: {
          interests: ['Технологии и гаджеты', 'Музыка и развлечения', 'Образ жизни']
        },
        contactInfo: {
          email: 'marketing@techwave.com',
          phone: '+1-555-0123',
          website: 'https://techwave.com'
        },
        campaignStats: {
          completedCampaigns: 8,
          averageRating: 4.3,
          totalInfluencersWorked: 28,
          successRate: 78
        },
        isActive: true,
        createdAt: '2024-01-10T00:00:00Z',
        updatedAt: '2024-01-18T14:20:00Z'
      }
    ];
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

  private transformFromStorage(dbData: any): AdvertiserCard {
    return {
      id: dbData.id || `adv_card_${Date.now()}`,
      userId: dbData.user_id,
      companyName: dbData.company_name,
      campaignTitle: dbData.campaign_title,
      campaignDescription: dbData.campaign_description,
      platform: dbData.platform,
      productCategories: dbData.product_categories || [],
      budget: dbData.budget,
      serviceFormat: dbData.service_format,
      campaignDuration: dbData.campaign_duration,
      influencerRequirements: dbData.influencer_requirements,
      targetAudience: dbData.target_audience || { interests: [] },
      contactInfo: dbData.contact_info,
      campaignStats: dbData.campaign_stats,
      isActive: dbData.is_active,
      createdAt: dbData.created_at,
      updatedAt: dbData.updated_at
    };
  }
}

export const advertiserCardService = new AdvertiserCardService();