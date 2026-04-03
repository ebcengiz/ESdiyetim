-- Hesap silme (Apple 5.1.1(v)) — Edge Function olmadan uygulama supabase.rpc('delete_own_account') çağırır.
-- Supabase Dashboard → SQL Editor → Tüm dosyayı yapıştır → Run.
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
BEGIN
  uid := auth.uid();
  IF uid IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;

  -- Önce kullanıcıya bağlı satırlar (FK genelde NO ACTION / RESTRICT ise zorunlu)
  DELETE FROM public.diet_plans WHERE user_id = uid;
  DELETE FROM public.weight_records WHERE user_id = uid;
  DELETE FROM public.body_info WHERE user_id = uid;
  DELETE FROM public.goals WHERE user_id = uid;

  -- Son olarak auth hesabı
  DELETE FROM auth.users WHERE id = uid;
END;
$$;

REVOKE ALL ON FUNCTION public.delete_own_account() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.delete_own_account() TO authenticated;
