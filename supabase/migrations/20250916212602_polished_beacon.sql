/*
  # Удаление поля "response_time" из всех таблиц

  1. Изменения
    - Удаляет поле response_time из service_details JSON в таблице influencer_cards
    - Очищает все существующие значения response_time
    - Удаляет поле averageResponseTime из аналитики

  2. Очистка данных
    - Удаляет response_time из всех существующих карточек инфлюенсеров
    - Очищает поле из метрик аналитики
*/

-- Удаляем response_time из service_details в influencer_cards
UPDATE influencer_cards 
SET service_details = service_details - 'response_time'
WHERE service_details ? 'response_time';

-- Удаляем response_time из service_details в influencer_cards (альтернативное название)
UPDATE influencer_cards 
SET service_details = service_details - 'responseTime'
WHERE service_details ? 'responseTime';

-- Очищаем averageResponseTime из метрик в card_analytics
UPDATE card_analytics 
SET metrics = metrics - 'averageResponseTime'
WHERE metrics ? 'averageResponseTime';

-- Очищаем response_time из метрик в card_analytics  
UPDATE card_analytics 
SET metrics = metrics - 'response_time'
WHERE metrics ? 'response_time';

-- Очищаем responseTime из метрик в card_analytics
UPDATE card_analytics 
SET metrics = metrics - 'responseTime'
WHERE metrics ? 'responseTime';

-- Удаляем поле из пользовательских профилей (если есть в influencer_data)
UPDATE user_profiles 
SET influencer_data = influencer_data - 'responseTime'
WHERE influencer_data ? 'responseTime';

UPDATE user_profiles 
SET influencer_data = influencer_data - 'response_time'  
WHERE influencer_data ? 'response_time';

-- Очищаем из metrics в influencer_data
UPDATE user_profiles 
SET influencer_data = jsonb_set(
  influencer_data, 
  '{metrics}', 
  (influencer_data->'metrics') - 'responseTime' - 'response_time' - 'averageResponseTime'
)
WHERE influencer_data ? 'metrics' 
AND (
  influencer_data->'metrics' ? 'responseTime' OR 
  influencer_data->'metrics' ? 'response_time' OR 
  influencer_data->'metrics' ? 'averageResponseTime'
);