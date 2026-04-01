# LGPD Operational Program — restaurante-supabase
# Data Subject Access Request (DSAR) Workflow

## Overview

This document defines the operational procedures for handling LGPD Data Subject Access Requests (Direito do Titular, Artigo 18 LGPD).

**Owner**: Legal + Engineering  
**SLA**: 15 days (per LGPD Art. 18)  
**Escalation**: Any request must be processed; inability to fulfill requires documented justification

---

## Request Receipt & Validation

### 1. Intake Channel
- **Email**: privacy@[domain.com] (to be configured)
- **Web Form**: Accessible at /privacy-dsar (in-app or website)
- **Support Ticket**: Through existing support system
- **In-person**: At restaurant location (capture method)

### 2. Validation Checklist
```
☐ Requester identity confirmed (email, phone, document number)
☐ Request is clear and unambiguous
☐ Data subject relationship identified (customer, employee, delivery partner)
☐ Request categorized by type:
  - Portability (Art. 19): Export personal data
  - Access (Art. 18): View collected data
  - Deletion (Art. 17): Remove personal data
  - Correction (Art. 19): Fix inaccurate data
  - Revoke Consent (Art. 8): Stop processing
```

### 3. Acknowledgment
- Send receipt within 24 hours
- Confirm SLA (15 days) + expected fulfillment approach
- Provide case reference number

---

## Data Identification & Extraction

### 4.1 Locate Personal Data by Category

**Core Tables**:
```sql
-- Customers (restaurante-web)
SELECT * FROM public.companies WHERE company_id = $1;
SELECT * FROM public.users WHERE company_id = $1;
SELECT * FROM public.customer_profiles WHERE company_id = $1;

-- Orders & Payments (restaurante-web, restaurante-app)
SELECT * FROM public.orders WHERE company_id = $1;
SELECT * FROM public.pagamentos WHERE company_id = $1;
SELECT * FROM public.billing_audit_log WHERE company_id = $1;

-- Delivery Data
SELECT * FROM public.delivery_partners WHERE company_id = $1;
SELECT * FROM public.delivery_logs WHERE company_id = $1;

-- Marketing/Communication
SELECT * FROM public.marketing_consents WHERE company_id = $1 AND data_subject_id = $2;
```

### 4.2 PII Sanitization

**Before exporting, remove/mask**:
- Card tokens (never store full PAN in audit logs)
- CPF/CNPJ (mask to last 4 digits in report)
- Passwords/secrets (exclude entirely)
- IP addresses in logs (unless essential to request type)

**Query Pattern**:
```sql
SELECT 
  id,
  name,
  email,
  LEFT(cpf, 3) || '***' || RIGHT(cpf, 2) AS cpf_masked,
  phone,
  created_at
FROM public.customer_profiles
WHERE company_id = $1 AND id = $2;
```

### 4.3 Export Format

**For Portability (Art. 19)**: JSON + CSV (UTF-8)
```json
{
  "customer_profile": {
    "id": "uuid",
    "name": "João Silva",
    "email": "joao@example.com",
    "phone": "+5511999999999",
    "cpf_masked": "123***89",
    "address": "...",
    "created_at": "2025-11-15T10:30:00Z"
  },
  "orders": [
    {
      "order_id": "uuid",
      "status": "completed",
      "total": 150.50,
      "items": [...],
      "created_at": "2025-12-01T18:45:00Z"
    }
  ],
  "export_date": "2026-03-23T14:30:00Z",
  "export_reference": "DSAR-2026-03-12345"
}
```

**For Access (Art. 18)**: HTML report + printable PDF
**For Deletion (Art. 17)**: Confirmation record + before/after counts

---

## Fulfillment & Response

### 5.1 Access/Portability

```
1. Extract data per section 4
2. Generate formatted report
3. Send via secure link (expires in 15 days)
4. Include:
   - List of all personal data categories
   - Stated purposes for each data category
   - Data retention schedule
   - Third-party recipients (if any)
```

