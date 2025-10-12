-- ESdiyet - Auth Sistemi Migration
-- Bu SQL komutlarını Supabase Dashboard > SQL Editor'de çalıştırın
-- ÖNEMLİ: Bu migration mevcut verileri silecektir!

-- 1. Eski RLS politikalarını kaldır
DROP POLICY IF EXISTS "Enable all access for diet_plans" ON diet_plans;
DROP POLICY IF EXISTS "Enable all access for weight_records" ON weight_records;
DROP POLICY IF EXISTS "Enable read access for health_tips" ON health_tips;
DROP POLICY IF EXISTS "Enable all access for body_info" ON body_info;
DROP POLICY IF EXISTS "Enable all access for goals" ON goals;

-- 2. Mevcut verileri temizle (çünkü user_id yok)
-- ÖNEMLİ: Eğer test verilerini korumak isterseniz bu satırları comment'leyin
TRUNCATE TABLE diet_plans CASCADE;
TRUNCATE TABLE weight_records CASCADE;
TRUNCATE TABLE body_info CASCADE;
TRUNCATE TABLE goals CASCADE;

-- 3. user_id kolonlarını ekle
ALTER TABLE diet_plans
  ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE weight_records
  ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE body_info
  ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE goals
  ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- 4. user_id kolonlarını NOT NULL yap (yeni kayıtlar için zorunlu)
ALTER TABLE diet_plans
  ALTER COLUMN user_id SET NOT NULL;

ALTER TABLE weight_records
  ALTER COLUMN user_id SET NOT NULL;

ALTER TABLE body_info
  ALTER COLUMN user_id SET NOT NULL;

ALTER TABLE goals
  ALTER COLUMN user_id SET NOT NULL;

-- 5. Performans için user_id index'leri ekle
CREATE INDEX IF NOT EXISTS diet_plans_user_id_idx ON diet_plans(user_id);
CREATE INDEX IF NOT EXISTS weight_records_user_id_idx ON weight_records(user_id);
CREATE INDEX IF NOT EXISTS body_info_user_id_idx ON body_info(user_id);
CREATE INDEX IF NOT EXISTS goals_user_id_idx ON goals(user_id);

-- 6. weight_records için composite unique constraint (her kullanıcı için bir tarihte bir kayıt)
ALTER TABLE weight_records
  DROP CONSTRAINT IF EXISTS weight_records_date_key;

ALTER TABLE weight_records
  ADD CONSTRAINT weight_records_user_date_unique UNIQUE (user_id, date);

-- 7. Yeni RLS Politikalarını Ekle

-- Diet Plans: Kullanıcılar sadece kendi kayıtlarını görebilir ve düzenleyebilir
CREATE POLICY "Users can view own diet plans"
  ON diet_plans FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own diet plans"
  ON diet_plans FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own diet plans"
  ON diet_plans FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own diet plans"
  ON diet_plans FOR DELETE
  USING (auth.uid() = user_id);

-- Weight Records: Kullanıcılar sadece kendi kayıtlarını görebilir ve düzenleyebilir
CREATE POLICY "Users can view own weight records"
  ON weight_records FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own weight records"
  ON weight_records FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own weight records"
  ON weight_records FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own weight records"
  ON weight_records FOR DELETE
  USING (auth.uid() = user_id);

-- Body Info: Kullanıcılar sadece kendi kayıtlarını görebilir ve düzenleyebilir
CREATE POLICY "Users can view own body info"
  ON body_info FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own body info"
  ON body_info FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own body info"
  ON body_info FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own body info"
  ON body_info FOR DELETE
  USING (auth.uid() = user_id);

-- Goals: Kullanıcılar sadece kendi kayıtlarını görebilir ve düzenleyebilir
CREATE POLICY "Users can view own goals"
  ON goals FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own goals"
  ON goals FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own goals"
  ON goals FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own goals"
  ON goals FOR DELETE
  USING (auth.uid() = user_id);

-- Health Tips: Herkes okuyabilir (genel tavsiyeler)
CREATE POLICY "Everyone can read health tips"
  ON health_tips FOR SELECT
  USING (true);

-- 8. RLS'i etkinleştir (zaten aktifti ama emin olmak için)
ALTER TABLE diet_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE weight_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE body_info ENABLE ROW LEVEL SECURITY;
ALTER TABLE goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE health_tips ENABLE ROW LEVEL SECURITY;

-- Migration tamamlandı!
-- Artık her kullanıcı sadece kendi verilerini görebilir ve düzenleyebilir.
