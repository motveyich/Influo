import { supabase } from '../../../core/supabase';
import { apiClient } from '../../../core/apiClient';
import { UserProfile, SocialMediaLink } from '../../../core/types';

export class ProfileService {
  async createProfile(profileData: Partial<UserProfile>): Promise<UserProfile> {
    try {
      const session = await supabase.auth.getSession();
      if (!session.data.session) {
        throw new Error('Not authenticated');
      }

      const userId = session.data.session.user.id;

      const { data, error } = await apiClient.get<any>(`/profiles/${userId}`);

      if (error || !data) {
        const { data: createdData, error: createError } = await supabase
          .from('user_profiles')
          .insert({
            user_id: userId,
            email: profileData.email || session.data.session.user.email || '',
            full_name: profileData.fullName || 'User',
            user_type: profileData.userType || 'influencer',
            role: 'user',
          })
          .select()
          .maybeSingle();

        if (createError) {
          throw new Error(createError.message);
        }

        return this.transformFromApi(createdData);
      }

      if (profileData.fullName || profileData.bio || profileData.location || profileData.phone) {
        return await this.updateProfile(userId, profileData);
      }

      const profile = this.transformFromApi(data);

      const completion = this.calculateProfileCompletion(profile);

      await supabase
        .from('user_profiles')
        .update({
          profile_completion_basic_info: completion.basicInfo,
          profile_completion_influencer_setup: completion.influencerSetup,
          profile_completion_advertiser_setup: completion.advertiserSetup,
          profile_completion_overall_complete: completion.overallComplete,
          profile_completion_percentage: completion.completionPercentage
        })
        .eq('user_id', userId);

      profile.profileCompletion = completion;

      return profile;
    } catch (error) {
      console.error('Failed to create profile:', error);
      throw error;
    }
  }

  async updateProfile(userId: string, updates: Partial<UserProfile>): Promise<UserProfile> {
    try {
      const updatePayload: Record<string, unknown> = {};

      if (updates.fullName !== undefined) updatePayload.full_name = updates.fullName;
      if (updates.username !== undefined) updatePayload.username = updates.username;
      if (updates.phone !== undefined) updatePayload.phone = updates.phone;
      if (updates.bio !== undefined) updatePayload.bio = updates.bio;
      if (updates.location !== undefined) updatePayload.location = updates.location;
      if (updates.website !== undefined) updatePayload.website = updates.website;
      if (updates.avatar !== undefined) updatePayload.avatar = updates.avatar;
      if (updates.influencerData !== undefined) updatePayload.influencer_data = updates.influencerData;
      if (updates.advertiserData !== undefined) updatePayload.advertiser_data = updates.advertiserData;

      const { data, error } = await apiClient.patch<any>(`/profiles/${userId}`, updatePayload);

      if (error) {
        throw new Error(error.message);
      }

      const profile = this.transformFromApi(data);

      const completion = this.calculateProfileCompletion(profile);

      await supabase
        .from('user_profiles')
        .update({
          profile_completion_basic_info: completion.basicInfo,
          profile_completion_influencer_setup: completion.influencerSetup,
          profile_completion_advertiser_setup: completion.advertiserSetup,
          profile_completion_overall_complete: completion.overallComplete,
          profile_completion_percentage: completion.completionPercentage
        })
        .eq('user_id', userId);

      profile.profileCompletion = completion;

      return profile;
    } catch (error) {
      console.error('Failed to update profile:', error);
      throw error;
    }
  }

  async getProfile(userId: string): Promise<UserProfile | null> {
    try {
      const { data, error } = await apiClient.get<any>(`/profiles/${userId}`);

      if (error) {
        if (error.status === 404) {
          return null;
        }
        throw new Error(error.message);
      }

      return this.transformFromApi(data);
    } catch (error) {
      console.error('Failed to get profile:', error);
      throw error;
    }
  }

