# Rate Limiting Implementation Guide

## Overview

This guide covers the implementation of distributed rate limiting with Redis (Upstash) for `restaurante-ops` backend. Rate limiting protects critical endpoints from DoS attacks and brute force attempts.

## Architecture

```
Client Request
    ↓
HTTP Server (Node.js)
    ↓
Check Rate Limit (Redis or Memory Fallback)
    ↓
✅ Allowed → Process Request
❌ Blocked → Return 429 Too Many Requests
```

## Protected Endpoints

### Authentication (`POST /auth/login`)
- **Limit**: 8 attempts per 15 minutes
- **Key**: `login:{clientIp}:{normalizedEmail}`
- **Response**: 429 with `Retry-After` header

### Billing Operations
- **Endpoints**:
  - `POST /ops/billing/company/{companyId}/regularize/card`
  - `POST /ops/billing/company/{companyId}/regularize/pix`
  - `POST /ops/billing/reconcile`
- **Limit**: 30 requests per 1 minute (per authenticated user)
- **Key**: `billing:{userId}`
- **Response**: 429 with `Retry-After` header and JSON error

## Configuration

### Environment Variables

```bash
# Redis Connection
REDIS_URL=redis://:password@host:port  # Leave empty to use in-memory fallback

# Login Rate Limiting
AUTH_RATE_LIMIT_MAX_ATTEMPTS=8           # Default: 8
AUTH_RATE_LIMIT_WINDOW_MS=900000         # Default: 15 min

# Billing Rate Limiting
RATE_LIMIT_BILLING_MAX_ATTEMPTS=30       # Default: 30
RATE_LIMIT_BILLING_WINDOW_MS=60000       # Default: 1 min

# Fallback Strategy
RATE_LIMIT_FALLBACK_ENABLED=true         # Degrade to memory if Redis unavailable
```

## Local Development Setup

### Without Redis (In-Memory Fallback)

```bash
# In restaurante-ops directory
npm install
npm run dev

# Rate limiting will use in-memory storage (single instance only)
```

### With Local Redis

#### Option 1: Docker
```bash
# Start Redis container
docker run -d --name redis-rate-limit -p 6379:6379 redis:7-alpine

# Set environment variable
export REDIS_URL=redis://:@localhost:6379

# Start server
npm run dev
```

#### Option 2: Built-in `redis-server`
```bash
# On macOS
brew install redis
redis-server

# On Linux
sudo apt-get install redis-server
redis-server

# Then start restaurante-ops
export REDIS_URL=redis://:@localhost:6379
npm run dev
```

## Testing Rate Limiting

### Test Login Rate Limiting (8 attempts / 15 min)

```bash
#!/bin/bash

# Make 8 failed login attempts
for i in {1..8}; do
  curl -X POST http://localhost:4040/auth/login \
    -d "email=test@example.com&password=wrongpassword" \
    -H "Content-Type: application/x-www-form-urlencoded"
  echo "Attempt $i completed"
done

# 9th attempt should be blocked with 429
curl -X POST http://localhost:4040/auth/login \
  -d "email=test@example.com&password=wrongpassword" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -v

# Expected response:
# HTTP/1.1 429 Too Many Requests
# Retry-After: 899
# X-RateLimit-Remaining: 0
# X-RateLimit-Reset: 2026-03-24T12:34:56.000Z
```

### Test Billing Rate Limiting (30 requests / 1 min)

```bash
#!/bin/bash

# Authenticate first
curl -X POST http://localhost:4040/auth/login \
  -d "email=admin@example.com&password=yourpassword" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -c cookies.txt

# Make 30 billing reconciliation requests
for i in {1..30}; do
  curl -X POST http://localhost:4040/ops/billing/reconcile \
    -H "Content-Type: application/json" \
    -b cookies.txt \
    -d '{
      "companyId": "550e8400-e29b-41d4-a716-446655440000",
      "idempotencyKey": "test-'$i'",
      "eventType": "payment_received",
      "paymentStatus": "paid",
      "invoiceId": "inv-'$i'"
    }'
  echo "Request $i completed"
done

# 31st request should be blocked with 429
curl -X POST http://localhost:4040/ops/billing/reconcile \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d '{
    "companyId": "550e8400-e29b-41d4-a716-446655440000",
    "idempotencyKey": "test-31",
    "eventType": "payment_received",
    "paymentStatus": "paid",
    "invoiceId": "inv-31"
  }' \
  -v

# Expected response:
# HTTP/1.1 429 Too Many Requests
# Retry-After: 45
# X-RateLimit-Remaining: 0
# {
#   "error": "Muitas operacoes de cobranca. Aguarde um minuto e tente novamente.",
#   "retryAfter": 45
# }
```

