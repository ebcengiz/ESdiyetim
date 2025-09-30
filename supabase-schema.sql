-- ESdiyet - Supabase Veritabanı Şeması
-- Bu SQL komutlarını Supabase Dashboard > SQL Editor'de çalıştırın

-- 1. Diyet Planları Tablosu
CREATE TABLE IF NOT EXISTS diet_plans (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  date DATE NOT NULL,
  breakfast TEXT,
  morning_snack TEXT,
  lunch TEXT,
  afternoon_snack TEXT,
  dinner TEXT,
  evening_snack TEXT,
  notes TEXT,
  total_calories INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- 2. Kilo Takip Tablosu
CREATE TABLE IF NOT EXISTS weight_records (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  date DATE NOT NULL UNIQUE,
  weight DECIMAL(5,2) NOT NULL,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- 3. Sağlık Tavsiyeleri Tablosu
CREATE TABLE IF NOT EXISTS health_tips (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  category TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- Tarih sütununa index ekle (performans için)
CREATE INDEX IF NOT EXISTS diet_plans_date_idx ON diet_plans(date);
CREATE INDEX IF NOT EXISTS weight_records_date_idx ON weight_records(date);

-- updated_at otomatik güncellemesi için trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = TIMEZONE('utc', NOW());
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_diet_plans_updated_at BEFORE UPDATE ON diet_plans
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_weight_records_updated_at BEFORE UPDATE ON weight_records
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Örnek sağlık tavsiyeleri ekle
INSERT INTO health_tips (title, content, category) VALUES
  ('Su İçmeyi Unutmayın', 'Günde en az 2-2.5 litre su içmeye özen gösterin. Su, metabolizmanızı hızlandırır ve toksinlerin atılmasına yardımcı olur.', 'genel'),
  ('Düzenli Egzersiz', 'Haftada en az 3-4 gün 30 dakika orta tempolu egzersiz yapın. Yürüyüş, koşu veya yüzme idealdir.', 'egzersiz'),
  ('Kahvaltıyı Atlamayın', 'Kahvaltı günün en önemli öğünüdür. Metabolizmanızı hızlandırır ve gün boyu enerjik kalmanızı sağlar.', 'beslenme'),
  ('Porsiyon Kontrolü', 'Yemek yerken porsiyonlarınızı kontrol edin. Küçük tabaklar kullanmak porsiyon kontrolüne yardımcı olur.', 'beslenme'),
  ('Uyku Düzeni', '7-8 saat kaliteli uyku, kilo kontrolü ve genel sağlık için çok önemlidir. Düzenli uyku saatleri edinin.', 'genel'),
  ('Sebze ve Meyve Tüketimi', 'Her öğünde sebze, her gün en az 2-3 porsiyon meyve tüketin. Vitamin ve mineral ihtiyacınızı karşılar.', 'beslenme'),
  ('Stres Yönetimi', 'Stres kilo almaya neden olabilir. Meditasyon, nefes egzersizleri veya yoga ile stresi yönetin.', 'genel'),
  ('Hazır Gıdalardan Kaçının', 'İşlenmiş ve hazır gıdalar yerine taze ve doğal besinleri tercih edin. Ev yapımı yemekler her zaman daha sağlıklıdır.', 'beslenme'),
  ('Yavaş Yiyin', 'Yemeğinizi yavaş yiyin ve iyice çiğneyin. Bu, sindirimi kolaylaştırır ve tokluk hissini artırır.', 'beslenme'),
  ('Hedef Belirleyin', 'Gerçekçi ve ölçülebilir hedefler belirleyin. Küçük başarılar motivasyonunuzu artırır.', 'motivasyon')
ON CONFLICT DO NOTHING;

-- Row Level Security (RLS) politikaları
-- NOT: Login sistemi olmadığı için RLS kapalı, ancak güvenlik için açılabilir
ALTER TABLE diet_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE weight_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE health_tips ENABLE ROW LEVEL SECURITY;

-- Herkese okuma ve yazma izni ver (login olmadığı için)
CREATE POLICY "Enable all access for diet_plans" ON diet_plans FOR ALL USING (true);
CREATE POLICY "Enable all access for weight_records" ON weight_records FOR ALL USING (true);
CREATE POLICY "Enable read access for health_tips" ON health_tips FOR SELECT USING (true);