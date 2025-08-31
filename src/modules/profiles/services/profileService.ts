import { supabase, TABLES } from '../../../core/supabase';
import { UserProfile, SocialMediaLink } from '../../../core/types';
import { analytics } from '../../../core/analytics';

export class ProfileService {
  async createProfile(profileData: Partial<UserProfile>): Promise<UserProfile> {
    try {
      // Get current authenticated user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('User must be authenticated to create a profile');
      }

      // Check for duplicate email
      const { data: existingUser } = await supabase
        .from(TABLES.USER_PROFILES)
        .select('email')
        .eq('email', profileData.email)
        .maybeSingle();

      if (existingUser) {
        throw new Error('An account with this email already exists');
      }

      // Determine user type based on provided data
      const userType = this.determineUserType(profileData);

      // Calculate initial profile completion
      const completion = this.calculateProfileCompletion(profileData);

      const newProfile = {
        user_id: user.id,
        email: profileData.email,
        full_name: profileData.fullName,
        username: profileData.username || null,
        phone: profileData.phone || null,
        bio: profileData.bio,
        location: profileData.location,
        website: profileData.website,
        avatar: profileData.avatar,
        influencer_data: profileData.influencerData,
        advertiser_data: profileData.advertiserData,
        user_type: userType,
        profile_completion: completion,
        unified_account_info: {
          isVerified: false,
          joinedAt: new Date().toISOString(),
          lastActive: new Date().toISOString(),
          accountType: userType
        },
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      const { data, error } = await supabase
        .from(TABLES.USER_PROFILES)
        .insert([newProfile])
        .select()
        .single();

      if (error) throw error;

      // Track profile creation
      analytics.track('profile_created', {
        user_id: data.user_id,
        completion_percentage: completion.completionPercentage
      });

      return this.transformFromDatabase(data);
    } catch (error) {
      console.error('Failed to create profile:', error);
      throw error;
    }
  }

  async updateProfile(userId: string, updates: Partial<UserProfile>): Promise<UserProfile> {
    try {
      // Calculate updated profile completion
      const { data: currentProfile } = await supabase
        .from(TABLES.USER_PROFILES)
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();

      if (!currentProfile) {
        throw new Error('Profile not found');
      }

      const transformedCurrentProfile = this.transformFromDatabase(currentProfile);
      const mergedProfile = { ...transformedCurrentProfile, ...updates };
      
      // Determine user type based on updated data
      const userType = this.determineUserType(mergedProfile);
      
      const completion = this.calculateProfileCompletion(mergedProfile);

      // Prepare update data with explicit field mapping
      const updateData: any = {
        user_type: userType,
        profile_completion: completion,
        updated_at: new Date().toISOString()
      };
      
      // Handle basic fields
      if (updates.fullName !== undefined) updateData.full_name = updates.fullName;
      if (updates.email !== undefined) updateData.email = updates.email;
      if (updates.username !== undefined) updateData.username = updates.username || null;
      if (updates.phone !== undefined) updateData.phone = updates.phone || null;
      if (updates.bio !== undefined) updateData.bio = updates.bio || null;
      if (updates.location !== undefined) updateData.location = updates.location || null;
      if (updates.website !== undefined) updateData.website = updates.website || null;
      if (updates.avatar !== undefined) updateData.avatar = updates.avatar || null;
      
      // Handle JSON fields - explicitly set to null when clearing
      if (updates.influencerData !== undefined) {
        // Check if influencer data has meaningful content, if not set to null
        updateData.influencer_data = this.hasInfluencerContent(updates.influencerData) ? updates.influencerData : null;
      }
      if (updates.advertiserData !== undefined) {
        // Check if advertiser data has meaningful content, if not set to null
        updateData.advertiser_data = this.hasAdvertiserContent(updates.advertiserData) ? updates.advertiserData : null;
      }

      const { data, error } = await supabase
        .from(TABLES.USER_PROFILES)
        .update(updateData)
        .eq('user_id', userId)
        .select()
        .single();

      if (error) throw error;

      // Track profile update
      analytics.track('profile_updated', {
        user_id: userId,
        completion_percentage: completion.completionPercentage,
        updated_sections: Object.keys(updates)
      });

      return this.transformFromDatabase(data);
    } catch (error) {
      console.error('Failed to update profile:', error);
      throw error;
    }
  }

  async getProfile(userId: string): Promise<UserProfile | null> {
    try {
      const { data, error } = await supabase
        .from(TABLES.USER_PROFILES)
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();

      if (error) throw error;
      if (!data) return null;

      return this.transformFromDatabase(data);
    } catch (error) {
      console.error('Failed to get profile:', error);
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
        // Update existing link
        updatedLinks = [...currentLinks];
        updatedLinks[existingLinkIndex] = socialLink;
      } else {
        // Add new link
        updatedLinks = [...currentLinks, socialLink];
      }

      const updatedInfluencerData = {
        ...profile.influencerData,
        socialMediaLinks: updatedLinks
      };

      await this.updateProfile(userId, {
        influencerData: updatedInfluencerData
      });

      // Track social media linking
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

      // Track social media unlinking
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
    // Check if influencer data has meaningful content (not null and has content)
    const hasInfluencerData = this.hasInfluencerContent(profileData.influencerData);
    
    // Check if advertiser data has meaningful content (not null and has content)
    const hasAdvertiserData = this.hasAdvertiserContent(profileData.advertiserData);

    // Prioritize influencer if both types of data exist
    if (hasInfluencerData) {
      return 'influencer';
    } else if (hasAdvertiserData) {
      return 'advertiser';
    } else {
      return 'influencer'; // Default to influencer for new users
    }
  }

