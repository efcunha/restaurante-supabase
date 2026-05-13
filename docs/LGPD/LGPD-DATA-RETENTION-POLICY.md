# LGPD Data Retention Policy — restaurante-supabase

**Version**: 1.1  
**Effective Date**: 2026-03-23  
**Last Updated**: 2026-04-01  
**Next Review**: 2026-07-01  
**Owner**: Legal + Data Protection Officer  

## Purpose

Define lawful basis and retention periods for all personal data collected in accordance with LGPD (Lei Geral de Proteção de Dados Pessoais) and related Brazilian regulations.

**Audit Frequency**: Quarterly

---

## Data Categories & Retention Schedule

### 1. Customer Data (Clientes)

| Category | Data | Lawful Basis | Retention Period | Deletion Method |
|----------|------|--------------|------------------|-----------------|
| **Identity** | Name, email, phone | Contractual (provide service) | Service + 6 months** | Anonymize or delete |
| **Payment** | CPF, payment method ID (not PAN*) | Contractual + Legal | 5 years (fiscal) | Archive + delete |
| **Address** | Delivery address, location | Contractual (fulfill orders) | Duration of contract + 2 years | Anonymize |
| **Preferences** | Dietary restrictions, favorites | Consent (improve service) | Duration of consent | Delete upon revoke |
| **Marketing** | Email, phone consent status | Consent (marketing emails) | Duration of consent | Delete upon revoke |
| **Usage** | Order history, login timestamps | Legitimate interest (fraud detection) | 3 years | Anonymize |

*PAN = Primary Account Number (full card number) — **never stored** per PCI-DSS

**Post-service retention rationale: Chargeback/dispute window after order completion

### 2. Employee Data (Funcionários)

| Category | Data | Lawful Basis | Retention Period | Deletion Method |
|----------|------|--------------|------------------|-----------------|
| **Identity** | Name, CPF, email, phone | Legal (labor law, tax) | Duration + 5 years (labor/tax) | Archive + redact |
| **Employment** | Role, salary, work schedule | Contractual | Duration + 10 years (Consolidação das Leis do Trabalho) | Archive |
| **Performance** | Time tracking, order stats | Legitimate interest (management) | 3 years | Anonymize |
| **Background Check** | Previous employer verification | Consent | 1 year (if not hired); keep if employed | Delete if rejected |
| **Training** | Certification, training records | Legal (labor compliance) | 5 years (regulatory) | Archive |

### 3. Delivery Partner Data (Parceiros de Entrega)

| Category | Data | Lawful Basis | Retention Period | Deletion Method |
|----------|------|--------------|------------------|-----------------|
| **Identity** | Name, CPF, phone, email | Contractual | Contract duration + 3 years | Anonymize |
| **Bank Account** | Account for payment transfer | Contractual | Contract duration + 1 year | Delete |
| **Location Tracking** | GPS coordinates, delivery routes | Legitimate interest (logistics) | 30 days | Auto-delete |
| **Performance** | Delivery time, ratings, issues | Legitimate interest (quality) | 2 years | Anonymize |
| **Vehicle** | License plate, vehicle type | Contractual (identification) | Contract duration | Delete |

### 4. Payment & Financial Data (Dados de Pagamento)

| Category | Data | Lawful Basis | Retention Period | Deletion Method |
|----------|------|--------------|------------------|-----------------|
| **Transaction ID** | Order ID, amount, timestamp | Legal (fiscal law) | 5 years (CFP) | Archive (immutable) |
| **Gateway Response** | Mercado Pago status, auth code | Legal (dispute resolution) | 2 years (chargeback window) | Archive after period |
| **Webhook Events** | Payment notifications, logs | Legal (audit trail) | 3 years (regulatory audit) | Archive + redact |
| **Invoice Data** | Issued invoice, tax details | Legal (NFe, tax authority) | 10 years (tax law) | Archive (immutable) |

### 5. System & Security Logs (Logs de Sistema)

