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

// Influencer niches (основные ниши инфлюенсеров)
export const INFLUENCER_NICHES = [
  'Мода и стиль',
  'Красота и косметика',
  'Фитнес и здоровье',
  'Спорт',
  'Бизнес и финансы',
  'Технологии и гаджеты',
  'Путешествия',
  'Лайфстайл',
  'Игры и киберспорт',
  'Кулинария и еда',
  'Родительство и семья',
  'Образование',
  'Мотивация и саморазвитие',
  'Искусство и творчество',
  'Музыка',
  'Кино и сериалы',
  'Книги и литература',
  'Автомобили',
  'Недвижимость',
  'Дизайн интерьера',
  'Фотография',
  'Видеопродакшн',
  'Юмор и развлечения',
  'Домашние животные',
  'Наука',
  'Медицина',
  'Психология',
  'Экология',
  'Политика',
  'Новости',
  'Обзоры товаров',
  'DIY и хендмейд',
  'Садоводство',
  'Астрология',
  'Эзотерика'
] as const;
export type InfluencerNiche = typeof INFLUENCER_NICHES[number];

// Content languages
export const CONTENT_LANGUAGES = [
  'Русский',
  'Английский',
  'Украинский',
  'Казахский',
  'Белорусский',
  'Узбекский',
  'Татарский',
  'Азербайджанский',
  'Армянский',
  'Грузинский',
  'Немецкий',
  'Французский',
  'Испанский',
  'Итальянский',
  'Португальский',
  'Китайский',
  'Японский',
  'Корейский',
  'Арабский',
  'Турецкий',
  'Польский',
  'Чешский'
] as const;
export type ContentLanguage = typeof CONTENT_LANGUAGES[number];

// Brand values (ценности бренда)
export const BRAND_VALUES = [
  'Экологичность',
  'Премиум',
  'Массовый рынок',
  'Стартап',
  'Инновации',
  'Традиции',
  'Доступность',
  'Эксклюзивность',
  'Качество',
  'Скорость',
  'Надежность',
  'Безопасность',
  'Дружелюбие',
  'Профессионализм',
  'Креативность',
  'Социальная ответственность',
  'Локальное производство',
  'Ручная работа',
  'Технологичность',
  'Простота',
  'Роскошь',
  'Молодежный бренд',
  'Семейные ценности',
  'Здоровье и wellness'
] as const;
export type BrandValue = typeof BRAND_VALUES[number];

// Integration types (типы интеграций)
export const INTEGRATION_TYPES = [
  'Нативная интеграция',
  'Обзор продукта',
  'UGC контент',
  'Распаковка (unboxing)',
  'Туториал',
  'Конкурс/розыгрыш',
  'Промокод',
  'Реклама в stories',
  'Реклама в постах',
  'Реклама в reels/shorts',
  'Реклама в видео',
  'Прямой эфир',
  'Амбассадорство',
  'Долгосрочное сотрудничество',
  'Событийная реклама',
  'Челлендж',
  'Интервью',
  'Коллаборация',
  'Размещение на мероприятии',
  'Отзыв и рекомендация'
] as const;
export type IntegrationType = typeof INTEGRATION_TYPES[number];

// Payment policies (политики оплаты)
export const PAYMENT_POLICIES = [
  'Оплата до публикации',
  'Оплата после публикации',
  'Через escrow-сервис',
  'Частичная предоплата (50%)',
  'Оплата по этапам',
  'Бартер (товар вместо оплаты)',
  'Бартер + частичная оплата'
] as const;
export type PaymentPolicy = typeof PAYMENT_POLICIES[number];

// Business categories (категории бизнеса рекламодателей)
export const BUSINESS_CATEGORIES = [
  'E-commerce',
  'Косметика и красота',
  'Мода и одежда',
  'Продукты питания',
  'Рестораны и кафе',
  'Технологии и IT',
  'Финансовые услуги',
  'Образование',
  'Здоровье и медицина',
  'Фитнес и спорт',
  'Туризм и гостиницы',
  'Развлечения',
  'Недвижимость',
  'Автомобили',
  'Мебель и интерьер',
  'Строительство и ремонт',
  'Бытовая техника',
  'Электроника',
  'Детские товары',
  'Товары для животных',
  'Искусство и культура',
  'Благотворительность',
  'Экология',
  'Страхование',
  'Телекоммуникации',
  'Медиа и издательства',
  'Игры и приложения',
  'Криптовалюта и blockchain',
  'Маркетинг и реклама',
  'Консалтинг',
  'Юридические услуги',
  'Логистика и доставка',
  'Услуги для бизнеса',
  'Другое'
] as const;
export type BusinessCategory = typeof BUSINESS_CATEGORIES[number];

// Audience size ranges (диапазоны размера аудитории для профиля)
export const AUDIENCE_SIZE_RANGES = [
  'Нано (до 10к)',
  'Микро (10к-50к)',
  'Средний (50к-250к)',
  'Макро (250к-1M)',
  'Мега (1M+)'
] as const;
export type AudienceSizeRange = typeof AUDIENCE_SIZE_RANGES[number];

// Age ranges for audience demographics (расширенные)
export const DETAILED_AGE_RANGES = [
  '13-17',
  '18-24',
  '25-34',
  '35-44',
  '45-54',
  '55-64',
  '65+'
] as const;
export type DetailedAgeRange = typeof DETAILED_AGE_RANGES[number];

// Predominant gender options for audience (преобладающий пол аудитории)
export const PREDOMINANT_GENDER_OPTIONS = [
  'Не указано',
  'Мужской',
  'Женский',
  'Смешанный'
] as const;
export type PredominantGender = typeof PREDOMINANT_GENDER_OPTIONS[number];