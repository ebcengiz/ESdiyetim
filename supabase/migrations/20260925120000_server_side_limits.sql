-- Sunucu tarafı kullanım sınırları
--
-- 1. ai_usage + ai_usage_consume(): ai-proxy Edge Function'ının kullanıcı/gün/tür
--    bazlı tavanı. Yalnızca service_role erişir (istemci göremez, değiştiremez).
-- 2. user_credits koruması: istemcinin fotoğraf sayacını aynı gün içinde düşürmesini
--    (sıfırlayarak sınırsız hak kazanmasını) engelleyen tetikleyici + atomik
--    increment_photo_credit() RPC'si.
--    GERİYE UYUMLU: yayındaki 1.4.x istemcileri hâlâ doğrudan UPDATE ile +1 yazıyor ve
--    yeni günde {0, bugün} ile sıfırlıyor — ikisi de tetikleyiciden geçer.
-- 3. delete_own_account(): food_logs + user_credits da siliniyor (eksikti).
--
-- "Gün" her yerde Türkiye takvim günü (Europe/Istanbul); istemci de yerel günü kullanır.

CREATE OR REPLACE FUNCTION public.tr_today()
RETURNS DATE
LANGUAGE sql
STABLE
AS $$ SELECT (now() AT TIME ZONE 'Europe/Istanbul')::date $$;

-- ─── 1. AI kullanım sayacı ──────────────────────────────────────────────────
-- subject: 'user:<uuid>' ya da misafir için 'ip:<sha256>' (ham IP saklanmaz)
CREATE TABLE IF NOT EXISTS public.ai_usage (
  subject    TEXT        NOT NULL,
  day        DATE        NOT NULL,
  kind       TEXT        NOT NULL,
  count      INTEGER     NOT NULL DEFAULT 0 CHECK (count >= 0),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (subject, day, kind)
);

-- RLS açık ve hiç policy yok → anon/authenticated erişemez; yalnızca service_role.
ALTER TABLE public.ai_usage ENABLE ROW LEVEL SECURITY;

/**
 * Atomik tüketim. p_delta > 0: tavan aşılmıyorsa sayacı artırıp yeni değeri döner,
 * aşılıyorsa -1 döner (sayaç değişmez). p_delta < 0: iade (sağlayıcı hatası), 0'ın
 * altına inmez.
 */
CREATE OR REPLACE FUNCTION public.ai_usage_consume(
  p_subject TEXT,
  p_kind    TEXT,
  p_cap     INTEGER,
  p_delta   INTEGER DEFAULT 1
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_day   DATE := public.tr_today();
  v_count INTEGER;
BEGIN
  IF p_delta < 0 THEN
    UPDATE public.ai_usage
       SET count = GREATEST(count + p_delta, 0), updated_at = now()
     WHERE subject = p_subject AND day = v_day AND kind = p_kind
    RETURNING count INTO v_count;
    RETURN COALESCE(v_count, 0);
  END IF;

  INSERT INTO public.ai_usage (subject, day, kind, count)
  VALUES (p_subject, v_day, p_kind, 0)
  ON CONFLICT (subject, day, kind) DO NOTHING;

  UPDATE public.ai_usage
     SET count = count + p_delta, updated_at = now()
   WHERE subject = p_subject AND day = v_day AND kind = p_kind
     AND count + p_delta <= p_cap
  RETURNING count INTO v_count;

  RETURN COALESCE(v_count, -1);
END;
$$;

REVOKE ALL ON FUNCTION public.ai_usage_consume(TEXT, TEXT, INTEGER, INTEGER) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.ai_usage_consume(TEXT, TEXT, INTEGER, INTEGER) TO service_role;

-- ─── 2. user_credits koruması ───────────────────────────────────────────────
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'user_credits_daily_photo_used_nonneg'
  ) THEN
    ALTER TABLE public.user_credits
      ADD CONSTRAINT user_credits_daily_photo_used_nonneg CHECK (daily_photo_used >= 0);
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.user_credits_guard()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  -- Kısıt yalnızca istemci API rollerine: service_role (Edge Function) ve postgres
  -- (Dashboard SQL Editor, SECURITY DEFINER fonksiyonlar) yönetici düzeltmesi yapabilir.
  IF current_user NOT IN ('authenticated', 'anon') THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'INSERT' THEN
    -- İlk kayıt her zaman sıfırdan başlar; gün sunucu tarafından belirlenir.
    NEW.daily_photo_used := 0;
    NEW.last_reset_date  := public.tr_today();
    RETURN NEW;
  END IF;

  -- Gelecek tarihe sıfırlama yok (yarının hakkını bugünden açma).
  IF NEW.last_reset_date > public.tr_today() THEN
    RAISE EXCEPTION 'user_credits: last_reset_date gelecekte olamaz' USING ERRCODE = '42501';
  END IF;

  IF NEW.last_reset_date < OLD.last_reset_date THEN
    RAISE EXCEPTION 'user_credits: last_reset_date geri alınamaz' USING ERRCODE = '42501';
  END IF;

  -- Aynı gün içinde sayaç yalnızca artabilir. Yeni güne geçişte (tarih ileri) sıfırlama serbest.
  IF NEW.last_reset_date = OLD.last_reset_date
     AND NEW.daily_photo_used < OLD.daily_photo_used THEN
    RAISE EXCEPTION 'user_credits: sayaç aynı gün içinde düşürülemez' USING ERRCODE = '42501';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_user_credits_guard ON public.user_credits;
