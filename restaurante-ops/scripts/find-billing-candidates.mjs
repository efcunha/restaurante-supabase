import fs from 'node:fs';
import path from 'node:path';

function loadDotEnv(dotEnvPath) {
  if (!fs.existsSync(dotEnvPath)) {
    return;
  }

  const content = fs.readFileSync(dotEnvPath, 'utf8');
  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) {
      continue;
    }

    const separatorIndex = line.indexOf('=');
    if (separatorIndex <= 0) {
      continue;
    }

    const key = line.slice(0, separatorIndex).trim();
    const value = line.slice(separatorIndex + 1).trim();
    if (!(key in process.env)) {
      process.env[key] = value;
    }
  }
}

function parseArgs(argv) {
  const args = { companyId: undefined, limit: 20 };

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (token === '--company-id' && argv[index + 1]) {
      args.companyId = argv[index + 1];
      index += 1;
      continue;
    }

    if (token === '--limit' && argv[index + 1]) {
      const parsed = Number.parseInt(argv[index + 1], 10);
      if (Number.isFinite(parsed) && parsed > 0) {
        args.limit = parsed;
      }
      index += 1;
    }
  }

  return args;
}

const cwd = process.cwd();
loadDotEnv(path.join(cwd, '.env'));

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceRoleKey) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY. Ensure .env exists or env vars are exported.');
  process.exit(1);
}

const options = parseArgs(process.argv.slice(2));
const restBaseUrl = `${supabaseUrl.replace(/\/$/, '')}/rest/v1`;
const defaultHeaders = {
  apikey: supabaseServiceRoleKey,
  Authorization: `Bearer ${supabaseServiceRoleKey}`,
};

async function fetchJson(url) {
  const response = await fetch(url, { headers: defaultHeaders });
  if (!response.ok) {
    const body = await response.text();
    throw new Error(`REST query failed (${response.status}): ${body}`);
  }
  return response.json();
}

const invoiceSelect = 'id,company_id,status,amount,due_date,retry_count,payment_method_type';
const invoiceUrl = new URL(`${restBaseUrl}/invoices`);
invoiceUrl.searchParams.set('select', invoiceSelect);
invoiceUrl.searchParams.set('status', 'in.(pending,failed)');
invoiceUrl.searchParams.set('order', 'due_date.asc');
invoiceUrl.searchParams.set('limit', String(options.limit));
if (options.companyId) {
  invoiceUrl.searchParams.set('company_id', `eq.${options.companyId}`);
}

let invoices;
try {
  invoices = await fetchJson(invoiceUrl);
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
}

if (!invoices || invoices.length === 0) {
  console.log(JSON.stringify({
    ok: true,
    count: 0,
    message: 'No pending/failed invoices found for OPS-4 success-path smoke.',
    companyId: options.companyId ?? null,
  }, null, 2));
  process.exit(0);
}

const companyIds = [...new Set(invoices.map((invoice) => invoice.company_id))];
const subscriptionUrl = new URL(`${restBaseUrl}/subscriptions`);
subscriptionUrl.searchParams.set('select', 'company_id,status,grace_period_end');
subscriptionUrl.searchParams.set('company_id', `in.(${companyIds.join(',')})`);

let subscriptions;
try {
  subscriptions = await fetchJson(subscriptionUrl);
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
}

const subscriptionByCompanyId = new Map(
  (subscriptions ?? []).map((subscription) => [subscription.company_id, subscription]),
);

const result = invoices.map((invoice) => ({
  ...invoice,
  subscription: subscriptionByCompanyId.get(invoice.company_id) ?? null,
}));

console.log(JSON.stringify({
  ok: true,
  count: result.length,
  candidates: result,
}, null, 2));