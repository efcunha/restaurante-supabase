import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, TextInput, Alert, ActivityIndicator } from 'react-native';
import { useState, useEffect } from 'react';
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../config/firebaseConfig';
import BackgroundPattern from '../components/BackgroundPattern';

export default function EstoqueScreen() {
  const [categoriaAtiva, setCategoriaAtiva] = useState('descartaveis');
  const [itensEstoque, setItensEstoque] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);

  // Form states
  const [nomeItem, setNomeItem] = useState('');
  const [quantidade, setQuantidade] = useState('');
  const [unidade, setUnidade] = useState('un');
  const [quantidadeMinima, setQuantidadeMinima] = useState('');
  const [fornecedor, setFornecedor] = useState('');
  const [observacoes, setObservacoes] = useState('');
  const [editandoId, setEditandoId] = useState(null);

  const categorias = [
    { id: 'descartaveis', nome: 'Descartáveis', icon: '🥤' },
    { id: 'mercearia', nome: 'Mercearia', icon: '🛒' },
    { id: 'carnes', nome: 'Carnes', icon: '🥩' },
    { id: 'verduras', nome: 'Verduras', icon: '🥬' },
  ];

  const unidades = ['un', 'kg', 'g', 'L', 'ml', 'cx', 'pct'];

  useEffect(() => {
    carregarItens();
  }, [categoriaAtiva]);

  const carregarItens = async () => {
    try {
      setLoading(true);
      const snapshot = await getDocs(collection(db, 'estoque'));
      const items = snapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() }))
        .filter(item => item.categoria === categoriaAtiva)
        .sort((a, b) => a.nome.localeCompare(b.nome));
      setItensEstoque(items);
    } catch (error) {
      console.error('Erro ao carregar estoque:', error);
      Alert.alert('Erro', 'Não foi possível carregar o estoque');
    } finally {
      setLoading(false);
    }
  };

  const limparForm = () => {
    setNomeItem('');
    setQuantidade('');
    setUnidade('un');
    setQuantidadeMinima('');
    setFornecedor('');
    setObservacoes('');
    setEditandoId(null);
  };

  const salvarItem = async () => {
    if (!nomeItem.trim()) {
      Alert.alert('Atenção', 'Nome do item é obrigatório');
      return;
    }
    if (!quantidade || parseFloat(quantidade) < 0) {
      Alert.alert('Atenção', 'Quantidade deve ser maior ou igual a zero');
      return;
    }

    try {
      setLoading(true);
      const itemData = {
        nome: nomeItem.trim(),
        quantidade: parseFloat(quantidade),
        unidade,
        quantidadeMinima: quantidadeMinima ? parseFloat(quantidadeMinima) : 0,
        fornecedor: fornecedor.trim(),
        observacoes: observacoes.trim(),
        categoria: categoriaAtiva,
        atualizadoEm: serverTimestamp(),
      };

      if (editandoId) {
        await updateDoc(doc(db, 'estoque', editandoId), itemData);
        Alert.alert('Sucesso', 'Item atualizado com sucesso!');
      } else {
        await addDoc(collection(db, 'estoque'), {
          ...itemData,
          criadoEm: serverTimestamp(),
        });
        Alert.alert('Sucesso', 'Item adicionado ao estoque!');
      }

      limparForm();
      setShowForm(false);
      carregarItens();
    } catch (error) {
      console.error('Erro ao salvar item:', error);
      Alert.alert('Erro', 'Não foi possível salvar o item');
    } finally {
      setLoading(false);
    }
  };

  const editarItem = (item) => {
    setNomeItem(item.nome);
    setQuantidade(item.quantidade.toString());
    setUnidade(item.unidade);
    setQuantidadeMinima(item.quantidadeMinima?.toString() || '');
    setFornecedor(item.fornecedor || '');
    setObservacoes(item.observacoes || '');
    setEditandoId(item.id);
    setShowForm(true);
  };

  const deletarItem = (itemId, itemNome) => {
    Alert.alert(
      'Confirmar Exclusão',
      `Deseja realmente excluir "${itemNome}" do estoque?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Excluir',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteDoc(doc(db, 'estoque', itemId));
              Alert.alert('Sucesso', 'Item excluído do estoque');
              carregarItens();
            } catch (error) {
              console.error('Erro ao deletar item:', error);
              Alert.alert('Erro', 'Não foi possível excluir o item');
            }
          },
        },
      ]
    );
  };

  const ajustarQuantidade = async (itemId, itemNome, quantidadeAtual, ajuste) => {
    const novaQuantidade = quantidadeAtual + ajuste;
    if (novaQuantidade < 0) {
      Alert.alert('Atenção', 'Quantidade não pode ser negativa');
      return;
    }

    try {
      await updateDoc(doc(db, 'estoque', itemId), {
        quantidade: novaQuantidade,
        atualizadoEm: serverTimestamp(),
      });
      carregarItens();
    } catch (error) {
      console.error('Erro ao ajustar quantidade:', error);
      Alert.alert('Erro', 'Não foi possível ajustar a quantidade');
    }
  };

  const isEstoqueBaixo = (item) => {
    return item.quantidadeMinima > 0 && item.quantidade <= item.quantidadeMinima;
  };

  return (
    <View style={styles.container}>
      <BackgroundPattern />

      <View style={styles.header}>
        <Text style={styles.headerTitle}>📦 Gerenciar Estoque</Text>
      </View>

      <ScrollView style={styles.content} contentContainerStyle={{ paddingBottom: 100 }}>
        {/* Categorias */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoriasScroll}>
          {categorias.map(cat => (
            <TouchableOpacity
              key={cat.id}
              style={[styles.categoriaBtn, categoriaAtiva === cat.id && styles.categoriaBtnActive]}
              onPress={() => setCategoriaAtiva(cat.id)}
            >
              <Text style={styles.categoriaIcon}>{cat.icon}</Text>
              <Text style={[styles.categoriaText, categoriaAtiva === cat.id && styles.categoriaTextActive]}>
                {cat.nome}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Botão Adicionar */}
        <TouchableOpacity
          style={styles.addBtn}
          onPress={() => {
            limparForm();
            setShowForm(!showForm);
          }}
        >
          <Text style={styles.addBtnText}>
            {showForm ? '✕ Cancelar' : '➕ Adicionar Item'}
          </Text>
        </TouchableOpacity>

        {/* Formulário */}
        {showForm && (
          <View style={styles.formContainer}>
            <Text style={styles.formTitle}>
              {editandoId ? '✏️ Editar Item' : '➕ Novo Item'}
            </Text>

            <TextInput
              style={styles.input}
              placeholder="Nome do item *"
              value={nomeItem}
              onChangeText={setNomeItem}
              placeholderTextColor="#999"
            />

            <View style={styles.row}>
              <TextInput
                style={[styles.input, styles.inputSmall]}
                placeholder="Quantidade *"
                keyboardType="numeric"
                value={quantidade}
                onChangeText={setQuantidade}
                placeholderTextColor="#999"
              />

              <View style={styles.unidadeContainer}>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  {unidades.map(un => (
                    <TouchableOpacity
                      key={un}
                      style={[styles.unidadeBtn, unidade === un && styles.unidadeBtnActive]}
                      onPress={() => setUnidade(un)}
                    >
                      <Text style={[styles.unidadeText, unidade === un && styles.unidadeTextActive]}>
                        {un}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            </View>

            <TextInput
              style={styles.input}
              placeholder="Quantidade mínima (alerta)"
              keyboardType="numeric"
              value={quantidadeMinima}
              onChangeText={setQuantidadeMinima}
              placeholderTextColor="#999"
            />

            <TextInput
              style={styles.input}
              placeholder="Fornecedor"
              value={fornecedor}
              onChangeText={setFornecedor}
              placeholderTextColor="#999"
            />

            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Observações"
              value={observacoes}
              onChangeText={setObservacoes}
              multiline
              numberOfLines={3}
              placeholderTextColor="#999"
            />

            <TouchableOpacity
              style={styles.saveBtn}
              onPress={salvarItem}
              disabled={loading}
            >
              <Text style={styles.saveBtnText}>
                {loading ? 'Salvando...' : editandoId ? '✓ Atualizar' : '✓ Adicionar'}
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Lista de Itens */}
        <Text style={styles.sectionTitle}>
          {categorias.find(c => c.id === categoriaAtiva)?.icon} {categorias.find(c => c.id === categoriaAtiva)?.nome}
        </Text>

        {loading ? (
          <ActivityIndicator size="large" color="#8B2F2F" style={styles.loader} />
        ) : itensEstoque.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>📭 Nenhum item cadastrado</Text>
            <Text style={styles.emptySubtext}>Adicione itens ao estoque usando o botão acima</Text>
          </View>
        ) : (
          itensEstoque.map(item => (
            <View
              key={item.id}
              style={[styles.itemCard, isEstoqueBaixo(item) && styles.itemCardAlerta]}
            >
              <View style={styles.itemHeader}>
                <Text style={styles.itemNome}>{item.nome}</Text>
                {isEstoqueBaixo(item) && (
                  <View style={styles.alertaBadge}>
                    <Text style={styles.alertaText}>⚠️ Estoque baixo</Text>
                  </View>
                )}
              </View>

              <View style={styles.itemInfo}>
                <View style={styles.quantidadeContainer}>
                  <TouchableOpacity
                    style={styles.btnAjuste}
                    onPress={() => ajustarQuantidade(item.id, item.nome, item.quantidade, -1)}
                  >
                    <Text style={styles.btnAjusteText}>−</Text>
                  </TouchableOpacity>

                  <Text style={styles.quantidadeText}>
                    {item.quantidade} {item.unidade}
                  </Text>

                  <TouchableOpacity
                    style={styles.btnAjuste}
                    onPress={() => ajustarQuantidade(item.id, item.nome, item.quantidade, 1)}
                  >
                    <Text style={styles.btnAjusteText}>+</Text>
                  </TouchableOpacity>
                </View>

                {item.quantidadeMinima > 0 && (
                  <Text style={styles.infoText}>Mínimo: {item.quantidadeMinima} {item.unidade}</Text>
                )}
                {item.fornecedor && (
                  <Text style={styles.infoText}>Fornecedor: {item.fornecedor}</Text>
                )}
                {item.observacoes && (
                  <Text style={styles.obsText}>{item.observacoes}</Text>
                )}
              </View>

              <View style={styles.itemActions}>
                <TouchableOpacity
                  style={styles.btnEditar}
                  onPress={() => editarItem(item)}
                >
                  <Text style={styles.btnText}>✏️ Editar</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.btnDeletar}
                  onPress={() => deletarItem(item.id, item.nome)}
                >
                  <Text style={styles.btnText}>🗑️ Excluir</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))
        )}
      </ScrollView>

      <StatusBar style="light" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F1E8',
  },
  header: {
    backgroundColor: '#8B2F2F',
    paddingTop: 50,
    paddingBottom: 20,
    paddingHorizontal: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 15,
    elevation: 8,
  },
  headerTitle: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: '600',
    textAlign: 'center',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  categoriasScroll: {
    marginBottom: 20,
  },
  categoriaBtn: {
    backgroundColor: '#FFFFFF',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 25,
    marginRight: 10,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 3,
  },
  categoriaBtnActive: {
    backgroundColor: '#8B2F2F',
  },
  categoriaIcon: {
    fontSize: 20,
    marginRight: 8,
  },
  categoriaText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#8B2F2F',
  },
  categoriaTextActive: {
    color: '#FFFFFF',
  },
  addBtn: {
    backgroundColor: '#E5B84A',
    paddingVertical: 15,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 20,
    shadowColor: '#E5B84A',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 5,
  },
  addBtnText: {
    color: '#2C2C2C',
    fontSize: 16,
    fontWeight: '700',
  },
  formContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 15,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 5,
  },
  formTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#8B2F2F',
    marginBottom: 15,
  },
  input: {
    backgroundColor: '#F5F1E8',
    borderRadius: 10,
    padding: 15,
    fontSize: 16,
    color: '#2C2C2C',
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E5B84A',
  },
  row: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 12,
  },
  inputSmall: {
    flex: 1,
    marginBottom: 0,
  },
  unidadeContainer: {
    flex: 1,
  },
  unidadeBtn: {
    backgroundColor: '#F5F1E8',
    paddingVertical: 15,
    paddingHorizontal: 15,
    borderRadius: 10,
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#E5B84A',
  },
  unidadeBtnActive: {
    backgroundColor: '#8B2F2F',
    borderColor: '#8B2F2F',
  },
  unidadeText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#8B2F2F',
  },
  unidadeTextActive: {
    color: '#FFFFFF',
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  saveBtn: {
    backgroundColor: '#8B2F2F',
    paddingVertical: 15,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 10,
    shadowColor: '#8B2F2F',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 5,
  },
  saveBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#8B2F2F',
    marginBottom: 15,
  },
  loader: {
    marginTop: 30,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#999',
    marginBottom: 5,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#999',
  },
  itemCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 15,
    padding: 15,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  itemCardAlerta: {
    borderWidth: 2,
    borderColor: '#FF6B6B',
  },
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  itemNome: {
    fontSize: 18,
    fontWeight: '700',
    color: '#2C2C2C',
    flex: 1,
  },
  alertaBadge: {
    backgroundColor: '#FF6B6B',
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 12,
  },
  alertaText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '600',
  },
  itemInfo: {
    marginBottom: 15,
  },
  quantidadeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
    gap: 15,
  },
  btnAjuste: {
    backgroundColor: '#8B2F2F',
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnAjusteText: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: '700',
  },
  quantidadeText: {
    fontSize: 24,
    fontWeight: '700',
    color: '#8B2F2F',
    minWidth: 100,
    textAlign: 'center',
  },
  infoText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 3,
  },
  obsText: {
    fontSize: 13,
    color: '#999',
    fontStyle: 'italic',
    marginTop: 5,
  },
  itemActions: {
    flexDirection: 'row',
    gap: 10,
  },
  btnEditar: {
    flex: 1,
    backgroundColor: '#E5B84A',
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  btnDeletar: {
    flex: 1,
    backgroundColor: '#FF6B6B',
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  btnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
});
