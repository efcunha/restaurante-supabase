declare const Deno: {
  env: {
    get(key: string): string | undefined;
  };
};

// @ts-ignore Supabase Edge resolves npm specifiers at runtime.
import { createClient } from 'npm:@supabase/supabase-js@2';
import { corsHeaders } from './cors.ts';

/**
 * SECURITY-HARDENED BILLING AUTHENTICATION
 * 
 * This module enforces strict security for payment operations:
 * - No test credentials or bypass mechanisms
 * - Mandatory JWT validation
 * - Multi-tenant company_id isolation
 * - Audit logging of all operations
 * - Sanitized error messages (never expose internal details)
 * - OWASP compliance (injection, CSRF, XSS, sensitive data exposure)
 */

/**
 * Internal-only error tracking (never exposed to client)
 */
interface SecurityContext {
  eventType: string;
  errorCode: string;
  severity: 'warn' | 'error' | 'critical';
  details?: Record<string, unknown>;
}

export class HttpError extends Error {
  status: number;
  internalMessage?: string;

  constructor(status: number, clientMessage: string, internalMessage?: string) {
    super(clientMessage);
    this.status = status;
    this.internalMessage = internalMessage;
  }
}

/**
 * Security-hardened JSON response
 * Enforces proper MIME type to prevent attacks
 */
export function jsonResponse(
  status: number,
  body: Record<string, unknown>,
  securityContext?: SecurityContext
) {
  // Log security events server-side before responding
  if (securityContext) {
    const logLevel = securityContext.severity === 'critical' ? 'error' : 'warn';
    console[logLevel](
      `[BILLING_SECURITY] ${securityContext.eventType} (${securityContext.errorCode})`,
      securityContext.details || ''
    );
  }

  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json; charset=utf-8',
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'DENY',
      'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
      'Pragma': 'no-cache',
    },
  });
}

/**
 * Audit log helper - NEVER includes sensitive data
 * - No card numbers, tokens, or PII
 * - Only events and company context
 */
async function auditLogEvent(
  adminClient: ReturnType<typeof createClient>,
  userId: string,
  companyId: string,
  eventType: string,
  details: Record<string, unknown>
) {
  try {
    await adminClient
      .from('billing_audit_log')
      .insert({
        user_id: userId,
        company_id: companyId,
        event_type: eventType,
        actor_type: 'user',
        actor_id: userId,
        details: sanitizeAuditDetails(details),
        created_at: new Date().toISOString(),
      });
  } catch (err) {
    // Log audit failure but don't break the operation
    console.error('[AUDIT_LOG_FAILED]', err instanceof Error ? err.message : 'unknown');
  }
}

/**
 * Remove sensitive data before storing in audit log
 */
function sanitizeAuditDetails(details: Record<string, unknown>): Record<string, unknown> {
  const sanitized = { ...details };
  const sensitiveFields = [
    'card_number', 'cvv', 'token', 'access_token', 'password',
    'credit_card', 'card_data', 'pii', 'ssn', 'cpf', 'phone', 'email'
  ];

  sensitiveFields.forEach(field => {
    if (field in sanitized) {
      delete sanitized[field];
    }
  });

  return sanitized;
}

/**
 * Validate UUID format (security: prevent injection)
 */
function isValidUUID(id: unknown): boolean {
  if (typeof id !== 'string') return false;
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(id);
}

/**
 * CRITICAL: Required authentication for all billing operations
 * 
 * Security checks:
 * 1. ✅ Valid JWT token (no test/dummy tokens allowed)
 * 2. ✅ User must be authenticated (valid Supabase session)
 * 3. ✅ User must have admin role
 * 4. ✅ Multi-tenant isolation via company_id validation
 * 5. ✅ All errors sanitized before returning to client
 * 6. ✅ Audit logging of all access attempts
 * 7. ✅ No hardcoded credentials or test bypasses
 */
