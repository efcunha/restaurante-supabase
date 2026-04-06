import { buildEnv } from '../config/env.js';
import { supabase } from '../auth/supabase.js';

type CompanySettingsRecord = Record<string, unknown>;

interface CompanyRow {
  settings: CompanySettingsRecord | null;
}

export interface OpsObservabilitySettingsPayload {
  logRetentionDays: number;
  source: 'panel' | 'env';
  envDefaultDays: number;
}

const env = buildEnv();

export function normalizeRetentionDays(value: unknown, fallback: number): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return fallback;
  }

  return Math.min(3650, Math.max(1, Math.trunc(parsed)));
}

export function extractOpsObservabilitySettings(
  settings: CompanySettingsRecord | null | undefined,
): OpsObservabilitySettingsPayload {
  const fallback = normalizeRetentionDays(env.LOG_RETENTION_DAYS, 30);
  const candidate = settings?.opsObservability;
  if (!candidate || typeof candidate !== 'object') {
    return {
      logRetentionDays: fallback,
      source: 'env',
      envDefaultDays: fallback,
    };
  }

  const retentionDays = normalizeRetentionDays(
    (candidate as Record<string, unknown>).logRetentionDays,
    fallback,
  );

  return {
    logRetentionDays: retentionDays,
    source: 'panel',
    envDefaultDays: fallback,
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
  const { data, error } = await supabase
    .from('companies')
    .select('settings')
    .eq('id', companyId)
    .single<CompanyRow>();

  if (error) {
    throw new Error('Nao foi possivel carregar as configuracoes atuais de observabilidade do painel ops.');
  }

  const normalizedRetentionDays = normalizeRetentionDays(logRetentionDays, env.LOG_RETENTION_DAYS);
  const currentSettings = (data?.settings || {}) as CompanySettingsRecord;
  const updatedSettings = {
    ...currentSettings,
    opsObservability: {
      ...(typeof currentSettings.opsObservability === 'object' && currentSettings.opsObservability !== null
        ? (currentSettings.opsObservability as Record<string, unknown>)
        : {}),
      logRetentionDays: normalizedRetentionDays,
    },
  };

  const { error: updateError } = await supabase
    .from('companies')
    .update({ settings: updatedSettings, updated_at: new Date().toISOString() })
    .eq('id', companyId);

  if (updateError) {
    throw new Error('Nao foi possivel salvar a retencao de logs da observabilidade.');
  }

  return {
    logRetentionDays: normalizedRetentionDays,
    source: 'panel',
    envDefaultDays: normalizeRetentionDays(env.LOG_RETENTION_DAYS, 30),
  };
}