import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, View, SectionList, TouchableOpacity, TextInput, ActivityIndicator, LayoutAnimation, Platform, UIManager, SectionListRenderItem, InteractionManager } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import React, { memo, useCallback, useState, useMemo, useRef, useEffect } from 'react';
import BackgroundPattern from '../components/BackgroundPattern';
import { useNovoPedido } from '../hooks/useNovoPedido';
import { usePerformanceMonitor } from '../hooks/usePerformanceMonitor';
import { colors } from '../theme/colors';
import { useFocusEffect } from '@react-navigation/native';
// @ts-ignore
import PizzaBuilderModal from '../components/PizzaBuilderModal';
import { Product, PizzaSize, PizzaConfig, Funcionario } from '../types';
import { Modal, FlatList } from 'react-native';
// @ts-ignore
import KeyboardWrapper from '../components/KeyboardWrapper';

if (Platform.OS === 'android') {
  if (UIManager.setLayoutAnimationEnabledExperimental) {
    UIManager.setLayoutAnimationEnabledExperimental(true);
  }
}

interface QuantityButtonProps {
  onPress: () => void;
  text: string;
}

const QuantityButton = memo(({ onPress, text }: QuantityButtonProps) => (
  <TouchableOpacity style={styles.quantityBtn} onPress={onPress}>
    <Text style={styles.quantityBtnText}>{text}</Text>
  </TouchableOpacity>
));
QuantityButton.displayName = 'QuantityButton';

interface SelectedItemProps {
  item: string;
  price: number;
  onRemove: () => void;
}

const SelectedItem = memo(({ item, price, onRemove }: SelectedItemProps) => (
  <View style={styles.selectedItem}>
    <View style={styles.selectedItemInfo}>
      <Text style={styles.selectedItemName}>{item}</Text>
      <Text style={styles.selectedItemPrice}>R$ {price.toFixed(2)}</Text>
    </View>
    <TouchableOpacity style={styles.removeBtn} onPress={onRemove}>
      <Text style={styles.removeBtnText}>×</Text>
    </TouchableOpacity>
  </View>
));
SelectedItem.displayName = 'SelectedItem';

interface CaldoRowProps {
  caldoBase: string; // Base name derived from string[] in section data
  cardapioCaldos: Product[];
  produtos: Record<string, number>;
  onIncrement: (name: string) => void;
  onDecrement: (name: string) => void;
  temperos: string[];
}

// Helper to render complex Caldo rows which are not just 1:1 with cardapio items
const CaldoRow = memo(({ caldoBase, cardapioCaldos, produtos, onIncrement, onDecrement, temperos }: CaldoRowProps) => {
  const item300 = cardapioCaldos.find(c => c.name.includes(caldoBase) && c.name.match(/300\s*ml/i));
  const item180 = cardapioCaldos.find(c => c.name.includes(caldoBase) && c.name.match(/180\s*ml/i));

  if (!item300 && !item180) return null;

  const renderTemperos = (sizeLabel: string) => (
    temperos.map((tempero, idx) => {
      const nome = `${caldoBase} ${sizeLabel} (${tempero})`;
      const qty = produtos[nome] || 0;
      const cor = idx === 0 ? colors.warning : idx === 1 ? colors.success : colors.disabled;
      // Simple icon logic or default
      let icone = '⚪';
      if (tempero.toLowerCase().includes('cebolinha') && tempero.toLowerCase().includes('coentro')) icone = '🌿';
      else if (tempero.toLowerCase().includes('cebolinha')) icone = '🧅';
      else if (tempero.toLowerCase().includes('sem nada')) icone = '⚪';
      else icone = '🔸';

      return (
        <VariationRow
          key={nome}
          label={`${icone} ${tempero}`}
          qty={qty}
          color={cor}
          onInc={() => onIncrement(nome)}
          onDec={() => onDecrement(nome)}
          last={idx === temperos.length - 1} // Logic for styling if needed
        />
      );
    })
  );

  return (
    <View style={styles.caldoCard}>
      <Text style={styles.produtoName}>{caldoBase}</Text>

      {/* 300ml Section */}
      {item300 && (
        <>
          <Text style={styles.sizeTitle}>📏 300ml - R$ {item300.price?.toFixed(2)}</Text>
          {renderTemperos('300ml')}
        </>
      )}

      {/* 180ml Section */}
      {item180 && (
        <>
          <Text style={styles.sizeTitle}>📏 180ml - R$ {item180.price?.toFixed(2)}</Text>
          {renderTemperos('180ml')}
        </>
      )}
    </View>
  );
});
CaldoRow.displayName = 'CaldoRow';

interface StandardRowProps {
  item: Product;
  produtos: Record<string, number>;
  onIncrement: (name: string) => void;
  onDecrement: (name: string) => void;
  type: string;
  temperos: string[];
}

