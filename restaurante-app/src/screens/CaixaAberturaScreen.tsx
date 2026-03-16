import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, View, TouchableOpacity, TextInput, Alert, ScrollView, Platform, KeyboardAvoidingView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../context/AuthContext';
import { useResponsive } from '../hooks/useResponsive';
// @ts-ignore
import CaixaService from '../services/CaixaService';
import { colors } from '../theme/colors';
interface Props {
  onSuccess?: () => void;
}

export default function CaixaAberturaScreen({ onSuccess }: Props) {
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const { isTablet, horizontalPadding } = useResponsive();
  const [valorInicial, setValorInicial] = useState('0');
  const [loading, setLoading] = useState(false);

  const abrirCaixa = async () => {
    if (loading) return;

    try {
      const userId = user?.id || user?.uid || '';
      const userName = user?.nome || user?.name || 'Usuário';

      if (!userId) {
        Alert.alert('Erro', 'Faça login novamente.');
        return;
      }

      const valor = parseFloat(valorInicial);
      if (isNaN(valor) || valor < 0) {
        Alert.alert('Erro', 'Digite um valor válido.');
        return;
      }

      setLoading(true);
      // @ts-ignore
      await CaixaService.abrirCaixa(user.companyId, valor, userId, userName);

      Alert.alert(
        'Sucesso',
        `Caixa aberto!\nValor: R$ ${valor.toFixed(2)}`,
        [{ text: 'OK', onPress: () => onSuccess && onSuccess() }]
      );

      // Para Web onde Alert pode não ser bloqueante ou usar window.alert
      if (Platform.OS === 'web') {
        if (onSuccess) onSuccess();
      }

    } catch (e: any) {
      Alert.alert('Erro', e?.message || 'Erro ao abrir caixa.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={{ flex: 1 }}
    >
      <View style={styles.container}>
        <View style={[styles.header, { paddingTop: Math.max(insets.top, 20) }]}>
          <View style={styles.headerLeft} />
          <View style={styles.headerCenter}>
            <View style={styles.headerTitleRow}>
              <Ionicons name="cash-outline" size={24} color={colors.white} style={styles.headerIcon} />
              <Text style={styles.headerTitle}>Abertura de Caixa</Text>
            </View>
            {!!user && <Text style={styles.userInfo}>Operador: {user.nome || user.email}</Text>}
          </View>
          <View style={styles.headerRight} />
        </View>

        <ScrollView contentContainerStyle={[styles.content, { 
          padding: horizontalPadding,
          paddingBottom: 100,
          maxWidth: isTablet ? 500 : '100%',
          alignSelf: 'center',
          width: '100%',
        }]}>
          <Text style={styles.label}>Valor inicial (R$)</Text>
          <TextInput
            style={[styles.input, {
              maxWidth: isTablet ? 400 : '100%',
            }]}
            keyboardType="numeric"
            value={valorInicial}
            onChangeText={setValorInicial}
            placeholder="0.00"
            placeholderTextColor={colors.textSecondary}
          />
          <TouchableOpacity
            style={[styles.btn, loading && styles.btnDisabled]}
            onPress={abrirCaixa}
            disabled={loading}
          >
            <Text style={styles.btnText}>
              {loading ? 'ABRINDO...' : 'ABRIR CAIXA'}
            </Text>
          </TouchableOpacity>
        </ScrollView>
        <StatusBar style="light" />
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
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
    shadowRadius: 4.65,
  },
  headerLeft: { flex: 1 },
  headerCenter: {
    flex: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerRight: { flex: 1 },
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
  userInfo: {
    fontSize: 12,
    color: colors.userInfo,
    fontWeight: '600',
    marginTop: 4,
    textAlign: 'center',
  },
  content: {},
  label: { color: colors.primary, fontWeight: '600', marginBottom: 8, fontSize: 16 },
  input: { backgroundColor: colors.white, borderWidth: 1, borderColor: colors.border, borderRadius: 12, padding: 14, marginBottom: 16, fontSize: 18 },
  btn: { backgroundColor: colors.secondary, padding: 16, borderRadius: 12, alignItems: 'center' },
  btnText: { color: colors.text, fontWeight: '700', fontSize: 16 },
  btnDisabled: { backgroundColor: colors.border },
});
