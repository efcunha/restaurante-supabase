import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, View, TouchableOpacity, TextInput, Alert, ScrollView } from 'react-native';
import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import CaixaService from '../services/CaixaService';

export default function CaixaOperacoesScreen() {
  const { user } = useAuth();
  const [valorReforco, setValorReforco] = useState('');
  const [motivoReforco, setMotivoReforco] = useState('');
  const [valorSangria, setValorSangria] = useState('');
  const [motivoSangria, setMotivoSangria] = useState('');

  const reforco = async () => {
    try {
      await CaixaService.registrarReforco(user.companyId, valorReforco, motivoReforco, user?.id, user?.nome);
      Alert.alert('Ok', 'Reforço registrado.');
      setValorReforco(''); setMotivoReforco('');
    } catch (e) { Alert.alert('Erro', e.message); }
  };

  const sangria = async () => {
    try {
      await CaixaService.registrarSangria(user.companyId, valorSangria, motivoSangria, user?.id, user?.nome);
      Alert.alert('Ok', 'Sangria registrada.');
      setValorSangria(''); setMotivoSangria('');
    } catch (e) { Alert.alert('Erro', e.message); }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}><Text style={styles.headerTitle}>Sangria / Reforço</Text></View>
      <ScrollView contentContainerStyle={{ padding: 20 }}>
        <Text style={styles.section}>Reforço</Text>
        <TextInput placeholder="Valor" keyboardType="numeric" style={styles.input} value={valorReforco} onChangeText={setValorReforco} />
        <TextInput placeholder="Motivo" style={styles.input} value={motivoReforco} onChangeText={setMotivoReforco} />
        <TouchableOpacity style={styles.btn} onPress={reforco}><Text style={styles.btnText}>REGISTRAR REFORÇO</Text></TouchableOpacity>

        <Text style={[styles.section,{marginTop:24}]}>Sangria</Text>
        <TextInput placeholder="Valor" keyboardType="numeric" style={styles.input} value={valorSangria} onChangeText={setValorSangria} />
        <TextInput placeholder="Motivo" style={styles.input} value={motivoSangria} onChangeText={setMotivoSangria} />
        <TouchableOpacity style={[styles.btn,{backgroundColor:'#8B2F2F'}]} onPress={sangria}><Text style={[styles.btnText,{color:'#fff'}]}>REGISTRAR SANGRIA</Text></TouchableOpacity>
      </ScrollView>
      <StatusBar style="light" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F1E8' },
  header: { backgroundColor: '#8B2F2F', paddingTop: 50, paddingBottom: 20, paddingHorizontal: 20 },
  headerTitle: { color: '#fff', fontSize: 24, fontWeight: '600' },
  input: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#E0D8C8', borderRadius: 12, padding: 14, marginBottom: 10 },
  btn: { backgroundColor: '#E5B84A', padding: 16, borderRadius: 12, alignItems: 'center', marginTop: 6 },
  btnText: { color: '#2C2C2C', fontWeight: '700' },
  section: { color: '#8B2F2F', fontWeight: '700', marginBottom: 8, fontSize: 16 },
});
