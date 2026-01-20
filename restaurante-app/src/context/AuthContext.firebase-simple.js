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

  // LOGOUT SUPER SIMPLES - SEM ASYNC
  const logout = () => {
    console.log('🚪 Fazendo logout simples...');
    
    // 1. Limpar estados IMEDIATAMENTE
    setUser(null);
    setRole(null);
    
    // 2. Firebase signOut SEM AWAIT (fire and forget)
    signOut(auth).catch(error => {
      console.error('Erro no Firebase signOut (ignorado):', error);
      // Não importa se falhar, estados já foram limpos
    });
    
    console.log('✅ Logout concluído');
  };

  // Listener do Firebase - SIMPLES
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      try {
        if (firebaseUser) {
          const result = await buscarFuncionarioPorUid(firebaseUser.uid);
          
          if (result.success) {
            const r = normalizeRole(result.funcionario.funcao);
            setUser(result.funcionario);
            setRole(r);
          } else {
            setUser(null);
            setRole(null);
          }
        } else {
          setUser(null);
          setRole(null);
        }
      } catch (error) {
        console.error('Erro no listener:', error);
        setUser(null);
        setRole(null);
      } finally {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

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