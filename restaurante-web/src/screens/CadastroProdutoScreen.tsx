import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, TextInput, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { useState } from 'react';
import { useResponsive } from '../hooks/useResponsive';
// @ts-ignore
import KeyboardWrapper from '../components/KeyboardWrapper';
// @ts-ignore
import { criarProduto } from '../services/ProductService';
import { colors } from '../theme/colors';
export default function CadastroProdutoScreen() {
  const { horizontalPadding, inputMaxWidth } = useResponsive();
  const [nome, setNome] = useState('');
  const [preco, setPreco] = useState('');
  const [categoria, setCategoria] = useState('espetinho');

  const cadastrar = async () => {
    if (!nome.trim() || !preco.trim()) {
      Alert.alert('Atenção', 'Preencha nome e preço.');
      return;
    }
    try {
      const result = await criarProduto({ nome, preco, categoria, ativo: true });
      if (result.success) {
        Alert.alert('Sucesso', 'Produto cadastrado com sucesso.');
        setNome('');
        setPreco('');
      } else {
        Alert.alert('Erro', result.error);
      }
    } catch (e: any) {
      Alert.alert('Erro', e.message);
    }
  };

  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={{ flex: 1 }}
    >
      <KeyboardWrapper style={styles.container}>
        <View style={styles.header}><Text style={styles.headerTitle}>Cadastro de Produtos</Text></View>
        <ScrollView contentContainerStyle={[styles.scrollContent, { paddingHorizontal: horizontalPadding }]}>
          <View style={[styles.formContainer, { maxWidth: inputMaxWidth, alignSelf: 'center', width: '100%' }]}>
            <Text style={styles.label}>Nome do Produto</Text>
            <TextInput style={styles.input} value={nome} onChangeText={setNome} placeholder="Ex: Picanha" placeholderTextColor={colors.textSecondary} />

            <Text style={styles.label}>Preço (R$)</Text>
            <TextInput style={styles.input} keyboardType="numeric" value={preco} onChangeText={setPreco} placeholder="Ex: 12.99" placeholderTextColor={colors.textSecondary} />

            <Text style={styles.label}>Categoria</Text>
            <View style={styles.row}>
              {['espetinho', 'bebida'].map(cat => (
                <TouchableOpacity key={cat} style={[styles.catChip, categoria === cat && styles.catChipActive]} onPress={() => setCategoria(cat)}>
                  <Text style={[styles.catText, categoria === cat && styles.catTextActive]}>{cat.toUpperCase()}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity style={styles.btn} onPress={cadastrar}>
              <Text style={styles.btnText}>CADASTRAR PRODUTO</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
        <StatusBar style="light" />
      </KeyboardWrapper>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: { backgroundColor: colors.primary, paddingTop: 50, paddingBottom: 20, paddingHorizontal: 12 },
  headerTitle: { color: colors.white, fontSize: 18, fontWeight: '600' },
  scrollContent: { paddingVertical: 20, paddingBottom: 100 },
  formContainer: {},
  label: { color: colors.primary, fontWeight: '600', marginBottom: 8, marginTop: 10 },
  input: { backgroundColor: colors.white, borderWidth: 1, borderColor: colors.border, borderRadius: 12, padding: 14, marginBottom: 12 },
  btn: { backgroundColor: colors.secondary, padding: 16, borderRadius: 12, alignItems: 'center', marginTop: 20 },
  btnText: { color: colors.text, fontWeight: '700' },
  row: { flexDirection: 'row', gap: 12, marginBottom: 20 },
  catChip: { flex: 1, borderWidth: 1, borderColor: colors.border, borderRadius: 10, paddingVertical: 12, alignItems: 'center', backgroundColor: colors.white },
  catChipActive: { backgroundColor: colors.secondary, borderColor: colors.secondary },
  catText: { color: colors.textSecondary, fontWeight: '700' },
  catTextActive: { color: colors.text },
});
