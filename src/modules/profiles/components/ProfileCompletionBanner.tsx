import React from 'react';
import { UserProfile } from '../../../core/types';
import { useTranslation } from '../../../hooks/useTranslation';
import { AlertCircle, CheckCircle, ArrowRight } from 'lucide-react';

interface ProfileCompletionBannerProps {
  profile: UserProfile;
  onCompleteProfile: () => void;
}

export function ProfileCompletionBanner({ profile, onCompleteProfile }: ProfileCompletionBannerProps) {
  const completion = profile.profileCompletion;
  const { t } = useTranslation();

  // Hide banner ONLY when profile is fully complete (basic info + at least one additional section)
  if (completion.overallComplete) {
    return null;
  }

  const getMissingSteps = () => {
    const steps = [];
    
    if (!completion.basicInfo) {
      steps.push(t('profile.completionBanner.missingSteps.basicInfo'));
    }
    
    if (profile.influencerData && !completion.influencerSetup) {
      steps.push(t('profile.completionBanner.missingSteps.influencerSetup'));
    }
    
    if (profile.advertiserData && !completion.advertiserSetup) {
      steps.push(t('profile.completionBanner.missingSteps.advertiserSetup'));
    }

    return steps;
  };

  const missingSteps = getMissingSteps();

  return (
    <div className="bg-gradient-to-r from-yellow-50 to-orange-50 border border-yellow-200 rounded-lg p-4 mb-6">
      <div className="flex items-start space-x-3">
        <AlertCircle className="w-5 h-5 text-yellow-600 mt-0.5 flex-shrink-0" />
        <div className="flex-1">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-yellow-800">
              {t('profile.completionBanner.title')} ({completion.completionPercentage}%)
            </h3>
            <button
              onClick={onCompleteProfile}
              className="bg-yellow-600 hover:bg-yellow-700 text-white px-3 py-1 rounded-md text-sm font-medium transition-colors flex items-center space-x-1"
            >
              <span>{t('profile.completionBanner.completeNow')}</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>
          
          {/* Progress Bar */}
          <div className="w-full bg-yellow-200 rounded-full h-2 mb-3">
            <div 
              className="bg-yellow-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${completion.completionPercentage}%` }}
            ></div>
          </div>

          <div className="space-y-1">
            <p className="text-sm text-yellow-700 mb-2">
              {t('profile.completionBanner.suggestions')}
            </p>
            <ul className="space-y-1">
              {missingSteps.map((step, index) => (
                <li key={index} className="flex items-center space-x-2 text-sm text-yellow-700">
                  <div className="w-1.5 h-1.5 bg-yellow-600 rounded-full"></div>
                  <span>{step}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}