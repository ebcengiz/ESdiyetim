-- Sunucuda doğrulanmış abonelikler
--
-- verify-subscription Edge Function'ı StoreKit 2 imzalı işlemini (JWS) Apple kök
-- sertifikasına kadar doğrular ve buraya yazar. ai-proxy ücretsiz/Premium tavanını
-- buradan okur — istemcinin "Premium'um" demesine güvenilmez.
--
-- Bir abonelik (original_transaction_id) aynı anda tek hesaba bağlıdır: aynı JWS başka
-- hesaptan gönderilirse sahiplik oraya taşınır (geri yükleme / hesap değişimi meşru),
-- böylece bir abonelik birden çok hesaba Premium veremez.

CREATE TABLE IF NOT EXISTS public.subscriptions (
  original_transaction_id TEXT        PRIMARY KEY,
  user_id                 UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  product_id              TEXT        NOT NULL,
  expires_at              TIMESTAMPTZ NOT NULL,
  revoked_at              TIMESTAMPTZ,
  environment             TEXT        NOT NULL,
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS subscriptions_user_id_idx ON public.subscriptions (user_id);

ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

-- Kullanıcı yalnızca kendi kaydını okuyabilir; yazma yalnızca service_role (Edge Function).
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'subscriptions' AND policyname = 'own_subscriptions_select'
  ) THEN
    CREATE POLICY own_subscriptions_select ON public.subscriptions FOR SELECT USING (auth.uid() = user_id);
  END IF;
END;
$$;

/** Kullanıcının şu an geçerli, iptal edilmemiş bir aboneliği var mı (ai-proxy tavanı için). */
CREATE OR REPLACE FUNCTION public.has_active_subscription(p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.subscriptions
     WHERE user_id = p_user_id AND expires_at > now() AND revoked_at IS NULL
  )
$$;

REVOKE ALL ON FUNCTION public.has_active_subscription(UUID) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.has_active_subscription(UUID) TO service_role;
