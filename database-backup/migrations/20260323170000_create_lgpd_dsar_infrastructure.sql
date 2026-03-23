-- =============================================================================
-- Migration: 20260323170000_create_lgpd_dsar_infrastructure
-- Purpose   : LGPD Data Subject Access Request (DSAR) audit table and
--             customer anonymization function.
-- References: docs/LGPD-DSAR-OPERATIONAL-GUIDE.md (LGPD Art. 18)
--             docs/LGPD-DATA-RETENTION-POLICY.md
-- Security  : lgpd_dsar_requests is RLS-enabled + anon/authenticated revoked.
--             anonymize_customer_by_phone is SECURITY DEFINER / service_role only.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- Table: lgpd_dsar_requests
-- Tamper-proof audit log for every DSAR (LGPD Art. 19 §3 — must keep 3 years)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.lgpd_dsar_requests (
    id                   UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    request_type         TEXT        NOT NULL
                             CONSTRAINT lgpd_dsar_request_type_check
                             CHECK (request_type IN (
                                 'access', 'portability', 'deletion', 'correction', 'revoke'
                             )),
    company_id           UUID,                        -- NULL for external (non-tenant) requesters
    requester_email      TEXT        NOT NULL,
    requester_cpf_masked TEXT,
    data_subject_id      UUID,                        -- auth.users.id if available
    data_subject_phone   TEXT,
    request_date         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    request_description  TEXT,
    -- SLA: 15 days per LGPD Art. 19 — populated by trigger on insert
    fulfillment_deadline TIMESTAMPTZ,
    fulfillment_date     TIMESTAMPTZ,
    fulfillment_method   TEXT
                             CONSTRAINT lgpd_dsar_method_check
                             CHECK (fulfillment_method IN ('email', 'download_link', 'in_person')
                                    OR fulfillment_method IS NULL),
    fulfillment_notes    TEXT,
    processed_by         TEXT,                        -- email of DPO / admin
    status               TEXT        NOT NULL DEFAULT 'pending'
                             CONSTRAINT lgpd_dsar_status_check
                             CHECK (status IN ('pending', 'under_review', 'fulfilled', 'denied')),
    denial_reason        TEXT,
    created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for DPO dashboard queries
CREATE INDEX IF NOT EXISTS lgpd_dsar_company_id_idx
    ON public.lgpd_dsar_requests (company_id)
    WHERE company_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS lgpd_dsar_data_subject_id_idx
    ON public.lgpd_dsar_requests (data_subject_id)
    WHERE data_subject_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS lgpd_dsar_status_idx
    ON public.lgpd_dsar_requests (status);

CREATE INDEX IF NOT EXISTS lgpd_dsar_request_date_idx
    ON public.lgpd_dsar_requests (request_date DESC);

-- Auto-update updated_at on every row change, and set fulfillment_deadline on INSERT
CREATE OR REPLACE FUNCTION public.lgpd_dsar_set_deadline_and_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    IF TG_OP = 'INSERT' AND NEW.fulfillment_deadline IS NULL THEN
        NEW.fulfillment_deadline = NEW.request_date + INTERVAL '15 days';
    END IF;
    IF TG_OP = 'UPDATE' THEN
        NEW.updated_at = NOW();
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS lgpd_dsar_updated_at ON public.lgpd_dsar_requests;
CREATE TRIGGER lgpd_dsar_updated_at
    BEFORE INSERT OR UPDATE ON public.lgpd_dsar_requests
    FOR EACH ROW EXECUTE FUNCTION public.lgpd_dsar_set_deadline_and_updated_at();

-- ---------------------------------------------------------------------------
-- Row Level Security: only service_role (ops backend) can access DSAR records.
-- anon / authenticated have NO access — this is a DPO-only table.
-- ---------------------------------------------------------------------------
ALTER TABLE public.lgpd_dsar_requests ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.lgpd_dsar_requests FROM anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON public.lgpd_dsar_requests TO service_role;

-- Restrict sequence access if auto-generated
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_sequences
        WHERE schemaname = 'public' AND sequencename = 'lgpd_dsar_requests_id_seq'
    ) THEN
        REVOKE ALL ON SEQUENCE public.lgpd_dsar_requests_id_seq FROM anon, authenticated;
    END IF;
END;
$$;

-- ---------------------------------------------------------------------------
-- Function: anonymize_customer_by_phone
-- Anonymizes PII columns in public.orders for a given company + phone number.
-- Records a 'deletion' DSAR audit entry automatically.
--
-- Parameters:
--   p_company_id   UUID   - company (multi-tenant isolation enforced)
--   p_phone        TEXT   - customer_phone to look up
--   p_reason       TEXT   - human-readable reason (stored in DSAR log)
--   p_requested_by TEXT   - email of DPO / operator processing the request
--
-- Returns: orders_anonymized INT, request_id UUID
--
-- Security: SECURITY DEFINER, search_path locked, execution restricted to
--           service_role only.  Call from restaurante-ops backend only.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.anonymize_customer_by_phone(
    p_company_id     UUID,
    p_phone          TEXT,
    p_reason         TEXT,
    p_requested_by   TEXT
)
RETURNS TABLE(orders_anonymized INT, request_id UUID)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_rows_affected INT  := 0;
    v_request_id    UUID := gen_random_uuid();
    v_anon_suffix   TEXT := LEFT(v_request_id::TEXT, 8);
BEGIN
    -- Anonymize PII in orders (multi-tenant: company_id enforced)
    UPDATE public.orders
    SET
        client_name      = 'Anonimizado-' || v_anon_suffix,
        customer_phone   = NULL,
        delivery_address = CASE WHEN delivery_address IS NOT NULL
                               THEN '[removido LGPD]'
                               ELSE NULL
                           END,
        updated_at       = NOW()
    WHERE company_id   = p_company_id
      AND customer_phone = p_phone;

    GET DIAGNOSTICS v_rows_affected = ROW_COUNT;

    -- Mandatory DSAR audit record (LGPD Art. 19 §3)
    INSERT INTO public.lgpd_dsar_requests (
        id,
        request_type,
        company_id,
        requester_email,
        data_subject_phone,
        request_description,
        status,
        fulfillment_date,
        processed_by,
        request_date
    ) VALUES (
        v_request_id,
        'deletion',
        p_company_id,
        p_requested_by,
        p_phone,
        p_reason,
        'fulfilled',
        NOW(),
        p_requested_by,
        NOW()
    );

    RETURN QUERY SELECT v_rows_affected, v_request_id;
END;
$$;

-- Restrict: only service_role may call this function
REVOKE EXECUTE ON FUNCTION public.anonymize_customer_by_phone(UUID, TEXT, TEXT, TEXT)
    FROM anon, authenticated, PUBLIC;
GRANT EXECUTE ON FUNCTION public.anonymize_customer_by_phone(UUID, TEXT, TEXT, TEXT)
    TO service_role;

COMMENT ON FUNCTION public.anonymize_customer_by_phone IS
    'LGPD Art. 18 – Anonymizes customer PII (client_name, customer_phone, '
    'delivery_address) in public.orders by phone number. Restricted to '
    'service_role. Always records an audit entry in lgpd_dsar_requests.';
