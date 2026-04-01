# Security Incident Response Plan — restaurante-supabase

**Version**: 1.1  
**Effective Date**: 2026-03-23  
**Last Updated**: 2026-04-01  
**Next Review**: 2026-07-01  
**Owner**: Security + Legal + Engineering  

## Overview

Playbook for responding to security incidents, data breaches, and LGPD violations in restaurante-supabase POS system.

---

## Incident Classification

### Severity Levels

| Level | Description | Response Time | Escalation |
|-------|-------------|----------------|-----------|
| **CRITICAL** | Confirmed data breach, active compromise, customer PII exposed | <1 hour | CEO, Legal, ANPD |
| **HIGH** | Security vulnerability in production, unauthorized access attempt | <4 hours | CTO, Security, Legal |
| **MEDIUM** | Suspicious activity, failed attack, policy violation | <24 hours | Engineering Lead, Security |
| **LOW** | Minor security issue, improvement opportunity | <7 days | Team Lead |

---

## Incident Response Phases

### Phase 1: DETECT & ASSESS (0-2 hours)

**Trigger**: Suspicious activity, security alert, customer report, third-party notice

```
☐ Receive incident report (email, monitoring alert, support ticket)
☐ Acknowledge receipt & assign incident ID: INC-YYYY-MM-XXXXX
☐ Open war room (Slack #security-incident, video call link)
☐ Identify on-call responders:
  - Incident Commander (IC): [Name/role]
  - Technical Lead: [Name/role]
  - Legal/Compliance: [Name/role]
  - Communications: [Name/role]
☐ Assess severity (CRITICAL/HIGH/MEDIUM/LOW)
☐ Document initial findings:
  - What happened?
  - When was it discovered?
  - Who reported it?
  - What systems affected?
☐ If CRITICAL/HIGH: Page on-call engineer + notify exec sponsor
```

### Phase 2: CONTAIN (2-6 hours)

**Goal**: Stop the bleeding, prevent further exposure

```
☐ PRESERVE EVIDENCE:
  - Capture affected server logs (tail -f /var/log/auth.log)
  - Screenshot unusual activity, dashboard alerts
  - Export relevant database queries (audit_logs, api_request_logs)
  - DO NOT delete logs during investigation
  - Store in secure evidence folder: /secure/incident/INC-YYYY-MM-XXXXX/

☐ ISOLATE IF NECESSARY:
  - If compromised API key: Rotate immediately
  - If rogue user session: Force logout (invalidate JWT, session token)
  - If SQL injection active: Deploy WAF rule, block IP
  - If malware detected: Isolate affected server from network

☐ VERIFY SCOPE:
  - Query audit_logs for abnormal activity (query suspicious IPs, users)
  - Check billing_audit_log for unauthorized payment changes
  - Check user_authentication_log for failed/unusual logins
  - Search for unauthorized data exports (delivery_logs, customer_profiles)

☐ NOTIFY STAKEHOLDERS (per escalation matrix):
  - Internal: CTO, Legal, Compliance Officer
  - External: Affected customers (if PII exposed) [PHASE 3]
  - Regulatory: ANPD (if breach confirmed) [PHASE 3]
  - Payment Processor: Mercado Pago (if payment data affected)

✓ CONTAIN COMPLETE: System isolated, evidence preserved, scope understood
```

**Evidence Query Examples**:

```sql
-- Find suspicious login activity
SELECT user_id, ip_address, signup_date, last_login, 
  EXTRACT(DAY FROM NOW() - created_at) AS age_days
FROM public.users
WHERE created_at > NOW() - INTERVAL '7 days'
  AND email_verified = FALSE
ORDER BY last_login DESC;

-- Detect unusual payment activity
SELECT id, company_id, customer_id, amount, status, created_at
FROM public.pagamentos
WHERE status = 'pending' 
  AND created_at > NOW() - INTERVAL '1 hour'
  AND amount > 10000; -- flag large unusual transactions

-- Find API key leaks (grep event logs)
SELECT * FROM public.audit_logs
WHERE event = 'api_key_created' 
  OR event = 'api_key_used_failed'
ORDER BY created_at DESC LIMIT 50;
```

### Phase 3: ERADICATE & RECOVER (6-48 hours)

**Goal**: Remove threat, restore system integrity, prevent recurrence

