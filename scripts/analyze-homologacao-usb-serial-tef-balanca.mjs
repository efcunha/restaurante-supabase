#!/usr/bin/env node

import fs from 'fs';
import path from 'path';

function asBool(value) {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') return value.toLowerCase() === 'true';
  return false;
}

function findLatestSummaryFile(outDir) {
  if (!fs.existsSync(outDir)) return null;

  const files = fs
    .readdirSync(outDir)
    .filter((file) => /^homologacao-usb-serial-tef-balanca-\d{8}T\d{6}Z\.json$/.test(file))
    .sort();

  return files.length > 0 ? path.join(outDir, files[files.length - 1]) : null;
}

function normalizeProtocol(protocolRaw) {
  const protocol = String(protocolRaw || '').trim().toUpperCase();
  if (!protocol) return '';
  if (protocol === 'TOLEDO-SIMULATOR') return 'SIMULATOR';
  return protocol;
}

function printCheck(label, ok, detail) {
  const status = ok ? 'OK' : 'FAIL';
  console.log(`- [${status}] ${label}: ${detail}`);
}

function csvEscape(value) {
  const raw = value == null ? '' : String(value);
  if (raw.includes('"') || raw.includes(',') || raw.includes('\n')) {
    return `"${raw.replace(/"/g, '""')}"`;
  }
  return raw;
}

function appendCsvRow(csvFile, row) {
  const header = [
    'data_hora',
    'ambiente',
    'company_id',
    'modelo_balanca',
    'porta',
    'baud',
    'protocolo',
    'serial_aberta',
    'leitura_estavel_ok',
    'tara_ok',
    'tef_init_status',
    'tef_idempotencia_ok',
    'tef_status_final',
    'resultado',
    'observacoes',
  ].join(',');

  const line = [
    row.data_hora,
    row.ambiente,
    row.company_id,
    row.modelo_balanca,
    row.porta,
    row.baud,
    row.protocolo,
    row.serial_aberta,
    row.leitura_estavel_ok,
    row.tara_ok,
    row.tef_init_status,
    row.tef_idempotencia_ok,
    row.tef_status_final,
    row.resultado,
    row.observacoes,
  ]
    .map(csvEscape)
    .join(',');

  const exists = fs.existsSync(csvFile);
  if (!exists) {
    fs.writeFileSync(csvFile, `${header}\n${line}\n`, 'utf8');
    return;
  }

  fs.appendFileSync(csvFile, `${line}\n`, 'utf8');
}

