-- user_credits: Premium abonelerin günlük fotoğraf analiz sayacı
-- Ücretsiz kullanıcılar bu tablodan bağımsız olarak hiç erişemez (kod tarafında engellenir).

CREATE TABLE IF NOT EXISTS user_credits (
  user_id          UUID    PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  daily_photo_used INTEGER NOT NULL DEFAULT 0,
  last_reset_date  DATE    NOT NULL DEFAULT CURRENT_DATE,
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Row Level Security
ALTER TABLE user_credits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own_credits_select"
  ON user_credits FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "own_credits_insert"
  ON user_credits FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "own_credits_update"
  ON user_credits FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Otomatik updated_at güncelleyici
CREATE OR REPLACE FUNCTION update_user_credits_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_user_credits_updated_at
  BEFORE UPDATE ON user_credits
  FOR EACH ROW EXECUTE FUNCTION update_user_credits_updated_at();
