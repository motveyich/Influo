/*
  # Комплексное исправление системы администрирования

  1. Политики безопасности
    - Полное удаление всех существующих политик UPDATE для user_profiles
    - Создание новых политик с правильной логикой для администраторов
    - Добавление политик для сервисной роли

  2. Функции проверки ролей
    - Создание функции для проверки роли администратора
    - Оптимизация запросов проверки прав

  3. Индексы для производительности
    - Добавление индексов для быстрой проверки ролей
    - Оптимизация запросов администраторов
*/

-- Удаляем все существующие политики UPDATE для user_profiles
DROP POLICY IF EXISTS "Users can update own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can update own data" ON user_profiles;
DROP POLICY IF EXISTS "Admins can update users" ON user_profiles;
DROP POLICY IF EXISTS "Admins can manage users" ON user_profiles;
DROP POLICY IF EXISTS "Moderators can manage users" ON user_profiles;

-- Создаем функцию для проверки роли администратора
CREATE OR REPLACE FUNCTION is_admin_or_moderator(user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Проверяем роль в user_profiles
  RETURN EXISTS (
    SELECT 1 FROM user_profiles 
    WHERE user_profiles.user_id = $1 
    AND user_profiles.role IN ('admin', 'moderator')
    AND user_profiles.is_deleted = false
  );
END;
$$;

-- Создаем функцию для проверки, является ли пользователь администратором
CREATE OR REPLACE FUNCTION is_admin(user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM user_profiles 
    WHERE user_profiles.user_id = $1 
    AND user_profiles.role = 'admin'
    AND user_profiles.is_deleted = false
  );
END;
$$;

-- Политика для обычных пользователей - могут обновлять только свои данные (исключая поля блокировки)
CREATE POLICY "Users can update own profile data"
ON user_profiles
FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (
  user_id = auth.uid() 
  AND is_deleted = OLD.is_deleted 
  AND deleted_at IS NOT DISTINCT FROM OLD.deleted_at 
  AND deleted_by IS NOT DISTINCT FROM OLD.deleted_by
);

-- Политика для администраторов - могут обновлять любые данные любых пользователей
CREATE POLICY "Admins can update any user"
ON user_profiles
FOR UPDATE
TO authenticated
USING (is_admin_or_moderator(auth.uid()))
WITH CHECK (is_admin_or_moderator(auth.uid()));

-- Политика для сервисной роли - полный доступ
CREATE POLICY "Service role can update users"
ON user_profiles
FOR UPDATE
TO service_role
USING (true)
WITH CHECK (true);

-- Политика для администраторов на DELETE (если понадобится)
CREATE POLICY "Admins can delete users"
ON user_profiles
FOR DELETE
TO authenticated
USING (is_admin_or_moderator(auth.uid()));

-- Политика для сервисной роли на DELETE
CREATE POLICY "Service role can delete users"
ON user_profiles
FOR DELETE
TO service_role
USING (true);

-- Добавляем индексы для быстрой проверки ролей
CREATE INDEX IF NOT EXISTS idx_user_profiles_role_active 
ON user_profiles (role, is_deleted) 
WHERE is_deleted = false;

-- Обновляем функцию обновления времени, чтобы она работала с новыми политиками
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Убеждаемся, что триггер существует
DROP TRIGGER IF EXISTS update_user_profiles_updated_at ON user_profiles;
CREATE TRIGGER update_user_profiles_updated_at
    BEFORE UPDATE ON user_profiles
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Проверяем, что RLS включен
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;