const admin = require('firebase-admin');
admin.initializeApp({ credential: admin.credential.cert(sa) });

(async () => {
  try {
    const uid = 'aIxYddzLgcUt1RkBnYnJbzAzqa82';
    await admin.auth().updateUser(uid, { password: 'admin123' });
    console.log('✅ Senha resetada para admin123');
  } catch (e) {
    console.error('❌ Erro:', e.message);
  }
  process.exit(0);
})();
