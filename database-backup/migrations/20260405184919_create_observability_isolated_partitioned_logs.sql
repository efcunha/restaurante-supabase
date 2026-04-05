-- Migration: create observability isolated schema with partitioned logs
-- IMPORTANT: apply this migration to the dedicated observability Supabase project,
-- not to the transactional production database used by restaurante-web/restaurante-app.

BEGIN;

CREATE TABLE IF NOT EXISTS public.ops_logs (
  id BIGINT GENERATED ALWAYS AS IDENTITY,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  level TEXT NOT NULL CHECK (level IN ('info', 'warn', 'error')),
  service TEXT NOT NULL,
  event TEXT NOT NULL,
  message TEXT NOT NULL,
  request_id UUID,
  user_id TEXT,
  order_id TEXT,
  company_id UUID,
  duration_ms INTEGER,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (id, timestamp)
) PARTITION BY RANGE (timestamp);

-- Current and next month partitions (update monthly via maintenance job/runbook)
CREATE TABLE IF NOT EXISTS public.ops_logs_2026_04
PARTITION OF public.ops_logs
FOR VALUES FROM ('2026-04-01 00:00:00+00') TO ('2026-05-01 00:00:00+00');

CREATE TABLE IF NOT EXISTS public.ops_logs_2026_05
PARTITION OF public.ops_logs
FOR VALUES FROM ('2026-05-01 00:00:00+00') TO ('2026-06-01 00:00:00+00');

-- Hot-path indexes per partition
CREATE INDEX IF NOT EXISTS idx_ops_logs_2026_04_timestamp ON public.ops_logs_2026_04 (timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_ops_logs_2026_04_level_timestamp ON public.ops_logs_2026_04 (level, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_ops_logs_2026_04_service_timestamp ON public.ops_logs_2026_04 (service, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_ops_logs_2026_04_request_id ON public.ops_logs_2026_04 (request_id);
CREATE INDEX IF NOT EXISTS idx_ops_logs_2026_04_order_id ON public.ops_logs_2026_04 (order_id);
CREATE INDEX IF NOT EXISTS idx_ops_logs_2026_04_company_id_timestamp ON public.ops_logs_2026_04 (company_id, timestamp DESC);

CREATE INDEX IF NOT EXISTS idx_ops_logs_2026_05_timestamp ON public.ops_logs_2026_05 (timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_ops_logs_2026_05_level_timestamp ON public.ops_logs_2026_05 (level, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_ops_logs_2026_05_service_timestamp ON public.ops_logs_2026_05 (service, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_ops_logs_2026_05_request_id ON public.ops_logs_2026_05 (request_id);
CREATE INDEX IF NOT EXISTS idx_ops_logs_2026_05_order_id ON public.ops_logs_2026_05 (order_id);
CREATE INDEX IF NOT EXISTS idx_ops_logs_2026_05_company_id_timestamp ON public.ops_logs_2026_05 (company_id, timestamp DESC);

CREATE TABLE IF NOT EXISTS public.ops_alerts (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  condition JSONB NOT NULL,
  channel TEXT NOT NULL,
  channel_config JSONB,
  enabled BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.ops_alert_firings (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  alert_id BIGINT NOT NULL REFERENCES public.ops_alerts(id) ON DELETE CASCADE,
  fired_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  context JSONB,
  notified BOOLEAN NOT NULL DEFAULT FALSE
);

ALTER TABLE public.ops_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ops_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ops_alert_firings ENABLE ROW LEVEL SECURITY;

-- ops_logs policies
DROP POLICY IF EXISTS ops_service_role_insert_logs ON public.ops_logs;
CREATE POLICY ops_service_role_insert_logs
  ON public.ops_logs
  FOR INSERT
  WITH CHECK (auth.role() = 'service_role');

DROP POLICY IF EXISTS ops_authenticated_read_logs ON public.ops_logs;
CREATE POLICY ops_authenticated_read_logs
  ON public.ops_logs
  FOR SELECT
  USING (auth.role() IN ('service_role', 'authenticated'));

-- ops_alerts policies
DROP POLICY IF EXISTS ops_service_role_manage_alerts ON public.ops_alerts;
CREATE POLICY ops_service_role_manage_alerts
  ON public.ops_alerts
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

DROP POLICY IF EXISTS ops_authenticated_read_alerts ON public.ops_alerts;
CREATE POLICY ops_authenticated_read_alerts
  ON public.ops_alerts
  FOR SELECT
  USING (auth.role() IN ('service_role', 'authenticated'));

-- ops_alert_firings policies
DROP POLICY IF EXISTS ops_service_role_manage_alert_firings ON public.ops_alert_firings;
CREATE POLICY ops_service_role_manage_alert_firings
  ON public.ops_alert_firings
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

DROP POLICY IF EXISTS ops_authenticated_read_alert_firings ON public.ops_alert_firings;
CREATE POLICY ops_authenticated_read_alert_firings
  ON public.ops_alert_firings
  FOR SELECT
  USING (auth.role() IN ('service_role', 'authenticated'));

COMMIT;