CREATE TRIGGER trg_user_credits_guard
  BEFORE INSERT OR UPDATE ON public.user_credits
  FOR EACH ROW EXECUTE FUNCTION public.user_credits_guard();

/**
 * Atomik +1 (1.4.2+ istemci). Gün değiştiyse önce sıfırlar. Yeni sayacı döner.
 * Tavan istemcide (ücretsiz/Premium ayrımı StoreKit'te); mutlak tavan ai-proxy'de.
 */
CREATE OR REPLACE FUNCTION public.increment_photo_credit()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  uid     UUID := auth.uid();
  v_today DATE := public.tr_today();
  v_count INTEGER;
BEGIN
  IF uid IS NULL THEN
    RAISE EXCEPTION 'not_authenticated' USING ERRCODE = '42501';
  END IF;

  INSERT INTO public.user_credits (user_id) VALUES (uid)
  ON CONFLICT (user_id) DO NOTHING;

  UPDATE public.user_credits
     SET daily_photo_used = CASE WHEN last_reset_date < v_today THEN 1
                                 ELSE LEAST(daily_photo_used + 1, 99) END,
         last_reset_date  = v_today
   WHERE user_id = uid
  RETURNING daily_photo_used INTO v_count;

  RETURN v_count;
END;
$$;

REVOKE ALL ON FUNCTION public.increment_photo_credit() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.increment_photo_credit() TO authenticated;

-- ─── 3. Hesap silme: eksik tablolar ─────────────────────────────────────────
-- (supabase/sql/delete_own_account.sql ile aynı içerik)
CREATE OR REPLACE FUNCTION public.delete_own_account()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid;
  t   text;
BEGIN
  uid := auth.uid();
  IF uid IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;

  -- Önce kullanıcıya bağlı satırlar (FK NO ACTION / RESTRICT olabilir).
  -- to_regclass: tablo bu projede yoksa atla (eski kurulumlar).
  FOREACH t IN ARRAY ARRAY['diet_plans', 'weight_records', 'body_info', 'goals', 'food_logs', 'user_credits'] LOOP
    IF to_regclass('public.' || t) IS NOT NULL THEN
      EXECUTE format('DELETE FROM public.%I WHERE user_id = $1', t) USING uid;
    END IF;
  END LOOP;

  IF to_regclass('public.ai_usage') IS NOT NULL THEN
    DELETE FROM public.ai_usage WHERE subject = 'user:' || uid::text;
  END IF;

  -- Son olarak auth hesabı
  DELETE FROM auth.users WHERE id = uid;
END;
$$;

REVOKE ALL ON FUNCTION public.delete_own_account() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.delete_own_account() TO authenticated;
