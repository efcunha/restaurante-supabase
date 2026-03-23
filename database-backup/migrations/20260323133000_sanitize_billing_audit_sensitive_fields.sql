-- =============================================================================
-- Migration: 20260323133000_sanitize_billing_audit_sensitive_fields.sql
-- Description: Removes sensitive payment artifacts from historical billing audit
--   records to reduce data exposure risk in logs/audit payloads.
-- Scope:
--   - card_last_four
--   - mp_payment_id / mp_card_id
--   - pix/qr raw fields if present in details
-- =============================================================================

UPDATE public.billing_audit_log
SET details = (
  COALESCE(details, '{}'::jsonb)
    - 'card_last_four'
    - 'mp_payment_id'
    - 'mp_card_id'
    - 'pix_qr_code'
    - 'pix_qr_code_text'
    - 'pixQrCode'
    - 'pixQrCodeText'
    - 'token'
    - 'access_token'
)
WHERE details ?| ARRAY[
  'card_last_four',
  'mp_payment_id',
  'mp_card_id',
  'pix_qr_code',
  'pix_qr_code_text',
  'pixQrCode',
  'pixQrCodeText',
  'token',
  'access_token'
];