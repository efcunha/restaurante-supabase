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
  Platform
} from 'react-native';
import { supabase } from '../config/SupabaseConfig';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { useResponsive } from '../hooks/useResponsive';
import { Button, FormInput } from '../components/ui-next';
import { isFeatureEnabled } from '../config/featureFlags';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
// @ts-ignore
import { validateCPF, validateCNPJ } from '../utils/validation';
// @ts-ignore
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { colors } from '../theme/colors';
interface Props {
  navigation: NativeStackNavigationProp<any>;
}

export default function RegisterCompanyScreen({ navigation }: Props) {
  useAuth(); // Keep auth context initialization side effects
  const useUiNextRegisterCompany = isFeatureEnabled('registerCompany_uiNext');
  // Actually, context 'register' wraps firebase. We should use direct supabase here or update context register?
  // Context register in our new Supabase Auth Context DOES use supabase.auth.signUp.
  const { isTablet, horizontalPadding } = useResponsive();
  const insets = useSafeAreaInsets();

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
  const [secureText, setSecureText] = useState(true);

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
      
      if (Platform.OS === 'web') {
        console.log('✅ Endereço encontrado:', data);
      }
    } catch (error) {
      console.error('Erro ao buscar CEP:', error);
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
    const passwordSanitized = password.trim();

    try {
      setLoading(true);

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
               console.error('Profile update failed', updateError);
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
          // Non-fatal: subscription row can be created by background job if insert fails
          console.warn('[RegisterCompany] Subscription row creation failed:', subError.message);
      }

      Alert.alert(
        'Sucesso',
        'Conta criada com sucesso! Você tem 30 dias de acesso gratuito. Faça login para começar.',
        [{ text: 'OK', onPress: () => navigation.navigate('Login') }]
      );

    } catch (error: any) {
      console.error('Registration Error:', error);
      let msg = error.message || 'Erro ao criar conta';
      if (msg.includes('already registered')) msg = 'Este email já está em uso.';
      Alert.alert('Erro', msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: Math.max(insets.top, 20) }]}>
        <View style={styles.headerLeft} />
        <View style={styles.headerCenter}>
          <View style={styles.headerTitleRow}>
            <Ionicons name="business-outline" size={24} color={colors.white} style={styles.headerIcon} />
            <Text style={styles.headerTitle}>Cadastre seu restaurante</Text>
          </View>
        </View>
        <View style={styles.headerRight}>
          <TouchableOpacity style={styles.logoutBtn} onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back-outline" size={24} color={colors.white} />
          </TouchableOpacity>
        </View>
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardAvoid}
      >
        <ScrollView contentContainerStyle={[styles.scrollContent, { paddingBottom: 100, paddingHorizontal: horizontalPadding }]}>

        <View style={[styles.billingCallout, { maxWidth: isTablet ? 700 : '100%', alignSelf: 'center', width: '100%' }]}>
          <View style={styles.billingCalloutIconWrap}>
            <Ionicons name="card-outline" size={20} color={colors.primary} />
          </View>
          <View style={styles.billingCalloutContent}>
            <Text style={styles.billingCalloutTitle}>Cobrança SaaS preparada no onboarding</Text>
            <Text style={styles.billingCalloutText}>
              A empresa é criada com 30 dias de trial. O método de pagamento não bloqueia a criação da conta, mas deve ser configurado antes do vencimento para manter o acesso operacional.
            </Text>
          </View>
        </View>

        <View style={[styles.form, { maxWidth: isTablet ? 700 : '100%', alignSelf: 'center', width: '100%' }]}>
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

          {useUiNextRegisterCompany ? (
            <FormInput
              label={documentType === 'cpf' ? 'CPF' : 'CNPJ'}
              value={documentValue}
              onChangeText={handleDocumentChange}
              placeholder={documentType === 'cpf' ? '000.000.000-00' : '00.000.000/0000-00'}
              style={styles.formField}
            />
          ) : (
            <>
              <Text style={styles.label}>{documentType === 'cpf' ? 'CPF' : 'CNPJ'}</Text>
              <TextInput
                style={[styles.input, styles.formField]}
                placeholder={documentType === 'cpf' ? '000.000.000-00' : '00.000.000/0000-00'}
                value={documentValue}
                onChangeText={handleDocumentChange}
                keyboardType="numeric"
              />
            </>
          )}

          {useUiNextRegisterCompany ? (
            <FormInput
              label="Nome do Restaurante"
              value={restaurantName}
              onChangeText={setRestaurantName}
              placeholder="Ex: Espetinho do Zé"
              style={styles.formField}
            />
          ) : (
            <>
              <Text style={styles.label}>Nome do Restaurante</Text>
              <TextInput
                style={[styles.input, styles.formField]}
                placeholder="Ex: Espetinho do Zé"
                value={restaurantName}
                onChangeText={setRestaurantName}
              />
            </>
          )}

          {useUiNextRegisterCompany ? (
            <FormInput
              label="Seu Nome (Administrador)"
              value={adminName}
              onChangeText={setAdminName}
              placeholder="Ex: José Silva"
              style={styles.formField}
            />
          ) : (
            <>
              <Text style={styles.label}>Seu Nome (Administrador)</Text>
              <TextInput
                style={[styles.input, styles.formField]}
                placeholder="Ex: José Silva"
                value={adminName}
                onChangeText={setAdminName}
              />
            </>
          )}

          <Text style={styles.label}>Telefone de Contato</Text>
          <TextInput
            style={styles.input}
            placeholder="(00) 00000-0000"
            value={contactPhone}
            onChangeText={handlePhoneChange}
            keyboardType="phone-pad"
          />

          <Text style={styles.label}>CEP</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <TextInput
              style={[styles.input, { flex: 1, marginRight: 10 }]}
              placeholder="00000-000"
              value={zipCode}
              onChangeText={handleZipCodeChange}
              keyboardType="numeric"
            />
            <TouchableOpacity
              style={styles.searchButton}
              onPress={() => searchAddressByCEP(zipCode)}
            >
              <Ionicons name="search" size={20} color={colors.white} />
            </TouchableOpacity>
          </View>

          <Text style={styles.label}>Endereço Completo</Text>
          <TextInput
            style={styles.input}
            placeholder="Rua, número, complemento"
            value={address}
            onChangeText={setAddress}
          />

          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <View style={{ flex: 2, marginRight: 10 }}>
              <Text style={styles.label}>Cidade</Text>
              <TextInput
                style={styles.input}
                placeholder="Cidade"
                value={city}
                onChangeText={setCity}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.label}>Estado</Text>
              <TextInput
                style={styles.input}
                placeholder="UF"
                value={state}
                onChangeText={(text) => setState(text.toUpperCase())}
                maxLength={2}
                autoCapitalize="characters"
              />
            </View>
          </View>

          {useUiNextRegisterCompany ? (
            <FormInput
              label="Email"
              value={email}
              onChangeText={setEmail}
              placeholder="seu@email.com"
              style={styles.formField}
            />
          ) : (
            <>
              <Text style={styles.label}>Email</Text>
              <TextInput
                style={[styles.input, styles.formField]}
                placeholder="seu@email.com"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </>
          )}

          <Text style={styles.label}>Senha</Text>
          <View style={styles.passwordContainer}>
            <TextInput
              style={styles.inputPassword}
              placeholder="Mínimo 6 caracteres"
              value={password}
              onChangeText={setPassword}
              secureTextEntry={secureText}
            />
            <TouchableOpacity onPress={() => setSecureText(!secureText)} style={styles.eyeIcon}>
              <Ionicons name={secureText ? "eye-off" : "eye"} size={24} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          {useUiNextRegisterCompany ? (
            <FormInput
              label="Confirmar Senha"
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              placeholder="Repita a senha"
              secureTextEntry={secureText}
              style={styles.formField}
            />
          ) : (
            <>
              <Text style={styles.label}>Confirmar Senha</Text>
              <TextInput
                style={[styles.input, styles.formField]}
                placeholder="Repita a senha"
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                secureTextEntry={secureText}
              />
            </>
          )}

          {useUiNextRegisterCompany ? (
            <Button
              label="CRIAR CONTA GRÁTIS"
              onPress={handleRegister}
              loading={loading}
              fullWidth
              size="lg"
              style={styles.formField}
            />
          ) : (
            <TouchableOpacity
              style={[styles.btn, styles.formField, loading && styles.btnDisabled]}
              onPress={handleRegister}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color={colors.white} />
              ) : (
                <Text style={styles.btnText}>CRIAR CONTA GRÁTIS</Text>
              )}
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  keyboardAvoid: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  header: {
    backgroundColor: colors.primary,
    paddingBottom: 15,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    zIndex: 10,
    elevation: 8,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
  },
  headerLeft: {
    flex: 1,
  },
  headerCenter: {
    flex: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerIcon: {
    marginRight: 6,
  },
  headerTitle: {
    color: colors.white,
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  headerRight: {
    flex: 1,
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  logoutBtn: {
    padding: 8,
  },
  billingCallout: {
    marginTop: 30,
    marginBottom: 12,
    backgroundColor: '#EFF7FB',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#D3E5EE',
    padding: 16,
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  billingCalloutIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#DFF1F7',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  billingCalloutContent: {
    flex: 1,
  },
  billingCalloutTitle: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '800',
    marginBottom: 6,
  },
  billingCalloutText: {
    color: colors.textSecondary,
    fontSize: 14,
    lineHeight: 20,
  },

  form: {
    backgroundColor: colors.white,
    padding: 20,
    borderRadius: 15,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 3,
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 5,
    marginTop: 10,
  },
  input: {
    backgroundColor: colors.surfaceMuted,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
  },
  formField: {
    marginBottom: 8,
  },
  passwordContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceMuted,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
  },
  inputPassword: {
    flex: 1,
    padding: 12,
    fontSize: 16,
  },
  eyeIcon: {
    padding: 10,
  },
  btn: {
    backgroundColor: colors.primary,
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 30,
    marginBottom: 10,
  },
  btnDisabled: {
    opacity: 0.7,
  },
  docTypeContainer: {
    flexDirection: 'row',
    marginBottom: 5,
    marginTop: 5,
  },
  docTypeBtn: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 20,
    backgroundColor: colors.surfaceMuted,
    marginRight: 10,
    borderWidth: 1,
    borderColor: colors.border
  },
  docTypeBtnActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  docTypeText: {
    color: colors.textSecondary,
    fontWeight: '600'
  },
  docTypeTextActive: {
    color: colors.white
  },
  btnText: {
    color: colors.white,
    fontWeight: 'bold',
    fontSize: 16,
  },
  searchButton: {
    backgroundColor: colors.primary,
    borderRadius: 8,
    padding: 12,
    justifyContent: 'center',
    alignItems: 'center',
    minWidth: 48,
  }
});
