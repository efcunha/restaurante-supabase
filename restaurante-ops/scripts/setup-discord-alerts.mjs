#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';

function requiredEnv(name) {
  const value = process.env[name];
  if (!value || !value.trim()) {
    throw new Error(`Missing required env: ${name}`);
  }
  return value.trim();
}

function optionalEnv(name) {
  const value = process.env[name];
  return value && value.trim() ? value.trim() : null;
}

function buildAlertDefinitions() {
  return [
    {
      name: 'P0 Incidente Critico - Error Burst Global',
      description: 'Dispara quando ha burst de erros em producao em qualquer servico.',
      level: 'critical',
      serviceTag: 'global',
      condition: { type: 'event_count', level: 'error', window_minutes: 5, threshold: 40 },
      webhookEnv: 'DISCORD_WEBHOOK_OPS_P0_INCIDENTES_CRITICOS',
    },
    {
      name: 'P1 Producao - Error Burst',
      description: 'Dispara quando erro de producao ultrapassa limiar relevante.',
      level: 'high',
      serviceTag: 'global',
      condition: { type: 'event_count', level: 'error', window_minutes: 5, threshold: 20 },
      webhookEnv: 'DISCORD_WEBHOOK_OPS_P1_PRODUCAO_ALERTAS',
    },
    {
      name: 'Service Status - Endpoint Offline',
      description: 'Dispara quando endpoints monitorados reportam falha/offline.',
      level: 'high',
      serviceTag: 'ops',
      condition: {
        type: 'event_count',
        level: 'error',
        event: 'service_status.check_failed',
        service: 'ops',
        window_minutes: 5,
        threshold: 0,
      },
      webhookEnv: 'DISCORD_WEBHOOK_OPS_OBSERVABILITY_SERVICE_STATUS',
    },
    {
      name: 'API Status - Endpoint Falhando',
      description: 'Dispara quando validacao de status API falha.',
      level: 'high',
      serviceTag: 'ops',
      condition: {
        type: 'event_count',
        level: 'error',
        event: 'api_status.check_failed',
        service: 'ops',
        window_minutes: 5,
        threshold: 0,
      },
      webhookEnv: 'DISCORD_WEBHOOK_OPS_OBSERVABILITY_API_STATUS',
    },
    {
      name: 'Security - Unauthorized Events',
      description: 'Dispara para tentativas nao autorizadas em auth/RLS.',
      level: 'high',
      serviceTag: 'ops',
      condition: {
        type: 'event_count',
        level: 'warn',
        event: 'observability.external_logs_unauthorized',
        service: 'ops',
        window_minutes: 10,
        threshold: 2,
      },
      webhookEnv: 'DISCORD_WEBHOOK_OPS_SECURITY_AUTH_RLS',
    },
    {
      name: 'Rate Limit - Abuse Detected',
      description: 'Dispara quando ha pico de bloqueios por rate limit.',
      level: 'high',
      serviceTag: 'ops',
      condition: {
        type: 'event_count',
        level: 'warn',
        event: 'observability.external_logs_rate_limited',
        service: 'ops',
        window_minutes: 5,
        threshold: 10,
      },
      webhookEnv: 'DISCORD_WEBHOOK_OPS_RATE_LIMIT_ABUSE',
    },
    {
      name: 'Billing Reconcile - Errors',
      description: 'Dispara para erros no pipeline de billing/reconcile.',
      level: 'critical',
      serviceTag: 'billing',
      condition: {
        type: 'event_count',
        level: 'error',
        service: 'ops',
        event: 'billing.reconcile.error',
        window_minutes: 10,
        threshold: 0,
      },
      webhookEnv: 'DISCORD_WEBHOOK_OPS_BILLING_RECONCILE',
    },
    {
      name: 'Warnings Operacionais - Burst',
      description: 'Dispara quando warnings operacionais aumentam acima do normal.',
      level: 'medium',
      serviceTag: 'global',
      condition: { type: 'event_count', level: 'warn', window_minutes: 10, threshold: 25 },
      webhookEnv: 'DISCORD_WEBHOOK_OPS_WARNINGS_OPERACIONAIS',
    },
    {
      name: 'Deploy Release - Falha Pos Deploy',
      description: 'Dispara quando healthcheck aponta falha apos deploy.',
      level: 'high',
      serviceTag: 'ops',
      condition: {
        type: 'event_count',
        level: 'error',
        event: 'deploy.postcheck.failed',
        service: 'ops',
        window_minutes: 15,
        threshold: 0,
      },
      webhookEnv: 'DISCORD_WEBHOOK_OPS_DEPLOY_RELEASE',
    },
    {
      name: 'Audit Trail - Config Changes',
      description: 'Dispara para eventos de auditoria sensiveis em configuracao.',
      level: 'medium',
      serviceTag: 'ops',
      condition: {
        type: 'event_count',
        level: 'info',
        event: 'observability.monitored_service_updated',
        service: 'ops',
        window_minutes: 30,
        threshold: 0,
      },
      webhookEnv: 'DISCORD_WEBHOOK_OPS_AUDIT_TRAIL',
    },
  ];
}

