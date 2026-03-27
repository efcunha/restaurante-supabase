-- ============================================================================
-- Migration: 20260327160000
-- Make agendamentos webhook URL configurable per company.
--
-- Why:
-- - Current trigger still points to legacy n8n URL.
-- - Activepieces URL can differ by environment/company.
--
-- How:
-- - Read URL from app_settings key='integracoes' field
--   value.activepieces_reservas_webhook_url.
-- - Fallback to value.reservas_webhook_url (legacy custom key support).
-- - Keep legacy n8n fallback to avoid breaking notifications while rollout
--   is being configured.
-- - Swallow network errors with WARNING so reservation flow is never blocked.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.notify_agendamentos_n8n()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  webhook_url text;
  request_id bigint;
BEGIN
  SELECT NULLIF(value->>'activepieces_reservas_webhook_url', '')
    INTO webhook_url
  FROM public.app_settings
  WHERE company_id = NEW.company_id
    AND key = 'integracoes'
  LIMIT 1;

  IF webhook_url IS NULL THEN
    SELECT NULLIF(value->>'reservas_webhook_url', '')
      INTO webhook_url
    FROM public.app_settings
    WHERE company_id = NEW.company_id
      AND key = 'integracoes'
    LIMIT 1;
  END IF;

  IF webhook_url IS NULL THEN
    webhook_url := 'https://machadocunha.app.n8n.cloud/webhook/supa-agendamentos';
  END IF;

  BEGIN
    SELECT net.http_post(
      url := webhook_url,
      body := jsonb_build_object(
        'record', row_to_json(NEW),
        'old_record', CASE WHEN TG_OP = 'UPDATE' THEN row_to_json(OLD) ELSE NULL END,
        'type', TG_OP
      ),
      headers := '{"Content-Type": "application/json"}'::jsonb
    ) INTO request_id;
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'notify_agendamentos_n8n failed for company % to %: %', NEW.company_id, webhook_url, SQLERRM;
  END;

  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.notify_agendamentos_n8n()
IS 'Sends agendamentos insert/status updates to webhook URL configured in app_settings.integracoes.activepieces_reservas_webhook_url, with legacy fallback.';
