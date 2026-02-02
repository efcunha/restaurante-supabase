import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signOut,
  onAuthStateChanged,
  User 
} from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { auth, db } from '../config/firebaseConfig';

interface AuthResult {
  success: boolean;
  user?: { uid: string; email: string | null; nome?: string; role?: string };
  error?: string;
}

/**
 * Cria um novo usuário com email e senha
 * @param {string} email - Email do usuário
 * @param {string} password - Senha do usuário
 * @param {string} nome - Nome do usuário
 * @param {string} role - Papel do usuário (admin, churrasqueiro, montagem)
 * @returns {Promise<AuthResult>} Dados do usuário criado
 */
export const criarUsuario = async (email: string, password: string, nome: string, role: string = 'admin'): Promise<AuthResult> => {
  try {
    // Criar usuário no Firebase Auth
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    // Criar documento do usuário no Firestore
    await setDoc(doc(db, 'users', user.uid), {
      uid: user.uid,
      email: user.email,
      nome: nome,
      role: role,
      criadoEm: new Date(),
      ativo: true,
    });
    return { 
      success: true, 
      user: { uid: user.uid, email: user.email, nome, role } 
    };
  } catch (error: any) {
    
    // Mensagens de erro mais amigáveis
    let mensagem = 'Erro ao criar usuário';
    if (error.code === 'auth/email-already-in-use') {
      mensagem = 'Este email já está em uso';
    } else if (error.code === 'auth/weak-password') {
      mensagem = 'A senha deve ter pelo menos 6 caracteres';
    } else if (error.code === 'auth/invalid-email') {
      mensagem = 'Email inválido';
    }
    
    return { success: false, error: mensagem };
  }
};

/**
 * Faz login do usuário com email e senha
 * @param {string} email - Email do usuário
 * @param {string} password - Senha do usuário
 * @returns {Promise<AuthResult>} Dados do usuário logado
 */
export const fazerLogin = async (email: string, password: string): Promise<AuthResult> => {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;
    return { 
      success: true, 
      user: { uid: user.uid, email: user.email } 
    };
  } catch (error: any) {
    
    let mensagem = 'Erro ao fazer login';
    if (error.code === 'auth/user-not-found') {
      mensagem = 'Usuário não encontrado';
    } else if (error.code === 'auth/wrong-password') {
      mensagem = 'Senha incorreta';
    } else if (error.code === 'auth/invalid-email') {
      mensagem = 'Email inválido';
    } else if (error.code === 'auth/too-many-requests') {
        mensagem = 'Muitas tentativas. Tente novamente mais tarde.';
    }
    
    return { success: false, error: mensagem };
  }
};

/**
 * Faz logout do usuário atual
 * @returns {Promise<Object>} Resultado do logout
 */
export const fazerLogout = async (): Promise<{ success: boolean; error?: string }> => {
  try {
    await signOut(auth);
    return { success: true };
  } catch (error) {
    return { success: false, error: 'Erro ao fazer logout' };
  }
};

/**
 * Observa mudanças no estado de autenticação
 * @param {Function} callback - Função callback que recebe o usuário (ou null)
 * @returns {Function} Função para remover o observer
 */
export const observarAutenticacao = (callback: (user: { uid: string; email: string | null } | null) => void) => {
  return onAuthStateChanged(auth, (user: User | null) => {
    if (user) {
      callback({ uid: user.uid, email: user.email });
    } else {
      callback(null);
    }
  });
};

/**
 * Retorna o usuário atual autenticado
 * @returns {Object|null} Dados do usuário ou null
 */
export const getUsuarioAtual = () => {
  const user = auth.currentUser;
  if (user) {
    return { uid: user.uid, email: user.email };
  }
  return null;
};
