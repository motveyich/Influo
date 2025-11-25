import React from 'react';
import { User } from 'lucide-react';
import { avatarService } from '../services/avatarService';

interface UserAvatarProps {
  avatarUrl?: string | null;
  fullName?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

const sizeClasses = {
  xs: 'w-6 h-6 text-xs',
  sm: 'w-8 h-8 text-sm',
  md: 'w-10 h-10 text-base',
  lg: 'w-12 h-12 text-lg',
  xl: 'w-16 h-16 text-2xl'
};

const iconSizes = {
  xs: 'w-3 h-3',
  sm: 'w-4 h-4',
  md: 'w-5 h-5',
  lg: 'w-6 h-6',
  xl: 'w-8 h-8'
};

export function UserAvatar({ avatarUrl, fullName, size = 'md', className = '' }: UserAvatarProps) {
  const getDisplayUrl = () => {
    if (avatarUrl) return avatarUrl;
    if (fullName) {
      return `https://ui-avatars.com/api/?name=${encodeURIComponent(fullName)}&background=3b82f6&color=fff&size=200`;
    }
    return null;
  };

  const displayUrl = getDisplayUrl();

  return (
    <div className={`${sizeClasses[size]} rounded-full overflow-hidden bg-gray-200 flex-shrink-0 ${className}`}>
      {displayUrl ? (
        <img
          src={displayUrl}
          alt={fullName || 'User avatar'}
          className="w-full h-full object-cover"
          onError={(e) => {
            const target = e.target as HTMLImageElement;
            target.style.display = 'none';
            if (target.nextElementSibling) {
              (target.nextElementSibling as HTMLElement).style.display = 'flex';
            }
          }}
        />
      ) : null}
      <div
        className={`w-full h-full flex items-center justify-center bg-blue-500 text-white font-semibold ${!displayUrl ? '' : 'hidden'}`}
        style={{ display: displayUrl ? 'none' : 'flex' }}
      >
        {fullName ? (
          avatarService.getUserInitials(fullName)
        ) : (
          <User className={iconSizes[size]} />
        )}
      </div>
    </div>
  );
}
