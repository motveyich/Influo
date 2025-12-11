import { supabase } from '../../../core/supabase';
import { UserProfile, SocialMediaLink } from '../../../core/types';
import { analytics } from '../../../core/analytics';

export class ProfileService {
  private transformToUserProfile(data: any): UserProfile {
    return {
      id: data.id,
      oderedAt: data.ordered_at,
      userId: data.user_id,
      email: data.email,
      fullName: data.full_name,
      username: data.username,
      phone: data.phone,
      bio: data.bio,
      location: data.location,
      website: data.website,
      avatar: data.avatar_url,
      userType: data.user_type,
      influencerData: data.influencer_data,
      advertiserData: data.advertiser_data,
      profileCompletion: data.profile_completion,
      rating: data.rating,
      reviewsCount: data.reviews_count,
      isVerified: data.is_verified,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    };
  }

  async createProfile(profileData: Partial<UserProfile>): Promise<UserProfile> {
    try {
      const userType = this.determineUserType(profileData);
      const completion = this.calculateProfileCompletion(profileData);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('user_profiles')
        .insert({
          user_id: user.id,
          email: profileData.email,
          full_name: profileData.fullName,
          username: profileData.username || null,
          phone: profileData.phone || null,
          bio: profileData.bio,
          location: profileData.location,
          website: profileData.website,
          avatar_url: profileData.avatar,
          influencer_data: this.hasInfluencerContent(profileData.influencerData) ? profileData.influencerData : null,
          advertiser_data: this.hasAdvertiserContent(profileData.advertiserData) ? profileData.advertiserData : null,
          user_type: userType,
          profile_completion: completion,
        })
        .select()
        .single();

      if (error) throw error;

      const profile = this.transformToUserProfile(data);

      analytics.track('profile_created', {
        user_id: profile.userId,
        completion_percentage: completion.completionPercentage
      });

      return profile;
    } catch (error) {
      console.error('Failed to create profile:', error);
      throw error;
    }
  }

  async updateProfile(userId: string, updates: Partial<UserProfile>): Promise<UserProfile> {
    try {
      const currentProfile = await this.getProfile(userId);
      if (!currentProfile) {
        throw new Error('Profile not found');
      }

      const mergedProfile = { ...currentProfile, ...updates };
      const userType = this.determineUserType(mergedProfile);
      const completion = this.calculateProfileCompletion(mergedProfile);

      const payload: any = {
        user_type: userType,
        profile_completion: completion,
        updated_at: new Date().toISOString(),
      };

      if (updates.fullName !== undefined) payload.full_name = updates.fullName;
      if (updates.email !== undefined) payload.email = updates.email;
      if (updates.username !== undefined) payload.username = updates.username || null;
      if (updates.phone !== undefined) payload.phone = updates.phone || null;
      if (updates.bio !== undefined) payload.bio = updates.bio || null;
      if (updates.location !== undefined) payload.location = updates.location || null;
      if (updates.website !== undefined) payload.website = updates.website || null;
      if (updates.avatar !== undefined) payload.avatar_url = updates.avatar || null;

      if (updates.influencerData !== undefined) {
        payload.influencer_data = this.hasInfluencerContent(updates.influencerData) ? updates.influencerData : null;
      }
      if (updates.advertiserData !== undefined) {
        payload.advertiser_data = this.hasAdvertiserContent(updates.advertiserData) ? updates.advertiserData : null;
      }

      const { data, error } = await supabase
        .from('user_profiles')
        .update(payload)
        .eq('user_id', userId)
        .select()
        .single();

      if (error) throw error;

      const profile = this.transformToUserProfile(data);

      analytics.track('profile_updated', {
        user_id: userId,
        completion_percentage: completion.completionPercentage,
        updated_sections: Object.keys(updates)
      });

      return profile;
    } catch (error) {
      console.error('Failed to update profile:', error);
      throw error;
    }
  }

  async getProfile(userId: string): Promise<UserProfile | null> {
    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();

      if (error) throw error;
      if (!data) return null;

      return this.transformToUserProfile(data);
    } catch (error) {
      console.error('Failed to get profile:', error);
      return null;
    }
  }

  async uploadAvatar(userId: string, file: File): Promise<{ avatarUrl: string }> {
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${userId}-${Date.now()}.${fileExt}`;
      const filePath = `avatars/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      const avatarUrl = urlData.publicUrl;

      await supabase
        .from('user_profiles')
        .update({ avatar_url: avatarUrl })
        .eq('user_id', userId);

      return { avatarUrl };
    } catch (error) {
      console.error('Failed to upload avatar:', error);
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

      const updatedInfluencerData = {
        ...profile.influencerData,
        socialMediaLinks: updatedLinks
      };

      await this.updateProfile(userId, {
        influencerData: updatedInfluencerData
      });

      analytics.track('social_media_linked', {
        user_id: userId,
        platform: socialLink.platform,
        action: existingLinkIndex >= 0 ? 'updated' : 'added'
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

      const updatedInfluencerData = {
        ...profile.influencerData,
        socialMediaLinks: updatedLinks
      };

      await this.updateProfile(userId, {
        influencerData: updatedInfluencerData
      });

      analytics.track('social_media_unlinked', {
        user_id: userId,
        platform: platform
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
         profile.phone?.trim() &&
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
                     (advertiserData.campaignPreferences.budgetRange.min > 0 ||
                      advertiserData.campaignPreferences.budgetRange.max > 0);

    const hasPreviousCampaigns = advertiserData.previousCampaigns > 0;
    const hasAverageBudget = advertiserData.averageBudget > 0;

    return hasCompanyNameSimple || hasCompanyWebsite || hasCompanyDescription || hasCompanyInfo || hasBudget || hasPreviousCampaigns || hasAverageBudget;
  }
}

export const profileService = new ProfileService();
