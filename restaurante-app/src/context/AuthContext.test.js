import React, { createContext, useState, useContext } from 'react';
import { Alert } from 'react-native';

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
  const [loading, setLoading] = useState(false);
  const [role, setRole] = useState(null);

  const login = async (email, senha) => {
    try {
      // Simular login sem Firebase
      if (email === 'admin@teste.com' && senha === '123456') {
        setUser({ nome: 'Admin Teste', email, funcao: 'admin' });
        setRole('admin');
        return true;
      } else {
        Alert.alert('Erro', 'Email ou senha incorretos');
        return false;
      }
    } catch (error) {
      Alert.alert('Erro no login', error.message);
      return false;
    }
  };

  const logout = () => {
    console.log('🚪 Fazendo logout (versão teste)...');
    
    // Limpar estados
    setUser(null);
    setRole(null);
    
    console.log('✅ Logout concluído (versão teste)');
  };

  const hasPermission = (perm) => {
    return role === 'admin'; // Admin tem todas as permissões
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        role,
        loading,
        login,
        logout,
        hasPermission,
        Permissions: {
          ADMIN: 'admin',
          USER: 'user'
        },
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};