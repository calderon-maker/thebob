-- =====================================================
-- TheBob, schema inicial
-- 25/04/2026
-- Aplica padrão BCX, ver bcx-skills/bcx-supabase/SKILL.md
-- =====================================================

create extension if not exists "pgcrypto";
create extension if not exists "uuid-ossp";

-- ---------- profiles ----------
create table public.profiles (
  id uuid primary key references auth.users on delete cascade,
  email text unique not null,
  full_name text,
  avatar_url text,
  role text not null default 'watching'
    check (role in ('admin','member','aspiring','watching','hall_of_fame')),
  segment text,
  linkedin_url text,
  bio text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index profiles_role_idx on public.profiles(role);
create index profiles_segment_idx on public.profiles(segment);

-- ---------- prospects (Fase 1, landing pré-inscrição) ----------
create table public.prospects (
  id bigserial primary key,
  full_name text not null,
  email citext unique not null,
  linkedin_url text not null,
  segment text not null,
  consent boolean not null default false,
  source text not null default 'landing-thebob',
  user_agent text,
  ip_hash text,
  created_at timestamptz not null default now()
);

-- ---------- subscriptions (Fase 3, paywall) ----------
create table public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  stripe_customer_id text unique,
  stripe_subscription_id text unique,
  status text not null
    check (status in ('trialing','active','past_due','canceled','incomplete')),
  tier text not null default 'member_monthly'
    check (tier in ('member_monthly','member_yearly','aspiring_monthly')),
  current_period_end timestamptz,
  created_at timestamptz not null default now()
);

create index subscriptions_user_idx on public.subscriptions(user_id);
create index subscriptions_status_idx on public.subscriptions(status);

-- ---------- events (telemetria interna) ----------
create table public.events (
  id bigserial primary key,
  user_id uuid references public.profiles(id) on delete set null,
  type text not null,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index events_type_idx on public.events(type);
create index events_user_idx on public.events(user_id);

-- ---------- audit_log (LGPD + auditoria) ----------
create table public.audit_log (
  id bigserial primary key,
  actor uuid references auth.users(id),
  action text not null,
  entity text not null,
  entity_id text,
  diff jsonb,
  created_at timestamptz not null default now()
);

-- ---------- jobs (fila do pipeline) ----------
create table public.jobs (
  id bigserial primary key,
  type text not null,
  payload jsonb not null,
  status text not null default 'pending'
    check (status in ('pending','running','done','failed')),
  attempts int not null default 0,
  last_error text,
  scheduled_for timestamptz not null default now(),
  started_at timestamptz,
  finished_at timestamptz,
  worker_id text,
  created_at timestamptz not null default now()
);

create index jobs_status_scheduled_idx on public.jobs(status, scheduled_for);

-- =====================================================
-- claim_next_job, RPC para o worker reservar 1 job
-- =====================================================
create or replace function public.claim_next_job(worker_id text)
returns public.jobs
language plpgsql
as $$
declare
  claimed public.jobs;
begin
  select *
    into claimed
    from public.jobs
   where status = 'pending'
     and scheduled_for <= now()
   order by scheduled_for asc
   limit 1
   for update skip locked;

  if not found then
    return null;
  end if;

  update public.jobs
     set status = 'running',
         started_at = now(),
         worker_id = claim_next_job.worker_id
   where id = claimed.id
   returning * into claimed;

  return claimed;
end;
$$;

-- =====================================================
-- updated_at trigger genérico
-- =====================================================
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

-- =====================================================
-- RLS, padrão BCX, RLS habilitado em TODAS as tabelas
-- =====================================================
alter table public.profiles enable row level security;
alter table public.prospects enable row level security;
alter table public.subscriptions enable row level security;
alter table public.events enable row level security;
alter table public.audit_log enable row level security;
alter table public.jobs enable row level security;

-- profiles, leitura pública dos perfis ativos no ranking
create policy "leitura pública de members ativos" on public.profiles
  for select using (role in ('member','hall_of_fame','aspiring'));

create policy "self read" on public.profiles
  for select using (auth.uid() = id);

create policy "self update" on public.profiles
  for update using (auth.uid() = id);

create policy "admin all" on public.profiles
  for all using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
  );

-- prospects, sem leitura pelo público, só admins e service_role
create policy "admin read prospects" on public.prospects
  for select using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
  );

-- subscriptions, próprio user lê o seu, admin lê todos
create policy "self subscription" on public.subscriptions
  for select using (auth.uid() = user_id);

create policy "admin subscriptions" on public.subscriptions
  for all using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
  );

-- events e audit_log, só admins
create policy "admin events" on public.events
  for all using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
  );

create policy "admin audit" on public.audit_log
  for select using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
  );

-- jobs, só admins (workers usam service_role, bypass)
create policy "admin jobs" on public.jobs
  for all using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
  );

-- =====================================================
-- citext para email case-insensitive em prospects
-- =====================================================
create extension if not exists citext;
