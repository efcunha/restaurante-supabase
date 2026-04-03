import { useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
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
      <View style={[styles.orb, styles.orbTop]} />
      <View style={[styles.orb, styles.orbBottom]} />

      <KeyboardAvoidingView
        style={styles.keyboardAvoid}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 24}
      >
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <View style={styles.card}>
            <Text style={styles.eyebrow}>Recuperacao de acesso</Text>
            <Text style={styles.title}>Defina sua nova senha</Text>
            <Text style={styles.subtitle}>
              Use uma senha com no minimo 8 caracteres. Ao concluir, o sistema retornara para a tela de login.
            </Text>

            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Nova senha</Text>
              <View style={styles.passwordRow}>
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
              <View style={styles.passwordRow}>
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
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colorSystem.background,
  },
  keyboardAvoid: {
    flex: 1,
  },
  scroll: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: spacing.s24,
    paddingVertical: spacing.s32,
  },
  orb: {
    position: 'absolute',
    width: 240,
    height: 240,
    borderRadius: 120,
    opacity: 0.12,
  },
  orbTop: {
    top: -80,
    left: -50,
    backgroundColor: colorSystem.primary,
  },
  orbBottom: {
    right: -60,
    bottom: -90,
    backgroundColor: colorSystem.accent,
  },
  card: {
    backgroundColor: colorSystem.surface,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colorSystem.border,
    padding: spacing.s24,
    ...shadows.medium,
  },
  eyebrow: {
    ...typography.small,
    color: colorSystem.primary,
    textTransform: 'uppercase',
    marginBottom: spacing.s8,
  },
  title: {
    ...typography.headingM,
    color: colorSystem.text,
    marginBottom: spacing.s8,
  },
  subtitle: {
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
  passwordRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colorSystem.surface,
    borderWidth: 1,
    borderColor: colorSystem.border,
    borderRadius: radius.medium,
  },
  passwordInput: {
    flex: 1,
    minHeight: 52,
    paddingHorizontal: spacing.s16,
    color: colorSystem.text,
  },
  eyeButton: {
    paddingHorizontal: spacing.s16,
    height: 52,
    justifyContent: 'center',
  },
  primaryButton: {
    minHeight: 52,
    borderRadius: radius.medium,
    backgroundColor: colorSystem.primary,
    justifyContent: 'center',
    alignItems: 'center',
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