/*
  # Добавление доступа администраторов к offers и chat_messages
  
  1. Изменения
    - Добавляются политики для администраторов для просмотра всех offers
    - Добавляются политики для администраторов для просмотра всех chat_messages
    - Это необходимо для модерации и рассмотрения жалоб
    
  2. Безопасность
    - Политики применяются только к пользователям с ролью 'admin' в таблице user_profiles
    - Обычные пользователи продолжают видеть только свои данные
*/

-- Добавить политику для администраторов на чтение всех offers
CREATE POLICY "Admins can read all offers"
  ON offers
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.user_id = auth.uid()
      AND user_profiles.role = 'admin'
    )
  );

-- Добавить политику для администраторов на чтение всех chat_messages
CREATE POLICY "Admins can read all messages"
  ON chat_messages
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.user_id = auth.uid()
      AND user_profiles.role = 'admin'
    )
  );