## Response Headers

All rate-limited responses include:
- `Retry-After`: Seconds until the next request is allowed
- `X-RateLimit-Remaining`: Remaining requests in current window
- `X-RateLimit-Reset`: ISO timestamp when the counter resets

## Fallback Behavior

If Redis is unavailable:
- `RATE_LIMIT_FALLBACK_ENABLED=true` (default): Continues with in-memory fallback
- `RATE_LIMIT_FALLBACK_ENABLED=false`: Rejects all requests (fail-closed)

**Recommendations**:
- Development: Use `true` (easier debugging)
- Production: Use `false` (security-first) or monitor Redis availability

## Railway Deployment

### Creating Redis Service

```bash
# Using Railway CLI
railway service add --name restaurante-redis --image redis:7-alpine

# Or via Dashboard:
# 1. Go to Project
# 2. Click "+ New Service"
# 3. Select "Redis" from Marketplace
# 4. Railway auto-injects REDIS_URL
```

### Environment Variables in Railway

The `REDIS_URL` is automatically injected by Railway when the Redis service is added to the project.

For other variables, set them in Railway Dashboard:
```
AUTH_RATE_LIMIT_MAX_ATTEMPTS=8
AUTH_RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_BILLING_MAX_ATTEMPTS=30
RATE_LIMIT_BILLING_WINDOW_MS=60000
RATE_LIMIT_FALLBACK_ENABLED=true
```

### Deploy

```bash
railway up
```

## Monitoring & Logging

### Log Events

Rate limit events are logged as JSON:
```json
{
  "ts": "2026-03-24T12:30:00.000Z",
  "level": "warn",
  "event": "auth.login_rate_limited",
  "method": "POST",
  "path": "/auth/login",
  "statusCode": 429,
  "reason": "retry_after=899"
}
```

### Health Check

Redis connection status is logged on startup:
```json
{
  "ts": "2026-03-24T12:30:00.000Z",
  "level": "info",
  "event": "redis.initialized",
  "detail": "ok: Redis connected"
}
```

## Troubleshooting

### "Redis not initialized; using memory fallback"
- This is expected if `REDIS_URL` is not set
- In production, verify `REDIS_URL` is correctly configured in Railway

### Rate limit not working
1. Verify `REDIS_URL` is correctly formatted: `redis://:password@host:port`
2. Check Redis connectivity: `redis-cli -u $REDIS_URL ping` (should return PONG)
3. Verify rate limiting is enabled by checking logs for `redis.initialized` event

### False positives (legitimate users blocked)

Adjust rate limits:
- **Login**: Increase `AUTH_RATE_LIMIT_MAX_ATTEMPTS` (default: 8)
- **Billing**: Increase `RATE_LIMIT_BILLING_MAX_ATTEMPTS` (default: 30)
- **Window**: Increase `*_WINDOW_MS` for longer windows

Example for higher login attempts:
```bash
AUTH_RATE_LIMIT_MAX_ATTEMPTS=15
AUTH_RATE_LIMIT_WINDOW_MS=900000
```

## Security Considerations

✅ **What's Protected**:
- Brute force attacks on login endpoints
- DoS attacks on billing operations
- Distributed attacks (via Redis across multiple instances)

⚠️ **Limitations**:
- No protection for public endpoints (`/healthz`, `/api/status`)
- No protection for unauthenticated requests (beyond login)
- Layer 1 DDoS at CDN/WAF level is still recommended (Cloudflare, etc.)

## Future Enhancements

1. **Account Lockout**: Lock accounts after N failed attempts (currently only temporary block)
2. **CAPTCHA Integration**: Add CAPTCHA after 3 failed login attempts
3. **Distributed Rate Limiting**: Track IPs across multiple data centers
4. **Audit Logging**: Log rate limit events to Supabase for LGPD compliance
5. **Dynamic Limits**: Adjust limits based on user role/tier
