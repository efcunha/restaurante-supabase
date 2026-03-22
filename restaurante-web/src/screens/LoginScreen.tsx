import { StatusBar } from 'expo-status-bar';
import { Alert, Dimensions, Image, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
// @ts-ignore
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { supabase } from '../config/SupabaseConfig';
import { getPasswordResetRedirectUrl } from '../utils/authRedirect';
import { getUserFriendlyMessage } from '../utils/errors';
import { validateEmail } from '../utils/validation';
import MFAVerificationModal from '../components/MFAVerificationModal';
import { colors } from '../theme/colors';

interface Props {
  navigation: NativeStackNavigationProp<any>;
}

export default function LoginScreen({ navigation }: Props) {
  const { login, loginWithBiometric, biometricAvailable, biometricType, mfaResolver, setMfaResolver } = useAuth();
  const { showToast } = useToast();
  const windowWidth = Dimensions.get('window').width;
  const isDesktop = windowWidth >= 1080;
  const isTablet = windowWidth >= 760;
  const logoSize = isDesktop ? 290 : isTablet ? 220 : 170;
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
    } catch (error) {
      Alert.alert('Erro no Login', getUserFriendlyMessage(error));
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={[styles.backdropOrb, styles.backdropOrbTop]} />
      <View style={[styles.backdropOrb, styles.backdropOrbBottom]} />
      <View style={styles.overlayVeil} />

      <ScrollView
        contentContainerStyle={[styles.scrollContent, isDesktop && styles.scrollContentDesktop]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={[styles.shell, isDesktop && styles.shellDesktop]}>
          {isTablet && (
          <View style={[styles.heroPanel, isDesktop && styles.heroPanelDesktop]}>
            <Image
              source={require('../../imagem/icone.png')}
              style={[styles.logo, { width: logoSize, height: logoSize }]}
              resizeMode="contain"
            />

            <Text style={[styles.productName, isDesktop && styles.productNameDesktop]}>
              Restaurante Web
            </Text>

            <Text style={[styles.productTagline, isDesktop && styles.productTaglineDesktop]}>
              Sistema de gestao para restaurantes
            </Text>

            <View style={styles.heroDivider} />

            <Text style={[styles.companyCredit, isDesktop && styles.companyCreditDesktop]}>
              © Machado & Cunha Soft House
            </Text>

            <TouchableOpacity style={[styles.aboutCta, isDesktop && styles.aboutCtaDesktop]} onPress={() => navigation.navigate('About')}>
              <Text style={styles.aboutCtaText}>Conhecer a plataforma</Text>
              <Ionicons name="arrow-forward" size={18} color="#1D2A35" />
            </TouchableOpacity>
          </View>
          )}

          <View style={[styles.authColumn, isDesktop && styles.authColumnDesktop]}>
            {!isTablet && (
              <Image
                source={require('../../imagem/icone.png')}
                style={styles.mobileLogo}
                resizeMode="contain"
              />
            )}
            <View style={styles.formCard}>
              <Text style={styles.formEyebrow}>Acesso restrito</Text>
              <Text style={styles.formTitle}>Entrar na plataforma</Text>
              <Text style={styles.formSubtitle}>
                Use o usuario e a senha fornecidos pelo administrador para acessar o ambiente do restaurante.
              </Text>

              <View style={styles.fieldGroup}>
                <Text style={styles.label}>Email</Text>
                <TextInput
                  style={styles.input}
                  placeholder="seu@email.com"
                  placeholderTextColor="#7A8B97"
                  value={email}
                  onChangeText={setEmail}
                  autoCapitalize="none"
                  keyboardType="email-address"
                />
              </View>

              <View style={styles.fieldGroup}>
                <Text style={styles.label}>Senha</Text>
                <View style={styles.passwordContainer}>
                  <TextInput
                    style={styles.passwordInput}
                    placeholder="••••••••"
                    placeholderTextColor="#7A8B97"
                    value={senha}
                    onChangeText={setSenha}
                    secureTextEntry={!mostrarSenha}
                    autoCapitalize="none"
                  />
                  <TouchableOpacity style={styles.eyeButton} onPress={() => setMostrarSenha(!mostrarSenha)}>
                    <Ionicons name={mostrarSenha ? 'eye-off' : 'eye'} size={22} color="#0B667F" />
                  </TouchableOpacity>
                </View>
              </View>

              <TouchableOpacity style={[styles.loginBtn, loading && styles.loginBtnDisabled]} onPress={handleLogin} disabled={loading}>
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
                style={styles.forgotPasswordBtn}
                onPress={async () => {
                  if (!email.trim()) {
                    Alert.alert('Esqueci minha senha', 'Por favor, digite seu email no campo acima primeiro.');
                    return;
                  }

                  const validation = validateEmail(email.trim());
                  if (!validation.isValid) {
                    Alert.alert('Email Inválido', validation.error || 'Por favor, digite um email valido.');
                    return;
                  }

                  Alert.alert(
                    'Redefinir Senha',
                    `Enviar link de redefinicao para:\n${email.trim()}?`,
                    [
                      { text: 'Cancelar', style: 'cancel' },
                      {
                        text: 'Enviar Email',
                        onPress: async () => {
                          try {
                            const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
                              redirectTo: getPasswordResetRedirectUrl(),
                            });
                            if (error) throw error;
                            Alert.alert('Sucesso', 'Email enviado. Verifique sua caixa de entrada e spam para redefinir a senha.');
                          } catch (resetError: any) {
                            Alert.alert('Erro', 'Nao foi possivel enviar: ' + resetError.message);
                          }
                        },
                      },
                    ]
                  );
                }}
              >
                <Text style={styles.forgotPasswordText}>Esqueci minha senha</Text>
              </TouchableOpacity>

              <View style={styles.registerPanel}>
                <Text style={styles.registerPanelPrompt}>Precisa cadastrar um novo restaurante?</Text>
                <TouchableOpacity style={styles.registerPanelLink} onPress={() => navigation.navigate('Register')}>
                  <Text style={styles.registerPanelLinkText}>Cadastre seu restaurante</Text>
                </TouchableOpacity>

                <View style={styles.billingNoteCard}>
                  <Ionicons name="card-outline" size={18} color="#0B6780" />
                  <Text style={styles.billingNoteText}>
                    O onboarding já cria um trial de 30 dias. A cobrança fica disponível no Admin e deve ser configurada antes do vencimento para evitar bloqueio operacional.
                  </Text>
                </View>
              </View>
            </View>

            <View style={styles.loginFooterArea}>
              <Text style={styles.footerText}>© Machado & Cunha Soft House</Text>
            </View>
          </View>
        </View>
      </ScrollView>

      <StatusBar style="light" />

      <MFAVerificationModal
        visible={!!mfaResolver}
        resolver={mfaResolver}
        onSuccess={() => {
          setMfaResolver(null);
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
    backgroundColor: '#0C7A96',
    overflow: 'hidden',
  },
  backdropOrb: {
    position: 'absolute',
    borderRadius: 999,
    opacity: 0.28,
  },
  backdropOrbTop: {
    width: 360,
    height: 360,
    backgroundColor: '#F1B24B',
    top: -120,
    left: -90,
  },
  backdropOrbBottom: {
    width: 460,
    height: 460,
    backgroundColor: '#073A49',
    bottom: -180,
    right: -130,
  },
  overlayVeil: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255,255,255,0.02)',
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 22,
    paddingTop: 74,
    paddingBottom: 38,
  },
  scrollContentDesktop: {
    minHeight: '100%',
  },
  shell: {
    width: '100%',
    maxWidth: 1240,
    alignSelf: 'center',
  },
  shellDesktop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroPanel: {
    width: '100%',
    alignItems: 'center',
    marginBottom: 26,
  },
  heroPanelDesktop: {
    width: 540,
    maxWidth: 540,
    alignItems: 'flex-start',
    marginBottom: 0,
    paddingRight: 24,
  },
  heroBadge: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.14)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    marginBottom: 18,
  },
  heroBadgeText: {
    color: '#EDF9FC',
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0.5,
    textAlign: 'center',
  },
  logo: {
    marginBottom: 14,
  },
  mobileLogo: {
    width: 120,
    height: 120,
    alignSelf: 'center',
    marginBottom: 8,
  },
  productName: {
    color: '#FFFFFF',
    fontSize: 30,
    fontWeight: '900',
    textAlign: 'center',
    letterSpacing: -0.5,
    marginBottom: 6,
  },
  productNameDesktop: {
    fontSize: 40,
    textAlign: 'left',
  },
  productTagline: {
    color: 'rgba(196,237,246,0.9)',
    fontSize: 16,
    lineHeight: 24,
    textAlign: 'center',
  },
  productTaglineDesktop: {
    textAlign: 'left',
  },
  heroDivider: {
    width: 40,
    height: 2,
    backgroundColor: 'rgba(255,255,255,0.22)',
    borderRadius: 999,
    marginVertical: 22,
  },
  companyCredit: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 13,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 18,
  },
  companyCreditDesktop: {
    textAlign: 'left',
  },
  heroTitle: {
    color: '#FFFFFF',
    fontSize: 34,
    lineHeight: 41,
    fontWeight: '900',
    textAlign: 'center',
    maxWidth: 560,
  },
  heroTitleDesktop: {
    textAlign: 'left',
    fontSize: 46,
    lineHeight: 54,
  },
  heroDescription: {
    color: '#DAF0F5',
    fontSize: 17,
    lineHeight: 28,
    textAlign: 'center',
    marginTop: 14,
    maxWidth: 560,
  },
  heroDescriptionDesktop: {
    textAlign: 'left',
    fontSize: 18,
    lineHeight: 29,
  },
  tagRow: {
    width: '100%',
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    marginTop: 18,
    marginBottom: 4,
  },
  tagRowDesktop: {
    justifyContent: 'flex-start',
  },
  tagChip: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)',
    marginRight: 10,
    marginBottom: 10,
  },
  tagChipText: {
    color: '#F4FBFD',
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  highlightRow: {
    width: '100%',
    marginTop: 24,
  },
  highlightRowDesktop: {
    flexDirection: 'row',
  },
  highlightCard: {
    width: '100%',
    backgroundColor: 'rgba(4, 43, 54, 0.34)',
    borderRadius: 22,
    paddingVertical: 16,
    paddingHorizontal: 18,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    marginBottom: 12,
  },
  highlightCardDesktop: {
    flex: 1,
    marginRight: 12,
  },
  highlightCardDesktopLast: {
    marginRight: 0,
  },
  highlightTitle: {
    color: '#FFFFFF',
    fontSize: 17,
    lineHeight: 24,
    fontWeight: '800',
  },
  highlightDescription: {
    color: '#D5EFF5',
    fontSize: 14,
    lineHeight: 21,
    marginTop: 8,
  },
  companySpotlight: {
    width: '100%',
    maxWidth: 560,
    marginTop: 12,
    backgroundColor: 'rgba(6, 36, 45, 0.42)',
    borderRadius: 26,
    paddingVertical: 20,
    paddingHorizontal: 22,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
  },
  companySpotlightLabel: {
    color: '#9EDDE9',
    fontSize: 12,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 1,
    textAlign: 'center',
  },
  companySpotlightName: {
    color: '#FFFFFF',
    fontSize: 24,
    lineHeight: 31,
    fontWeight: '900',
    textAlign: 'center',
    marginTop: 10,
  },
  companySpotlightNameDesktop: {
    maxWidth: 420,
    alignSelf: 'center',
  },
  companySpotlightRights: {
    color: '#D8F0F5',
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
    marginTop: 8,
  },
  aboutCta: {
    marginTop: 18,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F1B24B',
    borderRadius: 999,
    minHeight: 54,
    paddingHorizontal: 22,
  },
  aboutCtaDesktop: {
    alignSelf: 'flex-start',
  },
  aboutCtaText: {
    color: '#1D2A35',
    fontSize: 15,
    fontWeight: '900',
    marginRight: 8,
  },
  authColumn: {
    width: '100%',
    maxWidth: 500,
    alignSelf: 'center',
  },
  authColumnDesktop: {
    width: 470,
    maxWidth: 470,
    marginLeft: 12,
  },
  formCard: {
    backgroundColor: 'rgba(255, 252, 247, 0.98)',
    borderRadius: 30,
    paddingVertical: 28,
    paddingHorizontal: 28,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.65)',
    // @ts-ignore
    boxShadow: '0px 22px 50px rgba(4, 38, 47, 0.28)',
    elevation: 14,
  },
  formEyebrow: {
    color: '#0B6780',
    fontSize: 12,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  formTitle: {
    color: '#12202C',
    fontSize: 34,
    lineHeight: 40,
    fontWeight: '900',
    marginTop: 10,
  },
  formSubtitle: {
    color: '#576875',
    fontSize: 16,
    lineHeight: 25,
    marginTop: 12,
    marginBottom: 22,
  },
  fieldGroup: {
    marginBottom: 16,
  },
  label: {
    color: '#0D5D72',
    fontSize: 14,
    fontWeight: '800',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#F4F8FB',
    borderWidth: 1,
    borderColor: '#D4E2EA',
    borderRadius: 16,
    minHeight: 56,
    paddingHorizontal: 16,
    fontSize: 16,
    color: '#10202D',
  },
  passwordContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F4F8FB',
    borderWidth: 1,
    borderColor: '#D4E2EA',
    borderRadius: 16,
    minHeight: 56,
    paddingRight: 10,
  },
  passwordInput: {
    flex: 1,
    paddingHorizontal: 16,
    fontSize: 16,
    color: '#10202D',
  },
  eyeButton: {
    padding: 10,
  },
  loginBtn: {
    marginTop: 4,
    minHeight: 58,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0B6F88',
    // @ts-ignore
    boxShadow: '0px 12px 26px rgba(11, 111, 136, 0.32)',
    elevation: 8,
  },
  loginBtnDisabled: {
    opacity: 0.65,
  },
  loginBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: 0.8,
  },
  biometricBtn: {
    marginTop: 14,
    minHeight: 52,
    borderRadius: 15,
    backgroundColor: '#E8F6FA',
    borderWidth: 1,
    borderColor: '#AADAE5',
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    paddingHorizontal: 14,
  },
  biometricIcon: {
    marginRight: 8,
  },
  biometricBtnText: {
    color: '#0A5063',
    fontSize: 15,
    fontWeight: '800',
    textAlign: 'center',
  },
  forgotPasswordBtn: {
    marginTop: 16,
    alignSelf: 'center',
    paddingVertical: 6,
    paddingHorizontal: 8,
  },
  forgotPasswordText: {
    color: '#0B6780',
    fontSize: 15,
    fontWeight: '800',
    textDecorationLine: 'underline',
  },
  registerPanel: {
    marginTop: 20,
    borderRadius: 14,
    backgroundColor: '#EEF7F9',
    borderWidth: 1,
    borderColor: '#D5E7EC',
    paddingVertical: 12,
    paddingHorizontal: 14,
    alignItems: 'center',
  },
  registerPanelPrompt: {
    color: '#12303D',
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '800',
    textAlign: 'center',
  },
  registerPanelLink: {
    marginTop: 8,
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  registerPanelLinkText: {
    color: '#0B6780',
    fontSize: 14,
    fontWeight: '900',
    textDecorationLine: 'underline',
    textAlign: 'center',
  },
  billingNoteCard: {
    marginTop: 12,
    borderRadius: 12,
    backgroundColor: '#E7F5F8',
    borderWidth: 1,
    borderColor: '#C9E3EA',
    paddingVertical: 10,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  billingNoteText: {
    flex: 1,
    color: '#12303D',
    fontSize: 13,
    lineHeight: 19,
    textAlign: 'left',
    fontWeight: '700',
  },
  loginFooterArea: {
    alignItems: 'center',
    marginTop: 18,
    paddingHorizontal: 12,
  },
  footerText: {
    color: 'rgba(230,247,251,0.72)',
    fontSize: 13,
    lineHeight: 20,
    fontWeight: '700',
    textAlign: 'center',
  },
});
