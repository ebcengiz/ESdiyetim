-- Home KPI ozet fonksiyonu (Supabase SQL Editor'a yapistirabilirsiniz)
-- Not: Bu fonksiyon auth.uid() ile sadece mevcut kullanicinin verisini dondurur.

create or replace function public.get_home_daily_summary(p_date date default current_date)
returns table (
  latest_weight numeric,
  meals_planned_count integer,
  active_goals_count integer,
  completed_goals_count integer
)
language sql
stable
as $$
  with me as (
    select auth.uid() as user_id
  ),
  latest_weight_cte as (
    select wr.weight
    from public.weight_records wr
    join me on wr.user_id = me.user_id
    order by wr.date desc, wr.created_at desc
    limit 1
  ),
  meals_cte as (
    select
      (
        case when coalesce(nullif(trim(dp.breakfast), ''), null) is not null then 1 else 0 end +
        case when coalesce(nullif(trim(dp.lunch), ''), null) is not null then 1 else 0 end +
        case when coalesce(nullif(trim(dp.dinner), ''), null) is not null then 1 else 0 end
      )::int as meal_count
    from public.diet_plans dp
    join me on dp.user_id = me.user_id
    where dp.date = p_date
    order by dp.created_at desc
    limit 1
  ),
  goals_cte as (
    select
      count(*) filter (where g.status = 'active')::int as active_count,
      count(*) filter (where g.status = 'completed')::int as completed_count
    from public.goals g
    join me on g.user_id = me.user_id
  )
  select
    (select weight from latest_weight_cte) as latest_weight,
    coalesce((select meal_count from meals_cte), 0) as meals_planned_count,
    coalesce((select active_count from goals_cte), 0) as active_goals_count,
    coalesce((select completed_count from goals_cte), 0) as completed_goals_count;
$$;

grant execute on function public.get_home_daily_summary(date) to anon, authenticated;
