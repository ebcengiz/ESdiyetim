-- Hedefler (Goals) Tablosu
CREATE TABLE IF NOT EXISTS public.goals (
  id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  title TEXT NOT NULL,
  current_weight DECIMAL(5,2),
  target_weight DECIMAL(5,2) NOT NULL,
  start_date DATE NOT NULL,
  target_date DATE NOT NULL,
  notes TEXT,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'completed')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Güncelleme zamanı için trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_goals_updated_at
  BEFORE UPDATE ON public.goals
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- RLS (Row Level Security) etkinleştir
ALTER TABLE public.goals ENABLE ROW LEVEL SECURITY;

-- Herkese okuma/yazma izni ver (geliştirme için - üretimde kullanıcı bazlı yapabilirsiniz)
CREATE POLICY "Enable all access for goals" ON public.goals
  FOR ALL
  USING (true)
  WITH CHECK (true);
