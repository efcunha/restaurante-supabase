import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, View, TextInput, TouchableOpacity, Alert, Platform, Image, BackHandler, ScrollView, NativeModules } from 'react-native';
import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../config/SupabaseConfig';
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
      await login(email.toLowerCase().trim(), senha);
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
              if (Platform.OS === 'android') {
                NativeModules.DevSettings?.reload();
              }
            }
          },
        },
      ]
    );
  };

  return (
    <View style={styles.container}>
      <View style={[styles.orb, styles.orbTop]} />
      <View style={[styles.orb, styles.orbBottom]} />

      <TouchableOpacity style={styles.exitButton} onPress={handleSair}>
        <Ionicons name="close" size={22} color="#FFFFFF" />
      </TouchableOpacity>

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Logo */}
        <View style={styles.logoWrap}>
          <Image
            source={require('../../imagem/icone.png')}
            style={styles.logo}
            resizeMode="contain"
          />
        </View>

        {/* Card do formulário */}
        <View style={styles.card}>
          <Text style={styles.cardEyebrow}>Acesso restrito</Text>
          <Text style={styles.cardTitle}>Entrar na plataforma</Text>
          <Text style={styles.cardSubtitle}>
            Use o email e senha fornecidos pelo administrador.
          </Text>

          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Email</Text>
            <TextInput
              style={styles.input}
              placeholder="seu@email.com"
              placeholderTextColor="#8FA3B1"
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
            />
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Senha</Text>
            <View style={styles.passwordRow}>
              <TextInput
                style={styles.passwordInput}
                placeholder="••••••••"
                placeholderTextColor="#8FA3B1"
                value={senha}
                onChangeText={setSenha}
                secureTextEntry={!mostrarSenha}
                autoCapitalize="none"
              />
              <TouchableOpacity style={styles.eyeBtn} onPress={() => setMostrarSenha(!mostrarSenha)}>
                <Ionicons name={mostrarSenha ? 'eye-off' : 'eye'} size={22} color="#0B6780" />
              </TouchableOpacity>
            </View>
          </View>

          <TouchableOpacity
            style={[styles.loginBtn, loading && styles.loginBtnDisabled]}
            onPress={handleLogin}
            disabled={loading}
          >
            <Text style={styles.loginBtnText}>{loading ? 'ENTRANDO...' : 'ENTRAR'}</Text>
          </TouchableOpacity>

          {biometricAvailable && (
            <TouchableOpacity
              style={styles.biometricBtn}
              onPress={async () => {
                const result = await loginWithBiometric();
                if (!result.success && result.error) {
                  Alert.alert('Biometria', result.error);
                }
              }}
              disabled={loading}
            >
              <Ionicons
                name={biometricType === 'Reconhecimento Facial' ? 'scan-outline' : 'finger-print-outline'}
                size={20}
                color="#0A5063"
                style={styles.biometricIcon}
              />
              <Text style={styles.biometricBtnText}>Entrar com {biometricType}</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={styles.forgotBtn}
            onPress={async () => {
              if (!email.trim()) {
                Alert.alert('Esqueci minha senha', 'Digite seu email no campo acima primeiro.');
                return;
              }
              const validation = validateEmail(email.trim());
              if (!validation.isValid) {
                Alert.alert('Email inválido', validation.error || 'Digite um email válido.');
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
                          redirectTo: 'your-app://reset-password',
                        });
                        if (error) throw error;
                        Alert.alert('Sucesso', 'Email enviado. Verifique sua caixa de entrada e spam.');
                      } catch (err: any) {
                        Alert.alert('Erro', 'Não foi possível enviar: ' + err.message);
                      }
                    },
                  },
                ]
              );
            }}
          >
            <Text style={styles.forgotBtnText}>Esqueci minha senha</Text>
          </TouchableOpacity>
        </View>

        {/* Rodapé */}
        <View style={styles.footer}>
          <TouchableOpacity onPress={() => navigation.navigate('Register')}>
            <Text style={styles.footerLink}>Cadastre seu restaurante</Text>
          </TouchableOpacity>

          <Text style={styles.credit}>© Machado &amp; Cunha Soft House</Text>
        </View>
      </ScrollView>

      <StatusBar style="light" />

      <MFAVerificationModal
        visible={!!mfaResolver}
        resolver={mfaResolver}
        onSuccess={() => setMfaResolver(null)}
        onCancel={() => setMfaResolver(null)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0C7A96',
    overflow: 'hidden',
  },
  orb: {
    position: 'absolute',
    borderRadius: 999,
    opacity: 0.25,
  },
  orbTop: {
    width: 320,
    height: 320,
    backgroundColor: '#F1B24B',
    top: -100,
    left: -80,
  },
  orbBottom: {
    width: 380,
    height: 380,
    backgroundColor: '#073A49',
    bottom: -140,
    right: -110,
  },
  exitButton: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 52 : 28,
    right: 20,
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: 'rgba(4,36,45,0.35)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 20,
  },
  scroll: {
    paddingTop: Platform.OS === 'ios' ? 100 : 80,
    paddingBottom: 36,
    paddingHorizontal: 20,
  },
  logoWrap: {
    alignItems: 'center',
    marginBottom: 20,
  },
  logo: {
    width: 140,
    height: 140,
  },
  card: {
    backgroundColor: 'rgba(255,252,247,0.98)',
    borderRadius: 28,
    paddingVertical: 26,
    paddingHorizontal: 22,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.6)',
    elevation: 12,
  },
  cardEyebrow: {
    color: '#0B6780',
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 1.2,
    marginBottom: 6,
  },
  cardTitle: {
    color: '#0D1F2C',
    fontSize: 26,
    fontWeight: '900',
    lineHeight: 32,
    marginBottom: 8,
  },
  cardSubtitle: {
    color: '#5A6E7A',
    fontSize: 14,
    lineHeight: 21,
    marginBottom: 22,
  },
  fieldGroup: {
    marginBottom: 14,
  },
  label: {
    color: '#0D5D72',
    fontSize: 13,
    fontWeight: '800',
    marginBottom: 7,
  },
  input: {
    backgroundColor: '#F4F8FB',
    borderWidth: 1,
    borderColor: '#D4E2EA',
    borderRadius: 14,
    minHeight: 52,
    paddingHorizontal: 14,
    fontSize: 15,
    color: '#0D1F2C',
  },
  passwordRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F4F8FB',
    borderWidth: 1,
    borderColor: '#D4E2EA',
    borderRadius: 14,
    minHeight: 52,
    paddingRight: 8,
  },
  passwordInput: {
    flex: 1,
    paddingHorizontal: 14,
    fontSize: 15,
    color: '#0D1F2C',
  },
  eyeBtn: {
    padding: 10,
  },
  loginBtn: {
    marginTop: 6,
    minHeight: 54,
    borderRadius: 14,
    backgroundColor: '#0B6F88',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 6,
  },
  loginBtnDisabled: {
    opacity: 0.6,
  },
  loginBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '900',
    letterSpacing: 0.8,
  },
  biometricBtn: {
    marginTop: 12,
    minHeight: 48,
    borderRadius: 13,
    backgroundColor: '#E8F6FA',
    borderWidth: 1,
    borderColor: '#AADAE5',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  biometricIcon: {
    marginRight: 8,
  },
  biometricBtnText: {
    color: '#0A5063',
    fontSize: 14,
    fontWeight: '800',
  },
  forgotBtn: {
    marginTop: 14,
    alignSelf: 'center',
    paddingVertical: 6,
    paddingHorizontal: 8,
  },
  forgotBtnText: {
    color: '#0B6780',
    fontSize: 14,
    fontWeight: '700',
    textDecorationLine: 'underline',
  },
  footer: {
    marginTop: 26,
    alignItems: 'center',
    gap: 10,
  },
  footerLink: {
    color: '#F7C45C',
    fontSize: 15,
    fontWeight: '900',
    textDecorationLine: 'underline',
    textAlign: 'center',
  },
  aboutRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  aboutText: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 13,
    fontWeight: '600',
  },
  credit: {
    color: 'rgba(255,255,255,0.3)',
    fontSize: 12,
    fontWeight: '600',
    marginTop: 4,
  },
});
