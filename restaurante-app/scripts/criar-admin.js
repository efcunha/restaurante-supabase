const admin = require('firebase-admin');

admin.initializeApp({
  credential: admin.credential.applicationDefault()
});

const db = admin.firestore();

async function criarAdmin() {
  try {
    const email = 'admin@restaurante.com';
    const password = 'admin123';
    const funcao = 'admin';

    // Garantir usuário no Authentication (cria se não existir)
    let user;
    try {
      user = await admin.auth().getUserByEmail(email);
      console.log('✅ Usuário encontrado no Auth:', user.uid);
      // Atualiza senha para garantir acesso conhecido
      await admin.auth().updateUser(user.uid, { password });
      console.log('🔑 Senha redefinida para admin123');
    } catch (err) {
      if (err.code === 'auth/user-not-found') {
        user = await admin.auth().createUser({ email, password, emailVerified: true, disabled: false });
        console.log('✅ Usuário criado no Auth:', user.uid);
      } else {
        throw err;
      }
    }

    // Criar documento na coleção funcionarios
    await db.collection('funcionarios').doc(user.uid).set({
      uid: user.uid,
      nome: 'Administrador',
      cpf: '000.000.000-00',
      funcao,
      email,
      ativo: true,
      criadoEm: new Date().toISOString()
    });

    console.log('✅ Admin cadastrado como funcionário (funcao=admin)!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Erro:', error.message);
    console.error(error);
    process.exit(1);
  }
}

criarAdmin();
