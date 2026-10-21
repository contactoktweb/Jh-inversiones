-- Ejecutar en el SQL Editor de Supabase antes de habilitar modo real.
create extension if not exists pgcrypto;

create table if not exists public.investments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  plan_id text not null check (plan_id in ('inicio','evolucion','vision')),
  principal_cop bigint not null check (principal_cop > 0),
  illustrative_return_pct numeric(8,4) not null check (illustrative_return_pct >= 0),
  started_at timestamptz not null,
  ends_at timestamptz not null,
  stripe_session_id text not null unique,
  status text not null default 'active' check (status in ('active','closed','cancelled')),
  created_at timestamptz not null default now(),
  constraint positive_duration check (ends_at > started_at)
);

create table if not exists public.claims (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  investment_id uuid not null unique references public.investments(id) on delete cascade,
  expected_amount_cop numeric(18,2) not null check (expected_amount_cop > 0),
  status text not null default 'pending' check (status in ('pending','under_review','approved','rejected','settled')),
  email_status text not null default 'pending' check (email_status in ('pending','sent','failed')),
  created_at timestamptz not null default now()
);

create index if not exists idx_investments_user on public.investments (user_id, created_at desc);
create index if not exists idx_claims_user on public.claims (user_id, created_at desc);

alter table public.investments enable row level security;
alter table public.claims enable row level security;

-- Usuarios sólo pueden leer sus propios registros. Escrituras: servidor con service role.
create policy "investments_select_own" on public.investments for select
  to authenticated using (auth.uid() = user_id);
create policy "claims_select_own" on public.claims for select
  to authenticated using (auth.uid() = user_id);
