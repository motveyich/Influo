/*
  # Добавление полей для деталей интеграции в предложения
  
  1. Изменения
    - Добавление полей для хранения информации об интеграции:
      - niche (ниша)
      - product_description (описание продукта)
      - integration_format (формат интеграции)
      - integration_parameters (параметры интеграции)
    
  2. Примечания
    - Поля добавляются в jsonb колонку details для гибкости
    - Можно редактировать только инициатору предложения
*/

-- Обновляем существующие записи, добавляя структуру для integration_details если её нет
UPDATE offers 
SET details = COALESCE(details, '{}'::jsonb) || 
  jsonb_build_object(
    'integration_details', jsonb_build_object(
      'niche', NULL,
      'product_description', NULL,
      'integration_format', NULL,
      'integration_parameters', NULL
    )
  )
WHERE details IS NULL OR NOT (details ? 'integration_details');