function main() {
  const outDir = process.argv[2] || path.resolve(process.cwd(), 'tmp/evidencias');
  const explicitFile = process.argv[3] || '';
  const csvOutFile = process.argv[4] || '';

  const summaryFile = explicitFile || findLatestSummaryFile(outDir);
  if (!summaryFile) {
    console.error('Nenhum arquivo de evidencia encontrado para analise.');
    console.error(`Diretorio analisado: ${outDir}`);
    process.exit(1);
  }

  let payload;
  try {
    payload = JSON.parse(fs.readFileSync(summaryFile, 'utf8'));
  } catch (error) {
    console.error(`Falha ao ler JSON de evidencia: ${summaryFile}`);
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  }

  const scale = payload?.scale ?? {};
  const tef = payload?.tef ?? {};

  const statusHttp = Number(scale.status_http ?? 0);
  const pesoHttp = Number(scale.peso_http ?? 0);
  const pesoEstavelHttp = Number(scale.peso_estavel_http ?? 0);
  const taraHttp = Number(scale.tara_http ?? 0);

  const serialOpen = asBool(scale.serial_aberta);
  const baud = Number(scale.baud ?? NaN);
  const protocol = normalizeProtocol(scale.protocolo);

  const statusOk = statusHttp === 200;
  const pesoOk = pesoHttp === 200 || pesoHttp === 204;
  const pesoEstavelOk = pesoEstavelHttp === 200 || pesoEstavelHttp === 408;
  const taraOk = taraHttp === 200;

  const serialOk = serialOpen === true;
  const baudOk = baud === 2400 || baud === 9600;
  const protocolOk = ['PRT1', 'PRT2', 'PRT3', 'SIMULATOR'].includes(protocol);

  const tefEnabled = asBool(tef.enabled);
  const tefInit1Http = Number(tef.init_1_http ?? 0);
  const tefInit2Http = Number(tef.init_2_http ?? 0);
  const tefStatusHttp = Number(tef.status_http ?? 0);
  const tefIdempotencyOk = tef.idempotency_ok === true;

  const tefInitOk = !tefEnabled || [200, 201, 202].includes(tefInit1Http);
  const tefRetryOk = !tefEnabled || [200, 201, 202].includes(tefInit2Http);
  const tefStatusOk = !tefEnabled || tefStatusHttp === 200;
  const tefIdempOk = !tefEnabled || tefIdempotencyOk;

  let tefStatusFinal = '';
  const tefStatusArtifact = typeof tef?.artifacts?.status === 'string' ? tef.artifacts.status : '';
  if (tefStatusArtifact && fs.existsSync(tefStatusArtifact)) {
    try {
      const tefStatusPayload = JSON.parse(fs.readFileSync(tefStatusArtifact, 'utf8'));
      tefStatusFinal = String(tefStatusPayload?.status || '').toLowerCase();
    } catch {
      tefStatusFinal = '';
    }
  }

  const allChecks = [
    statusOk,
    pesoOk,
    pesoEstavelOk,
    taraOk,
    serialOk,
    baudOk,
    protocolOk,
    tefInitOk,
    tefRetryOk,
    tefStatusOk,
    tefIdempOk,
  ];

  const go = allChecks.every(Boolean);

  console.log('# Parecer de Homologacao USB/Serial (TEF + Balanca)');
  console.log('');
  console.log(`- arquivo_analisado: ${summaryFile}`);
  console.log(`- timestamp_utc: ${payload?.timestamp_utc || 'n/a'}`);
  console.log(`- decisao: ${go ? 'GO' : 'NO-GO'}`);
  console.log('');
  console.log('## Checks - Balanca');
  printCheck('GET /status', statusOk, `http=${statusHttp}`);
  printCheck('GET /peso', pesoOk, `http=${pesoHttp}`);
  printCheck('GET /peso/estavel', pesoEstavelOk, `http=${pesoEstavelHttp}`);
  printCheck('POST /tara', taraOk, `http=${taraHttp}`);
  printCheck('serial_aberta', serialOk, `valor=${String(scale.serial_aberta)}`);
  printCheck('baud aceito (2400/9600)', baudOk, `valor=${Number.isNaN(baud) ? 'n/a' : String(baud)}`);
  printCheck('protocolo aceito (PRT1/PRT2/PRT3)', protocolOk, `valor=${protocol || 'n/a'}`);

  console.log('');
  console.log('## Checks - TEF');
  if (!tefEnabled) {
    console.log('- [OK] TEF desabilitado nesta coleta (checks TEF considerados NA).');
  } else {
    printCheck('POST /payments/initiate (1a)', tefInitOk, `http=${tefInit1Http}`);
    printCheck('POST /payments/initiate (2a)', tefRetryOk, `http=${tefInit2Http}`);
    printCheck('GET /payments/{id}/status', tefStatusOk, `http=${tefStatusHttp}`);
    printCheck('idempotencia', tefIdempOk, `valor=${String(tef.idempotency_ok)}`);
  }

  console.log('');
  if (!go) {
    console.log('Recomendacao: manter NO-GO ate corrigir checks FAIL e reexecutar a coleta.');
  } else {
    console.log('Recomendacao: GO tecnico para rollout controlado, mantendo monitoramento operacional.');
  }

  if (csvOutFile) {
    const row = {
      data_hora: payload?.timestamp_utc || '',
      ambiente: payload?.environment || '',
      company_id: tef?.company_id || '',
      modelo_balanca: '',
      porta: scale?.porta || '',
      baud: Number.isNaN(baud) ? '' : String(baud),
      protocolo: protocol || '',
      serial_aberta: String(scale?.serial_aberta ?? ''),
      leitura_estavel_ok: String(pesoEstavelOk),
      tara_ok: String(taraOk),
      tef_init_status: tefEnabled ? String(tefInit1Http || '') : 'NA',
      tef_idempotencia_ok: tefEnabled ? String(tef?.idempotency_ok ?? '') : 'NA',
      tef_status_final: tefEnabled ? (tefStatusFinal || '') : 'NA',
      resultado: go ? 'GO' : 'NO-GO',
      observacoes: `arquivo=${path.basename(summaryFile)}`,
    };

    appendCsvRow(csvOutFile, row);
    console.log('');
    console.log(`CSV atualizado: ${csvOutFile}`);
  }
}

main();
