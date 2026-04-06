-- Configuracao dinâmica de serviços monitorados pelo painel /service-status.
-- Permite atualizar DNS/URL/path/método/timeout sem redeploy no restaurante-ops.

create table if not exists public.ops_monitored_services (
  id bigint generated always as identity primary key,
  service_key text not null unique,
  service_name text not null,
  base_url text not null,
  health_path text not null default '/',
  method text not null default 'GET' check (method in ('GET', 'HEAD')),
  timeout_ms integer not null default 5000 check (timeout_ms between 500 and 30000),
  expected_status_min integer not null default 200 check (expected_status_min between 100 and 599),
  expected_status_max integer not null default 399 check (expected_status_max between 100 and 599),
  enabled boolean not null default true,
  display_order integer not null default 100,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint ops_monitored_services_status_range_ck check (expected_status_min <= expected_status_max)
);

create index if not exists idx_ops_monitored_services_enabled_order
  on public.ops_monitored_services (enabled, display_order, service_key);

create or replace function public.set_ops_monitored_services_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_ops_monitored_services_updated_at on public.ops_monitored_services;
create trigger trg_ops_monitored_services_updated_at
before update on public.ops_monitored_services
for each row
execute function public.set_ops_monitored_services_updated_at();

-- Seed idempotente com os serviços atuais.
insert into public.ops_monitored_services (
  service_key,
  service_name,
  base_url,
  health_path,
  method,
  timeout_ms,
  expected_status_min,
  expected_status_max,
  enabled,
  display_order,
  metadata
) values
  (
    'restaurante-ops',
    'restaurante-ops',
    'https://ops.restaurante-web.app.br',
    '/healthz',
    'GET',
    5000,
    200,
    399,
    true,
    10,
    '{"source":"seed"}'::jsonb
  ),
  (
    'restaurante-web',
    'restaurante-web',
    'https://restaurante-web.app.br',
    '/healthz',
    'GET',
    5000,
    200,
    399,
    true,
    20,
    '{"source":"seed"}'::jsonb
  ),
  (
    'activepieces',
    'activepieces',
    'https://activepieces-production-4e63.up.railway.app',
    '/health',
    'GET',
    5000,
    200,
    399,
    true,
    30,
    '{"source":"seed"}'::jsonb
  ),
  (
    'evolution-api',
    'evolution-api',
    'https://evolution-api-production-9ac1.up.railway.app/manager',
    '/',
    'GET',
    5000,
    200,
    399,
    true,
    40,
    '{"source":"seed"}'::jsonb
  )
on conflict (service_key) do update
set
  service_name = excluded.service_name,
  base_url = excluded.base_url,
  health_path = excluded.health_path,
  method = excluded.method,
  timeout_ms = excluded.timeout_ms,
  expected_status_min = excluded.expected_status_min,
  expected_status_max = excluded.expected_status_max,
  enabled = excluded.enabled,
  display_order = excluded.display_order,
  metadata = excluded.metadata;
