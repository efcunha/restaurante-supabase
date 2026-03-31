import React, { useState, useEffect } from 'react';
import AdicionaisConfigModal from './admin/menu/AdicionaisConfigModal';
// @ts-ignore
import ExtrasConfigScreen from './ExtrasConfigScreen';
import { AdminSlideModal } from '../features/admin';
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
import { ScreenScaffold } from '../layouts/ScreenScaffold';
import { colors } from '../theme/colors';
import {
  LEGACY_MENU_CATEGORIES,
  MenuCategory,
  getOrCreateMenuCategories,
  isBebidaCategorySlug,
  isEspetinhoCategorySlug,
  isIngredientsCategorySlug,
  normalizeCategorySlug,
  resolveConfiguredSubcategories,
  slugifyCategoryName,
  toCategoryOption,
} from '../utils/menuCategories';
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
            style={[styles.variacaoSalvarBtn, { backgroundColor: colors.secondary, marginLeft: 8 }]}
            onPress={() => onEditarCompleto(variacao)}
          >
            <Text style={[styles.variacaoSalvarText, { color: colors.white }]}>✏️</Text>
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
  const [newProductImageUrl, setNewProductImageUrl] = useState<string | null>(null);
  const [newProductImageFile, setNewProductImageFile] = useState<File | null>(null);
  const [newProductImagePreview, setNewProductImagePreview] = useState<string | null>(null);

  // Estados para cadastro com variações (espetinhos)
  const [criarVariacoes, setCriarVariacoes] = useState(false);
  const [precosVariacoes, setPrecosVariacoes] = useState<Record<string, string>>({});
  const [variacoesEspetinho, setVariacoesEspetinho] = useState<string[]>([]);
  const [acompanhamentosEspetinho, setAcompanhamentosEspetinho] = useState<string[]>([]);
  const [novoAcompanhamento, setNovoAcompanhamento] = useState('');
  const [companySettings, setCompanySettings] = useState<Record<string, any>>({});
  const [menuCategories, setMenuCategories] = useState<MenuCategory[]>(LEGACY_MENU_CATEGORIES);
  const [categoryNameInput, setCategoryNameInput] = useState('');
  const [categorySlugInput, setCategorySlugInput] = useState('');
  const [editingCategorySlug, setEditingCategorySlug] = useState<string | null>(null);

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
  const [editAcompanhamentosEspetinho, setEditAcompanhamentosEspetinho] = useState<string[]>([]);
  const [editNovoAcompanhamento, setEditNovoAcompanhamento] = useState('');
  const [editImageUrl, setEditImageUrl] = useState<string | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);

  // Estados para edição de grupo de variações
  const [showVariacoesModal, setShowVariacoesModal] = useState(false);
  const [variacoesSelecionadas, setVariacoesSelecionadas] = useState<Product[]>([]);

  // Estados para Temperos/Opções
  const [temperosCaldos, setTemperosCaldos] = useState<string[]>([]);
  const [temperosComidas, setTemperosComidas] = useState<string[]>([]);
  const [tipoTemperoAtivo, setTipoTemperoAtivo] = useState<'caldos' | 'comidas' | 'variacoes' | 'pizza' | 'pizzaCategorias' | 'tamanhos'>('caldos');
  const [novoTempero, setNovoTempero] = useState('');
  const [editTemperoIndex, setEditTemperoIndex] = useState(-1);
  const [pizzaSubcategoryInput, setPizzaSubcategoryInput] = useState('');
  const [editPizzaSubcategoryIndex, setEditPizzaSubcategoryIndex] = useState(-1);
  const [bebidaSubcategoryInput, setBebidaSubcategoryInput] = useState('');
  const [editBebidaSubcategoryIndex, setEditBebidaSubcategoryIndex] = useState(-1);
  const [loadingTemperos, setLoadingTemperos] = useState(true);

  // Estados para Pizza
  const [pizzaConfig, setPizzaConfig] = useState<PizzaConfig>({ sizes: [] });
  const [bebidaSubcategories, setBebidaSubcategories] = useState<string[]>([]);
  const [pizzaSizes, setPizzaSizes] = useState<PizzaSize[]>([]); // Local state for editing sizes
  const [novoTamanho, setNovoTamanho] = useState('');
  const [novosSaboresMax, setNovosSaboresMax] = useState('');
  const [editTamanhoIndex, setEditTamanhoIndex] = useState(-1); // TRACK EDIT INDEX
  const [precosPizza, setPrecosPizza] = useState<Record<string, string | number>>({}); // { 'Fatia': '5.00', 'Grande': '40.00' }
  const [ingredientesPizza, setIngredientesPizza] = useState<string[]>([]); // from config
  const [pizzaSubcategories, setPizzaSubcategories] = useState<string[]>([]); // from company settings
  const [ingredientesSelecionados, setIngredientesSelecionados] = useState<string[]>([]); // for current product
  const [ingredientesPersonalizados, setIngredientesPersonalizados] = useState(''); // text field
  const [novoIngrediente, setNovoIngrediente] = useState(''); // for adding new ingredient

  // Estados para Ficha Técnica (Estoque)
  const [showStockModal, setShowStockModal] = useState(false);
  const [currentProductForStock, setCurrentProductForStock] = useState<Product | null>(null);

  // Estados para Adicionais
  const [showAdicionaisModal, setShowAdicionaisModal] = useState(false);
  const [productForAdicionais, setProductForAdicionais] = useState<{ id: string; name: string } | null>(null);
  const [stockItems, setStockItems] = useState<{ id: string; nome: string; unidadeOriginal: string; }[]>([]);

  // Estado para Extras de Pizza
  const [showExtrasConfig, setShowExtrasConfig] = useState(false);
  // Form Ficha Técnica
  const [selectedStockId, setSelectedStockId] = useState('');
  const [qtyIngredient, setQtyIngredient] = useState('');
  const [unitIngredient, setUnitIngredient] = useState('ml');
  const [tipoUnidade, setTipoUnidade] = useState<keyof typeof SUPPORTED_UNITS>('VOLUME'); // Default to VOLUME for recipes usually

  const unidadesUI = (SUPPORTED_UNITS[tipoUnidade] || []);

  // Helper function to detect pizza products
  const isPizzaProduct = (product: Product): boolean => {
    return product.category?.toLowerCase().includes('pizza') || false;
  };

  const normalizeStringArray = (value: unknown): string[] => {
    if (!Array.isArray(value)) return [];
    return value
      .map((item) => String(item ?? '').trim())
      .filter((item) => item.length > 0);
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

  const categorias = React.useMemo(
    () => menuCategories.filter((item) => item.active).sort((a, b) => a.order - b.order).map(toCategoryOption),
    [menuCategories]
  );

  const buildCategoryOrder = (categoriesList: MenuCategory[]) =>
    categoriesList.reduce<Record<string, number>>((acc, item, index) => {
      acc[item.slug] = index + 1;
      return acc;
    }, {});

  const persistCompanySettings = async (partial: Record<string, any>, baseSettings?: Record<string, any>) => {
    if (!user?.companyId) return null;
    const base = baseSettings ?? companySettings ?? {};
    const mergedSettings = { ...base, ...partial };
    const { error } = await supabase
      .from('companies')
      .update({ settings: mergedSettings })
      .eq('id', user.companyId);

    if (error) {
      throw error;
    }

    setCompanySettings(mergedSettings);
    return mergedSettings;
  };

  const saveMenuCategories = async (nextList: MenuCategory[], baseSettings?: Record<string, any>) => {
    const normalized = nextList
      .map((item, index) => ({
        ...item,
        slug: normalizeCategorySlug(item.slug),
        name: item.name.trim(),
        order: index + 1,
      }))
      .filter((item) => item.slug && item.name);

    setMenuCategories(normalized);

    await persistCompanySettings(
      {
        categories: normalized,
        categoryOrder: buildCategoryOrder(normalized),
      },
      baseSettings
    );
  };

  const resetCategoryForm = () => {
    setCategoryNameInput('');
    setCategorySlugInput('');
    setEditingCategorySlug(null);
  };

  const handleSaveCategory = async () => {
    const name = categoryNameInput.trim();
    const slug = normalizeCategorySlug((categorySlugInput || slugifyCategoryName(name)).trim());

    if (!name || !slug) {
      Alert.alert('Atenção', 'Informe nome e slug da categoria');
      return;
    }

    const slugExists = menuCategories.some((item) => item.slug === slug && item.slug !== editingCategorySlug);
    if (slugExists) {
      Alert.alert('Atenção', 'Já existe uma categoria com este slug');
      return;
    }

    try {
      let next = [...menuCategories];

      if (editingCategorySlug) {
        next = next.map((item) =>
          item.slug === editingCategorySlug
            ? { ...item, slug, name }
            : item
        );

        if (categoria === editingCategorySlug) setCategoria(slug);
        if (editCategoria === editingCategorySlug) setEditCategoria(slug);
      } else {
        next.push({
          slug,
          name,
          active: true,
          order: next.length + 1,
        });
      }

      await saveMenuCategories(next);
      resetCategoryForm();
    } catch (error) {
      console.error('Erro ao salvar categoria:', error);
      Alert.alert('Erro', 'Não foi possível salvar a categoria');
    }
  };

  const handleEditCategory = (category: MenuCategory) => {
    setEditingCategorySlug(category.slug);
    setCategoryNameInput(category.name);
    setCategorySlugInput(category.slug);
  };

  const handleToggleCategory = async (slug: string) => {
    const target = menuCategories.find((item) => item.slug === slug);
    if (!target) return;

    const activeCount = menuCategories.filter((item) => item.active).length;
    if (target.active && activeCount <= 1) {
      Alert.alert('Atenção', 'Mantenha ao menos uma categoria ativa');
      return;
    }

    try {
      const next = menuCategories.map((item) =>
        item.slug === slug ? { ...item, active: !item.active } : item
      );
      await saveMenuCategories(next);
    } catch (error) {
      console.error('Erro ao alternar categoria:', error);
      Alert.alert('Erro', 'Não foi possível atualizar a categoria');
    }
  };

  const handleMoveCategory = async (slug: string, direction: 'up' | 'down') => {
    const idx = menuCategories.findIndex((item) => item.slug === slug);
    if (idx === -1) return;

    const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= menuCategories.length) return;

    try {
      const next = [...menuCategories];
      const temp = next[idx];
      next[idx] = next[swapIdx];
      next[swapIdx] = temp;
      await saveMenuCategories(next);
    } catch (error) {
      console.error('Erro ao reordenar categorias:', error);
      Alert.alert('Erro', 'Não foi possível reordenar');
    }
  };

  useEffect(() => {
    if (!categorias.length) return;
    if (!categorias.some((cat) => cat.value === categoria)) {
      setCategoria(categorias[0].value);
    }
    if (editCategoria && !categorias.some((cat) => cat.value === editCategoria)) {
      setEditCategoria(categorias[0].value);
    }
  }, [categorias, categoria, editCategoria]);

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
        setCompanySettings(settings);

        const { categories, createdFromLegacy } = getOrCreateMenuCategories(settings);
        const normalizedCategories = categories.map((item, index) => ({ ...item, order: index + 1 }));
        setMenuCategories(normalizedCategories);

        if (createdFromLegacy) {
          await persistCompanySettings(
            {
              categories: normalizedCategories,
              categoryOrder: buildCategoryOrder(normalizedCategories),
            },
            settings
          );
        }

        if (settings.temperosCaldos) setTemperosCaldos(settings.temperosCaldos);
        if (settings.temperosComidas) setTemperosComidas(settings.temperosComidas);
        if (settings.variacoesEspetinho && settings.variacoesEspetinho.length > 0) {
          setVariacoesEspetinho(settings.variacoesEspetinho);
        } else {
          const defaultVariacoes = ['Simples', 'com Arroz', 'com Macaxeira', 'Completo'];
          setVariacoesEspetinho(defaultVariacoes);
          try {
            await persistCompanySettings({ variacoesEspetinho: defaultVariacoes }, settings);
          } catch (persistError) {
            console.error('Error saving default espetinho variations:', persistError);
          }
        }
        console.log('[GerenciarCardapio] Pizza ingredients from DB:', settings.ingredientesPizza);
        if (settings.ingredientesPizza && settings.ingredientesPizza.length > 0) {
          setIngredientesPizza(settings.ingredientesPizza);
        } else {
          // Default ingredients if DB is empty
          const defaultIngredients = ['Milho', 'Bacon', 'Ovo', 'Cebola', 'Azeitona', 'Tomate', 'Pimentão', 'Orégano', 'Mussarela', 'Catupiry', 'Presunto', 'Frango'];
          setIngredientesPizza(defaultIngredients);

          // OPTIONAL: Save defaults to DB immediately so it's not "hardcoded" next time
          // We can do this silently
          try {
            await persistCompanySettings({ ingredientesPizza: defaultIngredients }, settings);
          } catch (persistError) {
            console.error('Error saving default ingredients:', persistError);
          }
        }

        setPizzaSubcategories(resolveConfiguredSubcategories(settings.pizzaSubcategories, []));
        setBebidaSubcategories(resolveConfiguredSubcategories(settings.bebidasSubcategories, []));

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
        const normalizedCategories = LEGACY_MENU_CATEGORIES.map((item, index) => ({ ...item, order: index + 1 }));
        setMenuCategories(normalizedCategories);
        try {
          await persistCompanySettings({
            categories: normalizedCategories,
            categoryOrder: buildCategoryOrder(normalizedCategories),
          }, {});
        } catch (persistError) {
          console.error('Erro ao criar categorias iniciais:', persistError);
        }

        // Defaults if no settings found
        const defaultSizes = [
          { name: 'Fatia', maxFlavors: 1 },
          { name: 'Broto', maxFlavors: 1 },
          { name: 'Média', maxFlavors: 2 },
          { name: 'Grande/Família', maxFlavors: 4 }
        ];
        setPizzaSubcategories([]);
        setBebidaSubcategories([]);
        setPizzaConfig({ sizes: defaultSizes, pricingMode: 'HIGHER' });
        setPizzaSizes(defaultSizes);
      }
    } catch (e) {
      console.error('Erro ao carregar configurações:', e);
    } finally {
      setLoadingTemperos(false);
    }
  };

  useEffect(() => {
    if (categoria === 'pizza') {
      if (subcategoria || pizzaSubcategories.length === 0) return;
      setSubcategoria(pizzaSubcategories[0]);
      return;
    }

    if (isBebidaCategorySlug(categoria)) {
      if (subcategoria || bebidaSubcategories.length === 0) return;
      setSubcategoria(bebidaSubcategories[0]);
      return;
    }

    if (subcategoria) {
      setSubcategoria('');
    }
  }, [categoria, pizzaSubcategories, bebidaSubcategories, subcategoria]);

  const carregarProdutos = async () => {
    try {
      setLoadingProdutos(true);
      if (!user?.companyId) {
        setLoadingProdutos(false);
        return;
      }

      console.log('Fetching products from Supabase for Manage Menu...');

      // Optimized query: select only needed fields instead of SELECT *
      // Note: available column now always mirrors active (enforced by constraint)
      const { data, error } = await supabase
        .from('products')
        .select('id, name, description, price, category, subcategory, active, created_at, prices, ingredients, custom_ingredients, accompaniments, inventory_items, image_url')
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
        description: p.description || '',
        price: Number(p.price),
        category: p.category,
        subcategory: p.subcategory || null,
        active: p.active, // available is now always synchronized to active via constraint
        createdAt: new Date(p.created_at).getTime(),
        prices: p.prices || {},
        ingredients: p.ingredients || [],
        customIngredients: p.custom_ingredients || '',
        accompaniments: normalizeStringArray(p.accompaniments),
        inventoryItems: p.inventory_items || [],
        image_url: p.image_url || null,
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

    if (isBebidaCategorySlug(categoria) && bebidaSubcategories.length === 0) {
      Alert.alert('Atenção', 'Cadastre ao menos uma subcategoria de bebidas antes de criar produtos nesta categoria.');
      return;
    }

    if (criarVariacoes && isEspetinhoCategorySlug(categoria)) {
      const algumVazio = variacoesEspetinho.some(v => !precosVariacoes[v] || precosVariacoes[v] === '');
      if (algumVazio) {
        Alert.alert('Atenção', 'Preencha todos os preços das variações');
        return;
      }

      try {
        setLoading(true);
        const acompanhamentos = normalizeStringArray(acompanhamentosEspetinho);
        const variacoes = variacoesEspetinho.map(v => ({
          company_id: user.companyId,
          name: `${nome.trim()} ${v}`,
          price: parseFloat(precosVariacoes[v].replace(',', '.')) || 0,
          category: categoria,
          accompaniments: acompanhamentos,
          available: true // DB Column is available
        }));

        const { data, error } = await supabase.from('products').insert(variacoes).select('id');

        if (error) {
          const errorMsg = handleDatabaseError(error, nome.trim());
          Alert.alert('Erro', errorMsg);
          return;
        }

        if (newProductImageUrl && data?.length) {
          for (const created of data) {
            const uploadedUrl = await uploadImageForCreatedProduct(created.id);
            if (uploadedUrl) {
              await supabase.from('products').update({ image_url: uploadedUrl }).eq('id', created.id);
            }
          }
        }

        Alert.alert('Sucesso', 'Cadastrado com sucesso!');
        setNome('');
        setPrecosVariacoes({});
        setAcompanhamentosEspetinho([]);
        setNovoAcompanhamento('');
        setNewProductImageUrl(null);
        setNewProductImageFile(null);
        setNewProductImagePreview(null);
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

        const { data, error } = await supabase.from('products').insert(novoProduto).select('id').single();
        if (error) {
          const errorMsg = handleDatabaseError(error, nome.trim());
          Alert.alert('Erro', errorMsg);
          return;
        }

        if (newProductImageUrl && data?.id) {
          const uploadedUrl = await uploadImageForCreatedProduct(data.id);
          if (uploadedUrl) {
            await supabase.from('products').update({ image_url: uploadedUrl }).eq('id', data.id);
          }
        }

        Alert.alert('Sucesso', 'Pizza cadastrada!');
        setNome('');
        setSubcategoria(''); // Reset subcategory
        setPrecosPizza({});
        setIngredientesSelecionados([]);
        setIngredientesPersonalizados('');
        setNewProductImageUrl(null);
        setNewProductImageFile(null);
        setNewProductImagePreview(null);
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
        const novoProduto: any = {
          company_id: user.companyId,
          name: nome.trim(),
          price: parseFloat(preco.toString().replace(',', '.')) || 0,
          category: categoria,
          available: true // DB Column is available
        };

        if (isBebidaCategorySlug(categoria)) {
          novoProduto.subcategory = subcategoria || bebidaSubcategories[0] || null;
        }

        if (isEspetinhoCategorySlug(categoria)) {
          novoProduto.accompaniments = normalizeStringArray(acompanhamentosEspetinho);
        }

        if (isIngredientsCategorySlug(categoria)) {
          novoProduto.ingredients = ingredientesSelecionados;
          novoProduto.custom_ingredients = ingredientesPersonalizados;
        }

        const { data, error } = await supabase.from('products').insert(novoProduto).select('id').single();

        if (error) {
          const errorMsg = handleDatabaseError(error, nome.trim());
          Alert.alert('Erro', errorMsg);
          return;
        }

        if (newProductImageUrl && data?.id) {
          const uploadedUrl = await uploadImageForCreatedProduct(data.id);
          if (uploadedUrl) {
            await supabase.from('products').update({ image_url: uploadedUrl }).eq('id', data.id);
          }
        }

        const _nomeSalvo = nome.trim();
        const _idSalvo = data?.id;
        setNome('');
        setPreco('');
        if (isIngredientsCategorySlug(categoria)) {
          setIngredientesSelecionados([]);
          setIngredientesPersonalizados('');
        }
        if (isEspetinhoCategorySlug(categoria)) {
          setAcompanhamentosEspetinho([]);
          setNovoAcompanhamento('');
        }
        setNewProductImageUrl(null);
        setNewProductImageFile(null);
        setNewProductImagePreview(null);
        carregarProdutos();
        if (normalizeCategorySlug(categoria) === 'porcao' && _idSalvo) {
          setProductForAdicionais({ id: _idSalvo, name: _nomeSalvo });
          setShowAdicionaisModal(true);
        } else {
          Alert.alert('Sucesso', 'Produto cadastrado!');
        }
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
    if (tipoTemperoAtivo === 'pizzaCategorias') return pizzaSubcategories || [];
    return variacoesEspetinho || [];
  };

  const salvarListas = async (
    novaListaCaldos?: string[],
    novaListaComidas?: string[],
    novaListaVariacoes?: string[],
    novaListaPizzas?: string[],
    novaListaPizzaSubcategorias?: string[],
    novaListaBebidasSubcategorias?: string[]
  ) => {
    if (!user?.companyId) return;

    // Construct new settings object merge
    const updates: any = {};
    if (novaListaCaldos !== undefined) updates.temperosCaldos = novaListaCaldos;
    if (novaListaComidas !== undefined) updates.temperosComidas = novaListaComidas;
    if (novaListaVariacoes !== undefined) updates.variacoesEspetinho = novaListaVariacoes;
    if (novaListaPizzas !== undefined) updates.ingredientesPizza = novaListaPizzas;
    if (novaListaPizzaSubcategorias !== undefined) updates.pizzaSubcategories = novaListaPizzaSubcategorias;
    if (novaListaBebidasSubcategorias !== undefined) updates.bebidasSubcategories = novaListaBebidasSubcategorias;

    // Always include pizzaConfig to persist size changes if any
    updates.pizzaConfig = { ...pizzaConfig, sizes: pizzaSizes };

    // We need to fetch current settings first to merge deeply? Supabase UPDATE replaces the column content for JSONB unless we use a function.
    // Actually, simple UPDATE on a JSONB column replaces the whole value or needs specific syntax.
    // Safer to read-modify-write for JSONB columns if we don't use 'jsonb_set'.
    // Or we can just read what we have in state (which should be current) + updates.

    // Let's assume the state variables (temperosCaldos etc) are up to date.

    try {
      await persistCompanySettings({
        temperosCaldos: novaListaCaldos !== undefined ? novaListaCaldos : temperosCaldos,
        temperosComidas: novaListaComidas !== undefined ? novaListaComidas : temperosComidas,
        variacoesEspetinho: novaListaVariacoes !== undefined ? novaListaVariacoes : variacoesEspetinho,
        ingredientesPizza: novaListaPizzas !== undefined ? novaListaPizzas : ingredientesPizza,
        pizzaSubcategories: novaListaPizzaSubcategorias !== undefined ? novaListaPizzaSubcategorias : pizzaSubcategories,
        bebidasSubcategories: novaListaBebidasSubcategorias !== undefined ? novaListaBebidasSubcategorias : bebidaSubcategories,
        pizzaConfig: { ...pizzaConfig, sizes: pizzaSizes },
      });
    } catch (e) {
      console.error('Erro ao salvar configurações:', e);
      Alert.alert('Erro', 'Falha ao salvar configurações');
    }
  };

  const toggleGrupoAtivo = async (variacoes: Product[], todosAtivos: boolean) => {
    try {
      const ids = variacoes.map(v => v.id);
      // Keep active and available synchronized at write time to satisfy DB constraint.
      const { error } = await supabase
        .from('products')
        .update({ active: !todosAtivos, available: !todosAtivos })
        .in('id', ids);

      if (error) throw error;
      carregarProdutos();
    } catch (e) {
      console.error(e);
      Alert.alert('Erro', 'Falha ao atualizar status');
    }
  };

  /**
   * Abre o seletor de arquivo (web) e faz upload para Supabase Storage.
   * Retorna a URL pública ou null em caso de erro/cancelamento.
   * Path: menu-images/{company_id}/{product_id}/foto.{ext}
   */
  const uploadProductImage = (productId: string): Promise<string | null> => {
    if (Platform.OS !== 'web') {
      Alert.alert('Info', 'Upload de imagem disponível apenas na versão web.');
      return Promise.resolve(null);
    }
    return new Promise((resolve) => {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/jpeg,image/jpg,image/png,image/webp';
      input.onchange = async () => {
        const file = input.files?.[0];
        if (!file) { resolve(null); return; }
        if (file.size > 5 * 1024 * 1024) {
          Alert.alert('Erro', 'Imagem muito grande. Máximo 5 MB.');
          resolve(null);
          return;
        }
        setUploadingImage(true);
        try {
          const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg';
          const path = `${user!.companyId}/${productId}/foto.${ext}`;
          const { error: upError } = await supabase.storage
            .from('menu-images')
            .upload(path, file, { upsert: true, contentType: file.type });
          if (upError) {
            Alert.alert('Erro', 'Falha ao enviar imagem: ' + upError.message);
            resolve(null);
            return;
          }
          const { data: urlData } = supabase.storage.from('menu-images').getPublicUrl(path);
          resolve(urlData.publicUrl);
        } catch {
          Alert.alert('Erro', 'Falha ao enviar imagem.');
          resolve(null);
        } finally {
          setUploadingImage(false);
        }
      };
      input.click();
    });
  };

  const uploadImageForCreatedProduct = async (productId: string): Promise<string | null> => {
    if (!newProductImageFile || !user?.companyId) return null;
    setUploadingImage(true);
    try {
      const ext = newProductImageFile.name.split('.').pop()?.toLowerCase() || 'jpg';
      const path = `${user.companyId}/${productId}/foto.${ext}`;
      const { error: upError } = await supabase.storage
        .from('menu-images')
        .upload(path, newProductImageFile, { upsert: true, contentType: newProductImageFile.type });
      if (upError) {
        Alert.alert('Erro', 'Falha ao enviar imagem: ' + upError.message);
        return null;
      }
      const { data: urlData } = supabase.storage.from('menu-images').getPublicUrl(path);
      return urlData.publicUrl;
    } finally {
      setUploadingImage(false);
    }
  };

  const pickNewProductImage = (): Promise<void> => {
    if (Platform.OS !== 'web') return Promise.resolve();
    return new Promise((resolve) => {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/jpeg,image/jpg,image/png,image/webp';
      input.onchange = () => {
        const file = input.files?.[0];
        if (!file) {
          resolve();
          return;
        }
        if (file.size > 5 * 1024 * 1024) {
          Alert.alert('Erro', 'Imagem muito grande. Máximo 5 MB.');
          resolve();
          return;
        }
        setNewProductImageFile(file);
        setNewProductImagePreview(URL.createObjectURL(file));
        setNewProductImageUrl('pending-upload');
        resolve();
      };
      input.click();
    });
  };

  const abrirEdicao = (produto: Product) => {
    setEditando(produto);
    setEditNome(produto.name);
    setEditCategoria(produto.category);
    setEditAcompanhamentosEspetinho(normalizeStringArray(produto.accompaniments));
    setEditNovoAcompanhamento('');

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
      setSubcategoria(isBebidaCategorySlug(produto.category) ? (produto.subcategory || bebidaSubcategories[0] || '') : '');
      if (isIngredientsCategorySlug(produto.category)) {
        setIngredientesSelecionados(produto.ingredients || []);
        setIngredientesPersonalizados(produto.customIngredients || '');
      } else {
        setIngredientesSelecionados([]);
        setIngredientesPersonalizados('');
      }
      setEditPreco(produto.price?.toString() || '0');
    }

    setEditImageUrl(produto.image_url || null);
    setShowEditModal(true);
  };

  const salvarEdicao = async () => {
    if (!editNome.trim()) {
      Alert.alert('Atenção', 'Digite o nome do produto');
      return;
    }

    if (!editando || !user?.companyId) return;

    if (isBebidaCategorySlug(editCategoria) && bebidaSubcategories.length === 0) {
      Alert.alert('Atenção', 'Cadastre ao menos uma subcategoria de bebidas antes de salvar produtos nesta categoria.');
      return;
    }

    const isPizza = normalizeCategorySlug(editCategoria).includes('pizza');

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
        updateData.accompaniments = [];
      } else {
        // Update non-pizza fields
        const sanitizedPreco = editPreco?.toString().replace(',', '.');
        const val = parseFloat(sanitizedPreco);
        updateData.price = val;
        updateData.subcategory = isBebidaCategorySlug(editCategoria)
          ? (subcategoria || bebidaSubcategories[0] || null)
          : null;
        if (isIngredientsCategorySlug(editCategoria)) {
          updateData.ingredients = ingredientesSelecionados;
          updateData.custom_ingredients = ingredientesPersonalizados;
        }
        if (isEspetinhoCategorySlug(editCategoria)) {
          updateData.accompaniments = normalizeStringArray(editAcompanhamentosEspetinho);
        } else {
          updateData.accompaniments = [];
        }
      }

      // Persist image_url (null clears it, string saves it)
      updateData.image_url = editImageUrl;

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

      const args: [string[] | undefined, string[] | undefined, string[] | undefined, string[] | undefined, string[] | undefined] = [undefined, undefined, undefined, undefined, undefined];

      if (tipoTemperoAtivo === 'caldos') {
        setTemperosCaldos(novos);
        args[0] = novos;
      } else if (tipoTemperoAtivo === 'comidas') {
        setTemperosComidas(novos);
        args[1] = novos;
      } else if (tipoTemperoAtivo === 'pizza') {
        setIngredientesPizza(novos);
        args[3] = novos;
      } else if (tipoTemperoAtivo === 'pizzaCategorias') {
        setPizzaSubcategories(novos);
        args[4] = novos;
        if (subcategoria && !novos.includes(subcategoria)) {
          setSubcategoria(novos[0] || '');
        }
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
      const args: [string[] | undefined, string[] | undefined, string[] | undefined, string[] | undefined, string[] | undefined] = [undefined, undefined, undefined, undefined, undefined];
      if (tipoTemperoAtivo === 'caldos') {
        setTemperosCaldos(novos);
        args[0] = novos;
      } else if (tipoTemperoAtivo === 'comidas') {
        setTemperosComidas(novos);
        args[1] = novos;
      } else if (tipoTemperoAtivo === 'pizza') {
        setIngredientesPizza(novos);
        args[3] = novos;
      } else if (tipoTemperoAtivo === 'pizzaCategorias') {
        setPizzaSubcategories(novos);
        args[4] = novos;
        if (subcategoria && !novos.includes(subcategoria)) {
          setSubcategoria(novos[0] || '');
        }
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

  const salvarPizzaSubcategorias = async (lista: string[]) => {
    const sanitized = lista
      .map((item) => item.trim())
      .filter((item) => item.length > 0)
      .filter((item, index, arr) => arr.indexOf(item) === index);

    setPizzaSubcategories(sanitized);
    if (subcategoria && !sanitized.includes(subcategoria)) {
      setSubcategoria(sanitized[0] || '');
    }

    await salvarListas(undefined, undefined, undefined, undefined, sanitized);
  };

  const salvarBebidaSubcategorias = async (lista: string[]) => {
    const sanitized = lista
      .map((item) => item.trim())
      .filter((item) => item.length > 0)
      .filter((item, index, arr) => arr.indexOf(item) === index);

    setBebidaSubcategories(sanitized);
    if (isBebidaCategorySlug(categoria) && subcategoria && !sanitized.includes(subcategoria)) {
      setSubcategoria(sanitized[0] || '');
    }

    await salvarListas(undefined, undefined, undefined, undefined, undefined, sanitized);
  };

  const salvarPizzaSubcategoria = async () => {
    const value = pizzaSubcategoryInput.trim();
    if (!value) {
      Alert.alert('Atenção', 'Digite o nome da subcategoria da pizza');
      return;
    }

    const duplicateIndex = pizzaSubcategories.findIndex((item) => item.toLowerCase() === value.toLowerCase());
    if (duplicateIndex >= 0 && duplicateIndex !== editPizzaSubcategoryIndex) {
      Alert.alert('Atenção', 'Esta subcategoria já existe');
      return;
    }

    try {
      const updated = [...pizzaSubcategories];
      if (editPizzaSubcategoryIndex >= 0) {
        const previous = updated[editPizzaSubcategoryIndex];
        updated[editPizzaSubcategoryIndex] = value;
        if (subcategoria === previous) {
          setSubcategoria(value);
        }
      } else {
        updated.push(value);
      }

      await salvarPizzaSubcategorias(updated);
      setPizzaSubcategoryInput('');
      setEditPizzaSubcategoryIndex(-1);
    } catch (error) {
      console.error('Erro ao salvar subcategoria de pizza:', error);
      Alert.alert('Erro', 'Não foi possível salvar a subcategoria da pizza');
    }
  };

  const editarPizzaSubcategoria = (index: number) => {
    setPizzaSubcategoryInput(pizzaSubcategories[index] || '');
    setEditPizzaSubcategoryIndex(index);
  };

  const cancelarEdicaoPizzaSubcategoria = () => {
    setPizzaSubcategoryInput('');
    setEditPizzaSubcategoryIndex(-1);
  };

  const removerPizzaSubcategoria = async (index: number) => {
    const toRemove = pizzaSubcategories[index];
    const updated = pizzaSubcategories.filter((_, idx) => idx !== index);

    try {
      await salvarPizzaSubcategorias(updated);
      if (subcategoria === toRemove) {
        setSubcategoria(updated[0] || '');
      }
      if (editPizzaSubcategoryIndex === index) {
        cancelarEdicaoPizzaSubcategoria();
      }
    } catch (error) {
      console.error('Erro ao remover subcategoria de pizza:', error);
      Alert.alert('Erro', 'Não foi possível remover a subcategoria da pizza');
    }
  };

  const salvarBebidaSubcategoria = async () => {
    const value = bebidaSubcategoryInput.trim();
    if (!value) {
      Alert.alert('Atenção', 'Digite o nome da subcategoria de bebidas');
      return;
    }

    const duplicateIndex = bebidaSubcategories.findIndex((item) => item.toLowerCase() === value.toLowerCase());
    if (duplicateIndex >= 0 && duplicateIndex !== editBebidaSubcategoryIndex) {
      Alert.alert('Atenção', 'Esta subcategoria já existe');
      return;
    }

    try {
      const updated = [...bebidaSubcategories];
      if (editBebidaSubcategoryIndex >= 0) {
        const previous = updated[editBebidaSubcategoryIndex];
        updated[editBebidaSubcategoryIndex] = value;
        if (subcategoria === previous) {
          setSubcategoria(value);
        }
      } else {
        updated.push(value);
      }

      await salvarBebidaSubcategorias(updated);
      setBebidaSubcategoryInput('');
      setEditBebidaSubcategoryIndex(-1);
    } catch (error) {
      console.error('Erro ao salvar subcategoria de bebidas:', error);
      Alert.alert('Erro', 'Não foi possível salvar a subcategoria de bebidas');
    }
  };

  const editarBebidaSubcategoria = (index: number) => {
    setBebidaSubcategoryInput(bebidaSubcategories[index] || '');
    setEditBebidaSubcategoryIndex(index);
  };

  const cancelarEdicaoBebidaSubcategoria = () => {
    setBebidaSubcategoryInput('');
    setEditBebidaSubcategoryIndex(-1);
  };

  const removerBebidaSubcategoria = async (index: number) => {
    const toRemove = bebidaSubcategories[index];
    const updated = bebidaSubcategories.filter((_, idx) => idx !== index);

    try {
      await salvarBebidaSubcategorias(updated);
      if (subcategoria === toRemove) {
        setSubcategoria(updated[0] || '');
      }
      if (editBebidaSubcategoryIndex === index) {
        cancelarEdicaoBebidaSubcategoria();
      }
    } catch (error) {
      console.error('Erro ao remover subcategoria de bebidas:', error);
      Alert.alert('Erro', 'Não foi possível remover a subcategoria de bebidas');
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
      try {
        await persistCompanySettings({ pizzaConfig: { ...pizzaConfig, sizes: novos } });
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
      try {
        await persistCompanySettings({ pizzaConfig: { ...pizzaConfig, sizes: novos } });
      } catch (e) { console.error(e); }
    }
  };

  const toggleTamanhoAtivo = async (index: number) => {
    const novos = [...pizzaSizes];
    novos[index] = { ...novos[index], active: !novos[index].active };
    setPizzaSizes(novos);


    if (user?.companyId) {
      try {
        await persistCompanySettings({ pizzaConfig: { ...pizzaConfig, sizes: novos } });
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
    <ScreenScaffold
      title="Gerenciar Cardápio"
      leftAction={onClose ? { label: 'Voltar', onPress: onClose } : undefined}
    >
      <KeyboardWrapper style={styles.container}>
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
              placeholderTextColor={colors.textSecondary}
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
                    if (isEspetinhoCategorySlug(cat.value)) {
                      setCriarVariacoes(true);
                    } else {
                      setCriarVariacoes(false);
                      setAcompanhamentosEspetinho([]);
                      setNovoAcompanhamento('');
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

            {isEspetinhoCategorySlug(categoria) && (
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

            {isEspetinhoCategorySlug(categoria) && (
              <>
                <Text style={styles.label}>Acompanhamentos fixos do espetinho:</Text>
                <View style={styles.addTemperoRow}>
                  <TextInput
                    style={styles.inputTempero}
                    placeholder="Ex: Farofa"
                    placeholderTextColor={colors.textSecondary}
                    value={novoAcompanhamento}
                    onChangeText={setNovoAcompanhamento}
                  />
                  <TouchableOpacity
                    style={styles.addBtn}
                    onPress={() => {
                      const value = novoAcompanhamento.trim();
                      if (!value) return;
                      if (acompanhamentosEspetinho.includes(value)) return;
                      setAcompanhamentosEspetinho((prev) => [...prev, value]);
                      setNovoAcompanhamento('');
                    }}
                  >
                    <Ionicons name="add" size={24} color={colors.white} />
                  </TouchableOpacity>
                </View>

                {acompanhamentosEspetinho.length > 0 && (
                  <View style={styles.listaTemperos}>
                    {acompanhamentosEspetinho.map((item, index) => (
                      <View key={`${item}-${index}`} style={styles.temperoRow}>
                        <Text style={styles.temperoText}>{item}</Text>
                        <TouchableOpacity
                          onPress={() => {
                            setAcompanhamentosEspetinho((prev) => prev.filter((_, i) => i !== index));
                          }}
                        >
                          <Ionicons name="trash-outline" size={20} color={colors.danger} />
                        </TouchableOpacity>
                      </View>
                    ))}
                  </View>
                )}
              </>
            )}

            {criarVariacoes && isEspetinhoCategorySlug(categoria) ? (
              <>
                <Text style={styles.label}>Preços das variações:</Text>
                <View style={styles.variacoesGrid}>
                  {variacoesEspetinho.map((variacao, idx) => (
                    <View key={idx} style={styles.variacaoField}>
                      <Text style={styles.variacaoLabel}>{variacao}</Text>
                      <TextInput
                        style={styles.inputVariacao}
                        placeholder="0.00"
                        placeholderTextColor={colors.textSecondary}
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
                  {pizzaSubcategories.map(cat => (
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
                    <Ionicons name="add" size={24} color={colors.white} />
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
                          <Ionicons name="trash-outline" size={20} color={colors.danger} />
                        </TouchableOpacity>
                      </View>
                    ))}
                  </View>
                )}

                <Text style={styles.label}>Ingredientes Personalizados (opcional):</Text>
                <TextInput
                  style={[styles.input, { height: 60 }]}
                  placeholder="Ex: Molho especial da casa..."
                  placeholderTextColor={colors.textSecondary}
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
                        placeholderTextColor={colors.textSecondary}
                        value={precosPizza[size.name] !== undefined ? String(precosPizza[size.name]) : ''}
                        onChangeText={(text) => setPrecosPizza(prev => ({ ...prev, [size.name]: text }))}
                        keyboardType="numeric"
                      />
                    </View>
                  ))}
                </View>
              </>
            ) : isBebidaCategorySlug(categoria) ? (
              <>
                <Text style={styles.label}>Subcategoria de Bebidas:</Text>
                {bebidaSubcategories.length === 0 ? (
                  <Text style={styles.loadingText}>Cadastre subcategorias de bebidas na seção de configurações antes de criar produtos.</Text>
                ) : (
                  <View style={styles.categoriaButtons}>
                    {bebidaSubcategories.map((item) => (
                      <TouchableOpacity
                        key={item}
                        style={[
                          styles.categoriaBtn,
                          subcategoria === item && styles.categoriaBtnActive
                        ]}
                        onPress={() => setSubcategoria(item)}
                      >
                        <Text style={[
                          styles.categoriaBtnText,
                          subcategoria === item && styles.categoriaBtnTextActive
                        ]}>
                          {item}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}

                <TextInput
                  style={styles.input}
                  placeholder="Preço (ex: 12.00)"
                  placeholderTextColor={colors.textSecondary}
                  value={preco}
                  onChangeText={setPreco}
                  keyboardType="numeric"
                />
              </>
            ) : (
              <>
                <TextInput
                  style={styles.input}
                  placeholder="Preço (ex: 12.00)"
                  placeholderTextColor={colors.textSecondary}
                  value={preco}
                  onChangeText={setPreco}
                  keyboardType="numeric"
                />
                {normalizeCategorySlug(categoria) === 'porcao' && (
                  <Text style={{ fontSize: 12, color: colors.primary, marginBottom: 8, marginTop: 4, backgroundColor: '#E8F5E9', padding: 8, borderRadius: 6 }}>
                    🍟 Após cadastrar, o modal de adicionais abrirá automaticamente para você configurar os extras desta porção.
                  </Text>
                )}
                {isIngredientsCategorySlug(categoria) && (
                  <>
                    <Text style={styles.label}>Ingredientes:</Text>
                    <View style={styles.ingredientesContainer}>
                      {ingredientesSelecionados.map((ing, idx) => (
                        <View key={idx} style={styles.ingredienteChip}>
                          <Text style={styles.ingredienteText}>{ing}</Text>
                          <TouchableOpacity onPress={() => setIngredientesSelecionados(prev => prev.filter((_, i) => i !== idx))}>
                            <Text style={styles.ingredienteRemove}>×</Text>
                          </TouchableOpacity>
                        </View>
                      ))}
                    </View>
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
                            setIngredientesSelecionados(prev => [...prev, novoIngrediente.trim()]);
                            setNovoIngrediente('');
                          }
                        }}
                      >
                        <Text style={styles.addIngredienteBtnText}>+</Text>
                      </TouchableOpacity>
                    </View>
                  </>
                )}
              </>
            )}

            <Text style={styles.label}>Foto do produto:</Text>
            <Text style={{ fontSize: 11, color: colors.textSecondary, marginBottom: 8, marginTop: -4 }}>
              {'📐 Ideal: 800×600 px, formato 4:3  •  JPEG ou WebP  •  Máx 5 MB\n'}
              {'💡 Comprima antes de enviar: tinypng.com ou squoosh.app'}
            </Text>
            {newProductImagePreview ? (
              <View style={{ marginBottom: 12 }}>
                {/* @ts-ignore — web-only src */}
                <img
                  src={newProductImagePreview}
                  alt="Prévia da foto do novo produto"
                  style={{ width: 120, height: 90, objectFit: 'cover', borderRadius: 8, marginBottom: 6 }}
                />
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  <TouchableOpacity
                    style={[styles.salvarBtn, { flex: 1, paddingVertical: 8, marginTop: 0, backgroundColor: colors.secondary }]}
                    onPress={pickNewProductImage}
                  >
                    <Text style={[styles.salvarBtnText, { fontSize: 13 }]}>🔄 Trocar foto</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.salvarBtn, { flex: 1, paddingVertical: 8, marginTop: 0, backgroundColor: '#D32F2F' }]}
                    onPress={() => {
                      setNewProductImageUrl(null);
                      setNewProductImageFile(null);
                      setNewProductImagePreview(null);
                    }}
                  >
                    <Text style={[styles.salvarBtnText, { fontSize: 13 }]}>🗑️ Remover</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              <TouchableOpacity
                style={[styles.salvarBtn, { paddingVertical: 10, marginTop: 0, marginBottom: 12, backgroundColor: colors.secondary }]}
                onPress={pickNewProductImage}
              >
                <Text style={[styles.salvarBtnText, { fontSize: 13 }]}>📷 Selecionar foto</Text>
              </TouchableOpacity>
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

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🗂️ Gerenciar Categorias</Text>
          <View style={styles.form}>
            <Text style={styles.label}>Nome da categoria</Text>
            <TextInput
              style={styles.input}
              value={categoryNameInput}
              onChangeText={(text) => {
                setCategoryNameInput(text);
                if (!editingCategorySlug) {
                  setCategorySlugInput(slugifyCategoryName(text));
                }
              }}
              placeholder="Ex: Sobremesa"
              placeholderTextColor={colors.textSecondary}
            />

            <Text style={styles.label}>Slug</Text>
            <TextInput
              style={styles.input}
              value={categorySlugInput}
              onChangeText={setCategorySlugInput}
              placeholder="Ex: sobremesa"
              placeholderTextColor={colors.textSecondary}
              autoCapitalize="none"
            />

            <View style={styles.modalButtons}>
              <TouchableOpacity style={[styles.modalBtn, styles.saveBtn]} onPress={handleSaveCategory}>
                <Text style={styles.saveBtnText}>{editingCategorySlug ? 'Atualizar Categoria' : 'Criar Categoria'}</Text>
              </TouchableOpacity>
              {editingCategorySlug && (
                <TouchableOpacity style={[styles.modalBtn, styles.cancelBtn]} onPress={resetCategoryForm}>
                  <Text style={styles.cancelBtnText}>Cancelar</Text>
                </TouchableOpacity>
              )}
            </View>

            <View style={styles.listaTemperos}>
              {[...menuCategories].sort((a, b) => a.order - b.order).map((item, index) => (
                <View key={item.slug} style={styles.temperoRow}>
                  <Text style={styles.temperoText}>{toCategoryOption(item).label}</Text>
                  <View style={{ flexDirection: 'row' }}>
                    <TouchableOpacity onPress={() => handleMoveCategory(item.slug, 'up')} style={{ marginRight: 10 }} disabled={index === 0}>
                      <Ionicons name="arrow-up" size={18} color={index === 0 ? colors.textSecondary : colors.text} />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => handleMoveCategory(item.slug, 'down')} style={{ marginRight: 10 }} disabled={index === menuCategories.length - 1}>
                      <Ionicons name="arrow-down" size={18} color={index === menuCategories.length - 1 ? colors.textSecondary : colors.text} />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => handleEditCategory(item)} style={{ marginRight: 10 }}>
                      <Ionicons name="pencil" size={18} color={colors.text} />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => handleToggleCategory(item.slug)}>
                      <Ionicons name={item.active ? 'eye' : 'eye-off'} size={18} color={item.active ? colors.success : colors.textSecondary} />
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🍕 Gerenciar Subcategorias da Pizza</Text>
          <View style={styles.form}>
            <Text style={styles.label}>Subcategoria da Pizza</Text>
            <View style={styles.addTemperoRow}>
              <TextInput
                style={styles.inputTempero}
                placeholder={editPizzaSubcategoryIndex >= 0 ? 'Editar subcategoria...' : 'Ex: Tradicional'}
                placeholderTextColor={colors.textSecondary}
                value={pizzaSubcategoryInput}
                onChangeText={setPizzaSubcategoryInput}
              />
              <TouchableOpacity style={styles.addBtn} onPress={salvarPizzaSubcategoria}>
                <Ionicons name={editPizzaSubcategoryIndex >= 0 ? 'checkmark' : 'add'} size={24} color={colors.white} />
              </TouchableOpacity>
              {editPizzaSubcategoryIndex >= 0 && (
                <TouchableOpacity style={[styles.addBtn, { backgroundColor: colors.textSecondary }]} onPress={cancelarEdicaoPizzaSubcategoria}>
                  <Ionicons name="close" size={24} color={colors.white} />
                </TouchableOpacity>
              )}
            </View>

            <View style={styles.listaTemperos}>
              {pizzaSubcategories.map((item, index) => (
                <View key={`${item}-${index}`} style={styles.temperoRow}>
                  <Text style={styles.temperoText}>{item}</Text>
                  <View style={{ flexDirection: 'row' }}>
                    <TouchableOpacity onPress={() => editarPizzaSubcategoria(index)} style={{ marginRight: 10 }}>
                      <Ionicons name="pencil" size={20} color={colors.text} />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => removerPizzaSubcategoria(index)}>
                      <Ionicons name="trash-outline" size={20} color={colors.danger} />
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
              {pizzaSubcategories.length === 0 && (
                <Text style={styles.loadingText}>Nenhuma subcategoria cadastrada.</Text>
              )}
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🥤 Gerenciar Subcategorias de Bebidas</Text>
          <View style={styles.form}>
            <Text style={styles.label}>Subcategoria de Bebidas</Text>
            <View style={styles.addTemperoRow}>
              <TextInput
                style={styles.inputTempero}
                placeholder={editBebidaSubcategoryIndex >= 0 ? 'Editar subcategoria...' : 'Ex: Drinks'}
                placeholderTextColor={colors.textSecondary}
                value={bebidaSubcategoryInput}
                onChangeText={setBebidaSubcategoryInput}
              />
              <TouchableOpacity style={styles.addBtn} onPress={salvarBebidaSubcategoria}>
                <Ionicons name={editBebidaSubcategoryIndex >= 0 ? 'checkmark' : 'add'} size={24} color={colors.white} />
              </TouchableOpacity>
              {editBebidaSubcategoryIndex >= 0 && (
                <TouchableOpacity style={[styles.addBtn, { backgroundColor: colors.textSecondary }]} onPress={cancelarEdicaoBebidaSubcategoria}>
                  <Ionicons name="close" size={24} color={colors.white} />
                </TouchableOpacity>
              )}
            </View>

            <View style={styles.listaTemperos}>
              {bebidaSubcategories.map((item, index) => (
                <View key={`${item}-${index}`} style={styles.temperoRow}>
                  <Text style={styles.temperoText}>{item}</Text>
                  <View style={{ flexDirection: 'row' }}>
                    <TouchableOpacity onPress={() => editarBebidaSubcategoria(index)} style={{ marginRight: 10 }}>
                      <Ionicons name="pencil" size={20} color={colors.text} />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => removerBebidaSubcategoria(index)}>
                      <Ionicons name="trash-outline" size={20} color={colors.danger} />
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
              {bebidaSubcategories.length === 0 && (
                <Text style={styles.loadingText}>Nenhuma subcategoria de bebidas cadastrada.</Text>
              )}
            </View>
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
                style={[styles.filtroBtn, tipoTemperoAtivo === 'pizzaCategorias' && styles.filtroBtnActive]}
                onPress={() => { setTipoTemperoAtivo('pizzaCategorias'); setEditTemperoIndex(-1); setNovoTempero(''); }}
              >
                <Text style={[styles.filtroBtnText, tipoTemperoAtivo === 'pizzaCategorias' && styles.filtroBtnTextActive]}>
                  Categorias Pizza
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
                    <Ionicons name={editTamanhoIndex >= 0 ? "checkmark" : "add"} size={24} color={colors.white} />
                  </TouchableOpacity>
                  {editTamanhoIndex >= 0 && (
                    <TouchableOpacity style={[styles.addBtn, { backgroundColor: colors.textSecondary }]} onPress={cancelarEdicaoTamanho}>
                      <Ionicons name="close" size={24} color={colors.white} />
                    </TouchableOpacity>
                  )}
                </View>

                {/* LISTING SIZES WITH SORTING */}
                {pizzaSizes.map((size, index) => ({ ...size, originalIndex: index }))
                  .map((size, idx) => (
                    <View key={idx} style={[styles.temperoRow, size.active === false && { opacity: 0.5, backgroundColor: colors.background }]}>
                      <Text style={styles.temperoText}>
                        {size.name} ({size.maxFlavors} sabores) {size.active === false ? '(Desativado)' : ''}
                      </Text>
                      <View style={{ flexDirection: 'row' }}>
                        <TouchableOpacity onPress={() => toggleTamanhoAtivo(size.originalIndex)} style={{ marginRight: 10 }}>
                          <Ionicons name={size.active !== false ? "eye" : "eye-off"} size={20} color={size.active !== false ? colors.success : colors.textSecondary} />
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => iniciarEdicaoTamanho(size.originalIndex)}>
                          <Ionicons name="pencil" size={20} color={colors.text} />
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => removerTamanhoPizza(size.originalIndex)}>
                          <Ionicons name="trash-outline" size={20} color={colors.danger} />
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
                    <Ionicons name={editTemperoIndex >= 0 ? "checkmark" : "add"} size={24} color={colors.white} />
                  </TouchableOpacity>
                  {editTemperoIndex >= 0 && (
                    <TouchableOpacity style={[styles.addBtn, { backgroundColor: colors.textSecondary }]} onPress={cancelarEdicaoTempero}>
                      <Ionicons name="close" size={24} color={colors.white} />
                    </TouchableOpacity>
                  )}
                </View>

                {loadingTemperos ? (
                  <ActivityIndicator color={colors.primary} />
                ) : (
                  <View style={styles.listaTemperos}>
                    {getListaAtiva().map((item, index) => (
                      <View key={index} style={styles.temperoRow}>
                        <Text style={styles.temperoText}>{item}</Text>
                        <View style={{ flexDirection: 'row' }}>
                          <TouchableOpacity onPress={() => iniciarEdicaoTempero(index)} style={{ marginRight: 10 }}>
                            <Ionicons name="pencil" size={20} color={colors.text} />
                          </TouchableOpacity>
                          <TouchableOpacity onPress={() => removerTempero(index)}>
                            <Ionicons name="trash-outline" size={20} color={colors.danger} />
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

        {/* SEÇÃO: CONFIGURAR EXTRAS DE PIZZA */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🍕 Configurações de Extras</Text>
          <TouchableOpacity
            style={[styles.addBtn, { height: 50, justifyContent: 'center', paddingHorizontal: 16 }]}
            onPress={() => setShowExtrasConfig(true)}
          >
            <Text style={styles.addBtnText}>Configurar Extras de Pizza</Text>
          </TouchableOpacity>
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
                <ActivityIndicator size="large" color={colors.primary} />
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
                        {isBebidaCategorySlug(primeiraVariacao.category) && primeiraVariacao.subcategory ? (
                          <Text style={styles.produtoIngredientes}>{`Subcategoria: ${primeiraVariacao.subcategory}`}</Text>
                        ) : null}
                        {/* Display ingredients for pizza products */}
                        {isPizzaProduct(primeiraVariacao) && primeiraVariacao.ingredients && primeiraVariacao.ingredients.length > 0 && (
                          <Text style={styles.produtoIngredientes}>
                            {primeiraVariacao.ingredients.length > 3
                              ? primeiraVariacao.ingredients.slice(0, 3).join(', ') + '...'
                              : primeiraVariacao.ingredients.join(', ')}
                            {primeiraVariacao.customIngredients ? ' | ' + primeiraVariacao.customIngredients : ''}
                          </Text>
                        )}
                        {/* Display ingredients for caldo/comida products */}
                        {isIngredientsCategorySlug(primeiraVariacao.category) && primeiraVariacao.ingredients && primeiraVariacao.ingredients.length > 0 && (
                          <Text style={styles.produtoIngredientes}>
                            {primeiraVariacao.ingredients.join(', ')}
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

                      {/* Adicionais — apenas para porções */}
                      {normalizeCategorySlug(primeiraVariacao.category) === 'porcao' && (
                        <TouchableOpacity
                          style={styles.adicionaisBtn}
                          onPress={() => {
                            setProductForAdicionais({ id: primeiraVariacao.id, name: primeiraVariacao.name });
                            setShowAdicionaisModal(true);
                          }}
                        >
                          <Text style={styles.adicionaisBtnText}>Adicionais</Text>
                        </TouchableOpacity>
                      )}

                      {/* Show Variações button for pizzas and espetinhos with multiple variations */}
                      {(isPizzaProduct(primeiraVariacao) || variacoes.length > 1) && (
                        <TouchableOpacity
                          style={[styles.editBtn, { backgroundColor: colors.secondary }]}
                          onPress={() => abrirVariacoes(variacoes)}
                        >
                          <Text style={[styles.editBtnText, { color: colors.white }]}>Variações</Text>
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
            height: '90%',
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

            <View style={styles.modalBody}>
              <ScrollView
                showsVerticalScrollIndicator
                style={styles.modalScrollView}
                contentContainerStyle={styles.modalScrollContent}
                keyboardShouldPersistTaps="handled"
              >
              <Text style={styles.label}>Nome:</Text>
              <TextInput
                style={[styles.input, { maxWidth: inputMaxWidth }]}
                placeholder="Nome do produto"
                placeholderTextColor={colors.textSecondary}
                value={editNome}
                onChangeText={setEditNome}
              />

              {editCategoria?.toLowerCase().includes('pizza') ? (
                <>
                  {/* Pizza Subcategory */}
                  <Text style={styles.label}>Categoria da Pizza:</Text>
                  <View style={styles.categoriaButtons}>
                    {pizzaSubcategories.map((item) => (
                      <TouchableOpacity
                        key={item}
                        style={[
                          styles.categoriaBtn,
                          subcategoria === item && styles.categoriaBtnActive
                        ]}
                        onPress={() => setSubcategoria(item)}
                      >
                        <Text style={[
                          styles.categoriaBtnText,
                          subcategoria === item && styles.categoriaBtnTextActive
                        ]}>
                          {item}
                        </Text>
                      </TouchableOpacity>
                    ))}
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
                      placeholderTextColor={colors.textSecondary}
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
                    placeholderTextColor={colors.textSecondary}
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
                            placeholderTextColor={colors.textSecondary}
                            value={precosPizza[size.name] !== undefined ? String(precosPizza[size.name]) : ''}
                            onChangeText={(text) => setPrecosPizza(prev => ({ ...prev, [size.name]: text }))}
                            keyboardType="numeric"
                          />
                        </View>
                      ))
                    )}
                  </View>
                </>
              ) : isBebidaCategorySlug(editCategoria) ? (
                <>
                  <Text style={styles.label}>Subcategoria de Bebidas:</Text>
                  {bebidaSubcategories.length === 0 ? (
                    <Text style={styles.loadingText}>Cadastre subcategorias de bebidas na seção de configurações antes de editar produtos.</Text>
                  ) : (
                    <View style={styles.categoriaButtons}>
                      {bebidaSubcategories.map((item) => (
                        <TouchableOpacity
                          key={item}
                          style={[
                            styles.categoriaBtn,
                            subcategoria === item && styles.categoriaBtnActive
                          ]}
                          onPress={() => setSubcategoria(item)}
                        >
                          <Text style={[
                            styles.categoriaBtnText,
                            subcategoria === item && styles.categoriaBtnTextActive
                          ]}>
                            {item}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  )}

                  <Text style={styles.label}>Preço:</Text>
                  <TextInput
                    style={[styles.input, { maxWidth: inputMaxWidth }]}
                    placeholder="Preço"
                    placeholderTextColor={colors.textSecondary}
                    value={editPreco}
                    onChangeText={setEditPreco}
                    keyboardType="numeric"
                  />
                </>
              ) : (
                <>
                  <Text style={styles.label}>Preço:</Text>
                  <TextInput
                    style={[styles.input, { maxWidth: inputMaxWidth }]}
                    placeholder="Preço"
                    placeholderTextColor={colors.textSecondary}
                    value={editPreco}
                    onChangeText={setEditPreco}
                    keyboardType="numeric"
                  />

                  {isEspetinhoCategorySlug(editCategoria) && (
                    <>
                      <Text style={styles.label}>Acompanhamentos fixos:</Text>
                      <View style={styles.addTemperoRow}>
                        <TextInput
                          style={styles.inputTempero}
                          placeholder="Ex: Vinagrete"
                          placeholderTextColor={colors.textSecondary}
                          value={editNovoAcompanhamento}
                          onChangeText={setEditNovoAcompanhamento}
                        />
                        <TouchableOpacity
                          style={styles.addBtn}
                          onPress={() => {
                            const value = editNovoAcompanhamento.trim();
                            if (!value) return;
                            if (editAcompanhamentosEspetinho.includes(value)) return;
                            setEditAcompanhamentosEspetinho((prev) => [...prev, value]);
                            setEditNovoAcompanhamento('');
                          }}
                        >
                          <Ionicons name="add" size={24} color={colors.white} />
                        </TouchableOpacity>
                      </View>

                      {editAcompanhamentosEspetinho.length > 0 && (
                        <View style={styles.listaTemperos}>
                          {editAcompanhamentosEspetinho.map((item, index) => (
                            <View key={`${item}-${index}`} style={styles.temperoRow}>
                              <Text style={styles.temperoText}>{item}</Text>
                              <TouchableOpacity
                                onPress={() => {
                                  setEditAcompanhamentosEspetinho((prev) => prev.filter((_, i) => i !== index));
                                }}
                              >
                                <Ionicons name="trash-outline" size={20} color={colors.danger} />
                              </TouchableOpacity>
                            </View>
                          ))}
                        </View>
                      )}
                    </>
                  )}

                  {isIngredientsCategorySlug(editCategoria) && (
                    <>
                      <Text style={styles.label}>Ingredientes:</Text>
                      <View style={styles.ingredientesContainer}>
                        {ingredientesSelecionados.map((ing, idx) => (
                          <View key={idx} style={styles.ingredienteChip}>
                            <Text style={styles.ingredienteText}>{ing}</Text>
                            <TouchableOpacity
                              onPress={() => setIngredientesSelecionados(prev => prev.filter((_, i) => i !== idx))}
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
                          placeholderTextColor={colors.textSecondary}
                          value={novoIngrediente}
                          onChangeText={setNovoIngrediente}
                        />
                        <TouchableOpacity
                          style={styles.addIngredienteBtn}
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
                    </>
                  )}
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
                    onPress={() => {
                      setEditCategoria(cat.value);
                      if (!isEspetinhoCategorySlug(cat.value)) {
                        setEditAcompanhamentosEspetinho([]);
                        setEditNovoAcompanhamento('');
                      }
                    }}
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

              {/* ── FOTO DO PRODUTO ── */}
              <Text style={styles.label}>Foto do produto:</Text>
              <Text style={{ fontSize: 11, color: colors.textSecondary, marginBottom: 8, marginTop: -4 }}>
                {'📐 Ideal: 800×600 px, formato 4:3  •  JPEG ou WebP  •  Máx 5 MB\n'}
                {'💡 Comprima antes de enviar: tinypng.com ou squoosh.app'}
              </Text>
              {editImageUrl ? (
                <View style={{ marginBottom: 12 }}>
                  {/* @ts-ignore — web-only src */}
                  <img
                    src={editImageUrl}
                    alt="Foto do produto"
                    style={{ width: 120, height: 90, objectFit: 'cover', borderRadius: 8, marginBottom: 6 }}
                  />
                  <View style={{ flexDirection: 'row', gap: 8 }}>
                    <TouchableOpacity
                      style={[styles.salvarBtn, { flex: 1, paddingVertical: 8, marginTop: 0, backgroundColor: colors.secondary }]}
                      onPress={async () => {
                        if (!editando) return;
                        const url = await uploadProductImage(editando.id);
                        if (url) setEditImageUrl(url);
                      }}
                      disabled={uploadingImage}
                    >
                      <Text style={[styles.salvarBtnText, { fontSize: 13 }]}>
                        {uploadingImage ? 'Enviando...' : '🔄 Trocar foto'}
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.salvarBtn, { flex: 1, paddingVertical: 8, marginTop: 0, backgroundColor: '#D32F2F' }]}
                      onPress={() => setEditImageUrl(null)}
                    >
                      <Text style={[styles.salvarBtnText, { fontSize: 13 }]}>🗑️ Remover</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ) : (
                <TouchableOpacity
                  style={[styles.salvarBtn, { paddingVertical: 10, marginTop: 0, marginBottom: 12, backgroundColor: colors.secondary }]}
                  onPress={async () => {
                    if (!editando) return;
                    const url = await uploadProductImage(editando.id);
                    if (url) setEditImageUrl(url);
                  }}
                  disabled={uploadingImage}
                >
                  <Text style={[styles.salvarBtnText, { fontSize: 13 }]}>
                    {uploadingImage ? 'Enviando...' : '📷 Adicionar foto'}
                  </Text>
                </TouchableOpacity>
              )}

              </ScrollView>
            </View>

            <View style={styles.modalFooterActions}>
              <TouchableOpacity
                style={[styles.salvarBtn, styles.modalFooterSaveButton, loading && styles.salvarBtnDisabled]}
                onPress={salvarEdicao}
                disabled={loading}
              >
                <Text style={styles.salvarBtnText}>
                  {loading ? 'Salvando...' : 'SALVAR ALTERAÇÕES'}
                </Text>
              </TouchableOpacity>
            </View>
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

            <ScrollView style={styles.variacoesLista}>
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

      {/* MODAL ADICIONAIS */}
      {productForAdicionais && (
        <AdicionaisConfigModal
          visible={showAdicionaisModal}
          onClose={() => { setShowAdicionaisModal(false); setProductForAdicionais(null); }}
          product={productForAdicionais}
          companyId={user?.companyId || ''}
        />
      )}

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
              borderColor: colors.border, 
              borderRadius: 8 
            }}>
              {stockItems.map(item => (
                <TouchableOpacity
                  key={item.id}
                  style={{ padding: 10, backgroundColor: selectedStockId === item.id ? colors.warningSurface : colors.white, borderBottomWidth: 1, borderColor: colors.border }}
                  onPress={() => setSelectedStockId(item.id)}
                >
                  <Text>{item.nome} ({item.unidadeOriginal})</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            {stockItems.length === 0 && <Text style={{ color: colors.textSecondary, fontStyle: 'italic', marginBottom: 10 }}>Nenhum item no estoque.</Text>}

            <View style={{ flexDirection: 'row' }}>
              <TextInput
                style={[styles.input, { flex: 0.4, marginRight: 10 }]}
                placeholder="Qtd"
                cursorColor={colors.primary}
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

                <View style={styles.unitOptionsWrap}>
                  {unidadesUI.map((u: string) => (
                    <TouchableOpacity
                      key={u}
                      activeOpacity={0.82}
                      style={[
                        styles.unitOptionChip,
                        unitIngredient === u && styles.unitOptionChipActive,
                      ]}
                      onPress={() => setUnitIngredient(u)}
                    >
                      <Text
                        style={[
                          styles.unitOptionChipText,
                          unitIngredient === u && styles.unitOptionChipTextActive,
                        ]}
                      >
                        {u}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            </View>

            <TouchableOpacity style={styles.salvarBtn} onPress={addIngredient}>
              <Text style={styles.salvarBtnText}>+ Adicionar Ingrediente</Text>
            </TouchableOpacity>

            <Text style={[styles.label, { marginTop: 20 }]}>Ingredientes Vinculados:</Text>
            <ScrollView style={{ maxHeight: 200 }}>
              {(currentProductForStock?.inventoryItems || []).length === 0 ? (
                <Text style={{ fontStyle: 'italic', color: colors.textSecondary }}>Nenhum ingrediente vinculado.</Text>
              ) : (
                (currentProductForStock?.inventoryItems || []).map((ing, idx) => (
                  <View key={idx} style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 10, borderBottomWidth: 1, borderColor: colors.border }}>
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

      {/* Modal Configurar Extras de Pizza */}
      <AdminSlideModal visible={showExtrasConfig} onClose={() => setShowExtrasConfig(false)}>
        <ExtrasConfigScreen onClose={() => setShowExtrasConfig(false)} />
      </AdminSlideModal>

    </KeyboardWrapper>
    </ScreenScaffold>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { paddingBottom: 50 },
  section: {
    backgroundColor: colors.white,
    margin: 20,
    borderRadius: 20,
    padding: 20,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 5,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.primary,
    marginBottom: 20,
    borderBottomWidth: 2,
    borderBottomColor: colors.border,
    paddingBottom: 10,
  },
  form: {
    marginBottom: 15,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: 5,
    marginLeft: 4,
  },
  input: {
    backgroundColor: colors.background,
    borderRadius: 12,
    padding: 15,
    fontSize: 16,
    color: colors.text,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  categoriaButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 10,
  },
  categoriaBtn: {
    backgroundColor: colors.background,
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: colors.secondary,
    marginRight: 10,
    marginBottom: 10,
  },
  categoriaBtnActive: {
    backgroundColor: colors.secondary,
    borderColor: colors.primary,
  },
  categoriaBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  categoriaBtnTextActive: {
    color: colors.white,
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
    borderColor: colors.primary,
    marginRight: 10,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.white,
  },
  checkmark: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.primary,
  },
  variacaoToggleText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
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
    color: colors.primary,
    marginBottom: 5,
  },
  inputVariacao: {
    backgroundColor: colors.background,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: colors.text,
    borderWidth: 1,
    borderColor: colors.secondary,
    textAlign: 'center',
  },
  cadastrarBtn: {
    backgroundColor: colors.primary,
    padding: 15,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 10,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 15,
    elevation: 5,
  },
  cadastrarBtnDisabled: {
    opacity: 0.5,
  },
  cadastrarBtnText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 1,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 10,
    marginBottom: 15,
  },
  modalBtn: {
    flex: 1,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveBtn: {
    backgroundColor: colors.primary,
  },
  saveBtnText: {
    color: colors.white,
    fontSize: 14,
    fontWeight: '700',
  },
  cancelBtn: {
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cancelBtnText: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '600',
  },
  filtros: {
    flexDirection: 'row',
    marginBottom: 15,
    maxWidth: '100%', // Ensure it doesn't overflow parent
  },
  filtroBtn: {
    backgroundColor: colors.white,
    paddingVertical: 8,
    paddingHorizontal: 15,
    borderRadius: 20,
    marginRight: 10,
    borderWidth: 2,
    borderColor: colors.secondary,
  },
  filtroBtnActive: {
    backgroundColor: colors.secondary,
    borderColor: colors.primary,
  },
  filtroBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  filtroBtnTextActive: {
    color: colors.white,
  },
  loadingContainer: {
    backgroundColor: colors.white,
    borderRadius: 15,
    padding: 40,
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 15,
    fontSize: 14,
    color: colors.textSecondary,
  },
  emptyContainer: {
    backgroundColor: colors.white,
    borderRadius: 15,
    padding: 40,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: colors.textSecondary,
  },
  produtoCard: {
    backgroundColor: colors.white,
    borderRadius: 15,
    padding: 15,
    marginBottom: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    shadowColor: colors.shadow,
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
    color: colors.text,
    marginBottom: 4,
  },
  produtoVariacoes: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  produtoIngredientes: {
    fontSize: 11,
    color: colors.textSecondary,
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
    backgroundColor: colors.success,
  },
  statusBtnInativo: {
    backgroundColor: colors.danger,
  },
  statusBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.white,
  },
  editBtn: {
    backgroundColor: colors.secondary,
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
    color: colors.white,
  },
  stockBtn: {
    backgroundColor: colors.warning,
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
    color: colors.white,
  },
  adicionaisBtn: {
    backgroundColor: '#5c6bc0',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    width: 130,
    alignItems: 'center',
    justifyContent: 'center',
  },
  adicionaisBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.white,
  },
  deleteBtn: {
    backgroundColor: colors.danger,
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
    color: colors.white,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: colors.overlay,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: colors.white,
    borderRadius: 20,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
    alignSelf: 'center',
    display: 'flex',
    flexDirection: 'column', // Prepare for flex children
    minHeight: 0,
  },
  modalScrollView: {
    flex: 1,
    minHeight: 0,
  },
  modalBody: {
    flex: 1,
    minHeight: 0,
  },
  modalScrollContent: {
    paddingBottom: 120,
  },
  modalFooterActions: {
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.white,
  },
  modalFooterSaveButton: {
    marginTop: 0,
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
    color: colors.primary,
  },
  modalClose: {
    fontSize: 28,
    color: colors.textSecondary,
  },
  stockLinkBtn: {
    backgroundColor: colors.text,
    padding: 10,
    borderRadius: 10,
    alignItems: 'center',
    marginVertical: 10,
  },
  stockLinkText: {
    color: colors.white,
    fontWeight: 'bold',
  },
  salvarBtn: {
    backgroundColor: colors.primary,
    padding: 15,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 10,
  },
  salvarBtnDisabled: {
    opacity: 0.5,
  },
  salvarBtnText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: '700',
  },
  fecharBtn: {
    backgroundColor: colors.textSecondary,
    padding: 15,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 15,
  },
  fecharBtnText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: '700',
  },
  variacoesLista: {
    maxHeight: 480,
    flexGrow: 0,
  },
  variacaoItem: {
    backgroundColor: colors.background,
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
    color: colors.text,
    marginBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
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
    color: colors.primary,
    marginRight: 8,
  },
  variacaoPrecoInput: {
    backgroundColor: colors.white,
    borderRadius: 8,
    padding: 8,
    fontSize: 16,
    borderWidth: 1,
    borderColor: colors.secondary,
    minWidth: 80,
    textAlign: 'center',
  },
  variacaoSalvarBtn: {
    backgroundColor: colors.success,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 10,
  },
  variacaoSalvarText: {
    color: colors.white,
    fontSize: 14,
    fontWeight: '700',
  },
  miniStockBtn: {
    backgroundColor: colors.border,
    padding: 8,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 10
  },
  miniStockText: { color: colors.text, fontSize: 12 },
  unitTabs: {
    flexDirection: 'row',
    backgroundColor: colors.background,
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
  unitOptionsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  unitOptionChip: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: colors.border,
    borderRadius: 8,
    justifyContent: 'center',
    minWidth: 40,
    alignItems: 'center',
  },
  unitOptionChipActive: {
    backgroundColor: colors.primary,
  },
  unitOptionChipText: {
    color: colors.text,
    fontWeight: 'bold',
    fontSize: 13,
  },
  unitOptionChipTextActive: {
    color: colors.white,
  },
  addTemperoRow: {
    flexDirection: 'row',
    marginBottom: 10,
    alignItems: 'center'
  },
  inputTempero: {
    flex: 1,
    backgroundColor: colors.background,
    borderRadius: 8,
    padding: 10,
    fontSize: 14,
    borderWidth: 1,
    borderColor: colors.border,
    marginRight: 10,
  },
  addBtn: {
    width: 40,
    height: 40,
    backgroundColor: colors.primary,
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
    backgroundColor: colors.white,
    borderRadius: 10,
    marginBottom: 8,
    elevation: 1
  },
  temperoText: {
    fontSize: 14,
    color: colors.text,
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
    backgroundColor: colors.secondary,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 20,
    marginRight: 8,
    marginBottom: 8,
  },
  ingredienteText: {
    fontSize: 14,
    color: colors.text,
    fontWeight: '600',
    marginRight: 6,
  },
  ingredienteRemove: {
    fontSize: 18,
    color: colors.primary,
    fontWeight: 'bold',
  },
  addIngredienteBtn: {
    backgroundColor: colors.primary,
    width: 50,
    height: 50,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addIngredienteBtnText: {
    color: colors.white,
    fontSize: 24,
    fontWeight: 'bold',
  }
});
