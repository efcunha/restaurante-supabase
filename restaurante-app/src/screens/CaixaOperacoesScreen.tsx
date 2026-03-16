import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, View, TouchableOpacity, TextInput, Alert, ScrollView, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../context/AuthContext';
// @ts-ignore
import CaixaService from '../services/CaixaService';
import { getUserFriendlyMessage } from '../utils/errors';
import { colors } from '../theme/colors';
export default function CaixaOperacoesScreen() {
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
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
      <View style={[styles.header, { paddingTop: Math.max(insets.top, 20) }]}>
        <View style={styles.headerLeft} />
        <View style={styles.headerCenter}>
          <View style={styles.headerTitleRow}>
            <Ionicons name="swap-horizontal-outline" size={24} color={colors.white} style={styles.headerIcon} />
            <Text style={styles.headerTitle}>Operações de Caixa</Text>
          </View>
          {!!user && <Text style={styles.userInfo}>Operador: {user.nome || user.email}</Text>}
        </View>
        <View style={styles.headerRight} />
      </View>

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
  header: {
    backgroundColor: colors.primary,
    minHeight: 92,
    paddingBottom: 15,
    paddingHorizontal: 20,
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
    marginRight: 8,
  },
  headerTitle: {
    color: colors.white,
    fontSize: 20,
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