async function upsertAlert(client, definition) {
  const webhookUrl = requiredEnv(definition.webhookEnv);
  const mentionCritical = optionalEnv('DISCORD_MENTION_CRITICAL') ?? '@here';
  const mentionHigh = optionalEnv('DISCORD_MENTION_HIGH') ?? '';

  const mention = definition.level === 'critical' ? mentionCritical : definition.level === 'high' ? mentionHigh : '';

  const channelConfig = {
    url: webhookUrl,
    provider: 'discord',
    route: {
      level: definition.level,
      service_tag: definition.serviceTag,
    },
    mention,
  };

  const { data: existingRows, error: findError } = await client
    .from('ops_alerts')
    .select('id,name')
    .eq('name', definition.name)
    .limit(1);

  if (findError) {
    throw new Error(`Failed to search alert \"${definition.name}\": ${findError.message}`);
  }

  const payload = {
    name: definition.name,
    description: definition.description,
    condition: definition.condition,
    channel: 'webhook',
    channel_config: channelConfig,
    enabled: true,
    updated_at: new Date().toISOString(),
  };

  const existing = existingRows && existingRows.length > 0 ? existingRows[0] : null;
  if (existing?.id) {
    const { error: updateError } = await client
      .from('ops_alerts')
      .update(payload)
      .eq('id', existing.id);

    if (updateError) {
      throw new Error(`Failed to update alert \"${definition.name}\": ${updateError.message}`);
    }

    return { action: 'updated', id: existing.id };
  }

  const { data: created, error: insertError } = await client
    .from('ops_alerts')
    .insert({ ...payload, created_at: new Date().toISOString() })
    .select('id')
    .single();

  if (insertError) {
    throw new Error(`Failed to create alert \"${definition.name}\": ${insertError.message}`);
  }

  return { action: 'created', id: created?.id ?? null };
}

async function main() {
  const supabaseUrl = requiredEnv('SUPABASE_URL');
  const supabaseServiceRoleKey = requiredEnv('SUPABASE_SERVICE_ROLE_KEY');
  const client = createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: { persistSession: false },
  });

  const definitions = buildAlertDefinitions();
  const summary = [];

  for (const definition of definitions) {
    // eslint-disable-next-line no-await-in-loop
    const result = await upsertAlert(client, definition);
    summary.push({ name: definition.name, ...result });
  }

  console.log('Discord alerts provisioned successfully.');
  for (const row of summary) {
    console.log(`- ${row.action.toUpperCase()}: ${row.name} (id=${row.id ?? 'n/a'})`);
  }
}

main().catch((err) => {
  console.error('Failed to provision Discord alerts:', err instanceof Error ? err.message : String(err));
  process.exitCode = 1;
});
