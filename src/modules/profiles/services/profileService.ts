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

      // Handle 409 Conflict - profile already exists
      if (error.status === 409 || error.statusCode === 409) {
        console.log('Profile already exists (409), attempting to fetch and update...');

        try {
          // Try to fetch the existing profile
          const existingProfile = await this.getProfile(profileData.userId!);

          if (existingProfile) {
            console.log('Existing profile found, updating it instead');
            // Profile exists, update it instead
            return await this.updateProfile(profileData.userId!, profileData);
          }
        } catch (fetchError) {
          console.error('Failed to fetch existing profile after 409:', fetchError);
        }
      }

      // Provide more helpful error messages
      if (error.message?.includes('Email already in use')) {
        throw new Error('This email is already registered with another account');
      } else if (error.message?.includes('Username already taken')) {
        throw new Error('This username is already taken. Please choose another one');
      } else if (error.message?.includes('Conflict') || error.status === 409) {
        throw new Error('Failed to create profile. Please try refreshing the page.');
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
      if (updates.username !== undefined) payload.username = updates.username || null;
      if (updates.phone !== undefined) payload.phone = updates.phone || null;
      if (updates.bio !== undefined) payload.bio = updates.bio || null;
      if (updates.location !== undefined) payload.location = updates.location || null;
      if (updates.website !== undefined) payload.website = updates.website || null;
      if (updates.avatar !== undefined) payload.avatar = updates.avatar || null;

      if (updates.influencerData !== undefined) {
        const sanitizedInfluencerData = this.hasInfluencerContent(updates.influencerData)
          ? this.sanitizeInfluencerData(updates.influencerData)
          : null;
        payload.influencerData = sanitizedInfluencerData;
      }
      if (updates.advertiserData !== undefined) {
        const sanitizedAdvertiserData = this.hasAdvertiserContent(updates.advertiserData)
          ? this.sanitizeAdvertiserData(updates.advertiserData)
          : null;
        payload.advertiserData = sanitizedAdvertiserData;
      }

      // Remove read-only fields that should never be sent to backend
      delete payload.userId;
      delete payload.email;
      delete payload.id;
      delete payload.createdAt;
      delete payload.updatedAt;
      delete payload.isDeleted;
      delete payload.deletedAt;
      delete payload.deletedBy;

      console.log('[ProfileService] Sanitized payload:', JSON.stringify(payload, null, 2));

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

      // Provide more helpful error messages based on the specific error
      if (error.message?.includes('Username already taken')) {
        throw new Error('Это имя пользователя уже занято. Пожалуйста, выберите другое');
      } else if (error.message?.includes('Conflict') || error.statusCode === 409) {
        // Generic conflict error
        if (updates.username) {
          throw new Error('Это имя пользователя уже занято. Пожалуйста, выберите другое');
        }
        throw new Error('Не удалось обновить профиль. Пожалуйста, попробуйте еще раз');
      } else if (error.message?.includes('Profile not found') || error.statusCode === 404) {
        throw new Error('Профиль не найден. Пожалуйста, попробуйте войти снова');
      } else if (error.message?.includes('Unauthorized') || error.statusCode === 401) {
        throw new Error('Вы не авторизованы. Пожалуйста, войдите в систему');
      }

      // Re-throw the original error if we couldn't handle it
      throw new Error(error.message || 'Не удалось обновить профиль');
    }
  }

  async getProfile(userId: string): Promise<UserProfile | null> {
    try {
      console.log('[ProfileService] 📡 Fetching profile for user:', userId);
      const profile = await apiClient.get<UserProfile>(`/profiles/${userId}`);

      console.log('[ProfileService] ✅ Profile loaded successfully:', {
        userId,
        hasProfile: !!profile,
        fullName: profile?.fullName,
        email: profile?.email,
        bio: profile?.bio,
        profileData: profile
      });

      return profile;
    } catch (error: any) {
      console.error('[ProfileService] ❌ Failed to get profile:', {
        userId,
        error: error.message,
        status: error.status,
        statusCode: error.statusCode,
        fullError: error
      });

      // If profile not found (404), return null
      if (error.status === 404 || error.statusCode === 404 || error.message?.includes('not found')) {
        console.warn('[ProfileService] ⚠️ Profile not found for user:', userId);
        return null;
      }

      // For other errors, throw so they can be handled by the caller
      throw error;
    }
  }

  async initializeProfile(userId: string, email?: string, fullName?: string): Promise<UserProfile> {
    try {
      console.log('[ProfileService] Initializing profile for user:', userId);

      const profile = await apiClient.post<UserProfile>('/profiles/initialize', {
        email,
        fullName,
      });

      console.log('[ProfileService] Profile initialized successfully:', profile.userId);

      analytics.track('profile_initialized', {
        user_id: profile.userId,
      });

      return profile;
    } catch (error: any) {
      console.error('[ProfileService] Failed to initialize profile:', error);
      throw error;
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

  private sanitizeInfluencerData(data: any): any {
    if (!data) return null;

    // Ensure all numeric fields are actual numbers, not strings
    const sanitized: any = {
      ...data,
      metrics: {
        totalFollowers: Number(data.metrics?.totalFollowers || 0),
        engagementRate: Number(data.metrics?.engagementRate || 0),
        averageViews: Number(data.metrics?.averageViews || 0),
        monthlyGrowth: Number(data.metrics?.monthlyGrowth || 0)
      },
      pricing: data.pricing ? {
        post: Number(data.pricing.post || 0),
        story: Number(data.pricing.story || 0),
        reel: Number(data.pricing.reel || 0),
        video: Number(data.pricing.video || 0)
      } : undefined,
      socialMediaLinks: Array.isArray(data.socialMediaLinks) ? data.socialMediaLinks : [],
      contentCategories: Array.isArray(data.contentCategories) ? data.contentCategories : [],
      availableForCollabs: Boolean(data.availableForCollabs)
    };

    // Remove undefined fields
    Object.keys(sanitized).forEach(key => {
      if (sanitized[key] === undefined) {
        delete sanitized[key];
      }
    });

    return sanitized;
  }

  private sanitizeAdvertiserData(data: any): any {
    if (!data) return null;

    // Ensure all numeric fields are actual numbers, not strings
    const sanitized: any = {
      ...data,
      previousCampaigns: Number(data.previousCampaigns || 0),
      averageBudget: Number(data.averageBudget || 0),
      campaignPreferences: data.campaignPreferences ? {
        ...data.campaignPreferences,
        budgetRange: {
          min: Number(data.campaignPreferences.budgetRange?.min || 0),
          max: Number(data.campaignPreferences.budgetRange?.max || 0),
          currency: data.campaignPreferences.budgetRange?.currency || 'USD'
        },
        preferredPlatforms: Array.isArray(data.campaignPreferences.preferredPlatforms)
          ? data.campaignPreferences.preferredPlatforms
          : [],
        campaignTypes: Array.isArray(data.campaignPreferences.campaignTypes)
          ? data.campaignPreferences.campaignTypes
          : [],
        targetAudience: data.campaignPreferences.targetAudience || {
          ageRange: [18, 65],
          genders: [],
          countries: [],
          interests: []
        }
      } : undefined
    };

    // Remove undefined fields and organizationWebsite if it exists
    delete sanitized.organizationWebsite;
    Object.keys(sanitized).forEach(key => {
      if (sanitized[key] === undefined) {
        delete sanitized[key];
      }
    });

    return sanitized;
  }
}

export const profileService = new ProfileService();
