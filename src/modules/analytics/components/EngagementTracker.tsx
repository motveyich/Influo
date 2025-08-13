import React, { useEffect, useRef } from 'react';
import { analytics } from '../../../core/analytics';

interface EngagementTrackerProps {
  userId: string;
  feature: string;
  children: React.ReactNode;
}

export function EngagementTracker({ userId, feature, children }: EngagementTrackerProps) {
  const startTimeRef = useRef<number>(Date.now());
  const isActiveRef = useRef<boolean>(true);

  useEffect(() => {
    startTimeRef.current = Date.now();
    isActiveRef.current = true;

    // Track when user becomes inactive
    const handleVisibilityChange = () => {
      if (document.hidden) {
        if (isActiveRef.current) {
          const duration = Date.now() - startTimeRef.current;
          analytics.trackEngagement(userId, feature, duration);
          isActiveRef.current = false;
        }
      } else {
        startTimeRef.current = Date.now();
        isActiveRef.current = true;
      }
    };

    // Track when user leaves the page
    const handleBeforeUnload = () => {
      if (isActiveRef.current) {
        const duration = Date.now() - startTimeRef.current;
        analytics.trackEngagement(userId, feature, duration);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      // Track engagement when component unmounts
      if (isActiveRef.current) {
        const duration = Date.now() - startTimeRef.current;
        analytics.trackEngagement(userId, feature, duration);
      }

      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [userId, feature]);

  return <>{children}</>;
}