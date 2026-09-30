-- JepongDevxyz AI — credits v2: idempotent spends + atomic deduction
-- Run in Supabase SQL editor AFTER 20260930_paymongo_qrph.sql.

-- 1) Idempotency key on the ledger (spend retries / double-taps charge once)
alter table public.credit_ledger
  add column if not exists idempotency_key text;

create unique index if not exists credit_ledger_idem_uniq
  on public.credit_ledger (user_id, idempotency_key)
  where idempotency_key is not null;

-- 2) Atomic spend: per-user serialized, returns new balance.
--    Returns -1 when the balance is insufficient (no row written).
--    Returns the current balance untouched when the key was already used.
create or replace function public.spend_credits(
  p_uid uuid, p_cost integer, p_reason text, p_key text
)
returns integer
language plpgsql
as $$
declare
  v_bal integer;
begin
  -- Serialize concurrent spends for the same user.
  perform pg_advisory_xact_lock(hashtext(p_uid::text));

  if p_key is not null and exists (
    select 1 from public.credit_ledger
    where user_id = p_uid and idempotency_key = p_key
  ) then
    return (select public.credit_balance(p_uid));
  end if;

  v_bal := public.credit_balance(p_uid);
  if v_bal < p_cost then
    return -1;
  end if;

  insert into public.credit_ledger (user_id, delta, reason, idempotency_key)
  values (p_uid, -p_cost, p_reason, p_key);

  return (select public.credit_balance(p_uid));
end
$$;
