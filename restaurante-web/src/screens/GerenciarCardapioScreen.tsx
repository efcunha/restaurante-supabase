import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Alert, ActivityIndicator, Platform, TouchableOpacity, ScrollView, TextInput, Modal } from 'react-native';
// @ts-ignore
import KeyboardWrapper from '../components/KeyboardWrapper';
import { useResponsive } from '../hooks/useResponsive';
// import { doc, getDoc, getDocs, setDoc, updateDoc, writeBatch, addDoc } from 'firebase/firestore'; // Removed Firebase
// import { db } from '../config/firebaseConfig'; // Removed Firebase
import { supabase } from '../config/SupabaseConfig';
import { useAuth } from '../context/AuthContext';
// import { getCompanyCollection, getCompanyDoc } from '../utils/firestoreUtils'; // Removed Firebase
import { Product, PizzaConfig, PizzaSize } from '../types';
import { Ionicons } from '@expo/vector-icons';
// @ts-ignore
 // Fix missing import if needed, assuming component exists
import { SUPPORTED_UNITS } from '../utils/unitConversion';

// Componente para cada item de variação
interface VariacaoItemProps {
  variacao: Product;
  onSalvar: (produto: Product, novoPreco: string, novoNome: string) => void;
  onEditarCompleto: (produto: Product) => void;
}

