import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Dimensions,
} from 'react-native';
import { supabase } from '../config/SupabaseConfig';
import { Ionicons } from '@expo/vector-icons';
// @ts-ignore
import { validateCPF, validateCNPJ } from '../utils/validation';
// @ts-ignore
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { colors } from '../theme/colors';
import { colorSystem } from '../design-system';
import { FieldRow, FormSection, ScreenHeader } from '../ui';
import logger from '../utils/logger';

interface Props {
  navigation: NativeStackNavigationProp<any>;
}

const onboardingHighlights = [
  {
    title: 'Cadastro orientado',
    description: 'Formulario organizado por etapas para facilitar o preenchimento e evitar duvidas.',
  },
  {
    title: 'Base pronta para operar',
    description: 'A conta ja nasce preparada para iniciar administracao, atendimento e fluxo operacional.',
  },
  {
    title: 'Billing desde o onboarding',
    description: 'A assinatura fica disponivel logo apos a criacao da empresa, com trial de 30 dias e regularizacao obrigatoria antes do vencimento.',
  },
];

export default function RegisterCompanyScreen({ navigation }: Props) {
  const windowWidth = Dimensions.get('window').width;
  const isDesktop = windowWidth >= 1120;
  const isTablet = windowWidth >= 760;

  const [restaurantName, setRestaurantName] = useState('');
  const [adminName, setAdminName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [documentType, setDocumentType] = useState<'cpf' | 'cnpj'>('cpf');
  const [documentValue, setDocumentValue] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [zipCode, setZipCode] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Formatter for display
  const formatDocument = (text: string, type: 'cpf' | 'cnpj') => {
    const numbers = text.replace(/\D/g, '');
    if (type === 'cpf') {
      return numbers
        .replace(/(\d{3})(\d)/, '$1.$2')
        .replace(/(\d{3})(\d)/, '$1.$2')
        .replace(/(\d{3})(\d{1,2})/, '$1-$2')
        .replace(/(-\d{2})\d+?$/, '$1');
    } else {
      return numbers
        .replace(/^(\d{2})(\d)/, '$1.$2')
        .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
        .replace(/\.(\d{3})(\d)/, '.$1/$2')
        .replace(/(\d{4})(\d)/, '$1-$2')
        .replace(/(-\d{2})\d+?$/, '$1');
    }
  };

  const handleDocumentChange = (text: string) => {
    setDocumentValue(formatDocument(text, documentType));
  };

  const formatPhone = (text: string) => {
    const numbers = text.replace(/\D/g, '');
    if (numbers.length <= 10) {
        // Formato: (83) 9917-2452
        return numbers
            .replace(/^(\d{2})(\d)/, '($1) $2')
            .replace(/(\d{4})(\d)/, '$1-$2')
            .replace(/(-\d{4})\d+?$/, '$1');
    } else {
        // Formato: (83) 99917-2452
        return numbers
            .replace(/^(\d{2})(\d)/, '($1) $2')
            .replace(/(\d{5})(\d)/, '$1-$2')
            .replace(/(-\d{4})\d+?$/, '$1');
    }
  };

  const handlePhoneChange = (text: string) => {
    setContactPhone(formatPhone(text));
  };

  const formatZipCode = (text: string) => {
    const numbers = text.replace(/\D/g, '');
    return numbers
        .replace(/^(\d{5})(\d)/, '$1-$2')
        .replace(/(-\d{3})\d+?$/, '$1')
        .substring(0, 9);
  };

  const handleZipCodeChange = (text: string) => {
    setZipCode(formatZipCode(text));
  };

  const searchAddressByCEP = async (cep: string) => {
    const cleanCEP = cep.replace(/\D/g, '');
    
    if (cleanCEP.length !== 8) return;

    try {
      const response = await fetch(`https://viacep.com.br/ws/${cleanCEP}/json/`);
      const data = await response.json();

      if (data.erro) {
        Alert.alert('Aviso', 'CEP não encontrado');
        return;
      }

      setAddress(data.logradouro || '');
      setCity(data.localidade || '');
      setState(data.uf || '');
      
    } catch (error) {
      logger.error('[RegisterCompanyScreen] Failed to fetch CEP address', error);
      Alert.alert('Erro', 'Não foi possível buscar o endereço. Verifique sua conexão.');
    }
  };

  const handleRegister = async () => {
    if (!restaurantName || !adminName || !email || !password || !documentValue) {
      Alert.alert('Erro', 'Preencha todos os campos obrigatórios');
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert('Erro', 'As senhas não conferem');
      return;
    }

    if (password.length < 6) {
      Alert.alert('Erro', 'A senha deve ter pelo menos 6 caracteres');
      return;
    }

    // Validation
    let docValidation;
    if (documentType === 'cpf') {
      docValidation = validateCPF(documentValue);
    } else {
      docValidation = validateCNPJ(documentValue);
    }

    if (!docValidation.isValid) {
      Alert.alert('Erro', docValidation.error);
      return;
    }

    const emailSanitized = email.toLowerCase().trim();
    const maskEmail = (value: string): string => {
      const normalized = String(value || '').trim().toLowerCase();
      const [local, domain] = normalized.split('@');
      if (!local || !domain) return 'invalid-email';
      if (local.length <= 2) return `${local[0] || '*'}***@${domain}`;
      return `${local.slice(0, 2)}***@${domain}`;
    };
    const emailMasked = maskEmail(emailSanitized);
    const passwordSanitized = password.trim();

    try {
      setLoading(true);
      logger.info('[RegisterCompanyScreen] registration attempt initiated', { emailMasked });

      // 1. Sign Up User
      const { data: authData, error: authError } = await supabase.auth.signUp({
          email: emailSanitized,
          password: passwordSanitized,
          options: {
              data: {
                  full_name: adminName // Store in metadata initially
              }
          }
      });

      if (authError) throw authError;
      if (!authData.user) throw new Error('Falha ao criar usuário (sem dados retornados)');
      
      const userId = authData.user.id;

      // 2. Create Company
      const { data: companyData, error: companyError } = await supabase
          .from('companies')
          .insert({
              name: restaurantName,
              plan: 'trialing',
              active: true,
              document_type: documentType,
              document: docValidation.value,
              contact_name: adminName,
              contact_phone: contactPhone.replace(/\D/g, '') || null,
              address: address.trim() || null,
              city: city.trim() || null,
              state: state.trim() || null,
              zip_code: zipCode.replace(/\D/g, '') || null
          })
          .select()
          .single();

      if (companyError) throw companyError;
      
      const companyId = companyData.id;

      // 3. Create User Profile
      // Note: profiles table is often created via Trigger on auth.users. 
      // If so, we should UPDATE it. If not, INSERT it.
      // Assuming manual management for migration:
      
      const { error: profileError } = await supabase
          .from('profiles')
          .insert({
              id: userId,
              company_id: companyId,
              email: emailSanitized,
              full_name: adminName,
              role: 'admin'
          })
          // If trigger exists and created row, access conflict might occur?
          // Use upsert to be safe
          .select()
          .single();
          
      // If profile insert fails (e.g. key violation due to trigger), try update
      if (profileError) {
          // Fallback update
           const { error: updateError } = await supabase
              .from('profiles')
              .update({
                  company_id: companyId,
                  full_name: adminName,
                  role: 'admin'
              })
              .eq('id', userId);
              
           if (updateError) {
               logger.error('[RegisterCompanyScreen] Profile update failed', updateError);
               throw profileError; // Throw original error
           }
      }

      // 4. Create trial subscription row (30-day trial, no charge until D31)
      const trialStartsAt = new Date();
      const trialEndsAt = new Date(trialStartsAt);
      trialEndsAt.setDate(trialEndsAt.getDate() + 30);

      const { error: subError } = await supabase
          .from('subscriptions')
          .insert({
              company_id: companyId,
              status: 'trialing',
              trial_starts_at: trialStartsAt.toISOString(),
              trial_ends_at: trialEndsAt.toISOString(),
          });

      if (subError) {
          logger.warn('[RegisterCompanyScreen] Subscription row creation failed', { message: subError.message });
      }

      Alert.alert(
        'Sucesso',
        'Conta criada com sucesso! Você tem 30 dias de acesso gratuito. Faça login para começar.',
        [{ text: 'OK', onPress: () => navigation.navigate('Login') }]
      );

    } catch (error: any) {
      logger.error('[RegisterCompanyScreen] registration failed', error, { emailMasked });
      let msg = error.message || 'Erro ao criar conta';
      if (msg.includes('already registered')) msg = 'Este email já está em uso.';
      Alert.alert('Erro', msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <View style={[styles.backdropOrb, styles.backdropOrbTop]} />
      <View style={[styles.backdropOrb, styles.backdropOrbBottom]} />
      <View style={styles.overlayVeil} />

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={[styles.shell, isDesktop && styles.shellDesktop]}>
          <View style={[styles.heroPanel, isDesktop && styles.heroPanelDesktop]}>
            <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
              <Ionicons name="arrow-back" size={20} color={colors.white} />
              <Text style={styles.backBtnText}>Voltar ao login</Text>
            </TouchableOpacity>

            <View style={styles.heroBadge}>
              <Text style={styles.heroBadgeText}>Cadastro da plataforma</Text>
            </View>

            <Text style={[styles.title, isDesktop && styles.titleDesktop]}>Crie a conta do seu restaurante com um fluxo mais claro e profissional.</Text>
            <Text style={[styles.subtitle, isDesktop && styles.subtitleDesktop]}>Organize os dados da empresa, do administrador e do acesso inicial em uma experiencia de cadastro mais elegante e facil de preencher.</Text>

            <View style={[styles.highlightRow, isDesktop && styles.highlightRowDesktop]}>
              {onboardingHighlights.map((item, index) => (
                <View key={item.title} style={[styles.highlightCard, isDesktop && styles.highlightCardDesktop, isDesktop && index === onboardingHighlights.length - 1 && styles.highlightCardDesktopLast]}>
                  <Text style={styles.highlightTitle}>{item.title}</Text>
                  <Text style={styles.highlightDescription}>{item.description}</Text>
                </View>
              ))}
            </View>

            <View style={styles.companyCard}>
              <Text style={styles.companyCardLabel}>Desenvolvido por</Text>
              <Text style={styles.companyCardTitle}>Machado & Cunha Soft House</Text>
              <Text style={styles.companyCardText}>Todos os direitos reservados.</Text>
            </View>
          </View>

          <View style={[styles.formColumn, isTablet && styles.formColumnTablet, isDesktop && styles.formColumnDesktop]}>
            <View style={styles.form}>
              <ScreenHeader
                title="Cadastro inicial"
                subtitle="Preencha os dados essenciais para criar a conta administrativa e iniciar a configuracao do restaurante."
              />

              <Text style={styles.sectionTitle}>Identificacao</Text>

              <Text style={styles.label}>Tipo de Documento</Text>
              <View style={styles.docTypeContainer}>
                <TouchableOpacity
                  style={[styles.docTypeBtn, documentType === 'cpf' && styles.docTypeBtnActive]}
                  onPress={() => setDocumentType('cpf')}
                >
                  <Text style={[styles.docTypeText, documentType === 'cpf' && styles.docTypeTextActive]}>CPF</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.docTypeBtn, documentType === 'cnpj' && styles.docTypeBtnActive]}
                  onPress={() => setDocumentType('cnpj')}
                >
                  <Text style={[styles.docTypeText, documentType === 'cnpj' && styles.docTypeTextActive]}>CNPJ</Text>
                </TouchableOpacity>
              </View>

              <Text style={styles.label}>{documentType === 'cpf' ? 'CPF' : 'CNPJ'}</Text>
              <TextInput
                style={styles.input}
                placeholder={documentType === 'cpf' ? '000.000.000-00' : '00.000.000/0000-00'}
                placeholderTextColor="#7A8B97"
                value={documentValue}
                onChangeText={handleDocumentChange}
                keyboardType="numeric"
              />

              <Text style={styles.label}>Nome do Restaurante</Text>
              <TextInput
                style={styles.input}
                placeholder="Ex: Espetinho do Ze"
                placeholderTextColor="#7A8B97"
                value={restaurantName}
                onChangeText={setRestaurantName}
              />

              <Text style={styles.label}>Seu Nome (Administrador)</Text>
              <TextInput
                style={styles.input}
                placeholder="Ex: Jose Silva"
                placeholderTextColor="#7A8B97"
                value={adminName}
                onChangeText={setAdminName}
              />

              <Text style={styles.sectionTitle}>Contato e endereco</Text>

              <Text style={styles.label}>Telefone de Contato</Text>
              <TextInput
                style={styles.input}
                placeholder="(00) 00000-0000"
                placeholderTextColor="#7A8B97"
                value={contactPhone}
                onChangeText={handlePhoneChange}
                keyboardType="phone-pad"
              />

              <Text style={styles.label}>CEP</Text>
              <View style={styles.inlineRow}>
                <TextInput
                  style={[styles.input, styles.inlineInput]}
                  placeholder="00000-000"
                  placeholderTextColor="#7A8B97"
                  value={zipCode}
                  onChangeText={handleZipCodeChange}
                  keyboardType="numeric"
                />
                <TouchableOpacity
                  style={styles.searchButton}
                  onPress={() => searchAddressByCEP(zipCode)}
                  accessibilityRole="button"
                  accessibilityLabel="Buscar endereco pelo CEP"
                >
                  <Ionicons name="search" size={20} color={colors.white} />
                </TouchableOpacity>
              </View>

              <Text style={styles.label}>Endereco Completo</Text>
              <TextInput
                style={styles.input}
                placeholder="Rua, numero, complemento"
                placeholderTextColor="#7A8B97"
                value={address}
                onChangeText={setAddress}
              />

              <View style={[styles.inlineRow, styles.cityRow]}>
                <View style={styles.cityFieldLarge}>
                  <Text style={styles.label}>Cidade</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Cidade"
                    placeholderTextColor="#7A8B97"
                    value={city}
                    onChangeText={setCity}
                  />
                </View>
                <View style={styles.cityFieldSmall}>
                  <Text style={styles.label}>Estado</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="UF"
                    placeholderTextColor="#7A8B97"
                    value={state}
                    onChangeText={(text) => setState(text.toUpperCase())}
                    maxLength={2}
                    autoCapitalize="characters"
                  />
                </View>
              </View>

              <FormSection title="Acesso">
                <FieldRow label="Email" required>
                  <TextInput
                    style={styles.input}
                    placeholder="seu@email.com"
                    placeholderTextColor={colorSystem.textMuted}
                    value={email}
                    onChangeText={setEmail}
                    keyboardType="email-address"
                    autoCapitalize="none"
                  />
                </FieldRow>

                <FieldRow label="Senha" required>
                  <View style={styles.passwordContainer}>
                    <TextInput
                      style={styles.inputPassword}
                      placeholder="Minimo 6 caracteres"
                      placeholderTextColor={colorSystem.textMuted}
                      value={password}
                      onChangeText={setPassword}
                      secureTextEntry={!showPassword}
                    />
                    <TouchableOpacity
                      onPress={() => setShowPassword(!showPassword)}
                      style={styles.eyeIcon}
                      accessibilityRole="button"
                      accessibilityLabel={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                    >
                      <Ionicons name={showPassword ? 'eye' : 'eye-off'} size={22} color={colorSystem.primary} />
                    </TouchableOpacity>
                  </View>
                </FieldRow>

                <FieldRow label="Confirmar senha" required>
                  <View style={styles.passwordContainer}>
                    <TextInput
                      style={styles.inputPassword}
                      placeholder="Repita a senha"
                      placeholderTextColor={colorSystem.textMuted}
                      value={confirmPassword}
                      onChangeText={setConfirmPassword}
                      secureTextEntry={!showConfirmPassword}
                    />
                    <TouchableOpacity
                      onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                      style={styles.eyeIcon}
                      accessibilityRole="button"
                      accessibilityLabel={showConfirmPassword ? 'Ocultar confirmacao de senha' : 'Mostrar confirmacao de senha'}
                    >
                      <Ionicons name={showConfirmPassword ? 'eye' : 'eye-off'} size={22} color={colorSystem.primary} />
                    </TouchableOpacity>
                  </View>
                </FieldRow>
              </FormSection>

              <TouchableOpacity style={[styles.btn, loading && styles.btnDisabled]} onPress={handleRegister} disabled={loading}>
                {loading ? <ActivityIndicator color={colors.white} /> : <Text style={styles.btnText}>CRIAR CONTA GRATIS</Text>}
              </TouchableOpacity>

              <View style={styles.helperCard}>
                <Ionicons name="sparkles" size={18} color="#0A5B6F" style={styles.helperIcon} />
                <Text style={styles.helperText}>Depois do cadastro, voce podera entrar com a conta administrativa e iniciar a configuracao completa do restaurante.</Text>
              </View>
            </View>

            <View style={styles.bottomLinkRow}>
              <Text style={styles.bottomLinkText}>Ja possui conta criada?</Text>
              <TouchableOpacity onPress={() => navigation.navigate('Login')}>
                <Text style={styles.bottomLinkAction}>Voltar para o login</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
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
    paddingHorizontal: 22,
    paddingTop: 44,
    paddingBottom: 42,
  },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.14)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    marginBottom: 22,
  },
  backBtnText: {
    color: colors.white,
    fontSize: 15,
    fontWeight: '800',
    marginLeft: 8,
  },
  shell: {
    width: '100%',
    maxWidth: 1280,
    alignSelf: 'center',
  },
  shellDesktop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  heroPanel: {
    width: '100%',
    alignItems: 'center',
    marginBottom: 26,
  },
  heroPanelDesktop: {
    flex: 1,
    maxWidth: 560,
    alignItems: 'flex-start',
    paddingRight: 38,
    marginBottom: 0,
    paddingTop: 8,
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
    letterSpacing: 0.4,
    textAlign: 'center',
  },
  title: {
    fontSize: 34,
    lineHeight: 41,
    fontWeight: '900',
    color: colors.white,
    textAlign: 'center',
    maxWidth: 560,
  },
  titleDesktop: {
    textAlign: 'left',
    fontSize: 44,
    lineHeight: 52,
  },
  subtitle: {
    fontSize: 17,
    lineHeight: 28,
    color: '#D9F1F6',
    marginTop: 14,
    textAlign: 'center',
    maxWidth: 540,
  },
  subtitleDesktop: {
    textAlign: 'left',
    fontSize: 18,
    lineHeight: 29,
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
  companyCard: {
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
  companyCardLabel: {
    color: '#9EDDE9',
    fontSize: 12,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 1,
    textAlign: 'center',
  },
  companyCardTitle: {
    color: '#FFFFFF',
    fontSize: 24,
    lineHeight: 31,
    fontWeight: '900',
    textAlign: 'center',
    marginTop: 10,
  },
  companyCardText: {
    color: '#D8F0F5',
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
    marginTop: 8,
  },
  formColumn: {
    width: '100%',
    maxWidth: 560,
    alignSelf: 'center',
  },
  formColumnTablet: {
    maxWidth: 760,
  },
  formColumnDesktop: {
    width: 700,
    maxWidth: 700,
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
    marginBottom: 24,
  },
  sectionTitle: {
    color: '#133140',
    fontSize: 18,
    lineHeight: 24,
    fontWeight: '900',
    marginTop: 10,
    marginBottom: 8,
  },
  form: {
    backgroundColor: 'rgba(255, 252, 247, 0.98)',
    paddingVertical: 28,
    paddingHorizontal: 28,
    borderRadius: 30,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.65)',
    // @ts-ignore
    boxShadow: '0px 22px 50px rgba(4, 38, 47, 0.28)',
    elevation: 14,
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0D5D72',
    marginBottom: 8,
    marginTop: 12,
  },
  input: {
    backgroundColor: '#F4F8FB',
    borderWidth: 1,
    borderColor: '#D4E2EA',
    borderRadius: 16,
    paddingHorizontal: 16,
    minHeight: 56,
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
  },
  inputPassword: {
    flex: 1,
    paddingHorizontal: 16,
    fontSize: 16,
    color: '#10202D',
  },
  eyeIcon: {
    padding: 10,
  },
  btn: {
    backgroundColor: '#0B6F88',
    minHeight: 58,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 30,
    marginBottom: 10,
    // @ts-ignore
    boxShadow: '0px 12px 26px rgba(11, 111, 136, 0.32)',
    elevation: 8,
  },
  btnDisabled: {
    opacity: 0.7,
  },
  docTypeContainer: {
    flexDirection: 'row',
    marginBottom: 6,
    marginTop: 4,
  },
  docTypeBtn: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 999,
    backgroundColor: '#F4F8FB',
    marginRight: 10,
    borderWidth: 1,
    borderColor: '#D4E2EA',
  },
  docTypeBtnActive: {
    backgroundColor: '#0B6F88',
    borderColor: '#0B6F88',
  },
  docTypeText: {
    color: '#5D6C77',
    fontWeight: '800',
  },
  docTypeTextActive: {
    color: colors.white,
  },
  btnText: {
    color: colors.white,
    fontWeight: '900',
    fontSize: 16,
    letterSpacing: 0.8,
  },
  inlineRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  inlineInput: {
    flex: 1,
    marginRight: 10,
  },
  cityRow: {
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  cityFieldLarge: {
    flex: 2,
    marginRight: 10,
  },
  cityFieldSmall: {
    flex: 1,
  },
  searchButton: {
    backgroundColor: '#0B6F88',
    borderRadius: 16,
    width: 56,
    height: 56,
    justifyContent: 'center',
    alignItems: 'center',
  },
  helperCard: {
    marginTop: 18,
    borderRadius: 18,
    backgroundColor: '#EEF7F9',
    borderWidth: 1,
    borderColor: '#D5E7EC',
    paddingVertical: 14,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  helperIcon: {
    marginRight: 10,
    marginTop: 1,
  },
  helperText: {
    flex: 1,
    color: '#5A6A75',
    fontSize: 13,
    lineHeight: 20,
    fontWeight: '700',
  },
  bottomLinkRow: {
    alignItems: 'center',
    marginTop: 18,
    paddingHorizontal: 12,
  },
  bottomLinkText: {
    color: '#E6F7FB',
    fontSize: 15,
    lineHeight: 22,
    fontWeight: '700',
    textAlign: 'center',
  },
  bottomLinkAction: {
    color: '#F7C45C',
    fontSize: 16,
    fontWeight: '900',
    textDecorationLine: 'underline',
    textAlign: 'center',
    marginTop: 6,
  },
});
