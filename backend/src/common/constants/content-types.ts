export enum ContentType {
  POST = 'post',
  STORY = 'story',
  REEL = 'reel',
  VIDEO = 'video',
  LIVE = 'live',
  IGTV = 'igtv',
  SHORTS = 'shorts',
}

export const CONTENT_TYPE_LABELS: Record<ContentType, string> = {
  [ContentType.POST]: 'Пост',
  [ContentType.STORY]: 'Сторис',
  [ContentType.REEL]: 'Reels',
  [ContentType.VIDEO]: 'Видео',
  [ContentType.LIVE]: 'Прямой эфир',
  [ContentType.IGTV]: 'IGTV',
  [ContentType.SHORTS]: 'Shorts',
};

export const PLATFORM_CONTENT_TYPES: Record<string, ContentType[]> = {
  instagram: [ContentType.POST, ContentType.STORY, ContentType.REEL, ContentType.IGTV, ContentType.LIVE],
  youtube: [ContentType.VIDEO, ContentType.SHORTS, ContentType.LIVE],
  tiktok: [ContentType.VIDEO, ContentType.LIVE],
  vk: [ContentType.POST, ContentType.STORY, ContentType.VIDEO, ContentType.LIVE],
  telegram: [ContentType.POST, ContentType.VIDEO],
  twitter: [ContentType.POST, ContentType.VIDEO, ContentType.LIVE],
  facebook: [ContentType.POST, ContentType.STORY, ContentType.VIDEO, ContentType.LIVE],
  ok: [ContentType.POST, ContentType.VIDEO, ContentType.LIVE],
  twitch: [ContentType.LIVE, ContentType.VIDEO],
  rutube: [ContentType.VIDEO, ContentType.LIVE],
  yandex_zen: [ContentType.POST, ContentType.VIDEO],
  likee: [ContentType.VIDEO, ContentType.LIVE],
};
