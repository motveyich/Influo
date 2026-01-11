-- ====================================================================
-- Скрипт для создания тестовых офферов
-- ====================================================================
--
-- ИНСТРУКЦИЯ:
-- 1. Сначала найдите ID пользователей (influencer и advertiser)
-- 2. Замените <PLACEHOLDERS> на реальные UUID
-- 3. Выполните этот скрипт в Supabase SQL Editor
--
-- ====================================================================

-- ШАГ 1: Найти пользователей
-- Выполните эту команду чтобы получить список пользователей:
SELECT
  user_id,
  email,
  user_type,
  full_name
FROM user_profiles
WHERE is_deleted = false
ORDER BY created_at DESC
LIMIT 10;

-- Скопируйте user_id инфлюенсера и рекламодателя из результатов выше


-- ШАГ 2: Найти кампании (опционально)
-- Если хотите привязать оффер к кампании, найдите campaign_id:
SELECT
  campaign_id,
  title,
  advertiser_id,
  status
FROM campaigns
WHERE status IN ('active', 'draft')
  AND is_deleted = false
ORDER BY created_at DESC
LIMIT 5;


-- ====================================================================
-- ШАГ 3: СОЗДАНИЕ ТЕСТОВЫХ ОФФЕРОВ
-- ====================================================================

-- ВАРИАНТ 1: Оффер с кампанией (замените все <PLACEHOLDERS>)
DO $$
DECLARE
  v_influencer_id uuid := '<INFLUENCER_ID>'::uuid;  -- ЗАМЕНИТЕ!
  v_advertiser_id uuid := '<ADVERTISER_ID>'::uuid;  -- ЗАМЕНИТЕ!
  v_campaign_id uuid := '<CAMPAIGN_ID>'::uuid;      -- ЗАМЕНИТЕ или используйте NULL
BEGIN
  -- Проверка что пользователи существуют
  IF NOT EXISTS (SELECT 1 FROM user_profiles WHERE user_id = v_influencer_id) THEN
    RAISE EXCEPTION 'Influencer ID % not found', v_influencer_id;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM user_profiles WHERE user_id = v_advertiser_id) THEN
    RAISE EXCEPTION 'Advertiser ID % not found', v_advertiser_id;
  END IF;

  -- Создание оффера
  INSERT INTO offers (
    offer_id,
    influencer_id,
    advertiser_id,
    campaign_id,
    initiated_by,
    status,
    details,
    timeline,
    metadata,
    created_at,
    updated_at
  ) VALUES (
    gen_random_uuid(),
    v_influencer_id,
    v_advertiser_id,
    v_campaign_id,  -- Или NULL если нет кампании
    v_advertiser_id,  -- Рекламодатель инициировал
    'pending',
    jsonb_build_object(
      'title', 'Предложение о сотрудничестве',
      'description', 'Приглашаем к сотрудничеству для продвижения нашего продукта',
      'proposedRate', 50000,
      'currency', 'RUB',
      'deliverables', jsonb_build_array(
        'Пост в Instagram',
        'Stories (3 штуки)',
        'Reels видео'
      )
    ),
    jsonb_build_object(
      'deadline', (now() + interval '30 days')::text,
      'startDate', now()::text,
      'duration', '2 недели'
    ),
    jsonb_build_object(
      'viewCount', 0
    ),
    now(),
    now()
  );

  RAISE NOTICE 'Оффер успешно создан!';
END $$;


-- ====================================================================
-- ВАРИАНТ 2: Простой скрипт без проверок (для быстрого теста)
-- ====================================================================
-- Раскомментируйте и замените PLACEHOLDERS:

/*
INSERT INTO offers (
  offer_id,
  influencer_id,
  advertiser_id,
  campaign_id,
  initiated_by,
  status,
  details,
  timeline,
  created_at,
  updated_at
) VALUES
-- Оффер 1: Pending
(
  gen_random_uuid(),
  '<INFLUENCER_ID>'::uuid,
  '<ADVERTISER_ID>'::uuid,
  NULL,  -- Без кампании
  '<ADVERTISER_ID>'::uuid,
  'pending',
  '{"title": "Предложение 1", "description": "Описание предложения", "proposedRate": 30000, "currency": "RUB", "deliverables": ["Пост", "Stories"]}'::jsonb,
  '{"deadline": "2025-02-15"}'::jsonb,
  now(),
  now()
),
-- Оффер 2: Accepted
(
  gen_random_uuid(),
  '<INFLUENCER_ID>'::uuid,
  '<ADVERTISER_ID>'::uuid,
  NULL,
  '<ADVERTISER_ID>'::uuid,
  'accepted',
  '{"title": "Предложение 2", "description": "Уже принятое предложение", "proposedRate": 45000, "currency": "RUB", "deliverables": ["Reels", "Интеграция"]}'::jsonb,
  '{"deadline": "2025-02-20", "startDate": "2025-01-10"}'::jsonb,
  now() - interval '5 days',
  now()
),
-- Оффер 3: In Progress
(
  gen_random_uuid(),
  '<INFLUENCER_ID>'::uuid,
  '<ADVERTISER_ID>'::uuid,
  NULL,
  '<ADVERTISER_ID>'::uuid,
  'in_progress',
  '{"title": "Предложение 3", "description": "Работа в процессе", "proposedRate": 60000, "currency": "RUB", "deliverables": ["Полный обзор", "Stories", "Reels"]}'::jsonb,
  '{"deadline": "2025-02-25", "startDate": "2025-01-05"}'::jsonb,
  now() - interval '10 days',
  now()
);
*/


-- ====================================================================
-- ПРОВЕРКА: Посмотреть созданные офферы
-- ====================================================================
SELECT
  o.offer_id,
  o.status,
  o.initiated_by,
  inf.email as influencer_email,
  adv.email as advertiser_email,
  o.details->>'title' as title,
  o.details->>'proposedRate' as rate,
  o.created_at
FROM offers o
LEFT JOIN user_profiles inf ON inf.user_id = o.influencer_id
LEFT JOIN user_profiles adv ON adv.user_id = o.advertiser_id
ORDER BY o.created_at DESC
LIMIT 10;


-- ====================================================================
-- ОЧИСТКА: Удалить тестовые офферы (если нужно)
-- ====================================================================
-- ОСТОРОЖНО: Это удалит ВСЕ офферы!
-- Раскомментируйте только если уверены:

-- DELETE FROM offers WHERE created_at > now() - interval '1 hour';
