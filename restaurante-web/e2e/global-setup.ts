/**
 * Playwright Global Setup
 *
 * Cancela todas as comandas "aberta" nas mesas 1–10 antes de cada suite.
 * Isso garante que re-execuções não falhem por comandas de runs anteriores.
 */

import fs from 'fs';
import path from 'path';
import os from 'os';

const SUPABASE_URL = 'https://ykalocfhnetxenvmtlcn.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_sUAhOXyPkUhEb4tpbVU8wQ_71qyFI3x';

// Mesas reservadas para testes (coincidem com o range do mesa.spec.ts)
const TEST_MESA_NUMBERS = Array.from({ length: 10 }, (_, i) => String(i + 1));

async function supabaseFetch(requestPath: string, options: RequestInit = {}) {
    const res = await fetch(`${SUPABASE_URL}/rest/v1${requestPath}`, {
        ...options,
        headers: {
            'apikey': SUPABASE_ANON_KEY,
            'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
            'Content-Type': 'application/json',
            'Prefer': 'return=minimal',
            ...(options.headers || {}),
        },
    });
    return res;
}

export default async function globalSetup() {
    console.log('\n🔧 [GlobalSetup] Limpando locks e comandas abertas...');

    const LOCK_DIR = path.join(os.tmpdir(), 'playwright-mesa-locks');
    if (fs.existsSync(LOCK_DIR)) {
        try {
            fs.rmSync(LOCK_DIR, { recursive: true, force: true });
        } catch (e) {
            console.warn('[GlobalSetup] Aviso: não foi possível apagar locks antigos do SO.');
        }
    }

    try {
        // Buscar comandas abertas nas mesas de teste (qualquer company)
        const mesaFilter = TEST_MESA_NUMBERS.map(n => `table_number.eq.${n}`).join(',');

        const res = await supabaseFetch(
            `/comandas?status=eq.aberta&or=(${mesaFilter})&select=id,table_number,company_id`
        );

        if (!res.ok) {
            console.warn(`[GlobalSetup] Não foi possível buscar comandas: ${res.status}`);
            return;
        }

        const comandas: any[] = await res.json();

        if (comandas.length === 0) {
            console.log('[GlobalSetup] ✅ Nenhuma comanda aberta de teste encontrada.');
            return;
        }

        console.log(`[GlobalSetup] Cancelando ${comandas.length} comanda(s): mesas ${[...new Set(comandas.map(c => c.table_number))].join(', ')}`);

        // Cancelar em lote (PATCH)
        const ids = comandas.map(c => c.id);
        const idFilter = ids.map(id => `id.eq.${id}`).join(',');

        const patchRes = await supabaseFetch(
            `/comandas?or=(${idFilter})`,
            {
                method: 'PATCH',
                body: JSON.stringify({ status: 'cancelada' }),
            }
        );

        if (patchRes.ok) {
            console.log(`[GlobalSetup] ✅ ${comandas.length} comanda(s) cancelada(s) com sucesso.`);
        } else {
            const err = await patchRes.text();
            console.warn(`[GlobalSetup] ⚠️ Erro ao cancelar comandas: ${patchRes.status} - ${err}`);
        }
    } catch (e: any) {
        console.warn(`[GlobalSetup] ⚠️ Erro inesperado nas comandas: ${e.message}`);
    }

    try {
        console.log('\n🔧 [GlobalSetup] Verificando se há caixa aberto para a empresa principal de testes...');
        const COMPANY_ID = 'f85bfdc2-982a-4cf7-b176-bce68426f861'; // ID da empresa de testes
        const todayStr = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' }); // Ajuste fuso, retorna YYYY-MM-DD
        const dateKeyObj = new Date();
        const dateKeyStr = `${dateKeyObj.getFullYear()}-${String(dateKeyObj.getMonth() + 1).padStart(2, '0')}-${String(dateKeyObj.getDate()).padStart(2, '0')}`;

        // Verifica se há caixa aberto
        const caixaRes = await supabaseFetch(`/cash_registers?company_id=eq.${COMPANY_ID}&status=eq.aberto&date_key=eq.${dateKeyStr}`);
        if (caixaRes.ok) {
            const caixas = await caixaRes.json();
            if (caixas.length === 0) {
                console.log(`[GlobalSetup] Nenhum caixa aberto para hoje (${dateKeyStr}). Criando...`);
                // Criar caixa
                const createRes = await supabaseFetch(`/cash_registers`, {
                    method: 'POST',
                    body: JSON.stringify({
                        company_id: COMPANY_ID,
                        date_key: dateKeyStr,
                        opened_by: '471cb7c6-0c73-42e6-8afd-8bd10d8a3b50',
                        opened_by_name: 'Admin Playwright',
                        initial_value: 0,
                        expected_balance: 0,
                        status: 'aberto',
                        sales_by_method: { dinheiro: 0, pix: 0, debito: 0, credito: 0 }
                    }),
                });
                if (createRes.ok) {
                    console.log('[GlobalSetup] ✅ Caixa aberto com sucesso para os testes.');
                } else {
                    console.warn(`[GlobalSetup] ⚠️ Erro ao abrir caixa: ${await createRes.text()}`);
                }
            } else {
                console.log('[GlobalSetup] ✅ Caixa de hoje já está aberto.');
            }
        }
    } catch (e: any) {
        console.warn(`[GlobalSetup] ⚠️ Erro inesperado no caixa: ${e.message}`);
    }
}
