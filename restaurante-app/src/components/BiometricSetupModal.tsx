/**
 * BiometricSetupModal - Modal for enabling biometric authentication
 * Allows users to enroll fingerprint or face recognition
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Platform,
  TextInput,
  KeyboardAvoidingView,
} from 'react-native';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../config/firebaseConfig';
import { Ionicons } from '@expo/vector-icons';
import BiometricAuthService from '../services/BiometricAuthService';
import { useAuth } from '../context/AuthContext';
import * as Device from 'expo-device';

interface Props {
  visible: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function BiometricSetupModal({ visible, onClose, onSuccess }: Props) {
  const { user } = useAuth();
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
    if (!password) {
      Alert.alert('Senha Necessária', 'Por favor, digite sua senha para confirmar.');
      return;
    }

    setLoading(true);
    try {
        const deviceId = Device.modelId || Device.deviceName || 'unknown';
        
        // 1. Verify Password
        // We use signInWithEmailAndPassword to verify, this might refresh token but is safe
        if (!user?.email) throw new Error('Email do usuário não encontrado');
        
        await signInWithEmailAndPassword(auth, user.email, password);
        
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
        await BiometricAuthService.enrollUser(user.uid, deviceId, user.email, password);

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
        if (error.code === 'auth/invalid-credential' || error.code === 'auth/wrong-password') {
             Alert.alert('Erro', 'Senha incorreta.');
        } else {
             Alert.alert('Erro', 'Falha ao habilitar autenticação biométrica: ' + error.message);
        }
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
        <Ionicons name="alert-circle" size={64} color="#F57C00" />
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
    <View style={styles.content}>
      <View style={styles.iconContainer}>
        <Ionicons name={getBiometricIcon()} size={64} color="#8B2F2F" />
      </View>

      <Text style={styles.title}>Habilitar {biometricType}</Text>
      <Text style={styles.description}>
        Faça login mais rápido e seguro usando {biometricType.toLowerCase()} do seu dispositivo.
      </Text>

      {showPasswordInput ? (
          <View style={styles.passwordContainer}>
              <Text style={styles.label}>Confirme sua senha:</Text>
              <TextInput 
                  style={styles.input}
                  value={password}
                  onChangeText={setPassword}
                  placeholder="Sua senha atual"
                  secureTextEntry
                  autoCapitalize="none"
              />
              <TouchableOpacity
                style={styles.primaryButton}
                onPress={verifyAndEnroll}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="#FFF" />
                ) : (
                  <Text style={styles.primaryButtonText}>Confirmar e Ativar</Text>
                )}
              </TouchableOpacity>
          </View>
      ) : (
          <>

      <View style={styles.benefitsList}>
        <View style={styles.benefitItem}>
          <Ionicons name="checkmark-circle" size={24} color="#2E7D32" />
          <Text style={styles.benefitText}>Login rápido e conveniente</Text>
        </View>
        <View style={styles.benefitItem}>
          <Ionicons name="checkmark-circle" size={24} color="#2E7D32" />
          <Text style={styles.benefitText}>Mais seguro que senha</Text>
        </View>
        <View style={styles.benefitItem}>
          <Ionicons name="checkmark-circle" size={24} color="#2E7D32" />
          <Text style={styles.benefitText}>Seus dados ficam no dispositivo</Text>
        </View>
        <View style={styles.benefitItem}>
          <Ionicons name="checkmark-circle" size={24} color="#2E7D32" />
          <Text style={styles.benefitText}>Fallback para senha sempre disponível</Text>
        </View>
      </View>

      <View style={styles.infoBox}>
        <Ionicons name="information-circle-outline" size={20} color="#666" />
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
          <ActivityIndicator color="#FFF" />
        ) : (
          <>
            <Ionicons name={getBiometricIcon()} size={20} color="#FFF" />
            <Text style={styles.primaryButtonText}>Habilitar {biometricType}</Text>
          </>
        )}
      </TouchableOpacity>
      </>
      )}

      <TouchableOpacity style={styles.secondaryButton} onPress={onClose}>
        <Text style={styles.secondaryButtonText}>Agora Não</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Autenticação Biométrica</Text>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Ionicons name="close" size={28} color="#333" />
          </TouchableOpacity>
        </View>

        {isAvailable ? renderAvailable() : renderUnavailable()}
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
    flex: 1,
    padding: 20,
    justifyContent: 'center',
  },
  iconContainer: {
    alignItems: 'center',
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
    color: '#333',
    marginLeft: 10,
    flex: 1,
  },
  infoBox: {
    flexDirection: 'row',
    backgroundColor: '#E3F2FD',
    padding: 15,
    borderRadius: 10,
    marginBottom: 20,
    borderLeftWidth: 4,
    borderLeftColor: '#2196F3',
  },
  infoText: {
    fontSize: 14,
    color: '#1565C0',
    marginLeft: 10,
    flex: 1,
    lineHeight: 20,
  },
  instructionsBox: {
    backgroundColor: '#FFF',
    padding: 20,
    borderRadius: 10,
    marginBottom: 20,
  },
  instructionsTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#333',
    marginBottom: 15,
  },
  instructionText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 10,
    lineHeight: 20,
  },
  primaryButton: {
    backgroundColor: '#8B2F2F',
    borderRadius: 10,
    padding: 15,
    alignItems: 'center',
    marginBottom: 10,
    flexDirection: 'row',
    justifyContent: 'center',
  },
  primaryButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFF',
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
    color: '#8B2F2F',
  },
  passwordContainer: {
    width: '100%',
    marginBottom: 20,
  },
  label: {
      fontSize: 16,
      marginBottom: 8,
      color: '#333',
      fontWeight: '600',
  },
  input: {
      backgroundColor: '#FFF',
      borderWidth: 1,
      borderColor: '#DDD',
      borderRadius: 8,
      padding: 12,
      fontSize: 16,
      marginBottom: 20,
  }
});
