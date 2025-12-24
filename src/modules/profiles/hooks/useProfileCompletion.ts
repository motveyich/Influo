import { useState, useEffect } from 'react';
import { UserProfile } from '../../../core/types';
import { profileService } from '../services/profileService';
import { isDatabaseConfigured } from '../../../core/database';

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

    if (!isDatabaseConfigured()) {
      setError('Database is not configured. Please check your .env file contains valid VITE_DATABASE_URL and VITE_DATABASE_KEY values.');
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      if (!isDatabaseConfigured()) {
        throw new Error('Database configuration is invalid.');
      }

      let userProfile;
      try {
        userProfile = await profileService.getProfile(userId);
      } catch (profileError: any) {
        if (profileError instanceof TypeError && profileError.message === 'Failed to fetch') {
          setError('Unable to connect to database. Please check your .env file contains valid configuration, then restart the dev server.');
          setProfile(null);
          return;
        } else if (profileError?.message?.includes('Failed to fetch') || profileError?.cause?.message === 'Failed to fetch') {
          setError('Database connection failed. Please verify your configuration and restart the development server.');
          setProfile(null);
          return;
        } else {
          setError(profileError.message || 'Failed to load profile. Please check your database connection.');
          setProfile(null);
          return;
        }
      }

      if (!userProfile) {
        setProfile(null);
        setError(null);
        return;
      }

      setProfile(userProfile);
      setError(null);
    } catch (err: any) {
      console.warn('Failed to load profile, handling gracefully:', err);

      if (err instanceof TypeError && err.message === 'Failed to fetch') {
        setError('Unable to connect to database. Please check that your .env file exists and contains valid configuration, then restart the dev server.');
      } else if (err.message?.includes('Unable to connect') || err.message?.includes('Database connection failed')) {
        setError(err.message);
      } else if (err.message?.includes('relation') && err.message?.includes('does not exist')) {
        setError('Database tables are not set up. Please configure your database properly.');
      } else if (err.message?.includes('Invalid API key')) {
        setError('Invalid API key. Please check your configuration.');
      } else if (err.message?.includes('Failed to fetch')) {
        setError('Network connection failed. Please check your internet connection and database configuration.');
      } else {
        setError(err.message || 'Failed to load profile. Please check your database connection.');
      }

      setProfile(null);
    } finally {
      setIsLoading(false);
    }
  };

  const updateProfile = async (updates: Partial<UserProfile>) => {
    if (!isDatabaseConfigured()) {
      throw new Error('Database is not configured. Please check your .env file configuration.');
    }

    try {
      if (!profile) throw new Error('No profile loaded');

      const updatedProfile = await profileService.updateProfile(userId, updates);
      setProfile(updatedProfile);
      return updatedProfile;
    } catch (err: any) {
      if (err instanceof TypeError && err.message === 'Failed to fetch') {
        setError('Unable to connect to database. Please ensure database is properly configured.');
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