  async getProfileCompletion(userId: string): Promise<{
    basicInfo: boolean;
    influencerSetup: boolean;
    advertiserSetup: boolean;
    overallComplete: boolean;
    completionPercentage: number;
  }> {
    try {
      const { data, error } = await apiClient.get<any>(`/profiles/${userId}/completion`);

      if (error) {
        throw new Error(error.message);
      }

      return {
        basicInfo: data?.basicInfo || false,
        influencerSetup: data?.influencerSetup || false,
        advertiserSetup: data?.advertiserSetup || false,
        overallComplete: data?.overallComplete || false,
        completionPercentage: data?.completionPercentage || 0,
      };
    } catch (error) {
      console.error('Failed to get profile completion:', error);
      return this.calculateProfileCompletion({});
    }
  }

  async uploadAvatar(userId: string, file: File): Promise<string> {
    try {
      const { data, error } = await apiClient.uploadFile<{ avatarUrl: string }>(
        `/profiles/${userId}/avatar`,
        file
      );

      if (error) {
        throw new Error(error.message);
      }

      return data?.avatarUrl || '';
    } catch (error) {
      console.error('Failed to upload avatar:', error);
      throw error;
    }
  }

  async searchProfiles(query: string, userType?: string, limit?: number): Promise<UserProfile[]> {
    try {
      const params = new URLSearchParams();
      params.append('q', query);
      if (userType) params.append('userType', userType);
      if (limit) params.append('limit', limit.toString());

      const { data, error } = await apiClient.get<any[]>(`/profiles?${params.toString()}`);

      if (error) {
        throw new Error(error.message);
      }

      return (data || []).map(profile => this.transformFromApi(profile));
    } catch (error) {
      console.error('Failed to search profiles:', error);
      throw error;
    }
  }

  async linkSocialMedia(userId: string, socialLink: SocialMediaLink): Promise<void> {
    try {
      const profile = await this.getProfile(userId);
      if (!profile) throw new Error('Profile not found');

      const currentLinks = profile.influencerData?.socialMediaLinks || [];
      const existingLinkIndex = currentLinks.findIndex(link => link.platform === socialLink.platform);

      let updatedLinks;
      if (existingLinkIndex >= 0) {
        updatedLinks = [...currentLinks];
        updatedLinks[existingLinkIndex] = socialLink;
      } else {
        updatedLinks = [...currentLinks, socialLink];
      }

      await this.updateProfile(userId, {
        influencerData: {
          ...profile.influencerData,
          socialMediaLinks: updatedLinks
        }
      });
    } catch (error) {
      console.error('Failed to link social media:', error);
      throw error;
    }
  }

  async unlinkSocialMedia(userId: string, platform: string): Promise<void> {
    try {
      const profile = await this.getProfile(userId);
      if (!profile) throw new Error('Profile not found');

      const currentLinks = profile.influencerData?.socialMediaLinks || [];
      const updatedLinks = currentLinks.filter(link => link.platform !== platform);

      await this.updateProfile(userId, {
        influencerData: {
          ...profile.influencerData,
          socialMediaLinks: updatedLinks
        }
      });
    } catch (error) {
      console.error('Failed to unlink social media:', error);
      throw error;
    }
  }

  private determineUserType(profileData: Partial<UserProfile>): string {
    const hasInfluencerData = this.hasInfluencerContent(profileData.influencerData);
    const hasAdvertiserData = this.hasAdvertiserContent(profileData.advertiserData);

    if (hasInfluencerData) {
      return 'influencer';
    } else if (hasAdvertiserData) {
      return 'advertiser';
    } else {
      return 'influencer';
    }
  }

  calculateProfileCompletion(profile: Partial<UserProfile>) {
    let basicInfoComplete = false;
    let influencerSetupComplete = false;
    let advertiserSetupComplete = false;

    if (profile.fullName?.trim() &&
        profile.email?.trim() &&
        profile.location?.trim() &&
        profile.bio?.trim() &&
        profile.bio.trim().length >= 50) {
      basicInfoComplete = true;
    }

    influencerSetupComplete = this.hasInfluencerContent(profile.influencerData);
    advertiserSetupComplete = this.hasAdvertiserContent(profile.advertiserData);

    let completionPercentage = 0;

    if (basicInfoComplete) {
      completionPercentage += 50;
    }

    if (influencerSetupComplete) {
      completionPercentage += 25;
    }

    if (advertiserSetupComplete) {
      completionPercentage += 25;
    }

    const overallComplete = basicInfoComplete && influencerSetupComplete && advertiserSetupComplete;

    return {
      basicInfo: basicInfoComplete,
      influencerSetup: influencerSetupComplete,
      advertiserSetup: advertiserSetupComplete,
      overallComplete,
      completionPercentage
    };
  }