| Category | Data | Lawful Basis | Retention Period | Deletion Method |
|----------|------|--------------|------------------|-----------------|
| **IP/Session** | Login IP, session tokens, user-agent | Legitimate interest (security) | 30 days | Auto-delete |
| **Audit Trail** | Who changed what, when, why | Legal (compliance audit) | 3 years | Archive + immutable |
| **Error Logs** | Stack traces, request data | Legitimate interest (debugging) | 7 days | Auto-purge |
| **API Requests** | Request/response logs (sanitized) | Legitimate interest (troubleshooting) | 14 days | Auto-purge |

### 6. Marketing & Communication (Marketing)

| Category | Data | Lawful Basis | Retention Period | Deletion Method |
|----------|------|--------------|------------------|-----------------|
| **Email List** | Email, subscription status, open rate | Consent | Duration of consent | Delete on revoke |
| **SMS Records** | Phone, message content, delivery status | Consent | Duration of consent + 30 days | Delete after 30d |
| **Campaign Data** | Click-through, engagement metrics | Legitimate interest (analytics) | 1 year | Anonymize |
| **Cookie Consent** | Consent choice, date, version accepted | Legal (LGPD Art. 7) | 2 years | Delete after period |

---

## Compliance with External Regulations

### Brazilian Tax Law (CFP)
- **Retention**: 5 years for invoices, payment records
- **Exception**: No deletion permitted; only archive/immutable storage
- **Audit**: Tax authority (Receita Federal) may request at any time

### Labor Law (CLT)
- **Retention**: 5 years after contract end for tax documents
- **FGTS Records**: Lifetime (employer liable for pension funds)
- **Exception**: Background checks, training records per company policy

### Payment Processing (PCI-DSS)
- **Restricted**: NO full PAN, CVV, or PIN ever stored
- **Tokens Only**: Mercado Pago tokenizes; we store ID only
- **Retention**: Token ID lifetime of account; no archival required

### Consumer Protection (Código de Defesa do Consumidor)
- **Warranty**: Keep order data for 30 days (standard warranty period)
- **Chargeback**: Keep payment records for 180 days (dispute window)

---

## Automated Retention & Purge Procedures

### Batch Jobs (Scheduled)

**Daily (02:00 UTC)**:
```sql
-- Purge old login/session logs (>30 days)
DELETE FROM public.audit_logs 
WHERE event_type IN ('login', 'session_start') 
  AND created_at < NOW() - INTERVAL '30 days';

-- Auto-delete anonymous IP logs
DELETE FROM public.request_logs 
WHERE created_at < NOW() - INTERVAL '7 days'
  AND contains_pii = FALSE;
```

**Weekly (Monday 03:00 UTC)**:
```sql
-- Archive old signed audit records (>3 years)
INSERT INTO public.audit_archive (SELECT * FROM public.audit_logs 
  WHERE created_at < NOW() - INTERVAL '3 years' AND archived = FALSE);

-- Anonymize inactive customer profiles (>2 years, no orders)
UPDATE public.customer_profiles 
SET name = 'User #' || LEFT(id::TEXT, 6), 
    email = NULL,
    phone = NULL,
    updated_at = NOW()
WHERE last_order_date < NOW() - INTERVAL '2 years'
  AND NOT archived;
```

**Monthly (1st, 03:00 UTC)**:
```sql
-- Archive payment logs (post-chargeback, post-fiscal)
CALL archive_old_payments(retention_days := 730); -- 2 years

-- Anonymize delivery partner location history (>30 days)
DELETE FROM public.delivery_gps_log 
WHERE recorded_at < NOW() - INTERVAL '30 days';
```

### Retention Validation Report

```sql
-- Generate monthly compliance report
SELECT 
  table_name,
  COUNT(*) AS current_records,
  MIN(created_at) AS oldest_record,
  MAX(created_at) AS newest_record,
  (EXTRACT(DAY FROM NOW() - MIN(created_at)) / 30)::INT AS age_months,
  CASE 
    WHEN age_months > retention_months THEN '⚠️ EXCEEDS RETENTION'
    ELSE '✓ Compliant'
  END AS status
FROM (
  SELECT 'customer_profiles' as table_name, created_at 
    FROM public.customer_profiles
  UNION ALL
  SELECT 'orders', created_at FROM public.orders
  UNION ALL
  SELECT 'audit_logs', created_at FROM public.audit_logs
  UNION ALL
  SELECT 'delivery_logs', created_at FROM public.delivery_logs
) data
CROSS JOIN (
  SELECT 24 as retention_months UNION ALL
  SELECT 60 UNION ALL
  SELECT 36 UNION ALL
  SELECT 24
) config
GROUP BY table_name
ORDER BY status DESC, age_months DESC;
```

