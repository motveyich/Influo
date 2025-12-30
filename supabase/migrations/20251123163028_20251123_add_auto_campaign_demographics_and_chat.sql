/*
  # Добавление демографии, категорий и чата в автокомпании

  ## Описание
  Добавляем дополнительные фильтры и возможность чата для автокомпаний.

  ## Изменения

  ### Новые поля в auto_campaigns:
  - target_age_groups (text[]) - целевые возрастные группы
  - target_genders (text[]) - целевые гендеры
  - target_countries (text[]) - целевые страны
  - product_categories (text[]) - категории товаров
  - enable_chat (boolean) - разрешить обращение в чат через предложения

  ### Новое поле в offers:
  - enable_chat (boolean) - разрешить чат для этого предложения
*/

-- Добавляем поля демографии в auto_campaigns
ALTER TABLE auto_campaigns ADD COLUMN IF NOT EXISTS target_age_groups text[] DEFAULT '{}';
ALTER TABLE auto_campaigns ADD COLUMN IF NOT EXISTS target_genders text[] DEFAULT '{}';
ALTER TABLE auto_campaigns ADD COLUMN IF NOT EXISTS target_countries text[] DEFAULT '{}';
ALTER TABLE auto_campaigns ADD COLUMN IF NOT EXISTS product_categories text[] DEFAULT '{}';
ALTER TABLE auto_campaigns ADD COLUMN IF NOT EXISTS enable_chat boolean DEFAULT true;

-- Добавляем поле enable_chat в offers
ALTER TABLE offers ADD COLUMN IF NOT EXISTS enable_chat boolean DEFAULT false;

-- Комментарии
COMMENT ON COLUMN auto_campaigns.target_age_groups IS 'Целевые возрастные группы аудитории';
COMMENT ON COLUMN auto_campaigns.target_genders IS 'Целевые гендеры аудитории';
COMMENT ON COLUMN auto_campaigns.target_countries IS 'Целевые страны аудитории';
COMMENT ON COLUMN auto_campaigns.product_categories IS 'Категории рекламируемых товаров';
COMMENT ON COLUMN auto_campaigns.enable_chat IS 'Разрешить инфлюенсерам обращаться в чат через детали предложения';
COMMENT ON COLUMN offers.enable_chat IS 'Разрешён ли чат для этого предложения (автокомпании)';
