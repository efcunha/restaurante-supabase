import { buildEnv } from '../config/env.js';
import { supabase } from '../auth/supabase.js';

type CompanySettingsRecord = Record<string, unknown>;

interface CompanyRow {
  settings: CompanySettingsRecord | null;
}

export interface OpsObservabilitySettingsPayload {
  logRetentionDays: number;
  staleMinutes: number;
  source: 'panel' | 'env';
  envDefaultDays: number;
  envDefaultStaleMinutes: number;
}

const env = buildEnv();

export function normalizeRetentionDays(value: unknown, fallback: number): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return fallback;
  }

  return Math.min(3650, Math.max(1, Math.trunc(parsed)));
}

export function normalizeStaleMinutes(value: unknown, fallback: number): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return fallback;
  }

  return Math.min(1440, Math.max(5, Math.trunc(parsed)));
}

export function extractOpsObservabilitySettings(
  settings: CompanySettingsRecord | null | undefined,
): OpsObservabilitySettingsPayload {
  const fallback = normalizeRetentionDays(env.LOG_RETENTION_DAYS, 30);
  const fallbackStale = normalizeStaleMinutes(env.OBS_STALE_MINUTES, 60);
  const candidate = settings?.opsObservability;
  if (!candidate || typeof candidate !== 'object') {
    return {
      logRetentionDays: fallback,
      staleMinutes: fallbackStale,
      source: 'env',
      envDefaultDays: fallback,
      envDefaultStaleMinutes: fallbackStale,
    };
  }

  const retentionDays = normalizeRetentionDays(
    (candidate as Record<string, unknown>).logRetentionDays,
    fallback,
  );
  const staleMinutes = normalizeStaleMinutes(
    (candidate as Record<string, unknown>).staleMinutes,
    fallbackStale,
  );

  return {
    logRetentionDays: retentionDays,
    staleMinutes,
    source: 'panel',
    envDefaultDays: fallback,
    envDefaultStaleMinutes: fallbackStale,
  };
}

export async function getOpsObservabilitySettings(
  companyId: string,
): Promise<OpsObservabilitySettingsPayload> {
  const { data, error } = await supabase
    .from('companies')
    .select('settings')
    .eq('id', companyId)
    .single<CompanyRow>();

  if (error) {
    throw new Error('Nao foi possivel carregar as configuracoes de observabilidade do painel ops.');
  }

  return extractOpsObservabilitySettings(data?.settings);
}

export async function updateOpsLogRetentionDays(
  companyId: string,
  logRetentionDays: number,
): Promise<OpsObservabilitySettingsPayload> {
  return updateOpsObservabilitySettings(companyId, { logRetentionDays });
}

export async function updateOpsObservabilitySettings(
  companyId: string,
  patch: { logRetentionDays?: number; staleMinutes?: number },
): Promise<OpsObservabilitySettingsPayload> {
  const { data, error } = await supabase
    .from('companies')
    .select('settings')
    .eq('id', companyId)
    .single<CompanyRow>();

  if (error) {
    throw new Error('Nao foi possivel carregar as configuracoes atuais de observabilidade do painel ops.');
  }

  const current = extractOpsObservabilitySettings(data?.settings);
  const normalizedRetentionDays = patch.logRetentionDays != null
    ? normalizeRetentionDays(patch.logRetentionDays, env.LOG_RETENTION_DAYS)
    : current.logRetentionDays;
  const normalizedStaleMinutes = patch.staleMinutes != null
    ? normalizeStaleMinutes(patch.staleMinutes, env.OBS_STALE_MINUTES)
    : current.staleMinutes;
  const currentSettings = (data?.settings || {}) as CompanySettingsRecord;
  const updatedSettings = {
    ...currentSettings,
    opsObservability: {
      ...(typeof currentSettings.opsObservability === 'object' && currentSettings.opsObservability !== null
        ? (currentSettings.opsObservability as Record<string, unknown>)
        : {}),
      logRetentionDays: normalizedRetentionDays,
      staleMinutes: normalizedStaleMinutes,
    },
  };

  const { error: updateError } = await supabase
    .from('companies')
    .update({ settings: updatedSettings, updated_at: new Date().toISOString() })
    .eq('id', companyId);

  if (updateError) {
    throw new Error('Nao foi possivel salvar as configuracoes de observabilidade.');
  }

  return {
    logRetentionDays: normalizedRetentionDays,
    staleMinutes: normalizedStaleMinutes,
    source: 'panel',
    envDefaultDays: normalizeRetentionDays(env.LOG_RETENTION_DAYS, 30),
    envDefaultStaleMinutes: normalizeStaleMinutes(env.OBS_STALE_MINUTES, 60),
  };
}