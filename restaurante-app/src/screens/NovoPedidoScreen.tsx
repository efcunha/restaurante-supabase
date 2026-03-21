import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, View, SectionList, ScrollView, TouchableOpacity, TextInput, ActivityIndicator, LayoutAnimation, Platform, UIManager, SectionListRenderItem } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import React, { memo, useCallback, useState, useMemo, useRef, useEffect } from 'react';

import { useNovoPedido } from '../hooks/useNovoPedido';
import { usePerformanceMonitor } from '../hooks/usePerformanceMonitor';
import { useFocusEffect } from '@react-navigation/native';
// @ts-ignore
import PizzaBuilderModal from '../components/PizzaBuilderModal';
import { Product } from '../types';
import { NewOrderCartFooter, NewOrderHeaderForm, NewOrderListFooter, PizzaProductCard } from '../features/new-order';
// KeyboardWrapper removed to prevent touch stealing
import { KeyboardAvoidingView } from 'react-native';
import { colors } from '../theme/colors';
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

interface PizzaRowProps {
  item: Product;
  onPress: (item: Product) => void;
}

const PizzaRow = memo(({ item, onPress }: PizzaRowProps) => {
  return (
    <View style={styles.productCardWrapper}>
      <PizzaProductCard item={item} onPress={onPress} />
    </View>
  );
});
PizzaRow.displayName = 'PizzaRow';

interface CaldoRowProps {
  caldoBase: string; // Base name derived from string[] in section data
  cardapioCaldos: Product[];
  produtos: Record<string, number>;
  onIncrement: (name: string) => void;
  onDecrement: (name: string) => void;
  temperos: string[];
}

// Helper to render complex Caldo rows which are not just 1:1 with cardapio items
// Custom comparator for CaldoRow
const areCaldoPropsEqual = (prev: CaldoRowProps, next: CaldoRowProps) => {
  if (prev.caldoBase !== next.caldoBase) return false;
  
  // Check if any quantity related to this caldo changed
  // We need to check both 300ml and 180ml for all temperos
  const sizes = ['300ml', '180ml'];
  for (const size of sizes) {
      for (const tempero of prev.temperos) {
          const key = `${prev.caldoBase} ${size} (${tempero})`;
          if (prev.produtos[key] !== next.produtos[key]) return false;
      }
  }
  return true;
};

const CaldoRow = memo(({ caldoBase, cardapioCaldos, produtos, onIncrement, onDecrement, temperos }: CaldoRowProps) => {
  const item300 = useMemo(() => 
    cardapioCaldos.find(c => c.name.includes(caldoBase) && c.name.match(/300\s*ml/i)),
    [cardapioCaldos, caldoBase]
  );
  const item180 = useMemo(() => 
    cardapioCaldos.find(c => c.name.includes(caldoBase) && c.name.match(/180\s*ml/i)),
    [cardapioCaldos, caldoBase]
  );

  if (!item300 && !item180) return null;

  const renderTemperos = useCallback((sizeLabel: string) => (
    temperos.map((tempero, idx) => {
      const nome = `${caldoBase} ${sizeLabel} (${tempero})`;
      const qty = produtos[nome] || 0;
      const cor = idx === 0 ? colors.warning : idx === 1 ? colors.success : colors.disabled;
      
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
          onInc={onIncrement}
          onDec={onDecrement}
          itemKey={nome}
          last={idx === temperos.length - 1}
        />
      );
    })
  ), [caldoBase, temperos, onIncrement, onDecrement, produtos]);

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
}, areCaldoPropsEqual);
CaldoRow.displayName = 'CaldoRow';

interface StandardRowProps {
  item: Product;
  produtos: Record<string, number>;
  onIncrement: (name: string) => void;
  onDecrement: (name: string) => void;
  type: string;
  temperos: string[];
}

