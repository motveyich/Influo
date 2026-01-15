import { Platform, PLATFORM_LABELS } from '../constants';

export function formatPlatform(platform: Platform | string): string {
  return PLATFORM_LABELS[platform as Platform] || platform;
}

export function getPlatformColor(platform: Platform | string): string {
  const colors: Record<string, string> = {
    instagram: 'bg-gradient-to-r from-purple-500 to-pink-500',
    youtube: 'bg-red-600',
    tiktok: 'bg-black',
    vk: 'bg-blue-600',
    telegram: 'bg-sky-500',
    twitter: 'bg-blue-400',
    facebook: 'bg-blue-700',
    ok: 'bg-orange-500',
    twitch: 'bg-purple-600',
    rutube: 'bg-blue-500',
    yandex_zen: 'bg-yellow-500',
    likee: 'bg-pink-500',
    multi: 'bg-gray-600',
  };

  return colors[platform] || 'bg-gray-500';
}

export function getPlatformTextColor(platform: Platform | string): string {
  return 'text-white';
}
