-- Migration: 20260331175000_notify_whatsapp_delivery_dispatched
-- Objetivo: Enviar notificação WhatsApp via Evolution API server-side (Supabase trigger)
--           quando um pedido delivery muda para status 'dispatched'.
--           Motivo: chamada direta do browser é bloqueada por CORS.
-- Armazenamento: credenciais lidas de public.app_settings (key='integracoes') por company_id.

CREATE OR REPLACE FUNCTION public.notify_whatsapp_delivery_dispatched()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  evo_api_url  text;
  evo_api_key  text;
  instance_name text;
  phone        text;
  customer     text;
  msg_text     text;
  payload      jsonb;
  request_id   bigint;
BEGIN
  -- Só processa: delivery, saindo para entrega, com telefone do cliente
  IF NEW.status <> 'dispatched'
     OR NEW.order_type <> 'delivery'
     OR NEW.customer_phone IS NULL
     OR NEW.customer_phone = '' THEN
    RETURN NEW;
  END IF;

  -- Ler configuração da Evolution API para esta empresa
  SELECT
    NULLIF(TRIM(value->>'evo_api_url'), ''),
    NULLIF(TRIM(value->>'evo_api_key'), '')
  INTO evo_api_url, evo_api_key
  FROM public.app_settings
  WHERE company_id = NEW.company_id
    AND key = 'integracoes'
  LIMIT 1;

  -- Fallback para valores padrão (instância única por ora)
  evo_api_url  := COALESCE(evo_api_url, 'https://evolution-api-production-203d4.up.railway.app');
  instance_name := NEW.company_id::text;

  IF evo_api_key IS NULL OR evo_api_key = '' THEN
    RAISE NOTICE '[WhatsApp Dispatch] evo_api_key ausente para company_id=%, pulando notificação.', NEW.company_id;
    RETURN NEW;
  END IF;

  -- Normalizar telefone: garantir prefixo 55 (Brasil)
  phone := REGEXP_REPLACE(NEW.customer_phone, '[^0-9]', '', 'g');
  IF LEFT(phone, 2) <> '55' THEN
    phone := '55' || phone;
  END IF;

  -- Nome do cliente (fallback genérico)
  customer := COALESCE(NULLIF(TRIM(NEW.client_name), ''), 'Cliente');

  -- Montar mensagem
  msg_text := format(
    'Olá %s! O motoboy saiu com sua entrega da comanda %s. Em breve estará na sua porta!',
    customer,
    NEW.comanda_number::text
  );

  -- Payload para Evolution API v2
  payload := jsonb_build_object(
    'number', phone,
    'text',   msg_text
  );

  RAISE NOTICE '[WhatsApp Dispatch] Enviando para phone=%, comanda=%, company=%',
    phone, NEW.comanda_number, NEW.company_id;

  -- Envio assíncrono via pg_net
  SELECT net.http_post(
    url     := evo_api_url || '/message/sendText/' || instance_name,
    body    := payload,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'apikey', evo_api_key
    )
  ) INTO request_id;

  RAISE NOTICE '[WhatsApp Dispatch] Enfileirado request_id=% para comanda=%', request_id, NEW.comanda_number;

  RETURN NEW;
END;
$$;

-- Trigger: dispara AFTER UPDATE apenas quando status muda para 'dispatched'
DROP TRIGGER IF EXISTS on_delivery_dispatched_whatsapp ON public.orders;

CREATE TRIGGER on_delivery_dispatched_whatsapp
  AFTER UPDATE OF status
  ON public.orders
  FOR EACH ROW
  WHEN (OLD.status IS DISTINCT FROM NEW.status AND NEW.status = 'dispatched')
  EXECUTE FUNCTION public.notify_whatsapp_delivery_dispatched();

COMMENT ON FUNCTION public.notify_whatsapp_delivery_dispatched() IS
  'Envia notificação WhatsApp via Evolution API quando pedido delivery muda para dispatched. Server-side para evitar CORS do browser.';
