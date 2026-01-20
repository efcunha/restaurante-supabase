import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  Modal
} from 'react-native';
import { collection, getDocs, addDoc, updateDoc, doc, getDoc, setDoc, writeBatch, deleteDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../config/firebaseConfig';
import BackgroundPattern from '../components/BackgroundPattern';

// Componente para cada item de variação
function VariacaoItem({ variacao, onSalvar, onToggleStatus }) {
  const [precoTemp, setPrecoTemp] = useState(variacao.price.toString());

  return (
    <View style={styles.variacaoItem}>
      <View style={styles.variacaoInfo}>
        <Text style={styles.variacaoNome}>{variacao.name}</Text>
        <View style={styles.variacaoPrecoContainer}>
          <Text style={styles.variacaoLabel}>R$</Text>
          <TextInput
            style={styles.variacaoPrecoInput}
            value={precoTemp}
            onChangeText={setPrecoTemp}
            keyboardType="numeric"
            placeholder="0.00"
          />
          <TouchableOpacity
            style={styles.variacaoSalvarBtn}
            onPress={() => onSalvar(variacao, precoTemp)}
          >
            <Text style={styles.variacaoSalvarText}>✓</Text>
          </TouchableOpacity>
        </View>
      </View>

      <TouchableOpacity
        style={[
          styles.variacaoStatusBtn,
          variacao.active ? styles.variacaoStatusAtivo : styles.variacaoStatusInativo
        ]}
        onPress={() => onToggleStatus(variacao)}
      >
        <Text style={styles.variacaoStatusText}>
          {variacao.active ? 'ATIVO' : 'INATIVO'}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

export default function GerenciarCardapioScreen() {
  // Estados para cadastro
  const [nome, setNome] = useState('');
  const [preco, setPreco] = useState('');
  const [categoria, setCategoria] = useState('caldo');
  const [loading, setLoading] = useState(false);

  // Estados para cadastro com variações (espetinhos)
  const [criarVariacoes, setCriarVariacoes] = useState(false);
  const [precoSimples, setPrecoSimples] = useState('');
  const [precoArroz, setPrecoArroz] = useState('');
  const [precoMacaxeira, setPrecoMacaxeira] = useState('');
  const [precoCompleto, setPrecoCompleto] = useState('');

  // Estados para listagem
  const [produtos, setProdutos] = useState([]);
  const [loadingProdutos, setLoadingProdutos] = useState(true);
  const [categoriaFiltro, setCategoriaFiltro] = useState('todos');

  // Estados para edição
  const [editando, setEditando] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editNome, setEditNome] = useState('');
  const [editPreco, setEditPreco] = useState('');
  const [editCategoria, setEditCategoria] = useState('');

  // Estados para edição de grupo de variações
  const [showVariacoesModal, setShowVariacoesModal] = useState(false);
  const [variacoesSelecionadas, setVariacoesSelecionadas] = useState([]);

  const categorias = [
    { value: 'caldo', label: '🍲 Caldos' },
    { value: 'bebida', label: '🥤 Bebida' },
    { value: 'comida', label: '🍽️ Comida' },
    { value: 'outro', label: '📦 Outro' }
  ];

  useEffect(() => {
    carregarProdutos();
  }, []);

  const carregarProdutos = async () => {
    try {
      setLoadingProdutos(true);
      // console.log('📦 Carregando produtos do Firestore...');

      const snapshot = await getDocs(collection(db, 'cardapio'));
      // console.log(`📦 ${snapshot.size} produtos encontrados`);

      const produtosData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      // Ordenar por categoria (simples, especial, bebida, comida, outro) e depois por nome
      const ordemCategorias = {
        'espetinho-simples': 1,
        'espetinho-especial': 2,
        'bebida': 3,
        'comida': 4,
        'outro': 5
      };

      produtosData.sort((a, b) => {
        const ordemA = ordemCategorias[a.category] || 99;
        const ordemB = ordemCategorias[b.category] || 99;

        if (ordemA !== ordemB) {
          return ordemA - ordemB;
        }
        return a.name.localeCompare(b.name);
      });

      setProdutos(produtosData);
      // console.log('✅ Produtos carregados com sucesso');
    } catch (error) {
      console.error('❌ Erro ao carregar produtos:', error);
      Alert.alert('Erro', 'Não foi possível carregar os produtos');
    } finally {
      setLoadingProdutos(false);
    }
  };

  const cadastrarProduto = async () => {
    if (!nome.trim()) {
      window.alert('Digite o nome do produto');
      return;
    }

    // Se for espetinho e criar variações estiver marcado
    if (criarVariacoes && (categoria === 'espetinho-simples' || categoria === 'espetinho-especial')) {
      if (!precoSimples || !precoArroz || !precoMacaxeira || !precoCompleto) {
        window.alert('Preencha todos os preços das variações');
        return;
      }

      try {
        setLoading(true);
        // console.log('➕ Cadastrando produto com 4 variações:', nome);

        const variacoes = [
          { nome: `${nome.trim()} Simples`, preco: parseFloat(precoSimples) },
          { nome: `${nome.trim()} com Arroz`, preco: parseFloat(precoArroz) },
          { nome: `${nome.trim()} com Macaxeira`, preco: parseFloat(precoMacaxeira) },
          { nome: `${nome.trim()} Completo`, preco: parseFloat(precoCompleto) }
        ];

        const batch = writeBatch(db);

        variacoes.forEach(variacao => {
          const novoDoc = doc(collection(db, 'cardapio'));
          batch.set(novoDoc, {
            name: variacao.nome,
            price: variacao.preco,
            category: categoria,
            active: true,
            createdAt: Date.now()
          });
        });

        await batch.commit();
        // console.log('✅ 4 variações cadastradas com sucesso');

        window.alert(`✅ Sucesso! ${nome} cadastrado com 4 variações!`);

        // Limpar campos
        setNome('');
        setPrecoSimples('');
        setPrecoArroz('');
        setPrecoMacaxeira('');
        setPrecoCompleto('');

        // Recarregar lista
        carregarProdutos();
      } catch (error) {
        console.error('❌ Erro ao cadastrar variações:', error);
        window.alert('Erro ao cadastrar as variações');
      } finally {
        setLoading(false);
      }
    } else {
      // Cadastro normal (produto único)
      if (!preco || isNaN(parseFloat(preco))) {
        window.alert('Digite um preço válido');
        return;
      }

      try {
        setLoading(true);
        // console.log('➕ Cadastrando produto:', { nome, preco, categoria });

        const novoProduto = {
          name: nome.trim(),
          price: parseFloat(preco),
          category: categoria,
          active: true,
          createdAt: Date.now()
        };

        await addDoc(collection(db, 'cardapio'), novoProduto);
        // console.log('✅ Produto cadastrado com sucesso');

        window.alert('✅ Produto cadastrado com sucesso!');

        // Limpar campos
        setNome('');
        setPreco('');

        // Recarregar lista
        carregarProdutos();
      } catch (error) {
        console.error('❌ Erro ao cadastrar produto:', error);
        window.alert('Erro ao cadastrar o produto');
      } finally {
        setLoading(false);
      }
    }
  };

  const abrirEdicao = (produto) => {
    setEditando(produto);
    setEditNome(produto.name);
    setEditPreco(produto.price.toString());
    setEditCategoria(produto.category);
    setShowEditModal(true);
  };

  const salvarEdicao = async () => {
    if (!editNome.trim()) {
      Alert.alert('Atenção', 'Digite o nome do produto');
      return;
    }

    if (!editPreco || isNaN(parseFloat(editPreco))) {
      Alert.alert('Atenção', 'Digite um preço válido');
      return;
    }

    try {
      setLoading(true);
      // console.log('✏️ Editando produto:', editando.id);

      const produtoRef = doc(db, 'cardapio', editando.id);
      await updateDoc(produtoRef, {
        name: editNome.trim(),
        price: parseFloat(editPreco),
        category: editCategoria
      });

      // console.log('✅ Produto editado com sucesso');
      Alert.alert('Sucesso', 'Produto atualizado com sucesso!');

      setShowEditModal(false);
      setEditando(null);
      carregarProdutos();
    } catch (error) {
      console.error('❌ Erro ao editar produto:', error);
      Alert.alert('Erro', 'Não foi possível editar o produto');
    } finally {
      setLoading(false);
    }
  };

  const toggleAtivo = async (produto) => {
    try {
      // console.log(`🔄 ${produto.active ? 'Desativando' : 'Ativando'} produto:`, produto.id);

      const produtoRef = doc(db, 'cardapio', produto.id);
      await updateDoc(produtoRef, {
        active: !produto.active
      });

      // console.log('✅ Status atualizado');
      carregarProdutos();
    } catch (error) {
      console.error('❌ Erro ao atualizar status:', error);
      Alert.alert('Erro', 'Não foi possível atualizar o status do produto');
    }
  };

  const migrarCategorias = async () => {
    const confirmado = window.confirm(
      '🔄 MIGRAÇÃO DE CATEGORIAS\n\nIsso atualizará todos os espetinhos da categoria "espetinho" para "espetinho-simples" ou "espetinho-especial".\n\nDeseja continuar?'
    );

    if (!confirmado) return;

    try {
      setLoading(true);
      // console.log('🔄 Iniciando migração de categorias...');

      const snapshot = await getDocs(collection(db, 'cardapio'));
      const especiais = ['Carneiro', 'Cupim', 'Picanha'];

      let countSimples = 0;
      let countEspecial = 0;

      for (const docSnap of snapshot.docs) {
        const produto = docSnap.data();
        const nome = produto.name || '';
        const categoriaAtual = produto.category;

        if (categoriaAtual === 'espetinho') {
          let novaCategoria = 'espetinho-simples';

          for (const especial of especiais) {
            if (nome.includes(especial)) {
              novaCategoria = 'espetinho-especial';
              break;
            }
          }

          await updateDoc(doc(db, 'cardapio', docSnap.id), {
            category: novaCategoria
          });

          if (novaCategoria === 'espetinho-simples') {
            countSimples++;
          } else {
            countEspecial++;
          }

          // console.log(`✅ ${nome} → ${novaCategoria}`);
        }
      }

      // console.log('✅ Migração concluída!');
      window.alert(`✅ Migração concluída!\n\nEspetinhos Simples: ${countSimples}\nEspetinhos Especiais: ${countEspecial}`);
      carregarProdutos();
    } catch (error) {
      console.error('❌ Erro na migração:', error);
      window.alert('❌ Erro: Não foi possível migrar as categorias');
    } finally {
      setLoading(false);
    }
  };

  const limparDuplicados = async () => {
    const confirmado = window.confirm(
      '🗑️ LIMPEZA DE DUPLICADOS\n\nIsso removerá produtos espetinhos que NÃO tenham variação no nome (Simples, com Arroz, com Macaxeira, Completo).\n\nExemplos que serão removidos:\n- "Carneiro" (mantém "Carneiro Simples")\n- "Carne" (mantém "Carne Completo")\n\nDeseja continuar?'
    );

    if (!confirmado) return;

    try {
      setLoading(true);
      // console.log('🔄 Limpando produtos duplicados...');

      const snapshot = await getDocs(collection(db, 'cardapio'));
      const variacoes = ['Simples', 'com Arroz', 'com Macaxeira', 'Completo'];

      let countDeletados = 0;

      for (const docSnap of snapshot.docs) {
        const produto = docSnap.data();
        const nome = produto.name || '';
        const categoria = produto.category;

        // Verificar se é espetinho sem variação especificada
        if (categoria === 'espetinho' || categoria === 'espetinho-simples' || categoria === 'espetinho-especial') {
          const temVariacao = variacoes.some(v => nome.includes(v));

          if (!temVariacao) {
            await deleteDoc(doc(db, 'cardapio', docSnap.id));
            countDeletados++;
            // console.log(`🗑️  Removido: ${nome}`);
          }
        }
      }

      // console.log('✅ Limpeza concluída!');
      window.alert(`✅ Limpeza concluída!\n\nProdutos removidos: ${countDeletados}`);
      carregarProdutos();
    } catch (error) {
      console.error('❌ Erro na limpeza:', error);
      window.alert('❌ Erro: Não foi possível limpar os duplicados');
    } finally {
      setLoading(false);
    }
  };

  // Função para extrair o nome base do produto (sem a variação)
  const getNomeBase = (nomeProduto) => {
    // Remove as variações do nome
    return nomeProduto
      .replace(' Simples', '')
      .replace(' com Arroz', '')
      .replace(' com Macaxeira', '')
      .replace(' Completo', '')
      .trim();
  };

  // Função para agrupar produtos por nome base
  const agruparProdutos = (listaProdutos) => {
    const grupos = {};

    listaProdutos.forEach(produto => {
      const nomeBase = getNomeBase(produto.name);
      if (!grupos[nomeBase]) {
        grupos[nomeBase] = [];
      }
      grupos[nomeBase].push(produto);
    });

    return grupos;
  };

  // Função para abrir modal de variações
  const abrirVariacoes = (nomeBase) => {
    const variacoes = produtosAgrupados[nomeBase] || [];
    setVariacoesSelecionadas(variacoes);
    setShowVariacoesModal(true);
  };

  // Função para salvar alteração de uma variação
  const salvarVariacao = async (produto, novoPreco) => {
    try {
      const precoNum = parseFloat(novoPreco);
      if (isNaN(precoNum) || precoNum <= 0) {
        window.alert('Digite um preço válido');
        return;
      }

      await updateDoc(doc(db, 'cardapio', produto.id), {
        price: precoNum
      });

      // console.log(`✅ Preço de ${produto.name} atualizado`);
      carregarProdutos();

      // Atualizar a lista de variações no modal
      const variacoesAtualizadas = variacoesSelecionadas.map(v =>
        v.id === produto.id ? { ...v, price: precoNum } : v
      );
      setVariacoesSelecionadas(variacoesAtualizadas);
    } catch (error) {
      console.error('❌ Erro ao atualizar preço:', error);
      window.alert('Erro ao atualizar o preço');
    }
  };

  const produtosFiltrados = categoriaFiltro === 'todos'
    ? produtos
    : produtos.filter(p => p.category === categoriaFiltro);

  const produtosAgrupados = agruparProdutos(produtosFiltrados);

  const getCategoriaIcon = (cat) => {
    switch (cat) {
      case 'espetinho': return '';
      case 'bebida': return '';
      case 'comida': return '';
      default: return '';
    }
  };

  const getCategoriaLabel = (cat) => {
    switch (cat) {
      case 'espetinho-simples': return 'Espetinho Simples';
      case 'espetinho-especial': return 'Espetinho Especial';
      case 'bebida': return 'Bebida';
      case 'comida': return 'Comida';
      default: return 'Outro';
    }
  };

  return (
    <View style={styles.container}>
      <BackgroundPattern />

      <ScrollView style={styles.content}>
        {/* Botões de ação rápida */}


        {/* SEÇÃO 1: CADASTRAR PRODUTO */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>➕ Cadastrar Produto</Text>

          <View style={styles.form}>
            <TextInput
              style={styles.input}
              placeholder="Nome do produto (ex: Camarão)"
              placeholderTextColor="#999"
              value={nome}
              onChangeText={setNome}
            />

            <Text style={styles.label}>Categoria:</Text>
            <View style={styles.categoriaButtons}>
              {categorias.map(cat => (
                <TouchableOpacity
                  key={cat.value}
                  style={[
                    styles.categoriaBtn,
                    categoria === cat.value && styles.categoriaBtnActive
                  ]}
                  onPress={() => {
                    setCategoria(cat.value);
                    // Se mudar para espetinho, sugerir criar variações
                    if (cat.value === 'espetinho-simples' || cat.value === 'espetinho-especial') {
                      setCriarVariacoes(true);
                    } else {
                      setCriarVariacoes(false);
                    }
                  }}
                >
                  <Text style={[
                    styles.categoriaBtnText,
                    categoria === cat.value && styles.categoriaBtnTextActive
                  ]}>
                    {cat.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Se for espetinho, mostrar opção de criar variações */}
            {(categoria === 'espetinho-simples' || categoria === 'espetinho-especial') && (
              <TouchableOpacity
                style={styles.variacaoToggle}
                onPress={() => setCriarVariacoes(!criarVariacoes)}
              >
                <View style={styles.checkbox}>
                  {criarVariacoes && <Text style={styles.checkmark}>✓</Text>}
                </View>
                <Text style={styles.variacaoToggleText}>
                  Criar 4 variações (Simples, Arroz, Macaxeira, Completo)
                </Text>
              </TouchableOpacity>
            )}

            {/* Se criar variações estiver marcado, mostrar 4 campos de preço */}
            {criarVariacoes && (categoria === 'espetinho-simples' || categoria === 'espetinho-especial') ? (
              <>
                <Text style={styles.label}>Preços das variações:</Text>
                <View style={styles.variacoesGrid}>
                  <View style={styles.variacaoField}>
                    <Text style={styles.variacaoLabel}>Simples</Text>
                    <TextInput
                      style={styles.inputVariacao}
                      placeholder="12.00"
                      placeholderTextColor="#999"
                      value={precoSimples}
                      onChangeText={setPrecoSimples}
                      keyboardType="numeric"
                    />
                  </View>

                  <View style={styles.variacaoField}>
                    <Text style={styles.variacaoLabel}>com Arroz</Text>
                    <TextInput
                      style={styles.inputVariacao}
                      placeholder="20.00"
                      placeholderTextColor="#999"
                      value={precoArroz}
                      onChangeText={setPrecoArroz}
                      keyboardType="numeric"
                    />
                  </View>

                  <View style={styles.variacaoField}>
                    <Text style={styles.variacaoLabel}>com Macaxeira</Text>
                    <TextInput
                      style={styles.inputVariacao}
                      placeholder="20.00"
                      placeholderTextColor="#999"
                      value={precoMacaxeira}
                      onChangeText={setPrecoMacaxeira}
                      keyboardType="numeric"
                    />
                  </View>

                  <View style={styles.variacaoField}>
                    <Text style={styles.variacaoLabel}>Completo</Text>
                    <TextInput
                      style={styles.inputVariacao}
                      placeholder="24.00"
                      placeholderTextColor="#999"
                      value={precoCompleto}
                      onChangeText={setPrecoCompleto}
                      keyboardType="numeric"
                    />
                  </View>
                </View>
              </>
            ) : (
              <TextInput
                style={styles.input}
                placeholder="Preço (ex: 12.00)"
                placeholderTextColor="#999"
                value={preco}
                onChangeText={setPreco}
                keyboardType="numeric"
              />
            )}

            <TouchableOpacity
              style={[styles.cadastrarBtn, loading && styles.cadastrarBtnDisabled]}
              onPress={cadastrarProduto}
              disabled={loading}
            >
              <Text style={styles.cadastrarBtnText}>
                {loading ? 'Cadastrando...' : criarVariacoes ? 'CADASTRAR 4 VARIAÇÕES' : 'CADASTRAR PRODUTO'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* SEÇÃO 2: LISTAR PRODUTOS POR CATEGORIA */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📋 Produtos Cadastrados</Text>

          {/* Filtros de categoria */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filtros}>
            <TouchableOpacity
              style={[styles.filtroBtn, categoriaFiltro === 'todos' && styles.filtroBtnActive]}
              onPress={() => setCategoriaFiltro('todos')}
            >
              <Text style={[styles.filtroBtnText, categoriaFiltro === 'todos' && styles.filtroBtnTextActive]}>
                Todos
              </Text>
            </TouchableOpacity>

            {categorias.map(cat => (
              <TouchableOpacity
                key={cat.value}
                style={[styles.filtroBtn, categoriaFiltro === cat.value && styles.filtroBtnActive]}
                onPress={() => setCategoriaFiltro(cat.value)}
              >
                <Text style={[styles.filtroBtnText, categoriaFiltro === cat.value && styles.filtroBtnTextActive]}>
                  {cat.label}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {loadingProdutos ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#8B2F2F" />
              <Text style={styles.loadingText}>Carregando produtos...</Text>
            </View>
          ) : produtosFiltrados.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>Nenhum produto cadastrado</Text>
            </View>
          ) : (
            Object.keys(produtosAgrupados).map(nomeBase => {
              const variacoes = produtosAgrupados[nomeBase];
              const primeiraVariacao = variacoes[0];
              const todosAtivos = variacoes.every(v => v.active);

              return (
                <View key={nomeBase} style={styles.produtoCard}>
                  <View style={styles.produtoLeft}>
                    <View style={styles.produtoInfo}>
                      <Text style={styles.produtoNome}>{nomeBase}</Text>
                      <Text style={styles.produtoVariacoes}>
                        {variacoes.length} variação{variacoes.length > 1 ? 'ões' : ''}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.produtoActions}>
                    <TouchableOpacity
                      style={[styles.statusBtn, todosAtivos ? styles.statusBtnAtivo : styles.statusBtnInativo]}
                      onPress={() => {
                        // Toggle de todas as variações
                        variacoes.forEach(v => toggleAtivo(v));
                      }}
                    >
                      <Text style={styles.statusBtnText}>
                        {todosAtivos ? 'ATIVO' : 'DESATIVADO'}
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.editBtn}
                      onPress={() => abrirVariacoes(nomeBase)}
                    >
                      <Text style={styles.editBtnText}>Editar</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.deleteBtn}
                      onPress={() => excluirProduto(variacoes)}
                    >
                      <Text style={styles.deleteBtnText}>🗑️</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })
          )}
        </View>

      </ScrollView>

      {/* MODAL DE EDIÇÃO */}
      <Modal visible={showEditModal} animationType="slide" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>✏️ Editar Produto</Text>
              <TouchableOpacity onPress={() => setShowEditModal(false)}>
                <Text style={styles.modalClose}>✕</Text>
              </TouchableOpacity>
            </View>

            <TextInput
              style={styles.input}
              placeholder="Nome do produto"
              placeholderTextColor="#999"
              value={editNome}
              onChangeText={setEditNome}
            />

            <TextInput
              style={styles.input}
              placeholder="Preço"
              placeholderTextColor="#999"
              value={editPreco}
              onChangeText={setEditPreco}
              keyboardType="numeric"
            />

            <Text style={styles.label}>Categoria:</Text>
            <View style={styles.categoriaButtons}>
              {categorias.map(cat => (
                <TouchableOpacity
                  key={cat.value}
                  style={[
                    styles.categoriaBtn,
                    editCategoria === cat.value && styles.categoriaBtnActive
                  ]}
                  onPress={() => setEditCategoria(cat.value)}
                >
                  <Text style={[
                    styles.categoriaBtnText,
                    editCategoria === cat.value && styles.categoriaBtnTextActive
                  ]}>
                    {cat.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity
              style={[styles.salvarBtn, loading && styles.salvarBtnDisabled]}
              onPress={salvarEdicao}
              disabled={loading}
            >
              <Text style={styles.salvarBtnText}>
                {loading ? 'Salvando...' : 'SALVAR ALTERAÇÕES'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* MODAL DE VARIAÇÕES */}
      <Modal visible={showVariacoesModal} animationType="slide" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>✏️ Editar Variações</Text>
              <TouchableOpacity onPress={() => setShowVariacoesModal(false)}>
                <Text style={styles.modalClose}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.variacoesLista}>
              {variacoesSelecionadas.map(variacao => (
                <VariacaoItem
                  key={variacao.id}
                  variacao={variacao}
                  onSalvar={salvarVariacao}
                  onToggleStatus={toggleAtivo}
                />
              ))}
            </ScrollView>

            <TouchableOpacity
              style={styles.fecharBtn}
              onPress={() => setShowVariacoesModal(false)}
            >
              <Text style={styles.fecharBtnText}>FECHAR</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F1E8',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  quickActions: {
    gap: 10,
    marginBottom: 20,
  },
  section: {
    marginBottom: 30,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#8B2F2F',
    marginBottom: 15,
  },
  form: {
    backgroundColor: '#FFFFFF',
    borderRadius: 15,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 3,
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
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    marginBottom: 8,
    marginTop: 8,
  },
  categoriaButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 15,
  },
  categoriaBtn: {
    backgroundColor: '#F5F1E8',
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#E5B84A',
  },
  categoriaBtnActive: {
    backgroundColor: '#E5B84A',
    borderColor: '#8B2F2F',
  },
  categoriaBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  categoriaBtnTextActive: {
    color: '#2C2C2C',
  },
  variacaoToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    marginBottom: 15,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#8B2F2F',
    marginRight: 10,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  checkmark: {
    fontSize: 16,
    fontWeight: '700',
    color: '#8B2F2F',
  },
  variacaoToggleText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2C2C2C',
  },
  variacoesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 15,
  },
  variacaoField: {
    flex: 1,
    minWidth: '45%',
  },
  variacaoLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#8B2F2F',
    marginBottom: 5,
  },
  inputVariacao: {
    backgroundColor: '#F5F1E8',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#2C2C2C',
    borderWidth: 1,
    borderColor: '#E5B84A',
    textAlign: 'center',
  },
  cadastrarBtn: {
    backgroundColor: '#8B2F2F',
    padding: 15,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 10,
    shadowColor: '#8B2F2F',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 15,
    elevation: 5,
  },
  cadastrarBtnDisabled: {
    opacity: 0.5,
  },
  cadastrarBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 1,
  },
  popularBtn: {
    backgroundColor: '#28A745',
    padding: 15,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 30,
    shadowColor: '#28A745',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 5,
  },
  popularBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  filtros: {
    flexDirection: 'row',
    marginBottom: 15,
  },
  filtroBtn: {
    backgroundColor: '#FFFFFF',
    paddingVertical: 8,
    paddingHorizontal: 15,
    borderRadius: 20,
    marginRight: 10,
    borderWidth: 2,
    borderColor: '#E5B84A',
  },
  filtroBtnActive: {
    backgroundColor: '#E5B84A',
    borderColor: '#8B2F2F',
  },
  filtroBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  filtroBtnTextActive: {
    color: '#2C2C2C',
  },
  loadingContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 15,
    padding: 40,
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 15,
    fontSize: 14,
    color: '#999',
  },
  emptyContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 15,
    padding: 40,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: '#999',
  },
  produtoCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 15,
    padding: 15,
    marginBottom: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 3,
  },
  produtoLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  produtoIcon: {
    fontSize: 32,
    marginRight: 12,
  },
  produtoInfo: {
    flex: 1,
  },
  produtoNome: {
    fontSize: 16,
    fontWeight: '700',
    color: '#2C2C2C',
    marginBottom: 4,
  },
  produtoPreco: {
    fontSize: 18,
    fontWeight: '700',
    color: '#8B2F2F',
    marginBottom: 2,
  },
  produtoCategoria: {
    fontSize: 12,
    color: '#999',
    fontStyle: 'italic',
  },
  produtoActions: {
    flexDirection: 'row',
    gap: 10,
    justifyContent: 'flex-end',
  },
  statusBtn: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    minWidth: 100,
    alignItems: 'center',
  },
  statusBtnAtivo: {
    backgroundColor: '#7ED321',
  },
  statusBtnInativo: {
    backgroundColor: '#DC3545',
  },
  statusBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  editBtn: {
    backgroundColor: '#E5B84A',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    minWidth: 100,
    alignItems: 'center',
  },
  editBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#2C2C2C',
  },
  addPadroesBtn: {
    backgroundColor: '#8B2F2F',
    borderRadius: 15,
    padding: 20,
    alignItems: 'center',
    shadowColor: '#8B2F2F',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 15,
    elevation: 5,
  },
  addPadroesBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 5,
    letterSpacing: 0.5,
  },
  addPadroesSubtext: {
    color: '#E5B84A',
    fontSize: 12,
    fontWeight: '600',
  },
  migrarBtn: {
    backgroundColor: '#FF8C00',
    borderRadius: 15,
    padding: 20,
    alignItems: 'center',
    shadowColor: '#FF8C00',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 15,
    elevation: 5,
  },
  migrarBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 5,
    letterSpacing: 0.5,
  },
  migrarSubtext: {
    color: '#FFE4B5',
    fontSize: 12,
    fontWeight: '600',
  },
  limparBtn: {
    backgroundColor: '#DC3545',
    borderRadius: 15,
    padding: 20,
    alignItems: 'center',
    shadowColor: '#DC3545',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 15,
    elevation: 5,
  },
  limparBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 5,
    letterSpacing: 0.5,
  },
  limparSubtext: {
    color: '#FFB3BA',
    fontSize: 12,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    width: '100%',
    maxWidth: 400,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#8B2F2F',
  },
  modalClose: {
    fontSize: 28,
    color: '#999',
  },
  salvarBtn: {
    backgroundColor: '#8B2F2F',
    padding: 15,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 10,
  },
  salvarBtnDisabled: {
    opacity: 0.5,
  },
  salvarBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  produtoVariacoes: {
    fontSize: 12,
    color: '#999',
    marginTop: 2,
  },
  variacoesLista: {
    maxHeight: 400,
  },
  variacaoItem: {
    backgroundColor: '#F5F1E8',
    borderRadius: 12,
    padding: 15,
    marginBottom: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  variacaoInfo: {
    flex: 1,
    marginRight: 10,
  },
  variacaoNome: {
    fontSize: 15,
    fontWeight: '600',
    color: '#2C2C2C',
    marginBottom: 8,
  },
  variacaoPrecoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  variacaoLabelLarge: {
    fontSize: 16,
    fontWeight: '600',
    color: '#8B2F2F',
  },
  variacaoPrecoInput: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 8,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#E5B84A',
    minWidth: 80,
    textAlign: 'center',
  },
  variacaoSalvarBtn: {
    backgroundColor: '#7ED321',
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  variacaoSalvarText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
  },
  variacaoStatusBtn: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 6,
    minWidth: 70,
    alignItems: 'center',
  },
  variacaoStatusAtivo: {
    backgroundColor: '#7ED321',
  },
  variacaoStatusInativo: {
    backgroundColor: '#DC3545',
  },
  variacaoStatusText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  fecharBtn: {
    backgroundColor: '#999',
    padding: 15,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 15,
  },
  fecharBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
});
