/**
 * MFAVerificationModal - Modal for verifying MFA code during sign-in
 * Supports both TOTP codes and backup codes
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import MFAService from '../services/MFAService';
import type { MFAVerificationResolver } from '../services/MFAService';
import { useAuth } from '../context/AuthContext';
import { colors } from '../theme/colors';
interface Props {
  visible: boolean;
  resolver: MFAVerificationResolver | null;
  onSuccess: () => void;
  onCancel: () => void;
}

export default function MFAVerificationModal({ visible, resolver, onSuccess, onCancel }: Props) {
  const { user } = useAuth();
  const [verificationCode, setVerificationCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [useBackupCode, setUseBackupCode] = useState(false);

  const handleVerify = async () => {
    if (!resolver) return;

    if (verificationCode.length < 6) {
      Alert.alert('Erro', 'Digite um código válido');
      return;
    }

    setLoading(true);
    try {
      if (useBackupCode) {
        const userId = user?.uid;
        if (!userId) {
          throw new Error('Usuario nao identificado para validar codigo de backup.');
        }

        const isValid = await MFAService.verifyBackupCode(userId, verificationCode);
        if (!isValid) {
          throw new Error('Codigo de backup invalido');
        }

        // If backup code is valid, we still need to resolve the sign-in
        // This is a limitation - backup codes should ideally bypass MFA
        Alert.alert(
          'Código de Backup Válido',
          'Entre em contato com o suporte para completar o login com código de backup.'
        );
      } else {
        // Verify TOTP code
        await MFAService.verifyCode(resolver, verificationCode);
        onSuccess();
      }
    } catch (error: any) {
      Alert.alert('Erro', error.message || 'Código inválido');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleBackupCode = () => {
    setUseBackupCode(!useBackupCode);
    setVerificationCode('');
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onCancel}>
      <View style={styles.overlay}>
        <View style={styles.container}>
          <View style={styles.header}>
            <View style={styles.iconContainer}>
              <Ionicons name="shield-checkmark" size={48} color={colors.primary} />
            </View>
            <Text style={styles.title}>Verificação de Dois Fatores</Text>
            <Text style={styles.description}>
              {useBackupCode
                ? 'Digite um dos seus códigos de backup'
                : 'Digite o código de 6 dígitos do seu aplicativo autenticador'}
            </Text>
          </View>

          <View style={styles.content}>
            <TextInput
              style={styles.codeInput}
              value={verificationCode}
              onChangeText={setVerificationCode}
              placeholder={useBackupCode ? 'XXXXXXXX' : '000000'}
              keyboardType={useBackupCode ? 'default' : 'number-pad'}
              maxLength={useBackupCode ? 8 : 6}
              autoFocus
              autoCapitalize="characters"
            />

            <TouchableOpacity
              style={[
                styles.verifyButton,
                (verificationCode.length < 6 || loading) && styles.buttonDisabled,
              ]}
              onPress={handleVerify}
              disabled={verificationCode.length < 6 || loading}
            >
              {loading ? (
                <ActivityIndicator color={colors.white} />
              ) : (
                <Text style={styles.verifyButtonText}>Verificar</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity style={styles.toggleButton} onPress={handleToggleBackupCode}>
              <Text style={styles.toggleButtonText}>
                {useBackupCode ? 'Usar código do aplicativo' : 'Usar código de backup'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.cancelButton} onPress={onCancel}>
              <Text style={styles.cancelButtonText}>Cancelar</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.footer}>
            <View style={styles.infoBox}>
              <Ionicons name="information-circle-outline" size={20} color={colors.textSecondary} />
              <Text style={styles.infoText}>
                {useBackupCode
                  ? 'Cada código de backup pode ser usado apenas uma vez'
                  : 'O código expira após 30 segundos'}
              </Text>
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  container: {
    backgroundColor: colors.white,
    borderRadius: 20,
    width: '100%',
    maxWidth: 400,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 10,
  },
  header: {
    alignItems: 'center',
    padding: 30,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  iconContainer: {
    marginBottom: 15,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 10,
    textAlign: 'center',
  },
  description: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
  content: {
    padding: 30,
  },
  codeInput: {
    backgroundColor: colors.background,
    borderWidth: 2,
    borderColor: colors.primary,
    borderRadius: 10,
    padding: 15,
    fontSize: 24,
    fontWeight: '700',
    textAlign: 'center',
    letterSpacing: 10,
    marginBottom: 20,
  },
  verifyButton: {
    backgroundColor: colors.primary,
    borderRadius: 10,
    padding: 15,
    alignItems: 'center',
    marginBottom: 10,
  },
  verifyButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.white,
  },
  toggleButton: {
    backgroundColor: 'transparent',
    borderRadius: 10,
    padding: 15,
    alignItems: 'center',
    marginBottom: 10,
  },
  toggleButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.primary,
  },
  cancelButton: {
    backgroundColor: 'transparent',
    borderRadius: 10,
    padding: 15,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  footer: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  infoText: {
    fontSize: 12,
    color: colors.textSecondary,
    marginLeft: 8,
    flex: 1,
    lineHeight: 18,
  },
});