// Custom comparator for StandardRow
const areStandardPropsEqual = (prev: StandardRowProps, next: StandardRowProps) => {
  if (prev.item.name !== next.item.name) return false;
  if (prev.type !== next.type) return false;

  const isComida = prev.type === 'comidas';
  
  if (isComida) {
    // Check all temperos
    for (const t of prev.temperos) {
      const key = `${prev.item.name} (${t})`;
      if (prev.produtos[key] !== next.produtos[key]) return false;
    }
    return true;
  } else {
    // Simple check
    return prev.produtos[prev.item.name] === next.produtos[next.item.name];
  }
};

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
              onInc={onIncrement}
              onDec={onDecrement}
              itemKey={itemName}
              last={idx === temperos.length - 1}
            />
          );
        })}
      </View>
    );
  }

  // Simple item (Bebida/Porcao)
  const qty = produtos[item.name] || 0;
  
  const handleInc = useCallback(() => onIncrement(item.name), [onIncrement, item.name]);
  const handleDec = useCallback(() => onDecrement(item.name), [onDecrement, item.name]);

  return (
    <View style={styles.verticalCard}>
      <Text style={styles.verticalName}>{item.name}</Text>

      <View style={styles.verticalControlsRow}>
        <Text style={styles.verticalPrice}>R$ {item.price?.toFixed(2)}</Text>

        <View style={styles.quantityControl}>
          <TouchableOpacity style={[styles.roundBtn, { backgroundColor: colors.danger }]} onPress={handleDec}>
            <Text style={styles.roundBtnText}>−</Text>
          </TouchableOpacity>
          <Text style={styles.qtyText}>{qty}</Text>
          <TouchableOpacity style={[styles.roundBtn, { backgroundColor: colors.success }]} onPress={handleInc}>
            <Text style={styles.roundBtnText}>+</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}, areStandardPropsEqual);
StandardRow.displayName = 'StandardRow';

interface EspetinhoRowProps {
  baseName: string;
  cardapioEspetinhos: Product[];
  produtos: Record<string, number>;
  onIncrement: (name: string) => void;
  onDecrement: (name: string) => void;
  variacoes?: string[];
}

// Custom comparator for EspetinhoRow
const areEspetinhoPropsEqual = (prev: EspetinhoRowProps, next: EspetinhoRowProps) => {
  if (prev.baseName !== next.baseName) return false;
  
  const prevVariacoes = prev.variacoes || [];
  const nextVariacoes = next.variacoes || [];

  // Check variations
  if (prevVariacoes.length !== nextVariacoes.length) return false;

    // Compare the resolved product names derived from base name + variation.
  // If the list of *available products* changed (cardapioEspetinhos ref change?) -> yes
  if (prev.cardapioEspetinhos !== next.cardapioEspetinhos) return false;

  for (const v of prevVariacoes) {
      // We check case-insensitive match against keys in 'produtos'? No, 'produtos' keys are exact strings.
      // This is tricky without the cardapio list to resolve exact product names.
      // BUT, we can just iterate the `cardapioEspetinhos` prop! It's passed in.
      const targetName = `${prev.baseName} ${v}`.toLowerCase();
      const p = prev.cardapioEspetinhos.find(cp => cp.name.toLowerCase() === targetName);
      if (p) {
          if (prev.produtos[p.name] !== next.produtos[p.name]) return false;
      }
  }
  
  return true;
};

// Helper for Espetinhos (Simples/Especiais) with dynamic variations
const EspetinhoRow = memo(({ baseName, cardapioEspetinhos, produtos, onIncrement, onDecrement, variacoes = [] }: EspetinhoRowProps) => {
  // 1. Map available variations to actual products - MEMOIZED
  const itensVariaveis = useMemo(() => {
    return variacoes.map(variacao => {
      // Try to find exact match "Nome Variação" (Case Insensitive)
      const targetName = `${baseName} ${variacao}`.toLowerCase();
      const produto = cardapioEspetinhos.find(p => p.name.toLowerCase() === targetName);
      return {
        label: variacao,
        produto: produto
      };
    }).filter((item): item is { label: string; produto: Product } => !!item.produto);
  }, [baseName, cardapioEspetinhos, variacoes]);

  if (itensVariaveis.length === 0) return null;

  // Cyclic colors for consistent UI
  const rowColors = [colors.warning, colors.success, colors.disabled, colors.secondary, colors.primary]; 

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
            onInc={onIncrement}
            onDec={onDecrement}
            itemKey={item.produto.name}
            last={idx === itensVariaveis.length - 1}
          />
        );
      })}
    </View>
  );
}, areEspetinhoPropsEqual);
EspetinhoRow.displayName = 'EspetinhoRow';

interface StackedVariationRowProps {
  name: string;
  price: number;
  qty: number;
  color: string;
  onInc: (key: string) => void;
  onDec: (key: string) => void;
  itemKey: string;
  last: boolean;
}

