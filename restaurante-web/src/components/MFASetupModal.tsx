/**
 * MFASetupModal - Modal for setting up Multi-Factor Authentication
 * Displays QR code and backup codes for TOTP enrollment
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  ScrollView,
  ActivityIndicator,
  Alert,
  Clipboard,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import QRCode from 'react-native-qrcode-svg';
import MFAService from '../services/MFAService';
import { useAuth } from '../context/AuthContext';

interface Props {
  visible: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function MFASetupModal({ visible, onClose, onSuccess }: Props) {
  const { user } = useAuth();
  const [step, setStep] = useState<'intro' | 'qrcode' | 'verify' | 'backup'>('intro');
  const [loading, setLoading] = useState(false);
  const [qrCodeUrl, setQrCodeUrl] = useState<string>('');
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [verificationCode, setVerificationCode] = useState('');
  const [secret, setSecret] = useState<any>(null);

  useEffect(() => {
    if (visible) {
      setStep('intro');
      setVerificationCode('');
    }
  }, [visible]);

  const handleStartSetup = async () => {
    if (!user) return;

    setLoading(true);
    try {
      const result = await MFAService.startEnrollment(user, 'Restaurant App');
      setQrCodeUrl(result.qrCodeUrl);
      setBackupCodes(result.backupCodes);
      setSecret(result.secret);
      setStep('qrcode');
    } catch (error: any) {
      Alert.alert('Erro', error.message || 'Falha ao iniciar configuração de MFA');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyCode = async () => {
    if (!user || !secret) return;

    if (verificationCode.length !== 6) {
      Alert.alert('Erro', 'Digite um código de 6 dígitos');
      return;
    }

    setLoading(true);
    try {
      await MFAService.completeEnrollment(user, secret, verificationCode, backupCodes);
      setStep('backup');
    } catch (error: any) {
      Alert.alert('Erro', error.message || 'Código inválido');
    } finally {
      setLoading(false);
    }
  };

  const handleCopyBackupCodes = () => {
    const codesText = backupCodes.join('\n');
    Clipboard.setString(codesText);
    Alert.alert('Sucesso', 'Códigos de backup copiados para a área de transferência');
  };

  const handleFinish = () => {
    onSuccess();
    onClose();
  };

  const renderIntro = () => (
    <View style={styles.stepContainer}>
      <View style={styles.iconContainer}>
        <Ionicons name="shield-checkmark" size={64} color="#8B2F2F" />
      </View>

      <Text style={styles.title}>Autenticação de Dois Fatores</Text>
      <Text style={styles.description}>
        Adicione uma camada extra de segurança à sua conta. Você precisará de um aplicativo
        autenticador como Google Authenticator ou Authy.
      </Text>

      <View style={styles.benefitsList}>
        <View style={styles.benefitItem}>
          <Ionicons name="checkmark-circle" size={24} color="#2E7D32" />
          <Text style={styles.benefitText}>Proteção contra acesso não autorizado</Text>
        </View>
        <View style={styles.benefitItem}>
          <Ionicons name="checkmark-circle" size={24} color="#2E7D32" />
          <Text style={styles.benefitText}>Códigos de backup para emergências</Text>
        </View>
        <View style={styles.benefitItem}>
          <Ionicons name="checkmark-circle" size={24} color="#2E7D32" />
          <Text style={styles.benefitText}>Obrigatório para administradores</Text>
        </View>
      </View>

      <TouchableOpacity
        style={styles.primaryButton}
        onPress={handleStartSetup}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="#FFF" />
        ) : (
          <Text style={styles.primaryButtonText}>Começar Configuração</Text>
        )}
      </TouchableOpacity>

      <TouchableOpacity style={styles.secondaryButton} onPress={onClose}>
        <Text style={styles.secondaryButtonText}>Cancelar</Text>
      </TouchableOpacity>
    </View>
  );

  const renderQRCode = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.title}>Escaneie o QR Code</Text>
      <Text style={styles.description}>
        Abra seu aplicativo autenticador e escaneie o código abaixo:
      </Text>

      <View style={styles.qrCodeContainer}>
        {qrCodeUrl && <QRCode value={qrCodeUrl} size={200} />}
      </View>

      <Text style={styles.instructionText}>
        Após escanear, digite o código de 6 dígitos exibido no aplicativo:
      </Text>

      <TextInput
        style={styles.codeInput}
        value={verificationCode}
        onChangeText={setVerificationCode}
        placeholder="000000"
        keyboardType="number-pad"
        maxLength={6}
        autoFocus
      />

      <TouchableOpacity
        style={[styles.primaryButton, verificationCode.length !== 6 && styles.buttonDisabled]}
        onPress={handleVerifyCode}
        disabled={loading || verificationCode.length !== 6}
      >
        {loading ? (
          <ActivityIndicator color="#FFF" />
        ) : (
          <Text style={styles.primaryButtonText}>Verificar Código</Text>
        )}
      </TouchableOpacity>

      <TouchableOpacity style={styles.secondaryButton} onPress={() => setStep('intro')}>
        <Text style={styles.secondaryButtonText}>Voltar</Text>
      </TouchableOpacity>
    </View>
  );

  const renderBackupCodes = () => (
    <ScrollView style={styles.stepContainer}>
      <View style={styles.iconContainer}>
        <Ionicons name="key" size={64} color="#8B2F2F" />
      </View>

      <Text style={styles.title}>Códigos de Backup</Text>
      <Text style={styles.description}>
        Guarde estes códigos em um local seguro. Você pode usá-los para acessar sua conta se
        perder acesso ao aplicativo autenticador.
      </Text>

      <View style={styles.warningBox}>
        <Ionicons name="warning" size={24} color="#F57C00" />
        <Text style={styles.warningText}>
          Cada código pode ser usado apenas uma vez. Não compartilhe com ninguém.
        </Text>
      </View>

      <View style={styles.codesContainer}>
        {backupCodes.map((code, index) => (
          <View key={index} style={styles.codeItem}>
            <Text style={styles.codeNumber}>{index + 1}.</Text>
            <Text style={styles.codeText}>{code}</Text>
          </View>
        ))}
      </View>

      <TouchableOpacity style={styles.copyButton} onPress={handleCopyBackupCodes}>
        <Ionicons name="copy-outline" size={20} color="#8B2F2F" />
        <Text style={styles.copyButtonText}>Copiar Códigos</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.primaryButton} onPress={handleFinish}>
        <Text style={styles.primaryButtonText}>Concluir</Text>
      </TouchableOpacity>
    </ScrollView>
  );

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Configurar MFA</Text>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Ionicons name="close" size={28} color="#333" />
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={styles.content}>
          {step === 'intro' && renderIntro()}
          {step === 'qrcode' && renderQRCode()}
          {step === 'backup' && renderBackupCodes()}
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F1E8',
  },
  header: {
    backgroundColor: '#8B2F2F',
    paddingTop: 50,
    paddingBottom: 15,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFF',
  },
  closeButton: {
    padding: 5,
  },
  content: {
    padding: 20,
  },
  stepContainer: {
    alignItems: 'center',
  },
  iconContainer: {
    marginBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#333',
    marginBottom: 10,
    textAlign: 'center',
  },
  description: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 24,
  },
  benefitsList: {
    width: '100%',
    marginBottom: 30,
  },
  benefitItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  benefitText: {
    fontSize: 16,
    color: '#333',
    marginLeft: 10,
    flex: 1,
  },
  qrCodeContainer: {
    backgroundColor: '#FFF',
    padding: 20,
    borderRadius: 10,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  instructionText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 15,
  },
  codeInput: {
    backgroundColor: '#FFF',
    borderWidth: 2,
    borderColor: '#8B2F2F',
    borderRadius: 10,
    padding: 15,
    fontSize: 24,
    fontWeight: '700',
    textAlign: 'center',
    letterSpacing: 10,
    marginBottom: 20,
    width: '100%',
  },
  warningBox: {
    flexDirection: 'row',
    backgroundColor: '#FFF3E0',
    padding: 15,
    borderRadius: 10,
    marginBottom: 20,
    borderLeftWidth: 4,
    borderLeftColor: '#F57C00',
  },
  warningText: {
    fontSize: 14,
    color: '#E65100',
    marginLeft: 10,
    flex: 1,
    lineHeight: 20,
  },
  codesContainer: {
    backgroundColor: '#FFF',
    borderRadius: 10,
    padding: 15,
    marginBottom: 20,
    width: '100%',
  },
  codeItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#E0D8C8',
  },
  codeNumber: {
    fontSize: 14,
    fontWeight: '600',
    color: '#999',
    width: 30,
  },
  codeText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#333',
    fontFamily: 'monospace',
    letterSpacing: 2,
  },
  copyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFF',
    borderWidth: 2,
    borderColor: '#8B2F2F',
    borderRadius: 10,
    padding: 15,
    marginBottom: 20,
    width: '100%',
  },
  copyButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#8B2F2F',
    marginLeft: 8,
  },
  primaryButton: {
    backgroundColor: '#8B2F2F',
    borderRadius: 10,
    padding: 15,
    alignItems: 'center',
    marginBottom: 10,
    width: '100%',
  },
  primaryButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFF',
  },
  secondaryButton: {
    backgroundColor: 'transparent',
    borderRadius: 10,
    padding: 15,
    alignItems: 'center',
    width: '100%',
  },
  secondaryButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#8B2F2F',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
});
