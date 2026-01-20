const admin = require('firebase-admin');
admin.initializeApp({ credential: admin.credential.cert(sa) });
(async () => {
  try {
    const email = 'admin@restaurante.com';
    const uid = (await admin.auth().getUserByEmail(email)).uid;
    const docRef = admin.firestore().collection('funcionarios').doc(uid);
    const snap = await docRef.get();
    console.log('Doc exists?', snap.exists);
    if (!snap.exists) {
      await docRef.set({ uid, nome: 'Administrador', cpf: '000.000.000-00', funcao: 'admin', email, ativo: true, criadoEm: new Date().toISOString() });
      console.log('Created doc.');
    } else {
      console.log('Doc data', snap.data());
    }
    process.exit(0);
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
})();
