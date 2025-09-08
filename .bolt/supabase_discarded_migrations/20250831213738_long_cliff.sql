/*
  # Комплексное исправление системы блокировки пользователей

  1. Проблемы
    - RLS политики блокируют обновления администраторами
    - Неправильная логика проверки ролей в политиках
    - Отсутствие правильных функций для проверки прав
    - Конфликтующие политики UPDATE

  2. Решения
    - Создание правильных функций проверки ролей
    - Удаление всех конфликтующих политик
    - Создание новых политик с правильной логикой
    - Добавление политик для сервисной роли
    - Защита от самоблокировки

  3. Безопасность
    - Администраторы могут блокировать любых пользователей (кроме себя)
    - Модераторы могут блокировать обычных пользователей
    - Обычные пользователи могут обновлять только свои профили
    - Сервисная роль имеет полный доступ
*/

-- Удаляем все существующие политики UPDATE для user_profiles
DROP POLICY IF EXISTS "Users can update own profile" ON public.user_profiles;
DROP POLICY IF EXISTS "Users can update own data" ON public.user_profiles;
DROP POLICY IF EXISTS "Admins can update users" ON public.user_profiles;
DROP POLICY IF EXISTS "Admins and moderators can update users" ON public.user_profiles;
DROP POLICY IF EXISTS "Admins and moderators can block users" ON public.user_profiles;

-- Создаем функцию для проверки, является ли пользователь администратором
CREATE OR REPLACE FUNCTION public.is_admin(user_id uuid DEFAULT auth.uid())
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_profiles 
    WHERE user_profiles.user_id = $1 
    AND user_profiles.role = 'admin'
    AND user_profiles.is_deleted = false
  );
$$;

-- Создаем функцию для проверки, является ли пользователь администратором или модератором
CREATE OR REPLACE FUNCTION public.is_admin_or_moderator(user_id uuid DEFAULT auth.uid())
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_profiles 
    WHERE user_profiles.user_id = $1 
    AND user_profiles.role IN ('admin', 'moderator')
    AND user_profiles.is_deleted = false
  );
$$;

-- Политика для обычных пользователей - могут обновлять только свой профиль (исключая поля блокировки)
CREATE POLICY "Users can update own profile data"
ON public.user_profiles FOR UPDATE
TO authenticated
USING (
  auth.uid() = user_id 
  AND NOT public.is_admin_or_moderator(auth.uid())
)
WITH CHECK (
  auth.uid() = user_id 
  AND NOT public.is_admin_or_moderator(auth.uid())
  -- Обычные пользователи не могут изменять поля блокировки
  AND (
    (OLD.is_deleted IS NOT DISTINCT FROM NEW.is_deleted)
    AND (OLD.deleted_at IS NOT DISTINCT FROM NEW.deleted_at)
    AND (OLD.deleted_by IS NOT DISTINCT FROM NEW.deleted_by)
    AND (OLD.role IS NOT DISTINCT FROM NEW.role)
  )
);

-- Политика для администраторов - могут обновлять любых пользователей (кроме самоблокировки)
CREATE POLICY "Admins can update any user"
ON public.user_profiles FOR UPDATE
TO authenticated
USING (
  public.is_admin(auth.uid())
  AND (
    auth.uid() != user_id  -- Защита от самоблокировки
    OR (
      auth.uid() = user_id 
      AND (OLD.is_deleted IS NOT DISTINCT FROM NEW.is_deleted)  -- Не может изменить свой статус блокировки
    )
  )
)
WITH CHECK (
  public.is_admin(auth.uid())
  AND (
    auth.uid() != user_id  -- Защита от самоблокировки
    OR (
      auth.uid() = user_id 
      AND (OLD.is_deleted IS NOT DISTINCT FROM NEW.is_deleted)  -- Не может изменить свой статус блокировки
    )
  )
);

-- Политика для модераторов - могут блокировать обычных пользователей
CREATE POLICY "Moderators can block regular users"
ON public.user_profiles FOR UPDATE
TO authenticated
USING (
  public.is_admin_or_moderator(auth.uid())
  AND auth.uid() != user_id  -- Защита от самоблокировки
  AND NOT public.is_admin_or_moderator(user_id)  -- Не могут блокировать других админов/модераторов
)
WITH CHECK (
  public.is_admin_or_moderator(auth.uid())
  AND auth.uid() != user_id  -- Защита от самоблокировки
  AND NOT public.is_admin_or_moderator(user_id)  -- Не могут блокировать других админов/модераторов
);

-- Политика для сервисной роли - полный доступ
CREATE POLICY "Service role has full access"
ON public.user_profiles FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Создаем индексы для улучшения производительности проверки ролей
CREATE INDEX IF NOT EXISTS idx_user_profiles_role_active 
ON public.user_profiles (role, is_deleted) 
WHERE is_deleted = false;

CREATE INDEX IF NOT EXISTS idx_user_profiles_user_id_role 
ON public.user_profiles (user_id, role) 
WHERE is_deleted = false;

-- Обновляем статистику для оптимизатора
ANALYZE public.user_profiles;