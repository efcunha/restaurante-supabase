import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, TextInput, Alert, ActivityIndicator, Modal } from 'react-native';
import { useState, useEffect } from 'react';
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, getDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../config/firebaseConfig';
import { useAuth } from '../context/AuthContext';
import { getCompanyCollection, getCompanyDoc } from '../utils/firestoreUtils';
import BackgroundPattern from '../components/BackgroundPattern';
import { Ionicons } from '@expo/vector-icons';

// Novas telas e utilitários
import GerenciarFornecedoresScreen from './GerenciarFornecedoresScreen';
import ConfiguracaoEstoqueScreen from './ConfiguracaoEstoqueScreen';
import { SUPPORTED_UNITS, getUnitType } from '../utils/unitConversion';

export default function EstoqueScreen({ onClose }) {
  const { user } = useAuth();

  // Navigation states
  const [showFornecedores, setShowFornecedores] = useState(false);
  const [showConfig, setShowConfig] = useState(false);

  // Data states
  const [categoriaAtiva, setCategoriaAtiva] = useState(null);
  const [categorias, setCategorias] = useState([]);
  const [fornecedores, setFornecedores] = useState([]);
  const [itensEstoque, setItensEstoque] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);

  // Form states
  const [nomeItem, setNomeItem] = useState('');
  const [quantidade, setQuantidade] = useState('');
  const [unidade, setUnidade] = useState('un');
  const [precoCusto, setPrecoCusto] = useState(''); // New State
  const [quantidadeMinima, setQuantidadeMinima] = useState('');
  const [fornecedorSelecionado, setFornecedorSelecionado] = useState('');
  const [observacoes, setObservacoes] = useState('');
  const [editandoId, setEditandoId] = useState(null);

  // Unit Context State
  const [tipoUnidade, setTipoUnidade] = useState('QUANTITY'); // QUANTITY | MASS | VOLUME

  useEffect(() => {
    if (user?.companyId) {
      carregarConfigECategorias();
      carregarFornecedores();
    }
  }, [user]);

  useEffect(() => {
    if (categoriaAtiva && user?.companyId) {
      carregarItens();
    }
  }, [categoriaAtiva, user]);

  const carregarConfigECategorias = async () => {
    try {
      const docRef = getCompanyDoc(user.companyId, 'settings', 'estoque_config');
      const docSnap = await getDoc(docRef);

      let cats = [];
      if (docSnap.exists() && docSnap.data().stockCategories) {
        cats = docSnap.data().stockCategories;
      } else {
        cats = [
          { id: 'descartaveis', nome: 'Descartáveis', icon: '🥤' },
          { id: 'mercearia', nome: 'Mercearia', icon: '🛒' },
          { id: 'carnes', nome: 'Carnes', icon: '🥩' },
          { id: 'verduras', nome: 'Verduras', icon: '🥬' },
        ];
      }
      setCategorias(cats);
      if (cats.length > 0 && !categoriaAtiva) {
        setCategoriaAtiva(cats[0].id);
      }
    } catch (error) {
      console.error('Erro ao carregar categorias:', error);
    }
  };

  const carregarFornecedores = async () => {
    try {
      const snapshot = await getDocs(getCompanyCollection(user.companyId, 'suppliers'));
      const lista = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      setFornecedores(lista.sort((a, b) => a.nome.localeCompare(b.nome)));
    } catch (error) {
      console.error('Erro ao carregar fornecedores:', error);
    }
  };

  const carregarItens = async () => {
    if (!user?.companyId || !categoriaAtiva) return;
    try {
      setLoading(true);
      const snapshot = await getDocs(getCompanyCollection(user.companyId, 'estoque'));
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
    setTipoUnidade('QUANTITY');
    setQuantidadeMinima('');
    setPrecoCusto(''); // Reset cost price
    setFornecedorSelecionado('');
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
        precoCusto: precoCusto ? parseFloat(precoCusto.replace(',', '.')) : 0, // Save cost price
        quantidadeMinima: quantidadeMinima ? parseFloat(quantidadeMinima) : 0,
        fornecedorId: fornecedorSelecionado,
        fornecedorNome: fornecedores.find(f => f.id === fornecedorSelecionado)?.nome || '',
        observacoes: observacoes.trim(),
        categoria: categoriaAtiva,
        atualizadoEm: serverTimestamp(),
      };

      if (editandoId) {
        await updateDoc(getCompanyDoc(user.companyId, 'estoque', editandoId), itemData);
        Alert.alert('Sucesso', 'Item atualizado com sucesso!');
      } else {
        await addDoc(getCompanyCollection(user.companyId, 'estoque'), {
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
    setUnidade(item.unidade || 'un');
    setPrecoCusto(item.precoCusto ? item.precoCusto.toString() : ''); // Set cost price
    setQuantidadeMinima(item.quantidadeMinima?.toString() || '');
    setFornecedorSelecionado(item.fornecedorId || '');
    setObservacoes(item.observacoes || '');
    setEditandoId(item.id);

    // Auto-detect unit type
    const u = item.unidade || 'un';
    const type = getUnitType(u); // assuming helper returns 'VOLUME', 'MASS', etc.
    // Map internal type to supported keys if needed, or just specific cases
    if (SUPPORTED_UNITS.VOLUME.includes(u)) setTipoUnidade('VOLUME');
    else if (SUPPORTED_UNITS.MASS.includes(u)) setTipoUnidade('MASS');
    else setTipoUnidade('QUANTITY');

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
              await deleteDoc(getCompanyDoc(user.companyId, 'estoque', itemId));
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

  const ajustarQuantidade = async (itemId, quantidadeAtual, ajuste) => {
    const novaQuantidade = quantidadeAtual + ajuste;
    if (novaQuantidade < 0) {
      Alert.alert('Atenção', 'Quantidade não pode ser negativa');
      return;
    }
    try {
      await updateDoc(getCompanyDoc(user.companyId, 'estoque', itemId), {
        quantidade: novaQuantidade,
        atualizadoEm: serverTimestamp(),
      });
      carregarItens();
    } catch (error) {
      console.error('Erro ao ajustar quantidade:', error);
    }
  };

  const isEstoqueBaixo = (item) => {
    return item.quantidadeMinima > 0 && item.quantidade <= item.quantidadeMinima;
  };

  if (showFornecedores) {
    return (<GerenciarFornecedoresScreen onClose={() => { setShowFornecedores(false); carregarFornecedores(); }} />);
  }

  if (showConfig) {
    return (<ConfiguracaoEstoqueScreen onClose={() => { setShowConfig(false); carregarConfigECategorias(); }} />);
  }

  return (
    <View style={styles.container}>
      <BackgroundPattern />

      <View style={styles.header}>
        {onClose && (
          <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
            <Ionicons name="close" size={24} color="#FFF" />
          </TouchableOpacity>
        )}
        <Text style={styles.headerTitle}>📦 Gerenciar Estoque</Text>

        <View style={styles.headerActions}>
          <TouchableOpacity onPress={() => setShowConfig(true)} style={styles.iconBtn}>
            <Ionicons name="settings-outline" size={24} color="#FFF" />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setShowFornecedores(true)} style={styles.iconBtn}>
            <Ionicons name="people-outline" size={24} color="#FFF" />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView style={styles.content} contentContainerStyle={{ paddingBottom: 100 }}>
        {/* Categorias */}
        {categorias.length === 0 ? (
          <ActivityIndicator color="#8B2F2F" />
        ) : (
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
        )}

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
                placeholder="Qtd *"
                keyboardType="numeric"
                value={quantidade}
                onChangeText={setQuantidade}
                placeholderTextColor="#999"
              />

              <View style={styles.unidadeContainer}>
                {/* TABS DE TIPO DE UNIDADE */}
                <View style={styles.unitTabs}>
                  <TouchableOpacity onPress={() => setTipoUnidade('QUANTITY')} style={[styles.unitTab, tipoUnidade === 'QUANTITY' && styles.unitTabActive]}>
                    <Text style={[styles.unitTabText, tipoUnidade === 'QUANTITY' && styles.unitTabTextActive]}>Unid.</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => setTipoUnidade('VOLUME')} style={[styles.unitTab, tipoUnidade === 'VOLUME' && styles.unitTabActive]}>
                    <Text style={[styles.unitTabText, tipoUnidade === 'VOLUME' && styles.unitTabTextActive]}>Volume</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => setTipoUnidade('MASS')} style={[styles.unitTab, tipoUnidade === 'MASS' && styles.unitTabActive]}>
                    <Text style={[styles.unitTabText, tipoUnidade === 'MASS' && styles.unitTabTextActive]}>Peso</Text>
                  </TouchableOpacity>
                </View>

                {/* LISTA DE UNIDADES FILTRADA */}
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  {(SUPPORTED_UNITS[tipoUnidade] || []).map(un => (
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
              style={[styles.input, { marginTop: 10 }]}
              placeholder="Preço de Custo (R$) - Opcional"
              keyboardType="numeric"
              value={precoCusto}
              onChangeText={setPrecoCusto}
              placeholderTextColor="#999"
            />

            <Text style={styles.label}>Fornecedor:</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.fornecedorScroll}>
              <TouchableOpacity
                style={[styles.chip, !fornecedorSelecionado && styles.chipActive]}
                onPress={() => setFornecedorSelecionado('')}
              >
                <Text style={[styles.chipText, !fornecedorSelecionado && styles.chipTextActive]}>Nenhum</Text>
              </TouchableOpacity>
              {fornecedores.map(f => (
                <TouchableOpacity
                  key={f.id}
                  style={[styles.chip, fornecedorSelecionado === f.id && styles.chipActive]}
                  onPress={() => setFornecedorSelecionado(f.id)}
                >
                  <Text style={[styles.chipText, fornecedorSelecionado === f.id && styles.chipTextActive]}>
                    {f.nome}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <TextInput
              style={[styles.input, { marginTop: 10 }]}
              placeholder="Qtd Mínima (alerta)"
              keyboardType="numeric"
              value={quantidadeMinima}
              onChangeText={setQuantidadeMinima}
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
          {categorias.find(c => c.id === categoriaAtiva)?.icon || '📦'} {categorias.find(c => c.id === categoriaAtiva)?.nome || 'Itens'}
        </Text>

        {loading ? (
          <ActivityIndicator size="large" color="#8B2F2F" style={styles.loader} />
        ) : itensEstoque.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>📭 Nenhum item nesta categoria</Text>
            <Text style={styles.emptySubtext}>Nenhum item cadastrado para a empresa atual.</Text>
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
                    <Text style={styles.alertaText}>⚠️ Baixo</Text>
                  </View>
                )}
              </View>

              <View style={styles.itemInfo}>
                <View style={styles.quantidadeContainer}>
                  <TouchableOpacity
                    style={styles.btnAjuste}
                    onPress={() => ajustarQuantidade(item.id, item.quantidade, -1)}
                  >
                    <Text style={styles.btnAjusteText}>−</Text>
                  </TouchableOpacity>

                  <Text style={styles.quantidadeText}>
                    {item.quantidade} {item.unidade}
                  </Text>

                  <TouchableOpacity
                    style={styles.btnAjuste}
                    onPress={() => ajustarQuantidade(item.id, item.quantidade, 1)}
                  >
                    <Text style={styles.btnAjusteText}>+</Text>
                  </TouchableOpacity>
                </View>

                {item.precoCusto > 0 && (
                  <Text style={styles.infoText}>Custo: R$ {item.precoCusto.toFixed(2)}</Text>
                )}
                {item.quantidadeMinima > 0 && (
                  <Text style={styles.infoText}>Mínimo: {item.quantidadeMinima} {item.unidade}</Text>
                )}
                {item.fornecedorNome ? (
                  <Text style={styles.infoText}>🏢 {item.fornecedorNome}</Text>
                ) : null}
                {item.observacoes ? (
                  <Text style={styles.obsText}>📝 {item.observacoes}</Text>
                ) : null}
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
    paddingBottom: 15,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    elevation: 8,
  },
  headerTitle: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: 'bold',
    flex: 1,
    textAlign: 'center',
    marginLeft: 40 // offset close btn
  },
  headerActions: {
    flexDirection: 'row',
    gap: 15
  },
  iconBtn: {
    padding: 5
  },
  closeBtn: {
    padding: 5,
    position: 'absolute',
    left: 20,
    top: 50,
    zIndex: 20
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
    elevation: 2,
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
    elevation: 3,
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
    padding: 12,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#E5B84A',
    marginBottom: 10
  },
  row: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 10,
  },
  inputSmall: {
    flex: 0.4,
    marginBottom: 0,
  },
  unidadeContainer: {
    flex: 0.6,
  },
  unitTabs: {
    flexDirection: 'row',
    marginBottom: 8,
    backgroundColor: '#F5F1E8',
    borderRadius: 8,
    padding: 2
  },
  unitTab: {
    flex: 1,
    paddingVertical: 6,
    alignItems: 'center',
    borderRadius: 6
  },
  unitTabActive: {
    backgroundColor: '#fff',
    elevation: 2
  },
  unitTabText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#999'
  },
  unitTabTextActive: {
    color: '#8B2F2F'
  },
  unidadeBtn: {
    backgroundColor: '#F5F1E8',
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderRadius: 10,
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#E5B84A',
    minWidth: 45,
    alignItems: 'center'
  },
  unidadeBtnActive: {
    backgroundColor: '#8B2F2F',
    borderColor: '#8B2F2F',
  },
  unidadeText: {
    fontWeight: '600',
    color: '#8B2F2F',
  },
  unidadeTextActive: {
    color: '#FFFFFF',
  },
  // Chips for suppliers
  label: { fontSize: 14, fontWeight: 'bold', color: '#666', marginBottom: 5 },
  fornecedorScroll: {
    flexDirection: 'row',
    marginBottom: 10,
    maxHeight: 50
  },
  chip: {
    backgroundColor: '#F0F0F0',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#DDD'
  },
  chipActive: {
    backgroundColor: '#E5B84A',
    borderColor: '#DAA520'
  },
  chipText: { color: '#666' },
  chipTextActive: { color: '#2C2C2C', fontWeight: 'bold' },

  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  saveBtn: {
    backgroundColor: '#8B2F2F',
    padding: 15,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 10,
  },
  saveBtnText: {
    color: '#FFFFFF',
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
    fontWeight: '600',
    color: '#999',
  },
  emptySubtext: {
    color: '#999',
    marginTop: 5
  },
  itemCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 15,
    padding: 15,
    marginBottom: 12,
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
    borderRadius: 12,
    paddingVertical: 2,
    paddingHorizontal: 8
  },
  alertaText: { color: '#FFF', fontSize: 10, fontWeight: 'bold' },
  itemInfo: { marginBottom: 15 },
  quantidadeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
    gap: 15,
  },
  btnAjuste: {
    backgroundColor: '#8B2F2F',
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnAjusteText: { color: '#FFF', fontSize: 20 },
  quantidadeText: { fontSize: 22, fontWeight: 'bold', color: '#8B2F2F' },
  infoText: { fontSize: 13, color: '#666' },
  obsText: { fontSize: 13, color: '#999', fontStyle: 'italic', marginTop: 4 },
  itemActions: {
    flexDirection: 'row',
    gap: 10,
  },
  btnEditar: {
    flex: 1,
    backgroundColor: '#E5B84A',
    padding: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  btnDeletar: {
    flex: 1,
    backgroundColor: '#FF6B6B',
    padding: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  btnText: { color: '#FFF', fontWeight: 'bold' }
});
