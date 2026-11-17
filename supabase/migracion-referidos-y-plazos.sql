-- JH Inversiones · Activar referidos y plazo de retiro por inversión.
-- Supabase → SQL Editor → New query → pegar todo → Run. Es re-ejecutable y no borra datos.

-- 1) Códigos de referido en las cuentas
create or replace function public.new_referral_code() returns text
language plpgsql set search_path = public as $$
declare candidate text;
begin
  loop
    candidate := 'JH' || upper(substr(md5(random()::text || clock_timestamp()::text), 1, 6));
    exit when not exists (select 1 from public.profiles where referral_code = candidate);
  end loop;
  return candidate;
end $$;
alter table public.profiles add column if not exists referral_code text;
alter table public.profiles add column if not exists referred_by uuid references public.profiles(id) on delete set null;
alter table public.profiles add column if not exists referred_at timestamptz;
alter table public.profiles drop constraint if exists profiles_not_self_referred;
alter table public.profiles add constraint profiles_not_self_referred check (referred_by is null or referred_by <> id);
update public.profiles set referral_code = public.new_referral_code() where referral_code is null;
alter table public.profiles alter column referral_code set default public.new_referral_code();
alter table public.profiles alter column referral_code set not null;
create unique index if not exists profiles_referral_code_key on public.profiles (referral_code);
create index if not exists idx_profiles_referred_by on public.profiles (referred_by);

-- 2) Plazo mínimo de retiro por inversión (30 días por defecto)
alter table public.investments add column if not exists term_days integer not null default 30;
alter table public.investments drop constraint if exists investments_term_days_check;
alter table public.investments add constraint investments_term_days_check check (term_days between 1 and 3650);
alter table public.investments drop constraint if exists minimum_term;
alter table public.investments drop constraint if exists investments_term_check;
alter table public.investments add constraint investments_term_check check (ends_at > started_at);

-- 3) Comisiones por referidos
create table if not exists public.referral_commissions (
  id uuid primary key default gen_random_uuid(),
  referrer_id uuid not null references auth.users(id) on delete cascade,
  referred_id uuid not null references auth.users(id) on delete cascade,
  investment_id uuid not null unique references public.investments(id) on delete cascade,
  base_usd numeric(14,2) not null check (base_usd > 0),
  rate_pct numeric(6,3) not null check (rate_pct > 0 and rate_pct <= 100),
  amount_usd numeric(14,2) not null check (amount_usd > 0),
  status text not null default 'pending' check (status in ('pending','paid','cancelled')),
  created_at timestamptz not null default now(),
  resolved_at timestamptz,
  resolved_by uuid references auth.users(id) on delete set null,
  payout_reference text,
  admin_note text
);
create index if not exists idx_commissions_referrer on public.referral_commissions (referrer_id, created_at desc);
create index if not exists idx_commissions_status on public.referral_commissions (status);
alter table public.referral_commissions enable row level security;
drop policy if exists "commissions_select_own" on public.referral_commissions;
create policy "commissions_select_own" on public.referral_commissions for select
  to authenticated using ((select auth.uid()) = referrer_id);

-- 4) Porcentaje de comisión inicial (5 %; se cambia en el panel → Referidos)
insert into public.settings (key, value) values ('referral_commission_pct', '5') on conflict (key) do nothing;
