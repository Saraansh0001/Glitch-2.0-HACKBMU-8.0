-- ============================================================
-- SatyaNetra — Supabase Database Setup
-- Run this in: Supabase Dashboard → SQL Editor → New Query
-- ============================================================


-- 1. PROFILES TABLE
-- Stores extended user info collected at sign-up
create table if not exists public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  name        text,
  age         int,
  gender      text,
  occupation  text,
  purpose     text,
  created_at  timestamptz default now()
);

-- Auto-create a blank profile row whenever a new user signs up
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into public.profiles (id)
  values (new.id)
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();


-- 2. DETECTIONS TABLE
-- Stores every analysis result tied to a user
create table if not exists public.detections (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users(id) on delete cascade,
  video_name    text,
  confidence    float,
  visual_score  float,
  audio_score   float,
  lipsync_score float,
  created_at    timestamptz default now()
);


-- 3. ROW LEVEL SECURITY
-- Users can only read/write their own rows

alter table public.profiles  enable row level security;
alter table public.detections enable row level security;

-- profiles: select own row
create policy "Users can view own profile"
  on public.profiles for select
  using (auth.uid() = id);

-- profiles: insert own row
create policy "Users can insert own profile"
  on public.profiles for insert
  with check (auth.uid() = id);

-- profiles: update own row
create policy "Users can update own profile"
  on public.profiles for update
  using (auth.uid() = id);

-- detections: select own rows
create policy "Users can view own detections"
  on public.detections for select
  using (auth.uid() = user_id);

-- detections: insert own rows
create policy "Users can insert own detections"
  on public.detections for insert
  with check (auth.uid() = user_id);


-- ============================================================
-- MIGRATION (run if tables already exist)
-- Adds verdict column and makes audio/lipsync nullable for fallbacks
-- ============================================================
ALTER TABLE public.detections ADD COLUMN IF NOT EXISTS verdict text;

-- ============================================================
-- DONE — both tables are live with RLS enforced.
-- ============================================================
