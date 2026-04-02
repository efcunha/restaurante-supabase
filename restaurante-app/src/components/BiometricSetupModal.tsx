/**
 * BiometricSetupModal - Modal for enabling biometric authentication
 * Allows users to enroll fingerprint or face recognition
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  TextInput,
  KeyboardAvoidingView,
  ScrollView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import BiometricAuthService from '../services/BiometricAuthService';
import { useAuth } from '../context/AuthContext';
import * as Device from 'expo-device';
import { supabase } from '../config/SupabaseConfig';
import AuthPersistenceService from '../services/AuthPersistenceService';
import { colors } from '../theme/colors';
interface Props {
  visible: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function BiometricSetupModal({ visible, onClose, onSuccess }: Props) {
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const passwordInputRef = useRef<TextInput>(null);
  const [loading, setLoading] = useState(false);
  const [biometricType, setBiometricType] = useState<string>('Biometria');
  const [isAvailable, setIsAvailable] = useState(false);
  const [unavailableReason, setUnavailableReason] = useState<string>('');
  const [password, setPassword] = useState('');
  const [showPasswordInput, setShowPasswordInput] = useState(false);


  useEffect(() => {
    if (visible) {
      checkBiometricAvailability();
    }
  }, [visible]);

  const checkBiometricAvailability = async () => {
    const availability = await BiometricAuthService.isAvailable();
    setIsAvailable(availability.available);
    
    if (availability.available && availability.biometricType) {
      setBiometricType(availability.biometricType);
    } else if (availability.reason) {
      setUnavailableReason(availability.reason);
    }
  };

  const verifyAndEnroll = async () => {
    const trimmedPassword = password.trim();
    if (!trimmedPassword) {
      Alert.alert('Senha Necessária', 'Por favor, digite sua senha para confirmar.');
      return;
    }

    setLoading(true);
    try {
        const deviceId = Device.modelId || Device.deviceName || 'unknown';
        
        // 1. Verify Password using Supabase Auth
        if (!user?.email) throw new Error('Email do usuário não encontrado');
        
        const { error: signInError } = await supabase.auth.signInWithPassword({
            email: user.email,
            password: trimmedPassword
        });

        if (signInError) throw signInError;
        
        // 2. Authenticate Biometric (Verify ownership)
        const isBiometricValid = await BiometricAuthService.verifyBiometricOwnership(
            `Toque no sensor para habilitar ${biometricType}`
        );

        if (!isBiometricValid) {
            Alert.alert('Erro', 'Não foi possível confirmar sua biometria. Tente novamente.');
            setLoading(false);
            return;
        }

        // 3. Enroll and Store Credentials
        await BiometricAuthService.enrollUser(user.uid || user.id, deviceId);

        // 4. Explicitly persist current tokens so biometric login works even after logout.
        // The onAuthStateChange fire-and-forget may race; this ensures the tokens are saved.
        try {
            const { data: sessionData } = await supabase.auth.getSession();
            if (sessionData.session?.access_token && sessionData.session?.refresh_token) {
                await AuthPersistenceService.persistAuthState(
                    {
                        uid: user.uid || user.id,
                        email: user.email,
                        displayName: user.nome || user.name,
                    },
                    sessionData.session.access_token,
                    sessionData.session.refresh_token
                );
                console.log('[BiometricSetup] Auth state persisted after enrollment');
            }
        } catch (persistError) {
            console.warn('[BiometricSetup] Failed to persist auth state after enrollment:', persistError);
        }

        Alert.alert(
            'Sucesso',
            `${biometricType} habilitado com sucesso!`,
            [
            {
                text: 'OK',
                onPress: () => {
                onSuccess();
                onClose();
                },
            },
            ]
        );

    } catch (error: any) {
        console.error('Enroll error:', error);
        let errorMessage = 'Falha ao habilitar autenticação biométrica';
        
        if (error.message?.includes('Invalid login credentials')) {
             errorMessage = 'Email ou senha incorretos. Verifique seus dados.';
        } else if (error.message?.includes('password')) {
             errorMessage = 'Senha incorreta. Digite sua senha atual de acesso.';
        } else if (error.message?.includes('Email')) {
             errorMessage = 'Email não encontrado no sistema.';
        } else if (error.message?.includes('Nenhuma biometria') || error.message?.includes('enrolled')) {
             errorMessage = 'Nenhuma biometria cadastrada neste dispositivo. Cadastre uma nas Configurações do dispositivo.';
        }
        
        Alert.alert('Erro', errorMessage);
    } finally {
        setLoading(false);
    }
  };

  const initEnrollment = () => {
      setShowPasswordInput(true);
  };

  const getBiometricIcon = () => {
    if (biometricType.includes('Face') || biometricType.includes('Facial')) {
      return 'scan';
    }
    return 'finger-print';
  };

  const renderUnavailable = () => (
    <View style={styles.content}>
      <View style={styles.iconContainer}>
        <Ionicons name="alert-circle" size={64} color={colors.warning} />
      </View>

      <Text style={styles.title}>Biometria Não Disponível</Text>
      <Text style={styles.description}>{unavailableReason}</Text>

      <View style={styles.instructionsBox}>
        <Text style={styles.instructionsTitle}>Como habilitar:</Text>
        <Text style={styles.instructionText}>
          1. Vá em Configurações do dispositivo
        </Text>
        <Text style={styles.instructionText}>
          2. Procure por "Biometria" ou "Segurança"
        </Text>
        <Text style={styles.instructionText}>
          3. Cadastre sua impressão digital ou rosto
        </Text>
        <Text style={styles.instructionText}>
          4. Volte ao app e tente novamente
        </Text>
      </View>

      <TouchableOpacity style={styles.secondaryButton} onPress={onClose}>
        <Text style={styles.secondaryButtonText}>Fechar</Text>
      </TouchableOpacity>
    </View>
  );

  const renderAvailable = () => (
    <KeyboardAvoidingView 
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={styles.content}
    >
      <ScrollView
        contentContainerStyle={showPasswordInput ? styles.scrollContainer : styles.contentCenter}
        keyboardShouldPersistTaps="always"
        showsVerticalScrollIndicator={false}
      >
        {!showPasswordInput ? (
          <>
            <View style={styles.iconContainer}>
              <Ionicons name={getBiometricIcon()} size={64} color={colors.primary} />
            </View>

            <Text style={styles.title}>Habilitar {biometricType}</Text>
            <Text style={styles.description}>
              Faça login mais rápido e seguro usando {biometricType.toLowerCase()} do seu dispositivo.
            </Text>

            <View style={styles.benefitsList}>
              <View style={styles.benefitItem}>
                <Ionicons name="checkmark-circle" size={24} color={colors.success} />
                <Text style={styles.benefitText}>Login rápido e conveniente</Text>
              </View>
              <View style={styles.benefitItem}>
                <Ionicons name="checkmark-circle" size={24} color={colors.success} />
                <Text style={styles.benefitText}>Mais seguro que senha</Text>
              </View>
              <View style={styles.benefitItem}>
                <Ionicons name="checkmark-circle" size={24} color={colors.success} />
                <Text style={styles.benefitText}>Seus dados ficam no dispositivo</Text>
              </View>
              <View style={styles.benefitItem}>
                <Ionicons name="checkmark-circle" size={24} color={colors.success} />
                <Text style={styles.benefitText}>Fallback para senha sempre disponível</Text>
              </View>
            </View>

            <View style={styles.infoBox}>
              <Ionicons name="information-circle-outline" size={20} color={colors.textSecondary} />
              <Text style={styles.infoText}>
                Você sempre poderá usar sua senha se a biometria não funcionar.
              </Text>
            </View>

            <TouchableOpacity
              style={styles.primaryButton}
              onPress={initEnrollment}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color={colors.white} />
              ) : (
                <>
                  <Ionicons name={getBiometricIcon()} size={20} color={colors.white} />
                  <Text style={styles.primaryButtonText}>Habilitar {biometricType}</Text>
                </>
              )}
            </TouchableOpacity>
          </>
        ) : (
          <View style={styles.passwordContentContainer}>
            <View style={styles.passwordHeader}>
              <TouchableOpacity onPress={() => setShowPasswordInput(false)}>
                <Ionicons name="arrow-back" size={24} color={colors.primary} />
              </TouchableOpacity>
              <Text style={styles.passwordHeaderTitle}>Confirmar Senha</Text>
              <View style={{ width: 24 }} />
            </View>

            <View style={styles.passwordFormContainer}>
              <Text style={styles.label}>Confirme sua senha:</Text>
              
              <View style={styles.inputWrapper}>
                <TextInput 
                  ref={passwordInputRef}
                  style={styles.input}
                  value={password}
                  onChangeText={setPassword}
                  placeholder="Sua senha atual"
                  placeholderTextColor={colors.textSecondary}
                  secureTextEntry
                  autoCapitalize="none"
                  autoCorrect={false}
                  returnKeyType="done"
                  onSubmitEditing={verifyAndEnroll}
                  editable={!loading}
                  blurOnSubmit={false}
                />
                {password.length > 0 && (
                  <View style={styles.passwordIndicator}>
                    <Ionicons name="checkmark-circle" size={20} color={colors.success} />
                  </View>
                )}
              </View>
              
              <Text style={styles.passwordHint}>
                {password.length > 0 
                  ? `${password.length} caracteres digitados`
                  : 'Digite sua senha para continuar'}
              </Text>

              <TouchableOpacity
                style={[styles.primaryButton, password.length === 0 && styles.disabledButton]}
                onPress={verifyAndEnroll}
                disabled={loading || password.length === 0}
              >
                {loading ? (
                  <ActivityIndicator color={colors.white} />
                ) : (
                  <Text style={styles.primaryButtonText}>Confirmar e Ativar</Text>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.secondaryButton}
                onPress={() => setShowPasswordInput(false)}
                disabled={loading}
              >
                <Text style={styles.secondaryButtonText}>Cancelar</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        <TouchableOpacity 
          style={styles.secondaryButton} 
          onPress={onClose}
          disabled={loading}
        >
          <Text style={styles.secondaryButtonText}>
            {showPasswordInput ? 'Voltar' : 'Agora Não'}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={styles.container}>
        <View style={[styles.header, { paddingTop: Math.max(insets.top, 20) }]}>
          <View style={styles.headerLeft} />
          <View style={styles.headerCenter}>
            <View style={styles.headerTitleRow}>
              <Ionicons name="finger-print-outline" size={24} color={colors.white} style={styles.headerIcon} />
              <Text style={styles.headerTitle}>Autenticação Biométrica</Text>
            </View>
            {!!user && <Text style={styles.userInfo}>Operador: {user.nome || user.email}</Text>}
          </View>
          <View style={styles.headerRight}>
            <TouchableOpacity style={styles.logoutBtn} onPress={onClose}>
              <Ionicons name="arrow-back-outline" size={24} color={colors.white} />
            </TouchableOpacity>
          </View>
        </View>

        {isAvailable ? renderAvailable() : renderUnavailable()}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: { backgroundColor: colors.primary, minHeight: 92, paddingBottom: 15, paddingHorizontal: 20, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderBottomLeftRadius: 20, borderBottomRightRadius: 20, zIndex: 10, elevation: 8, shadowColor: colors.shadow, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 6 },
  headerLeft: { flex: 1 },
  headerCenter: { flex: 2, alignItems: 'center', justifyContent: 'center' },
  headerRight: { flex: 1, alignItems: 'flex-end', justifyContent: 'center' },
  headerTitleRow: { flexDirection: 'row', alignItems: 'center' },
  headerIcon: { marginRight: 8 },
  headerTitle: { color: colors.white, fontSize: 20, fontWeight: 'bold', textAlign: 'center' },
  userInfo: { fontSize: 12, color: colors.userInfo, fontWeight: '600', marginTop: 4, textAlign: 'center' },
  logoutBtn: { paddingHorizontal: 10, paddingVertical: 8, borderRadius: 12, backgroundColor: colors.logoutBg },
  content: {
    flex: 1,
  },
  scrollContainer: {
    paddingVertical: 20,
    flexGrow: 1,
    paddingBottom: 30,
  },
  contentCenter: {
    paddingVertical: 20,
    paddingHorizontal: 20,
    flexGrow: 1,
    justifyContent: 'center',
  },
  passwordContentContainer: {
    flex: 1,
    paddingHorizontal: 0,
    paddingVertical: 0,
  },
  passwordHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  passwordHeaderTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
  },
  passwordFormContainer: {
    paddingHorizontal: 20,
    paddingVertical: 24,
  },
  iconContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 10,
    textAlign: 'center',
  },
  description: {
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: 30,
    lineHeight: 24,
  },
  benefitsList: {
    marginBottom: 20,
  },
  benefitItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  benefitText: {
    fontSize: 16,
    color: colors.text,
    marginLeft: 10,
    flex: 1,
  },
  infoBox: {
    flexDirection: 'row',
    backgroundColor: colors.primaryTint,
    padding: 15,
    borderRadius: 10,
    marginBottom: 20,
    borderLeftWidth: 4,
    borderLeftColor: colors.secondary,
  },
  infoText: {
    fontSize: 14,
    color: colors.secondary,
    marginLeft: 10,
    flex: 1,
    lineHeight: 20,
  },
  instructionsBox: {
    backgroundColor: colors.white,
    padding: 20,
    borderRadius: 10,
    marginBottom: 20,
  },
  instructionsTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 15,
  },
  instructionText: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 10,
    lineHeight: 20,
  },
  primaryButton: {
    backgroundColor: colors.primary,
    borderRadius: 10,
    padding: 15,
    alignItems: 'center',
    marginBottom: 10,
    flexDirection: 'row',
    justifyContent: 'center',
  },
  disabledButton: {
    backgroundColor: colors.disabled || '#cccccc',
    opacity: 0.6,
  },
  primaryButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.white,
    marginLeft: 8,
  },
  secondaryButton: {
    backgroundColor: 'transparent',
    borderRadius: 10,
    padding: 15,
    alignItems: 'center',
  },
  secondaryButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.primary,
  },
  passwordContainer: {
    width: '100%',
    marginBottom: 20,
  },
  label: {
      fontSize: 16,
      marginBottom: 12,
      color: colors.text,
      fontWeight: '600',
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    borderWidth: 2,
    borderColor: colors.border,
    borderRadius: 8,
    backgroundColor: colors.white,
    paddingRight: 12,
  },
  inputWrapperFocused: {
    borderColor: colors.primary,
  },
  input: {
      flex: 1,
      backgroundColor: 'transparent',
      borderWidth: 0,
      padding: 12,
      fontSize: 16,
      color: colors.text,
  },
  passwordIndicator: {
    marginLeft: 8,
    justifyContent: 'center',
  },
  passwordHint: {
    fontSize: 13,
    color: colors.textSecondary,
    marginBottom: 16,
    fontStyle: 'italic',
  }
});
