import { supabase, TABLES } from '../../../core/supabase';

export interface CampaignFilters {
  platforms: string[];
  contentTypes: string[];
  audienceSize: {
    min: number;
    max: number;
  };
  demographics: {
    ageRange: [number, number];
    genders: string[];
    countries: string[];
    interests: string[];
    genderDistribution?: {
      male: { min: number; max: number };
      female: { min: number; max: number };
      other: { min: number; max: number };
    };
    ageDistribution?: Record<string, { min: number; max: number }>;
    interestMatch?: { required: string[]; optional: string[] };
  };
}

export interface ScoringWeights {
  followers: number;
  engagement: number;
  rating: number;
  completedCampaigns: number;
}

export interface ValidationResult {
  isValid: boolean;
  matchedInfluencersCount: number;
  requiredCount: number;
  error?: string;
}

export class CampaignValidationService {
  async validateCampaignInfluencerAvailability(
    filters: CampaignFilters,
    weights: ScoringWeights,
    targetCount: number,
    overbookingPercentage: number
  ): Promise<ValidationResult> {
    try {
      const matchedInfluencers = await this.findMatchingInfluencers(filters);

      // Для запуска требуется минимум 1 подходящий инфлюенсер
      const isValid = matchedInfluencers.length >= 1;

      const overbookTarget = Math.ceil(targetCount * (1 + overbookingPercentage / 100));
      const invitesToSend = Math.min(overbookTarget, matchedInfluencers.length);

      return {
        isValid,
        matchedInfluencersCount: matchedInfluencers.length,
        requiredCount: targetCount,
        error: isValid
          ? undefined
          : `Не найдено подходящих инфлюенсеров с указанными критериями`
      };
    } catch (error) {
      console.error('Failed to validate campaign:', error);
      return {
        isValid: false,
        matchedInfluencersCount: 0,
        requiredCount: 0,
        error: 'Ошибка при проверке доступности инфлюенсеров'
      };
    }
  }

  private async findMatchingInfluencers(
    filters: CampaignFilters
  ): Promise<any[]> {
    try {
      let query = supabase
        .from(TABLES.INFLUENCER_CARDS)
        .select('*')
        .eq('is_active', true)
        .eq('is_deleted', false)
        .eq('moderation_status', 'approved');

      if (filters.platforms.length > 0) {
        query = query.in('platform', filters.platforms);
      }

      const { data, error } = await query;

      if (error) throw error;
      if (!data) return [];

      return data.filter(card => this.matchesFilters(card, filters));
    } catch (error) {
      console.error('Failed to find matching influencers:', error);
      return [];
    }
  }

  private matchesFilters(card: any, filters: CampaignFilters): boolean {
    const reach = card.reach || {};
    const demographics = card.audience_demographics || {};
    const serviceDetails = card.service_details || {};

    const followers = reach.followers || 0;
    if (
      filters.audienceSize.min > 0 &&
      followers < filters.audienceSize.min
    ) {
      return false;
    }
    if (
      filters.audienceSize.max > 0 &&
      followers > filters.audienceSize.max
    ) {
      return false;
    }

    if (filters.contentTypes.length > 0) {
      const cardContentTypes = serviceDetails.contentTypes || [];
      const hasMatchingContentType = filters.contentTypes.some(type =>
        cardContentTypes.includes(type)
      );
      if (!hasMatchingContentType) {
        return false;
      }
    }

    if (filters.demographics.genderDistribution) {
      const genderSplit = demographics.genderSplit || {};
      const { genderDistribution } = filters.demographics;

      for (const [gender, range] of Object.entries(genderDistribution)) {
        const cardValue = genderSplit[gender] || 0;
        if (cardValue < range.min || cardValue > range.max) {
          return false;
        }
      }
    }

    if (filters.demographics.ageDistribution) {
      const ageGroups = demographics.ageGroups || {};
      const { ageDistribution } = filters.demographics;

      for (const [ageGroup, range] of Object.entries(ageDistribution)) {
        const cardValue = ageGroups[ageGroup] || 0;
        if (cardValue < range.min || cardValue > range.max) {
          return false;
        }
      }
    }

    if (filters.demographics.interestMatch) {
      const cardInterests = demographics.interests || [];
      const { required, optional } = filters.demographics.interestMatch;

      const hasAllRequired = required.every(interest =>
        cardInterests.includes(interest)
      );
      if (!hasAllRequired) {
        return false;
      }

      if (optional.length > 0) {
        const hasAnyOptional = optional.some(interest =>
          cardInterests.includes(interest)
        );
        if (!hasAnyOptional) {
          return false;
        }
      }
    }

    if (filters.demographics.countries.length > 0) {
      const topCountries = demographics.topCountries || [];
      const hasMatchingCountry = filters.demographics.countries.some(country =>
        topCountries.includes(country)
      );
      if (!hasMatchingCountry) {
        return false;
      }
    }

    return true;
  }

  async getAvailablePlatforms(): Promise<Array<{ name: string; displayName: string; icon: string }>> {
    try {
      const { data, error } = await supabase
        .from('platforms')
        .select('name, display_name, icon')
        .eq('is_active', true)
        .order('display_name');

      if (error) throw error;

      return (data || []).map(p => ({
        name: p.name,
        displayName: p.display_name,
        icon: p.icon || ''
      }));
    } catch (error) {
      console.error('Failed to load platforms:', error);
      return [];
    }
  }

  async getAvailableInterests(): Promise<Array<{ name: string; category: string }>> {
    try {
      const { data, error } = await supabase
        .from('interests')
        .select('name, category')
        .eq('is_active', true)
        .order('name');

      if (error) throw error;

      return (data || []).map(i => ({
        name: i.name,
        category: i.category || 'general'
      }));
    } catch (error) {
      console.error('Failed to load interests:', error);
      return [];
    }
  }
}

export const campaignValidationService = new CampaignValidationService();
