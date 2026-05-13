-- Add explicit actor/context columns to audit_logs and backfill from legacy envelope in new_data.

ALTER TABLE public.audit_logs
  ADD COLUMN IF NOT EXISTS user_email text,
  ADD COLUMN IF NOT EXISTS user_role text,
  ADD COLUMN IF NOT EXISTS changes jsonb,
  ADD COLUMN IF NOT EXISTS metadata jsonb;

UPDATE public.audit_logs
SET
  user_email = COALESCE(user_email, new_data #>> '{__audit,actor,email}'),
  user_role = COALESCE(user_role, new_data #>> '{__audit,actor,role}'),
  changes = COALESCE(changes, new_data #> '{__audit,changes}'),
  metadata = COALESCE(metadata, new_data #> '{__audit,metadata}'),
  new_data = CASE
    WHEN jsonb_typeof(new_data) = 'object' AND (new_data ? '__audit')
      THEN NULLIF(new_data - '__audit', '{}'::jsonb)
    ELSE new_data
  END
WHERE jsonb_typeof(new_data) = 'object' AND (new_data ? '__audit');
