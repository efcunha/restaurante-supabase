
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Switch, TextInput, Alert, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { CompanySettingsService } from '../services/CompanySettingsService';

interface Props {
  onClose: () => void;
}

export default function OperationalSettingsScreen({ onClose }: Props) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [cutoffHour, setCutoffHour] = useState('06');

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    if (!user?.companyId) return;
    try {
      setLoading(true);
      const settings = await CompanySettingsService.getSettings(user.companyId);
      // Default to 06 if not set
      setCutoffHour(settings.businessDayCutoff?.toString().padStart(2, '0') || '06');
    } catch (error) {
      console.error('Error loading settings:', error);
      Alert.alert('Erro', 'Falha ao carregar configurações');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!user?.companyId) return;

    const hour = parseInt(cutoffHour, 10);
    if (isNaN(hour) || hour < 0 || hour > 23) {
      Alert.alert('Erro', 'Por favor, insira uma hora válida (00-23)');
      return;
    }

    try {
      setSaving(true);
      await CompanySettingsService.updateSettings(user.companyId, {
        businessDayCutoff: hour
      });
      Alert.alert('Sucesso', 'Configurações salvas com sucesso!');
      onClose();
    } catch (error) {
      console.error('Error saving settings:', error);
      Alert.alert('Erro', 'Falha ao salvar configurações');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#8B2F2F" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onClose} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#FFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Configurações Operacionais</Text>
        <View style={{ width: 40 }} />
      </View>

      <View style={styles.content}>
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Turno de Trabalho</Text>
          
          <View style={styles.settingRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.settingLabel}>Horário de Corte (Início do Dia)</Text>
              <Text style={styles.settingDescription}>
                Define quando o "dia de negócio" começa. Pedidos feitos antes desse horário contarão para o dia anterior.
              </Text>
            </View>
            <View style={styles.inputContainer}>
              <TextInput
                style={styles.timeInput}
                value={cutoffHour}
                onChangeText={setCutoffHour}
                keyboardType="number-pad"
                maxLength={2}
                placeholder="06"
              />
              <Text style={styles.timeSuffix}>:00</Text>
            </View>
          </View>
        </View>

        <TouchableOpacity 
          style={[styles.saveButton, saving && styles.disabledButton]} 
          onPress={handleSave}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator color="#FFF" />
          ) : (
            <Text style={styles.saveButtonText}>SALVAR CONFIGURAÇÕES</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5DC',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5F5DC',
  },
  header: {
    backgroundColor: '#8B2F2F',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 50,
    paddingBottom: 15,
    paddingHorizontal: 20,
    elevation: 4,
  },
  headerTitle: {
    color: '#FFF',
    fontSize: 20,
    fontWeight: 'bold',
  },
  backButton: {
    padding: 5,
  },
  content: {
    padding: 20,
  },
  card: {
    backgroundColor: '#FFF',
    borderRadius: 10,
    padding: 20,
    marginBottom: 20,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#EEE',
    paddingBottom: 10,
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  settingLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  settingDescription: {
    fontSize: 12,
    color: '#666',
    maxWidth: '90%',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9F9F9',
    borderWidth: 1,
    borderColor: '#CCC',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  timeInput: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    width: 30,
    textAlign: 'center',
    padding: 0,
  },
  timeSuffix: {
    fontSize: 18,
    color: '#666',
    marginLeft: 2,
  },
  saveButton: {
    backgroundColor: '#8B2F2F',
    borderRadius: 10,
    padding: 15,
    alignItems: 'center',
    elevation: 3,
  },
  disabledButton: {
    opacity: 0.7,
  },
  saveButtonText: {
    color: '#FFF',
    fontWeight: 'bold',
    fontSize: 16,
  },
});
