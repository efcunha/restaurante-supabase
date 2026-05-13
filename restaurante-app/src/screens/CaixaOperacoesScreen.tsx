import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, View, TouchableOpacity, TextInput, Alert, ScrollView, ActivityIndicator } from 'react-native';
import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
// @ts-ignore
import CaixaService from '../services/CaixaService';
import { getUserFriendlyMessage } from '../utils/errors';
import { colors } from '../theme/colors';
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
      // @ts-ignore
      await CaixaService.registrarReforco(user.companyId, valorReforco, motivoReforco, user?.id, user?.nome);
      Alert.alert('Sucesso', 'Reforço registrado.');
      setValorReforco(''); setMotivoReforco('');

      // ...

    } catch (e) {
      Alert.alert('Erro', getUserFriendlyMessage(e));
    } finally {
      setLoadingReforco(false);
    }
  };

  const sangria = async () => {
    if (!valorSangria) return Alert.alert('Aviso', 'Informe o valor.');
    try {
      setLoadingSangria(true);
      // @ts-ignore
      await CaixaService.registrarSangria(user.companyId, valorSangria, motivoSangria, user?.id, user?.nome);
      Alert.alert('Sucesso', 'Sangria registrada.');
      setValorSangria(''); setMotivoSangria('');
    } catch (e) {
      Alert.alert('Erro', getUserFriendlyMessage(e));
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
            <ActivityIndicator color={colors.text} />
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
          style={[styles.btn, { backgroundColor: colors.primary }, loadingSangria && styles.btnDisabled]}
          onPress={sangria}
          disabled={loadingSangria}
        >
          {loadingSangria ? (
            <ActivityIndicator color={colors.white} />
          ) : (
            <Text style={[styles.btnText, { color: colors.white }]}>REGISTRAR SANGRIA</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
      <StatusBar style="light" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  section: { fontSize: 18, fontWeight: 'bold', marginBottom: 12, color: colors.text },
  input: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    padding: 12,
    marginBottom: 10,
    fontSize: 16
  },
  btn: {
    backgroundColor: colors.secondary,
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 10
  },
  btnText: { fontWeight: 'bold', fontSize: 16, color: colors.text },
  btnDisabled: { opacity: 0.6 }
});
