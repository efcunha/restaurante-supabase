import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, TextInput, Alert, ActivityIndicator } from 'react-native';
import { useState, useEffect } from 'react';
import { supabase } from '../config/SupabaseConfig';
import { useAuth } from '../context/AuthContext';
// @ts-ignore
import BackgroundPattern from '../components/BackgroundPattern';
import { Ionicons } from '@expo/vector-icons';

// Novas telas e utilitários
// @ts-ignore
import GerenciarFornecedoresScreen from './GerenciarFornecedoresScreen';
// @ts-ignore
import ConfiguracaoEstoqueScreen from './ConfiguracaoEstoqueScreen';
// @ts-ignore
import { SUPPORTED_UNITS } from '../utils/unitConversion';
import { ScreenScaffold } from '../layouts/ScreenScaffold';
import { colors } from '../theme/colors';
interface Props {
  onClose?: () => void;
}

export default function EstoqueScreen({ onClose }: Props) {
  const { user } = useAuth();

  // Navigation states
  const [showFornecedores, setShowFornecedores] = useState(false);
  const [showConfig, setShowConfig] = useState(false);

  // Data states
  const [categoriaAtiva, setCategoriaAtiva] = useState<string | null>(null);
  const [categorias, setCategorias] = useState<any[]>([]);
  const [fornecedores, setFornecedores] = useState<any[]>([]);
  const [itensEstoque, setItensEstoque] = useState<any[]>([]);
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
  const [editandoId, setEditandoId] = useState<string | null>(null);

  // Unit Context State
  const [tipoUnidade, setTipoUnidade] = useState('QUANTITY'); // QUANTITY | MASS | VOLUME

  useEffect(() => {
    // @ts-ignore
    if (user?.companyId) {
      carregarConfigECategorias();
      carregarFornecedores();
    }
  }, [user]);

  useEffect(() => {
    // @ts-ignore
    if (categoriaAtiva && user?.companyId) {
      carregarItens();
    }
  }, [categoriaAtiva, user]);

  const carregarConfigECategorias = async () => {
    try {
      if (!user?.companyId) return;
      console.log('[EstoqueScreen] Loading inventory config from app_settings...');
      const { data, error } = await supabase
        .from('app_settings')
        .select('*')
        .eq('company_id', user.companyId)
        .eq('key', 'estoque_config')
        .maybeSingle();

      if (error) {
        console.warn('[EstoqueScreen] Error loading from app_settings:', error);
      }

      let cats = [];
      if (data && data.value && data.value.stock_categories) {
        cats = data.value.stock_categories;
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
      if (!user?.companyId) return;
      const { data, error } = await supabase
        .from('suppliers')
        .select('*')
        .eq('company_id', user.companyId)
        .order('nome', { ascending: true });

      if (error) throw error;

      const lista = (data || []).map(d => ({ id: d.id, ...d }));
      // @ts-ignore
      setFornecedores(lista);
    } catch (error) {
      console.error('Erro ao carregar fornecedores:', error);
    }
  };

  const carregarItens = async () => {
    // @ts-ignore
    if (!user?.companyId || !categoriaAtiva) return;
    try {
      setLoading(true);
      // @ts-ignore
      const { data, error } = await supabase
        .from('estoque')
        .select('*')
        .eq('company_id', user.companyId)
        .eq('categoria', categoriaAtiva)
        .order('nome', { ascending: true });

      if (error) throw error;

      const items = (data || []).map(item => ({ id: item.id, ...item }));
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
        preco_custo: precoCusto ? parseFloat(precoCusto.replace(',', '.')) : 0,
        quantidade_minima: quantidadeMinima ? parseFloat(quantidadeMinima) : 0,
        fornecedor_id: fornecedorSelecionado,
        fornecedor_nome: fornecedores.find(f => f.id === fornecedorSelecionado)?.nome || '',
        observacoes: observacoes.trim(),
        categoria: categoriaAtiva,
        company_id: user?.companyId,
        atualizado_em: new Date().toISOString(),
      };

      if (editandoId) {
        const { error } = await supabase
          .from('estoque')
          .update(itemData)
          .eq('id', editandoId);

        if (error) throw error;
        Alert.alert('Sucesso', 'Item atualizado com sucesso!');
      } else {
        const { error } = await supabase
          .from('estoque')
          .insert({
            ...itemData,
            criado_em: new Date().toISOString(),
          });

        if (error) throw error;
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

  const editarItem = (item: any) => {
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
    // Map internal type to supported keys if needed, or just specific cases
    if (SUPPORTED_UNITS.VOLUME.includes(u)) setTipoUnidade('VOLUME');
    else if (SUPPORTED_UNITS.MASS.includes(u)) setTipoUnidade('MASS');
    else setTipoUnidade('QUANTITY');

    setShowForm(true);
  };

  const deletarItem = (itemId: string, itemNome: string) => {
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
              const { error } = await supabase
                .from('estoque')
                .delete()
                .eq('id', itemId);

              if (error) throw error;
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

  const ajustarQuantidade = async (itemId: string, quantidadeAtual: number, ajuste: number) => {
    const novaQuantidade = quantidadeAtual + ajuste;
    if (novaQuantidade < 0) {
      Alert.alert('Atenção', 'Quantidade não pode ser negativa');
      return;
    }
    try {
      const { error } = await supabase
        .from('estoque')
        .update({
          quantidade: novaQuantidade,
          atualizado_em: new Date().toISOString(),
        })
        .eq('id', itemId);

      if (error) throw error;
      carregarItens();
    } catch (error) {
      console.error('Erro ao ajustar quantidade:', error);
    }
  };

  const isEstoqueBaixo = (item: any) => {
    return item.quantidadeMinima > 0 && item.quantidade <= item.quantidadeMinima;
  };

  if (showFornecedores) {
    return (<GerenciarFornecedoresScreen onClose={() => { setShowFornecedores(false); carregarFornecedores(); }} />);
  }

  if (showConfig) {
    return (<ConfiguracaoEstoqueScreen onClose={() => { setShowConfig(false); carregarConfigECategorias(); }} />);
  }

  return (
    <ScreenScaffold
      title="Gerenciar Estoque"
      leftAction={onClose ? { label: 'Voltar', onPress: onClose } : undefined}
      rightSlot={(
        <View style={styles.headerActions}>
          <TouchableOpacity onPress={() => setShowConfig(true)} style={styles.iconBtn}>
            <Ionicons name="settings-outline" size={24} color={colors.white} />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setShowFornecedores(true)} style={styles.iconBtn}>
            <Ionicons name="people-outline" size={24} color={colors.white} />
          </TouchableOpacity>
        </View>
      )}
    >
      <BackgroundPattern />

      <ScrollView style={styles.content} contentContainerStyle={{ paddingBottom: 100 }}>
        {/* Categorias */}
        {categorias.length === 0 ? (
          <ActivityIndicator color={colors.primary} />
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
              placeholderTextColor={colors.textSecondary}
            />

            <View style={styles.row}>
              <TextInput
                style={[styles.input, styles.inputSmall]}
                placeholder="Qtd *"
                keyboardType="numeric"
                value={quantidade}
                onChangeText={setQuantidade}
                placeholderTextColor={colors.textSecondary}
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
                  {(SUPPORTED_UNITS[tipoUnidade as keyof typeof SUPPORTED_UNITS] || []).map((un: string) => (
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
              placeholderTextColor={colors.textSecondary}
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
              placeholderTextColor={colors.textSecondary}
            />

            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Observações"
              value={observacoes}
              onChangeText={setObservacoes}
              multiline
              numberOfLines={3}
              placeholderTextColor={colors.textSecondary}
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
          <ActivityIndicator size="large" color={colors.primary} style={styles.loader} />
        ) : itensEstoque.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>📭 Nenhum item nesta categoria</Text>
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
    </ScreenScaffold>
  );
}

const styles = StyleSheet.create({
  headerActions: {
    flexDirection: 'row',
    gap: 15
  },
  iconBtn: {
    padding: 5
  },
  content: {
    flex: 1,
    padding: 20,
  },
  categoriasScroll: {
    marginBottom: 20,
  },
  categoriaBtn: {
    backgroundColor: colors.white,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 25,
    marginRight: 10,
    flexDirection: 'row',
    alignItems: 'center',
    elevation: 2,
  },
  categoriaBtnActive: {
    backgroundColor: colors.primary,
  },
  categoriaIcon: {
    fontSize: 20,
    marginRight: 8,
  },
  categoriaText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.primary,
  },
  categoriaTextActive: {
    color: colors.white,
  },
  addBtn: {
    backgroundColor: colors.secondary,
    paddingVertical: 15,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 20,
    elevation: 3,
  },
  addBtnText: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '700',
  },
  formContainer: {
    backgroundColor: colors.white,
    borderRadius: 15,
    padding: 20,
    marginBottom: 20,
    elevation: 5,
  },
  formTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.primary,
    marginBottom: 15,
  },
  input: {
    backgroundColor: colors.surfaceMuted,
    borderRadius: 10,
    padding: 12,
    fontSize: 16,
    borderWidth: 1,
    borderColor: colors.secondary,
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
    backgroundColor: colors.surfaceMuted,
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
    backgroundColor: colors.white,
    elevation: 2
  },
  unitTabText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: colors.textSecondary
  },
  unitTabTextActive: {
    color: colors.primary
  },
  unidadeBtn: {
    backgroundColor: colors.surfaceMuted,
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderRadius: 10,
    marginRight: 8,
    borderWidth: 1,
    borderColor: colors.secondary,
    minWidth: 45,
    alignItems: 'center'
  },
  unidadeBtnActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  unidadeText: {
    fontWeight: '600',
    color: colors.primary,
  },
  unidadeTextActive: {
    color: colors.white,
  },
  // Chips for suppliers
  label: { fontSize: 14, fontWeight: 'bold', color: colors.textSecondary, marginBottom: 5 },
  fornecedorScroll: {
    flexDirection: 'row',
    marginBottom: 10,
    maxHeight: 50
  },
  chip: {
    backgroundColor: colors.surfaceMuted,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
    marginRight: 8,
    borderWidth: 1,
    borderColor: colors.border
  },
  chipActive: {
    backgroundColor: colors.secondary,
    borderColor: colors.secondary
  },
  chipText: { color: colors.textSecondary },
  chipTextActive: { color: colors.text, fontWeight: 'bold' },

  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  saveBtn: {
    backgroundColor: colors.primary,
    padding: 15,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 10,
  },
  saveBtnText: {
    color: colors.white,
    fontWeight: '700',
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.primary,
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
    color: colors.textSecondary,
  },
  emptySubtext: {
    color: colors.textSecondary,
    marginTop: 5
  },
  itemCard: {
    backgroundColor: colors.white,
    borderRadius: 15,
    padding: 15,
    marginBottom: 12,
    elevation: 3,
  },
  itemCardAlerta: {
    borderWidth: 2,
    borderColor: colors.danger,
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
    color: colors.text,
    flex: 1,
  },
  alertaBadge: {
    backgroundColor: colors.danger,
    borderRadius: 12,
    paddingVertical: 2,
    paddingHorizontal: 8
  },
  alertaText: { color: colors.white, fontSize: 10, fontWeight: 'bold' },
  itemInfo: { marginBottom: 15 },
  quantidadeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
    gap: 15,
  },
  btnAjuste: {
    backgroundColor: colors.primary,
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnAjusteText: { color: colors.white, fontSize: 20 },
  quantidadeText: { fontSize: 22, fontWeight: 'bold', color: colors.primary },
  infoText: { fontSize: 13, color: colors.textSecondary },
  obsText: { fontSize: 13, color: colors.textSecondary, fontStyle: 'italic', marginTop: 4 },
  itemActions: {
    flexDirection: 'row',
    gap: 10,
  },
  btnEditar: {
    flex: 1,
    backgroundColor: colors.secondary,
    padding: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  btnDeletar: {
    flex: 1,
    backgroundColor: colors.danger,
    padding: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  btnText: { color: colors.white, fontWeight: 'bold' }
});
