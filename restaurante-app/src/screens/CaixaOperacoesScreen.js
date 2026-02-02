import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, View, TouchableOpacity, TextInput, Alert, ScrollView, ActivityIndicator } from 'react-native';
import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import CaixaService from '../services/CaixaService';
import { getFriendlyErrorMessage } from '../utils/errorHandler';

export default function CaixaOperacoesScreen() {
  const { user } = useAuth();
  const [valorReforco, setValorReforco] = useState('');
  const [motivoReforco, setMotivoReforco] = useState('');
  const [valorSangria, setValorSangria] = useState('');
  const [motivoSangria, setMotivoSangria] = useState('');
  const [loadingReforco, setLoadingReforco] = useState(false);
  const [loadingSangria, setLoadingSangria] = useState(false);

  const reforco = async () => {
    if (!valorReforco) return Alert.alert('Aviso', 'Informe o valor.');
    try {
      setLoadingReforco(true);
      await CaixaService.registrarReforco(user.companyId, valorReforco, motivoReforco, user?.id, user?.nome);
      Alert.alert('Sucesso', 'Reforço registrado.');
      setValorReforco(''); setMotivoReforco('');

      // ...

    } catch (e) {
      Alert.alert('Erro', getFriendlyErrorMessage(e));
    } finally {
      setLoadingReforco(false);
    }
  };

  const sangria = async () => {
    if (!valorSangria) return Alert.alert('Aviso', 'Informe o valor.');
    try {
      setLoadingSangria(true);
      await CaixaService.registrarSangria(user.companyId, valorSangria, motivoSangria, user?.id, user?.nome);
      Alert.alert('Sucesso', 'Sangria registrada.');
      setValorSangria(''); setMotivoSangria('');
    } catch (e) {
      Alert.alert('Erro', getFriendlyErrorMessage(e));
    } finally {
      setLoadingSangria(false);
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 100 }}>
        <Text style={styles.section}>Reforço</Text>
        <TextInput
          placeholder="Valor (R$)"
          keyboardType="numeric"
          style={styles.input}
          value={valorReforco}
          onChangeText={setValorReforco}
        />
        <TextInput
          placeholder="Motivo (Opcional)"
          style={styles.input}
          value={motivoReforco}
          onChangeText={setMotivoReforco}
        />
        <TouchableOpacity
          style={[styles.btn, loadingReforco && styles.btnDisabled]}
          onPress={reforco}
          disabled={loadingReforco}
        >
          {loadingReforco ? (
            <ActivityIndicator color="#2C2C2C" />
          ) : (
            <Text style={styles.btnText}>REGISTRAR REFORÇO</Text>
          )}
        </TouchableOpacity>

        <Text style={[styles.section, { marginTop: 24 }]}>Sangria</Text>
        <TextInput
          placeholder="Valor (R$)"
          keyboardType="numeric"
          style={styles.input}
          value={valorSangria}
          onChangeText={setValorSangria}
        />
        <TextInput
          placeholder="Motivo (Opcional)"
          style={styles.input}
          value={motivoSangria}
          onChangeText={setMotivoSangria}
        />
        <TouchableOpacity
          style={[styles.btn, { backgroundColor: '#8B2F2F' }, loadingSangria && styles.btnDisabled]}
          onPress={sangria}
          disabled={loadingSangria}
        >
          {loadingSangria ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={[styles.btnText, { color: '#fff' }]}>REGISTRAR SANGRIA</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
      <StatusBar style="light" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F1E8' },
  input: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#E0D8C8', borderRadius: 12, padding: 14, marginBottom: 10 },
  btn: { backgroundColor: '#E5B84A', padding: 16, borderRadius: 12, alignItems: 'center', marginTop: 6 },
  btnText: { color: '#2C2C2C', fontWeight: '700' },
  section: { color: '#8B2F2F', fontWeight: '700', marginBottom: 8, fontSize: 16 },
});
