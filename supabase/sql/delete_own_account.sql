-- Hesap silme (Apple 5.1.1(v)) — Edge Function olmadan uygulama supabase.rpc('delete_own_account') çağırır.
-- Supabase Dashboard → SQL Editor → Tüm dosyayı yapıştır → Run.
-- (Aynı içerik: supabase/migrations/20260925120000_server_side_limits.sql §3)
--
-- NOT: auth.users doğrudan silinirken FK CASCADE yoksa "diet_plans_user_id_fkey" hatası alırsınız.
-- Bu sürüm önce public tabloları temizler, sonra auth kullanıcısını siler.

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
