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
      setError('Supabase не настроен. Пожалуйста, нажмите "Connect to Supabase" в правом верхнем углу.');
      setIsLoading(false);
      return;
    }
    
    try {
      setIsLoading(true);
      setError(null);
      const userProfile = await profileService.getProfile(userId);
      setProfile(userProfile);
    } catch (err: any) {
      // Handle different types of errors
      if (err instanceof TypeError && err.message === 'Failed to fetch') {
        setError('Supabase не настроен. Пожалуйста, нажмите "Connect to Supabase" в правом верхнем углу для настройки.');
      } else if (err.message?.includes('relation') && err.message?.includes('does not exist')) {
        setError('База данных не настроена. Пожалуйста, настройте Supabase.');
      } else if (err.message?.includes('Invalid API key')) {
        setError('Неверный API ключ Supabase. Проверьте настройки.');
      } else {
        setError(err.message || 'Не удалось загрузить профиль');
      }
      console.error('Failed to load profile:', err);
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
      setError(err.message || 'Failed to update profile');
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