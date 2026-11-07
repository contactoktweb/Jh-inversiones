-- JH Inversiones · esquema de base de datos.
-- Ejecutar completo en Supabase → SQL Editor → New query → Run.
-- Es re-ejecutable: crea lo que falta y actualiza versiones anteriores sin borrar datos.
create extension if not exists pgcrypto;

-- ───────────────────────── Perfiles ─────────────────────────
-- Un perfil por cuenta. Rol 'admin' también se puede dar con ADMIN_EMAILS o desde /admin/clientes.
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  role text not null default 'user' check (role in ('user','admin')),
  created_at timestamptz not null default now()
);
alter table public.profiles add column if not exists full_name text;
alter table public.profiles add column if not exists phone text;
alter table public.profiles add column if not exists country text;
-- Datos para recibir retiros (banco, cuenta, billetera…), escritos por el cliente.
alter table public.profiles add column if not exists payout_details text;
alter table public.profiles add column if not exists status text not null default 'active';
alter table public.profiles add column if not exists updated_at timestamptz not null default now();
alter table public.profiles drop constraint if exists profiles_status_check;
alter table public.profiles add constraint profiles_status_check check (status in ('active','suspended'));

create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email) values (new.id, coalesce(new.email, '')) on conflict (id) do nothing;
  return new;
end $$;
revoke execute on function public.handle_new_user() from public, anon, authenticated;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- Perfiles de cuentas creadas antes de ejecutar este esquema.
insert into public.profiles (id, email)
  select id, coalesce(email, '') from auth.users on conflict (id) do nothing;

-- ───────────────────────── Inversiones ─────────────────────────
create table if not exists public.investments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  plan_id text not null check (plan_id in ('inicio','evolucion','vision')),
  principal_usd numeric(14,2) not null check (principal_usd >= 50),
  -- Inicio del cómputo de ganancias (fecha de confirmación del pago).
  started_at timestamptz not null,
  -- Fecha desde la que se puede solicitar el retiro (plazo mínimo de 30 días).
  ends_at timestamptz not null,
  payment_method text not null default 'test',
  payment_reference text not null unique,
  status text not null default 'active',
  created_at timestamptz not null default now(),
  constraint minimum_term check (ends_at >= started_at + interval '30 days')
);
-- Métodos: test = pago de prueba · transfer = transferencia que el admin confirma ·
-- manual = registrada por el admin · stripe = pasarela (fase pendiente).
alter table public.investments drop constraint if exists investments_payment_method_check;
alter table public.investments add constraint investments_payment_method_check
  check (payment_method in ('test','transfer','manual','stripe'));
-- Estados: pending_payment (esperando confirmación) · active · closed (retiro desembolsado) · cancelled.
alter table public.investments drop constraint if exists investments_status_check;
alter table public.investments add constraint investments_status_check
  check (status in ('pending_payment','active','closed','cancelled'));
alter table public.investments add column if not exists confirmed_at timestamptz;
alter table public.investments add column if not exists confirmed_by uuid references auth.users(id) on delete set null;
alter table public.investments add column if not exists cancelled_at timestamptz;
alter table public.investments add column if not exists admin_note text;

-- ───────────────────────── Tasas diarias ─────────────────────────
-- Días sin registro usan la tasa por defecto (1.5 %, ver src/lib/rates.ts).
create table if not exists public.daily_rates (
  rate_date date primary key,
  rate_pct numeric(6,3) not null check (rate_pct >= 0 and rate_pct <= 100),
  set_by uuid references auth.users(id) on delete set null,
  updated_at timestamptz not null default now()
);

-- ───────────────────────── Retiros ─────────────────────────
create table if not exists public.claims (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  investment_id uuid not null unique references public.investments(id) on delete cascade,
  expected_amount_usd numeric(18,2) not null check (expected_amount_usd > 0),
  status text not null default 'pending' check (status in ('pending','approved','rejected','settled')),
  email_status text not null default 'pending' check (email_status in ('pending','sent','failed')),
  -- Fecha de la solicitud: las ganancias se congelan en este momento.
  created_at timestamptz not null default now(),
  resolved_at timestamptz,
  resolved_by uuid references auth.users(id) on delete set null
);
-- Dónde quiere recibir el dinero el cliente (copiado de su perfil al solicitar).
alter table public.claims add column if not exists payout_details text;
-- Comprobante del pago hecho por el administrador (n.º de transferencia, hash…).
alter table public.claims add column if not exists payout_reference text;
-- Nota del administrador (motivo de rechazo, observaciones), visible para el cliente.
alter table public.claims add column if not exists admin_note text;

-- ───────────────────────── Ajustes ─────────────────────────
-- Valores editables desde /admin/ajustes (p. ej. instrucciones de transferencia).
create table if not exists public.settings (
  key text primary key,
  value text not null default '',
  updated_by uuid references auth.users(id) on delete set null,
  updated_at timestamptz not null default now()
);
insert into public.settings (key, value) values
  ('transfer_instructions', 'Configura aquí los datos de tu cuenta bancaria desde el panel de administración → Ajustes.')
  on conflict (key) do nothing;

-- ───────────────────────── Registro de actividad ─────────────────────────
-- Cada acción administrativa queda registrada (quién, qué, cuándo).
create table if not exists public.admin_audit (
  id bigint generated always as identity primary key,
  actor_id uuid references auth.users(id) on delete set null,
  actor_email text not null default '',
  action text not null,
  entity text not null,
  entity_id text,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

-- ───────────────────────── Índices ─────────────────────────
create index if not exists idx_investments_user on public.investments (user_id, created_at desc);
create index if not exists idx_investments_status on public.investments (status);
create index if not exists idx_claims_user on public.claims (user_id, created_at desc);
create index if not exists idx_claims_status on public.claims (status);
create index if not exists idx_audit_created on public.admin_audit (created_at desc);

-- ───────────────────────── Seguridad (RLS) ─────────────────────────
-- Las cuentas solo LEEN sus propios datos. Todas las escrituras las hace el servidor (service role).
alter table public.profiles enable row level security;
alter table public.investments enable row level security;
alter table public.daily_rates enable row level security;
alter table public.claims enable row level security;
alter table public.settings enable row level security;
alter table public.admin_audit enable row level security;

drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own" on public.profiles for select
  to authenticated using ((select auth.uid()) = id);
drop policy if exists "investments_select_own" on public.investments;
create policy "investments_select_own" on public.investments for select
  to authenticated using ((select auth.uid()) = user_id);
drop policy if exists "claims_select_own" on public.claims;
create policy "claims_select_own" on public.claims for select
  to authenticated using ((select auth.uid()) = user_id);
drop policy if exists "daily_rates_select_authenticated" on public.daily_rates;
create policy "daily_rates_select_authenticated" on public.daily_rates for select
  to authenticated using (true);
drop policy if exists "settings_select_authenticated" on public.settings;
create policy "settings_select_authenticated" on public.settings for select
  to authenticated using (true);
-- admin_audit: sin políticas → solo accesible con la service role key.
