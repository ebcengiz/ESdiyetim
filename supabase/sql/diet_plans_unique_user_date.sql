-- diet_plans tablosunda aynı kullanıcı + aynı tarih için tek kayıt garantisi
-- Supabase SQL Editor'de tek sefer çalıştırın.

begin;

-- 1) Önce geçmiş duplicate kayıtları temizle.
-- Aynı user_id + date grubu içinde:
-- - daha çok dolu öğün alanı olan kayıt kalsın
-- - eşitse daha güncel (updated_at/created_at) kayıt kalsın
with ranked as (
  select
    id,
    row_number() over (
      partition by user_id, date
      order by
        (
          (case when coalesce(nullif(trim(breakfast), ''), null) is not null then 1 else 0 end) +
          (case when coalesce(nullif(trim(lunch), ''), null) is not null then 1 else 0 end) +
          (case when coalesce(nullif(trim(dinner), ''), null) is not null then 1 else 0 end) +
          (case when coalesce(nullif(trim(morning_snack), ''), null) is not null then 1 else 0 end) +
          (case when coalesce(nullif(trim(afternoon_snack), ''), null) is not null then 1 else 0 end) +
          (case when coalesce(nullif(trim(evening_snack), ''), null) is not null then 1 else 0 end)
        ) desc,
        updated_at desc nulls last,
        created_at desc nulls last
    ) as rn
  from public.diet_plans
  where user_id is not null
)
delete from public.diet_plans d
using ranked r
where d.id = r.id
  and r.rn > 1;

-- 2) DB seviyesinde tekillik garantisi.
create unique index if not exists diet_plans_user_date_unique_idx
  on public.diet_plans (user_id, date);

commit;
