import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, Alert, Modal, TextInput } from 'react-native';
import { useEffect, useState } from 'react';
import { listarTodosProdutos, ativarProduto, desativarProduto, atualizarProduto } from '../services/produtos';

export default function ItensCadastradosScreen() {
  const [produtos, setProdutos] = useState([]);
  const [showEditModal, setShowEditModal] = useState(false);
  const [produtoEditando, setProdutoEditando] = useState(null);
  const [nomeEdit, setNomeEdit] = useState('');
  const [precoEdit, setPrecoEdit] = useState('');
  const [categoriaEdit, setCategoriaEdit] = useState('espetinho');

  useEffect(() => { load(); }, []);

  const load = async () => {
    const result = await listarTodosProdutos();
    if (result.success) {
      setProdutos(result.produtos);
    } else {
      console.error('[ItensCadastrados] Erro:', result.error);
    }
  };

  const toggleStatus = async (produtoId, ativo) => {
    try {
      const result = ativo ? await desativarProduto(produtoId) : await ativarProduto(produtoId);
      if (result.success) {
        Alert.alert('Ok', ativo ? 'Produto desativado.' : 'Produto ativado.');
        load();
      } else {
        Alert.alert('Erro', result.error);
      }
    } catch (e) { Alert.alert('Erro', e.message); }
  };

  const abrirEdicao = (produto) => {
    setProdutoEditando(produto);
    setNomeEdit(produto.nome);
    setPrecoEdit(String(produto.preco));
    setCategoriaEdit(produto.categoria);
    setShowEditModal(true);
  };

  const salvarEdicao = async () => {
    if (!nomeEdit.trim() || !precoEdit.trim()) {
      Alert.alert('Atenção', 'Preencha nome e preço.');
      return;
    }

    try {
      const result = await atualizarProduto(produtoEditando.id, {
        nome: nomeEdit,
        preco: parseFloat(precoEdit),
        categoria: categoriaEdit
      });

      if (result.success) {
        Alert.alert('Sucesso', 'Produto atualizado!');
        setShowEditModal(false);
        load();
      } else {
        Alert.alert('Erro', result.error);
      }
    } catch (e) {
      Alert.alert('Erro', e.message);
    }
  };

  const espetinhos = produtos.filter(p => p.categoria === 'espetinho');
  const bebidas = produtos.filter(p => p.categoria === 'bebida');

  return (
    <View style={styles.container}>
      <View style={styles.header}><Text style={styles.headerTitle}>Itens Cadastrados</Text></View>
      <ScrollView contentContainerStyle={{ padding: 20 }}>
        <Text style={styles.section}>Espetinhos</Text>
        {espetinhos.map(p => (
          <View key={p.id} style={styles.card}>
            <View style={{ flex:1 }}>
              <Text style={styles.nome}>{p.nome}</Text>
              <Text style={styles.preco}>R$ {Number(p.preco).toFixed(2)}</Text>
              <Text style={[styles.status, p.ativo ? styles.statusAtivo : styles.statusInativo]}>
                {p.ativo ? 'ATIVO' : 'INATIVO'}
              </Text>
            </View>
            <View style={styles.actionsContainer}>
              <TouchableOpacity style={styles.btnEditar} onPress={() => abrirEdicao(p)}>
                <Text style={styles.btnText}>✏️ Editar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.btn, p.ativo ? styles.btnDesativar : styles.btnAtivar]} onPress={() => toggleStatus(p.id, p.ativo)}>
                <Text style={styles.btnText}>{p.ativo ? 'Desativar' : 'Ativar'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        ))}

        <Text style={[styles.section, { marginTop: 20 }]}>Bebidas</Text>
        {bebidas.map(p => (
          <View key={p.id} style={styles.card}>
            <View style={{ flex:1 }}>
              <Text style={styles.nome}>{p.nome}</Text>
              <Text style={styles.preco}>R$ {Number(p.preco).toFixed(2)}</Text>
              <Text style={[styles.status, p.ativo ? styles.statusAtivo : styles.statusInativo]}>
                {p.ativo ? 'ATIVO' : 'INATIVO'}
              </Text>
            </View>
            <View style={styles.actionsContainer}>
              <TouchableOpacity style={styles.btnEditar} onPress={() => abrirEdicao(p)}>
                <Text style={styles.btnText}>✏️ Editar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.btn, p.ativo ? styles.btnDesativar : styles.btnAtivar]} onPress={() => toggleStatus(p.id, p.ativo)}>
                <Text style={styles.btnText}>{p.ativo ? 'Desativar' : 'Ativar'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        ))}
      </ScrollView>

      {/* Modal de Edição */}
      <Modal
        visible={showEditModal}
        animationType="slide"
        transparent={true}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <Text style={styles.modalTitle}>Editar Produto</Text>
            
            <Text style={styles.label}>Nome do Produto</Text>
            <TextInput
              style={styles.input}
              value={nomeEdit}
              onChangeText={setNomeEdit}
              placeholder="Ex: Picanha"
              placeholderTextColor="#999"
            />

            <Text style={styles.label}>Preço (R$)</Text>
            <TextInput
              style={styles.input}
              keyboardType="numeric"
              value={precoEdit}
              onChangeText={setPrecoEdit}
              placeholder="Ex: 12.99"
              placeholderTextColor="#999"
            />

            <Text style={styles.label}>Categoria</Text>
            <View style={styles.categoriaRow}>
              <TouchableOpacity
                style={[styles.catChip, categoriaEdit === 'espetinho' && styles.catChipActive]}
                onPress={() => setCategoriaEdit('espetinho')}
              >
                <Text style={[styles.catText, categoriaEdit === 'espetinho' && styles.catTextActive]}>
                  ESPETINHO
                </Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.catChip, categoriaEdit === 'bebida' && styles.catChipActive]}
                onPress={() => setCategoriaEdit('bebida')}
              >
                <Text style={[styles.catText, categoriaEdit === 'bebida' && styles.catTextActive]}>
                  BEBIDA
                </Text>
              </TouchableOpacity>
            </View>

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalBtn, styles.btnCancelar]}
                onPress={() => setShowEditModal(false)}
              >
                <Text style={styles.btnCancelarText}>Cancelar</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.modalBtn, styles.btnSalvar]}
                onPress={salvarEdicao}
              >
                <Text style={styles.btnSalvarText}>Salvar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <StatusBar style="light" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F1E8' },
  header: { backgroundColor: '#8B2F2F', paddingTop: 50, paddingBottom: 20, paddingHorizontal: 20 },
  headerTitle: { color: '#fff', fontSize: 24, fontWeight: '600' },
  section: { fontSize: 18, fontWeight: '700', color: '#8B2F2F', marginBottom: 12 },
  card: { backgroundColor:'#fff', borderRadius:12, padding:16, marginBottom:12, borderWidth:1, borderColor:'#F0EBE0', flexDirection:'row', alignItems:'center', gap:12 },
  nome: { fontSize:16, fontWeight:'700', color:'#2C2C2C', marginBottom:4 },
  preco: { fontSize:14, color:'#8B2F2F', marginBottom:4 },
  status: { fontSize:12, fontWeight:'700', marginTop:4 },
  statusAtivo: { color:'#28A745' },
  statusInativo: { color:'#999' },
  actionsContainer: { flexDirection: 'column', gap: 8 },
  btn: { paddingVertical:10, paddingHorizontal:14, borderRadius:8 },
  btnEditar: { backgroundColor:'#FFA500', paddingVertical:10, paddingHorizontal:14, borderRadius:8 },
  btnAtivar: { backgroundColor:'#28A745' },
  btnDesativar: { backgroundColor:'#DC3545' },
  btnText: { color:'#fff', fontWeight:'700', fontSize:12, textAlign:'center' },
  
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContainer: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#8B2F2F',
    marginBottom: 20,
    textAlign: 'center',
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2C2C2C',
    marginBottom: 8,
    marginTop: 12,
  },
  input: {
    backgroundColor: '#F5F1E8',
    borderRadius: 10,
    padding: 14,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#E0D8C8',
  },
  categoriaRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  catChip: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#E0D8C8',
    alignItems: 'center',
  },
  catChipActive: {
    backgroundColor: '#8B2F2F',
    borderColor: '#8B2F2F',
  },
  catText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#666',
  },
  catTextActive: {
    color: '#fff',
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 24,
  },
  modalBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  btnCancelar: {
    backgroundColor: '#E0E0E0',
  },
  btnCancelarText: {
    color: '#666',
    fontWeight: '700',
    fontSize: 16,
  },
  btnSalvar: {
    backgroundColor: '#8B2F2F',
  },
  btnSalvarText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 16,
  },
});
