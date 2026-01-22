import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, View, TextInput, TouchableOpacity, Alert, KeyboardAvoidingView, Platform, Image, BackHandler, ScrollView, TouchableWithoutFeedback, Keyboard } from 'react-native';
import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { Ionicons } from '@expo/vector-icons';

export default function LoginScreen({ navigation }) {
  const { login } = useAuth();
  const { showToast } = useToast();
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [loading, setLoading] = useState(false);
  const [mostrarSenha, setMostrarSenha] = useState(false);

  // ... (useEffect kept as is)

  const handleLogin = async () => {
    if (!email.trim() || !senha.trim()) {
      showToast('Preencha email e senha', 'warning');
      return;
    }

    setLoading(true);
    const success = await login(email.toLowerCase().trim(), senha);
    setLoading(false);

    if (!success) {
      // Erro já mostrado no AuthContext
    }
  };

  const handleSair = () => {
    Alert.alert(
      'Sair do App',
      'Deseja realmente sair?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Sair',
          onPress: () => {
            try {
              BackHandler.exitApp();
            } catch (error) {
              console.error('Erro ao sair do app:', error);
              // Fallback: tentar fechar de outra forma
              if (Platform.OS === 'android') {
                // No Android, podemos tentar usar o método nativo
                require('react-native').NativeModules.DevSettings?.reload();
              }
            }
          }
        }
      ]
    );
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
    >
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.content}>
            {/* Botão Sair - Mover para fora do ScrollView se quiser fixo, mas aqui ok */}
            <TouchableOpacity
              style={styles.exitButton}
              onPress={handleSair}
            >
              <Ionicons name="close" size={24} color="#FFFFFF" />
            </TouchableOpacity>

            {/* Logo/Título */}
            <View style={styles.header}>
              <Image
                source={require('../assets/images/login.png')}
                style={styles.logo}
                resizeMode="contain"
              />
            </View>

            {/* Formulário */}
            <View style={styles.form}>
              <Text style={styles.label}>Email</Text>
              <TextInput
                style={styles.input}
                placeholder="seu@email.com"
                placeholderTextColor="#999"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
              />

              <Text style={styles.label}>Senha</Text>
              <View style={styles.passwordContainer}>
                <TextInput
                  style={styles.passwordInput}
                  placeholder="••••••••"
                  placeholderTextColor="#999"
                  value={senha}
                  onChangeText={setSenha}
                  secureTextEntry={!mostrarSenha}
                  autoCapitalize="none"
                />
                <TouchableOpacity
                  style={styles.eyeButton}
                  onPress={() => setMostrarSenha(!mostrarSenha)}
                >
                  <Ionicons
                    name={mostrarSenha ? 'eye-off' : 'eye'}
                    size={24}
                    color="#8B2F2F"
                  />
                </TouchableOpacity>
              </View>

              <TouchableOpacity
                style={[styles.loginBtn, loading && styles.loginBtnDisabled]}
                onPress={handleLogin}
                disabled={loading}
              >
                <Text style={styles.loginBtnText}>
                  {loading ? 'ENTRANDO...' : 'ENTRAR'}
                </Text>
              </TouchableOpacity>
            </View>

            {/* Rodapé */}
            <Text style={styles.footer}>
              Entre com seu usuário e senha{'\n'}fornecidos pelo administrador
            </Text>

            <TouchableOpacity 
                style={{ marginTop: 20, padding: 10 }}
                onPress={() => navigation.navigate('Register')}
            >
                <Text style={{ color: '#FFF', textAlign: 'center', textDecorationLine: 'underline' }}>
                    Não tem uma conta? Cadastre seu restaurante
                </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </TouchableWithoutFeedback>

      <StatusBar style="light" />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#8B2F2F',
  },
  content: {
    padding: 20,
    paddingHorizontal: 25,
    paddingTop: 40,
    width: '100%',
  },

  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  exitButton: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 50 : 30,
    right: 20,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
  },
  header: {
    alignItems: 'center',
    marginBottom: 20,
    marginTop: -20,
  },
  logo: {
    width: 200,
    height: 200,
  },
  form: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 25,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#8B2F2F',
    marginBottom: 8,
    marginTop: 15,
  },
  input: {
    backgroundColor: '#F5F1E8',
    borderWidth: 1,
    borderColor: '#E0D8C8',
    borderRadius: 12,
    padding: 15,
    fontSize: 16,
    color: '#2C2C2C',
  },
  passwordContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F1E8',
    borderWidth: 1,
    borderColor: '#E0D8C8',
    borderRadius: 12,
    paddingRight: 10,
  },
  passwordInput: {
    flex: 1,
    padding: 15,
    fontSize: 16,
    color: '#2C2C2C',
  },
  eyeButton: {
    padding: 10,
  },
  loginBtn: {
    backgroundColor: '#8B2F2F',
    padding: 18,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 25,
    shadowColor: '#8B2F2F',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 5,
  },
  loginBtnDisabled: {
    opacity: 0.6,
  },
  loginBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 1,
  },
  footer: {
    textAlign: 'center',
    color: '#FFFFFF',
    fontSize: 13,
    marginTop: 30,
    opacity: 0.8,
    lineHeight: 20,
  },
});
