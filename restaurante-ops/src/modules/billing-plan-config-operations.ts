import { supabase } from '../auth/supabase.js';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ActivePlanConfig {
  id: string;
  plan_code: string;
  amount_cents: number;
  currency: string;
  trial_days: number;
  effective_from: string;
  effective_to: string | null;
  status: string;
  created_at: string;
}

export interface PlanConfigAuditEntry {
  id: string;
  config_id: string;
  plan_code: string;
  action: string;
  before_snapshot: Record<string, unknown> | null;
  after_snapshot: Record<string, unknown>;
  changed_by: string | null;
  change_reason: string | null;
  created_at: string;
}

export interface ActivatePlanConfigInput {
  plan_code: string;
  amount_cents: number;
  currency: string;
  trial_days: number;
  effective_from: string;   // ISO 8601 UTC
  change_reason: string;   // mandatory for audit trail
  changed_by: string;      // ops actor UUID (user.id)
}

export class PlanConfigOperationError extends Error {
  code: string;
  statusCode: number;

  constructor(message: string, code: string, statusCode = 400) {
    super(message);
    this.name = 'PlanConfigOperationError';
    this.code = code;
    this.statusCode = statusCode;
  }
}

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

export function validateActivatePlanConfigInput(
  input: Partial<ActivatePlanConfigInput>,
): string | null {
  if (!input.plan_code || input.plan_code.trim() === '') {
    return 'plan_code é obrigatório.';
  }
  if (typeof input.amount_cents !== 'number' || input.amount_cents <= 0 || !Number.isInteger(input.amount_cents)) {
    return 'amount_cents deve ser um inteiro positivo (centavos).';
  }
  if (input.amount_cents > 10_000_000) {
    return 'amount_cents excede o limite máximo de R$100.000,00.';
  }
  if (!input.currency || !/^[A-Z]{3}$/.test(input.currency)) {
    return 'currency deve ser um código ISO de 3 letras maiúsculas (ex: BRL).';
  }
  if (typeof input.trial_days !== 'number' || input.trial_days < 0 || !Number.isInteger(input.trial_days)) {
    return 'trial_days deve ser um inteiro não-negativo.';
  }
  if (input.trial_days > 365) {
    return 'trial_days não pode exceder 365.';
  }
  if (!input.effective_from || isNaN(Date.parse(input.effective_from))) {
    return 'effective_from deve ser uma data/hora ISO 8601 válida.';
  }
  if (new Date(input.effective_from) < new Date(Date.now() - 60_000)) {
    // allow up to 1 minute in the past to handle clock skew; reject older
    return 'effective_from não pode ser no passado.';
  }
  if (!input.change_reason || input.change_reason.trim().length < 5) {
    return 'change_reason é obrigatório e deve ter pelo menos 5 caracteres.';
  }
  if (input.change_reason.length > 500) {
    return 'change_reason não pode exceder 500 caracteres.';
  }
  return null;
}

// ---------------------------------------------------------------------------
// Read
// ---------------------------------------------------------------------------

/**
 * Resolves the currently active plan config.
 * Returns null if none found (caller decides how to handle).
 */
export async function fetchActivePlanConfig(
  planCode = 'default_monthly',
): Promise<ActivePlanConfig | null> {
  const { data, error } = await supabase.rpc('get_active_billing_plan_config', {
    p_plan_code: planCode,
  });

  if (error) {
    throw new PlanConfigOperationError(
      'Não foi possível consultar a configuração de plano ativa.',
      'PLAN_CONFIG_READ_ERROR',
      500,
    );
  }

  const rows = Array.isArray(data) ? data : data ? [data] : [];
  if (rows.length === 0) return null;

  const row = rows[0] as Record<string, unknown>;

  // Fetch full row (with status, effective_to, created_at) from the table
  const { data: fullRow, error: fullError } = await supabase
    .from('billing_plan_config')
    .select('id, plan_code, amount_cents, currency, trial_days, status, effective_from, effective_to, created_at')
    .eq('id', row.id as string)
    .single();

  if (fullError || !fullRow) {
    throw new PlanConfigOperationError(
      'Erro ao carregar detalhes da configuração de plano.',
      'PLAN_CONFIG_READ_DETAIL_ERROR',
      500,
    );
  }

  return fullRow as ActivePlanConfig;
}

/**
 * Returns paginated history of plan config rows (all statuses).
 */
export async function fetchPlanConfigHistory(
  planCode = 'default_monthly',
  limit = 20,
): Promise<ActivePlanConfig[]> {
  const safeLimit = Math.max(1, Math.min(limit, 100));
  const { data, error } = await supabase
    .from('billing_plan_config')
    .select('id, plan_code, amount_cents, currency, trial_days, status, effective_from, effective_to, created_at')
    .eq('plan_code', planCode)
    .order('effective_from', { ascending: false })
    .limit(safeLimit);

  if (error) {
    throw new PlanConfigOperationError(
      'Não foi possível consultar o histórico de configuração de plano.',
      'PLAN_CONFIG_HISTORY_ERROR',
      500,
    );
  }

  return (data ?? []) as ActivePlanConfig[];
}

/**
 * Returns the audit trail for plan config changes.
 */
export async function fetchPlanConfigAudit(
  planCode = 'default_monthly',
  limit = 30,
): Promise<PlanConfigAuditEntry[]> {
  const safeLimit = Math.max(1, Math.min(limit, 100));
  const { data, error } = await supabase
    .from('billing_plan_config_audit')
    .select('id, config_id, plan_code, action, before_snapshot, after_snapshot, changed_by, change_reason, created_at')
    .eq('plan_code', planCode)
    .order('created_at', { ascending: false })
    .limit(safeLimit);

  if (error) {
    throw new PlanConfigOperationError(
      'Não foi possível consultar a auditoria de configuração de plano.',
      'PLAN_CONFIG_AUDIT_ERROR',
      500,
    );
  }

  return (data ?? []) as PlanConfigAuditEntry[];
}

// ---------------------------------------------------------------------------
// Write — guarded by RBAC at the route level (only admin role may call)
// ---------------------------------------------------------------------------

/**
 * Activates a new plan config via the atomic DB function.
 * Closes the current active row, inserts the new one, records full audit trail.
 *
 * RBAC: must be called only after verifying user.role === 'admin'.
 */
export async function activatePlanConfig(
  input: ActivatePlanConfigInput,
): Promise<{ new_config_id: string }> {
  const validationError = validateActivatePlanConfigInput(input);
  if (validationError) {
    throw new PlanConfigOperationError(validationError, 'PLAN_CONFIG_INVALID_INPUT', 400);
  }

  const { data, error } = await supabase.rpc('activate_billing_plan_config', {
    p_plan_code: input.plan_code,
    p_amount_cents: input.amount_cents,
    p_currency: input.currency,
    p_trial_days: input.trial_days,
    p_effective_from: input.effective_from,
    p_changed_by: input.changed_by,
    p_change_reason: input.change_reason.trim(),
  });

  if (error) {
    // Surface DB-level validation messages with a safe prefix
    const safeMessage = error.message?.includes('must be')
      ? `Validação falhou: ${error.message}`
      : 'Falha ao ativar nova configuração de plano. Verifique os dados e tente novamente.';

    throw new PlanConfigOperationError(safeMessage, 'PLAN_CONFIG_ACTIVATE_ERROR', 500);
  }

  return { new_config_id: String(data) };
}