```
☐ ERADICATE THE THREAT:
  ✓ Revoke compromised credentials (API keys, JWT tokens, passwords)
  ✓ Apply security patch (if software vulnerability):
    - Build & deploy fixed version
    - Update all affected services
    - Verify in staging first, then production
  ✓ If account compromise: Reset password, enable MFA, review activity
  ✓ If database breach: Rotate database credentials, audit schema permissions
  ✓ If malware: Run antivirus scan, review running processes, update EDR

☐ RECOVER SYSTEMS:
  ✓ Restore from clean backup (if needed):
    - Pre-incident snapshot (verify clean)
    - Replay transaction logs post-incident
    - Validate data integrity
  ✓ Re-provision affected infrastructure:
    - Rebuild compromised servers
    - Redeploy code from verified source
    - Reinit secrets/credentials

☐ VALIDATE FIX:
  ✓ Reproduce attack path → verify it's blocked
  ✓ Run security tests (npm audit, SAST/DAST scans)
  ✓ Monitor for recurrence (next 72 hours)
  ✓ Document remediation: what was done, why, proof

✓ ERADICATE COMPLETE: Threat removed, system restored, validated
```

### Phase 4: INVESTIGATE & NOTIFY (1-15 days)

**Goal**: Root cause analysis, customer notification, regulatory reporting

```
☐ ROOT CAUSE ANALYSIS:
  - How did attacker gain access? (weak auth, unpatched bug, phishing)
  - How long was system compromised? (from [date] to [date])
  - What data was exposed? (customer names, emails, payment IDs)
  - Why wasn't this detected sooner? (missing monitoring, slow alerting)
  
  Template: "On [date], we discovered [attacker] accessed [system] via [method]. 
  The breach exposed [data] for [duration]. We immediately [action]."

☐ CUSTOMER NOTIFICATION (LGPD Art. 27):
  If personal data exposed → notify affected customers within 15 days
  
  Content:
  - What happened (brief, clear language)
  - What data exposed (categories, not individual records)
  - Our response (what we did to fix it)
  - Their action (password reset, monitor account, credit check)
  - Support contact (phone, email, hours)
  
  Channels:
  - Email (primary) + SMS backup
  - In-app notification + email confirmation
  - Press release / PR statement (if >100 customers affected)

☐ REGULATORY NOTIFICATION (LGPD):
  If HIGH risk to individuals → notify ANPD within reasonable time
  
  Form: ANPD Incidente de Segurança (https://www.gov.br/cidadania/pt-br/acesso-a-informacao/lgpd)
  Content:
  - Date & time of incident
  - Date & time of discovery
  - Description of affected data
  - Probable consequences
  - Measures taken to mitigate damage
  
  If PAYMENT DATA exposed → Notify Mercado Pago + credit card networks (PCI-DSS)

☐ CREATE INCIDENT RECORD:
  INSERT INTO public.security_incident_log (
    incident_id, detect_date, severity, affected_systems, 
    data_categories, customer_impact, notification_sent, 
    rgpd_reported, root_cause, remediation_date
  ) VALUES (...);

✓ NOTIFICATION COMPLETE: Customers informed, ANPD notified, records filed
```

**Notification Email Template**:

```
Subject: Security Notice — Account Verification Recommended

Dear [Customer Name],

We're writing to inform you of a security incident that may have affected your account.

WHAT HAPPENED:
On [date], we discovered unauthorized access to our payment processing system. 
We immediately took action to secure affected accounts.

WHAT DATA WAS AFFECTED:
- Email address
- Phone number
- First/last name
- Order history (NOT payment card details)

WHAT WE DID:
1. Isolated the compromised system within 2 hours
2. Revoked all compromised access credentials
3. Deployed security patches to prevent recurrence
4. Reviewed logs to identify affected customers
5. Notified regulatory authorities per Brazilian data protection law

WHAT YOU SHOULD DO:
1. Update your password at [login URL]
2. Enable two-factor authentication (Settings → Security)
3. Monitor your email & phone for unusual activity
4. Check your bank statements for unauthorized charges

SUPPORT:
If you have questions or suspect fraudulent activity, contact:
📧 privacy@restaurantesupabase.com
📞 +55 11 3000-0000 (9am-6pm BRT, weekdays)

We sincerely apologize for this incident and appreciate your vigilance.

Best regards,
[Company Name] Security Team

---
Incident Reference: INC-2026-03-00001
```

### Phase 5: POST-INCIDENT (1-4 weeks)

**Goal**: Lessons learned, preventive measures, process improvement

