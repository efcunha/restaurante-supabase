// Script de diagnóstico — roda com: node test-supabase.js
const { createClient } = require('./node_modules/@supabase/supabase-js');

const URL = 'https://ykalocfhnetxenvmtlcn.supabase.co';
const KEY = 'sb_publishable_sUAhOXyPkUhEb4tpbVU8wQ_71qyFI3x';

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
    const { data, error } = await client.auth.signInWithPassword({ email: 'teste@teste.com', password: 'errado' });
    console.log('signIn (cred invalida) | error:', error?.message ?? 'none', '| code:', error?.code ?? 'none');
  } catch (e) {
    console.log('signIn CRASH:', e.message);
  }
}

run().catch(e => console.log('ERRO GERAL:', e.message));