### 5.2 Deletion (Direito de Apagar)

```
1. Validate request scope (all data? specific category?)
2. Identify deletion impact:
   - Regulatory retention requirements (fiscal, payment)
   - Open orders requiring fulfillment
   - Anonymization vs. hard delete
3. Execute deletion (SQL + Edge Function audit):
   ```pgsql
   -- Safe deletion: mask data instead of hard delete
   UPDATE public.customer_profiles
   SET 
     name = 'Usuário Deletado',
     email = 'deleted_' || id || '@[domain]',
     phone = NULL,
     address = NULL,
     birth_date = NULL,
     cpf = NULL,
     updated_at = NOW(),
     deleted_by_request = TRUE
   WHERE id = $1 AND company_id = $2;
   ```
4. Log deletion to audit_log (tamper-proof)
5. Send confirmation: deleted, retained (with reason), anonymized
```

### 5.3 Correction (Direito de Retificação)

```
1. Receive correction request with proof (e.g., recent CPF, address change)
2. Verify requester identity again
3. Update data:
   UPDATE public.customer_profiles SET ... WHERE id = $1;
4. Log change: who, when, old value, new value
5. Notify data subject: correction applied
```

### 5.4 Consent Revocation (Revogar Consentimento)

```
1. Identify consent scope (marketing? cookies? profiling?)
2. Update consent record:
   UPDATE public.marketing_consents 
   SET consented = FALSE, revoked_at = NOW() 
   WHERE data_subject_id = $1;
3. Stop processing immediately (marketing emails, analytics)
4. Provide opt-out confirmation
```

---

## Documentation & Audit Trail

### 6.1 Request Log

Every DSAR must be recorded in a tamper-proof audit table:

```sql
CREATE TABLE IF NOT EXISTS public.lgpd_dsar_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_type TEXT NOT NULL, -- 'access', 'portability', 'deletion', 'correction', 'revoke'
  requester_email TEXT NOT NULL,
  requester_cpf_masked TEXT,
  data_subject_id UUID, -- NULL if external requester
  request_date TIMESTAMPTZ NOT NULL,
  request_description TEXT,
  fulfillment_deadline TIMESTAMPTZ NOT NULL, -- request_date + 15 days
  fulfillment_date TIMESTAMPTZ,
  fulfillment_method TEXT, -- 'email', 'download_link', 'in_person'
  fulfillment_notes TEXT,
  processed_by TEXT, -- employee email
  status TEXT NOT NULL, -- 'pending', 'under_review', 'fulfilled', 'denied'
  denial_reason TEXT, -- required if status = 'denied'
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX lgpd_dsar_requests_data_subject_id 
  ON public.lgpd_dsar_requests(data_subject_id);
CREATE INDEX lgpd_dsar_requests_status 
  ON public.lgpd_dsar_requests(status);
```

### 6.2 Processing Checklist (Per Request)

```
Reference: DSAR-YYYY-MM-XXXXX

☐ Request received & dated
☐ Requester identity verified
☐ Request type classified
☐ Data subject located in system
☐ Data extraction completed
☐ PII sanitization/masking applied
☐ Response prepared (format: _____)
☐ Legal review (if deletion/sensitive)
☐ Fulfillment sent
☐ Delivery confirmed (email read, download confirmed, etc.)
☐ Audit record created
☐ Retention period noted (destroy after 3 years per LGPD record-keeping)

Processed By: _________________  Date: _________
```

---

## Special Cases

### 7.1 Deletion Conflicts

**Scenario**: Customer requests deletion, but has open order with payment dispute.

**Resolution**:
1. Mask PII (name, email, phone, address)
2. RETAIN order record for 6 months (payment chargeback window)
3. RETAIN transaction record for 5 years (fiscal law)
4. Notify requester: "Personal data masked. Transaction records retained for legal compliance."

### 7.2 Multiple Requests (Same Customer)

