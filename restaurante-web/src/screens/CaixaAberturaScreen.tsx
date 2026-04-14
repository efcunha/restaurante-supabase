import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, View, TouchableOpacity, TextInput, Alert, ScrollView, Platform, KeyboardAvoidingView } from 'react-native';
import { useState } from 'react';
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
            accessibilityRole="button"
            accessibilityLabel="Abrir caixa com valor inicial informado"
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
  content: {},
  label: { color: colors.primary, fontWeight: '600', marginBottom: 8, fontSize: 16 },
  input: { backgroundColor: colors.white, borderWidth: 1, borderColor: colors.border, borderRadius: 12, padding: 14, marginBottom: 16, fontSize: 18 },
  btn: { backgroundColor: colors.secondary, padding: 16, borderRadius: 12, alignItems: 'center' },
  btnText: { color: colors.text, fontWeight: '700', fontSize: 16 },
  btnDisabled: { backgroundColor: colors.border },
});
