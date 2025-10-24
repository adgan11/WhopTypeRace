-- Enable required extensions
create extension if not exists "pgcrypto";

-- Users table stores Whop identifiers and available credits
create table if not exists public.users (
  id uuid primary key default gen_random_uuid(),
  whop_user_id text not null unique,
  username text not null,
  credits integer not null default 0,
  created_at timestamp with time zone not null default timezone('utc', now()),
  updated_at timestamp with time zone not null default timezone('utc', now())
);

alter table if exists public.users
  add column if not exists company_id text;

alter table if exists public.users
  add column if not exists company_title text;

alter table if exists public.users
  add column if not exists company_route text;

alter table if exists public.users
  add column if not exists company_owner_user_id text;

alter table if exists public.users
  add column if not exists company_owner_username text;

alter table if exists public.users
  add column if not exists company_owner_name text;

-- Trigger to keep updated_at current
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$ language plpgsql;

drop trigger if exists handle_updated_at on public.users;
create trigger handle_updated_at
before update on public.users
for each row
execute function public.set_updated_at();

-- Results table tracks individual typing tests
create table if not exists public.results (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  wpm numeric(10,2) not null,
  accuracy numeric(10,2),
  created_at timestamp with time zone not null default timezone('utc', now())
);

create index if not exists idx_results_user_id on public.results(user_id);
create index if not exists idx_results_wpm on public.results(wpm desc);

create table if not exists public.rewards (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  result_id uuid not null references public.results(id) on delete cascade,
  reward_key text not null,
  username text not null,
  amount numeric(10,2) not null,
  wpm numeric(10,2) not null,
  accuracy numeric(10,2) not null,
  created_at timestamp with time zone not null default timezone('utc', now())
);

create unique index if not exists idx_rewards_result_reward_key
  on public.rewards(result_id, reward_key);

-- Function to ensure a user record exists
create or replace function public.ensure_user(
  p_whop_user_id text,
  p_username text,
  p_initial_credits integer default 0
)
returns public.users
language plpgsql
security definer
as $$
declare
  existing_user public.users;
begin
  select * into existing_user
  from public.users
  where whop_user_id = p_whop_user_id;

  if existing_user is not null then
    if p_username is not null and existing_user.username <> p_username then
      update public.users
      set username = p_username
      where id = existing_user.id
      returning * into existing_user;
    end if;
    return existing_user;
  end if;

  insert into public.users (whop_user_id, username, credits)
  values (p_whop_user_id, coalesce(p_username, concat('whop-', left(p_whop_user_id, 8))), p_initial_credits)
  returning * into existing_user;

  return existing_user;
end;
$$;

-- Function to consume credits atomically
create or replace function public.consume_credit(
  p_whop_user_id text,
  p_amount integer default 1
)
returns public.users
language plpgsql
security definer
as $$
declare
  updated_user public.users;
begin
  if p_amount <= 0 then
    raise exception 'Amount must be positive';
  end if;

  update public.users
  set credits = credits - p_amount
  where whop_user_id = p_whop_user_id
    and credits >= p_amount
  returning * into updated_user;

  if updated_user is null then
    raise exception 'INSUFFICIENT_CREDITS';
  end if;

  return updated_user;
end;
$$;

-- Function to add credits, used by webhooks/purchases
create or replace function public.add_credits(
  p_whop_user_id text,
  p_amount integer
)
returns public.users
language plpgsql
security definer
as $$
declare
  updated_user public.users;
begin
  if p_amount <= 0 then
    raise exception 'Amount must be positive';
  end if;

  update public.users
  set credits = credits + p_amount
  where whop_user_id = p_whop_user_id
  returning * into updated_user;

  if updated_user is null then
    insert into public.users (whop_user_id, username, credits)
    values (p_whop_user_id, concat('whop-', left(p_whop_user_id, 8)), p_amount)
    returning * into updated_user;
  end if;

  return updated_user;
end;
$$;

-- Optional helper view for leaderboards
create or replace view public.leaderboard as
select
  r.id,
  u.username,
  r.wpm,
  r.created_at
from public.results r
join public.users u on r.user_id = u.id;
