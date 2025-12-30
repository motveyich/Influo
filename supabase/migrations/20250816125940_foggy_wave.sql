/*
  # Добавление колонки metadata в таблицу applications

  1. Изменения
    - Добавить колонку `metadata` типа jsonb с значением по умолчанию '{}'
    - Колонка позволит хранить дополнительные данные для заявок

  2. Безопасность
    - Изменение не влияет на существующие RLS политики
    - Колонка доступна согласно существующим правилам доступа
*/

-- Добавление колонки metadata в таблицу applications
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'applications' AND column_name = 'metadata'
  ) THEN
    ALTER TABLE applications ADD COLUMN metadata jsonb DEFAULT '{}'::jsonb;
  END IF;
END $$;