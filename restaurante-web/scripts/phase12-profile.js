#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const PHASE12_KEYS = [
  'EXPO_PUBLIC_FEATURE_LOGIN_UI_NEXT',
  'EXPO_PUBLIC_FEATURE_REGISTER_COMPANY_UI_NEXT',
  'EXPO_PUBLIC_FEATURE_NOVO_PEDIDO_UI_NEXT',
  'EXPO_PUBLIC_FEATURE_DELIVERY_UI_NEXT',
  'EXPO_PUBLIC_FEATURE_PAGAMENTO_UI_NEXT',
  'EXPO_PUBLIC_FEATURE_COMANDA_GERENCIAMENTO_UI_NEXT',
  'EXPO_PUBLIC_FEATURE_ADMIN_UI_NEXT',
];

const PROFILES = {
  'legacy-safe': {
    EXPO_PUBLIC_FEATURE_LOGIN_UI_NEXT: false,
    EXPO_PUBLIC_FEATURE_REGISTER_COMPANY_UI_NEXT: false,
    EXPO_PUBLIC_FEATURE_NOVO_PEDIDO_UI_NEXT: false,
    EXPO_PUBLIC_FEATURE_DELIVERY_UI_NEXT: false,
    EXPO_PUBLIC_FEATURE_PAGAMENTO_UI_NEXT: false,
    EXPO_PUBLIC_FEATURE_COMANDA_GERENCIAMENTO_UI_NEXT: false,
    EXPO_PUBLIC_FEATURE_ADMIN_UI_NEXT: false,
  },
  'canary-auth': {
    EXPO_PUBLIC_FEATURE_LOGIN_UI_NEXT: true,
    EXPO_PUBLIC_FEATURE_REGISTER_COMPANY_UI_NEXT: true,
    EXPO_PUBLIC_FEATURE_NOVO_PEDIDO_UI_NEXT: false,
    EXPO_PUBLIC_FEATURE_DELIVERY_UI_NEXT: false,
    EXPO_PUBLIC_FEATURE_PAGAMENTO_UI_NEXT: false,
    EXPO_PUBLIC_FEATURE_COMANDA_GERENCIAMENTO_UI_NEXT: false,
    EXPO_PUBLIC_FEATURE_ADMIN_UI_NEXT: false,
  },
  'canary-ordering': {
    EXPO_PUBLIC_FEATURE_LOGIN_UI_NEXT: true,
    EXPO_PUBLIC_FEATURE_REGISTER_COMPANY_UI_NEXT: true,
    EXPO_PUBLIC_FEATURE_NOVO_PEDIDO_UI_NEXT: true,
    EXPO_PUBLIC_FEATURE_DELIVERY_UI_NEXT: true,
    EXPO_PUBLIC_FEATURE_PAGAMENTO_UI_NEXT: false,
    EXPO_PUBLIC_FEATURE_COMANDA_GERENCIAMENTO_UI_NEXT: false,
    EXPO_PUBLIC_FEATURE_ADMIN_UI_NEXT: false,
  },
  'canary-settlement': {
    EXPO_PUBLIC_FEATURE_LOGIN_UI_NEXT: true,
    EXPO_PUBLIC_FEATURE_REGISTER_COMPANY_UI_NEXT: true,
    EXPO_PUBLIC_FEATURE_NOVO_PEDIDO_UI_NEXT: true,
    EXPO_PUBLIC_FEATURE_DELIVERY_UI_NEXT: true,
    EXPO_PUBLIC_FEATURE_PAGAMENTO_UI_NEXT: true,
    EXPO_PUBLIC_FEATURE_COMANDA_GERENCIAMENTO_UI_NEXT: true,
    EXPO_PUBLIC_FEATURE_ADMIN_UI_NEXT: false,
  },
  'full-phase12': {
    EXPO_PUBLIC_FEATURE_LOGIN_UI_NEXT: true,
    EXPO_PUBLIC_FEATURE_REGISTER_COMPANY_UI_NEXT: true,
    EXPO_PUBLIC_FEATURE_NOVO_PEDIDO_UI_NEXT: true,
    EXPO_PUBLIC_FEATURE_DELIVERY_UI_NEXT: true,
    EXPO_PUBLIC_FEATURE_PAGAMENTO_UI_NEXT: true,
    EXPO_PUBLIC_FEATURE_COMANDA_GERENCIAMENTO_UI_NEXT: true,
    EXPO_PUBLIC_FEATURE_ADMIN_UI_NEXT: true,
  },
};

const ALLOWED_ENV_FILES = new Set([
  '.env.development',
  '.env.staging',
  '.env.production',
  '.env.local',
  '.env.test',
]);

function parseArgs(argv) {
  const args = { profile: '', envFile: '.env.development' };

  for (let i = 0; i < argv.length; i += 1) {
    if (argv[i] === '--profile' && argv[i + 1]) {
      args.profile = argv[i + 1];
      i += 1;
      continue;
    }

    if (argv[i] === '--env' && argv[i + 1]) {
      args.envFile = argv[i + 1];
      i += 1;
      continue;
    }
  }

  return args;
}

function upsertLine(lines, key, value) {
  const nextValue = value ? 'true' : 'false';
  const regex = new RegExp(`^${key}=`);
  const index = lines.findIndex((line) => regex.test(line));

  if (index >= 0) {
    lines[index] = `${key}=${nextValue}`;
    return;
  }

  lines.push(`${key}=${nextValue}`);
}

function printUsage() {
  console.log('Phase 12 profile setter');
  console.log('Usage: node scripts/phase12-profile.js --profile <name> [--env <file>]');
  console.log('Profiles:', Object.keys(PROFILES).join(', '));
  console.log('Example: node scripts/phase12-profile.js --profile canary-ordering --env .env.staging');
}

function resolveSafeEnvFile(envFile) {
  const normalized = String(envFile || '').trim();
  if (!ALLOWED_ENV_FILES.has(normalized)) {
    throw new Error(`Invalid --env value. Allowed: ${Array.from(ALLOWED_ENV_FILES).join(', ')}`);
  }

  return normalized;
}

function run() {
  const { profile, envFile } = parseArgs(process.argv.slice(2));

  if (!profile || !PROFILES[profile]) {
    printUsage();
    process.exit(1);
  }

  const projectRoot = path.resolve(__dirname, '..');
  let envFileName;
  try {
    envFileName = resolveSafeEnvFile(envFile);
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
  const envPath = path.join(projectRoot, envFileName);

  if (!fs.existsSync(envPath)) {
    console.error(`Env file not found: ${envPath}`);
    process.exit(1);
  }

  const raw = fs.readFileSync(envPath, 'utf8');
  const lines = raw.split(/\r?\n/);

  if (lines.length > 0 && lines[lines.length - 1] === '') {
    lines.pop();
  }

  const values = PROFILES[profile];
  PHASE12_KEYS.forEach((key) => upsertLine(lines, key, values[key]));

  const next = `${lines.join('\n')}\n`;
  fs.writeFileSync(envPath, next, 'utf8');

  console.log(`Applied profile "${profile}" to ${envPath}`);
  PHASE12_KEYS.forEach((key) => {
    console.log(`- ${key}=${values[key] ? 'true' : 'false'}`);
  });
}

run();
