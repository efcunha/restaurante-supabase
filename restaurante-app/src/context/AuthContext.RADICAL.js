import React, { createContext, useState, useContext, useEffect } from 'react';
import { Alert } from 'react-native';
import { signInWithEmailAndPassword, signOut, onAuthStateChanged } from 'firebase/auth';
import { auth } from '../config/firebaseConfig';
import { buscarFuncionarioPorUid } from '../services/funcionarios';
import { normalizeRole, hasPermission, Permissions } from '../auth/roles';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [role, setRole] = useState(null);

  // SOLUÇÃO RADICAL - SEMPRE COMEÇAR LIMPO
  useEffect(() => {
    const forceCleanStart = async () => {
      console.log('🔥 SOLUÇÃO RADICAL - LIMPEZA TOTAL');
      
      // 1. Limpar estados imediatamente
      setUser(null);
      setRole(null);
      
      // 2. Logout forçado múltiplas vezes
      for (let i = 0; i < 3; i++) {
        try {
          await signOut(auth);
          console.log(`✅ Logout ${i + 1}/3 executado`);
        } catch (error) {
          console.log(`⚠️ Erro logout ${i + 1}:`, error);
        }
      }
      
      // 3. Aguardar um pouco
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // 4. Garantir estados limpos
      setUser(null);
      setRole(null);
      setLoading(false);
      
      console.log('✅ LIMPEZA RADICAL CONCLUÍDA - APP DEVE PEDIR LOGIN');
    };

    forceCleanStart();
  }, []);

  const login = async (email, senha) => {
    try {
      setLoading(true);
      
      const userCredential = await signInWithEmailAndPassword(auth, email, senha);
      const result = await buscarFuncionarioPorUid(userCredential.user.uid);
      
      if (result.success) {
        const r = normalizeRole(result.funcionario.funcao);
        setUser(result.funcionario);
        setRole(r);
        setLoading(false);
        return true;
      } else {
        await signOut(auth);
        Alert.alert('Acesso negado', 'Usuário não cadastrado como funcionário.');
        setLoading(false);
        return false;
      }
    } catch (error) {
      console.error('Erro no login:', error);
      let errorMessage = 'Erro ao fazer login';
      
      if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password') {
        errorMessage = 'Email ou senha incorretos';
      } else if (error.code === 'auth/invalid-email') {
        errorMessage = 'Email inválido';
      }
      
      Alert.alert('Erro no login', errorMessage);
      setLoading(false);
      return false;
    }
  };

  const logout = async () => {
    try {
      console.log('🚪 Logout iniciado...');
      setLoading(true);
      
      // Logout múltiplo para garantir
      for (let i = 0; i < 2; i++) {
        try {
          await signOut(auth);
        } catch (error) {
          console.log(`Erro logout ${i + 1}:`, error);
        }
      }
      
      // Limpeza forçada
      setUser(null);
      setRole(null);
      
      console.log('✅ Logout concluído');
      return true;
    } catch (error) {
      console.error('Erro no logout:', error);
      // Forçar limpeza mesmo com erro
      setUser(null);
      setRole(null);
      return true;
    } finally {
      setLoading(false);
    }
  };

  // Listener DESABILITADO - causa problemas
  // Vamos controlar manualmente o estado

  return (
    <AuthContext.Provider
      value={{
        user,
        role,
        loading,
        login,
        logout,
        hasPermission: (perm) => hasPermission(role, perm),
        Permissions,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
