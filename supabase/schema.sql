-- Ejecutar en el SQL Editor de Supabase antes de habilitar modo real.
create extension if not exists pgcrypto;

-- Perfil con rol. Para nombrar un administrador:
--   update public.profiles set role = 'admin' where email = 'admin@tudominio.com';
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  role text not null default 'user' check (role in ('user','admin')),
  created_at timestamptz not null default now()
);

create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email) values (new.id, coalesce(new.email, '')) on conflict (id) do nothing;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

create table if not exists public.investments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  plan_id text not null check (plan_id in ('inicio','evolucion','vision')),
  principal_usd numeric(14,2) not null check (principal_usd >= 50),
  started_at timestamptz not null,
  -- Fecha a partir de la cual se puede solicitar el retiro (plazo mínimo de 30 días).
  ends_at timestamptz not null,
  stripe_session_id text not null unique,
  status text not null default 'active' check (status in ('active','closed','cancelled')),
  created_at timestamptz not null default now(),
  constraint minimum_term check (ends_at >= started_at + interval '30 days')
);

-- Porcentaje de ganancia diaria fijado por el administrador.
-- Los días sin registro usan la tasa por defecto (1.5 %, ver src/lib/rates.ts).
create table if not exists public.daily_rates (
  rate_date date primary key,
  rate_pct numeric(6,3) not null check (rate_pct >= 0 and rate_pct <= 100),
  set_by uuid references auth.users(id) on delete set null,
  updated_at timestamptz not null default now()
);

create table if not exists public.claims (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  investment_id uuid not null unique references public.investments(id) on delete cascade,
  expected_amount_usd numeric(18,2) not null check (expected_amount_usd > 0),
  status text not null default 'pending' check (status in ('pending','under_review','approved','rejected','settled')),
  email_status text not null default 'pending' check (email_status in ('pending','sent','failed')),
  -- Fecha de la solicitud: las ganancias se congelan en este momento.
  created_at timestamptz not null default now(),
  -- Gestión del administrador (aprobado, rechazado o desembolsado).
  resolved_at timestamptz,
  resolved_by uuid references auth.users(id) on delete set null
);

create index if not exists idx_investments_user on public.investments (user_id, created_at desc);
create index if not exists idx_claims_user on public.claims (user_id, created_at desc);

alter table public.profiles enable row level security;
alter table public.investments enable row level security;
alter table public.daily_rates enable row level security;
alter table public.claims enable row level security;

-- Usuarios sólo pueden leer sus propios registros. Escrituras: servidor con service role.
create policy "profiles_select_own" on public.profiles for select
  to authenticated using (auth.uid() = id);
create policy "investments_select_own" on public.investments for select
  to authenticated using (auth.uid() = user_id);
create policy "claims_select_own" on public.claims for select
  to authenticated using (auth.uid() = user_id);
-- Las tasas son visibles para cualquier cuenta autenticada (necesarias para calcular ganancias).
create policy "daily_rates_select_authenticated" on public.daily_rates for select
  to authenticated using (true);
