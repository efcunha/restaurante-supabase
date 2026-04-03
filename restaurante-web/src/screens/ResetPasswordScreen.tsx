import { useState } from 'react';
import { Alert, Dimensions, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../config/SupabaseConfig';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { colorSystem, radius, shadows, spacing, typography } from '../design-system';

const validateNewCredential = (candidate: string) => {
  if (candidate.length < 8) {
    return 'A nova senha deve ter pelo menos 8 caracteres.';
  }

  return null;
};

export default function ResetPasswordScreen() {
  const { clearPasswordRecovery } = useAuth();
  const { showToast } = useToast();
  const windowWidth = Dimensions.get('window').width;
  const isDesktop = windowWidth >= 1080;
  const isTablet = windowWidth >= 760;
  const [newCredential, setNewCredential] = useState('');
  const [confirmCredential, setConfirmCredential] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const handleSubmit = async () => {
    const credentialError = validateNewCredential(newCredential.trim());
    if (credentialError) {
      Alert.alert('Nova senha', credentialError);
      return;
    }

    if (newCredential !== confirmCredential) {
      Alert.alert('Confirmacao de senha', 'As senhas digitadas nao conferem.');
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabase.auth.updateUser({ password: newCredential.trim() });
      if (error) {
        throw error;
      }

      showToast('Senha redefinida com sucesso. Faca login novamente.', 'success');
      await clearPasswordRecovery();
    } catch (error: any) {
      Alert.alert('Erro ao redefinir senha', error?.message || 'Nao foi possivel atualizar a senha.');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = async () => {
    await clearPasswordRecovery();
  };

  return (
    <View style={styles.container}>
      <View style={[styles.backdropOrb, styles.backdropOrbTop]} />
      <View style={[styles.backdropOrb, styles.backdropOrbBottom]} />
      <View style={styles.overlayVeil} />

      <ScrollView contentContainerStyle={[styles.scrollContent, isDesktop && styles.scrollContentDesktop]} showsVerticalScrollIndicator={false}>
        <View style={[styles.shell, isDesktop && styles.shellDesktop]}>
          {isTablet && (
            <View style={[styles.heroPanel, isDesktop && styles.heroPanelDesktop]}>
              <Text style={styles.heroEyebrow}>Recuperacao segura</Text>
              <Text style={[styles.heroTitle, isDesktop && styles.heroTitleDesktop]}>Redefina sua senha de acesso</Text>
              <Text style={[styles.heroDescription, isDesktop && styles.heroDescriptionDesktop]}>
                O link recebido por email abre uma sessao temporaria apenas para atualizacao da senha. Ao concluir, o acesso volta para o login.
              </Text>
            </View>
          )}

          <View style={[styles.authColumn, isDesktop && styles.authColumnDesktop]}>
            <View style={styles.formCard}>
              <Text style={styles.formEyebrow}>Recuperacao de acesso</Text>
              <Text style={styles.formTitle}>Defina a nova senha</Text>
              <Text style={styles.formSubtitle}>Use uma senha com no minimo 8 caracteres para concluir a recuperacao.</Text>

              <View style={styles.fieldGroup}>
                <Text style={styles.label}>Nova senha</Text>
                <View style={styles.passwordContainer}>
                  <TextInput
                    style={styles.passwordInput}
                    placeholder="••••••••"
                    placeholderTextColor={colorSystem.textMuted}
                    value={newCredential}
                    onChangeText={setNewCredential}
                    secureTextEntry={!showPassword}
                    autoCapitalize="none"
                  />
                  <TouchableOpacity style={styles.eyeButton} onPress={() => setShowPassword((current) => !current)}>
                    <Ionicons name={showPassword ? 'eye-off' : 'eye'} size={22} color={colorSystem.primary} />
                  </TouchableOpacity>
                </View>
              </View>

              <View style={styles.fieldGroup}>
                <Text style={styles.label}>Confirmar nova senha</Text>
                <View style={styles.passwordContainer}>
                  <TextInput
                    style={styles.passwordInput}
                    placeholder="••••••••"
                    placeholderTextColor={colorSystem.textMuted}
                    value={confirmCredential}
                    onChangeText={setConfirmCredential}
                    secureTextEntry={!showConfirmPassword}
                    autoCapitalize="none"
                  />
                  <TouchableOpacity style={styles.eyeButton} onPress={() => setShowConfirmPassword((current) => !current)}>
                    <Ionicons name={showConfirmPassword ? 'eye-off' : 'eye'} size={22} color={colorSystem.primary} />
                  </TouchableOpacity>
                </View>
              </View>

              <TouchableOpacity style={[styles.primaryButton, loading && styles.primaryButtonDisabled]} onPress={handleSubmit} disabled={loading}>
                <Text style={styles.primaryButtonText}>{loading ? 'ATUALIZANDO...' : 'ATUALIZAR SENHA'}</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.secondaryButton} onPress={handleCancel} disabled={loading}>
                <Text style={styles.secondaryButtonText}>Cancelar e voltar ao login</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colorSystem.background,
  },
  backdropOrb: {
    position: 'absolute',
    width: 320,
    height: 320,
    borderRadius: 160,
    opacity: 0.14,
  },
  backdropOrbTop: {
    top: -120,
    left: -80,
    backgroundColor: colorSystem.primary,
  },
  backdropOrbBottom: {
    right: -90,
    bottom: -120,
    backgroundColor: colorSystem.accent,
  },
  overlayVeil: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: spacing.s24,
  },
  scrollContentDesktop: {
    padding: spacing.s32,
  },
  shell: {
    width: '100%',
    maxWidth: 1180,
    alignSelf: 'center',
    gap: spacing.s24,
  },
  shellDesktop: {
    flexDirection: 'row',
    alignItems: 'stretch',
  },
  heroPanel: {
    flex: 1,
    backgroundColor: colorSystem.secondary,
    borderRadius: radius.xl,
    padding: spacing.s32,
    justifyContent: 'center',
    minHeight: 420,
    ...shadows.medium,
  },
  heroPanelDesktop: {
    padding: spacing.s48,
  },
  heroEyebrow: {
    ...typography.small,
    color: colorSystem.accent,
    textTransform: 'uppercase',
    marginBottom: spacing.s12,
  },
  heroTitle: {
    ...typography.headingL,
    color: colorSystem.onSecondary,
    marginBottom: spacing.s16,
  },
  heroTitleDesktop: {
    fontSize: 34,
    lineHeight: 40,
  },
  heroDescription: {
    ...typography.body,
    color: 'rgba(255,255,255,0.78)',
  },
  heroDescriptionDesktop: {
    maxWidth: 420,
  },
  authColumn: {
    width: '100%',
    maxWidth: 560,
    alignSelf: 'center',
  },
  authColumnDesktop: {
    flex: 1,
    justifyContent: 'center',
  },
  formCard: {
    backgroundColor: colorSystem.surface,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colorSystem.border,
    padding: spacing.s24,
    ...shadows.medium,
  },
  formEyebrow: {
    ...typography.small,
    color: colorSystem.primary,
    textTransform: 'uppercase',
    marginBottom: spacing.s8,
  },
  formTitle: {
    ...typography.headingM,
    color: colorSystem.text,
    marginBottom: spacing.s8,
  },
  formSubtitle: {
    ...typography.body,
    color: colorSystem.textMuted,
    marginBottom: spacing.s24,
  },
  fieldGroup: {
    marginBottom: spacing.s16,
  },
  label: {
    ...typography.small,
    color: colorSystem.text,
    marginBottom: spacing.s8,
  },
  passwordContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colorSystem.border,
    borderRadius: radius.medium,
    backgroundColor: colorSystem.surface,
  },
  passwordInput: {
    flex: 1,
    minHeight: 52,
    paddingHorizontal: spacing.s16,
    color: colorSystem.text,
  },
  eyeButton: {
    height: 52,
    justifyContent: 'center',
    paddingHorizontal: spacing.s16,
  },
  primaryButton: {
    minHeight: 52,
    borderRadius: radius.medium,
    backgroundColor: colorSystem.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.s8,
  },
  primaryButtonDisabled: {
    opacity: 0.7,
  },
  primaryButtonText: {
    ...typography.button,
    color: colorSystem.onPrimary,
  },
  secondaryButton: {
    minHeight: 48,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: spacing.s12,
  },
  secondaryButtonText: {
    ...typography.small,
    color: colorSystem.textMuted,
  },
});