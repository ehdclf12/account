-- Workout(규칙 기반 PT 코치): 프로그램(사람당 1행) + 날짜별 운동 기록.
-- Supabase SQL Editor에서 직접 실행(프로젝트 ref gkblndlotwdyoaxfyevs). 재실행해도 안전(idempotent).
-- updated_at은 다른 스키마와 동일하게 트리거 없이 클라이언트가 갱신 시 채운다.

create table if not exists workout_programs (
  who text primary key check (who in ('husband','wife')),
  settings jsonb not null,   -- { daysPerWeek: 3|4|5|6, timeBudgetMin: number }
  program jsonb not null,    -- { weekSchedule: (sessionId|null)[7] (월=0), sessions: Session[], seed: number }
  updated_at timestamptz not null default now()
);

alter table workout_programs enable row level security;
drop policy if exists household_only on workout_programs;
create policy household_only on workout_programs for all to authenticated
  using (public.is_household_member()) with check (public.is_household_member());

create table if not exists workout_logs (
  id uuid primary key default gen_random_uuid(),
  who text not null check (who in ('husband','wife')),
  date date not null,
  session_id text not null,
  sets jsonb not null default '[]'::jsonb,   -- { exerciseId, setIndex, weightKg: number|null, reps, done }[]
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (who, date)
);

alter table workout_logs enable row level security;
drop policy if exists household_only on workout_logs;
create policy household_only on workout_logs for all to authenticated
  using (public.is_household_member()) with check (public.is_household_member());

do $$
begin
  if not exists (select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'workout_programs') then
    alter publication supabase_realtime add table public.workout_programs;
  end if;
  if not exists (select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'workout_logs') then
    alter publication supabase_realtime add table public.workout_logs;
  end if;
end $$;
