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
      const userProfile = await profileService.getProfile(userId);
      setProfile(userProfile);
    } catch (err: any) {
      console.error('Failed to load profile:', err);
      
      // Handle different types of errors
      if (err instanceof TypeError && err.message === 'Failed to fetch') {
        setError('Unable to connect to Supabase database. Please: 1) Click "Connect to Supabase" in the top right corner, or 2) Check that your .env file exists and contains valid VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY values, then restart the dev server.');
      } else if (err.message?.includes('relation') && err.message?.includes('does not exist')) {
        setError('Database tables are not set up. Please configure Supabase properly.');
      } else if (err.message?.includes('Invalid API key')) {
        setError('Invalid Supabase API key. Please check your configuration.');
      } else if (err.message?.includes('Failed to fetch')) {
        setError('Network connection failed. Please check your internet connection and Supabase configuration.');
      } else {
        setError(err.message || 'Failed to load profile. Please check your database connection.');
      }
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