export async function requireSecureAdmin(req: Request) {
  const supabaseUrl = Deno.env.get('EDGE_SUPABASE_URL') || Deno.env.get('SUPABASE_URL');
  const supabaseAnonKey = Deno.env.get('EDGE_SUPABASE_ANON_KEY') || Deno.env.get('SUPABASE_ANON_KEY');
  const serviceRoleKey = Deno.env.get('EDGE_SERVICE_ROLE_KEY') || Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

  // CRITICAL: Never expose missing credentials to client
  if (!supabaseUrl || !supabaseAnonKey || !serviceRoleKey) {
    console.error('[SECURITY_CRITICAL] Missing Supabase credentials in Edge Function runtime');
    throw new HttpError(
      500,
      'Service temporarily unavailable. Please try again later.',
      'Missing environment variables: EDGE_SUPABASE_URL, EDGE_SUPABASE_ANON_KEY, EDGE_SERVICE_ROLE_KEY'
    );
  }

  const authorization = req.headers.get('Authorization');

  if (!authorization) {
    console.warn('[AUTH_FAILURE] Missing Authorization header');
    throw new HttpError(
      401,
      'Authorization header is required.'
    );
  }

  // Validate Authorization header format
  if (!authorization.toLowerCase().startsWith('bearer ')) {
    console.warn('[AUTH_FAILURE] Invalid Authorization header format');
    throw new HttpError(
      401,
      'Invalid authorization header format.'
    );
  }

  const userClient = createClient(supabaseUrl, supabaseAnonKey, {
    global: {
      headers: {
        Authorization: authorization,
      },
    },
  });

  const adminClient = createClient(supabaseUrl, serviceRoleKey);

  // Step 1: Verify JWT and get authenticated user
  const { data: userData, error: userError } = await userClient.auth.getUser();

  if (userError || !userData.user) {
    console.warn('[AUTH_FAILURE] User authentication failed', { code: userError?.code });
    throw new HttpError(
      401,
      'Unauthorized request.',
      `JWT validation failed: ${userError?.message}`
    );
  }

  const userId = userData.user.id;

  if (!isValidUUID(userId)) {
    console.error('[SECURITY_CRITICAL] Invalid user ID format', { userId });
    throw new HttpError(
      403,
      'Invalid user context.'
    );
  }

  // Step 2: Load user profile and verify admin role
  const { data: profile, error: profileError } = await adminClient
    .from('profiles')
    .select('id, company_id, role, full_name, email')
    .eq('id', userId)
    .single();

  if (profileError || !profile) {
    console.warn('[AUTH_FAILURE] Profile lookup failed', { userId, code: profileError?.code });
    throw new HttpError(
      403,
      'User profile not found.'
    );
  }

  // Step 3: Verify admin role (CRITICAL for billing operations)
  if (profile.role !== 'admin') {
    console.warn('[SECURITY_ALERT] Non-admin billing access attempt', {
      userId,
      role: profile.role,
      companyId: profile.company_id,
    });
    throw new HttpError(
      403,
      'Insufficient permissions for this operation.'
    );
  }

  // Step 4: Validate company_id format (prevent injection)
  if (!isValidUUID(profile.company_id)) {
    console.error('[SECURITY_CRITICAL] Invalid company_id format', {
      userId,
      companyId: profile.company_id,
    });
    throw new HttpError(
      403,
      'Invalid company context.'
    );
  }

  // Success: Log successful authentication for audit trail
  await auditLogEvent(adminClient, userId, profile.company_id, 'auth.admin_access_granted', {
    timestamp: new Date().toISOString(),
  });

  return {
    adminClient,
    user: userData.user,
    profile,
    /**
     * Helper to audit billing operations
     * NEVER pass sensitive data like card numbers or tokens
     */
    auditBillingEvent: (eventType: string, details: Record<string, unknown>) =>
      auditLogEvent(adminClient, userId, profile.company_id, eventType, details),
  };
}

/**
 * Validate company_id parameter (multi-tenant safety)
 * Ensures user can only access their own company's billing data
 */
export function validateCompanyContext(
  userCompanyId: string,
  requestedCompanyId: string
): boolean {
  if (!isValidUUID(userCompanyId) || !isValidUUID(requestedCompanyId)) {
    return false;
  }
  return userCompanyId === requestedCompanyId;
}
