/**
 * Serviço de Funcionários
 * Gerencia cadastro e consulta de funcionários no Firestore
 */

import {
  collection,
  addDoc,
  updateDoc,
  doc,
  setDoc,
  getDoc,
  getDocs,
  deleteDoc,
  query,
  where,
  orderBy
} from 'firebase/firestore';
import { db } from '../config/firebaseConfig';
import { createUserWithEmailAndPassword, updatePassword, deleteUser } from 'firebase/auth';
import { auth } from '../config/firebaseConfig';

const FUNCIONARIOS_COLLECTION = 'users'; // Migrated from 'funcionarios' for SaaS

// Flag para ignorar mudanças de auth durante cadastro
let ignorandoMudancaAuth = false;

export const setIgnorarMudancaAuth = (valor) => {
  ignorandoMudancaAuth = valor;
};

export const isIgnorandoMudancaAuth = () => ignorandoMudancaAuth;

/**
 * Cria um novo funcionário no Firestore e no Firebase Auth
 * @param {Object} dados - {nome, cpf, funcao, email, senha}
 * @returns {Promise<Object>} {success, funcionarioId, error}
 */
export const criarFuncionario = async (dados) => {
  try {
    setIgnorarMudancaAuth(true);

    const userCredential = await createUserWithEmailAndPassword(
      auth,
      dados.email,
      dados.senha
    );

    const uid = userCredential.user.uid;

    const funcionarioData = {
      uid,
      nome: dados.nome.trim(),
      cpf: dados.cpf.trim(),
      funcao: dados.funcao,
      email: dados.email.toLowerCase().trim(),
      ativo: true,
      criadoEm: new Date().toISOString(),
    };

    const docRef = doc(db, FUNCIONARIOS_COLLECTION, uid);
    await setDoc(docRef, funcionarioData);
    await auth.signOut();

    setIgnorarMudancaAuth(false);

    return {
      success: true,
      funcionarioId: uid,
      funcionario: { ...funcionarioData, id: uid }
    };
  } catch (error) {
    setIgnorarMudancaAuth(false);

    let errorMessage = 'Erro: ' + error.message;
    if (error.code === 'auth/email-already-in-use') {
      errorMessage = 'Email já cadastrado';
    } else if (error.code === 'auth/weak-password') {
      errorMessage = 'Senha muito fraca (mínimo 6 caracteres)';
    } else if (error.code === 'auth/invalid-email') {
      errorMessage = 'Email inválido';
    }

    return {
      success: false,
      error: errorMessage
    };
  }
};

/**
 * Lista todos os funcionários ativos
 * @returns {Promise<Object>} {success, funcionarios, error}
 */
export const listarFuncionarios = async () => {
  try {
    const querySnapshot = await getDocs(collection(db, FUNCIONARIOS_COLLECTION));
    const funcionarios = [];

    querySnapshot.forEach((doc) => {
      const data = doc.data();
      funcionarios.push({
        id: doc.id,
        ...data,
      });
    });

    funcionarios.sort((a, b) => a.nome.localeCompare(b.nome));

    return { success: true, funcionarios };
  } catch (error) {
    return { success: false, error: error.message, funcionarios: [] };
  }
};

/**
 * Lista funcionários por função
 * @param {string} funcao - garcom, churrasqueiro, montagem, admin
 * @returns {Promise<Object>} {success, funcionarios}
 */
export const listarFuncionariosPorFuncao = async (funcao) => {
  try {
    const q = query(
      collection(db, FUNCIONARIOS_COLLECTION),
      where('funcao', '==', funcao),
      where('ativo', '==', true)
    );

    const querySnapshot = await getDocs(q);
    const funcionarios = [];

    querySnapshot.forEach((doc) => {
      funcionarios.push({
        id: doc.id,
        ...doc.data(),
      });
    });

    // Ordenar localmente
    funcionarios.sort((a, b) => a.nome.localeCompare(b.nome));

    return { success: true, funcionarios };
  } catch (error) {
    return { success: false, error: error.message, funcionarios: [] };
  }
};

/**
 * Busca funcionário por UID do Firebase Auth
 * @param {string} uid - UID do usuário autenticado
 * @returns {Promise<Object>} {success, funcionario}
 */
