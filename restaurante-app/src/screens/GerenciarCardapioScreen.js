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
  Modal,
  Platform
} from 'react-native';
import { collection, getDocs, addDoc, updateDoc, doc, getDoc, setDoc, writeBatch, deleteDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../config/firebaseConfig';
import { useAuth } from '../context/AuthContext';
import { getCompanyCollection, getCompanyDoc } from '../utils/firestoreUtils';
import BackgroundPattern from '../components/BackgroundPattern';

// Componente para cada item de variação
// Componente para cada item de variação
function VariacaoItem({ variacao, onSalvar }) {
  const [precoTemp, setPrecoTemp] = useState(variacao.price.toString());
  const [nomeTemp, setNomeTemp] = useState(variacao.name);

  return (
    <View style={styles.variacaoItem}>
      <View style={styles.variacaoInfo}>

        {/* Campo para editar o nome da variação */}
        <TextInput
          style={styles.variacaoNomeInput}
          value={nomeTemp}
          onChangeText={setNomeTemp}
          placeholder="Nome do item"
        />

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
            onPress={() => onSalvar(variacao, precoTemp, nomeTemp)}
          >
            <Text style={styles.variacaoSalvarText}>Salvar</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

export default function GerenciarCardapioScreen() {
  const { user } = useAuth();
  // Estados para cadastro
  const [nome, setNome] = useState('');
  const [preco, setPreco] = useState('');
  const [categoria, setCategoria] = useState('caldo');
  const [loading, setLoading] = useState(false);

  // Estados para cadastro com variações (espetinhos)
  const [criarVariacoes, setCriarVariacoes] = useState(false);
  const [precosVariacoes, setPrecosVariacoes] = useState({});
  const [variacoesEspetinho, setVariacoesEspetinho] = useState(['Simples', 'com Arroz', 'com Macaxeira', 'Completo']);

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

  // Estados para Temperos/Opções
  // Estados para Temperos/Opções
  const [temperosCaldos, setTemperosCaldos] = useState(['Cebolinha e Coentro', 'Cebolinha', 'Sem Nada']);
  const [temperosComidas, setTemperosComidas] = useState(['Cebolinha e Coentro', 'Cebolinha', 'Sem Nada']);
  const [tipoTemperoAtivo, setTipoTemperoAtivo] = useState('caldos'); // 'caldos' | 'comidas' | 'variacoes'
  const [novoTempero, setNovoTempero] = useState('');
  const [editTemperoIndex, setEditTemperoIndex] = useState(-1);
  const [loadingTemperos, setLoadingTemperos] = useState(true);

  const categorias = [
    { value: 'caldo', label: '🍲 Caldos' },
    { value: 'espetinho-simples', label: '🔥 Espetinho Simples' },
    { value: 'espetinho-especial', label: '🌟 Espetinho Especial' },
    { value: 'porcao', label: '🍟 Porção' },
    { value: 'bebida', label: '🥤 Bebida' },
    { value: 'comida', label: '🍽️ Comida' },
    { value: 'outro', label: '📦 Outro' }
  ];

  useEffect(() => {
    carregarProdutos();
    carregarConfig();
  }, []);

  const carregarConfig = async () => {
    if (!user?.companyId) return;
    try {
      setLoadingTemperos(true);
      const docRef = doc(db, 'companies', user.companyId, 'settings', 'cardapio_config');
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        const data = docSnap.data();
        if (data.temperosCaldos) setTemperosCaldos(data.temperosCaldos);
        if (data.temperosComidas) setTemperosComidas(data.temperosComidas);
        if (data.variacoesEspetinho) setVariacoesEspetinho(data.variacoesEspetinho);

        // Legacy fallback
        if (!data.temperosCaldos && !data.temperosComidas && data.temperos) {
          setTemperosCaldos(data.temperos);
          setTemperosComidas(data.temperos);
        }
      }
    } catch (e) {
      console.error('Erro ao carregar configurações:', e);
    } finally {
      setLoadingTemperos(false);
    }
  };

  const getListaAtiva = () => {
    if (tipoTemperoAtivo === 'caldos') return temperosCaldos || [];
    if (tipoTemperoAtivo === 'comidas') return temperosComidas || [];
    return variacoesEspetinho || [];
  };

  const salvarListas = async (novaListaCaldos, novaListaComidas, novaListaVariacoes) => {
    const docRef = doc(db, 'companies', user.companyId, 'settings', 'cardapio_config');
    await setDoc(docRef, {
      temperosCaldos: novaListaCaldos !== undefined ? novaListaCaldos : temperosCaldos,
      temperosComidas: novaListaComidas !== undefined ? novaListaComidas : temperosComidas,
      variacoesEspetinho: novaListaVariacoes !== undefined ? novaListaVariacoes : variacoesEspetinho
    }, { merge: true });
  };

  const adicionarTempero = async () => {
    if (!novoTempero.trim()) return;
    const listaAtual = getListaAtiva();

    if (editTemperoIndex === -1 && listaAtual.includes(novoTempero.trim())) {
      Alert.alert('Erro', 'Este item já existe nesta lista.');
      return;
    }

    try {
      let novos = [...listaAtual];
      if (editTemperoIndex >= 0) {
        novos[editTemperoIndex] = novoTempero.trim();
      } else {
        novos.push(novoTempero.trim());
      }

      if (tipoTemperoAtivo === 'caldos') {
        setTemperosCaldos(novos);
        await salvarListas(novos, undefined, undefined);
      } else if (tipoTemperoAtivo === 'comidas') {
        setTemperosComidas(novos);
        await salvarListas(undefined, novos, undefined);
      } else {
        setVariacoesEspetinho(novos);
        await salvarListas(undefined, undefined, novos);
      }

      setNovoTempero('');
      setEditTemperoIndex(-1);
    } catch (e) {
      console.error('Erro ao salvar tempero:', e);
      Alert.alert('Erro', 'Falha ao salvar item.');
    }
  };

  const iniciarEdicaoTempero = (idx) => {
    const lista = getListaAtiva();
    setNovoTempero(lista[idx]);
    setEditTemperoIndex(idx);
  };

  const cancelarEdicaoTempero = () => {
    setNovoTempero('');
    setEditTemperoIndex(-1);
  };

  const removerTempero = async (index) => {
    try {
      const novos = [...getListaAtiva()];
      novos.splice(index, 1);

      if (tipoTemperoAtivo === 'caldos') {
        setTemperosCaldos(novos);
        await salvarListas(novos, undefined, undefined);
      } else if (tipoTemperoAtivo === 'comidas') {
        setTemperosComidas(novos);
        await salvarListas(undefined, novos, undefined);
      } else {
        setVariacoesEspetinho(novos);
        await salvarListas(undefined, undefined, novos);
      }
    } catch (e) {
      Alert.alert('Erro', 'Falha ao remover item.');
    }
  };

  const carregarProdutos = async () => {
    try {
      setLoadingProdutos(true);
      // console.log('📦 Carregando produtos do Firestore...');

      if (!user?.companyId) {
        console.warn('⚠️ Usuário sem empresa vinculada');
        setLoadingProdutos(false);
        return;
      }

      const snapshot = await getDocs(getCompanyCollection(user.companyId, 'cardapio'));
      // console.log(`📦 ${snapshot.size} produtos encontrados`);

      const produtosData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      // Ordenar por categoria (simples, especial, bebida, comida, outro) e depois por nome
      const ordemCategorias = {
        'espetinho-simples': 1,
        'espetinho-especial': 2,
        'caldo': 3,
        'porcao': 4,
        'bebida': 5,
        'comida': 6,
        'outro': 7
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
      // Verificar se algum preço está vazio para as variações ativas
      const algumVazio = variacoesEspetinho.some(v => !precosVariacoes[v]);
      if (algumVazio) {
        window.alert('Preencha todos os preços das variações');
        return;
      }

      try {
        setLoading(true);
        // console.log('➕ Cadastrando produto com variações:', nome);

        const variacoes = variacoesEspetinho.map(v => ({
          nome: `${nome.trim()} ${v}`,
          preco: parseFloat(precosVariacoes[v])
        }));

        const batch = writeBatch(db);

        variacoes.forEach(variacao => {
          const novoDoc = getCompanyDoc(user.companyId, 'cardapio');
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

        window.alert(`✅ Sucesso! ${nome} cadastrado com ${variacoes.length} variações!`);

        // Limpar campos
        setNome('');
        setPrecosVariacoes({});

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

        await addDoc(getCompanyCollection(user.companyId, 'cardapio'), novoProduto);
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

      const produtoRef = getCompanyDoc(user.companyId, 'cardapio', editando.id);
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

      const produtoRef = getCompanyDoc(user.companyId, 'cardapio', produto.id);
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

      const snapshot = await getDocs(getCompanyCollection(user.companyId, 'cardapio'));
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

          await updateDoc(getCompanyDoc(user.companyId, 'cardapio', docSnap.id), {
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

      const snapshot = await getDocs(getCompanyCollection(user.companyId, 'cardapio'));
      const variacoes = variacoesEspetinho;

      let countDeletados = 0;

      for (const docSnap of snapshot.docs) {
        const produto = docSnap.data();
        const nome = produto.name || '';
        const categoria = produto.category;

        // Verificar se é espetinho sem variação especificada
        if (categoria === 'espetinho' || categoria === 'espetinho-simples' || categoria === 'espetinho-especial') {
          const temVariacao = variacoes.some(v => nome.includes(v));

          if (!temVariacao) {
            await deleteDoc(getCompanyDoc(user.companyId, 'cardapio', docSnap.id));
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
    let nome = nomeProduto;
    variacoesEspetinho.forEach(v => {
      nome = nome.replace(` ${v}`, '');
    });
    return nome.trim();
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
  const salvarVariacao = async (produto, novoPreco, novoNome) => {
    try {
      const precoNum = parseFloat(novoPreco);
      if (isNaN(precoNum) || precoNum <= 0) {
        window.alert('Digite um preço válido');
        return;
      }

      if (!novoNome || !novoNome.trim()) {
        window.alert('Nome inválido');
        return;
      }

      await updateDoc(getCompanyDoc(user.companyId, 'cardapio', produto.id), {
        price: precoNum,
        name: novoNome.trim()
      });

      // console.log(`✅ Produto ${produto.name} atualizado`);
      carregarProdutos();

      // Atualizar a lista de variações no modal
      const variacoesAtualizadas = variacoesSelecionadas.map(v =>
        v.id === produto.id ? { ...v, price: precoNum, name: novoNome.trim() } : v
      );
      setVariacoesSelecionadas(variacoesAtualizadas);
      window.alert('Alterações salvas!');
    } catch (error) {
      console.error('❌ Erro ao atualizar:', error);
      window.alert('Erro ao atualizar o item');
    }
  };

  const produtosFiltrados = categoriaFiltro === 'todos'
    ? produtos
    : produtos.filter(p => p.category === categoriaFiltro);

  const produtosAgrupados = agruparProdutos(produtosFiltrados);

  const getCategoriaIcon = (cat) => {
    switch (cat) {
      case 'espetinho': return '';
      case 'caldo': return '';
      case 'porcao': return '';
      case 'bebida': return '';
      case 'comida': return '';
      default: return '';
    }
  };

  const getCategoriaLabel = (cat) => {
    switch (cat) {
      case 'espetinho-simples': return 'Espetinho Simples';
      case 'espetinho-especial': return 'Espetinho Especial';
      case 'caldo': return 'Caldo';
      case 'porcao': return 'Porção';
      case 'bebida': return 'Bebida';
      case 'comida': return 'Comida';
      default: return 'Outro';
    }
  };

  const excluirProduto = async (variacoes) => {
    const nomeBase = getNomeBase(variacoes[0].name);

    // Check compatibility with web and mobile for confirm
    let confirmed = false;
    if (Platform.OS === 'web') {
      confirmed = window.confirm(`Tem certeza que deseja excluir "${nomeBase}" e todas as suas variações?`);
    } else {
      await new Promise((resolve) => {
        Alert.alert(
          'Confirmar Exclusão',
          `Tem certeza que deseja excluir "${nomeBase}"?`,
          [
            { text: 'Cancelar', onPress: () => resolve(false), style: 'cancel' },
            { text: 'Excluir', onPress: () => resolve(true), style: 'destructive' },
          ]
        );
      }).then(res => confirmed = res);
    }

    if (!confirmed) return;

    try {
      setLoading(true);
      const batch = writeBatch(db);

      variacoes.forEach(v => {
        batch.delete(getCompanyDoc(user.companyId, 'cardapio', v.id));
      });

      await batch.commit();
      // console.log('✅ Produto excluído');

      if (Platform.OS !== 'web') {
        Alert.alert('Sucesso', 'Produto excluído com sucesso');
      }

      carregarProdutos();
    } catch (error) {
      console.error('❌ Erro ao excluir:', error);
      Alert.alert('Erro', 'Não foi possível excluir o produto');
    } finally {
      setLoading(false);
    }
  };


  return (
    <View style={styles.container}>
      <BackgroundPattern />

      <ScrollView style={styles.content} contentContainerStyle={{ paddingBottom: 100 }}>
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
                  Criar variações automáticas ({variacoesEspetinho.join(', ')})
                </Text>
              </TouchableOpacity>
            )}

            {/* Se criar variações estiver marcado, mostrar campos de preço dinâmicos */}
            {criarVariacoes && (categoria === 'espetinho-simples' || categoria === 'espetinho-especial') ? (
              <>
                <Text style={styles.label}>Preços das variações:</Text>
                <View style={styles.variacoesGrid}>
                  {variacoesEspetinho.map((variacao, idx) => (
                    <View key={idx} style={styles.variacaoField}>
                      <Text style={styles.variacaoLabel}>{variacao}</Text>
                      <TextInput
                        style={styles.inputVariacao}
                        placeholder="0.00"
                        placeholderTextColor="#999"
                        value={precosVariacoes[variacao] || ''}
                        onChangeText={(text) => setPrecosVariacoes(prev => ({ ...prev, [variacao]: text }))}
                        keyboardType="numeric"
                      />
                    </View>
                  ))}
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

        {/* SEÇÃO EXTRA: GERENCIAR TEMPEROS */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🌿 Gerenciar Opções (Temperos)</Text>
          <View style={styles.form}>
            {/* Tabs Selector */}
            <View style={{ flexDirection: 'row', marginBottom: 15, backgroundColor: '#eee', borderRadius: 8, padding: 4 }}>
              <TouchableOpacity
                style={{ flex: 1, paddingVertical: 8, alignItems: 'center', borderRadius: 6, backgroundColor: tipoTemperoAtivo === 'caldos' ? '#fff' : 'transparent', elevation: tipoTemperoAtivo === 'caldos' ? 2 : 0 }}
                onPress={() => { setTipoTemperoAtivo('caldos'); setEditTemperoIndex(-1); setNovoTempero(''); }}
              >
                <Text style={{ fontWeight: 'bold', color: tipoTemperoAtivo === 'caldos' ? '#8B0000' : '#666' }}>🍲 Para Caldos</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={{ flex: 1, paddingVertical: 8, alignItems: 'center', borderRadius: 6, backgroundColor: tipoTemperoAtivo === 'comidas' ? '#fff' : 'transparent', elevation: tipoTemperoAtivo === 'comidas' ? 2 : 0 }}
                onPress={() => { setTipoTemperoAtivo('comidas'); setEditTemperoIndex(-1); setNovoTempero(''); }}
              >
                <Text style={{ fontWeight: 'bold', color: tipoTemperoAtivo === 'comidas' ? '#8B0000' : '#666' }}>🍽️ Para Comidas</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={{ flex: 1, paddingVertical: 8, alignItems: 'center', borderRadius: 6, backgroundColor: tipoTemperoAtivo === 'variacoes' ? '#fff' : 'transparent', elevation: tipoTemperoAtivo === 'variacoes' ? 2 : 0 }}
                onPress={() => { setTipoTemperoAtivo('variacoes'); setEditTemperoIndex(-1); setNovoTempero(''); }}
              >
                <Text style={{ fontWeight: 'bold', color: tipoTemperoAtivo === 'variacoes' ? '#8B0000' : '#666' }}>🍢 Variações</Text>
              </TouchableOpacity>
            </View>

            <View style={{ flexDirection: 'row', gap: 10 }}>
              <TextInput
                style={[styles.input, { flex: 1, marginBottom: 0 }]}
                placeholder={editTemperoIndex >= 0 ? "Editando opção..." : `Novo item para ${tipoTemperoAtivo === 'caldos' ? 'Caldos' : tipoTemperoAtivo === 'comidas' ? 'Comidas' : 'Variações'}`}
                value={novoTempero}
                onChangeText={setNovoTempero}
              />
              {editTemperoIndex >= 0 && (
                <TouchableOpacity style={[styles.cadastrarBtn, { marginTop: 0, paddingHorizontal: 15, backgroundColor: '#6c757d' }]} onPress={cancelarEdicaoTempero}>
                  <Text style={styles.cadastrarBtnText}>✕</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity style={[styles.cadastrarBtn, { marginTop: 0, paddingHorizontal: 20 }]} onPress={adicionarTempero}>
                <Text style={styles.cadastrarBtnText}>{editTemperoIndex >= 0 ? 'Salvar' : '+'}</Text>
              </TouchableOpacity>
            </View>

            <Text style={{ fontSize: 12, color: '#999', marginTop: 5, marginBottom: 10 }}>
              {tipoTemperoAtivo === 'variacoes'
                ? 'Estes sufixos serão usados para gerar os itens automaticamente (ex: "com Baião").'
                : `Estes itens aparecerão nas opções de ${tipoTemperoAtivo === 'caldos' ? 'Caldos' : 'Comidas'} no Novo Pedido.`}
            </Text>

            {loadingTemperos ? <ActivityIndicator size="small" color="#8B2F2F" /> : (
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                {getListaAtiva().map((t, idx) => (
                  <View key={idx} style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: editTemperoIndex === idx ? '#FFF3CD' : '#F5F1E8', paddingVertical: 6, paddingHorizontal: 12, borderRadius: 20, gap: 8, borderWidth: 1, borderColor: editTemperoIndex === idx ? '#FFC107' : '#E5B84A' }}>
                    <Text style={{ fontWeight: '600', color: '#555', fontSize: 13 }}>{t}</Text>
                    <View style={{ flexDirection: 'row', gap: 8 }}>
                      <TouchableOpacity onPress={() => iniciarEdicaoTempero(idx)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                        <Text style={{ fontSize: 14 }}>✏️</Text>
                      </TouchableOpacity>
                      <TouchableOpacity onPress={() => removerTempero(idx)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                        <Text style={{ color: '#DC3545', fontWeight: 'bold', fontSize: 14 }}>✕</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                ))}
              </View>
            )}
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
                        {variacoes.length === 1
                          ? `R$ ${Number(primeiraVariacao.price).toFixed(2)}`
                          : `${variacoes.length} variações`
                        }
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
                      <Text style={styles.deleteBtnText}>Excluir</Text>
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
    gap: 8,
    justifyContent: 'flex-end',
    flexWrap: 'wrap', // Allow wrapping if screen is narrow
    maxWidth: '50%',  // Limit width so it doesn't crush the name too much
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
  variacaoNomeInput: {
    fontSize: 15,
    fontWeight: '600',
    color: '#2C2C2C',
    marginBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#ccc',
    paddingVertical: 4,
    minWidth: 150,
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
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 10,
  },
  variacaoSalvarText: {
    color: '#FFFFFF',
    fontSize: 14,
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
  deleteBtn: {
    backgroundColor: '#DC3545',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    minWidth: 100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
