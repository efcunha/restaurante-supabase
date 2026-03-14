import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, View, TextInput, TouchableOpacity, Alert, Platform, Image, BackHandler, ScrollView, NativeModules, Dimensions } from 'react-native';
import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../config/SupabaseConfig'; // Replaced firebase config
import { getUserFriendlyMessage } from '../utils/errors';
import { validateEmail } from '../utils/validation';
import MFAVerificationModal from '../components/MFAVerificationModal';
// @ts-ignore
import { NativeStackNavigationProp } from '@react-navigation/native-stack';

interface Props {
  navigation: NativeStackNavigationProp<any>;
}

export default function LoginScreen({ navigation }: Props) {
  const { login, loginWithBiometric, biometricAvailable, biometricType, mfaResolver, setMfaResolver } = useAuth();
  const { showToast } = useToast();
  const windowWidth = Dimensions.get('window').width;
  const WIDE_BREAKPOINT = 720;
  const isWideLayout = windowWidth >= WIDE_BREAKPOINT;
  const logoSize = isWideLayout
    ? Math.min(Math.max(windowWidth * 0.16, 220), 280)
    : Math.min(Math.max(windowWidth * 0.42, 220), 300);
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [loading, setLoading] = useState(false);
  const [mostrarSenha, setMostrarSenha] = useState(false);

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
      Alert.alert('Erro no Login', getUserFriendlyMessage(e));
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
                NativeModules.DevSettings?.reload();
              }
            }
          }
        }
      ]
    );
  };

  return (
    <View style={styles.container}>
      {/* Botão Sair - Fixo no topo */}
      <TouchableOpacity
        style={styles.exitButton}
        onPress={handleSair}
      >
        <Ionicons name="close" size={24} color="#FFFFFF" />
      </TouchableOpacity>

      <ScrollView
        contentContainerStyle={[styles.scrollContent, isWideLayout && styles.scrollContentWide]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={[styles.content, isWideLayout && styles.contentWide]}>
            {/* Logo/Título */}
            <View style={styles.header}>
              <Image
                source={require('../../imagem/icone.png')}
                style={[styles.logo, { width: logoSize, height: logoSize }]}
                resizeMode="contain"
              />
            </View>

            {/* Formulário */}
            <View style={[styles.form, isWideLayout && styles.formWide]}>
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

              {biometricAvailable && (
                <TouchableOpacity
                  style={[styles.biometricBtn, { marginTop: 15 }]}
                  onPress={async () => {
                    const result = await loginWithBiometric();
                    if (!result.success && result.error) {
                       // Show error alert natively from the UI component
                       Alert.alert('Biometria', result.error);
                    }
                  }}
                  disabled={loading}
                >
                  <Ionicons 
                    name={biometricType === 'Reconhecimento Facial' ? 'scan-outline' : 'finger-print-outline'} 
                    size={24} 
                    color="#7f2821" 
                    style={{ marginRight: 10 }}
                  />
                  <Text style={styles.biometricBtnText}>
                    Entrar com {biometricType}
                  </Text>
                </TouchableOpacity>
              )}

              <TouchableOpacity
                style={styles.forgotPasswordBtn}
                onPress={async () => {
                  if (!email.trim()) {
                    Alert.alert('Esqueci minha senha', 'Por favor, digite seu email no campo acima primeiro.');
                    return;
                  }

                  const validation = validateEmail(email.trim());
                  if (!validation.isValid) {
                    Alert.alert('Email Inválido', validation.error || 'Por favor, digite um email válido.');
                    return;
                  }

                  Alert.alert(
                    'Redefinir Senha',
                    `Enviar link de redefinição para:\n${email.trim()}?`,
                    [
                      { text: 'Cancelar', style: 'cancel' },
                      {
                        text: 'Enviar Email',
                        onPress: async () => {
                          try {
                            const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
                              redirectTo: 'your-app://reset-password'
                            });
                            if (error) throw error;
                            Alert.alert('Sucesso', '✅ Email enviado!\nVerifique sua caixa de entrada (e spam) para redefinir a senha.');
                          } catch (error: any) {
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
              style={styles.registerLink}
              onPress={() => navigation.navigate('Register')}
            >
              <Text style={styles.registerLinkText}>
                Não tem conta? Cadastre seu restaurante
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>

        <StatusBar style="light" />

        {/* MFA Verification Modal */}
        <MFAVerificationModal
          visible={!!mfaResolver}
          resolver={mfaResolver}
          onSuccess={() => {
              setMfaResolver(null);
              // Auth state listener in AuthContext will handle the successful login/redirect
          }}
          onCancel={() => {
              setMfaResolver(null);
          }}
        />
      </View>
    );
  }

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#7f2821', // Updated to match the image background perfectly
  },
  content: {
    padding: 10,
    paddingHorizontal: 20,
    paddingTop: 5,
    width: '100%',
  },
  contentWide: {
    width: '92%',
    maxWidth: 560,
    alignSelf: 'center',
  },

  scrollContent: {
    paddingTop: 60,
    paddingBottom: 20,
  },
  scrollContentWide: {
    alignItems: 'center',
  },
  exitButton: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 50 : 30,
    right: 20,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.2)', // Darker background for visibility
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 999,
  },
  header: {
    alignItems: 'center',
    marginBottom: 16,
    marginTop: 0,
    width: '100%',
  },
  logo: {
    width: 240,
    height: 240,
  },
  form: {
    backgroundColor: '#FFFFFF',
    borderRadius: 15,
    padding: 12,
    // @ts-ignore
    boxShadow: '0px 10px 20px rgba(0, 0, 0, 0.3)',
    elevation: 10,
  },
  formWide: {
    width: '100%',
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    color: '#7f2821',
    marginBottom: 4,
    marginTop: 6,
  },
  input: {
    backgroundColor: '#F5F1E8',
    borderWidth: 1,
    borderColor: '#E0D8C8',
    borderRadius: 12,
    padding: 10,
    fontSize: 15,
    color: '#2C2C2C',
    minHeight: 48,
  },
  passwordContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F1E8',
    borderWidth: 1,
    borderColor: '#E0D8C8',
    borderRadius: 12,
    paddingRight: 10,
    minHeight: 48,
  },
  passwordInput: {
    flex: 1,
    padding: 10,
    fontSize: 15,
    color: '#2C2C2C',
  },
  eyeButton: {
    padding: 10,
  },
  loginBtn: {
    backgroundColor: '#7f2821', // Updated primary color
    padding: 12,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 12,
    // @ts-ignore
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
    fontSize: 10,
    marginTop: 10,
    opacity: 0.8,
    lineHeight: 14,
  },
  forgotPasswordBtn: {
    marginTop: 10,
    padding: 5,
    alignSelf: 'center',
  },
  forgotPasswordText: {
    color: '#7f2821', // Updated link color
    fontSize: 14,
    textDecorationLine: 'underline',
    fontWeight: '600',
  },
  biometricBtn: {
    backgroundColor: '#F5F1E8',
    borderColor: '#7f2821',
    borderWidth: 1,
    padding: 10,
    borderRadius: 12,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
  },
  biometricBtnText: {
    color: '#7f2821',
    fontSize: 16,
    fontWeight: '600',
  },
  registerLink: {
    marginTop: 10,
    padding: 8,
    alignSelf: 'center',
  },
  registerLinkText: {
    color: '#FFF',
    fontSize: 11,
    textDecorationLine: 'underline',
    textAlign: 'center',
  },
});
