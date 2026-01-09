import { apiClient } from '../../../core/api';
import { UserProfile, SocialMediaLink } from '../../../core/types';
import { analytics } from '../../../core/analytics';

export class ProfileService {
  async createProfile(profileData: Partial<UserProfile>): Promise<UserProfile> {
    try {
      if (!profileData.userId) {
        throw new Error('User ID is required to create a profile');
      }

      const userType = this.determineUserType(profileData);
      const completion = this.calculateProfileCompletion(profileData);

      const payload = {
        userId: profileData.userId,
        email: profileData.email,
        fullName: profileData.fullName,
        username: profileData.username || null,
        phone: profileData.phone || null,
        bio: profileData.bio,
        location: profileData.location,
        website: profileData.website,
        avatar: profileData.avatar,
        influencerData: this.hasInfluencerContent(profileData.influencerData) ? profileData.influencerData : null,
        advertiserData: this.hasAdvertiserContent(profileData.advertiserData) ? profileData.advertiserData : null,
        userType,
        profileCompletion: completion,
      };

      console.log('Creating profile with userId:', payload.userId);

      const profile = await apiClient.post<UserProfile>('/profiles', payload);

      console.log('Profile created successfully:', profile.userId);

      analytics.track('profile_created', {
        user_id: profile.userId,
        completion_percentage: completion.completionPercentage
      });

      return profile;
    } catch (error: any) {
      console.error('Failed to create profile:', error);

      // Provide more helpful error messages
      if (error.message?.includes('Email already in use')) {
        throw new Error('This email is already registered with another account');
      } else if (error.message?.includes('Username already taken')) {
        throw new Error('This username is already taken. Please choose another one');
      }

      throw error;
    }
  }

  async updateProfile(userId: string, updates: Partial<UserProfile>): Promise<UserProfile> {
    try {
      console.log('Updating profile for userId:', userId);

      const currentProfile = await this.getProfile(userId);
      if (!currentProfile) {
        throw new Error('Profile not found');
      }

      const mergedProfile = { ...currentProfile, ...updates };
      const userType = this.determineUserType(mergedProfile);
      const completion = this.calculateProfileCompletion(mergedProfile);

      const payload: any = {
        userType,
        profileCompletion: completion,
      };

      if (updates.fullName !== undefined) payload.fullName = updates.fullName;
      if (updates.email !== undefined) payload.email = updates.email;
      if (updates.username !== undefined) payload.username = updates.username || null;
      if (updates.phone !== undefined) payload.phone = updates.phone || null;
      if (updates.bio !== undefined) payload.bio = updates.bio || null;
      if (updates.location !== undefined) payload.location = updates.location || null;
      if (updates.website !== undefined) payload.website = updates.website || null;
      if (updates.avatar !== undefined) payload.avatar = updates.avatar || null;

      if (updates.influencerData !== undefined) {
        payload.influencerData = this.hasInfluencerContent(updates.influencerData) ? updates.influencerData : null;
      }
      if (updates.advertiserData !== undefined) {
        payload.advertiserData = this.hasAdvertiserContent(updates.advertiserData) ? updates.advertiserData : null;
      }

      const profile = await apiClient.patch<UserProfile>(`/profiles/${userId}`, payload);

      console.log('Profile updated successfully:', profile.userId);

      analytics.track('profile_updated', {
        user_id: userId,
        completion_percentage: completion.completionPercentage,
        updated_sections: Object.keys(updates)
      });

      return profile;
    } catch (error: any) {
      console.error('Failed to update profile:', error);

      // Provide more helpful error messages
      if (error.message?.includes('Email already in use')) {
        throw new Error('This email is already registered with another account');
      } else if (error.message?.includes('Username already taken')) {
        throw new Error('This username is already taken. Please choose another one');
      }

      throw error;
    }
  }

  async getProfile(userId: string): Promise<UserProfile | null> {
    try {
      return await apiClient.get<UserProfile>(`/profiles/${userId}`);
    } catch (error) {
      console.error('Failed to get profile:', error);
      return null;
    }
  }

  async uploadAvatar(userId: string, file: File): Promise<{ avatarUrl: string }> {
    try {
      return await apiClient.uploadFile<{ avatarUrl: string }>(`/profiles/${userId}/avatar`, file);
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