```
☐ LESSONS LEARNED MEETING:
  Attendees: IC, Engineering Lead, Security, Legal, Product
  Timeline: 3-5 days post-incident
  Agenda:
  1. What worked well? (detection speed? response? communication?)
  2. What didn't work? (slow patching? unclear escalation?)
  3. What should we do differently next time?
  4. What systemic issues need fixing?

☐ PREVENTIVE MEASURES:
  For each root cause, create a ticket:
  - "Implement rate limiting on login endpoint" → CRITICAL
  - "Add SIEM alerts for suspicious IP activity" → HIGH
  - "Automate security patch deployment" → MEDIUM
  - "Improve incident response documentation" → LOW
  
  Track in GitHub Issues, assign owners, set SLAs

☐ PROCESS IMPROVEMENTS:
  Update this playbook based on what we learned:
  - Clarify escalation paths (if unclear)
  - Add monitoring thresholds (if gaps found)
  - Improve tooling (if manual steps too slow)
  - Update templates (if communication failed)

☐ INCIDENT REVIEW SIGN-OFF:
  Final approval: CISO / Legal / CTO
  Store in incident archive: /secure/incident/INC-YYYY-MM-XXXXX/
  
  Include:
  - Incident summary (1 page)
  - Timeline (detailed)
  - Root cause analysis
  - Remediation steps
  - Preventive measures assigned
  - Compliance documentation (ANPD, customers, etc.)

✓ INCIDENT CLOSED: Record archived, lessons learned, improvements tracked
```

---

## Escalation Matrix

| Issue Type | On-Call | Incident Commander | CTO | CEO | Legal | ANPD |
|-----------|---------|-------------------|-----|-----|-------|------|
| Unconfirmed suspicious activity | ✓ | - | - | - | - | - |
| Confirmed unauthorized access | ✓ | ✓ | ✓ | - | - | - |
| Customer data exposed | ✓ | ✓ | ✓ | ✓ | ✓ | - |
| Payment data breach | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| Regulatory investigation | - | ✓ | ✓ | ✓ | ✓ | ✓ |

---

## Monitoring & Alerting

### Key Metrics to Monitor

```yaml
- Failed login attempts per IP (threshold: 5+ per minute)
- Unusual database queries (SELECT all, UPDATE without WHERE, DROP)
- API key generation (sudden spike from single user)
- Large data exports (SELECT * FROM customer_profiles)
- Permission changes (GRANT/REVOKE for sensitive roles)
- Payment status changes (authorization reversed, pending→denied spike)
- Webhook failures (repeated 5xx from Mercado Pago)
```

### Alert Configuration (Example)

```yaml
alerts:
  - name: "Brute Force Login Attempt"
    condition: "failed_logins > 5 in 60s"
    severity: HIGH
    action:
      - "Block IP for 15 minutes"
      - "Notify on-call engineer"
      - "Create incident"
  
  - name: "Unauthorized Database Access"
    condition: "queries like 'DROP TABLE%' or 'DELETE FROM%' without LIMIT"
    severity: CRITICAL
    action:
      - "Kill database connection"
      - "Page on-call DBA"
      - "Snapshot database"
      - "Create incident"
  
  - name: "Unusual Payment Activity"
    condition: "payment_amount > $10,000 or failed_authorizations > 10% daily"
    severity: MEDIUM
    action:
      - "Notify finance team"
      - "Create incident"
      - "Flag for review"
```

---

## Communication Templates

### Internal (Slack War Room)

```
🚨 SECURITY INCIDENT: INC-2026-03-00001

**Severity**: CRITICAL
**Detected**: 2026-03-23 14:30 UTC
**Incident Commander**: @sarah.jones
**Status**: CONTAINMENT IN PROGRESS

**What We Know**:
- Unauthorized access to customer database detected
- ~500 customer profiles queried (not modified)
- Attacker IP: 123.45.67.89 (China, suspicious)
- Discovery time: Automatic alert triggered

**Current Actions**:
- ✓ IP blocked
- ✓ Database isolated
- ✓ Evidence captured
- 🔄 Investigating scope
- ⏳ Notifying legal

**Next Update**: In 1 hour
**Slack**: #security-incident | **Call**: [Zoom link]
```

### External (Customer Email)

See "Phase 4: NOTIFY" section above.

---

## Resources & References

- LGPD Art. 27 (Notification Requirements)
- ANPD Incidente de Segurança Form: https://www.gov.br/cidadania/
- PCI-DSS 4.0 Breach Notification (if payment data involved)
- NIST Cybersecurity Framework
- ISO 27035 (Incident Management)

---

## Appendix: War Room Checklist

**Print & Keep at Each Desk**:

```
□ INC-____  Date: ______  IC: ________

□ War Room URL: ________________
□ Recording: Y/N  Password: ________

□ 0h: Severity assessed (C/H/M/L)
□ 1h: Scope identified (systems, data, customers)
□ 2h: Evidence preserved (logs, snapshots)
□ 4h: Threat eradicated (creds rotated, patch deployed)
□ 24h: Investigation complete (root cause found)
□ 72h: Customers notified (email + SMS sent)
□ 15d: Post-mortem completed (lessons learned)

Key Contacts:
- IC: _________________
- CTO: ________________
- Security: ____________
- Legal: _______________
```

---

**This plan is LIVING DOCUMENT. Review quarterly. Update after every incident.**
