-- JepongDevxyz AI — PayMongo QR Ph payments + credit ledger
-- Run in Supabase SQL editor (or as a migration).

create table if not exists public.paymongo_payments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  intent_id text not null unique,
  plan_id text not null,
  amount_centavos integer not null check (amount_centavos > 0),
  credits integer not null default 0 check (credits >= 0),
  status text not null default 'pending'
    check (status in ('pending','paid','failed','expired')),
  created_at timestamptz not null default now(),
  paid_at timestamptz
);
create index if not exists paymongo_payments_user_idx
  on public.paymongo_payments(user_id, created_at desc);
alter table public.paymongo_payments enable row level security;
drop policy if exists "payments own select" on public.paymongo_payments;
create policy "payments own select" on public.paymongo_payments
  for select using (auth.uid() = user_id);

-- Credit ledger: additive, audit-friendly. Spend logic reads SUM(delta).
create table if not exists public.credit_ledger (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  delta integer not null,
  reason text not null,
  ref_payment_id uuid references public.paymongo_payments(id) on delete set null,
  created_at timestamptz not null default now()
);
create index if not exists credit_ledger_user_idx
  on public.credit_ledger(user_id, created_at desc);
alter table public.credit_ledger enable row level security;
drop policy if exists "ledger own select" on public.credit_ledger;
create policy "ledger own select" on public.credit_ledger
  for select using (auth.uid() = user_id);

-- Helper: current credit balance per user
create or replace function public.credit_balance(uid uuid)
returns integer language sql stable as $$
  select coalesce(sum(delta), 0)::integer from public.credit_ledger where user_id = uid;
$$;
