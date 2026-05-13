-- Align order status webhook with the production Activepieces pedidos flow.
-- This removes the stale n8n test URL and sends the fields required by
-- the current local vs delivery routing in Activepieces.

CREATE OR REPLACE FUNCTION public.notify_n8n_pedido_status()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  webhook_url text;
  payload jsonb;
  request_id bigint;
BEGIN
  SELECT COALESCE(
    NULLIF(value->>'activepieces_pedidos_webhook_url', ''),
    NULLIF(value->>'pedidos_webhook_url', ''),
    'https://activepieces-production-4e63.up.railway.app/api/v1/webhooks/jtW3UuIn24Wg415GQ0sHW'
  )
  INTO webhook_url
  FROM public.app_settings
  WHERE company_id = NEW.company_id
    AND key = 'integracoes'
  LIMIT 1;

  IF webhook_url IS NULL OR webhook_url = '' THEN
    webhook_url := 'https://activepieces-production-4e63.up.railway.app/api/v1/webhooks/jtW3UuIn24Wg415GQ0sHW';
  END IF;

  payload := jsonb_build_object(
    'pedido_id', NEW.id,
    'company_id', NEW.company_id,
    'comanda_numero', NEW.comanda_number,
    'comanda_number', NEW.comanda_number,
    'status_antigo', OLD.status,
    'status_novo', NEW.status,
    'cliente_nome', NEW.client_name,
    'client_name', NEW.client_name,
    'total', NEW.total_amount,
    'total_amount', NEW.total_amount,
    'payment_method', COALESCE(NEW.payment_method, 'pix'),
    'order_type', COALESCE(NEW.order_type, 'local'),
    'customer_phone', NEW.customer_phone,
    'delivery_address', NEW.delivery_address,
    'delivery_fee', NEW.delivery_fee,
    'date_key', NEW.date_key,
    'data_atualizacao', now()
  );

  RAISE NOTICE 'Enviando webhook de pedido para Activepieces: %', payload;

  SELECT net.http_post(
    url := webhook_url,
    body := payload,
    headers := '{"Content-Type": "application/json"}'::jsonb
  ) INTO request_id;

  RAISE NOTICE 'Webhook de pedido enfileirado com request_id=%', request_id;

  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.notify_n8n_pedido_status()
IS 'Sends order status updates to the Activepieces pedidos webhook using app_settings.integracoes.activepieces_pedidos_webhook_url, with production fallback.';