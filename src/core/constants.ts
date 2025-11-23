// Shared constants across the application

// Platforms
export const PLATFORMS = ['Instagram', 'YouTube', 'TikTok', 'VK', 'Telegram', 'Twitter', 'Facebook'] as const;
export type Platform = typeof PLATFORMS[number];

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