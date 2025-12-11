/*
  # Исправление constraint для статусов кампаний

  1. Изменения
    - Добавляем статус 'in_progress' в список разрешенных статусов кампаний
    - Этот статус используется автоматическими кампаниями когда набрано нужное количество инфлюенсеров
*/

-- Обновляем constraint для статусов кампаний
ALTER TABLE campaigns DROP CONSTRAINT IF EXISTS campaigns_status_check;
ALTER TABLE campaigns ADD CONSTRAINT campaigns_status_check
  CHECK (status IN ('draft', 'active', 'paused', 'completed', 'cancelled', 'in_progress'));
