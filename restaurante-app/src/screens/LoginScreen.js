import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, View, TextInput, TouchableOpacity, Alert, KeyboardAvoidingView, Platform, Image, BackHandler, ScrollView, Pressable, Keyboard, useWindowDimensions } from 'react-native';
import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { Ionicons } from '@expo/vector-icons';
import { sendPasswordResetEmail } from 'firebase/auth';
import { auth } from '../config/firebaseConfig';
import { getFriendlyErrorMessage } from '../utils/errorHandler';

export default function LoginScreen({ navigation }) {
  const { login } = useAuth();
  const { showToast } = useToast();
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [loading, setLoading] = useState(false);
  const [mostrarSenha, setMostrarSenha] = useState(false);

  const { height } = useWindowDimensions();

  // Responsividade

  // ... (useEffect kept as is)

  const handleLogin = async () => {
    if (!email.trim() || !senha.trim()) {
      showToast('Preencha email e senha', 'warning');
      return;
    }

    setLoading(true);
    try {
      const success = await login(email.toLowerCase().trim(), senha);
      if (!success) {
        // Se o login retorna false mas não lançou erro, pode ser um caso específico ou o erro já foi tratado no context.
        // Mas se o context lançar erro, ele vem pro catch.
      }
    } catch (e) {
      Alert.alert('Erro no Login', getFriendlyErrorMessage(e));
    } finally {
      setLoading(false);
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
      <Pressable onPress={Keyboard.dismiss} style={{ flex: 1 }}>
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
                source={require('../assets/images/login_v13.png')}
                style={{
                  width: '100%',
                  height: height * 0.32,
                  marginBottom: 10,
                  maxHeight: 300
                }}
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

              <TouchableOpacity
                style={styles.forgotPasswordBtn}
                onPress={async () => {
                  if (!email.trim()) {
                    Alert.alert('Esqueci minha senha', 'Por favor, digite seu email no campo acima primeiro.');
                    return;
                  }

                  Alert.alert(
                    'Redefinir Senha',
                    `Enviar link de redefinição para:\n${email}?`,
                    [
                      { text: 'Cancelar', style: 'cancel' },
                      {
                        text: 'Enviar Email',
                        onPress: async () => {
                          try {
                            await sendPasswordResetEmail(auth, email.trim());
                            Alert.alert('Sucesso', '✅ Email enviado!\nVerifique sua caixa de entrada (e spam) para redefinir a senha.');
                          } catch (error) {
                            Alert.alert('Erro', '❌ Não foi possível enviar: ' + error.message);
                          }
                        }
                      }
                    ]
                  );
                }}
              >
                <Text style={styles.forgotPasswordText}>Esqueci minha senha</Text>
              </TouchableOpacity>
            </View>

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
      </Pressable>

      <StatusBar style="light" />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#7f2821', // Updated to match the image background perfectly
  },
  content: {
    padding: 20,
    paddingHorizontal: 25,
    paddingTop: 10,
    width: '100%',
  },

  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingBottom: 20,
  },
  exitButton: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 40 : 20,
    right: 20,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.2)', // Darker background for visibility
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
  },
  header: {
    alignItems: 'center',
    marginBottom: 0,
    marginTop: 0,
  },
  logo: {
    // Dynamic size via inline styles
    marginBottom: 10,
  },
  form: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20, // Reduzido de 25
    boxShadow: '0px 10px 20px rgba(0, 0, 0, 0.3)',
    elevation: 10,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#7f2821', // Updated primary color
    marginBottom: 6,
    marginTop: 10, // Menos margem
  },
  input: {
    backgroundColor: '#F5F1E8',
    borderWidth: 1,
    borderColor: '#E0D8C8',
    borderRadius: 12,
    padding: 12, // Menos padding interno
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
    padding: 12, // Menos padding interno
    fontSize: 16,
    color: '#2C2C2C',
  },
  eyeButton: {
    padding: 10,
  },
  loginBtn: {
    backgroundColor: '#7f2821', // Updated primary color
    padding: 15, // Menos padding vertical
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 20,
    boxShadow: '0px 5px 10px rgba(127, 40, 33, 0.3)',
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
    fontSize: 12, // Fonte um pouco menor
    marginTop: 20,
    opacity: 0.8,
    lineHeight: 18,
  },
  forgotPasswordBtn: {
    marginTop: 15,
    padding: 5,
    alignSelf: 'center',
  },
  forgotPasswordText: {
    color: '#7f2821', // Updated link color
    fontSize: 14,
    textDecorationLine: 'underline',
    fontWeight: '600',
  },
});
