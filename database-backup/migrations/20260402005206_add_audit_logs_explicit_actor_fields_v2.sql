-- Idempotent follow-up migration created during production apply.
-- Keeps local migration history aligned with remote schema_migrations.

ALTER TABLE public.audit_logs ADD COLUMN IF NOT EXISTS user_email text;
ALTER TABLE public.audit_logs ADD COLUMN IF NOT EXISTS user_role text;
ALTER TABLE public.audit_logs ADD COLUMN IF NOT EXISTS changes jsonb;
ALTER TABLE public.audit_logs ADD COLUMN IF NOT EXISTS metadata jsonb;
