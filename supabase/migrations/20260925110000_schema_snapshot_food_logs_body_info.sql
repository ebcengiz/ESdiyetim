-- Şema anlık görüntüsü: food_logs + body_info
--
-- Bu iki tablo canlı veritabanında dashboard'dan elle oluşturulmuştu; repodaki SQL'de
-- CREATE ifadeleri yoktu (yeni bir Supabase projesi repodan kurulamıyordu).
-- Kolonlar/varsayılanlar 2026-09-25'te canlı veritabanından (information_schema) okundu.
--
-- Canlı veritabanında tablolar zaten var → CREATE TABLE IF NOT EXISTS no-op olur,
-- policy'ler de yalnızca yoksa eklenir. Yani bu dosya canlıda güvenle çalıştırılabilir.

-- ─── food_logs: öğün bazlı besin günlüğü ────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.food_logs (
  id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date           DATE        NOT NULL DEFAULT CURRENT_DATE,
  meal_type      TEXT        NOT NULL,
  food_name      TEXT        NOT NULL,
  amount_grams   NUMERIC     DEFAULT 100,
  calories       NUMERIC,
  protein        NUMERIC,
  carbs          NUMERIC,
  fat            NUMERIC,
  fiber          NUMERIC,
  sugar          NUMERIC,
  sodium         NUMERIC,
  nutrition_data JSONB,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS food_logs_user_date_idx ON public.food_logs (user_id, date);

ALTER TABLE public.food_logs ENABLE ROW LEVEL SECURITY;

-- ─── body_info: boy / kilo / yaş / cinsiyet (VKİ paneli) ────────────────────
CREATE TABLE IF NOT EXISTS public.body_info (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  height     NUMERIC,
  weight     NUMERIC,
  age        INTEGER,
  gender         TEXT,
  activity_level TEXT,
  created_at TIMESTAMPTZ DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ DEFAULT timezone('utc', now())
);

CREATE INDEX IF NOT EXISTS body_info_user_id_idx ON public.body_info (user_id);

ALTER TABLE public.body_info ENABLE ROW LEVEL SECURITY;

-- ─── RLS policy'leri (yalnızca yoksa) ───────────────────────────────────────
-- Postgres'te CREATE POLICY IF NOT EXISTS yok; pg_policies kontrolüyle ekleniyor.
DO $$
DECLARE
  t   TEXT;
  op  TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY['food_logs', 'body_info'] LOOP
    FOREACH op IN ARRAY ARRAY['SELECT', 'INSERT', 'UPDATE', 'DELETE'] LOOP
      IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public' AND tablename = t AND cmd IN (op, 'ALL')
      ) THEN
        IF op = 'INSERT' THEN
          EXECUTE format(
            'CREATE POLICY %I ON public.%I FOR INSERT WITH CHECK (auth.uid() = user_id)',
            'own_' || t || '_insert', t);
        ELSIF op = 'UPDATE' THEN
          EXECUTE format(
            'CREATE POLICY %I ON public.%I FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id)',
            'own_' || t || '_update', t);
        ELSE
          EXECUTE format(
            'CREATE POLICY %I ON public.%I FOR %s USING (auth.uid() = user_id)',
            'own_' || t || '_' || lower(op), t, op);
        END IF;
      END IF;
    END LOOP;
  END LOOP;
END;
$$;
