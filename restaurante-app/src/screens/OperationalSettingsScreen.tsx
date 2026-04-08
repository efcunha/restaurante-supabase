
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, Alert, ActivityIndicator } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { CompanySettingsService } from '../services/CompanySettingsService';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../theme/colors';
interface Props {
  onClose: () => void;
}

export default function OperationalSettingsScreen({ onClose }: Props) {
  const { user } = useAuth();
  const companyId = user?.companyId || '';
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [cutoffHour, setCutoffHour] = useState('06');

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    if (!companyId) {
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      const settings = await CompanySettingsService.getSettings(companyId);
      setCutoffHour(settings.businessDayCutoff?.toString().padStart(2, '0') || '06');
    } catch (error) {
      console.error('Error loading settings:', error);
      Alert.alert('Erro', 'Falha ao carregar configuracoes');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!companyId) {
      Alert.alert('Erro', 'Empresa não encontrada para salvar configurações.');
      return;
    }
    const hour = parseInt(cutoffHour, 10);
    if (isNaN(hour) || hour < 0 || hour > 23) {
      Alert.alert('Erro', 'Por favor, insira uma hora valida (00-23)');
      return;
    }
    try {
      setSaving(true);
      await CompanySettingsService.updateSettings(companyId, { businessDayCutoff: hour });
      Alert.alert('Sucesso', 'Configuracoes salvas com sucesso!');
      onClose();
    } catch (error) {
      console.error('Error saving settings:', error);
      Alert.alert('Erro', 'Falha ao salvar configuracoes');
    } finally {
      setSaving(false);
    }
  };

  const renderHeader = () => (
    <View style={[styles.header, { paddingTop: Math.max(insets.top, 20) }]}>
      <View style={styles.headerLeft} />
      <View style={styles.headerCenter}>
        <View style={styles.headerTitleRow}>
          <Ionicons name="options-outline" size={24} color={colors.white} style={styles.headerIcon} />
          <Text style={styles.headerTitle}>Config. Operacionais</Text>
        </View>
        {user && <Text style={styles.userInfo}>Operador: {user.nome || user.email}</Text>}
      </View>
      <View style={styles.headerRight}>
        <TouchableOpacity style={styles.logoutBtn} onPress={onClose}>
          <Ionicons name="arrow-back-outline" size={24} color={colors.white} />
        </TouchableOpacity>
      </View>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.container}>
        {renderHeader()}
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {renderHeader()}
      <View style={styles.content}>
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Turno de Trabalho</Text>
          <View style={styles.settingRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.settingLabel}>Horario de Corte (Inicio do Dia)</Text>
              <Text style={styles.settingDescription}>
                Define quando o dia de negocio comeca. Pedidos feitos antes desse horario contarao para o dia anterior.
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
            <ActivityIndicator color={colors.white} />
          ) : (
            <Text style={styles.saveButtonText}>SALVAR CONFIGURACOES</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: { backgroundColor: colors.primary, paddingBottom: 15, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderBottomLeftRadius: 20, borderBottomRightRadius: 20, zIndex: 10, elevation: 8, shadowColor: colors.shadow, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 6 },
  headerLeft: { flex: 1 },
  headerCenter: { flex: 2, alignItems: 'center', justifyContent: 'center' },
  headerRight: { flex: 1, alignItems: 'flex-end', justifyContent: 'center' },
  headerTitleRow: { flexDirection: 'row', alignItems: 'center' },
  headerIcon: { marginRight: 6 },
  headerTitle: { color: colors.white, fontSize: 18, fontWeight: 'bold', textAlign: 'center' },
  userInfo: { fontSize: 12, color: colors.userInfo, fontWeight: '600', marginTop: 4, textAlign: 'center' },
  logoutBtn: { paddingHorizontal: 10, paddingVertical: 8, borderRadius: 12, backgroundColor: colors.logoutBg },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background },
  content: { padding: 20 },
  card: { backgroundColor: colors.white, borderRadius: 10, padding: 20, marginBottom: 20, elevation: 2 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: colors.text, marginBottom: 15, borderBottomWidth: 1, borderBottomColor: colors.border, paddingBottom: 10 },
  settingRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
  settingLabel: { fontSize: 16, fontWeight: '600', color: colors.text, marginBottom: 4 },
  settingDescription: { fontSize: 12, color: colors.textSecondary, maxWidth: '90%' },
  inputContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surfaceMuted, borderWidth: 1, borderColor: colors.border, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5 },
  timeInput: { fontSize: 18, fontWeight: 'bold', color: colors.text, width: 30, textAlign: 'center', padding: 0 },
  timeSuffix: { fontSize: 18, color: colors.textSecondary, marginLeft: 2 },
  saveButton: { backgroundColor: colors.primary, borderRadius: 10, padding: 15, alignItems: 'center', elevation: 3 },
  disabledButton: { opacity: 0.7 },
  saveButtonText: { color: colors.white, fontWeight: 'bold', fontSize: 16 },
});
