/*
  # Добавление триггера для автоматического обновления рейтинга
  
  1. Изменения
    - Создание функции для обновления рейтинга в influencer_cards
    - Создание триггера, который вызывается при добавлении/удалении/обновлении отзывов
    - Обновление рейтинга в user_profiles
  
  2. Безопасность
    - Функция автоматически пересчитывает средний рейтинг на основе публичных отзывов
*/

-- Функция для обновления рейтинга пользователя в influencer_cards и user_profiles
CREATE OR REPLACE FUNCTION update_user_rating()
RETURNS TRIGGER AS $$
DECLARE
  v_reviewee_id uuid;
  v_avg_rating numeric;
  v_review_count integer;
BEGIN
  -- Получаем reviewee_id из NEW или OLD
  v_reviewee_id := COALESCE(NEW.reviewee_id, OLD.reviewee_id);
  
  -- Вычисляем средний рейтинг и количество отзывов
  SELECT 
    COALESCE(AVG(rating), 0),
    COUNT(*)
  INTO v_avg_rating, v_review_count
  FROM reviews 
  WHERE reviewee_id = v_reviewee_id 
    AND is_public = true;
  
  -- Обновляем рейтинг в influencer_cards
  UPDATE influencer_cards 
  SET 
    rating = v_avg_rating,
    completed_campaigns = v_review_count,
    updated_at = now()
  WHERE user_id = v_reviewee_id;
  
  -- Обновляем рейтинг в user_profiles
  UPDATE user_profiles 
  SET updated_at = now()
  WHERE user_id = v_reviewee_id;
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Удаляем старый триггер если существует
DROP TRIGGER IF EXISTS trigger_update_rating_on_review ON reviews;

-- Создаем триггер для автоматического обновления рейтинга
CREATE TRIGGER trigger_update_rating_on_review
  AFTER INSERT OR UPDATE OR DELETE ON reviews
  FOR EACH ROW
  EXECUTE FUNCTION update_user_rating();

-- Обновляем существующие рейтинги
DO $$
DECLARE
  v_user record;
BEGIN
  FOR v_user IN 
    SELECT DISTINCT reviewee_id FROM reviews WHERE is_public = true
  LOOP
    UPDATE influencer_cards 
    SET 
      rating = (
        SELECT COALESCE(AVG(rating), 0) 
        FROM reviews 
        WHERE reviewee_id = v_user.reviewee_id AND is_public = true
      ),
      completed_campaigns = (
        SELECT COUNT(*) 
        FROM reviews 
        WHERE reviewee_id = v_user.reviewee_id AND is_public = true
      ),
      updated_at = now()
    WHERE user_id = v_user.reviewee_id;
  END LOOP;
END $$;
