// Script de diagnóstico — roda com: node test-supabase.js
// Requer: EXPO_PUBLIC_SUPABASE_URL e EXPO_PUBLIC_SUPABASE_ANON_KEY definidos no ambiente
// ou via arquivo .env.development (nunca exponha chaves reais em código-fonte)
const { createClient } = require('./node_modules/@supabase/supabase-js');

try { require('dotenv').config({ path: '.env.development' }); } catch (_) { /* dotenv opcional */ }

const URL = process.env.EXPO_PUBLIC_SUPABASE_URL;
const KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!URL || !KEY) {
  console.error('ERRO: EXPO_PUBLIC_SUPABASE_URL e EXPO_PUBLIC_SUPABASE_ANON_KEY são obrigatórios.');
  console.error('Defina-as no ambiente ou em .env.development (arquivo gitignored).');
  process.exit(1);
}

console.log('--- Diagnóstico Supabase ---');
console.log('URL length:', URL.length, '| starts with https:', URL.startsWith('https'));
console.log('KEY length (full):', KEY.length, '| format:', KEY.startsWith('sb_publishable_') ? 'sb_publishable (NOVO)' : KEY.startsWith('eyJ') ? 'JWT (antigo)' : 'DESCONHECIDO');

let client;
try {
  client = createClient(URL, KEY);
  console.log('createClient: OK');
} catch (e) {
  console.log('createClient CRASH:', e.message);
  process.exit(1);
}

async function run() {
  const badPassword = process.env.SUPABASE_DIAG_BAD_PASSWORD || `invalid-${Date.now()}`;

  // 1. Testar getSession (sem storage, retorna null sem crash)
  try {
    const { data, error } = await client.auth.getSession();
    console.log('getSession OK | error:', error?.message ?? 'none', '| has_session:', !!data?.session);
  } catch (e) {
    console.log('getSession CRASH:', e.message);
  }

  // 2. Testar query anônima
  try {
    const { data, error, status } = await client.from('profiles').select('id').limit(1);
    console.log('query profiles | status:', status, '| error:', error?.message ?? 'none', '| rows:', data?.length ?? 0);
  } catch (e) {
    console.log('query profiles CRASH:', e.message);
  }

  // 3. Testar autenticacao com cred invalidas (so para ver o formato da resposta)
  try {
    const { data, error } = await client.auth.signInWithPassword({ email: 'teste@teste.com', password: badPassword });
    console.log('signIn (cred invalida) | error:', error?.message ?? 'none', '| code:', error?.code ?? 'none');
  } catch (e) {
    console.log('signIn CRASH:', e.message);
  }
}

run().catch(e => console.log('ERRO GERAL:', e.message));