  calculateProfileCompletion(profile: Partial<UserProfile>) {
    let basicInfoComplete = false;
    let influencerSetupComplete = false;
    let advertiserSetupComplete = false;

    // Check basic info completion (50% of total) - все обязательные поля
    if (profile.fullName?.trim() && 
         profile.email?.trim() && 
         profile.phone?.trim() &&
         profile.location?.trim() &&
         profile.bio?.trim() && 
         profile.bio.trim().length >= 50) {
      basicInfoComplete = true;
    }

    // Check influencer setup completion (25% of total)
    influencerSetupComplete = this.hasInfluencerContent(profile.influencerData);
    
    // Check advertiser setup completion (25% of total)
    advertiserSetupComplete = this.hasAdvertiserContent(profile.advertiserData);

    // Calculate completion percentage based on new logic
    let completionPercentage = 0;
    
    if (basicInfoComplete) {
      completionPercentage += 50; // Basic info gives 50%
    }
    
    if (influencerSetupComplete) {
      completionPercentage += 25; // Influencer section gives 25%
    }
    
    if (advertiserSetupComplete) {
      completionPercentage += 25; // Advertiser section gives 25%
    }
    
    // Profile is complete when all sections are done
    const overallComplete = basicInfoComplete && influencerSetupComplete && advertiserSetupComplete;

    return {
      basicInfo: basicInfoComplete,
      influencerSetup: influencerSetupComplete,
      advertiserSetup: advertiserSetupComplete,
      overallComplete,
      completionPercentage
    };
  }

  private transformFromDatabase(dbData: any): UserProfile {
    return {
      userId: dbData.user_id,
      email: dbData.email,
      fullName: dbData.full_name,
      username: dbData.username || '',
      phone: dbData.phone || '',
      userType: dbData.user_type,
      avatar: dbData.avatar,
      bio: dbData.bio,
      location: dbData.location,
      website: dbData.website,
      influencerData: dbData.influencer_data,
      advertiserData: dbData.advertiser_data,
      profileCompletion: dbData.profile_completion,
      unifiedAccountInfo: {
        ...dbData.unified_account_info,
        accountType: dbData.user_type
      },
      createdAt: dbData.created_at,
      updatedAt: dbData.updated_at
    };
  }

  private transformToDatabase(profileData: Partial<UserProfile>): any {
    const dbData: any = {};
    
    if (profileData.userId) dbData.user_id = profileData.userId;
    if (profileData.email) dbData.email = profileData.email;
    if (profileData.fullName) dbData.full_name = profileData.fullName;
    if (profileData.username !== undefined) dbData.username = profileData.username || null;
    if (profileData.phone !== undefined) dbData.phone = profileData.phone || null;
    // Always set user_type to avoid NOT NULL constraint violation
    dbData.user_type = profileData.userType || 'influencer';
    
    // Handle optional fields - set to null if empty string or undefined
    dbData.avatar = profileData.avatar || null;
    dbData.bio = profileData.bio || null;
    dbData.location = profileData.location || null;
    dbData.website = profileData.website || null;
    
    // Handle JSON fields - set to null if no meaningful data
    dbData.influencer_data = profileData.influencerData || null;
    dbData.advertiser_data = profileData.advertiserData || null;
    dbData.profile_completion = profileData.profileCompletion || {};
    dbData.unified_account_info = profileData.unifiedAccountInfo || {};
    
    if (profileData.createdAt) dbData.created_at = profileData.createdAt;
    if (profileData.updatedAt) dbData.updated_at = profileData.updatedAt;

    return dbData;
  }

  private hasInfluencerContent(influencerData: any): boolean {
    if (!influencerData || influencerData === null) return false;
    
    // Check for simple influencer data from ProfilesPage
    const hasMainSocialLink = influencerData.mainSocialLink && influencerData.mainSocialLink.trim() !== '';
    const hasCategory = influencerData.category && influencerData.category.trim() !== '';
    const hasPlatformName = influencerData.platformName && influencerData.platformName.trim() !== '';
    
    // Check for complex influencer data from ProfileSetupModal
    const hasLinks = influencerData.socialMediaLinks && influencerData.socialMediaLinks.length > 0;
    const hasMetrics = influencerData.metrics && influencerData.metrics.totalFollowers > 0;
    const hasCategories = influencerData.contentCategories && influencerData.contentCategories.length > 0;
    const hasPricing = influencerData.pricing && Object.values(influencerData.pricing).some((price: any) => price > 0);
    
    return hasMainSocialLink || hasCategory || hasPlatformName || hasLinks || hasMetrics || hasCategories || hasPricing;
  }

  private hasAdvertiserContent(advertiserData: any): boolean {
    if (!advertiserData || advertiserData === null) return false;
    
    // Check for simple advertiser data from ProfilesPage
    const hasCompanyNameSimple = advertiserData.companyName && advertiserData.companyName.trim() !== '';
    const hasCompanyWebsite = advertiserData.companyWebsite && advertiserData.companyWebsite.trim() !== '';
    const hasCompanyDescription = advertiserData.companyDescription && advertiserData.companyDescription.trim() !== '';
    
    // Check for complex advertiser data from ProfileSetupModal
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