import { useState, useEffect } from 'react';
import { UserProfile } from '../../../core/types';
import { profileService } from '../services/profileService';
import { isSupabaseConfigured } from '../../../core/supabase';

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
    
    // Check if Supabase is configured
    if (!isSupabaseConfigured()) {
      setError('Supabase is not configured. Please click "Connect to Supabase" in the top right corner to set up your database connection, or check that your .env file contains valid VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY values.');
      setIsLoading(false);
      return;
    }
    
    try {
      setIsLoading(true);
      setError(null);
      
      // Double-check Supabase configuration before making database calls
      if (!isSupabaseConfigured()) {
        throw new Error('Supabase configuration is invalid. Please click "Connect to Supabase" in the top right corner to set up your database connection.');
      }
      
      let userProfile;
      try {
        userProfile = await profileService.getProfile(userId);
      } catch (profileError: any) {
        console.error('[useProfileCompletion] Error loading profile:', profileError);

        // Handle specific fetch errors that indicate Supabase connection issues
        if (profileError instanceof TypeError && profileError.message === 'Failed to fetch') {
          setError('Unable to connect to Supabase database. Please: 1) Click "Connect to Supabase" in the top right corner to set up your database connection, or 2) Check that your .env file contains valid VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY values, then restart the dev server with "npm run dev".');
          setProfile(null);
          return;
        } else if (profileError?.message?.includes('Failed to fetch') || profileError?.cause?.message === 'Failed to fetch') {
          setError('Database connection failed. Please verify your Supabase configuration and restart the development server.');
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
        // Profile not found - try to initialize it automatically
        console.warn('[useProfileCompletion] Profile not found for user:', userId);
        console.log('[useProfileCompletion] Attempting to auto-initialize profile...');

        try {
          // Try to initialize a profile for this user
          // The initialize endpoint will create it if it doesn't exist or return existing one
          const initializedProfile = await profileService.initializeProfile(userId);
          console.log('[useProfileCompletion] Profile auto-initialized successfully:', initializedProfile.userId);
          setProfile(initializedProfile);
          setError(null);
          return;
        } catch (initError: any) {
          console.error('[useProfileCompletion] Failed to auto-initialize profile:', initError);

          // If initialization failed, try the old method as fallback
          try {
            const minimalProfile = {
              userId: userId,
              email: '',
              fullName: '',
              bio: '',
              location: '',
              website: '',
            };
            const createdProfile = await profileService.createProfile(minimalProfile);
            console.log('[useProfileCompletion] Profile created via fallback method:', createdProfile.userId);
            setProfile(createdProfile);
            setError(null);
            return;
          } catch (fallbackError: any) {
            console.error('[useProfileCompletion] Fallback profile creation also failed:', fallbackError);
            setProfile(null);
            setError('Профиль не найден. Пожалуйста, заполните профиль чтобы продолжить.');
            return;
          }
        }
      }

      console.log('[useProfileCompletion] Profile loaded:', { userId, profile: userProfile });
      setProfile(userProfile);
      setError(null);
    } catch (err: any) {
      console.warn('Failed to load profile, handling gracefully:', err);
      
      // Handle different types of errors with specific messages
      if (err instanceof TypeError && err.message === 'Failed to fetch') {
        setError('Unable to connect to Supabase database. Please: 1) Click "Connect to Supabase" in the top right corner, or 2) Check that your .env file exists and contains valid VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY values, then restart the dev server.');
      } else if (err.message?.includes('Unable to connect to Supabase') || err.message?.includes('Database connection failed')) {
        setError(err.message);
      } else if (err.message?.includes('relation') && err.message?.includes('does not exist')) {
        setError('Database tables are not set up. Please configure Supabase properly.');
      } else if (err.message?.includes('Invalid API key')) {
        setError('Invalid Supabase API key. Please check your configuration.');
      } else if (err.message?.includes('Failed to fetch')) {
        setError('Network connection failed. Please check your internet connection and Supabase configuration.');
      } else {
        setError(err.message || 'Failed to load profile. Please check your database connection.');
      }
      
      // Set profile to null to prevent further errors
      setProfile(null);
    } finally {
      setIsLoading(false);
    }
  };

  const updateProfile = async (updates: Partial<UserProfile>) => {
    if (!isSupabaseConfigured()) {
      throw new Error('Supabase is not configured. Please click "Connect to Supabase" or check your .env file configuration.');
    }
    
    try {
      if (!profile) throw new Error('No profile loaded');
      
      const updatedProfile = await profileService.updateProfile(userId, updates);
      setProfile(updatedProfile);
      return updatedProfile;
    } catch (err: any) {
      if (err instanceof TypeError && err.message === 'Failed to fetch') {
        setError('Unable to connect to database. Please ensure Supabase is properly configured.');
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