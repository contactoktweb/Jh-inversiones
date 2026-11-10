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

-- ───────────────────────── Planes ─────────────────────────
-- Editables desde /admin/planes. A cada inversión le corresponde el plan activo de mayor
-- «monto desde» que el monto alcanza. Los planes con inversiones no se borran: se ocultan.
create table if not exists public.plans (
  id text primary key check (id ~ '^[a-z0-9-]{2,40}$'),
  name text not null check (char_length(name) between 1 and 40),
  eyebrow text not null default '' check (char_length(eyebrow) <= 40),
  caption text not null default '' check (char_length(caption) <= 160),
  min_usd integer not null check (min_usd >= 50 and min_usd <= 100000),
  features text[] not null default '{}',
  highlighted boolean not null default false,
  active boolean not null default true,
  sort_order integer not null default 0,
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
insert into public.plans (id, name, eyebrow, caption, min_usd, features, highlighted, sort_order) values
  ('inicio', 'Impulso', 'Para empezar', 'Tu primer paso, desde 50 dólares.', 50,
    array['Panel de seguimiento','Ganancia diaria visible','Retiro desde el primer mes'], false, 1),
  ('evolucion', 'Órbita', 'Más elegido', 'Para crecer con más capital.', 500,
    array['Todo lo del plan Impulso','Gráficos de evolución','Alertas de estado'], true, 2),
  ('vision', 'Horizonte', 'Largo plazo', 'Pensado para mirar más lejos.', 2000,
    array['Todo lo del plan Órbita','Visión del periodo completo','Historial de solicitudes'], false, 3)
  on conflict (id) do nothing;

-- ───────────────────────── Inversiones ─────────────────────────
create table if not exists public.investments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  plan_id text not null references public.plans(id) on update cascade on delete restrict,
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
-- Transferencias: el cliente avisa que ya pagó (fecha y n.º de operación o comentario).
alter table public.investments add column if not exists payment_reported_at timestamptz;
alter table public.investments add column if not exists payment_report_note text;
-- Versiones anteriores limitaban plan_id a 3 valores fijos; ahora apunta a la tabla de planes.
alter table public.investments drop constraint if exists investments_plan_id_check;
do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'investments_plan_id_fkey') then
    alter table public.investments add constraint investments_plan_id_fkey
      foreign key (plan_id) references public.plans(id) on update cascade on delete restrict;
  end if;
end $$;

-- Foto del comprobante que adjunta el cliente al avisar su transferencia (imagen comprimida).
-- Solo la lee el servidor (service role): sin políticas para las cuentas.
create table if not exists public.payment_proofs (
  investment_id uuid primary key references public.investments(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  image text not null check (char_length(image) <= 1500000),
  created_at timestamptz not null default now()
);

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
alter table public.plans enable row level security;
alter table public.payment_proofs enable row level security;

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
-- Planes: públicos (la página de inicio los muestra sin iniciar sesión).
drop policy if exists "plans_select_all" on public.plans;
create policy "plans_select_all" on public.plans for select
  to anon, authenticated using (true);
-- admin_audit y payment_proofs: sin políticas → solo accesibles con la service role key.
