const admin = require('firebase-admin');
const fs = require('fs');

admin.initializeApp({ credential: admin.credential.cert(sa) });

(async () => {
  try {
    const projectId = sa.project_id;
    const rulesFile = './firestore.rules';
    
    if (!fs.existsSync(rulesFile)) {
      console.error('❌ Arquivo firestore.rules não encontrado!');
      process.exit(1);
    }
    
    const rules = fs.readFileSync(rulesFile, 'utf8');
    
    console.log('📋 Regras a serem publicadas:');
    console.log('─'.repeat(50));
    console.log(rules);
    console.log('─'.repeat(50));
    console.log('');
    console.log('⚠️  IMPORTANTE: As regras do Firestore devem ser publicadas');
    console.log('    manualmente no Firebase Console:');
    console.log('');
    console.log(`    1. Acesse: https://console.firebase.google.com/project/${projectId}/firestore/rules`);
    console.log('    2. Cole as regras acima');
    console.log('    3. Clique em "Publicar"');
    console.log('');
    console.log('💡 Após publicar, aguarde ~1 minuto e teste o login novamente.');
    
    process.exit(0);
  } catch (e) {
    console.error('❌ Erro:', e.message);
    process.exit(1);
  }
})();
