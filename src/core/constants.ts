// Shared constants across the application

// Platforms (lowercase to match backend)
export const PLATFORMS = ['instagram', 'youtube', 'tiktok', 'vk', 'telegram', 'twitter', 'facebook', 'ok', 'twitch', 'rutube', 'yandex_zen', 'likee', 'multi'] as const;
export type Platform = typeof PLATFORMS[number];

// Platform display names
export const PLATFORM_LABELS: Record<Platform, string> = {
  instagram: 'Instagram',
  youtube: 'YouTube',
  tiktok: 'TikTok',
  vk: 'VK',
  telegram: 'Telegram',
  twitter: 'Twitter',
  facebook: 'Facebook',
  ok: 'Одноклассники',
  twitch: 'Twitch',
  rutube: 'Rutube',
  yandex_zen: 'Яндекс.Дзен',
  likee: 'Likee',
  multi: 'Несколько платформ',
};

// Primary platforms shown by default
export const PRIMARY_PLATFORMS: Platform[] = ['instagram', 'youtube', 'tiktok', 'vk', 'telegram', 'twitter', 'facebook'];

// Content types
export const CONTENT_TYPES = ['post', 'story', 'reel', 'video', 'live', 'igtv', 'shorts'] as const;
export type ContentType = typeof CONTENT_TYPES[number];

// Auto-campaign statuses
export const AUTO_CAMPAIGN_STATUSES = ['draft', 'active', 'closed', 'completed'] as const;
export type AutoCampaignStatus = typeof AUTO_CAMPAIGN_STATUSES[number];

// Offer statuses
export const OFFER_STATUSES = ['pending', 'accepted', 'rejected', 'in_progress', 'completed', 'cancelled'] as const;
export type OfferStatus = typeof OFFER_STATUSES[number];

// Overbooking percentage for auto-campaigns
export const OVERBOOKING_PERCENTAGE = 0.25;

// Rate limit for offers (in milliseconds)
export const OFFER_RATE_LIMIT_MS = 60 * 60 * 1000; // 1 hour

// Demographics
export const AGE_GROUPS = ['13-17', '18-24', '25-34', '35-44', '45-54', '55+'] as const;
export type AgeGroup = typeof AGE_GROUPS[number];

export const GENDERS = ['male', 'female', 'other'] as const;
export type Gender = typeof GENDERS[number];

export const GENDER_LABELS: Record<Gender, string> = {
  male: 'Мужской',
  female: 'Женский',
  other: 'Другой'
};

export const COUNTRIES = [
  'Россия',
  'Украина',
  'Беларусь',
  'Казахстан',
  'США',
  'Великобритания',
  'Германия',
  'Франция',
  'Испания',
  'Италия',
  'Польша',
  'Турция',
  'ОАЭ',
  'Другое'
] as const;
export type Country = typeof COUNTRIES[number];

export const PRODUCT_CATEGORIES = [
  'Косметика',
  'Химия для дома',
  'Электроника',
  'Одежда',
  'Информационный продукт',
  'Курсы',
  'Заведения',
  'Продукты питания',
  'Напитки',
  'Спортивные товары',
  'Детские товары',
  'Товары для дома',
  'Мебель',
  'Автомобили',
  'Недвижимость',
  'Финансовые услуги',
  'Страхование',
  'Медицинские услуги',
  'Образовательные услуги',
  'Туристические услуги',
  'Развлечения',
  'Игры и приложения',
  'Программное обеспечение',
  'Книги и издания',
  'Музыка',
  'Фильмы и сериалы',
  'Подписки и сервисы',
  'Криптовалюта',
  'Инвестиции',
  'Ювелирные изделия',
  'Часы',
  'Аксессуары',
  'Обувь',
  'Сумки',
  'Парфюмерия',
  'Средства по уходу',
  'Витамины и БАДы',
  'Спортивное питание',
  'Диетические продукты',
  'Органические продукты',
  'Веганские продукты',
  'Товары для животных',
  'Садоводство',
  'Инструменты',
  'Строительные материалы',
  'Канцелярские товары',
  'Хобби и рукоделие',
  'Музыкальные инструменты',
  'Фототехника',
  'Видеотехника',
  'Компьютеры',
  'Мобильные устройства',
  'Бытовая техника',
  'Климатическая техника',
  'Освещение',
  'Текстиль',
  'Постельное белье',
  'Посуда',
  'Кухонная утварь',
  'Другое'
];

// Audience interests
export const AUDIENCE_INTERESTS = [
  'Мода и стиль',
  'Красота и косметика',
  'Образ жизни',
  'Путешествия и туризм',
  'Еда и кулинария',
  'Фитнес и здоровье',
  'Спорт',
  'Технологии и гаджеты',
  'Игры и киберспорт',
  'Музыка и развлечения',
  'Искусство и творчество',
  'Бизнес и предпринимательство',
  'Образование и обучение',
  'Наука и исследования',
  'Автомобили и транспорт',
  'Недвижимость и дизайн интерьера',
  'Финансы и инвестиции',
  'Родительство и семья',
  'Домашние животные',
  'Книги и литература',
  'Кино и сериалы',
  'Фотография',
  'Дизайн и архитектура',
  'Политика и общество',
  'Экология и устойчивое развитие',
  'Психология и саморазвитие',
  'Медицина и здравоохранение',
  'Юмор и комедия',
  'Новости и журналистика',
  'Религия и духовность'
] as const;
export type AudienceInterest = typeof AUDIENCE_INTERESTS[number];