// Helper for other items (Comidas/Bebidas/Porcoes)
const StandardRow = memo(({ item, produtos, onIncrement, onDecrement, type, temperos }: StandardRowProps) => {
  const isComida = type === 'comidas';


  if (isComida) {
    return (
      <View style={styles.standardCard}>
        <View style={styles.produtoRow}>
          <View style={styles.produtoInfo}>
            <Text style={styles.produtoName}>{item.name}</Text>
            <Text style={styles.produtoPrice}>R$ {item.price?.toFixed(2)}</Text>
          </View>
        </View>
        {/* Comida Variations */}
        {temperos.map((t, idx) => {
          const suffix = `(${t})`;
          const color = idx === 0 ? colors.warning : idx === 1 ? colors.success : colors.disabled;
          let label = t;
          // Add icons
          if (t.toLowerCase().includes('cebolinha') && t.toLowerCase().includes('coentro')) label = `🌿 ${t}`;
          else if (t.toLowerCase().includes('cebolinha')) label = `🧅 ${t}`;
          else if (t.toLowerCase().includes('sem nada')) label = `⚪ ${t}`;
          else label = `🔸 ${t}`;

          const itemName = `${item.name} ${suffix}`;
          return (
            <VariationRow
              key={suffix}
              label={label}
              qty={produtos[itemName] || 0}
              color={color}
              onInc={() => onIncrement(itemName)}
              onDec={() => onDecrement(itemName)}
              last={idx === temperos.length - 1}
            />
          );
        })}
      </View>
    );
  }

  // Simple item (Bebida/Porcao)
  const qty = produtos[item.name] || 0;
  return (
    <View style={styles.verticalCard}>
      <Text style={styles.verticalName}>{item.name}</Text>

      <View style={styles.verticalControlsRow}>
        <Text style={styles.verticalPrice}>R$ {item.price?.toFixed(2)}</Text>

        <View style={styles.quantityControl}>
          <TouchableOpacity style={[styles.roundBtn, { backgroundColor: colors.danger }]} onPress={() => onDecrement(item.name)}>
            <Text style={styles.roundBtnText}>−</Text>
          </TouchableOpacity>
          <Text style={styles.qtyText}>{qty}</Text>
          <TouchableOpacity style={[styles.roundBtn, { backgroundColor: colors.success }]} onPress={() => onIncrement(item.name)}>
            <Text style={styles.roundBtnText}>+</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
});
StandardRow.displayName = 'StandardRow';

interface EspetinhoRowProps {
  baseName: string;
  cardapioEspetinhos: Product[];
  produtos: Record<string, number>;
  onIncrement: (name: string) => void;
  onDecrement: (name: string) => void;
  variacoes?: string[];
}

// Helper for Espetinhos (Simples/Especiais) with dynamic variations
const EspetinhoRow = memo(({ baseName, cardapioEspetinhos, produtos, onIncrement, onDecrement, variacoes = [] }: EspetinhoRowProps) => {
  // 1. Map available variations to actual products
  const itensVariaveis = variacoes.map(variacao => {
    // Try to find exact match "Nome Variação" (Case Insensitive)
    const targetName = `${baseName} ${variacao}`.toLowerCase();
    const produto = cardapioEspetinhos.find(p => p.name.toLowerCase() === targetName);
    return {
      label: variacao,
      produto: produto
    };
  }).filter((item): item is { label: string; produto: Product } => !!item.produto); // Filter only existing products

  if (itensVariaveis.length === 0) return null;

  // Cyclic colors for consistent UI
  const rowColors = [colors.warning, colors.success, colors.disabled, '#4a90e2', '#9013fe']; // Add more if needed or cycle

  return (
    <View style={styles.caldoCard}>
      <Text style={styles.produtoName}>{baseName}</Text>

      {/* Dynamic Variation Rows */}
      {itensVariaveis.map((item, idx) => {
        const color = rowColors[idx % rowColors.length];
        const qty = produtos[item.produto.name] || 0;

        return (
          <StackedVariationRow
            key={item.label}
            name={item.label}
            price={item.produto.price || 0}
            qty={qty}
            color={color}
            onInc={() => onIncrement(item.produto.name)}
            onDec={() => onDecrement(item.produto.name)}
            last={idx === itensVariaveis.length - 1}
          />
        );
      })}
    </View>
  );
});
EspetinhoRow.displayName = 'EspetinhoRow';

interface StackedVariationRowProps {
  name: string;
  price: number;
  qty: number;
  color: string;
  onInc: () => void;
  onDec: () => void;
  last: boolean;
}

const StackedVariationRow = memo(({ name, price, qty, color, onInc, onDec, last }: StackedVariationRowProps) => (
  <View style={[styles.stackedRowContainer, last && { marginBottom: 12 }]}>
    {/* Left Side: Info Card (Name + Price) */}
    <TouchableOpacity
      style={[styles.stackedInfoCard, { backgroundColor: color }]}
      onPress={onInc}
      activeOpacity={0.8}
    >
      <Text style={styles.stackedNameText}>{name}</Text>
      <Text style={styles.stackedPriceText}>R$ {price.toFixed(2)}</Text>
    </TouchableOpacity>

    {/* Right Side: Controls (Outside) */}
    <View style={styles.variationControlsOutside}>
      <TouchableOpacity style={[styles.roundBtn, { backgroundColor: colors.danger }]} onPress={onDec}>
        <Text style={styles.roundBtnText}>−</Text>
      </TouchableOpacity>
      <Text style={styles.qtyText}>{qty}</Text>
      <TouchableOpacity style={[styles.roundBtn, { backgroundColor: color }]} onPress={onInc}>
        <Text style={styles.roundBtnText}>+</Text>
      </TouchableOpacity>
    </View>
  </View>
));
StackedVariationRow.displayName = 'StackedVariationRow';

interface VariationRowProps {
  label: string;
  qty: number;
  color: string;
  onInc: () => void;
  onDec: () => void;
  last: boolean;
  forceOneLine?: boolean;
}

const VariationRow = memo(({ label, qty, color, onInc, onDec, last, forceOneLine = false }: VariationRowProps) => (
  <View style={[styles.variationRow, last && { marginBottom: 12 }]}>
    <TouchableOpacity style={[styles.variationLabelBtn, { backgroundColor: color }]} onPress={onInc}>
      <Text
        style={styles.variationLabelText}
        numberOfLines={forceOneLine ? 1 : undefined}
        adjustsFontSizeToFit={forceOneLine}
        minimumFontScale={0.6}
      >
        {label}
      </Text>
    </TouchableOpacity>
    <View style={styles.variationControls}>
      <TouchableOpacity style={[styles.roundBtn, { backgroundColor: colors.danger }]} onPress={onDec}>
        <Text style={styles.roundBtnText}>−</Text>
      </TouchableOpacity>
      <Text style={styles.qtyText}>{qty}</Text>
      <TouchableOpacity style={[styles.roundBtn, { backgroundColor: color }]} onPress={onInc}>
        <Text style={styles.roundBtnText}>+</Text>
      </TouchableOpacity>
    </View>
  </View>
));
VariationRow.displayName = 'VariationRow';

interface HeaderComponentProps {
  clientName: string;
  setClientName: (name: string) => void;
  mesa: string;
  setMesa: (mesa: string) => void;
  waiterId: string;
  setWaiterId: (id: string) => void;
  waiters: Funcionario[];
}

const HeaderComponent = memo(({ clientName, setClientName, mesa, setMesa, waiterId, setWaiterId, waiters }: HeaderComponentProps) => {


  return (
    <View style={styles.headerForm}>
      <View style={{ flexDirection: 'row', marginBottom: 10 }}>
        {/* Campo Nome do Cliente */}
        <View style={{ flex: 1, marginRight: 10 }}>
          <Text style={styles.label}>Nome do Cliente:</Text>
          <TextInput
            style={styles.input}
            placeholder="Digite o nome"
            value={clientName}
            onChangeText={setClientName}
            placeholderTextColor="#999"
          />
        </View>

        {/* Campo Mesa (Opcional) */}
        <View style={{ width: 80 }}>
          <Text style={styles.label}>Mesa:</Text>
          <TextInput
            style={styles.input}
            placeholder="Nº"
            value={mesa}
            onChangeText={setMesa}
            placeholderTextColor="#999"
            keyboardType="numeric"
          />
        </View>
      </View>

    </View>
  );
});
HeaderComponent.displayName = 'HeaderComponent';

interface FooterComponentProps {
  selectedItems: { text: string; price: number }[];
  onRemoveItem: (item: string) => void;
}

const FooterComponent = memo(({ selectedItems, onRemoveItem }: FooterComponentProps) => (
  <View style={styles.listFooter}>
    {selectedItems.map((item, index) => (
      <SelectedItem
        key={index}
        item={item.text}
        price={item.price}
        onRemove={() => onRemoveItem(item.text)}
      />
    ))}
    <View style={styles.totalSpace} />
  </View>
));
FooterComponent.displayName = 'FooterComponent';

// Union type for sections
type SectionItem = Product | string;

interface Section {
  title: string;
  data: SectionItem[];
  type: string;
  original?: Product[];
}

export default function NovoPedidoScreen({ route }: any) {
  const [showPizzaModal, setShowPizzaModal] = useState(false);
  const [selectedPizza, setSelectedPizza] = useState<Product | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isScrolling, setIsScrolling] = useState(false);
  
  // Performance monitoring
  const { metrics, startMonitoring, stopMonitoring, logMetrics, isMonitoring } = usePerformanceMonitor();
  const [scrolling, setScrolling] = useState(false);
  const scrollTimeoutRef = useRef<NodeJS.Timeout>();

  const {
    user,
    loadingCardapio,
    cardapio,
    produtos,
    clientName,
    setClientName,
    mesa,
    setMesa,
    tableId,
    setTableId,
    waiterId,
    setWaiterId,
    waiters,
    observations,
    setObservations,
    updateProduto,
    total,
    selectedItems,
    handleRemoveItem,
    handleSubmit,
    isSubmitting,
    handleLogout,
    temperosCaldos,
    temperosComidas,
    variacoesEspetinho,
    pizzaConfig,
    addPizzaToOrder,
    carregarCardapio,
    extras
  } = useNovoPedido();

  // Refresh menu whenever screen gains focus
  useFocusEffect(
    useCallback(() => {
      console.log('🔄 NovoPedidoScreen focused, refreshing menu...');
      carregarCardapio();
    }, [carregarCardapio])
  );


  // Handle Route Params (from Map or other screens)
  React.useEffect(() => {
    if (route?.params?.mesaParam) {
      setMesa(route.params.mesaParam);
    }
    if (route?.params?.tableId) {
      setTableId(route.params.tableId);
    }
    // Optional: Pre-fill waiter if passed
    if (route?.params?.waiterId) {
      setWaiterId(route.params.waiterId);
    }
  }, [route?.params, setMesa, setTableId, setWaiterId]);


  // Prepare sections for SectionList (Must be before conditional return)
  const sections = React.useMemo<Section[]>(() => {
    const sectionsData: Section[] = [];

    // Helper to check if item is active
    const isActive = (item: Product) => item.active !== false;

    // Section for Pizza Builder - Grouped by Subcategory
    if (cardapio.pizzas && cardapio.pizzas.length > 0) {
      // Deduplicate pizzas by name (Case Insensitive) AND Filter Active
      const uniquePizzas: Product[] = [];
      const seenNames = new Set<string>();
      cardapio.pizzas.forEach(p => {
        if (!isActive(p)) return;
        const normalizedName = p.name ? p.name.trim().toLowerCase() : '';
        if (normalizedName && !seenNames.has(normalizedName)) {
          seenNames.add(normalizedName);
          uniquePizzas.push(p);
        }
      });

      // Group pizzas by subcategory
      const pizzasByCategory: Record<string, Product[]> = {
        'Tradicional': [],
        'Especiais': [],
        'Doces': [],
        'Outras': []
      };

      uniquePizzas.forEach(pizza => {
        const subcategory = pizza.subcategory || 'Outras';
        if (pizzasByCategory[subcategory]) {
          pizzasByCategory[subcategory].push(pizza);
        } else {
          pizzasByCategory['Outras'].push(pizza);
        }
      });

      // Add sections for each category that has pizzas
      const categoryOrder = ['Tradicional', 'Especiais', 'Doces', 'Outras'];
      categoryOrder.forEach(category => {
        if (pizzasByCategory[category].length > 0) {
          sectionsData.push({
            title: `🍕 PIZZAS ${category.toUpperCase()}`,
            data: pizzasByCategory[category],
            type: 'pizzas-v2'
          });
        }
      });
    }

    // Helper strict filter to avoid pizzas appearing in other categories
    const isPizza = (name: string) => {
      const pizzas = cardapio.pizzas || [];
      return pizzas.some(p => p.name.trim().toLowerCase() === name.trim().toLowerCase());
    };

    // Caldos: Aggregate by base name
    if (cardapio.caldos?.length > 0) {
      const activeCaldos = cardapio.caldos.filter(isActive);
      const caldosUnicos = [...new Set(activeCaldos.map(c => c.name.replace(/\s*\(?\s*(300|180)\s*ml\s*\)?/gi, '').trim()))];
      sectionsData.push({
        title: '🍲 Caldos',
        data: caldosUnicos,
        type: 'caldos',
        original: activeCaldos
      });
    }

    // Espetinhos Simples
    if (cardapio.espetinhosSimples && cardapio.espetinhosSimples.length > 0) {
      const activeEspetinhos = (cardapio.espetinhosSimples || []).filter(isActive);
      const baseNames = [...new Set(activeEspetinhos.map(p => {
        let name = p.name;
        variacoesEspetinho.forEach(v => {
          const regex = new RegExp(` ${v}`, 'gi');
          name = name.replace(regex, '');
        });
        return name.trim();
      }))];
      sectionsData.push({
        title: '🔥 Espetinhos Simples',
        data: baseNames,
        type: 'espetinhos-simples',
        original: activeEspetinhos
      });
    }

    // Espetinhos Especiais
    if (cardapio.espetinhosEspeciais && cardapio.espetinhosEspeciais.length > 0) {
      const activeEspetinhos = (cardapio.espetinhosEspeciais || []).filter(isActive);
      const baseNames = [...new Set(activeEspetinhos.map(p => {
        let name = p.name;
        variacoesEspetinho.forEach(v => {
          const regex = new RegExp(` ${v}`, 'gi');
          name = name.replace(regex, '');
        });
        return name.trim();
      }))];
      sectionsData.push({
        title: '🌟 Espetinhos Especiais',
        data: baseNames,
        type: 'espetinhos-especiais',
        original: activeEspetinhos
      });
    }

    if (cardapio.comidas?.length > 0) {
      // Filter out items that are actually pizzas AND inactive items
      const filteredComidas = cardapio.comidas.filter(c => !isPizza(c.name) && isActive(c));
      if (filteredComidas.length > 0) {
        sectionsData.push({ title: '🍽️ Comidas', data: filteredComidas, type: 'comidas' });
      }
    }

    if (cardapio.porcoes && cardapio.porcoes.length > 0) {
      const activePorcoes = (cardapio.porcoes || []).filter(isActive);
      sectionsData.push({ title: '🍟 Porções', data: activePorcoes, type: 'porcoes' });
    }

    if (cardapio.outros && cardapio.outros.length > 0) {
      const activeOutros = (cardapio.outros || []).filter(isActive);
      sectionsData.push({ title: '📦 Outros', data: activeOutros, type: 'outros' });
    }

    if (cardapio.bebidas?.length > 0) {
      const activeBebidas = cardapio.bebidas.filter(isActive);
      sectionsData.push({ title: '🥤 Bebidas', data: activeBebidas, type: 'bebidas' });
    }

    return sectionsData;
  }, [cardapio, variacoesEspetinho]);

  // Filter sections based on search query
  const filteredSections = React.useMemo(() => {
    if (!searchQuery.trim()) return sections;

    const query = searchQuery.toLowerCase().trim();
    return sections.map(section => {
      const filteredData = section.data.filter(item => {
        if (typeof item === 'string') return false; // Skip variation strings
        return item.name?.toLowerCase().includes(query);
      });
      return { ...section, data: filteredData };
    }).filter(section => section.data.length > 0); // Remove empty sections
  }, [sections, searchQuery]);

  // Wrappers for animation
  const updateProdutoAnimated = useCallback((itemName: string, delta: number) => {
    // Only animate when not scrolling
    if (!isScrolling) {
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    }
    
    // Use InteractionManager to defer update if scrolling
    if (isScrolling) {
      InteractionManager.runAfterInteractions(() => {
        updateProduto(itemName, delta);
      });
    } else {
      updateProduto(itemName, delta);
    }
  }, [updateProduto, isScrolling]);

  const handleRemoveItemAnimated = useCallback((item: string) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.spring); // Spring for deletion feeling
    handleRemoveItem(item);
  }, [handleRemoveItem]);
  
  // Memoized callbacks for increment/decrement
  const handleIncrement = useCallback((itemName: string) => {
    updateProdutoAnimated(itemName, 1);
  }, [updateProdutoAnimated]);
  
  const handleDecrement = useCallback((itemName: string) => {
    updateProdutoAnimated(itemName, -1);
  }, [updateProdutoAnimated]);
  
  // Memoized keyExtractor for stable keys
  const keyExtractor = useCallback((item: SectionItem, index: number) => {
    if (typeof item === 'string') {
      // For string items (caldos, espetinhos base names), use the string itself as key
      return item;
    }
    // For Product items, prefer id, fallback to name (without index for stability)
    const product = item as Product;
    return product.id ? String(product.id) : product.name || `item-${index}`;
  }, []);
  
  // Performance monitoring handlers
  const handleScrollBeginDrag = useCallback(() => {
    setScrolling(true);
    setIsScrolling(true);
    if (!isMonitoring) {
      startMonitoring();
    }
  }, [isMonitoring, startMonitoring]);
  
  const handleScrollEndDrag = useCallback(() => {
    if (scrollTimeoutRef.current) {
      clearTimeout(scrollTimeoutRef.current);
    }
    
    scrollTimeoutRef.current = setTimeout(() => {
      setScrolling(false);
      setIsScrolling(false);
      if (isMonitoring) {
        stopMonitoring();
        logMetrics();
      }
    }, 150);
  }, [isMonitoring, stopMonitoring, logMetrics]);
  
  // Log baseline metrics on mount
  useEffect(() => {
    console.log('📊 [Performance] Baseline measurement ready');
    console.log('📊 [Performance] Current SectionList config:', {
      initialNumToRender: 12,
      windowSize: 5,
      maxToRenderPerBatch: 10,
      updateCellsBatchingPeriod: 50,
      removeClippedSubviews: Platform.OS === 'android'
    });
  }, []);

  if (loadingCardapio) {
    return (
      <View style={styles.container}>
        <BackgroundPattern />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Carregando cardápio...</Text>
        </View>
      </View>
    );
  }

  const renderSectionHeader = ({ section: { title } }: { section: Section }) => (
    <Text style={styles.sectionTitle}>{title}</Text>
  );

  const renderItem: SectionListRenderItem<SectionItem, Section> = ({ item, section }) => {
    if (section.type === 'pizzas-v2') {
      const pizzaItem = item as Product;
      // Render Pizza Item Row with Espetinho-like Styling
      // FIX: Tratar preços com vírgula (comum no Brasil) e converter para float
      const validPrices = pizzaItem.prices ? Object.values(pizzaItem.prices).map(p => {
        if (typeof p === 'string') return Number((p as string).replace(',', '.'));
        return Number(p);
      }).filter(p => !isNaN(p) && p > 0) : [];
      const minPrice = validPrices.length > 0 ? Math.min(...validPrices) : 0;
      const maxPrice = validPrices.length > 0 ? Math.max(...validPrices) : 0;

      // Format price range
      const formatPriceRange = (min: number, max: number): string => {
        if (min === max || validPrices.length === 1) {
          return `R$ ${min.toFixed(2).replace('.', ',')}`;
        }
        return `R$ ${min.toFixed(2).replace('.', ',')} - R$ ${max.toFixed(2).replace('.', ',')}`;
      };
      const priceDisplay = formatPriceRange(minPrice, maxPrice);

      const ingredientsText = pizzaItem.ingredients ? pizzaItem.ingredients.join(', ') : pizzaItem.description || '';
      const customIngredientsText = pizzaItem.customIngredients || '';

      // Cycle colors to look like the example (Orange, Green, Gray, Blue...)
      const rowColors = [colors.warning, colors.success, colors.disabled, '#4a90e2', '#9013fe'];
      // FIX: Ensure hash is safe for strings
      const hash = pizzaItem.name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
      const colorIndex = hash % rowColors.length;
      const cardColor = rowColors[colorIndex] || colors.primary; // Fallback

      return (
        // ... (inside renderItem for pizzas-v2)
        <TouchableOpacity
          style={[styles.stackedInfoCard, { backgroundColor: cardColor, marginBottom: 12, elevation: 2 }]}
          onPress={() => { setSelectedPizza(pizzaItem); setShowPizzaModal(true); }}
          activeOpacity={0.8}
        >
          <View style={{ alignItems: 'center' }}>
            <Text style={styles.stackedNameText}>{pizzaItem.name}</Text>
            {!!ingredientsText && <Text style={{ color: 'rgba(255,255,255,0.9)', fontSize: 13, textAlign: 'center', marginBottom: 4, fontStyle: 'italic' }}>{ingredientsText}</Text>}
            {!!customIngredientsText && <Text style={{ color: 'rgba(255,255,255,0.85)', fontSize: 12, textAlign: 'center', marginBottom: 4, fontStyle: 'italic' }}>({customIngredientsText})</Text>}
            <Text style={styles.stackedPriceText}>{priceDisplay}</Text>
          </View>
        </TouchableOpacity>
      );
    }
    if (section.type === 'caldos') {
      return <CaldoRow caldoBase={item as string} cardapioCaldos={section.original || []} produtos={produtos} onIncrement={handleIncrement} onDecrement={handleDecrement} temperos={temperosCaldos} />;
    }
    if (section.type === 'espetinhos-simples' || section.type === 'espetinhos-especiais') {
      return (
        <EspetinhoRow
          baseName={item as string}
          cardapioEspetinhos={section.original || []}
          produtos={produtos}
          onIncrement={handleIncrement}
          onDecrement={handleDecrement}
          variacoes={variacoesEspetinho}
        />
      );
    }
    return <StandardRow item={item as Product} produtos={produtos} onIncrement={handleIncrement} onDecrement={handleDecrement} type={section.type} temperos={temperosComidas} />;
  };

  return (
    <KeyboardWrapper style={styles.container}>
      <BackgroundPattern />

      {/* Header e Conteúdo mantidos dentro do Wrapper */}
      <View style={styles.header}>
        {/* ... (código do header) */}
        <View style={styles.headerLeft}>
          {user && (
            <View>
              <Text style={styles.userInfoLabel}>Olá,</Text>
              <Text style={styles.userInfo}>{user.nome || user.email}</Text>
            </View>
          )}
        </View>
        <View style={styles.headerCenter}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Ionicons name="add-circle-outline" size={26} color={colors.white} style={{ marginRight: 8 }} />
            <Text style={styles.headerTitle}>Novo Pedido</Text>
          </View>
        </View>
        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
          <Ionicons name="log-out-outline" size={24} color={colors.white} />
        </TouchableOpacity>
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color={colors.textSecondary} style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Buscar item do cardápio..."
          placeholderTextColor={colors.textSecondary}
          value={searchQuery}
          onChangeText={setSearchQuery}
          autoCapitalize="none"
          autoCorrect={false}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')} style={styles.searchClearBtn}>
            <Ionicons name="close-circle" size={20} color={colors.textSecondary} />
          </TouchableOpacity>
        )}
      </View>

      <SectionList
        sections={filteredSections}
        renderItem={renderItem}
        renderSectionHeader={renderSectionHeader}
        keyExtractor={keyExtractor}
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={<HeaderComponent
          clientName={clientName}
          setClientName={setClientName}
          mesa={mesa}
          setMesa={setMesa}
          waiters={waiters}
          waiterId={waiterId}
          setWaiterId={setWaiterId}
        />}
        ListFooterComponent={<FooterComponent selectedItems={selectedItems} onRemoveItem={handleRemoveItemAnimated} />}
        stickySectionHeadersEnabled={false}
        initialNumToRender={5}
        windowSize={2}
        maxToRenderPerBatch={3}
        updateCellsBatchingPeriod={150}
        removeClippedSubviews={true}
        onScrollBeginDrag={handleScrollBeginDrag}
        onScrollEndDrag={handleScrollEndDrag}
        onMomentumScrollEnd={handleScrollEndDrag}
        onScrollToIndexFailed={() => {}}
        legacyImplementation={false}
        disableIntervalMomentum={true}
        scrollEventThrottle={16}
      />

      <View style={styles.stickyFooter}>
        <View style={styles.totalContainer}>
          <Text style={styles.totalLabel}>Total:</Text>
          <Text style={styles.totalValue}>R$ {total.toFixed(2)}</Text>
        </View>

        <TouchableOpacity
          style={[styles.submitBtn, isSubmitting && styles.submitBtnDisabled]}
          onPress={handleSubmit}
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            <ActivityIndicator size="small" color={colors.white} />
          ) : (
            <Text style={styles.submitBtnText}>Criar Pedido</Text>
          )}
        </TouchableOpacity>
      </View>

      <PizzaBuilderModal
        visible={showPizzaModal}
        onClose={() => { setShowPizzaModal(false); setSelectedPizza(null); }}
        onConfirm={addPizzaToOrder}
        sizes={pizzaConfig?.sizes}
        pizzas={cardapio.pizzas}
        // @ts-ignore
        initialFlavor={selectedPizza}
        extras={extras}
      />

      <StatusBar style="dark" />
    </KeyboardWrapper>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 50,
    paddingBottom: 15,
    backgroundColor: colors.primary,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    zIndex: 10,
    elevation: 8,
  },
  headerLeft: {
    flex: 1,
    alignItems: 'flex-start',
    justifyContent: 'center',
  },
  headerCenter: {
    flex: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.white,
    textAlign: 'center',
  },
  userInfoLabel: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 10,
  },
  userInfo: {
    fontSize: 12,
    color: colors.userInfo, // or '#E5B84A' if colors.userInfo is not suitable
    fontWeight: '600',
  },
  logoutBtn: {
    flex: 1,
    alignItems: 'flex-end',
    justifyContent: 'center',
    padding: 5,
  },
  listContent: { padding: 20, paddingBottom: 120 },
  headerForm: { marginBottom: 20 },
  label: { fontSize: 16, color: colors.text, marginBottom: 6, fontWeight: 'bold' },
  input: {
    backgroundColor: colors.white,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  selectorBtn: {
    backgroundColor: colors.white,
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: colors.border,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  selectorBtnText: {
    fontSize: 16,
    color: colors.text,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: colors.white,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '70%',
    paddingBottom: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text,
  },
  closeBtn: {
    padding: 5,
  },
  emptyContainer: {
    padding: 30,
    alignItems: 'center',
  },
  emptyText: {
    color: '#999',
    fontSize: 16,
  },
  waiterItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    backgroundColor: '#fff',
  },
  waiterItemActive: {
    backgroundColor: '#f0f9ff',
  },
  waiterInfo: {
    flex: 1,
  },
  waiterName: {
    fontSize: 16,
    color: '#333',
    marginBottom: 4,
  },
  waiterNameActive: {
    fontWeight: 'bold',
    color: colors.primary,
  },
  waiterRole: {
    fontSize: 12,
    color: '#999',
  },
  separator: {
    height: 1,
    backgroundColor: '#eee',
    marginLeft: 15,
  },

  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: colors.primary, marginTop: 20, marginBottom: 12 },

  // Card Styles
  quantityBtn: {
    backgroundColor: colors.primary,
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  quantityBtnText: {
    color: colors.white,
    fontSize: 18,
    fontWeight: 'bold',
  },
  caldoCard: { backgroundColor: colors.white, borderRadius: 12, padding: 12, marginBottom: 12, elevation: 1 },
  standardCard: { backgroundColor: colors.white, borderRadius: 12, padding: 12, marginBottom: 12, elevation: 1 },
  simpleCard: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, backgroundColor: colors.white, padding: 12, borderRadius: 8, elevation: 1 },
  verticalCard: { flexDirection: 'column', marginBottom: 12, backgroundColor: colors.white, padding: 12, borderRadius: 8, elevation: 1 },

  produtoName: { fontSize: 18, fontWeight: '700', color: colors.text, marginBottom: 4, textAlign: 'center' },
  sizeTitle: { fontSize: 17, fontWeight: '700', color: colors.primary, marginTop: 8, marginBottom: 4, textAlign: 'center' },

  simpleName: { fontSize: 18, fontWeight: '700', color: colors.text, flex: 1 },
  verticalName: { fontSize: 18, fontWeight: '700', color: colors.text, marginBottom: 8, textAlign: 'center' },

  verticalControlsRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 10 },

  simplePrice: { fontSize: 17, fontWeight: '700', color: colors.primary, marginHorizontal: 12 },
  verticalPrice: { fontSize: 17, fontWeight: '700', color: colors.primary },

  // Variation Rows
  variationRow: { flexDirection: 'row', alignItems: 'center', marginTop: 6 },
  variationLabelBtn: { flex: 1, padding: 10, borderRadius: 8, marginHorizontal: 4 },
  variationLabelText: { color: colors.shadow, fontSize: 16, fontWeight: '700', textAlign: 'center' },

  // NEW STYLES FOR STACKED VARIATION
  stackedRowContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  stackedInfoCard: {
    flex: 1,
    padding: 12,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    // Background color applied inline to this card
  },
  variationControlsOutside: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  stackedNameText: {
    color: colors.white,
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 4,
    ...Platform.select({
      web: {
        textShadow: '1px 1px 2px rgba(0,0,0,0.3)',
      },
      default: {
        textShadowColor: 'rgba(0,0,0,0.3)',
        textShadowOffset: { width: 1, height: 1 },
        textShadowRadius: 2,
      },
    }),
  },
  stackedPriceText: {
    color: colors.white,
    fontSize: 17,
    fontWeight: 'bold',
    textAlign: 'center',
  },

  variationControls: { flexDirection: 'row', alignItems: 'center' },
  roundBtn: { width: 32, height: 32, borderRadius: 16, justifyContent: 'center', alignItems: 'center', marginHorizontal: 4 },
  roundBtnText: { color: colors.white, fontSize: 18, fontWeight: 'bold' },
  qtyText: { fontSize: 16, fontWeight: 'bold', minWidth: 24, textAlign: 'center' },

  produtoRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  produtoInfo: { flex: 1 },
  produtoPrice: { fontSize: 17, fontWeight: '700', color: colors.primary, textAlign: 'center' },

  quantityControl: { flexDirection: 'row', alignItems: 'center' },

  // List Footer
  listFooter: { marginTop: 20 },
  selectedItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: colors.white, borderRadius: 8, padding: 12, marginBottom: 8 },
  selectedItemInfo: { flex: 1 },
  selectedItemName: { fontSize: 16, color: colors.text },
  selectedItemPrice: { fontSize: 14, color: colors.primary, marginTop: 2 },
  removeBtn: { backgroundColor: colors.dangerLight, width: 28, height: 28, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
  removeBtnText: { color: colors.white, fontSize: 20, fontWeight: 'bold' },

  stickyFooter: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: colors.white,
    borderTopWidth: 1, borderTopColor: colors.border,
    padding: 20,
    elevation: 20,
  },
  totalContainer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  totalLabel: { fontSize: 20, fontWeight: 'bold', color: colors.text },
  totalValue: { fontSize: 24, fontWeight: 'bold', color: colors.primary },

  submitBtn: { backgroundColor: colors.primary, borderRadius: 12, padding: 16, alignItems: 'center' },
  submitBtnDisabled: { opacity: 0.5 },
  submitBtnText: { color: colors.white, fontSize: 18, fontWeight: 'bold' },

  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 12, fontSize: 16, color: colors.primary },

  priceLegend: { fontSize: 13, color: colors.textSecondary, textAlign: 'center', marginBottom: 12 },
  totalSpace: { height: 100 },

  // Search Bar
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: colors.text,
    paddingVertical: 8,
  },
  searchClearBtn: {
    padding: 4,
  },
});
