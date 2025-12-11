/*
  # Исправление foreign key для таблицы reviews
  
  1. Изменения
    - Удаление старого constraint reviews_deal_id_fkey
    - Очистка недействительных записей в reviews
    - Создание нового constraint, ссылающегося на offers(offer_id)
  
  2. Безопасность
    - Constraint обеспечивает целостность данных между отзывами и предложениями
*/

-- Удалить старый constraint если существует
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'reviews_deal_id_fkey' 
    AND table_name = 'reviews'
  ) THEN
    ALTER TABLE reviews DROP CONSTRAINT reviews_deal_id_fkey;
  END IF;
END $$;

-- Удалить записи reviews, которые ссылаются на несуществующие offers
DELETE FROM reviews 
WHERE deal_id NOT IN (SELECT offer_id FROM offers);

-- Создать новый constraint, ссылающийся на offers(offer_id)
ALTER TABLE reviews 
ADD CONSTRAINT reviews_deal_id_fkey 
FOREIGN KEY (deal_id) 
REFERENCES offers(offer_id) 
ON DELETE CASCADE;