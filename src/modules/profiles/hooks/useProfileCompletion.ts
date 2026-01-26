import { useState, useEffect } from 'react';
import { UserProfile } from '../../../core/types';
import { profileService } from '../services/profileService';

export function useProfileCompletion(userId: string) {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (userId) {
      loadProfile();
    }
  }, [userId]);

  const loadProfile = async () => {
    if (!userId) {
      setError('No user ID provided');
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      console.log('[useProfileCompletion] Loading profile for user:', userId);

      let userProfile;
      try {
        userProfile = await profileService.getProfile(userId);
        console.log('[useProfileCompletion] Profile loaded from API:', {
          userId: userProfile?.userId,
          fullName: userProfile?.fullName,
          email: userProfile?.email,
          hasProfile: !!userProfile
        });
      } catch (profileError: any) {
        console.error('[useProfileCompletion] Error loading profile:', profileError);

        // Handle specific fetch errors that indicate connection issues
        if (profileError instanceof TypeError && profileError.message === 'Failed to fetch') {
          setError('Unable to connect to backend API. Please check your network connection.');
          setProfile(null);
          return;
        } else if (profileError?.message?.includes('Failed to fetch') || profileError?.cause?.message === 'Failed to fetch') {
          setError('Connection failed. Please verify your network connection.');
          setProfile(null);
          return;
        } else if (profileError?.message?.includes('account has been deleted')) {
          setError('Your account has been deleted. Please contact support for assistance.');
          setProfile(null);
          return;
        } else {
          // For other errors, set a generic error message
          console.error('[useProfileCompletion] Unexpected error:', profileError);
          setError(profileError.message || 'Failed to load profile. Please check your database connection.');
          setProfile(null);
          return;
        }
      }

      if (!userProfile) {
        // Profile not found - this should NOT happen normally as profiles are created during registration
        console.warn('[useProfileCompletion] ⚠️ Profile not found for user:', userId);
        console.warn('[useProfileCompletion] This may indicate a registration issue or profile was not created properly');

        // Don't try to auto-create - just set error state and let user know
        setProfile(null);
        setError('Профиль не найден. Пожалуйста, обратитесь в службу поддержки.');
        return;
      }

      console.log('[useProfileCompletion] ✅ Profile loaded successfully:', {
        userId: userProfile.userId,
        fullName: userProfile.fullName,
        email: userProfile.email,
        hasInfluencerData: !!userProfile.influencerData,
        hasAdvertiserData: !!userProfile.advertiserData
      });

      setProfile(userProfile);
      setError(null);
    } catch (err: any) {
      console.warn('Failed to load profile, handling gracefully:', err);
      
      // Handle different types of errors with specific messages
      if (err instanceof TypeError && err.message === 'Failed to fetch') {
        setError('Unable to connect to backend API. Please check your network connection.');
      } else if (err.message?.includes('Connection failed')) {
        setError(err.message);
      } else if (err.message?.includes('Failed to fetch')) {
        setError('Network connection failed. Please check your internet connection.');
      } else {
        setError(err.message || 'Failed to load profile. Please check your network connection.');
      }
      
      // Set profile to null to prevent further errors
      setProfile(null);
    } finally {
      setIsLoading(false);
    }
  };

  const updateProfile = async (updates: Partial<UserProfile>) => {
    try {
      if (!profile) throw new Error('No profile loaded');

      const updatedProfile = await profileService.updateProfile(userId, updates);
      setProfile(updatedProfile);
      return updatedProfile;
    } catch (err: any) {
      if (err instanceof TypeError && err.message === 'Failed to fetch') {
        setError('Unable to connect to backend API. Please check your network connection.');
      } else {
        setError(err.message || 'Failed to update profile');
      }
      throw err;
    }
  };

  const checkFeatureAccess = (requiredCompletion: number = 80): boolean => {
    if (!profile) return false;
    return profile.profileCompletion.completionPercentage >= requiredCompletion;
  };

  const getMissingRequirements = (): string[] => {
    if (!profile) return [];

    const requirements = [];

    if (!profile.profileCompletion.basicInfo) {
      requirements.push('Complete basic profile information');
    }

    if (profile.influencerData && !profile.profileCompletion.influencerSetup) {
      requirements.push('Add social media accounts and metrics');
    }

    if (profile.advertiserData && !profile.profileCompletion.advertiserSetup) {
      requirements.push('Set up advertiser preferences');
    }

    return requirements;
  };

  return {
    profile,
    isLoading,
    error,
    updateProfile,
    checkFeatureAccess,
    getMissingRequirements,
    refresh: loadProfile
  };
}