If same customer requests portability, then deletion, then revoke consent:
1. Track all requests in one DSAR record with statuses
2. Coordinate timing (deletion voids previous portability)
3. Document sequence in audit log

### 7.3 Third-Party Data Requests

If external entity (e.g., delivery partner) collects data on behalf:
1. Clarify data controller vs. processor (LGPD Art. 5)
2. If processor: forward request to controller + document
3. If controller: follow standard DSAR flow

---

## Denial Criteria

DSAR **may be denied** only if:

1. **Identity cannot be verified** (after 2 attempts)
2. **Request is manifestly unfounded** (e.g., does not relate to stored data)
3. **Disproportionate effort** to fulfill (rare; usually requires proof)
4. **Legal obligation** to retain data (fiscal, payment chargeback, court order)
5. **Conflict with third-party rights** (e.g., deletion would breach employment contract)

**Denial process**:
- Document reason in DSAR audit record
- Notify requester in writing (email)
- Provide appeal mechanism (submit to privacy@[domain])
- Keep record for 3 years (LGPD compliance proof)

---

## Tools & SQL Utilities

### Query: Find all data for a given data subject

```sql
-- Run against each data_subject_id (email or CPF hash lookup first)
SELECT 
  'customer_profiles' AS table_name,
  COUNT(*) AS record_count,
  MIN(created_at) AS oldest_record,
  MAX(updated_at) AS most_recent
FROM public.customer_profiles
WHERE id = $1 -- data_subject_id
GROUP BY table_name

UNION ALL

SELECT 
  'orders',
  COUNT(*),
  MIN(created_at),
  MAX(updated_at)
FROM public.orders
WHERE company_id IN (
  SELECT company_id FROM public.customer_profiles WHERE id = $1
)

UNION ALL

SELECT 
  'delivery_logs',
  COUNT(*),
  MIN(created_at),
  MAX(updated_at)
FROM public.delivery_logs
WHERE delivery_partner_id = $1 OR customer_id = $1;
```

### Script: Safe deletion (anonymization)

```sql
-- Function to anonymize customer data (does NOT delete)
CREATE OR REPLACE FUNCTION public.anonymize_customer(customer_id UUID, reason TEXT)
RETURNS TABLE(rows_affected INT, anonymized BOOLEAN) AS $$
DECLARE
  rows_updated INT := 0;
BEGIN
  UPDATE public.customer_profiles
  SET 
    name = 'Usuário #' || LEFT(id::TEXT, 8),
    email = 'anon_' || EXTRACT(EPOCH FROM NOW())::TEXT || '@anonymous',
    phone = NULL,
    cpf = NULL,
    birth_date = NULL,
    updated_at = NOW()
  WHERE id = customer_id
  RETURNING 1 INTO rows_updated;
  
  INSERT INTO public.lgpd_dsar_requests 
    (request_type, data_subject_id, status, fulfillment_date, processed_by)
  VALUES 
    ('deletion', customer_id, 'fulfilled', NOW(), current_user);
  
  RETURN QUERY SELECT rows_updated::INT, TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Usage:
SELECT * FROM anonymize_customer('uuid-here', 'LGPD deletion request');
```

---

## Reporting & Metrics

**Quarterly LGPD Compliance Report**:
```
Total DSARs received: ___
- Access requests: ___
- Portability requests: ___
- Deletion requests: ___
- Correction requests: ___
- Revocation requests: ___

Fulfillment time (avg): ___ days (SLA: 15)
Denial count: ___
- Reason: identity verification (__)
- Reason: legal retention (__) 
- Reason: already anonymized (__)

Data breaches reported: ___
Complaints received: ___
Appeals received: ___
```

---

## References

- LGPD (Lei Geral de Proteção de Dados Pessoais) Art. 18-19, 23
- ANPD (Autoridade Nacional de Proteção de Dados) guidelines
- Mercado Pago & payment processor data retention requirements
