/*
  # Добавление полей метрик в профили пользователей

  ## Изменения

  1. Добавляем поля для хранения метрик:
    - `completed_deals_count` - количество завершённых сделок (completed + terminated)
    - `total_reviews_count` - количество отзывов
    - `average_rating` - средний рейтинг

  2. Создаём функции для автоматического пересчёта метрик:
    - Функция пересчёта завершённых сделок
    - Функция пересчёта отзывов и рейтинга

  3. Создаём триггеры для автоматического обновления метрик:
    - При изменении статуса предложения
    - При добавлении/изменении/удалении отзыва

  4. Инициализируем данные для существующих пользователей
*/

-- Добавляем поля метрик в таблицу user_profiles
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_profiles' AND column_name = 'completed_deals_count'
  ) THEN
    ALTER TABLE user_profiles
    ADD COLUMN completed_deals_count integer DEFAULT 0 NOT NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_profiles' AND column_name = 'total_reviews_count'
  ) THEN
    ALTER TABLE user_profiles
    ADD COLUMN total_reviews_count integer DEFAULT 0 NOT NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_profiles' AND column_name = 'average_rating'
  ) THEN
    ALTER TABLE user_profiles
    ADD COLUMN average_rating decimal(3,2) DEFAULT 0.0 NOT NULL CHECK (average_rating >= 0 AND average_rating <= 5);
  END IF;
END $$;

-- Функция для пересчёта завершённых сделок пользователя
CREATE OR REPLACE FUNCTION update_user_completed_deals(user_uuid uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  deals_count integer;
BEGIN
  -- Считаем предложения со статусами completed и terminated
  SELECT COUNT(*)
  INTO deals_count
  FROM offers
  WHERE (influencer_id = user_uuid OR advertiser_id = user_uuid)
    AND status IN ('completed', 'terminated');

  -- Обновляем счётчик
  UPDATE user_profiles
  SET completed_deals_count = deals_count
  WHERE user_id = user_uuid;
END;
$$;

-- Функция для пересчёта отзывов и рейтинга пользователя
CREATE OR REPLACE FUNCTION update_user_reviews_rating(user_uuid uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  reviews_count integer;
  avg_rating decimal(3,2);
BEGIN
  -- Считаем публичные отзывы и средний рейтинг
  SELECT
    COUNT(*),
    COALESCE(AVG(rating), 0)
  INTO reviews_count, avg_rating
  FROM reviews
  WHERE reviewee_id = user_uuid
    AND is_public = true;

  -- Обновляем данные
  UPDATE user_profiles
  SET
    total_reviews_count = reviews_count,
    average_rating = ROUND(avg_rating, 2)
  WHERE user_id = user_uuid;
END;
$$;

-- Триггер для обновления завершённых сделок при изменении статуса предложения
CREATE OR REPLACE FUNCTION trigger_update_deals_count()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Обновляем для инфлюенсера
  IF NEW.influencer_id IS NOT NULL THEN
    PERFORM update_user_completed_deals(NEW.influencer_id);
  END IF;

  -- Обновляем для рекламодателя
  IF NEW.advertiser_id IS NOT NULL THEN
    PERFORM update_user_completed_deals(NEW.advertiser_id);
  END IF;

  -- Если статус изменился с completed/terminated на другой, обновляем старые данные
  IF TG_OP = 'UPDATE' AND OLD.status IN ('completed', 'terminated')
     AND NEW.status NOT IN ('completed', 'terminated') THEN
    IF OLD.influencer_id IS NOT NULL THEN
      PERFORM update_user_completed_deals(OLD.influencer_id);
    END IF;
    IF OLD.advertiser_id IS NOT NULL THEN
      PERFORM update_user_completed_deals(OLD.advertiser_id);
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

-- Удаляем старый триггер если существует
DROP TRIGGER IF EXISTS update_deals_count_trigger ON offers;

-- Создаём триггер на изменение предложений
CREATE TRIGGER update_deals_count_trigger
AFTER INSERT OR UPDATE OF status ON offers
FOR EACH ROW
WHEN (NEW.status IN ('completed', 'terminated'))
EXECUTE FUNCTION trigger_update_deals_count();

-- Триггер для обновления отзывов и рейтинга
CREATE OR REPLACE FUNCTION trigger_update_reviews_rating()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    PERFORM update_user_reviews_rating(OLD.reviewee_id);
    RETURN OLD;
  ELSE
    PERFORM update_user_reviews_rating(NEW.reviewee_id);
    RETURN NEW;
  END IF;
END;
$$;

-- Удаляем старый триггер если существует
DROP TRIGGER IF EXISTS update_reviews_rating_trigger ON reviews;

-- Создаём триггер на изменение отзывов
CREATE TRIGGER update_reviews_rating_trigger
AFTER INSERT OR UPDATE OR DELETE ON reviews
FOR EACH ROW
EXECUTE FUNCTION trigger_update_reviews_rating();

-- Инициализируем данные для всех существующих пользователей
DO $$
DECLARE
  user_record RECORD;
BEGIN
  FOR user_record IN SELECT user_id FROM user_profiles
  LOOP
    PERFORM update_user_completed_deals(user_record.user_id);
    PERFORM update_user_reviews_rating(user_record.user_id);
  END LOOP;
END $$;
