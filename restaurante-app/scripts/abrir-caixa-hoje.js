
const admin = require('firebase-admin');

// Initialize Admin SDK with Application Default Credentials
admin.initializeApp({
    credential: admin.credential.applicationDefault()
});

const db = admin.firestore();

const dateKey = () => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

const buildCaixaDocId = (data = dateKey()) => `caixa-${data}`;

async function abrirCaixaAgora() {
    const hoje = dateKey();
    const caixaId = buildCaixaDocId(hoje);
    const caixaRef = db.collection('caixas').doc(caixaId);

    try {
        const doc = await caixaRef.get();

        if (doc.exists && doc.data().status === 'aberto') {
            console.log(`✅ O caixa de hoje (${hoje}) JÁ ESTÁ ABERTO!`);
            return;
        }

        console.log(`🔓 Abrindo caixa para ${hoje}...`);

        const caixaData = {
            data: hoje,
            abertoPor: 'system-script',
            abertoPorNome: 'Script Automático',
            valorInicial: 100.00, // Valor padrão para testes
            abertoAt: admin.firestore.FieldValue.serverTimestamp(),
            status: 'aberto',
            vendasTotal: 0,
            porForma: { dinheiro: 0, pix: 0, debito: 0, credito: 0 },
            reforcosTotal: 0,
            sangriasTotal: 0,
            movimentosCount: 0,
            fechadoAt: null,
            fechadoPor: null,
            saldoEsperado: 100.00,
            saldoReal: null,
            diferenca: null,
            ticketMedio: null,
            atualizado: admin.firestore.FieldValue.serverTimestamp(),
        };

        await caixaRef.set(caixaData);
        console.log(`✅ SUCESSO! Caixa ${caixaId} aberto.`);
        console.log('Agora você pode criar pedidos no app.');

    } catch (error) {
        console.error('❌ Erro ao abrir caixa:', error);
    }
}

abrirCaixaAgora().then(() => process.exit(0));