function VariacaoItem({ variacao, onSalvar, onEditarCompleto }: VariacaoItemProps) {
  const [precoTemp, setPrecoTemp] = useState(variacao.price !== undefined ? variacao.price.toString() : '0');
  const [nomeTemp, setNomeTemp] = useState(variacao.name);

  return (
    <View style={styles.variacaoItem}>
      <View style={styles.variacaoInfo}>
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

          <TouchableOpacity
            style={[styles.variacaoSalvarBtn, { backgroundColor: '#B45309', marginLeft: 8 }]}
            onPress={() => onEditarCompleto(variacao)}
          >
            <Text style={[styles.variacaoSalvarText, { color: '#000' }]}>✏️</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

interface GerenciarCardapioScreenProps {
  onClose?: () => void;
}

export default function GerenciarCardapioScreen({ onClose }: GerenciarCardapioScreenProps) {
  const { user } = useAuth();
  const { isTablet, horizontalPadding, modalWidth, modalMaxWidth, inputMaxWidth } = useResponsive();

  // Estados para cadastro
  const [nome, setNome] = useState('');
  const [preco, setPreco] = useState('');
  const [categoria, setCategoria] = useState('caldo');
  const [subcategoria, setSubcategoria] = useState<string>(''); // For pizza categories
  const [loading, setLoading] = useState(false);

  // Estados para cadastro com variações (espetinhos)
  const [criarVariacoes, setCriarVariacoes] = useState(false);
  const [precosVariacoes, setPrecosVariacoes] = useState<Record<string, string>>({});
  const [variacoesEspetinho, setVariacoesEspetinho] = useState<string[]>(['Simples', 'com Arroz', 'com Macaxeira', 'Completo']);

  // Estados para listagem
  const [produtos, setProdutos] = useState<Product[]>([]);
  const [loadingProdutos, setLoadingProdutos] = useState(true);
  const [categoriaFiltro, setCategoriaFiltro] = useState('todos');

  // Estados para edição
  const [editando, setEditando] = useState<Product | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editNome, setEditNome] = useState('');
  const [editPreco, setEditPreco] = useState('');
  const [editCategoria, setEditCategoria] = useState('');

  // Estados para edição de grupo de variações
  const [showVariacoesModal, setShowVariacoesModal] = useState(false);
  const [variacoesSelecionadas, setVariacoesSelecionadas] = useState<Product[]>([]);

  // Estados para Temperos/Opções
  const [temperosCaldos, setTemperosCaldos] = useState<string[]>([]);
  const [temperosComidas, setTemperosComidas] = useState<string[]>([]);
  const [tipoTemperoAtivo, setTipoTemperoAtivo] = useState<'caldos' | 'comidas' | 'variacoes' | 'pizza' | 'tamanhos'>('caldos');
  const [novoTempero, setNovoTempero] = useState('');
  const [editTemperoIndex, setEditTemperoIndex] = useState(-1);
  const [loadingTemperos, setLoadingTemperos] = useState(true);

  // Estados para Pizza
  const [pizzaConfig, setPizzaConfig] = useState<PizzaConfig>({ sizes: [] });
  const [pizzaSizes, setPizzaSizes] = useState<PizzaSize[]>([]); // Local state for editing sizes
  const [novoTamanho, setNovoTamanho] = useState('');
  const [novosSaboresMax, setNovosSaboresMax] = useState('');
  const [editTamanhoIndex, setEditTamanhoIndex] = useState(-1); // TRACK EDIT INDEX
  const [precosPizza, setPrecosPizza] = useState<Record<string, string | number>>({}); // { 'Fatia': '5.00', 'Grande': '40.00' }
  const [ingredientesPizza, setIngredientesPizza] = useState<string[]>([]); // from config
  const [ingredientesSelecionados, setIngredientesSelecionados] = useState<string[]>([]); // for current product
  const [ingredientesPersonalizados, setIngredientesPersonalizados] = useState(''); // text field
  const [novoIngrediente, setNovoIngrediente] = useState(''); // for adding new ingredient

  // Estados para Ficha Técnica (Estoque)
  const [showStockModal, setShowStockModal] = useState(false);
  const [currentProductForStock, setCurrentProductForStock] = useState<Product | null>(null);
  const [stockItems, setStockItems] = useState<{ id: string; nome: string; unidadeOriginal: string; }[]>([]);
  // Form Ficha Técnica
  const [selectedStockId, setSelectedStockId] = useState('');
  const [qtyIngredient, setQtyIngredient] = useState('');
  const [unitIngredient, setUnitIngredient] = useState('ml');
  const [tipoUnidade, setTipoUnidade] = useState('VOLUME'); // Default to VOLUME for recipes usually

  const unidadesUI = (SUPPORTED_UNITS[tipoUnidade] || []);

  // Helper function to detect pizza products
  const isPizzaProduct = (product: Product): boolean => {
    return product.category?.toLowerCase().includes('pizza') || false;
  };

  // Helper function to transform pizza prices Record into pseudo-Product variations
  const transformPizzaPricesToVariations = (product: Product): Product[] => {
    if (!product.prices || Object.keys(product.prices).length === 0) {
      return [];
    }

    // Use pizza sizes from database configuration (pizzaSizes state)
    const sizeOrder = pizzaSizes.map(s => s.name);

    // Sort sizes: standard order first, then alphabetically
    const sortedSizes = Object.keys(product.prices).sort((a, b) => {
      const indexA = sizeOrder.findIndex(s => a.toLowerCase().includes(s.toLowerCase()));
      const indexB = sizeOrder.findIndex(s => b.toLowerCase().includes(s.toLowerCase()));

      if (indexA !== -1 && indexB !== -1) return indexA - indexB;
      if (indexA !== -1) return -1;
      if (indexB !== -1) return 1;
      return a.localeCompare(b);
    });

    // Create pseudo-Product objects for each size
    return sortedSizes.map(sizeName => ({
      ...product,
      id: `${product.id}_${sizeName}`, // Unique ID for React key
      name: sizeName, // Display the size name instead of product name
      price: product.prices![sizeName],
      _isPizzaVariation: true, // Flag to identify this as a pizza variation
      _originalProductId: product.id, // Reference to original product
      _sizeName: sizeName // Store the size name for save operations
    } as any));
  };

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
  }, [user]); // Added dependency

  const carregarConfig = async () => {
    if (!user?.companyId) return;
    try {
      setLoadingTemperos(true);
      // Fetch settings from COMPANIES table (settings column)
      const { data, error } = await supabase
        .from('companies')
        .select('settings')
        .eq('id', user.companyId)
        .single();

      if (error) {
        console.warn('Erro ao carregar configurações (Supabase):', error);
      } else if (data && data.settings) {
        const settings = data.settings;
        if (settings.temperosCaldos) setTemperosCaldos(settings.temperosCaldos);
        if (settings.temperosComidas) setTemperosComidas(settings.temperosComidas);
        if (settings.variacoesEspetinho) setVariacoesEspetinho(settings.variacoesEspetinho);
        console.log('[GerenciarCardapio] Pizza ingredients from DB:', settings.ingredientesPizza);
        if (settings.ingredientesPizza && settings.ingredientesPizza.length > 0) {
          setIngredientesPizza(settings.ingredientesPizza);
        } else {
          // Default ingredients if DB is empty
          const defaultIngredients = ['Milho', 'Bacon', 'Ovo', 'Cebola', 'Azeitona', 'Tomate', 'Pimentão', 'Orégano', 'Mussarela', 'Catupiry', 'Presunto', 'Frango'];
          setIngredientesPizza(defaultIngredients);

          // OPTIONAL: Save defaults to DB immediately so it's not "hardcoded" next time
          // We can do this silently
          const newSettings = { ...settings, ingredientesPizza: defaultIngredients };
          supabase.from('companies').update({ settings: newSettings }).eq('id', user.companyId).then(({ error }) => {
            if (error) console.error('Error saving default ingredients:', error);
            else console.log('Default ingredients saved to DB');
          });
        }

        if (settings.pizzaConfig) {
          setPizzaConfig(settings.pizzaConfig);
          if (settings.pizzaConfig.sizes) setPizzaSizes(settings.pizzaConfig.sizes);
        } else {
          // Defaults if not found
          const defaultSizes = [
            { name: 'Fatia', maxFlavors: 1 },
            { name: 'Broto', maxFlavors: 1 },
            { name: 'Média', maxFlavors: 2 },
            { name: 'Grande/Família', maxFlavors: 4 }
          ];
          setPizzaConfig({ sizes: defaultSizes, pricingMode: 'HIGHER' });
          setPizzaSizes(defaultSizes);
        }
      } else {
        // Defaults if no settings found
        const defaultSizes = [
          { name: 'Fatia', maxFlavors: 1 },
          { name: 'Broto', maxFlavors: 1 },
          { name: 'Média', maxFlavors: 2 },
          { name: 'Grande/Família', maxFlavors: 4 }
        ];
        setPizzaConfig({ sizes: defaultSizes, pricingMode: 'HIGHER' });
        setPizzaSizes(defaultSizes);
      }
    } catch (e) {
      console.error('Erro ao carregar configurações:', e);
    } finally {
      setLoadingTemperos(false);
    }
  };

  const carregarProdutos = async () => {
    try {
      setLoadingProdutos(true);
      if (!user?.companyId) {
        setLoadingProdutos(false);
        return;
      }

      console.log('Fetching products from Supabase for Manage Menu...');

      // Optimized query: select only needed fields instead of SELECT *
      const { data, error } = await supabase
        .from('products')
        .select('id, name, price, category, subcategory, available, active, created_at, prices, ingredients, custom_ingredients, inventory_items')
        .eq('company_id', user.companyId)
        .order('category', { ascending: true })
        .order('name', { ascending: true });

      if (error) {
        throw error;
      }

      // Map snake_case database fields to camelCase app state
      const produtosData = (data || []).map((p: any) => ({
        id: p.id,
        name: p.name,
        price: Number(p.price),
        category: p.category,
        subcategory: p.subcategory || null,
        active: p.available !== undefined ? p.available : p.active, // Map available -> active
        createdAt: new Date(p.created_at).getTime(),
        prices: p.prices || {},
        ingredients: p.ingredients || [],
        customIngredients: p.custom_ingredients || '',
        inventoryItems: p.inventory_items || []
      })) as Product[];

      console.log(`[GerenciarCardapio] Fetched ${produtosData.length} products total.`);
      const inactiveCount = produtosData.filter(p => !p.active).length;
      console.log(`[GerenciarCardapio] Inactive products: ${inactiveCount}`);
      console.log(`[GerenciarCardapio] Categories found:`, [...new Set(produtosData.map(p => p.category))]);

      // Sorting is now done by database, no need to sort again
      setProdutos(produtosData);
    } catch (error) {
      console.error(error);
      Alert.alert('Erro', 'Não foi possível carregar os produtos');
    } finally {
      setLoadingProdutos(false);
    }
  };


  // Helper function to handle database errors, especially duplicate key violations
  const handleDatabaseError = (error: any, productName: string): string => {
    console.error('Database error:', error);

    // Check for unique constraint violation (PostgreSQL error code 23505)
    if (error.code === '23505' || error.message?.includes('unique_product_per_company')) {
      return `Já existe um produto "${productName}" nesta categoria. Escolha outro nome ou edite o produto existente.`;
    }

    // Generic error message
    return 'Erro ao salvar o produto. Tente novamente.';
  };

  const cadastrarProduto = async () => {
    if (!nome.trim()) {
      Alert.alert('Atenção', 'Digite o nome do produto');
      return;
    }

    if (!user?.companyId) return;

    if (criarVariacoes && (categoria === 'espetinho-simples' || categoria === 'espetinho-especial')) {
      const algumVazio = variacoesEspetinho.some(v => !precosVariacoes[v]);
      if (algumVazio) {
        Alert.alert('Atenção', 'Preencha todos os preços das variações');
        return;
      }

      try {
        setLoading(true);
        const variacoes = variacoesEspetinho.map(v => ({
          company_id: user.companyId,
          name: `${nome.trim()} ${v}`,
          price: parseFloat(precosVariacoes[v].replace(',', '.')) || 0,
          category: categoria,
          available: true // DB Column is available
        }));

        const { error } = await supabase.from('products').insert(variacoes);

        if (error) {
          const errorMsg = handleDatabaseError(error, nome.trim());
          Alert.alert('Erro', errorMsg);
          return;
        }

        Alert.alert('Sucesso', 'Cadastrado com sucesso!');
        setNome('');
        setPrecosVariacoes({});
        carregarProdutos();
      } catch (error) {
        const errorMsg = handleDatabaseError(error, nome.trim());
        Alert.alert('Erro', errorMsg);
      } finally {
        setLoading(false);
      }
    } else if (categoria === 'pizza') {
      const sizes = pizzaConfig?.sizes || [];
      const pricesToSave: Record<string, number> = {};
      let hasPrice = false;

      sizes.forEach(size => {
        const p = precosPizza[size.name];
        if (p) {
          const sanitized = p.toString().replace(',', '.');
          const val = parseFloat(sanitized);
          if (!isNaN(val)) {
            pricesToSave[size.name] = val;
            hasPrice = true;
          }
        }
      });

      if (!hasPrice) {
        Alert.alert('Atenção', 'Preencha pelo menos um preço para a pizza');
        return;
      }

      // Validate at least one ingredient
      if (ingredientesSelecionados.length === 0 && !ingredientesPersonalizados.trim()) {
        Alert.alert('Atenção', 'Adicione pelo menos um ingrediente para a pizza');
        return;
      }

      try {
        setLoading(true);
        const novoProduto = {
          company_id: user.companyId,
          name: nome.trim(),
          category: 'pizza',
          subcategory: subcategoria || null, // Add subcategory for pizza
          available: true, // DB Column is available
          price: 0, // Base price 0, uses prices JSON
          prices: pricesToSave,
          ingredients: ingredientesSelecionados, // array of strings
          custom_ingredients: ingredientesPersonalizados // string field in DB
        };

        const { error } = await supabase.from('products').insert(novoProduto);
        if (error) {
          const errorMsg = handleDatabaseError(error, nome.trim());
          Alert.alert('Erro', errorMsg);
          return;
        }

        Alert.alert('Sucesso', 'Pizza cadastrada!');
        setNome('');
        setSubcategoria(''); // Reset subcategory
        setPrecosPizza({});
        setIngredientesSelecionados([]);
        setIngredientesPersonalizados('');
        carregarProdutos();
      } catch (error) {
        const errorMsg = handleDatabaseError(error, nome.trim());
        Alert.alert('Erro', errorMsg);
      } finally {
        setLoading(false);
      }

    } else {
      if (!preco || isNaN(parseFloat(preco.toString().replace(',', '.')))) {
        Alert.alert('Atenção', 'Digite um preço válido');
        return;
      }

      try {
        setLoading(true);
        const novoProduto = {
          company_id: user.companyId,
          name: nome.trim(),
          price: parseFloat(preco.toString().replace(',', '.')) || 0,
          category: categoria,
          available: true // DB Column is available
        };

        const { error } = await supabase.from('products').insert(novoProduto);

        if (error) {
          const errorMsg = handleDatabaseError(error, nome.trim());
          Alert.alert('Erro', errorMsg);
          return;
        }

        Alert.alert('Sucesso', 'Produto cadastrado!');
        setNome('');
        setPreco('');
        carregarProdutos();
      } catch (error) {
        const errorMsg = handleDatabaseError(error, nome.trim());
        Alert.alert('Erro', errorMsg);
      } finally {
        setLoading(false);
      }
    }
  };

  // HELPERS FOR LISTS
  const getListaAtiva = () => {
    if (tipoTemperoAtivo === 'caldos') return temperosCaldos || [];
    if (tipoTemperoAtivo === 'comidas') return temperosComidas || [];
    if (tipoTemperoAtivo === 'pizza') return ingredientesPizza || [];
    return variacoesEspetinho || [];
  };

  const salvarListas = async (
    novaListaCaldos?: string[],
    novaListaComidas?: string[],
    novaListaVariacoes?: string[],
    novaListaPizzas?: string[]
  ) => {
    if (!user?.companyId) return;

    // Construct new settings object merge
    const updates: any = {};
    if (novaListaCaldos !== undefined) updates.temperosCaldos = novaListaCaldos;
    if (novaListaComidas !== undefined) updates.temperosComidas = novaListaComidas;
    if (novaListaVariacoes !== undefined) updates.variacoesEspetinho = novaListaVariacoes;
    if (novaListaPizzas !== undefined) updates.ingredientesPizza = novaListaPizzas;

    // Always include pizzaConfig to persist size changes if any
    updates.pizzaConfig = { ...pizzaConfig, sizes: pizzaSizes };

    // We need to fetch current settings first to merge deeply? Supabase UPDATE replaces the column content for JSONB unless we use a function.
    // Actually, simple UPDATE on a JSONB column replaces the whole value or needs specific syntax.
    // Safer to read-modify-write for JSONB columns if we don't use 'jsonb_set'.
    // Or we can just read what we have in state (which should be current) + updates.

    // Let's assume the state variables (temperosCaldos etc) are up to date.

    const newSettings = {
      temperosCaldos: novaListaCaldos !== undefined ? novaListaCaldos : temperosCaldos,
      temperosComidas: novaListaComidas !== undefined ? novaListaComidas : temperosComidas,
      variacoesEspetinho: novaListaVariacoes !== undefined ? novaListaVariacoes : variacoesEspetinho,
      ingredientesPizza: novaListaPizzas !== undefined ? novaListaPizzas : ingredientesPizza,
      pizzaConfig: { ...pizzaConfig, sizes: pizzaSizes }
    };

    try {
      const { error } = await supabase
        .from('companies')
        .update({ settings: newSettings })
        .eq('id', user.companyId);

      if (error) throw error;
    } catch (e) {
      console.error('Erro ao salvar configurações:', e);
      Alert.alert('Erro', 'Falha ao salvar configurações');
    }
  };

  const toggleGrupoAtivo = async (variacoes: Product[], todosAtivos: boolean) => {
    try {
      const ids = variacoes.map(v => v.id);
      const { error } = await supabase
        .from('products')
        .update({ available: !todosAtivos }) // DB Column is available
        .in('id', ids);

      if (error) throw error;
      carregarProdutos();
    } catch (e) {
      console.error(e);
      Alert.alert('Erro', 'Falha ao atualizar status');
    }
  };

  const abrirEdicao = (produto: Product) => {
    setEditando(produto);
    setEditNome(produto.name);
    setEditCategoria(produto.category);

    console.log('✏️ [abrirEdicao] Produto:', produto.name, 'Categoria:', produto.category);
    console.log('🍕 [abrirEdicao] Subcategoria:', produto.subcategory);
    console.log('🍕 [abrirEdicao] Ingredientes:', produto.ingredients);

    // Check loosely for 'pizza'
    const categoryLower = produto.category?.toLowerCase() || '';
    if (categoryLower.includes('pizza')) {
      // Handle prices mapping
      const pricesStr: Record<string, string> = {};
      if (produto.prices) {
        Object.entries(produto.prices).forEach(([size, price]) => {
          pricesStr[size] = String(price);
        });
      }
      setPrecosPizza(pricesStr);

      // Load subcategory
      setSubcategoria(produto.subcategory || '');

      // Load ingredients
      setIngredientesSelecionados(produto.ingredients || []);
      setIngredientesPersonalizados(produto.customIngredients || '');
    } else {
      setPrecosPizza({});
      setSubcategoria('');
      setIngredientesSelecionados([]);
      setIngredientesPersonalizados('');
      setEditPreco(produto.price?.toString() || '0');
    }

    setShowEditModal(true);
  };

  const salvarEdicao = async () => {
    if (!editNome.trim()) {
      Alert.alert('Atenção', 'Digite o nome do produto');
      return;
    }

    if (!editando || !user?.companyId) return;

    const isPizza = editCategoria?.toLowerCase().includes('pizza');

    // Validation for non-pizza products
    if (!isPizza) {
      const sanitizedPreco = editPreco?.toString().replace(',', '.');
      const val = parseFloat(sanitizedPreco);
      if (!editPreco || isNaN(val)) {
        Alert.alert('Atenção', 'Digite um preço válido');
        return;
      }
    }

    // Validation for pizza products
    if (isPizza) {
      // Validate at least one price
      const hasPrice = Object.values(precosPizza).some(p => p && p !== '0' && p !== '');
      if (!hasPrice) {
        Alert.alert('Atenção', 'Preencha pelo menos um preço para a pizza');
        return;
      }

      // Validate at least one ingredient
      if (ingredientesSelecionados.length === 0 && !ingredientesPersonalizados.trim()) {
        Alert.alert('Atenção', 'Adicione pelo menos um ingrediente para a pizza');
        return;
      }
    }

    try {
      setLoading(true);
      const updateData: any = {
        name: editNome.trim(),
        category: editCategoria
      };

      if (isPizza) {
        // Update pizza-specific fields
        const pricesAsNumbers: Record<string, number> = {};
        Object.keys(precosPizza).forEach(key => {
          const v = precosPizza[key];
          if (v !== undefined && v !== '') {
            const sanitized = v.toString().replace(',', '.');
            pricesAsNumbers[key] = parseFloat(sanitized) || 0;
          }
        });
        updateData.prices = pricesAsNumbers;
        updateData.price = 0; // Base price 0 for pizzas
        updateData.subcategory = subcategoria || null;
        updateData.ingredients = ingredientesSelecionados;
        updateData.custom_ingredients = ingredientesPersonalizados;
      } else {
        // Update non-pizza fields
        const sanitizedPreco = editPreco?.toString().replace(',', '.');
        const val = parseFloat(sanitizedPreco);
        updateData.price = val;
      }

      const { error } = await supabase
        .from('products')
        .update(updateData)
        .eq('id', editando.id);

      if (error) throw error;

      Alert.alert('Sucesso', 'Produto atualizado com sucesso!');
      setShowEditModal(false);
      setEditando(null);
      carregarProdutos();
    } catch (error) {
      console.error(error);
      Alert.alert('Erro', 'Não foi possível editar o produto');
    } finally {
      setLoading(false);
    }
  };

  const excluirProduto = async (variacoes: Product[]) => {
    if (variacoes.length === 0) return;
    const nomeBase = variacoes[0].name.replace(/\s*\(.*\)\s*$/, '').trim();

    if (Platform.OS === 'web') {
      const confirmed = window.confirm(`Tem certeza que deseja excluir "${nomeBase}" e todas as suas variações?`);
      if (!confirmed) return;
    } else {
      const confirmed = await new Promise((resolve) => {
        Alert.alert(
          'Confirmar Exclusão',
          `Tem certeza que deseja excluir "${nomeBase}"?`,
          [
            { text: 'Cancelar', onPress: () => resolve(false), style: 'cancel' },
            { text: 'Excluir', onPress: () => resolve(true), style: 'destructive' },
          ]
        );
      });
      if (!confirmed) return;
    }

    try {
      if (!user?.companyId) return;
      setLoading(true);

      const ids = variacoes.map(v => v.id);
      const { error } = await supabase
        .from('products')
        .delete()
        .in('id', ids);

      if (error) throw error;

      Alert.alert('Sucesso', 'Produto excluído');
      carregarProdutos();
    } catch (error) {
      console.error(error);
      Alert.alert('Erro', 'Não foi possível excluir o produto');
    } finally {
      setLoading(false);
    }
  };

  const adicionarTempero = async () => {
    if (!novoTempero.trim()) return;
    const listaAtual = getListaAtiva();

    if (editTemperoIndex === -1 && listaAtual.includes(novoTempero.trim())) {
      Alert.alert('Erro', 'Este item já existe nesta lista.');
      return;
    }

    try {
      const novos = [...listaAtual];
      if (editTemperoIndex >= 0) {
        novos[editTemperoIndex] = novoTempero.trim();
      } else {
        novos.push(novoTempero.trim());
      }

      const args: [string[] | undefined, string[] | undefined, string[] | undefined, string[] | undefined] = [undefined, undefined, undefined, undefined];

      if (tipoTemperoAtivo === 'caldos') {
        setTemperosCaldos(novos);
        args[0] = novos;
      } else if (tipoTemperoAtivo === 'comidas') {
        setTemperosComidas(novos);
        args[1] = novos;
      } else if (tipoTemperoAtivo === 'pizza') {
        setIngredientesPizza(novos);
        args[3] = novos;
      } else {
        setVariacoesEspetinho(novos);
        args[2] = novos;
      }

      await salvarListas(...args);

      setNovoTempero('');
      setEditTemperoIndex(-1);
    } catch (e) {
      console.error(e);
      Alert.alert('Erro', 'Falha ao salvar item.');
    }
  };

  const removerTempero = async (index: number) => {
    const listaAtual = getListaAtiva();
    const novos = listaAtual.filter((_, i) => i !== index);

    try {
      const args: [string[] | undefined, string[] | undefined, string[] | undefined, string[] | undefined] = [undefined, undefined, undefined, undefined];
      if (tipoTemperoAtivo === 'caldos') {
        setTemperosCaldos(novos);
        args[0] = novos;
      } else if (tipoTemperoAtivo === 'comidas') {
        setTemperosComidas(novos);
        args[1] = novos;
      } else if (tipoTemperoAtivo === 'pizza') {
        setIngredientesPizza(novos);
        args[3] = novos;
      } else {
        setVariacoesEspetinho(novos);
        args[2] = novos;
      }
      await salvarListas(...args);
    } catch (e) {
      console.error(e);
      Alert.alert('Erro', 'Falha ao remover item.');
    }
  };

  const iniciarEdicaoTempero = (index: number) => {
    setNovoTempero(getListaAtiva()[index]);
    setEditTemperoIndex(index);
  };

  const cancelarEdicaoTempero = () => {
    setNovoTempero('');
    setEditTemperoIndex(-1);
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
      novos[editTamanhoIndex] = { ...novos[editTamanhoIndex], name: novoTamanho.trim(), maxFlavors: max };
    } else {
      novos.push({ name: novoTamanho.trim(), maxFlavors: max, active: true });
    }

    setPizzaSizes(novos);
    // Reuse saving logic
    await salvarListas(undefined, undefined, undefined, undefined);
    // salvarListas will pick up the updated pizzaSizes from state or we need to pass it explicitly?
    // In React state updates are async, so 'pizzaSizes' might not be updated inside 'salvarListas' immediately if called like this.
    // Better to modify 'salvarListas' to accept optional override or update state first then call function that reads state.
    // BUT 'salvarListas' reads 'pizzaConfig' state which contains 'sizes'.
    // Let's manually trigger update:

    if (user?.companyId) {
      const newSettings = {
        temperosCaldos,
        temperosComidas,
        variacoesEspetinho,
        ingredientesPizza,
        pizzaConfig: { ...pizzaConfig, sizes: novos }
      };

      try {
        const { error } = await supabase.from('companies').update({ settings: newSettings }).eq('id', user.companyId);
        if (error) throw error;
      } catch (e) {
        console.error('Erro salvando tamanho pizza:', e);
        Alert.alert('Erro ao salvar');
      }
    }

    setNovoTamanho('');
    setNovosSaboresMax('');
    setEditTamanhoIndex(-1);
  };

  const iniciarEdicaoTamanho = (index: number) => {
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

  const removerTamanhoPizza = async (index: number) => {
    const novos = pizzaSizes.filter((_, i) => i !== index);
    setPizzaSizes(novos);

    if (user?.companyId) {
      const newSettings = {
        temperosCaldos,
        temperosComidas,
        variacoesEspetinho,
        ingredientesPizza,
        pizzaConfig: { ...pizzaConfig, sizes: novos }
      };
      try {
        await supabase.from('companies').update({ settings: newSettings }).eq('id', user.companyId);
      } catch (e) { console.error(e); }
    }
  };

  const toggleTamanhoAtivo = async (index: number) => {
    const novos = [...pizzaSizes];
    novos[index] = { ...novos[index], active: !novos[index].active };
    setPizzaSizes(novos);


    if (user?.companyId) {
      const newSettings = {
        temperosCaldos,
        temperosComidas,
        variacoesEspetinho,
        ingredientesPizza,
        pizzaConfig: { ...pizzaConfig, sizes: novos }
      };
      try {
        await supabase.from('companies').update({ settings: newSettings }).eq('id', user.companyId);
      } catch (e) { console.error(e); }
    }
  };

  // Helper function to save pizza variation price
  const savePizzaVariation = async (productId: string, sizeName: string, newPrice: number): Promise<boolean> => {
    if (!user?.companyId) return false;

    try {
      // Fetch current product to get existing prices
      const { data: currentProduct, error: fetchError } = await supabase
        .from('products')
        .select('prices')
        .eq('id', productId)
        .single();

      if (fetchError) throw fetchError;

      // Update the specific size price
      const updatedPrices = {
        ...(currentProduct.prices || {}),
        [sizeName]: newPrice
      };

      // Save back to database
      const { error: updateError } = await supabase
        .from('products')
        .update({ prices: updatedPrices })
        .eq('id', productId);

      if (updateError) throw updateError;

      return true;
    } catch (e) {
      console.error('Error saving pizza variation:', e);
      throw e;
    }
  };

  const abrirVariacoes = (variacoes: Product[]) => {
    // Check if this is a pizza product
    if (variacoes.length > 0 && isPizzaProduct(variacoes[0])) {
      // For pizza products, transform the prices Record into variations
      const pizzaVariations = transformPizzaPricesToVariations(variacoes[0]);
      setVariacoesSelecionadas(pizzaVariations);
    } else {
      // For non-pizza products, use existing behavior
      setVariacoesSelecionadas(variacoes);
    }
    setShowVariacoesModal(true);
  };

  const salvarVariacao = async (prod: any, novaStr: string, novoNome: string) => {
    const novoP = parseFloat(novaStr.replace(',', '.'));
    if (!prod.id || !user?.companyId) return;

    // Check if this is a pizza variation
    if (prod._isPizzaVariation) {
      // Handle pizza variation save
      try {
        const originalProductId = prod._originalProductId;
        const sizeName = prod._sizeName;

        // Validate price
        if (isNaN(novoP)) {
          Alert.alert('Erro', 'Digite um preço válido');
          return;
        }

        // Save pizza variation
        await savePizzaVariation(originalProductId, sizeName, novoP);

        // Update local state
        const updated = variacoesSelecionadas.map(v =>
          v.id === prod.id ? { ...v, price: novoP } : v
        );
        setVariacoesSelecionadas(updated);

        // Refresh product list
        carregarProdutos();
      } catch (e) {
        console.error(e);
        Alert.alert('Erro', 'Falha ao salvar variação');
      }
    } else {
      // Handle non-pizza variation save (existing behavior)
      try {
        const { error } = await supabase
          .from('products')
          .update({ price: novoP, name: novoNome })
          .eq('id', prod.id);

        if (error) throw error;

        // Update local state
        const updated = variacoesSelecionadas.map(v =>
          v.id === prod.id ? { ...v, price: novoP, name: novoNome } : v
        );
        setVariacoesSelecionadas(updated);
        carregarProdutos();
      } catch (e) {
        console.error(e);
        Alert.alert('Erro', 'Falha ao salvar variação');
      }
    }
  };

  const abrirEstoque = async (produto: Product) => {
    if (!user?.companyId) return;
    setCurrentProductForStock(produto);
    setShowStockModal(true);

    // Load stock items if empty
    if (stockItems.length === 0) {
      try {
        // Inventory collection/table
        const { data, error } = await supabase
          .from('inventory')
          .select('*')
          .eq('company_id', user.companyId);

        if (!error && data) {
          const items = data.map((d: any) => ({
            id: d.id,
            nome: d.name, // Mapping 'name' to 'nome'
            unidadeOriginal: d.unit
          }));
          setStockItems(items);
        }
      } catch (e) { console.error(e); }
    }
  };

  const addIngredient = async () => {
    if (!selectedStockId || !currentProductForStock || !user?.companyId) return;

    const itemEstoque = stockItems.find(i => i.id === selectedStockId);
    if (!itemEstoque) return;

    const novoIngrediente = {
      id: selectedStockId,
      nome: itemEstoque.nome,
      qt: parseFloat(qtyIngredient.replace(',', '.')) || 0,
      un: unitIngredient
    };

    const currentList = currentProductForStock.inventoryItems || [];
    const updatedList = [...currentList, novoIngrediente];

    try {
      const { error } = await supabase
        .from('products')
        .update({ inventory_items: updatedList }) // Mapping to snake_case column
        .eq('id', currentProductForStock.id);

      if (error) throw error;

      setCurrentProductForStock({ ...currentProductForStock, inventoryItems: updatedList });
      carregarProdutos();
      setQtyIngredient('');
    } catch (e) {
      console.error(e);
      Alert.alert('Erro', 'Falha ao adicionar ingrediente');
    }
  };

  const removeIngredient = async (ingId: string) => {
    if (!currentProductForStock || !user?.companyId) return;
    const currentList = currentProductForStock.inventoryItems || [];
    const updatedList = currentList.filter(i => i.id !== ingId);

    try {
      const { error } = await supabase
        .from('products')
        .update({ inventory_items: updatedList })
        .eq('id', currentProductForStock.id);

      if (error) throw error;

      setCurrentProductForStock({ ...currentProductForStock, inventoryItems: updatedList });
      carregarProdutos();
    } catch (e) {
      console.error(e);
      Alert.alert('Erro', 'Falha ao remover ingrediente');
    }
  };



  // Lógica de filtragem e agrupamento
  // Lógica de filtragem e agrupamento
  const produtosFiltrados = produtos.filter(p => {
    if (categoriaFiltro === 'todos') return true;
    const cat = p.category?.toLowerCase() || '';
    const filtro = categoriaFiltro.toLowerCase();
    // Special handling for 'outros'/others if needed, but strict match is better for tabs
    return cat === filtro;
  });

  const produtosAgrupados = produtosFiltrados.reduce((acc, produto) => {
    // Normalização básica: remove conteúdo entre parênteses para agrupar variações
    const nomeBase = produto.name.replace(/\s*\(.*\)\s*$/, '').trim();
    if (!acc[nomeBase]) acc[nomeBase] = [];
    acc[nomeBase].push(produto);
    return acc;
  }, {} as Record<string, Product[]>);

  const displayedCategorias = React.useMemo(() => {
    const extraCategorias = produtos
      .map(p => p.category)
      .filter(c => c && !categorias.some(cat => cat.value.toLowerCase() === c.toLowerCase()))
      .filter((v, i, a) => a.indexOf(v) === i) // unique
      .map(c => ({ value: c, label: `📦 ${c.charAt(0).toUpperCase() + c.slice(1)}` }));
    
    return [...categorias, ...extraCategorias];
  }, [produtos, categorias]);

  return (
    <KeyboardWrapper style={styles.container}>


      <View style={styles.header}>
        <View style={styles.headerLeft}>
          {onClose && (
            <TouchableOpacity onPress={onClose} style={styles.backButton}>
              <Ionicons name="arrow-back" size={24} color="#FFF" />
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.headerCenter}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Ionicons name="restaurant-outline" size={24} color="#FFF" style={{ marginRight: 8 }} />
            <Text style={styles.headerTitle}>Gerenciar Cardápio</Text>
          </View>
        </View>

        <View style={styles.headerRight} />
      </View>

      <ScrollView style={styles.content} contentContainerStyle={{ 
        paddingBottom: 100,
        paddingHorizontal: horizontalPadding 
      }}>
        {/* SEÇÃO 1: CADASTRAR PRODUTO */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>➕ Cadastrar Produto</Text>

          <View style={styles.form}>
            <TextInput
              style={[styles.input, { maxWidth: inputMaxWidth }]}
              placeholder="Nome do produto (ex: Camarão)"
              placeholderTextColor="#999"
              value={nome}
              onChangeText={setNome}
            />

            <Text style={styles.label}>Categoria:</Text>
            <View style={styles.categoriaButtons}>
              {displayedCategorias.map(cat => (
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
                <Text style={styles.label}>Categoria da Pizza:</Text>
                <View style={styles.categoriaButtons}>
                  {['Tradicional', 'Especiais', 'Doces'].map(cat => (
                    <TouchableOpacity
                      key={cat}
                      style={[
                        styles.categoriaBtn,
                        subcategoria === cat && styles.categoriaBtnActive
                      ]}
                      onPress={() => setSubcategoria(cat)}
                    >
                      <Text style={[
                        styles.categoriaBtnText,
                        subcategoria === cat && styles.categoriaBtnTextActive
                      ]}>
                        {cat}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <Text style={styles.label}>Ingredientes:</Text>
                <View style={styles.addTemperoRow}>
                  <TextInput
                    style={styles.inputTempero}
                    placeholder="Adicionar ingrediente..."
                    value={novoIngrediente}
                    onChangeText={setNovoIngrediente}
                  />
                  <TouchableOpacity
                    style={styles.addBtn}
                    onPress={() => {
                      if (novoIngrediente.trim()) {
                        setIngredientesSelecionados([...ingredientesSelecionados, novoIngrediente.trim()]);
                        setNovoIngrediente('');
                      }
                    }}
                  >
                    <Ionicons name="add" size={24} color="#fff" />
                  </TouchableOpacity>
                </View>

                {ingredientesSelecionados.length > 0 && (
                  <View style={styles.listaTemperos}>
                    {ingredientesSelecionados.map((ing, index) => (
                      <View key={index} style={styles.temperoRow}>
                        <Text style={styles.temperoText}>{ing}</Text>
                        <TouchableOpacity onPress={() => {
                          setIngredientesSelecionados(ingredientesSelecionados.filter((_, i) => i !== index));
                        }}>
                          <Ionicons name="trash-outline" size={20} color="#FF4444" />
                        </TouchableOpacity>
                      </View>
                    ))}
                  </View>
                )}

                <Text style={styles.label}>Ingredientes Personalizados (opcional):</Text>
                <TextInput
                  style={[styles.input, { height: 60 }]}
                  placeholder="Ex: Molho especial da casa..."
                  placeholderTextColor="#999"
                  value={ingredientesPersonalizados}
                  onChangeText={setIngredientesPersonalizados}
                  multiline
                />

                <Text style={styles.label}>Preços por tamanho:</Text>
                <View style={styles.variacoesGrid}>
                  {pizzaSizes.map((size, idx) => (
                    <View key={idx} style={styles.variacaoField}>
                      <Text style={styles.variacaoLabel}>{size.name} ({size.maxFlavors} sab)</Text>
                      <TextInput
                        style={styles.inputVariacao}
                        placeholder="0.00"
                        placeholderTextColor="#999"
                        value={precosPizza[size.name] !== undefined ? String(precosPizza[size.name]) : ''}
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
        </View>

        {/* SEÇÃO EXTRA: GERENCIAR TEMPEROS */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🌿 Gerenciar Opções (Temperos)</Text>
          <View style={styles.form}>
            {/* Tabs Selector */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filtros}>
              <TouchableOpacity
                style={[styles.filtroBtn, tipoTemperoAtivo === 'caldos' && styles.filtroBtnActive]}
                onPress={() => { setTipoTemperoAtivo('caldos'); setEditTemperoIndex(-1); setNovoTempero(''); }}
              >
                <Text style={[styles.filtroBtnText, tipoTemperoAtivo === 'caldos' && styles.filtroBtnTextActive]}>
                  Caldos
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.filtroBtn, tipoTemperoAtivo === 'comidas' && styles.filtroBtnActive]}
                onPress={() => { setTipoTemperoAtivo('comidas'); setEditTemperoIndex(-1); setNovoTempero(''); }}
              >
                <Text style={[styles.filtroBtnText, tipoTemperoAtivo === 'comidas' && styles.filtroBtnTextActive]}>
                  Comida
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.filtroBtn, tipoTemperoAtivo === 'pizza' && styles.filtroBtnActive]}
                onPress={() => { setTipoTemperoAtivo('pizza'); setEditTemperoIndex(-1); setNovoTempero(''); }}
              >
                <Text style={[styles.filtroBtnText, tipoTemperoAtivo === 'pizza' && styles.filtroBtnTextActive]}>
                  Ingredientes Pizza
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.filtroBtn, tipoTemperoAtivo === 'variacoes' && styles.filtroBtnActive]}
                onPress={() => { setTipoTemperoAtivo('variacoes'); setEditTemperoIndex(-1); setNovoTempero(''); }}
              >
                <Text style={[styles.filtroBtnText, tipoTemperoAtivo === 'variacoes' && styles.filtroBtnTextActive]}>
                  Var. Espetinho
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.filtroBtn, tipoTemperoAtivo === 'tamanhos' && styles.filtroBtnActive]}
                onPress={() => { setTipoTemperoAtivo('tamanhos'); }}
              >
                <Text style={[styles.filtroBtnText, tipoTemperoAtivo === 'tamanhos' && styles.filtroBtnTextActive]}>
                  Tam. Pizza
                </Text>
              </TouchableOpacity>
            </ScrollView>

            {/* TAB: TAMANHOS DE PIZZA */}
            {tipoTemperoAtivo === 'tamanhos' ? (
              <View>
                <View style={{ flexDirection: 'row', marginBottom: 15 }}>
                  <TextInput
                    style={[styles.input, { flex: 2, marginBottom: 0, marginRight: 10 }]}
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
                  .map((size, idx) => (
                    <View key={idx} style={[styles.temperoRow, size.active === false && { opacity: 0.5, backgroundColor: '#f0f0f0' }]}>
                      <Text style={styles.temperoText}>
                        {size.name} ({size.maxFlavors} sabores) {size.active === false ? '(Desativado)' : ''}
                      </Text>
                      <View style={{ flexDirection: 'row' }}>
                        <TouchableOpacity onPress={() => toggleTamanhoAtivo(size.originalIndex)} style={{ marginRight: 10 }}>
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
              // TAB: OUTROS TEMPEROS
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

                {loadingTemperos ? (
                  <ActivityIndicator color="#8B2F2F" />
                ) : (
                  <View style={styles.listaTemperos}>
                    {getListaAtiva().map((item, index) => (
                      <View key={index} style={styles.temperoRow}>
                        <Text style={styles.temperoText}>{item}</Text>
                        <View style={{ flexDirection: 'row' }}>
                          <TouchableOpacity onPress={() => iniciarEdicaoTempero(index)} style={{ marginRight: 10 }}>
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
        </View>

        {/* SEÇÃO 2: LISTAR PRODUTOS POR CATEGORIA */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📋 Produtos Cadastrados</Text>

          {/* Filtros de categoria */}
          <ScrollView horizontal style={styles.filtros}>
            <TouchableOpacity
              style={[styles.filtroBtn, categoriaFiltro === 'todos' && styles.filtroBtnActive]}
              onPress={() => setCategoriaFiltro('todos')}
            >
              <Text style={[styles.filtroBtnText, categoriaFiltro === 'todos' && styles.filtroBtnTextActive]}>
                Todos
              </Text>
            </TouchableOpacity>

            {/* Combine static categories with any extra categories found in products */}
            {displayedCategorias.map(cat => (
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
                        {/* Display ingredients for pizza products */}
                        {isPizzaProduct(primeiraVariacao) && primeiraVariacao.ingredients && primeiraVariacao.ingredients.length > 0 && (
                          <Text style={styles.produtoIngredientes}>
                            {primeiraVariacao.ingredients.length > 3
                              ? primeiraVariacao.ingredients.slice(0, 3).join(', ') + '...'
                              : primeiraVariacao.ingredients.join(', ')}
                            {primeiraVariacao.customIngredients ? ' | ' + primeiraVariacao.customIngredients : ''}
                          </Text>
                        )}
                      </View>
                    </View>

                    <View style={styles.produtoActions}>
                      <TouchableOpacity
                        style={[styles.statusBtn, todosAtivos ? styles.statusBtnAtivo : styles.statusBtnInativo]}
                        onPress={() => toggleGrupoAtivo(variacoes, todosAtivos)}
                      >
                        <Text style={styles.statusBtnText}>
                          {todosAtivos ? 'ATIVO' : 'DESATIVADO'}
                        </Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={styles.stockBtn}
                        onPress={() => abrirEstoque(primeiraVariacao)}
                      >
                        <Text style={styles.stockBtnText}>Ficha T.</Text>
                      </TouchableOpacity>

                      {/* Show Variações button for pizzas and espetinhos with multiple variations */}
                      {(isPizzaProduct(primeiraVariacao) || variacoes.length > 1) && (
                        <TouchableOpacity
                          style={[styles.editBtn, { backgroundColor: '#B45309' }]}
                          onPress={() => abrirVariacoes(variacoes)}
                        >
                          <Text style={[styles.editBtnText, { color: '#000' }]}>Variações</Text>
                        </TouchableOpacity>
                      )}

                      <TouchableOpacity
                        style={styles.editBtn}
                        onPress={async () => {
                          if (variacoes.length === 1) {
                            abrirEdicao(primeiraVariacao);
                          } else {
                            // For pizza products with multiple sizes, fetch the complete product
                            if (isPizzaProduct(primeiraVariacao)) {
                              try {
                                const { data, error } = await supabase
                                  .from('products')
                                  .select('*')
                                  .eq('id', primeiraVariacao.id)
                                  .single();

                                if (error) throw error;

                                if (data) {
                                  const fullProduct: Product = {
                                    id: data.id,
                                    name: data.name,
                                    price: Number(data.price),
                                    category: data.category,
                                    subcategory: data.subcategory,
                                    active: data.available !== undefined ? data.available : data.active, // Map available
                                    createdAt: new Date(data.created_at).getTime(),
                                    prices: data.prices || {},
                                    ingredients: data.ingredients || [],
                                    customIngredients: data.custom_ingredients || '',
                                    inventoryItems: data.inventory_items || []
                                  };
                                  abrirEdicao(fullProduct);
                                }
                              } catch (e) {
                                console.error('Error fetching pizza product:', e);
                                Alert.alert('Erro', 'Não foi possível carregar os dados da pizza');
                              }
                            } else {
                              abrirVariacoes(variacoes);
                            }
                          }
                        }}
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
        </View>
      </ScrollView>

      {/* MODAL DE EDIÇÃO (Produto Único) */}
      <Modal visible={showEditModal} animationType="slide" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { 
            maxHeight: '90%',
            width: modalWidth,
            maxWidth: modalMaxWidth,
            padding: isTablet ? 30 : 25,
          }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>✏️ Editar Produto</Text>
              <TouchableOpacity onPress={() => setShowEditModal(false)}>
                <Text style={styles.modalClose}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} style={{ flex: 1 }}>
              <Text style={styles.label}>Nome:</Text>
              <TextInput
                style={[styles.input, { maxWidth: inputMaxWidth }]}
                placeholder="Nome do produto"
                placeholderTextColor="#999"
                value={editNome}
                onChangeText={setEditNome}
              />

              {editCategoria?.toLowerCase().includes('pizza') ? (
                <>
                  {/* Pizza Subcategory */}
                  <Text style={styles.label}>Categoria da Pizza:</Text>
                  <View style={styles.categoriaButtons}>
                    <TouchableOpacity
                      style={[
                        styles.categoriaBtn,
                        subcategoria === 'Tradicional' && styles.categoriaBtnActive
                      ]}
                      onPress={() => setSubcategoria('Tradicional')}
                    >
                      <Text style={[
                        styles.categoriaBtnText,
                        subcategoria === 'Tradicional' && styles.categoriaBtnTextActive
                      ]}>
                        🍅 Tradicional
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[
                        styles.categoriaBtn,
                        subcategoria === 'Especiais' && styles.categoriaBtnActive
                      ]}
                      onPress={() => setSubcategoria('Especiais')}
                    >
                      <Text style={[
                        styles.categoriaBtnText,
                        subcategoria === 'Especiais' && styles.categoriaBtnTextActive
                      ]}>
                        🍄 Especiais
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[
                        styles.categoriaBtn,
                        subcategoria === 'Doces' && styles.categoriaBtnActive
                      ]}
                      onPress={() => setSubcategoria('Doces')}
                    >
                      <Text style={[
                        styles.categoriaBtnText,
                        subcategoria === 'Doces' && styles.categoriaBtnTextActive
                      ]}>
                        🍫 Doces
                      </Text>
                    </TouchableOpacity>
                  </View>

                  {/* Ingredients */}
                  <Text style={styles.label}>Ingredientes:</Text>
                  <View style={styles.ingredientesContainer}>
                    {ingredientesSelecionados.map((ing, idx) => (
                      <View key={idx} style={styles.ingredienteChip}>
                        <Text style={styles.ingredienteText}>{ing}</Text>
                        <TouchableOpacity
                          onPress={() => {
                            setIngredientesSelecionados(prev => prev.filter((_, i) => i !== idx));
                          }}
                        >
                          <Text style={styles.ingredienteRemove}>×</Text>
                        </TouchableOpacity>
                      </View>
                    ))}
                  </View>

                  <View style={{ flexDirection: 'row', marginBottom: 15 }}>
                    <TextInput
                      style={[styles.input, { flex: 1, marginRight: 8, maxWidth: inputMaxWidth }]}
                      placeholder="Adicionar ingrediente..."
                      placeholderTextColor="#999"
                      value={novoIngrediente}
                      onChangeText={setNovoIngrediente}
                    />
                    <TouchableOpacity
                      style={[styles.addIngredienteBtn]}
                      onPress={() => {
                        if (novoIngrediente.trim()) {
                          setIngredientesSelecionados(prev => [...prev, novoIngrediente.trim()]);
                          setNovoIngrediente('');
                        }
                      }}
                    >
                      <Text style={styles.addIngredienteBtnText}>+</Text>
                    </TouchableOpacity>
                  </View>

                  <Text style={styles.label}>Ingredientes Personalizados (opcional):</Text>
                  <TextInput
                    style={[styles.input, { height: 60, maxWidth: inputMaxWidth }]}
                    placeholder="Ex: Ingredientes especiais, observações..."
                    placeholderTextColor="#999"
                    value={ingredientesPersonalizados}
                    onChangeText={setIngredientesPersonalizados}
                    multiline
                  />

                  <Text style={styles.label}>Preços por tamanho:</Text>
                  <View style={styles.variacoesGrid}>
                    {pizzaSizes.length === 0 ? (
                      <Text style={{ color: 'red', marginBottom: 10 }}>Nenhum tamanho de pizza configurado. Vá em Configurações.</Text>
                    ) : (
                      pizzaSizes.map((size, idx) => (
                        <View key={idx} style={styles.variacaoField}>
                          <Text style={styles.variacaoLabel}>{size.name} ({size.maxFlavors} sab)</Text>
                          <TextInput
                            style={styles.inputVariacao}
                            placeholder="0.00"
                            placeholderTextColor="#999"
                            value={precosPizza[size.name] !== undefined ? String(precosPizza[size.name]) : ''}
                            onChangeText={(text) => setPrecosPizza(prev => ({ ...prev, [size.name]: text }))}
                            keyboardType="numeric"
                          />
                        </View>
                      ))
                    )}
                  </View>
                </>
              ) : (
                <>
                  <Text style={styles.label}>Preço:</Text>
                  <TextInput
                    style={[styles.input, { maxWidth: inputMaxWidth }]}
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
      </Modal>

      {/* MODAL DE VARIAÇÕES */}
      <Modal visible={showVariacoesModal} animationType="slide" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, {
            width: modalWidth,
            maxWidth: modalMaxWidth,
            padding: isTablet ? 30 : 25,
          }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>✏️ Editar Variações</Text>
              <TouchableOpacity onPress={() => setShowVariacoesModal(false)}>
                <Text style={styles.modalClose}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={[styles.variacoesLista, Platform.OS === 'web' && { maxHeight: '60vh' }]}>
              {variacoesSelecionadas.map(variacao => (
                <View key={variacao.id}>
                  <VariacaoItem
                    variacao={variacao}
                    onSalvar={salvarVariacao}
                    onEditarCompleto={async (prod) => {
                      // For pizza variations, load the original product with all data
                      if (prod._isPizzaVariation && prod._originalProductId) {
                        setShowVariacoesModal(false);
                        try {
                          // Fetch the complete product from database
                          const { data, error } = await supabase
                            .from('products')
                            .select('*')
                            .eq('id', prod._originalProductId)
                            .single();

                          if (error) throw error;

                          if (data) {
                            // Map database fields to Product interface
                            const fullProduct: Product = {
                              id: data.id,
                              name: data.name,
                              price: Number(data.price),
                              category: data.category,
                              subcategory: data.subcategory,
                              active: data.active,
                              createdAt: new Date(data.created_at).getTime(),
                              prices: data.prices || {},
                              ingredients: data.ingredients || [],
                              customIngredients: data.custom_ingredients || '',
                              inventoryItems: data.inventory_items || []
                            };

                            setTimeout(() => {
                              abrirEdicao(fullProduct);
                            }, 100);
                          }
                        } catch (error) {
                          console.error('Error loading full product:', error);
                          Alert.alert('Erro', 'Não foi possível carregar os dados do produto');
                        }
                      } else {
                        // For non-pizza products, use existing behavior
                        setShowVariacoesModal(false);
                        setTimeout(() => {
                          abrirEdicao(prod);
                        }, 100);
                      }
                    }}
                  />
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
      </Modal>

      {/* MODAL FICHA TÉCNICA */}
      <Modal visible={showStockModal} animationType="slide" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, {
            width: modalWidth,
            maxWidth: modalMaxWidth,
            padding: isTablet ? 30 : 25,
          }]}>
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

            <ScrollView style={{ 
              maxHeight: Platform.OS === 'web' ? 300 : 150, 
              marginBottom: 10, 
              borderWidth: 1, 
              borderColor: '#eee', 
              borderRadius: 8 
            }}>
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

            <View style={{ flexDirection: 'row' }}>
              <TextInput
                style={[styles.input, { flex: 0.4, marginRight: 10 }]}
                placeholder="Qtd"
                cursorColor='#8B2F2F'
                value={qtyIngredient}
                onChangeText={setQtyIngredient}
                keyboardType="numeric"
              />
              <View style={{ flex: 0.6 }}>
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
      </Modal>

    </KeyboardWrapper>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F5DC' },
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
  headerLeft: { width: 40 },
  headerCenter: { flex: 1, alignItems: 'center' },
  headerRight: { width: 40 },
  backButton: { padding: 5 },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFF',
    marginLeft: 8,
  },
  content: { paddingBottom: 50 },
  section: {
    backgroundColor: '#FFFFFF',
    margin: 20,
    borderRadius: 20,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 5,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#8B2F2F',
    marginBottom: 20,
    borderBottomWidth: 2,
    borderBottomColor: '#F5F1E8',
    paddingBottom: 10,
  },
  form: {
    marginBottom: 15,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    marginBottom: 5,
    marginLeft: 4,
  },
  input: {
    backgroundColor: '#F5F1E8',
    borderRadius: 12,
    padding: 15,
    fontSize: 16,
    color: '#333',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  categoriaButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 10,
  },
  categoriaBtn: {
    backgroundColor: '#F5F1E8',
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#B45309',
    marginRight: 10,
    marginBottom: 10,
  },
  categoriaBtnActive: {
    backgroundColor: '#B45309',
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
    marginBottom: 15,
  },
  variacaoField: {
    flex: 1,
    minWidth: '45%',
    marginRight: 10,
    marginBottom: 10,
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
    borderColor: '#B45309',
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
    maxWidth: '100%', // Ensure it doesn't overflow parent
  },
  filtroBtn: {
    backgroundColor: '#FFFFFF',
    paddingVertical: 8,
    paddingHorizontal: 15,
    borderRadius: 20,
    marginRight: 10,
    borderWidth: 2,
    borderColor: '#B45309',
  },
  filtroBtnActive: {
    backgroundColor: '#B45309',
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
  produtoIngredientes: {
    fontSize: 11,
    color: '#666',
    marginTop: 4,
    fontStyle: 'italic',
  },
  produtoActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    flexWrap: 'wrap',
    maxWidth: '50%',
    rowGap: 8,
    columnGap: 8,
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
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  editBtn: {
    backgroundColor: '#B45309',
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
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
    alignSelf: 'center',
    display: 'flex',
    flexDirection: 'column', // Prepare for flex children
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
  variacoesLista: {
    maxHeight: Platform.OS === 'web' ? '60vh' : 400,
    flexGrow: 0, // Ensure it doesn't force expansion beyond limits
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
  },
  variacaoLabelLarge: {
    fontSize: 16,
    fontWeight: '600',
    color: '#8B2F2F',
    marginRight: 8,
  },
  variacaoPrecoInput: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 8,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#B45309',
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
  miniStockBtn: {
    backgroundColor: '#eee',
    padding: 8,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 10
  },
  miniStockText: { color: '#333', fontSize: 12 },
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
  addTemperoRow: {
    flexDirection: 'row',
    marginBottom: 10,
    alignItems: 'center'
  },
  inputTempero: {
    flex: 1,
    backgroundColor: '#F5F1E8',
    borderRadius: 8,
    padding: 10,
    fontSize: 14,
    borderWidth: 1,
    borderColor: '#ddd',
    marginRight: 10,
  },
  addBtn: {
    width: 40,
    height: 40,
    backgroundColor: '#8B2F2F',
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 2
  },
  listaTemperos: {
    marginTop: 5
  },
  temperoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#fff',
    borderRadius: 10,
    marginBottom: 8,
    elevation: 1
  },
  temperoText: {
    fontSize: 14,
    color: '#444',
    fontWeight: '500'
  },
  ingredientesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 10,
    minHeight: 40,
  },
  ingredienteChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#B45309',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 20,
    marginRight: 8,
    marginBottom: 8,
  },
  ingredienteText: {
    fontSize: 14,
    color: '#2C2C2C',
    fontWeight: '600',
    marginRight: 6,
  },
  ingredienteRemove: {
    fontSize: 18,
    color: '#8B2F2F',
    fontWeight: 'bold',
  },
  addIngredienteBtn: {
    backgroundColor: '#8B2F2F',
    width: 50,
    height: 50,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addIngredienteBtnText: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: 'bold',
  }
});
