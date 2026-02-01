import React, { createContext, useState, useContext, useEffect } from 'react';
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
  const [loading, setLoading] = useState(true);
  const [role, setRole] = useState(null);

  // Simular carregamento inicial
  useEffect(() => {
    const timer = setTimeout(() => {
      setLoading(false);
    }, 1000);
    
    return () => clearTimeout(timer);
  }, []);

  const login = async (email, senha) => {
    try {
      setLoading(true);
      
      // Simular delay de login
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Login simples para teste
      if (email && senha) {
        const userData = {
          nome: 'Usuário Teste',
          email: email,
          funcao: 'admin'
        };
        
        setUser(userData);
        setRole('admin');
        setLoading(false);
        return true;
      } else {
        Alert.alert('Erro', 'Email e senha são obrigatórios');
        setLoading(false);
        return false;
      }
    } catch (error) {
      console.error('Erro no login:', error);
      Alert.alert('Erro no login', 'Tente novamente');
      setLoading(false);
      return false;
    }
  };

  const logout = () => {
    console.log('🚪 Executando logout...');
    try {
      // Limpar estados de forma síncrona
      setUser(null);
      setRole(null);
      setLoading(false); // garantir loading false após logout
      console.log('✅ Logout concluído com sucesso');
    } catch (error) {
      console.error('❌ Erro no logout:', error);
      // Mesmo com erro, garantir limpeza
      setUser(null);
      setRole(null);
      setLoading(false);
    }
  };

  const hasPermission = (permission) => {
    if (!role) return false;
    return role === 'admin'; // Admin tem todas as permissões
  };

  const contextValue = {
    user,
    role,
    loading,
    login,
    logout,
    hasPermission,
    Permissions: {
      ADMIN: 'admin',
      USER: 'user'
    }
  };

  return (
    <AuthContext.Provider value={contextValue}>
      {/* DEBUG: AuthProvider Renderizando filhos */}
      <>
        <React.Fragment>
          <div style={{position:'absolute',top:0,left:0,zIndex:9999,background:'yellow',padding:2}}>
            <span style={{color:'red'}}>DEBUG: AuthProvider ativo</span>
          </div>
          {children || (
            <div style={{color:'red',padding:20}}>Nenhum filho encontrado no AuthProvider!</div>
          )}
        </React.Fragment>
      </>
    </AuthContext.Provider>
  );
};