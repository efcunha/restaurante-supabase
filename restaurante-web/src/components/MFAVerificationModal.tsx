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
import { MultiFactorResolver } from 'firebase/auth';

interface Props {
  visible: boolean;
  resolver: MultiFactorResolver | null;
  onSuccess: () => void;
  onCancel: () => void;
}

export default function MFAVerificationModal({ visible, resolver, onSuccess, onCancel }: Props) {
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
        // Verify backup code
        const userId = resolver.hints[0]?.uid;
        if (!userId) {
          throw new Error('Usuário não identificado');
        }

        const isValid = await MFAService.verifyBackupCode(userId, verificationCode);
        if (!isValid) {
          throw new Error('Código de backup inválido');
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
              <Ionicons name="shield-checkmark" size={48} color="#8B2F2F" />
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
                <ActivityIndicator color="#FFF" />
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
              <Ionicons name="information-circle-outline" size={20} color="#666" />
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
    backgroundColor: '#FFF',
    borderRadius: 20,
    width: '100%',
    maxWidth: 400,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 10,
  },
  header: {
    alignItems: 'center',
    padding: 30,
    borderBottomWidth: 1,
    borderBottomColor: '#E0D8C8',
  },
  iconContainer: {
    marginBottom: 15,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: '#333',
    marginBottom: 10,
    textAlign: 'center',
  },
  description: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    lineHeight: 20,
  },
  content: {
    padding: 30,
  },
  codeInput: {
    backgroundColor: '#F5F1E8',
    borderWidth: 2,
    borderColor: '#8B2F2F',
    borderRadius: 10,
    padding: 15,
    fontSize: 24,
    fontWeight: '700',
    textAlign: 'center',
    letterSpacing: 10,
    marginBottom: 20,
  },
  verifyButton: {
    backgroundColor: '#8B2F2F',
    borderRadius: 10,
    padding: 15,
    alignItems: 'center',
    marginBottom: 10,
  },
  verifyButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFF',
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
    color: '#8B2F2F',
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
    color: '#999',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  footer: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#E0D8C8',
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  infoText: {
    fontSize: 12,
    color: '#666',
    marginLeft: 8,
    flex: 1,
    lineHeight: 18,
  },
});
