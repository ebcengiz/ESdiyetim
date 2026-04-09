-- Migration: diet_plans tablosunda user_id + date tekilligi
-- Bu migration duplicate kayitlari temizler ve unique index ekler.

begin;

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

create unique index if not exists diet_plans_user_date_unique_idx
  on public.diet_plans (user_id, date);

commit;
