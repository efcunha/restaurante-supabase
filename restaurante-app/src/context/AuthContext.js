import React, { createContext, useState, useContext, useEffect, useCallback, useRef } from 'react';
import { Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, onAuthStateChanged, setPersistence, browserLocalPersistence } from 'firebase/auth';
import { auth, db } from '../config/firebaseConfig';
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
  const [sessionKey, setSessionKey] = useState(1);
  const isManualLoginRef = useRef(false);

  useEffect(() => {
    let mounted = true;
    
    // DESABILITAR PERSISTÊNCIA FIREBASE COMPLETAMENTE
    const initAuth = async () => {
      try {
        // Forçar logout inicial
        await signOut(auth);
        await AsyncStorage.clear();
        
        // Limpar estados
        if (mounted) {
          setUser(null);
          setRole(null);
          isManualLoginRef.current = false;
          setLoading(false);
        }
      } catch (error) {
        if (mounted) {
          setUser(null);
          setRole(null);
          isManualLoginRef.current = false;
          setLoading(false);
        }
      }
    };
    
    initAuth();

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (!mounted) return;
      
      const { isIgnorandoMudancaAuth } = require('../services/funcionarios');
      
      if (isIgnorandoMudancaAuth()) {
        return;
      }
      
      if (firebaseUser && isManualLoginRef.current) {
        return;
      }
      
      if (firebaseUser && !isManualLoginRef.current) {
        try {
          await signOut(auth);
          await AsyncStorage.clear();
        } catch (error) {}
      }
      
      if (mounted) {
        setUser(null);
        setRole(null);
        isManualLoginRef.current = false;
        setLoading(false);
      }
    });

    return () => {
      mounted = false;
      unsubscribe();
    };
  }, []);

  const login = async (email, senha) => {
    try {
      setLoading(true);
      
      // PRIMEIRO: Garantir logout completo
      try {
        await signOut(auth);
        await AsyncStorage.clear();
      } catch (e) {}
      
      // SEGUNDO: Marcar como login manual
      isManualLoginRef.current = true;
      
      // TERCEIRO: Fazer login
      console.log('[Auth] Tentando login Firebase Auth...');
      const userCredential = await signInWithEmailAndPassword(auth, email, senha);
      console.log('[Auth] ✅ Auth OK, UID:', userCredential.user.uid);
      
      // Aguardar token de auth propagar
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      console.log('[Auth] Buscando funcionário no Firestore...');
      const result = await buscarFuncionarioPorUid(userCredential.user.uid);
      console.log('[Auth] Resultado busca:', result);
      
      if (result.success) {
        // Obter dados da empresa
        let companyData = null;
        if (result.funcionario.companyId) {
            try {
                const { getDoc, doc } = require('firebase/firestore');
                const companyDoc = await getDoc(doc(db, 'companies', result.funcionario.companyId));
                if (companyDoc.exists()) {
                    companyData = { id: companyDoc.id, ...companyDoc.data() };
                    console.log('[Auth] 🏢 Empresa carregada:', companyData.name);
                }
            } catch (companyError) {
                console.error('[Auth] ❌ Erro ao carregar empresa:', companyError);
            }
        }

        // QUARTO: Definir estados manualmente
        setUser({ ...result.funcionario, company: companyData }); // Anexar dados da empresa ao user
        setRole(normalizeRole(result.funcionario.funcao));
        setSessionKey(k => k + 1);
        setLoading(false);
        return true;
      } else {
        await signOut(auth);
        isManualLoginRef.current = false;
        Alert.alert(
          'Acesso negado', 
          `Usuário não cadastrado como funcionário.\n\n` +
          `UID: ${userCredential.user.uid}\n` +
          `Email: ${userCredential.user.email}\n\n` +
          `Erro: ${result.error || 'Erro desconhecido'}\n\n` +
          `Se o erro for "permission-denied", as regras do Firestore não foram aplicadas corretamente.`
        );
        setLoading(false);
        return false;
      }
    } catch (error) {
      console.error('[Auth] ❌ Erro no login:', error);
      isManualLoginRef.current = false;
      let errorMessage = 'Erro ao fazer login';
      let errorDetails = '';
      
      if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password') {
        errorMessage = 'Email ou senha incorretos';
      } else if (error.code === 'auth/invalid-email') {
        errorMessage = 'Email inválido';
      } else if (error.code) {
        errorMessage = `Código: ${error.code}`;
        errorDetails = error.message || 'Sem detalhes';
      } else {
        errorDetails = error.message || error.toString();
      }
      
      Alert.alert(
        'Erro no login', 
        errorDetails ? `${errorMessage}\n\n${errorDetails}` : errorMessage
      );
      setLoading(false);
      return false;
    }
  };

  const logout = async () => {
    try {
      // PRIMEIRO: Limpar flag de login manual
      isManualLoginRef.current = false;
      
      // SEGUNDO: Limpar estados IMEDIATAMENTE
      setUser(null);
      setRole(null);
      setLoading(false);
      setSessionKey(Date.now());
      
      // TERCEIRO: Limpar Firebase e AsyncStorage
      await signOut(auth);
      await AsyncStorage.clear();
    } catch (error) {
      // Mesmo com erro, garantir limpeza local
      isManualLoginRef.current = false;
      setUser(null);
      setRole(null);
      setLoading(false);
      setSessionKey(Date.now());
      AsyncStorage.clear().catch(() => {});
    }
  };

  const register = async (email, password) => {
    try {
      setLoading(true);
      // PRIMEIRO: Garantir logout
      try {
        await signOut(auth);
        await AsyncStorage.clear();
      } catch (e) {}
      
      // SEGUNDO: Marcar como login manual para evitar auto-logout
      isManualLoginRef.current = true;
      
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      // Opcional: recarregar ou definir user/role se necessário, mas para registro inicial 
      // talvez a gente só queira o objeto user e deixar o componente lidar com DB
      setLoading(false);
      return { success: true, user: userCredential.user };
    } catch (error) {
      console.error('[Auth] ❌ Erro no registro:', error);
      isManualLoginRef.current = false;
      setLoading(false);
      return { success: false, error };
    }
  };

  const switchUser = useCallback(() => {
    Alert.alert(
      'Trocar Usuário',
      'Deseja trocar de usuário?',
      [
        { text: 'Cancelar', style: 'cancel' },
        { 
          text: 'Trocar', 
          onPress: async () => {
            await logout();
          }
        }
      ]
    );
  }, []);

  return (
    <AuthContext.Provider value={{ 
      user, 
      role, 
      loading, 
      login, 
      logout, // Usar logout real
      register, // Adicionado para evitar logout no cadastro
      sessionKey, 
      hasPermission: (perm) => hasPermission(role, perm), 
      Permissions 
    }}>
      {children}
    </AuthContext.Provider>
  );
};
