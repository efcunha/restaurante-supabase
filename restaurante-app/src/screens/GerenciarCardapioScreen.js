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
import { Ionicons } from '@expo/vector-icons';
import { doc, getDoc, getDocs, setDoc, updateDoc, writeBatch, addDoc } from 'firebase/firestore';
import { db } from '../config/firebaseConfig';
import { useAuth } from '../context/AuthContext';
import { getCompanyCollection, getCompanyDoc } from '../utils/firestoreUtils';
import BackgroundPattern from '../components/BackgroundPattern';
import { SUPPORTED_UNITS } from '../utils/unitConversion';

// Componente para cada item de variação
function VariacaoItem({ variacao, onSalvar }) {
  const [precoTemp, setPrecoTemp] = useState(variacao.price !== undefined ? variacao.price.toString() : '0');
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
          <Text style={styles.variacaoLabelLarge}>R$</Text>
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

export default function GerenciarCardapioScreen({ onClose }) {
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
  const [temperosCaldos, setTemperosCaldos] = useState([]);
  const [temperosComidas, setTemperosComidas] = useState([]);
  const [tipoTemperoAtivo, setTipoTemperoAtivo] = useState('caldos'); // 'caldos' | 'comidas' | 'variacoes'
  const [novoTempero, setNovoTempero] = useState('');
  const [editTemperoIndex, setEditTemperoIndex] = useState(-1);
  const [loadingTemperos, setLoadingTemperos] = useState(true);

  // Estados para Pizza
  const [pizzaConfig, setPizzaConfig] = useState({ sizes: [] });
  const [pizzaSizes, setPizzaSizes] = useState([]); // Local state for editing sizes
  const [novoTamanho, setNovoTamanho] = useState('');
  const [novosSaboresMax, setNovosSaboresMax] = useState('');
  const [editTamanhoIndex, setEditTamanhoIndex] = useState(-1); // TRACK EDIT INDEX
  const [precosPizza, setPrecosPizza] = useState({}); // { 'Fatia': '5.00', 'Grande': '40.00' }
  const [ingredientesPizza, setIngredientesPizza] = useState([]); // from config
  const [ingredientesSelecionados, setIngredientesSelecionados] = useState([]); // for current product
  const [ingredientesPersonalizados, setIngredientesPersonalizados] = useState(''); // text field

  // Estados para Ficha Técnica (Estoque)
  const [showStockModal, setShowStockModal] = useState(false);
  const [currentProductForStock, setCurrentProductForStock] = useState(null);
  const [stockItems, setStockItems] = useState([]);
  const [loadingStock, setLoadingStock] = useState(false);
  // Form Ficha Técnica
  const [selectedStockId, setSelectedStockId] = useState('');
  const [qtyIngredient, setQtyIngredient] = useState('');
  const [unitIngredient, setUnitIngredient] = useState('ml');
  const [tipoUnidade, setTipoUnidade] = useState('VOLUME'); // Default to VOLUME for recipes usually

  const unidadesUI = (SUPPORTED_UNITS[tipoUnidade] || []);

  const categorias = [
    { value: 'caldo', label: '🍲 Caldos' },
    { value: 'espetinho-simples', label: '🔥 Espetinho Simples' },
    { value: 'espetinho-especial', label: '🌟 Espetinho Especial' },
    { value: 'porcao', label: '🍟 Porção' },
    { value: 'bebida', label: '🥤 Bebida' },

    { value: 'comida', label: '🍽️ Comida' },
    { value: 'pizza', label: '🍕 Pizza' },
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
        if (data.temperosCaldos) setTemperosCaldos(data.temperosCaldos);
        if (data.temperosComidas) setTemperosComidas(data.temperosComidas);
        if (data.variacoesEspetinho) setVariacoesEspetinho(data.variacoesEspetinho);
        if (data.ingredientesPizza) setIngredientesPizza(data.ingredientesPizza);

        if (data.temperosCaldos) setTemperosCaldos(data.temperosCaldos);
        if (data.temperosComidas) setTemperosComidas(data.temperosComidas);
        if (data.variacoesEspetinho) setVariacoesEspetinho(data.variacoesEspetinho);

        // Carregar configuração de Pizza (ou usar padrão)
        if (data.pizzaConfig) {
          setPizzaConfig(data.pizzaConfig);
        } else {
          // Default config if none exists
          setPizzaConfig({
            sizes: [
              { name: 'Fatia', maxFlavors: 1 },
              { name: 'Broto', maxFlavors: 1 },
              { name: 'Média', maxFlavors: 2 },
              { name: 'Grande', maxFlavors: 4 }
            ],
            pricingMode: 'HIGHER'
          });
        }

        // Sync local sizes state
        if (data.pizzaConfig?.sizes) {
          setPizzaSizes(data.pizzaConfig.sizes);
        } else {
          // Default sync
          setPizzaSizes([
            { name: 'Fatia', maxFlavors: 1 },
            { name: 'Broto', maxFlavors: 1 },
            { name: 'Média', maxFlavors: 2 },
            { name: 'Grande', maxFlavors: 4 }
          ]);
        }

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
    if (tipoTemperoAtivo === 'pizza') return ingredientesPizza || [];
    return variacoesEspetinho || [];
  };

  const salvarListas = async (novaListaCaldos, novaListaComidas, novaListaVariacoes, novaListaPizzas) => {
    const docRef = doc(db, 'companies', user.companyId, 'settings', 'cardapio_config');
    await setDoc(docRef, {
      temperosCaldos: novaListaCaldos !== undefined ? novaListaCaldos : temperosCaldos,
      temperosComidas: novaListaComidas !== undefined ? novaListaComidas : temperosComidas,
      variacoesEspetinho: novaListaVariacoes !== undefined ? novaListaVariacoes : variacoesEspetinho,
      ingredientesPizza: novaListaPizzas !== undefined ? novaListaPizzas : ingredientesPizza,
      pizzaConfig: { ...pizzaConfig, sizes: pizzaSizes } // Save updated sizes
    }, { merge: true });
  };

  const salvarPizzaSizes = async (novosTamanhos) => {
    const docRef = doc(db, 'companies', user.companyId, 'settings', 'cardapio_config');
    const newConfig = { ...pizzaConfig, sizes: novosTamanhos };
    setPizzaConfig(newConfig);
    await setDoc(docRef, { pizzaConfig: newConfig }, { merge: true });
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
        await salvarListas(undefined, novos, undefined, undefined);
      } else if (tipoTemperoAtivo === 'pizza') {
        setIngredientesPizza(novos);
        await salvarListas(undefined, undefined, undefined, novos);
      } else {
        setVariacoesEspetinho(novos);
        await salvarListas(undefined, undefined, novos, undefined);
      }

      setNovoTempero('');
      setEditTemperoIndex(-1);
    } catch (e) {
      console.error('Erro ao salvar tempero:', e);
      Alert.alert('Erro', 'Falha ao salvar item.');
    }
  };

  const adicionarTamanhoPizza = async () => {
    if (!novoTamanho.trim() || !novosSaboresMax) {
      Alert.alert('Erro', 'Preencha nome e quantidades de sabores.');
      return;
    }
    const max = parseInt(novosSaboresMax);
    if (isNaN(max) || max < 1) {
      Alert.alert('Erro', 'Quantidade de sabores inválida.');
      return;
    }

    const novos = [...pizzaSizes];
    if (editTamanhoIndex >= 0) {
      // UPDATE EXISTING (maintain active status)
      novos[editTamanhoIndex] = { ...novos[editTamanhoIndex], name: novoTamanho.trim(), maxFlavors: max };
    } else {
      // ADD NEW (default active)
      novos.push({ name: novoTamanho.trim(), maxFlavors: max, active: true });
    }

    setPizzaSizes(novos);
    await salvarPizzaSizes(novos);
    setNovoTamanho('');
    setNovosSaboresMax('');
    setEditTamanhoIndex(-1);
  };

  const iniciarEdicaoTamanho = (index) => {
    const item = pizzaSizes[index];
    setNovoTamanho(item.name);
    setNovosSaboresMax(item.maxFlavors.toString());
    setEditTamanhoIndex(index);
  };

  const cancelarEdicaoTamanho = () => {
    setNovoTamanho('');
    setNovosSaboresMax('');
    setEditTamanhoIndex(-1);
  };

  const removerTamanhoPizza = async (index) => {
    const novos = [...pizzaSizes];
    novos.splice(index, 1);
    setPizzaSizes(novos);
    await salvarPizzaSizes(novos);
  };

  const toggleTamanhoAtivo = async (index) => {
    const novos = [...pizzaSizes];
    // Toggle logic: if active is undefined, assume it was true, so now false.
    const currentStatus = novos[index].active !== false;
    novos[index].active = !currentStatus;
    setPizzaSizes(novos);
    await salvarPizzaSizes(novos);
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
        await salvarListas(undefined, novos, undefined, undefined);
      } else if (tipoTemperoAtivo === 'pizza') {
        setIngredientesPizza(novos);
        await salvarListas(undefined, undefined, undefined, novos);
      } else {
        setVariacoesEspetinho(novos);
        await salvarListas(undefined, undefined, novos, undefined);
      }
    } catch (e) {
      Alert.alert('Erro', 'Falha ao remover item.');
    }
  };

  const carregarProdutos = async () => {
    try {
      setLoadingProdutos(true);
      if (!user?.companyId) {
        console.warn('⚠️ Usuário sem empresa vinculada');
        setLoadingProdutos(false);
        return;
      }

      const snapshot = await getDocs(getCompanyCollection(user.companyId, 'cardapio'));
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
      const algumVazio = variacoesEspetinho.some(v => !precosVariacoes[v]);
      if (algumVazio) {
        window.alert('Preencha todos os preços das variações');
        return;
      }

      try {
        setLoading(true);
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
        window.alert(`✅ Sucesso! ${nome} cadastrado com ${variacoes.length} variações!`);
        setNome('');
        setPrecosVariacoes({});
        carregarProdutos();
      } catch (error) {
        console.error('❌ Erro ao cadastrar variações:', error);
        window.alert('Erro ao cadastrar as variações');
      } finally {
        setLoading(false);
      }
    } else if (categoria === 'pizza') {
      // Validação Pizza
      const sizes = pizzaConfig?.sizes || [];
      const pricesToSave = {};
      let hasPrice = false;

      sizes.forEach(size => {
        const p = precosPizza[size.name];
        if (p) {
          const sanitized = p.toString().replace(',', '.');
          pricesToSave[size.name] = parseFloat(sanitized) || 0;
          hasPrice = true;
        }
      });

      if (!hasPrice) {
        window.alert('Preencha pelo menos um preço para a pizza');
        return;
      }

      try {
        setLoading(true);
        const novoProduto = {
          name: nome.trim(),
          category: 'pizza',
          active: true,
          createdAt: Date.now(),
          prices: pricesToSave, // Save map of prices
          ingredients: ingredientesSelecionados,
          customIngredients: ingredientesPersonalizados
        };

        await addDoc(getCompanyCollection(user.companyId, 'cardapio'), novoProduto);

        // Also ensure config is saved if it was default
        const configRef = doc(db, 'companies', user.companyId, 'settings', 'cardapio_config');
        await setDoc(configRef, { pizzaConfig }, { merge: true });

        window.alert('✅ Pizza cadastrada com sucesso!');
        setNome('');
        setPrecosPizza({});
        setIngredientesSelecionados([]);
        setIngredientesPersonalizados('');
        carregarProdutos();
      } catch (error) {
        console.error('❌ Erro ao cadastrar pizza:', error);
        window.alert('Erro ao cadastrar a pizza');
      } finally {
        setLoading(false);
      }

    } else {
      if (!preco || isNaN(parseFloat(preco.toString().replace(',', '.')))) {
        window.alert('Digite um preço válido');
        return;
      }

      try {
        setLoading(true);
        const novoProduto = {
          name: nome.trim(),
          price: parseFloat(preco.toString().replace(',', '.')) || 0,
          category: categoria,
          active: true,
          createdAt: Date.now()
        };

        await addDoc(getCompanyCollection(user.companyId, 'cardapio'), novoProduto);
        window.alert('✅ Produto cadastrado com sucesso!');
        setNome('');
        setPreco('');
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
    setEditPreco(produto.price ? produto.price.toString() : '0');
    setEditCategoria(produto.category);

    // Load pizza prices if applicable
    if (produto.category === 'pizza') {
      setPrecosPizza(produto.prices || {});
    } else {
      setPrecosPizza({});
    }

    setShowEditModal(true);
  };

  const salvarEdicao = async () => {
    if (!editNome.trim()) {
      Alert.alert('Atenção', 'Digite o nome do produto');
      return;
    }

    const sanitizedPreco = editPreco?.toString().replace(',', '.');
    if (!editPreco || isNaN(parseFloat(sanitizedPreco))) {
      Alert.alert('Atenção', 'Digite um preço válido');
      return;
    }

    try {
      setLoading(true);
      const produtoRef = getCompanyDoc(user.companyId, 'cardapio', editando.id);
      const updateData = {
        name: editNome.trim(),
        category: editCategoria
      };

      if (editCategoria === 'pizza') {
        // Garantir que todos os valores no mapa de preços sejam números (parseFloat)
        const pricesAsNumbers = {};
        Object.keys(precosPizza).forEach(key => {
          const val = precosPizza[key];
          if (val !== undefined && val !== '') {
            const sanitized = val.toString().replace(',', '.');
            pricesAsNumbers[key] = parseFloat(sanitized) || 0;
          }
        });
        updateData.prices = pricesAsNumbers;
        // Optionally clear single price to keep data clean
        updateData.price = 0;
      } else {
        updateData.price = parseFloat(sanitizedPreco);
      }

      await updateDoc(produtoRef, updateData);

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
      const produtoRef = getCompanyDoc(user.companyId, 'cardapio', produto.id);
      await updateDoc(produtoRef, {
        active: !produto.active
      });
      carregarProdutos();
    } catch (error) {
      console.error('❌ Erro ao atualizar status:', error);
      Alert.alert('Erro', 'Não foi possível atualizar o status do produto');
    }
  };

  // --- LÓGICA DE FICHA TÉCNICA (ESTOQUE) ---
  const fetchStockItems = async () => {
    try {
      setLoadingStock(true);
      const snapshot = await getDocs(getCompanyCollection(user.companyId, 'estoque'));
      const items = snapshot.docs.map(doc => ({
        id: doc.id,
        nome: doc.data().nome,
        unidadeOriginal: doc.data().unidade
      })).sort((a, b) => a.nome.localeCompare(b.nome));
      setStockItems(items);
    } catch (error) {
      console.error('Erro ao buscar estoque:', error);
    } finally {
      setLoadingStock(false);
    }
  };

  const abrirEstoque = (produto) => {
    setCurrentProductForStock(produto);
    setShowStockModal(true);
    if (stockItems.length === 0) {
      fetchStockItems();
    }
  };

  const addIngredient = async () => {
    if (!selectedStockId || !qtyIngredient || isNaN(qtyIngredient)) {
      Alert.alert('Erro', 'Selecione um item e uma quantidade válida.');
      return;
    }

    // Buscar nome do item selecionado
    const selectedItem = stockItems.find(s => s.id === selectedStockId);
    if (!selectedItem) return;

    // Atualizar lista de inventoryItems do produto
    try {
      const currentIngredients = currentProductForStock.inventoryItems || [];
      const newIngredient = {
        id: selectedStockId,
        nome: selectedItem.nome,
        qt: parseFloat(qtyIngredient),
        un: unitIngredient
      };

      // Substituir se já existe
      const newIngredients = [
        ...currentIngredients.filter(i => i.id !== selectedStockId),
        newIngredient
      ];

      const produtoRef = getCompanyDoc(user.companyId, 'cardapio', currentProductForStock.id);
      await updateDoc(produtoRef, {
        inventoryItems: newIngredients
      });

      // Atualizar estado local
      setCurrentProductForStock({
        ...currentProductForStock,
        inventoryItems: newIngredients
      });

      // Atualizar lista principal
      const updatedProdutos = produtos.map(p =>
        p.id === currentProductForStock.id ? { ...p, inventoryItems: newIngredients } : p
      );
      setProdutos(updatedProdutos);

      // Reset fields
      setQtyIngredient('');
      // Manter unidade ou resetar? Resetar pra ml é seguro.
    } catch (error) {
      console.error('Erro ao adicionar ingrediente:', error);
      Alert.alert('Erro', 'Falha ao salvar ficha técnica.');
    }
  };

  const removeIngredient = async (ingredientId) => {
    try {
      const newIngredients = (currentProductForStock.inventoryItems || []).filter(i => i.id !== ingredientId);

      const produtoRef = getCompanyDoc(user.companyId, 'cardapio', currentProductForStock.id);
      await updateDoc(produtoRef, {
        inventoryItems: newIngredients
      });

      setCurrentProductForStock({
        ...currentProductForStock,
        inventoryItems: newIngredients
      });

      const updatedProdutos = produtos.map(p =>
        p.id === currentProductForStock.id ? { ...p, inventoryItems: newIngredients } : p
      );
      setProdutos(updatedProdutos);

    } catch (error) {
      console.error('Erro ao remover ingrediente:', error);
    }
  };

  // --- FIM LÓGICA FICHA TÉCNICA ---

  const getNomeBase = (nomeProduto) => {
    let nome = nomeProduto;
    variacoesEspetinho.forEach(v => {
      nome = nome.replace(` ${v}`, '');
    });
    return nome.trim();
  };

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

  const abrirVariacoes = (nomeBase) => {
    const variacoes = produtosAgrupados[nomeBase] || [];

    // Se for apenas uma variação ou se for pizza, abre o editor principal (que é mais completo para pizzas)
    if (variacoes.length === 1 || (variacoes.length > 0 && variacoes[0].category === 'pizza')) {
      abrirEdicao(variacoes[0]);
    } else {
      setVariacoesSelecionadas(variacoes);
      setShowVariacoesModal(true);
    }
  };

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

      carregarProdutos();

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

  const excluirProduto = async (variacoes) => {
    const nomeBase = getNomeBase(variacoes[0].name);

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

      {/* Header Padronizado */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          {onClose && (
            <TouchableOpacity onPress={onClose} style={styles.backButton}>
              <Ionicons name="arrow-back" size={24} color="#FFF" />
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.headerCenter}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Ionicons name="restaurant-outline" size={24} color="#FFF" />
            <Text style={styles.headerTitle}>Gerenciar Cardápio</Text>
          </View>
        </View>

        <View style={styles.headerRight} />
      </View>
      <ScrollView style={styles.content} contentContainerStyle={{ paddingBottom: 100 }}>


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

            ) : categoria === 'pizza' ? (
              <>
                <Text style={styles.label}>Preços por tamanho:</Text>
                <View style={styles.variacoesGrid}>
                  {pizzaConfig?.sizes?.map((size, idx) => (
                    <View key={idx} style={styles.variacaoField}>
                      <Text style={styles.variacaoLabel}>{size.name} ({size.maxFlavors} sab)</Text>
                      <TextInput
                        style={styles.inputVariacao}
                        placeholder="0.00"
                        placeholderTextColor="#999"
                        value={precosPizza[size.name] || ''}
                        onChangeText={(text) => setPrecosPizza(prev => ({ ...prev, [size.name]: text }))}
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
        </View >

        {/* SEÇÃO EXTRA: GERENCIAR TEMPEROS */}
        < View style={styles.section} >
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
                <Text style={{ fontWeight: 'bold', color: tipoTemperoAtivo === 'comidas' ? '#8B0000' : '#666' }}>🍽️ Para Comida</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={{ flex: 1, paddingVertical: 8, alignItems: 'center', borderRadius: 6, backgroundColor: tipoTemperoAtivo === 'pizza' ? '#fff' : 'transparent', elevation: tipoTemperoAtivo === 'pizza' ? 2 : 0 }}
                onPress={() => { setTipoTemperoAtivo('pizza'); setEditTemperoIndex(-1); setNovoTempero(''); }}
              >
                <Text style={{ fontWeight: 'bold', color: tipoTemperoAtivo === 'pizza' ? '#8B0000' : '#666' }}>🍕 Ingredientes</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={{ flex: 1, paddingVertical: 8, alignItems: 'center', borderRadius: 6, backgroundColor: tipoTemperoAtivo === 'variacoes' ? '#fff' : 'transparent', elevation: tipoTemperoAtivo === 'variacoes' ? 2 : 0 }}
                onPress={() => { setTipoTemperoAtivo('variacoes'); setEditTemperoIndex(-1); setNovoTempero(''); }}
              >
                <Text style={{ fontWeight: 'bold', color: tipoTemperoAtivo === 'variacoes' ? '#8B0000' : '#666' }}>🔥 Variações Espet.</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={{ flex: 1, paddingVertical: 8, alignItems: 'center', borderRadius: 6, backgroundColor: tipoTemperoAtivo === 'tamanhos' ? '#fff' : 'transparent', elevation: tipoTemperoAtivo === 'tamanhos' ? 2 : 0 }}
                onPress={() => { setTipoTemperoAtivo('tamanhos'); }}
              >
                <Text style={{ fontWeight: 'bold', color: tipoTemperoAtivo === 'tamanhos' ? '#8B0000' : '#666' }}>🍕 Tamanhos</Text>
              </TouchableOpacity>
            </View>

            {/* TAB: TAMANHOS DE PIZZA */}
            {tipoTemperoAtivo === 'tamanhos' ? (
              <View>
                <View style={{ flexDirection: 'row', gap: 10, marginBottom: 15 }}>
                  <TextInput
                    style={[styles.input, { flex: 2, marginBottom: 0 }]}
                    placeholder="Nome (ex: Gigante)"
                    value={novoTamanho}
                    onChangeText={setNovoTamanho}
                  />
                  <TextInput
                    style={[styles.input, { flex: 1, marginBottom: 0 }]}
                    placeholder="Max Sabores"
                    value={novosSaboresMax}
                    onChangeText={setNovosSaboresMax}
                    keyboardType="numeric"
                  />
                  <TouchableOpacity style={styles.addBtn} onPress={adicionarTamanhoPizza}>
                    <Ionicons name={editTamanhoIndex >= 0 ? "checkmark" : "add"} size={24} color="#fff" />
                  </TouchableOpacity>
                  {editTamanhoIndex >= 0 && (
                    <TouchableOpacity style={[styles.addBtn, { backgroundColor: '#999' }]} onPress={cancelarEdicaoTamanho}>
                      <Ionicons name="close" size={24} color="#fff" />
                    </TouchableOpacity>
                  )}
                </View>

                {/* LISTING SIZES WITH SORTING */}
                {pizzaSizes.map((size, index) => ({ ...size, originalIndex: index }))
                  .sort((a, b) => {
                    const order = ['Fatia', 'Broto', 'Média', 'Grande'];
                    const idxA = order.indexOf(a.name);
                    const idxB = order.indexOf(b.name);
                    // Known items first, then others alphabetically
                    if (idxA !== -1 && idxB !== -1) return idxA - idxB;
                    if (idxA !== -1) return -1;
                    if (idxB !== -1) return 1;
                    return a.name.localeCompare(b.name);
                  })
                  .map((size, idx) => (
                    <View key={idx} style={[styles.temperoRow, size.active === false && { opacity: 0.5, backgroundColor: '#f0f0f0' }]}>
                      <Text style={styles.temperoText}>
                        {size.name} ({size.maxFlavors} sabores) {size.active === false ? '(Desativado)' : ''}
                      </Text>
                      <View style={{ flexDirection: 'row', gap: 10 }}>
                        <TouchableOpacity onPress={() => toggleTamanhoAtivo(size.originalIndex)}>
                          <Ionicons name={size.active !== false ? "eye" : "eye-off"} size={20} color={size.active !== false ? "#2e7d32" : "#999"} />
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => iniciarEdicaoTamanho(size.originalIndex)}>
                          <Ionicons name="pencil" size={20} color="#444" />
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => removerTamanhoPizza(size.originalIndex)}>
                          <Ionicons name="trash-outline" size={20} color="#FF4444" />
                        </TouchableOpacity>
                      </View>
                    </View>
                  ))}
              </View>
            ) : (
              /* EXISTING LOGIC FOR OTHERS */
              <View>
                <View style={styles.addTemperoRow}>
                  <TextInput
                    style={styles.inputTempero}
                    placeholder={editTemperoIndex >= 0 ? "Editar item..." : "Novo item..."}
                    value={novoTempero}
                    onChangeText={setNovoTempero}
                  />
                  <TouchableOpacity style={styles.addBtn} onPress={adicionarTempero}>
                    <Ionicons name={editTemperoIndex >= 0 ? "checkmark" : "add"} size={24} color="#fff" />
                  </TouchableOpacity>
                  {editTemperoIndex >= 0 && (
                    <TouchableOpacity style={[styles.addBtn, { backgroundColor: '#999' }]} onPress={cancelarEdicaoTempero}>
                      <Ionicons name="close" size={24} color="#fff" />
                    </TouchableOpacity>
                  )}
                </View>

                {loadingTemperos ? <ActivityIndicator color="#8B0000" /> : (
                  <View style={styles.listaTemperos}>
                    {getListaAtiva().map((item, index) => (
                      <View key={index} style={styles.temperoRow}>
                        <Text style={styles.temperoText}>{item}</Text>
                        <View style={{ flexDirection: 'row', gap: 10 }}>
                          <TouchableOpacity onPress={() => iniciarEdicaoTempero(index)}>
                            <Ionicons name="pencil" size={20} color="#444" />
                          </TouchableOpacity>
                          <TouchableOpacity onPress={() => removerTempero(index)}>
                            <Ionicons name="trash-outline" size={20} color="#FF4444" />
                          </TouchableOpacity>
                        </View>
                      </View>
                    ))}
                  </View>
                )}
              </View>
            )}
          </View>
        </View >

        {/* SEÇÃO 2: LISTAR PRODUTOS POR CATEGORIA */}
        < View style={styles.section} >
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

          {
            loadingProdutos ? (
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
                          variacoes.forEach(v => toggleAtivo(v));
                        }}
                      >
                        <Text style={styles.statusBtnText}>
                          {todosAtivos ? 'ATIVO' : 'DESATIVADO'}
                        </Text>
                      </TouchableOpacity>

                      {/* BOTÃO MÁGICO: FICHA TÉCNICA */}
                      <TouchableOpacity
                        style={styles.stockBtn}
                        onPress={() => abrirEstoque(primeiraVariacao)}
                      >
                        <Text style={styles.stockBtnText}>Ficha Técnica</Text>
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
            )
          }
        </View >

      </ScrollView >

      {/* MODAL DE EDIÇÃO (Produto Único) */}
      < Modal visible={showEditModal} animationType="slide" transparent={true} >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { maxHeight: '90%' }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>✏️ Editar Produto</Text>
              <TouchableOpacity onPress={() => setShowEditModal(false)}>
                <Text style={styles.modalClose}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.label}>Nome:</Text>
              <TextInput
                style={styles.input}
                placeholder="Nome do produto"
                placeholderTextColor="#999"
                value={editNome}
                onChangeText={setEditNome}
              />

              {editCategoria === 'pizza' ? (
                <>
                  <Text style={styles.label}>Preços por tamanho:</Text>
                  <View style={styles.variacoesGrid}>
                    {pizzaConfig?.sizes?.map((size, idx) => (
                      <View key={idx} style={styles.variacaoField}>
                        <Text style={styles.variacaoLabel}>{size.name} ({size.maxFlavors} sab)</Text>
                        <TextInput
                          style={styles.inputVariacao}
                          placeholder="0.00"
                          placeholderTextColor="#999"
                          value={precosPizza[size.name] || ''}
                          onChangeText={(text) => setPrecosPizza(prev => ({ ...prev, [size.name]: text }))}
                          keyboardType="numeric"
                        />
                      </View>
                    ))}
                  </View>
                </>
              ) : (
                <>
                  <Text style={styles.label}>Preço:</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Preço"
                    placeholderTextColor="#999"
                    value={editPreco}
                    onChangeText={setEditPreco}
                    keyboardType="numeric"
                  />
                </>
              )}

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

              {/* Link para Ficha Técnica direto na edição */}
              <TouchableOpacity
                style={styles.stockLinkBtn}
                onPress={() => { setShowEditModal(false); abrirEstoque(editando); }}
              >
                <Text style={styles.stockLinkText}>📦 Configurar Ficha Técnica / Estoque</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.salvarBtn, loading && styles.salvarBtnDisabled, { marginTop: 10 }]}
                onPress={salvarEdicao}
                disabled={loading}
              >
                <Text style={styles.salvarBtnText}>
                  {loading ? 'Salvando...' : 'SALVAR ALTERAÇÕES'}
                </Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal >

      {/* MODAL DE VARIAÇÕES (Espetinhos) */}
      < Modal visible={showVariacoesModal} animationType="slide" transparent={true} >
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
                <View key={variacao.id}>
                  <VariacaoItem
                    variacao={variacao}
                    onSalvar={salvarVariacao}
                  />
                  {/* Botão para estoque específico da variação */}
                  <TouchableOpacity
                    style={styles.miniStockBtn}
                    onPress={() => { setShowVariacoesModal(false); abrirEstoque(variacao); }}
                  >
                    <Text style={styles.miniStockText}>📦 Ficha Técnica ({variacao.inventoryItems?.length || 0} itens)</Text>
                  </TouchableOpacity>
                </View>
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
      </Modal >

      {/* MODAL FICHA TÉCNICA (ESTOQUE) */}
      < Modal visible={showStockModal} animationType="slide" transparent={true} >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>📦 Ficha Técnica</Text>
              <TouchableOpacity onPress={() => setShowStockModal(false)}>
                <Text style={styles.modalClose}>✕</Text>
              </TouchableOpacity>
            </View>

            <Text style={{ marginBottom: 15, fontSize: 16 }}>
              Produto: <Text style={{ fontWeight: 'bold' }}>{currentProductForStock?.name}</Text>
            </Text>

            <Text style={styles.label}>Adicionar Ingrediente do Estoque:</Text>

            {/* Seleção de Item (Dropdown simples ou scroll horizontal) */}
            <ScrollView style={{ maxHeight: 150, marginBottom: 10, borderWidth: 1, borderColor: '#eee', borderRadius: 8 }}>
              {stockItems.map(item => (
                <TouchableOpacity
                  key={item.id}
                  style={{ padding: 10, backgroundColor: selectedStockId === item.id ? '#FFE4B5' : '#fff', borderBottomWidth: 1, borderColor: '#eee' }}
                  onPress={() => setSelectedStockId(item.id)}
                >
                  <Text>{item.nome} ({item.unidadeOriginal})</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            {stockItems.length === 0 && <Text style={{ color: '#999', fontStyle: 'italic', marginBottom: 10 }}>Nenhum item no estoque.</Text>}

            <View style={{ flexDirection: 'row', gap: 10 }}>
              <TextInput
                style={[styles.input, { flex: 0.4 }]}
                placeholder="Qtd (Receita)"
                cursorColor='#8B2F2F'
                value={qtyIngredient}
                onChangeText={setQtyIngredient}
                keyboardType="numeric"
              />
              <View style={{ flex: 0.6 }}>
                {/* TABS TIPO UNIDADE */}
                <View style={[styles.unitTabs, { marginBottom: 5 }]}>
                  <TouchableOpacity onPress={() => setTipoUnidade('QUANTITY')} style={[styles.unitTab, tipoUnidade === 'QUANTITY' && styles.unitTabActive]}>
                    <Text style={[styles.unitTabText, tipoUnidade === 'QUANTITY' && styles.unitTabTextActive]}>Unid.</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => setTipoUnidade('VOLUME')} style={[styles.unitTab, tipoUnidade === 'VOLUME' && styles.unitTabActive]}>
                    <Text style={[styles.unitTabText, tipoUnidade === 'VOLUME' && styles.unitTabTextActive]}>Vol.</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => setTipoUnidade('MASS')} style={[styles.unitTab, tipoUnidade === 'MASS' && styles.unitTabActive]}>
                    <Text style={[styles.unitTabText, tipoUnidade === 'MASS' && styles.unitTabTextActive]}>Peso</Text>
                  </TouchableOpacity>
                </View>

                {/* LISTA FILTRADA */}
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  {unidadesUI.map(u => (
                    <TouchableOpacity
                      key={u}
                      style={{
                        paddingVertical: 8,
                        paddingHorizontal: 12,
                        backgroundColor: unitIngredient === u ? '#8B2F2F' : '#eee',
                        borderRadius: 8,
                        marginRight: 5,
                        justifyContent: 'center',
                        minWidth: 40,
                        alignItems: 'center'
                      }}
                      onPress={() => setUnitIngredient(u)}
                    >
                      <Text style={{ color: unitIngredient === u ? '#fff' : '#333', fontWeight: 'bold', fontSize: 13 }}>{u}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            </View>

            <TouchableOpacity style={styles.salvarBtn} onPress={addIngredient}>
              <Text style={styles.salvarBtnText}>+ Adicionar Ingrediente</Text>
            </TouchableOpacity>

            <Text style={[styles.label, { marginTop: 20 }]}>Ingredientes Vinculados:</Text>
            <ScrollView style={{ maxHeight: 200 }}>
              {(currentProductForStock?.inventoryItems || []).length === 0 ? (
                <Text style={{ fontStyle: 'italic', color: '#999' }}>Nenhum ingrediente vinculado.</Text>
              ) : (
                (currentProductForStock?.inventoryItems || []).map((ing, idx) => (
                  <View key={idx} style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 10, borderBottomWidth: 1, borderColor: '#eee' }}>
                    <Text style={{ flex: 1 }}>{ing.nome} - {ing.qt} {ing.un}</Text>
                    <TouchableOpacity onPress={() => removeIngredient(ing.id)}>
                      <Text style={{ color: 'red' }}>🗑️</Text>
                    </TouchableOpacity>
                  </View>
                ))
              )}
            </ScrollView>

          </View>
        </View>
      </Modal >

    </View >
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    zIndex: 10,
    elevation: 8,
  },
  headerLeft: {
    width: 40,
    alignItems: 'flex-start',
    justifyContent: 'center',
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerRight: {
    width: 40,
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  backButton: {
    padding: 5,
  },
  headerTitle: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  content: {
    flex: 1,
    padding: 20,
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
    borderRadius: 12,
    padding: 14,
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
    marginBottom: 5,
  },
  addTemperoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  addBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#8B2F2F',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 10,
    elevation: 2,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.2, shadowRadius: 2
  },
  inputTempero: {
    flex: 1,
    backgroundColor: '#F5F1E8',
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#E5B84A',
  },
  listaTemperos: {
    marginTop: 10,
  },
  temperoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#fff',
    paddingVertical: 12,
    paddingHorizontal: 15,
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#eee',
    elevation: 1,
  },
  temperoText: {
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
    flex: 1,
    marginRight: 10,
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
  produtoInfo: {
    flex: 1,
  },
  produtoNome: {
    fontSize: 16,
    fontWeight: '700',
    color: '#2C2C2C',
    marginBottom: 4,
  },
  produtoVariacoes: {
    fontSize: 12,
    color: '#999',
    marginTop: 2,
  },
  produtoActions: {
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'flex-end',
    flexWrap: 'wrap',
    maxWidth: '50%',
  },
  statusBtn: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    width: 130,
    alignItems: 'center',
    justifyContent: 'center',
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
    width: 130,
    alignItems: 'center',
    justifyContent: 'center',
  },
  editBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#2C2C2C',
  },
  stockBtn: {
    backgroundColor: '#D2691E',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    width: 130,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stockBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  stockLinkBtn: {
    backgroundColor: '#333',
    padding: 10,
    borderRadius: 10,
    alignItems: 'center',
    marginVertical: 10,
  },
  stockLinkText: {
    color: '#FFF',
    fontWeight: 'bold',
  },
  miniStockBtn: {
    backgroundColor: '#eee',
    padding: 8,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 10
  },
  miniStockText: { color: '#333', fontSize: 12 },
  deleteBtn: {
    backgroundColor: '#DC3545',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    width: 130,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
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
  variacoesLista: {
    maxHeight: 400,
  },
  variacaoItem: {
    backgroundColor: '#F5F1E8',
    borderRadius: 12,
    padding: 8,
    marginBottom: 12,
  },
  variacaoInfo: {
    marginRight: 10,
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
  // Unit Tabs Styles
  unitTabs: {
    flexDirection: 'row',
    backgroundColor: '#F5F1E8',
    borderRadius: 8,
    padding: 2
  },
  unitTab: {
    flex: 1,
    paddingVertical: 4,
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
});
