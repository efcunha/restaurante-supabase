import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, View, TouchableOpacity, TextInput, Alert, ScrollView, Platform } from 'react-native';
import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import CaixaService from '../services/CaixaService';

// VERSÃO SIMPLIFICADA - similar ao CaixaOperacoesScreen que funciona
export default function CaixaAberturaScreen({ onSuccess }) {
  const { user } = useAuth();
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

    } catch (e) {
      Alert.alert('Erro', e?.message || 'Erro ao abrir caixa.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 100 }}>
        <Text style={styles.label}>Valor inicial (R$)</Text>
        <TextInput
          style={styles.input}
          keyboardType="numeric"
          value={valorInicial}
          onChangeText={setValorInicial}
          placeholder="0.00"
          placeholderTextColor="#999"
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
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F1E8' },
  label: { color: '#8B2F2F', fontWeight: '600', marginBottom: 8, fontSize: 16 },
  input: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#E0D8C8', borderRadius: 12, padding: 14, marginBottom: 16, fontSize: 18 },
  btn: { backgroundColor: '#E5B84A', padding: 16, borderRadius: 12, alignItems: 'center' },
  btnText: { color: '#2C2C2C', fontWeight: '700', fontSize: 16 },
  btnDisabled: { backgroundColor: '#D0D0D0' },
});
