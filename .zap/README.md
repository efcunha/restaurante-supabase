# DAST Security Testing — restaurante-supabase

## Overview

Dynamic Application Security Testing (DAST) via OWASP ZAP automatically scans billing and payment endpoints for runtime vulnerabilities.

**Scope**: POST `/auth/login`, `/checkout`, `/pix-fallback`, `/webhook`
**Trigger**: On PR to main/staging + nightly schedule
**Tools**: OWASP ZAP baseline + full scan, API contract testing

---

## Workflow: `security-dast.yml`

### Jobs

#### 1. **dast-scan** (Primary)
- Runs OWASP ZAP Docker container against local test server
- Two scan modes:
  - **Full Scan**: Comprehensive vulnerability discovery
  - **Baseline Scan**: Fast, focused on known patterns
  
- **Failure Criteria**: HIGH severity issue detected
- **Reports**: JSON artifacts + PR comment with findings

#### 2. **api-contract-test** (Validation)
- Unit tests for security-focused code paths:
  - Rate limiting headers (`Retry-After`, `429` responses)
  - CORS configuration (allowlist vs wildcard)
  - Error handling (empty body, malformed JSON)
  - Security headers (X-Content-Type, X-Frame, HSTS)

---

## Configuration Files

### `.zap/rules.tsv`
ZAP rule IDs with risk levels (3=HIGH, 2=MEDIUM, 1=LOW)

**Critical Rules Enforced**:
- SQL/Command Injection (10038, 40014, 40016)
- XSS vulnerabilities (40012, 40014, 40016)
- CSRF token validation (10202)
- SSL/TLS weaknesses (10045)
- Missing security headers (10035, 10037, 10040)

### `.zap/baseline-rules.tsv`
Subset for fast baseline scanning — focuses on HIGH/MEDIUM only.

---

## Local Testing

### Run DAST scan locally

```bash
# Start test server
cd restaurante-ops
npm start &

# Run OWASP ZAP Docker baseline scan
docker run -t owasp/zap2docker-stable \
  zap-baseline.py -t http://localhost:3000 \
  -J /tmp/zap-report.json

# Parse results
jq '.report.site[0].alerts[] | select(.riskcode == "3")' /tmp/zap-report.json
```

### Suppress known false positives

In `.zap/rules.tsv`, set risk to `0` for context-specific rules:
```tsv
10047	0	0	Information Disclosure (Test DB)
```

---

## CI/CD Integration

### Automatic triggers
- **PR to main/staging**: Full DAST scan + comment results
- **Nightly (02:00 UTC)**: Baseline scan on main
- **Manual dispatch**: Run on-demand via GitHub Actions UI

### Failure gates
- HIGH severity issue → PR blocks merge
- MEDIUM issues → Warning in comment (doesn't block)
- LOW issues → Logged for audit trail

### Artifact retention
- ZAP JSON reports: 30 days
- Uploaded to GitHub Actions artifacts
- Linked in PR for review

---

## Troubleshooting

### High false positive rate?

1. **Check test environment setup**:
   - Verify `.env.test` has valid tokens
   - Confirm Supabase service running correctly

2. **Adjust rule sensitivity**:
   - Edit `.zap/rules.tsv` to set risk=0 for noisy rules
   - Use `--allow_issue_dismissal=true` in workflow

3. **Network/timeout issues**:
   - Increase `timeout-minutes` in workflow
   - Add retry logic for server startup

### DAST scan fails but no HIGH issues?

Check `$GITHUB_STEP_SUMMARY` in Actions logs:
- May be parsing error → inspect `/tmp/zap-report.json`
- May be connectivity → verify `curl http://localhost:3000/health`

---

## Security Endpoints Under Test

### POST `/auth/login`
**Risk**: Brute-force, credential stuffing, injection
**Tested**: 
- Rate limiting headers present
- Form validation (empty/malformed JSON rejection)
- HMAC/signature verification (if applicable)

### POST `/checkout`
**Risk**: Command injection, XXE, deserialization, CSRF
**Tested**:
- CORS headers correct
- Input validation (malformed payment data)
- Security headers (X-Content-Type: nosniff)

### POST `/webhook` (Mercado Pago)
**Risk**: Signature bypass, replay attacks, injection
**Tested**:
- HMAC-SHA256 signature verification
- Timestamp tolerance validation
- Request body sanitization

### POST `/pix-fallback`
**Risk**: Open redirect, injection, unvalidated redirect
**Tested**:
- URL validation
- Redirect allowlist verification
- Input sanitization

---

## Next Steps

1. **Test locally**: Run baseline scan against development server
2. **Integrate into CD**: Merge workflow to enable on PRs
3. **Monitor**: Review ZAP reports in Actions artifacts weekly
4. **Automate remediation**: Set up issue creation for HIGH issues

---

## References

- [OWASP ZAP Baseline Scan](https://www.zaproxy.org/docs/docker/baseline-scan/)
- [GitHub Actions - OWASP ZAP Action](https://github.com/zaproxy/action-baseline)
- [OWASP Top 10 2021](https://owasp.org/Top10/)