  private transformFromApi(apiData: any): UserProfile {
    if (!apiData) return {} as UserProfile;

    return {
      userId: apiData.id || apiData.userId || apiData.user_id,
      email: apiData.email,
      fullName: apiData.fullName || apiData.full_name || '',
      username: apiData.username || '',
      phone: apiData.phone || '',
      userType: apiData.userType || apiData.user_type,
      avatar: apiData.avatar || apiData.avatarUrl,
      bio: apiData.bio,
      location: apiData.location,
      website: apiData.website,
      influencerData: apiData.influencerData || apiData.influencer_data,
      advertiserData: apiData.advertiserData || apiData.advertiser_data,
      profileCompletion: apiData.profileCompletion || apiData.profile_completion || this.calculateProfileCompletion(apiData),
      unifiedAccountInfo: {
        isVerified: apiData.isVerified || false,
        joinedAt: apiData.createdAt || apiData.created_at || new Date().toISOString(),
        lastActive: apiData.updatedAt || apiData.updated_at || new Date().toISOString(),
        accountType: apiData.userType || apiData.user_type || 'influencer',
        completedDeals: apiData.completedDeals || 0,
        totalReviews: apiData.totalReviews || 0,
        averageRating: apiData.averageRating || 0,
      },
      createdAt: apiData.createdAt || apiData.created_at,
      updatedAt: apiData.updatedAt || apiData.updated_at
    };
  }

  private hasInfluencerContent(influencerData: any): boolean {
    if (!influencerData || influencerData === null) return false;

    const hasMainSocialLink = influencerData.mainSocialLink && influencerData.mainSocialLink.trim() !== '';
    const hasCategory = influencerData.category && influencerData.category.trim() !== '';
    const hasPlatformName = influencerData.platformName && influencerData.platformName.trim() !== '';
    const hasLinks = influencerData.socialMediaLinks && influencerData.socialMediaLinks.length > 0;
    const hasMetrics = influencerData.metrics && influencerData.metrics.totalFollowers > 0;
    const hasCategories = influencerData.contentCategories && influencerData.contentCategories.length > 0;
    const hasPricing = influencerData.pricing && Object.values(influencerData.pricing).some((price: any) => price > 0);

    return hasMainSocialLink || hasCategory || hasPlatformName || hasLinks || hasMetrics || hasCategories || hasPricing;
  }

  private hasAdvertiserContent(advertiserData: any): boolean {
    if (!advertiserData || advertiserData === null) return false;

    const hasCompanyNameSimple = advertiserData.companyName && advertiserData.companyName.trim() !== '';
    const hasCompanyWebsite = advertiserData.companyWebsite && advertiserData.companyWebsite.trim() !== '';
    const hasCompanyDescription = advertiserData.companyDescription && advertiserData.companyDescription.trim() !== '';
    const hasCompanyInfo = (advertiserData.companyName && advertiserData.companyName.trim()) ||
                          (advertiserData.industry && advertiserData.industry.trim());
    const hasBudget = advertiserData.campaignPreferences &&
                     (advertiserData.campaignPreferences.budgetRange?.min > 0 ||
                      advertiserData.campaignPreferences.budgetRange?.max > 0);
    const hasPreviousCampaigns = advertiserData.previousCampaigns > 0;
    const hasAverageBudget = advertiserData.averageBudget > 0;

    return hasCompanyNameSimple || hasCompanyWebsite || hasCompanyDescription || hasCompanyInfo || hasBudget || hasPreviousCampaigns || hasAverageBudget;
  }
}

export const profileService = new ProfileService();