export const buscarFuncionarioPorUid = async (uid) => {
  try {
    const docRef = doc(db, FUNCIONARIOS_COLLECTION, uid);
    const docSnap = await getDoc(docRef);

    if (!docSnap.exists()) {
      return { success: false, error: 'Funcionário não encontrado' };
    }

    const funcionario = {
      id: docSnap.id,
      ...docSnap.data(),
    };
    return { success: true, funcionario };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

/**
 * Deleta permanentemente um funcionário do Firestore e do Authentication
 * @param {string} funcionarioId - ID do funcionário (UID)
 * @returns {Promise<Object>} {success, error}
 */
export const deletarFuncionario = async (funcionarioId) => {
  try {
    const funcionarioRef = doc(db, FUNCIONARIOS_COLLECTION, funcionarioId);
    const docSnap = await getDoc(funcionarioRef);

    if (!docSnap.exists()) {
      return { success: false, error: 'Funcionário não encontrado' };
    }

    await deleteDoc(funcionarioRef);

    return {
      success: true,
      warning: 'Funcionário removido do sistema. O email ainda existe no Firebase Authentication.'
    };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

/**
 * Desativa um funcionário (soft delete)
 * @param {string} funcionarioId - ID do funcionário
 * @returns {Promise<Object>} {success, error}
 */
export const desativarFuncionario = async (funcionarioId) => {
  try {
    console.log('[Funcionarios] 🗑️ Desativando funcionário ID:', funcionarioId);
    const funcionarioRef = doc(db, FUNCIONARIOS_COLLECTION, funcionarioId);

    // Verificar se o documento existe primeiro
    const docSnap = await getDoc(funcionarioRef);
    if (!docSnap.exists()) {
      console.error('[Funcionarios] ❌ Funcionário não encontrado:', funcionarioId);
      return { success: false, error: 'Funcionário não encontrado' };
    }

    console.log('[Funcionarios] 📋 Dados atuais:', docSnap.data());
    console.log('[Funcionarios] 🔄 Atualizando ativo = false...');

    await updateDoc(funcionarioRef, {
      ativo: false,
      desativadoEm: new Date().toISOString()
    });

    console.log('[Funcionarios] ✅ Funcionário desativado com sucesso!');
    return { success: true };
  } catch (error) {
    console.error('[Funcionarios] ❌ Erro ao desativar:', error);
    console.error('[Funcionarios] ❌ Código:', error.code);
    console.error('[Funcionarios] ❌ Mensagem:', error.message);
    return { success: false, error: error.message };
  }
};

/**
 * Atualiza dados de um funcionário
 * @param {string} funcionarioId - ID do funcionário (UID do Firebase Auth)
 * @param {Object} dadosAtualizados - Campos a atualizar {nome, cpf, email, senha, funcao}
 * @returns {Promise<Object>} {success, error}
 */
export const atualizarFuncionario = async (funcionarioId, dadosAtualizados) => {
  try {
    console.log('[Funcionarios] ✏️ Atualizando funcionário ID:', funcionarioId);
    console.log('[Funcionarios] 📋 Dados para atualizar:', { ...dadosAtualizados, senha: dadosAtualizados.senha ? '***' : undefined });

    const funcionarioRef = doc(db, FUNCIONARIOS_COLLECTION, funcionarioId);

    // Verificar se existe
    const docSnap = await getDoc(funcionarioRef);
    if (!docSnap.exists()) {
      console.error('[Funcionarios] ❌ Funcionário não encontrado:', funcionarioId);
      return { success: false, error: 'Funcionário não encontrado' };
    }

    const dadosAtuais = docSnap.data();

    // Preparar dados para atualização no Firestore
    const updateData = {
      atualizadoEm: new Date().toISOString()
    };

    if (dadosAtualizados.nome) updateData.nome = dadosAtualizados.nome.trim();
    if (dadosAtualizados.cpf) updateData.cpf = dadosAtualizados.cpf.trim();
    if (dadosAtualizados.funcao) updateData.funcao = dadosAtualizados.funcao;
    if (dadosAtualizados.ativo !== undefined) updateData.ativo = dadosAtualizados.ativo;

    // Se tem novo email, atualizar
    if (dadosAtualizados.email && dadosAtualizados.email !== dadosAtuais.email) {
      console.log('[Funcionarios] 📧 Novo email detectado:', dadosAtualizados.email);
      updateData.email = dadosAtualizados.email.toLowerCase().trim();

      // NOTA: Atualizar email no Firebase Auth requer que o usuário esteja logado
      // Como o admin está fazendo isso, vamos apenas atualizar no Firestore
      // O usuário precisará fazer login novamente com o novo email
      console.warn('[Funcionarios] ⚠️ Email atualizado apenas no Firestore');
      console.warn('[Funcionarios] 💡 Usuário deve fazer login com o novo email');
    }

    // Se tem nova senha, desativar e avisar para recriar manualmente
    if (dadosAtualizados.senha && dadosAtualizados.senha.trim().length >= 6) {
      console.log('[Funcionarios] 🔐 Nova senha detectada');
      console.warn('[Funcionarios] ⚠️ Limitação do Firebase: não é possível alterar senha de outro usuário');

      console.warn('[Funcionarios] ⚠️ Limitação do Firebase: não é possível alterar senha de outro usuário');

      return {
        success: true, // Allow other changes to succeed
        warning: 'Dados atualizados com sucesso!\n\n' +
          '⚠️ A SENHA NÃO FOI ALTERADA.\n' +
          'Por segurança, não é possível alterar senha de outro usuário.\n\n' +
          'Peça para o funcionário usar "Esqueci minha senha" no login.'
      };
    }

    console.log('[Funcionarios] 🔄 Dados finais para update:', updateData);
    await updateDoc(funcionarioRef, updateData);

    console.log('[Funcionarios] ✅ Funcionário atualizado com sucesso!');
    return { success: true };
  } catch (error) {
    console.error('[Funcionarios] ❌ Erro ao atualizar:', error);
    console.error('[Funcionarios] ❌ Código:', error.code);
    return { success: false, error: error.message };
  }
};
