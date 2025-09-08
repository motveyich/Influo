/*
  # Исправление RLS политик для администраторов

  1. Проблема
    - Текущие RLS политики блокируют обновление полей блокировки пользователей
    - Администраторы не могут изменять is_deleted, deleted_at, deleted_by

  2. Решение
    - Удаляем ограничительные политики UPDATE
    - Создаем отдельные политики для обычных пользователей и администраторов
    - Разрешаем администраторам полный доступ к управлению пользователями

  3. Безопасность
    - Обычные пользователи могут обновлять только свои данные (кроме полей блокировки)
    - Администраторы и модераторы могут управлять любыми пользователями
    - Сервисная роль имеет полный доступ
*/

-- Удаляем существующую ограничительную политику UPDATE
DROP POLICY IF EXISTS "Users can update own profile" ON user_profiles;

-- Создаем политику для обычных пользователей (исключаем поля блокировки)
CREATE POLICY "Users can update own profile data"
ON user_profiles
FOR UPDATE
TO authenticated
USING (auth.uid()::text = user_id::text)
WITH CHECK (
  auth.uid()::text = user_id::text AND
  -- Запрещаем обычным пользователям изменять поля блокировки
  (
    OLD.is_deleted IS NOT DISTINCT FROM NEW.is_deleted AND
    OLD.deleted_at IS NOT DISTINCT FROM NEW.deleted_at AND
    OLD.deleted_by IS NOT DISTINCT FROM NEW.deleted_by
  )
);

-- Создаем политику для администраторов и модераторов
CREATE POLICY "Admins can manage all users"
ON user_profiles
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM user_profiles admin_profile
    WHERE admin_profile.user_id = auth.uid()
    AND admin_profile.role IN ('admin', 'moderator')
    AND admin_profile.is_deleted = false
  )
);

-- Разрешаем сервисной роли полный доступ
CREATE POLICY "Service role can manage users"
ON user_profiles
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Создаем политику DELETE для администраторов (если нужно жесткое удаление)
CREATE POLICY "Admins can delete users"
ON user_profiles
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM user_profiles admin_profile
    WHERE admin_profile.user_id = auth.uid()
    AND admin_profile.role = 'admin'
    AND admin_profile.is_deleted = false
  )
);