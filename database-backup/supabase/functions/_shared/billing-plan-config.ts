// @ts-ignore Supabase Edge resolves npm specifiers at runtime.
import { createClient } from 'npm:@supabase/supabase-js@2';

/**
 * Dynamic billing plan configuration reader.
 *
 * Rules:
 * - getActivePlanConfig:     FAIL-CLOSED. Must be called before any charge/invoice creation.
 *                            Throws PlanConfigError(503) if no valid active config exists.
 *                            Never fall back to a hardcoded price.
 * - getActivePlanConfigSafe: FAIL-OPEN. Returns null on any error.
 *                            Use only for display/status endpoints, never for charge operations.
 *
 * The source of truth is `public.billing_plan_config` via the
 * `get_active_billing_plan_config` SQL function (SECURITY DEFINER).
 */

export interface ActivePlanConfig {
  id: string;
  plan_code: string;
  amount_cents: number;
  currency: string;
  trial_days: number;
  effective_from: string;
}

export class PlanConfigError extends Error {
  readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = 'PlanConfigError';
    this.status = status;
  }
}

/**
 * Resolves the currently active billing plan config from the database.
 *
 * FAIL-CLOSED: throws PlanConfigError(503) when:
 * - DB returns an error
 * - No active config row is found
 * - amount_cents is missing or <= 0
 *
 * This is the mandatory path for all charge operations (Pix, card, subscription creation).
 */
export async function getActivePlanConfig(
  adminClient: ReturnType<typeof createClient>,
  planCode = 'default_monthly',
): Promise<ActivePlanConfig> {
  const { data, error } = await adminClient.rpc('get_active_billing_plan_config', {
    p_plan_code: planCode,
  });

  if (error) {
    console.error('[BILLING_PLAN_CONFIG] DB error resolving active plan config', {
      plan_code: planCode,
      error_code: error.code,
    });
    throw new PlanConfigError(
      503,
      'Configuração de plano temporariamente indisponível. Operação de cobrança bloqueada.',
    );
  }

  const rows: unknown[] = Array.isArray(data) ? data : data ? [data] : [];

  if (rows.length === 0) {
    console.error('[BILLING_PLAN_CONFIG] No active plan config found', { plan_code: planCode });
    throw new PlanConfigError(
      503,
      'Sem configuração de plano ativa. Operação de cobrança bloqueada. Contate o suporte operacional.',
    );
  }

  const row = rows[0] as Record<string, unknown>;

  if (typeof row.amount_cents !== 'number' || row.amount_cents <= 0) {
    console.error('[BILLING_PLAN_CONFIG] Invalid amount_cents in active plan config', {
      plan_code: planCode,
      amount_cents: row.amount_cents,
    });
    throw new PlanConfigError(
      503,
      'Configuração de plano inválida. Operação de cobrança bloqueada. Contate o suporte operacional.',
    );
  }

  return {
    id: String(row.id),
    plan_code: String(row.plan_code),
    amount_cents: row.amount_cents,
    currency: String(row.currency),
    trial_days: Number(row.trial_days),
    effective_from: String(row.effective_from),
  };
}

/**
 * Resolves the active plan config without throwing on failure.
 * Returns null if no active config exists or any error occurs.
 *
 * Use ONLY for display/status endpoints (e.g. billing-provider-status).
 * Do NOT use this in charge operations — use getActivePlanConfig instead.
 */
export async function getActivePlanConfigSafe(
  adminClient: ReturnType<typeof createClient>,
  planCode = 'default_monthly',
): Promise<ActivePlanConfig | null> {
  try {
    return await getActivePlanConfig(adminClient, planCode);
  } catch {
    return null;
  }
}