const StackedVariationRow = memo(({ name, price, qty, color, onInc, onDec, itemKey, last }: StackedVariationRowProps) => {
  const handleInc = useCallback(() => onInc(itemKey), [onInc, itemKey]);
  const handleDec = useCallback(() => onDec(itemKey), [onDec, itemKey]);

  return (
    <View style={[styles.stackedRowContainer, last && { marginBottom: 12 }]}>
      {/* Left Side: Info Card (Name + Price) */}
      <TouchableOpacity
        style={[styles.stackedInfoCard, { backgroundColor: colors.surfaceMuted, borderLeftWidth: 4, borderLeftColor: color }]}
        onPress={handleInc}
        activeOpacity={0.8}
      >
        <Text style={styles.stackedNameText}>{name}</Text>
        <Text style={styles.stackedPriceText}>R$ {price.toFixed(2)}</Text>
      </TouchableOpacity>

      {/* Right Side: Controls (Outside) */}
      <View style={styles.variationControlsOutside}>
        <TouchableOpacity style={[styles.roundBtn, { backgroundColor: colors.danger }]} onPress={handleDec}>
          <Text style={styles.roundBtnText}>−</Text>
        </TouchableOpacity>
        <Text style={styles.qtyText}>{qty}</Text>
        <TouchableOpacity style={[styles.roundBtn, { backgroundColor: colors.success }]} onPress={handleInc}>
          <Text style={styles.roundBtnText}>+</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
});
StackedVariationRow.displayName = 'StackedVariationRow';

interface VariationRowProps {
  label: string;
  qty: number;
  color: string;
  onInc: (key: string) => void;
  onDec: (key: string) => void;
  itemKey: string;
  last: boolean;
  forceOneLine?: boolean;
}

const VariationRow = memo(({ label, qty, color, onInc, onDec, itemKey, last, forceOneLine = false }: VariationRowProps) => {
  const handleInc = useCallback(() => onInc(itemKey), [onInc, itemKey]);
  const handleDec = useCallback(() => onDec(itemKey), [onDec, itemKey]);

  return (
    <View style={[styles.variationRow, last && { marginBottom: 12 }]}>
      <TouchableOpacity style={[styles.variationLabelBtn, { backgroundColor: colors.surfaceMuted, borderLeftWidth: 4, borderLeftColor: color }]} onPress={handleInc}>
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
        <TouchableOpacity style={[styles.roundBtn, { backgroundColor: colors.danger }]} onPress={handleDec}>
          <Text style={styles.roundBtnText}>−</Text>
        </TouchableOpacity>
        <Text style={styles.qtyText}>{qty}</Text>
        <TouchableOpacity style={[styles.roundBtn, { backgroundColor: colors.success }]} onPress={handleInc}>
          <Text style={styles.roundBtnText}>+</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
});
VariationRow.displayName = 'VariationRow';

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
  // Carrinho expandido/colapsado no footer fixo
  const [cartExpanded, setCartExpanded] = useState(false);
  
  // Performance monitoring
  const { startMonitoring, stopMonitoring, logMetrics, isMonitoring } = usePerformanceMonitor();

  const {
    user,
    loadingCardapio,
    cardapio,
    produtos,
    clientName,
    setClientName,
    mesa,
    setMesa,
    setTableId,
    setWaiterId,
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
    refreshCardapio,
    isRefreshingCardapio,
    extras
  } = useNovoPedido();

  const [showRefreshSuccess, setShowRefreshSuccess] = useState(false);
  const refreshSuccessTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const isInitialFocusRef = useRef(true);

  // Refresh menu whenever screen gains focus
  useFocusEffect(
    useCallback(() => {
      if (isInitialFocusRef.current) {
        isInitialFocusRef.current = false;
        return;
      }

      console.log('🔄 NovoPedidoScreen focused, refreshing menu...');
      carregarCardapio();
    }, [carregarCardapio])
  );

  const handleHeaderRefresh = useCallback(async () => {
    if (isRefreshingCardapio) return;

    setShowRefreshSuccess(false);
    await refreshCardapio();

    if (refreshSuccessTimeoutRef.current) {
      clearTimeout(refreshSuccessTimeoutRef.current);
    }

    setShowRefreshSuccess(true);
    refreshSuccessTimeoutRef.current = setTimeout(() => {
      setShowRefreshSuccess(false);
    }, 1000);
  }, [isRefreshingCardapio, refreshCardapio]);


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

  // Normaliza string: minúsculas + substitui acentos/diacríticos do português
  // Usa mapeamento explícito em vez de String.normalize('NFD') pois o Hermes
  // (engine padrão do React Native no Android) pode não suportar NFD corretamente.
  const normalizeStr = useCallback((str: string) =>
    str
      .toLowerCase()
      .replace(/[àáâãäå]/g, 'a')
      .replace(/[èéêë]/g, 'e')
      .replace(/[ìíîï]/g, 'i')
      .replace(/[òóôõö]/g, 'o')
      .replace(/[ùúûü]/g, 'u')
      .replace(/ç/g, 'c')
      .replace(/ñ/g, 'n'),
  []);

  // Filter sections based on search query
  const filteredSections = React.useMemo(() => {
    if (!searchQuery.trim()) return sections;

    const query = normalizeStr(searchQuery.trim());
    return sections.map(section => {
      const filteredData = section.data.filter(item => {
        if (typeof item === 'string') {
          // Allow string items (Caldos, Espetinhos base names) to be searched
          return normalizeStr(item).includes(query);
        }
        // Product items
        return normalizeStr(item.name ?? '').includes(query);
      });
      return { ...section, data: filteredData };
    }).filter(section => section.data.length > 0); // Remove empty sections
  }, [sections, searchQuery, normalizeStr]);

  // Wrappers for animation
  const updateProdutoAnimated = useCallback((itemName: string, delta: number) => {
    // Removed LayoutAnimation - it was causing lag on item selection
    // Direct update for better performance
    updateProduto(itemName, delta);
  }, [updateProduto]);

  const handleRemoveItemAnimated = useCallback((item: string) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.spring); // Spring for deletion feeling
    handleRemoveItem(item);
  }, [handleRemoveItem]);

  const handleStickyFooterRemove = useCallback((item: string) => {
    handleRemoveItemAnimated(item);
    if (selectedItems.length <= 1) {
      setCartExpanded(false);
    }
  }, [handleRemoveItemAnimated, selectedItems.length]);
  
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
    if (!isMonitoring) {
      startMonitoring();
    }
  }, [isMonitoring, startMonitoring]);
  
  const handleScrollEndDrag = useCallback(() => {
      if (isMonitoring) {
        stopMonitoring();
        logMetrics();
      }
  }, [isMonitoring, stopMonitoring, logMetrics]);

  // Log baseline metrics on mount
  useEffect(() => {
    console.log('📊 [Performance] Baseline measurement ready');
    console.log('📊 [Performance] Current SectionList config:', {
      initialNumToRender: 6,
      windowSize: 5,
      maxToRenderPerBatch: 5,
      updateCellsBatchingPeriod: 50,
      removeClippedSubviews: true
    });
  }, []);

  useEffect(() => {
    return () => {
      if (refreshSuccessTimeoutRef.current) {
        clearTimeout(refreshSuccessTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (selectedItems.length === 0 && cartExpanded) {
      setCartExpanded(false);
    }
  }, [cartExpanded, selectedItems.length]);

  // Moved renderItem before early return to comply with Rules of Hooks
  
  const handlePizzaPress = useCallback((pizzaItem: Product) => {
    setSelectedPizza(pizzaItem); 
    setShowPizzaModal(true);
  }, []);

  const renderItem = useCallback<SectionListRenderItem<SectionItem, Section>>(({ item, section }) => {
    if (section.type === 'pizzas-v2') {
      return (
        <PizzaRow 
          item={item as Product} 
          onPress={handlePizzaPress} 
        />
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
  }, [produtos, temperosCaldos, temperosComidas, variacoesEspetinho, handleIncrement, handleDecrement]);

  if (loadingCardapio) {
    return (
      <View style={styles.container}>
  
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



  return (
    <KeyboardAvoidingView 
      style={styles.container} 
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
    >
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <TouchableOpacity
            accessibilityLabel="Atualizar cardápio"
            accessibilityHint="Atualiza os itens do cardápio sem limpar os dados do pedido"
            disabled={isRefreshingCardapio}
            onPress={handleHeaderRefresh}
            style={[
              styles.headerRefreshButton,
              styles.headerRefreshButtonLeft,
              showRefreshSuccess ? styles.headerRefreshButtonSuccess : null,
              isRefreshingCardapio ? styles.headerRefreshButtonDisabled : null,
            ]}
          >
            {isRefreshingCardapio ? (
              <ActivityIndicator color={colors.white} size="small" />
            ) : showRefreshSuccess ? (
              <Ionicons color={colors.white} name="checkmark" size={18} />
            ) : (
              <Ionicons color={colors.white} name="refresh" size={18} />
            )}
          </TouchableOpacity>
        </View>
        <View style={styles.headerCenter}>
          <View style={styles.headerTitleRow}>
            <Ionicons name="receipt-outline" size={24} color={colors.white} style={styles.headerTitleIcon} />
            <Text style={styles.headerTitle}>Novo Pedido</Text>
          </View>
          {user && <Text style={styles.userInfo}>Operador: {user.nome || user.email}</Text>}
        </View>
        <View style={styles.headerActionsRight}>
          <TouchableOpacity activeOpacity={0.82} style={styles.logoutBtn} onPress={handleLogout}>
            <Ionicons color={colors.white} name="log-out-outline" size={14} style={styles.logoutBtnIcon} />
            <Text style={styles.logoutBtnText}>Sair</Text>
          </TouchableOpacity>
        </View>
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
        style={styles.sectionList}
        sections={filteredSections}
        renderItem={renderItem}
        renderSectionHeader={renderSectionHeader}
        keyExtractor={keyExtractor}
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={<NewOrderHeaderForm
          clientName={clientName}
          onClientNameChange={setClientName}
          mesa={mesa}
          onMesaChange={setMesa}
        />}
        ListFooterComponent={<NewOrderListFooter selectedItems={selectedItems} onRemoveItem={handleRemoveItemAnimated} />}
        stickySectionHeadersEnabled={false}
        initialNumToRender={10}
        maxToRenderPerBatch={10}
        windowSize={21}
        updateCellsBatchingPeriod={50}
        removeClippedSubviews={Platform.OS === 'android'} // Only true on Android if issues persist, but false is safer for glitches
        onScrollBeginDrag={handleScrollBeginDrag}
        onScrollEndDrag={handleScrollEndDrag}
        onMomentumScrollEnd={handleScrollEndDrag}
        legacyImplementation={false}
        scrollEventThrottle={16}
        disableScrollViewPanResponder={false}
        decelerationRate="normal"
      />

      <NewOrderCartFooter
        selectedItems={selectedItems}
        total={total}
        cartExpanded={cartExpanded}
        onToggleCart={() => setCartExpanded((prev) => !prev)}
        onRemoveItem={handleStickyFooterRemove}
        onSubmit={handleSubmit}
        isSubmitting={isSubmitting}
      />

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
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    minHeight: 92,
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
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerTitleIcon: {
    marginRight: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.white,
    textAlign: 'center',
  },
  userInfoLabel: {
    color: colors.primaryContrastMuted,
    fontSize: 11,
    fontWeight: '600',
  },
  userInfo: {
    fontSize: 12,
    color: colors.userInfo,
    fontWeight: '600',
    marginTop: 4,
    textAlign: 'center',
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 36,
    minWidth: 72,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.24)',
    backgroundColor: 'rgba(255,255,255,0.13)',
    paddingHorizontal: 10,
  },
  logoutBtnIcon: {
    marginRight: 4,
  },
  logoutBtnText: {
    color: colors.white,
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.15,
  },
  headerActionsRight: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  headerRefreshButton: {
    width: 36,
    height: 36,
    marginRight: 10,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.26)',
    backgroundColor: 'rgba(255,255,255,0.14)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerRefreshButtonLeft: {
    marginRight: 0,
  },
  headerRefreshButtonSuccess: {
    backgroundColor: 'rgba(68,188,122,0.55)',
    borderColor: 'rgba(173,255,209,0.75)',
  },
  headerRefreshButtonDisabled: {
    opacity: 0.75,
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
    borderBottomColor: colors.border,
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
    color: colors.textLight,
    fontSize: 16,
  },
  waiterItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    backgroundColor: colors.white,
  },
  waiterItemActive: {
    backgroundColor: colors.primaryTint,
  },
  waiterInfo: {
    flex: 1,
  },
  waiterName: {
    fontSize: 16,
    color: colors.text,
    marginBottom: 4,
  },
  waiterNameActive: {
    fontWeight: 'bold',
    color: colors.primary,
  },
  waiterRole: {
    fontSize: 12,
    color: colors.textLight,
  },
  separator: {
    height: 1,
    backgroundColor: colors.border,
    marginLeft: 15,
  },

  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: colors.primary, marginTop: 20, marginBottom: 12 },

  // Card Styles — touch zone mínimo de 44dp para botões de quantidade
  quantityBtn: {
    backgroundColor: colors.primary,
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  quantityBtnText: {
    color: colors.white,
    fontSize: 18,
    fontWeight: 'bold',
  },
  caldoCard: { backgroundColor: colors.white, borderRadius: 12, padding: 16, marginBottom: 12, elevation: 1 },
  standardCard: { backgroundColor: colors.white, borderRadius: 12, padding: 16, marginBottom: 12, elevation: 1 },
  simpleCard: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, backgroundColor: colors.white, padding: 16, borderRadius: 8, elevation: 1 },
  verticalCard: { flexDirection: 'column', marginBottom: 12, backgroundColor: colors.white, padding: 16, borderRadius: 8, elevation: 1 },

  produtoName: { fontSize: 18, fontWeight: '700', color: colors.text, marginBottom: 4, textAlign: 'left' },
  sizeTitle: { fontSize: 17, fontWeight: '700', color: colors.primary, marginTop: 8, marginBottom: 4, textAlign: 'left' },

  simpleName: { fontSize: 18, fontWeight: '700', color: colors.text, flex: 1, textAlign: 'left' },
  verticalName: { fontSize: 18, fontWeight: '700', color: colors.text, marginBottom: 8, textAlign: 'left' },

  verticalControlsRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },

  simplePrice: { fontSize: 17, fontWeight: '700', color: colors.primary, marginHorizontal: 12 },
  verticalPrice: { fontSize: 17, fontWeight: '700', color: colors.primary },

  // Variation Rows
  variationRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 10, backgroundColor: colors.surfaceMuted, borderRadius: 8, padding: 8 },
  variationLabelBtn: { flex: 1, padding: 8, borderRadius: 8, marginRight: 8, justifyContent: 'center' },
  variationLabelText: { color: colors.text, fontSize: 16, fontWeight: '700', textAlign: 'left' },

  // NEW STYLES FOR STACKED VARIATION
  stackedRowContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  stackedInfoCard: {
    flex: 1,
    padding: 12,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'flex-start',
    marginRight: 12,
  },
  variationControlsOutside: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  stackedNameText: {
    color: colors.text,
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'left',
    marginBottom: 4,
  },
  stackedInfoContent: {
    alignItems: 'flex-start',
  },
  productCardWrapper: {
    marginBottom: 12,
  },
  pizzaIngredientsText: {
    color: colors.textSecondary,
    fontSize: 13,
    textAlign: 'left',
    marginBottom: 4,
    fontStyle: 'italic',
  },
  pizzaCustomIngredientsText: {
    color: colors.textLight,
    fontSize: 12,
    textAlign: 'left',
    marginBottom: 4,
    fontStyle: 'italic',
  },
  pizzaPriceChip: {
    backgroundColor: colors.surfaceMuted,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    marginTop: 4,
  },
  pizzaPriceChipText: {
    color: colors.text,
    fontSize: 15,
    fontWeight: 'bold',
  },
  stackedPriceText: {
    color: colors.primary,
    fontSize: 17,
    fontWeight: 'bold',
    textAlign: 'left',
  },

  variationControls: { flexDirection: 'row', alignItems: 'center' },
  roundBtn: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center', marginHorizontal: 4 },
  roundBtnText: { color: colors.white, fontSize: 18, fontWeight: 'bold' },
  qtyText: { fontSize: 16, fontWeight: 'bold', minWidth: 24, textAlign: 'center' },

  produtoRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  produtoInfo: { flex: 1, marginRight: 12 },
  produtoPrice: { fontSize: 17, fontWeight: '700', color: colors.primary, textAlign: 'left', marginTop: 4 },

  quantityControl: { flexDirection: 'row', alignItems: 'center' },

  headerFieldsRow: {
    flexDirection: 'row',
    marginBottom: 10,
  },
  clientFieldColumn: {
    flex: 1,
    marginRight: 10,
  },
  mesaFieldColumn: {
    width: 80,
  },
  sectionList: {
    flex: 1,
  },
  submitBtn: { backgroundColor: colors.primary, borderRadius: 12, padding: 16, alignItems: 'center' },
  submitBtnDisabled: { opacity: 0.5 },
  submitBtnText: { color: colors.white, fontSize: 18, fontWeight: 'bold' },

  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 12, fontSize: 16, color: colors.primary },

  priceLegend: { fontSize: 13, color: colors.textSecondary, textAlign: 'center', marginBottom: 12 },

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
    paddingVertical: 12,
    paddingHorizontal: 12,
    backgroundColor: colors.surfaceMuted,
    borderRadius: 12,
  },
  searchClearBtn: {
    padding: 4,
  },

});
