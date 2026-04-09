-- Migration: weight_records tablosunda tekillik user_id + date bazinda olmalı.
-- Bu migration:
-- 1) Eski global date unique kısıtlarını/indexlerini kaldırır
-- 2) user_id + date için unique index oluşturur

begin;

-- Olası eski unique constraint (adı değişmiş olabilir) kaldırma denemeleri
alter table if exists public.weight_records
  drop constraint if exists weight_records_date_key;

alter table if exists public.weight_records
  drop constraint if exists weight_records_date_unique;

-- Olası eski unique index kaldırma denemesi
drop index if exists public.weight_records_date_key;
drop index if exists public.weight_records_date_unique_idx;

-- Doğru tekillik: aynı kullanıcı aynı tarih için tek kayıt
create unique index if not exists weight_records_user_date_unique_idx
  on public.weight_records (user_id, date);

commit;