---

## Data Subject Rights & Retention

### Right to Access (LGPD Art. 18)
- Provide copy of personal data: 15-day SLA
- Include: purpose, retention period, third-party recipients

### Right to Deletion (LGPD Art. 17 — "Direito ao Esquecimento")
- **Allowed**: If data not required by law (tax, payment disputes)
- **Method**: Anonymization preferred over hard deletion
- **Exception**: Fiscal records (CFP 5-year hold), chargeback window (180 days)

### Right to Portability (LGPD Art. 20)
- Provide all personal data in structured, machine-readable format (JSON/CSV)
- Within 15 days
- Include all processing done with that data

### Right to Consent Revocation (LGPD Art. 8, 9, 14)
- Stop processing immediately upon revoke
- Marketing emails: Stop within 24 hours
- Non-essential processing: Stop within 7 days
- Keep deletion record for 3 years (LGPD proof)

---

## Breach Notification (Incidente de Segurança)

### If Personal Data Breach Occurs

1. **Assess Severity** (within 24 hours)
   - What data? (PII, payment, etc.)
   - How many people? (notification threshold)
   - What's the risk?

2. **Notify ANPD** (if risk to fundamental rights)
   - Form: ANPD Incidente de Segurança report
   - Deadline: "Without unreasonable delay" (typically <30 days)
   - Content: What, when, impact, remediation

3. **Notify Data Subjects** (if high risk)
   - Email + SMS to affected users
   - Details: What data, mitigation steps, support contact
   - Deadline: As soon as notification needed (per LGPD Art. 27)

4. **Notification Registry** (LGPD Art. 27)
   ```sql
   CREATE TABLE IF NOT EXISTS public.security_breach_notifications (
     id UUID PRIMARY KEY,
     date_detected TIMESTAMPTZ,
     data_affected TEXT,
     people_affected INT,
     severity TEXT, -- 'high', 'medium', 'low'
     anpd_notified BOOLEAN,
     anpd_notification_date TIMESTAMPTZ,
     data_subjects_notified INT,
     remediation_steps TEXT,
     created_at TIMESTAMPTZ DEFAULT NOW()
   );
   ```

---

## Exceptions & Legal Holds

### Data NOT Affected by Retention Policy

1. **Contractual Disputes**: Hold during litigation (court order)
2. **Tax Audits**: Hold during active investigation (statutory hold)
3. **Criminal Investigation**: Comply with Polícia Federal request
4. **Insurance Claims**: Hold for claim period + 2 years (proof of contract)

---

## Review & Amendment

**Policy Review**: Annually or upon regulation change
**Last Reviewed**: 2026-03-23
**Next Review**: 2027-03-23

**Amendments**:
- Changes to LGPD interpretation
- New regulatory requirements
- Changes to business model (new data categories)
- Incident/breach lessons learned

---

## Appendix: Table-by-Table Retention Matrix

| Table | PII Level | Retention | Archive? | Deletion Safe? |
|-------|-----------|-----------|----------|----------------|
| public.companies | Low | ∞ (contract active) | N/A | Anonymize only |
| public.users | High | Contract + 6mo | Yes | Anonymize post-chargeback |
| public.customer_profiles | High | 6mo inactive | Yes | Anonymize after 2yr |
| public.orders | Medium | 2yr | Yes | Anonymize after 2yr |
| public.pagamentos | High | 5yr (fiscal) | Yes (immutable) | ARCHIVE ONLY |
| public.audit_logs | Low-Med | 3yr | Yes | Anonymize PII before purge |
| public.delivery_logs | Medium | 30d (location) | No | Auto-purge daily |
| public.marketing_consents | Medium | Duration + 60d | No | Delete on revoke |
| public.api_request_logs | Low | 7d | No | Auto-purge |
| public.lgpd_dsar_requests | High | 3yr | Yes | Immutable (proof) |
