-- GÜVENLİK: herkese açık RLS politikalarını kullanıcıya özel politikalarla değiştir
--
-- 2026-09-25 canlı kontrolde bulundu: diet_plans, weight_records, body_info ve goals
-- tablolarında auth öncesi döneme ait "Enable all access for <tablo>" politikaları
-- (FOR ALL, TO public, USING true) hâlâ duruyordu — supabase-auth-migration.sql'in
-- DROP POLICY adımları canlıya hiç uygulanmamış. Sonuç: uygulama paketindeki anon
-- anahtarıyla TÜM kullanıcıların kilo/diyet/vücut/hedef verisi okunabiliyor,
-- değiştirilebiliyor ve silinebiliyordu (anon ile satır sayıları doğrulandı).
--
-- Uygulama bu tablolara her zaman user_id filtresiyle eriştiği (src/services/supabase.js,
-- 27 sorgu kontrol edildi) için davranış değişmez.

DO $$
DECLARE
  t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY['diet_plans', 'weight_records', 'body_info', 'goals'] LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', 'Enable all access for ' || t, t);

    -- Önceki denemelerden kalmış olabilecek adlarla çakışmasın
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', 'own_' || t || '_select', t);
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', 'own_' || t || '_insert', t);
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', 'own_' || t || '_update', t);
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', 'own_' || t || '_delete', t);

    EXECUTE format('CREATE POLICY %I ON public.%I FOR SELECT TO authenticated USING (auth.uid() = user_id)',
      'own_' || t || '_select', t);
    EXECUTE format('CREATE POLICY %I ON public.%I FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id)',
      'own_' || t || '_insert', t);
    EXECUTE format('CREATE POLICY %I ON public.%I FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id)',
      'own_' || t || '_update', t);
    EXECUTE format('CREATE POLICY %I ON public.%I FOR DELETE TO authenticated USING (auth.uid() = user_id)',
      'own_' || t || '_delete', t);
  END LOOP;
END;
$$;

-- Eski yardımcı: SECURITY DEFINER ama search_path sabit değildi (şema gölgeleme riski).
DO $$
BEGIN
  IF to_regprocedure('public.delete_user()') IS NOT NULL THEN
    ALTER FUNCTION public.delete_user() SET search_path = public;
  END IF;
END;
$$;
