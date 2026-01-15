export enum Platform {
  INSTAGRAM = 'instagram',
  YOUTUBE = 'youtube',
  TIKTOK = 'tiktok',
  VK = 'vk',
  TELEGRAM = 'telegram',
  TWITTER = 'twitter',
  FACEBOOK = 'facebook',
  OK = 'ok',
  TWITCH = 'twitch',
  RUTUBE = 'rutube',
  YANDEX_ZEN = 'yandex_zen',
  LIKEE = 'likee',
  MULTI = 'multi',
}

export const PLATFORM_LABELS: Record<Platform, string> = {
  [Platform.INSTAGRAM]: 'Instagram',
  [Platform.YOUTUBE]: 'YouTube',
  [Platform.TIKTOK]: 'TikTok',
  [Platform.VK]: 'VK',
  [Platform.TELEGRAM]: 'Telegram',
  [Platform.TWITTER]: 'Twitter',
  [Platform.FACEBOOK]: 'Facebook',
  [Platform.OK]: 'Одноклассники',
  [Platform.TWITCH]: 'Twitch',
  [Platform.RUTUBE]: 'Rutube',
  [Platform.YANDEX_ZEN]: 'Яндекс.Дзен',
  [Platform.LIKEE]: 'Likee',
  [Platform.MULTI]: 'Несколько платформ',
};

export const PRIMARY_PLATFORMS = [
  Platform.INSTAGRAM,
  Platform.YOUTUBE,
  Platform.TIKTOK,
  Platform.VK,
  Platform.TELEGRAM,
  Platform.TWITTER,
  Platform.FACEBOOK,
];

export const ADDITIONAL_PLATFORMS = [
  Platform.OK,
  Platform.TWITCH,
  Platform.RUTUBE,
  Platform.YANDEX_ZEN,
  Platform.LIKEE,
];
