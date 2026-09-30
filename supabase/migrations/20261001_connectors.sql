-- JepongDevxyz AI — Connectors (2026-10-01)
-- OAuth/API tokens per user per provider, plus app-level OAuth app
-- credentials (client_id/secret) configured once by the owner.
-- Run in the Supabase SQL editor, like the credits v2 migration.

create table if not exists connector_tokens (
  user_id uuid not null references auth.users(id) on delete cascade,
  provider text not null,
  access_token text not null,
  refresh_token text,
  expires_at timestamptz,
  scope text,
  label text,
  updated_at timestamptz not null default now(),
  primary key (user_id, provider)
);

create table if not exists connector_config (
  provider text primary key,
  client_id text not null,
  client_secret text not null,
  updated_at timestamptz not null default now()
);

alter table connector_tokens enable row level security;
alter table connector_config enable row level security;

drop policy if exists "own connector tokens" on connector_tokens;
create policy "own connector tokens" on connector_tokens
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "connector config readable" on connector_config;
create policy "connector config readable" on connector_config
  for select using (auth.role() = 'authenticated');
-- config writes go through the service role (api/connectors/config.js) only.

-- Short-lived OAuth link nonces: auth-url (signed-in) mints one per
-- connect attempt; the callback redeems it to find the user.
create table if not exists connector_oauth_state (
  nonce text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  provider text not null,
  created_at timestamptz not null default now()
);
alter table connector_oauth_state enable row level security;
-- no policies: service role only (api/connectors/auth-url.js + callback.js).

-- Per-connector metadata: e.g. github repo-access selection
-- ({mode:'all'|'selected', repos:[...]}), plaid credentials.
create table if not exists connector_meta (
  user_id uuid not null references auth.users(id) on delete cascade,
  provider text not null,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  primary key (user_id, provider)
);
alter table connector_meta enable row level security;
-- no policies: service role only.

-- User-defined custom connectors.
create table if not exists custom_connectors (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  description text not null default '',
  base_url text not null,
  auth_type text not null default 'bearer',
  auth_value text not null default '',
  auth_header text not null default '',
  test_path text not null default '',
  created_at timestamptz not null default now()
);
alter table custom_connectors enable row level security;
-- no policies: service role only (api/connectors/custom.js).
