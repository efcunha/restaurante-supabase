import { StatusBar } from 'expo-status-bar';
import LicenseGate from '../components/LicenseGate';
import { Alert, Modal, StyleSheet, Text, View, SectionList, ScrollView, TouchableOpacity, TextInput, ActivityIndicator, LayoutAnimation, Platform, UIManager, SectionListRenderItem } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import React, { memo, useCallback, useState, useMemo, useRef, useEffect } from 'react';

import { useNovoPedido, type SubmitOrderResult } from '../hooks/useNovoPedido';
import { usePerformanceMonitor } from '../hooks/usePerformanceMonitor';
import { isFeatureEnabled } from '../config/featureFlags';
import { useFocusEffect } from '@react-navigation/native';
// @ts-ignore
import PizzaBuilderModal from '../components/PizzaBuilderModal';
import AdicionaisPickerModal from '../components/AdicionaisPickerModal';
import { Product } from '../types';
import { ProductAdicional, SelectedAdicional } from '../types/models';
import { AdicionaisService } from '../services/AdicionaisService';
import { NewOrderCartFooter } from '../features/new-order/components/NewOrderCartFooter';
import { NewOrderHeaderForm } from '../features/new-order/components/NewOrderHeaderForm';
import { NewOrderListFooter } from '../features/new-order/components/NewOrderListFooter';
import { PizzaProductCard } from '../features/new-order/components/PizzaProductCard';
import { BalancaDisplay, useScaleReading } from '../features/pdv';
// KeyboardWrapper removed to prevent touch stealing
import { KeyboardAvoidingView } from 'react-native';
import { colors } from '../theme/colors';
import PrinterService from '../services/PrinterService';
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
      {(() => {
        const source = item300 || item180;
        const ingList = source?.ingredients;
        return ingList && ingList.length > 0 ? (
          <Text style={styles.pizzaIngredientsText}>{ingList.join(', ')}</Text>
        ) : null;
      })()}

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
    // For porcoes: count all variant keys (base + "base + ...") to detect changes
    const prefix = prev.item.name;
    const sumQty = (produtos: Record<string, number>) =>
      Object.entries(produtos)
        .filter(([k]) => k === prefix || k.startsWith(prefix + ' + '))
        .reduce((s, [, v]) => s + v, 0);
    return sumQty(prev.produtos) === sumQty(next.produtos);
  }
};

// Helper for other items (Comidas/Bebidas/Porcoes)
const StandardRow = memo(({ item, produtos, onIncrement, onDecrement, type, temperos }: StandardRowProps) => {
  const isComida = type === 'comidas';
  const detailsText = typeof item.description === 'string' ? item.description.trim() : '';

  if (isComida) {
    return (
      <View style={styles.standardCard}>
        <View style={styles.produtoRow}>
          <View style={styles.produtoInfo}>
            <Text style={styles.produtoName}>{item.name}</Text>
            {item.ingredients && item.ingredients.length > 0 && (
              <Text style={styles.pizzaIngredientsText}>{item.ingredients.join(', ')}</Text>
            )}
            {!item.ingredients?.length && detailsText.length > 0 && (
              <Text style={styles.pizzaIngredientsText}>{detailsText}</Text>
            )}
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
  // For porcoes, sum base qty + all variant qtys ("Item + Extra1, Extra2")
  const qty = Object.entries(produtos)
    .filter(([k]) => k === item.name || k.startsWith(item.name + ' + '))
    .reduce((sum, [, v]) => sum + v, 0);
  
  const handleInc = useCallback(() => onIncrement(item.name), [onIncrement, item.name]);
  const handleDec = useCallback(() => onDecrement(item.name), [onDecrement, item.name]);

  return (
    <View style={styles.verticalCard}>
      <Text style={styles.verticalName}>{item.name}</Text>
      {detailsText.length > 0 && (
        <Text style={styles.pizzaIngredientsText}>{detailsText}</Text>
      )}

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

  const acompanhamentosInfo = useMemo(() => {
    const primeiraVariacao = itensVariaveis[0]?.produto;
    const acompanhamentos = Array.isArray(primeiraVariacao?.accompaniments)
      ? primeiraVariacao.accompaniments.map((item) => String(item).trim()).filter(Boolean)
      : [];
    if (acompanhamentos.length === 0) return '';
    return `Acompanha: ${acompanhamentos.join(', ')}`;
  }, [itensVariaveis]);

  if (itensVariaveis.length === 0) return null;

  // Cyclic colors for consistent UI
  const rowColors = [colors.warning, colors.success, colors.disabled, colors.secondary, colors.primary]; 

  return (
    <View style={styles.caldoCard}>
      <Text style={styles.produtoName}>{baseName}</Text>
      {!!acompanhamentosInfo && (
        <Text style={styles.pizzaIngredientsText}>{acompanhamentosInfo}</Text>
      )}

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

export default function NovoPedidoScreen({ route, navigation }: any) {
  const [footerHeight, setFooterHeight] = useState(112);
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
    pizzaSubcategories,
    bebidaSubcategories,
    pizzaConfig,
    addPizzaToOrder,
    addPorcaoWithAdicionais,
    addWeightedItem,
    enableSelfServiceScaleFlow,
    disableSelfServiceScaleFlow,
    carregarCardapio,
    refreshCardapio,
    isRefreshingCardapio,
    extras
  } = useNovoPedido();

  // ─── Adicionais para porções ──────────────────────────────────────────────
  const [adicionaisMap, setAdicionaisMap] = useState<Record<string, ProductAdicional[]>>({});
  const [adicionaisPickerProduct, setAdicionaisPickerProduct] = useState<(Product & { price: number }) | null>(null);
  const [weightedProductTarget, setWeightedProductTarget] = useState<Product | null>(null);
  const [manualWeightKg, setManualWeightKg] = useState('');
  const [manualFallbackVisible, setManualFallbackVisible] = useState(false);
  const [selfServiceScaleModeEnabled, setSelfServiceScaleModeEnabled] = useState(false);
  const [selfServiceScalePaymentMode, setSelfServiceScalePaymentMode] = useState<'immediate' | 'deferred'>('deferred');

  const {
    status: scaleStatus,
    isReading: scaleIsReading,
    isPolling: scaleIsPolling,
    lastResult: scaleLastResult,
    captureCurrentWeight,
    captureStableWeight,
    applyTare,
    startPolling,
    stopPolling,
    reset: resetScale,
    dispose: disposeScale,
  } = useScaleReading();

  const isScaleFeatureEnabled = isFeatureEnabled('pdv_enabled') && isFeatureEnabled('pdv_scale_enabled');
  const isSelfServiceScaleFeatureEnabled = isScaleFeatureEnabled && isFeatureEnabled('pdv_selfServiceScale_enabled');
  const scaleServicePoint = process.env.EXPO_PUBLIC_PDV_SCALE_SERVICE_POINT || 'balanca_01';
  const externalPosEnabled = isFeatureEnabled('pdv_enabled') && isFeatureEnabled('pdv_externalPos_enabled');

  useEffect(() => {
    const porcoes = cardapio?.porcoes;
    if (!porcoes || !user?.companyId) return;
    let cancelled = false;

    const loadAdicionais = async () => {
      const map: Record<string, ProductAdicional[]> = {};
      await Promise.all(
        porcoes.map(async (p) => {
          try {
            const adics = await AdicionaisService.fetchByProduct(p.id, user.companyId);
            if (adics.length > 0) map[p.id] = adics;
          } catch {
            // silencioso: se falhar, comporta como sem adicionais
          }
        })
      );
      if (!cancelled) setAdicionaisMap(map);
    };

    loadAdicionais();
    return () => { cancelled = true; };
  }, [cardapio?.porcoes, user?.companyId]);

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

  useEffect(() => {
    return () => {
      disposeScale();
    };
  }, [disposeScale]);

  const cardapioCombinado = useMemo<Product[]>(() => [
    ...(cardapio.caldos || []),
    ...(cardapio.comidas || []),
    ...((cardapio['comida-balanca'] as Product[]) || []),
    ...(cardapio.bebidas || []),
    ...(cardapio.porcoes || []),
    ...(cardapio.outros || []),
    ...(cardapio.espetinhosSimples || []),
    ...(cardapio.espetinhosEspeciais || []),
    ...(cardapio.pizzas || []),
  ], [cardapio]);

  const resolveProductByItemName = useCallback((itemName: string): Product | null => {
    const baseName = itemName.split(' + ')[0].replace(/\s*\(.*\)$/, '').trim();
    return cardapioCombinado.find((product) => product.name === baseName) || null;
  }, [cardapioCombinado]);

  const isSoldByWeight = useCallback((product: Product | null | undefined): boolean => {
    if (!product) return false;

    const unit = String(product.unit || '').toLowerCase();
    const soldByWeightFlag = Boolean((product as unknown as { vendido_por_peso?: boolean }).vendido_por_peso);

    return soldByWeightFlag || unit.includes('kg') || unit.includes('quilo');
  }, []);

  const openScaleModal = useCallback((product: Product) => {
    setWeightedProductTarget(product);
    setManualWeightKg('');
    setManualFallbackVisible(false);
    resetScale();
    startPolling(1200, 3000);
  }, [resetScale, startPolling]);

  const closeScaleModal = useCallback(() => {
    stopPolling();
    setWeightedProductTarget(null);
    setManualWeightKg('');
    setManualFallbackVisible(false);
  }, [stopPolling]);

  const syncScaleFlowMode = useCallback(() => {
    if (!isSelfServiceScaleFeatureEnabled || !selfServiceScaleModeEnabled) {
      disableSelfServiceScaleFlow();
      return;
    }

    enableSelfServiceScaleFlow({
      servicePoint: scaleServicePoint,
      paymentMode: selfServiceScalePaymentMode,
    });
  }, [disableSelfServiceScaleFlow, enableSelfServiceScaleFlow, isSelfServiceScaleFeatureEnabled, scaleServicePoint, selfServiceScaleModeEnabled, selfServiceScalePaymentMode]);

  const confirmAutomaticWeight = useCallback(() => {
    if (!weightedProductTarget) return;

    const reading = scaleLastResult?.reading;
    if (!reading || !reading.isStable || reading.weightKg <= 0) {
      Alert.alert('Leitura nao confirmada', 'Capture um peso estavel antes de confirmar.');
      return;
    }

    syncScaleFlowMode();
    addWeightedItem(weightedProductTarget, reading.weightKg, 'automatic');
    closeScaleModal();
  }, [weightedProductTarget, scaleLastResult, syncScaleFlowMode, addWeightedItem, closeScaleModal]);

  const confirmManualWeight = useCallback(() => {
    if (!weightedProductTarget) return;

    const parsedWeightKg = Number(String(manualWeightKg).replace(',', '.'));
    if (!Number.isFinite(parsedWeightKg) || parsedWeightKg <= 0) {
      Alert.alert('Peso manual invalido', 'Informe um peso valido em kg para continuar.');
      return;
    }

    syncScaleFlowMode();
    addWeightedItem(weightedProductTarget, parsedWeightKg, 'manual');
    closeScaleModal();
  }, [weightedProductTarget, manualWeightKg, syncScaleFlowMode, addWeightedItem, closeScaleModal]);

  useEffect(() => {
    if (selectedItems.length !== 0 || weightedProductTarget) return;

    setSelfServiceScaleModeEnabled(false);
    setSelfServiceScalePaymentMode('deferred');
    disableSelfServiceScaleFlow();
  }, [disableSelfServiceScaleFlow, selectedItems.length, weightedProductTarget]);

  const printSelfServiceComanda = useCallback(async (result: SubmitOrderResult) => {
    const now = new Date();
    const horarioCriacao = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

    await PrinterService.printComanda({
      comandaNumber: result.comandaNumber,
      cliente: result.clientName,
      horarioCriacao,
      itens: result.itens,
      totalConsumido: result.total,
      totalPago: 0,
      saldoAberto: result.total,
    });
  }, []);

  const handleSubmitAndContinue = useCallback(async () => {
    const result = await handleSubmit();
    if (!result || result.flowContext?.orderOrigin !== 'self_service_scale') {
      return;
    }

    if (result.flowContext.paymentMode === 'immediate') {
      navigation.navigate('Pagamento', {
        comandaNumber: result.comandaNumber,
        returnScreen: 'NovoPedido',
        paymentMode: externalPosEnabled ? 'external_pos' : 'normal',
      });
      return;
    }

    await printSelfServiceComanda(result);
  }, [externalPosEnabled, handleSubmit, navigation, printSelfServiceComanda]);


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

      const configuredPizzaSubcategories = (pizzaSubcategories || [])
        .map((item) => (item || '').trim())
        .filter((item, index, arr) => item.length > 0 && arr.indexOf(item) === index);

      const categoryOrder = [...configuredPizzaSubcategories, 'Outras'];

      // Group pizzas by subcategory
      const pizzasByCategory: Record<string, Product[]> = categoryOrder.reduce((acc, current) => {
        acc[current] = [];
        return acc;
      }, {} as Record<string, Product[]>);

      uniquePizzas.forEach(pizza => {
        const normalizedSubcategory = (pizza.subcategory || '').trim();
        const targetKey = normalizedSubcategory || 'Outras';
        if (!pizzasByCategory[targetKey]) {
          pizzasByCategory[targetKey] = [];
        }
        pizzasByCategory[targetKey].push(pizza);
      });

      // Add sections for each category that has pizzas
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

    const comidaBalanca = ((cardapio['comida-balanca'] as Product[]) || []).filter((item) => isActive(item));
    if (comidaBalanca.length > 0) {
      sectionsData.push({ title: '⚖️ Comida Balança', data: comidaBalanca, type: 'comida-balanca' });
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
      const configuredBebidaSubcategories = (bebidaSubcategories || [])
        .map((item) => (item || '').trim())
        .filter((item, index, arr) => item.length > 0 && arr.indexOf(item) === index);
      const bebidaCategoryOrder = [...configuredBebidaSubcategories, 'Outras'];
      const bebidasByCategory: Record<string, Product[]> = bebidaCategoryOrder.reduce((acc, current) => {
        acc[current] = [];
        return acc;
      }, {} as Record<string, Product[]>);

      activeBebidas.forEach((bebida) => {
        const normalizedSubcategory = (bebida.subcategory || '').trim();
        const targetKey = normalizedSubcategory || 'Outras';
        if (!bebidasByCategory[targetKey]) {
          bebidasByCategory[targetKey] = [];
        }
        bebidasByCategory[targetKey].push(bebida);
      });

      bebidaCategoryOrder.forEach((subcategory) => {
        if (bebidasByCategory[subcategory]?.length > 0) {
          sectionsData.push({
            title: `🥤 Bebidas > ${subcategory}`,
            data: bebidasByCategory[subcategory],
            type: 'bebidas'
          });
        }
      });
    }

    return sectionsData;
  }, [cardapio, variacoesEspetinho, pizzaSubcategories, bebidaSubcategories]);

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
    const product = resolveProductByItemName(itemName);
    if (isScaleFeatureEnabled && isSoldByWeight(product)) {
      openScaleModal(product as Product);
      return;
    }
    updateProdutoAnimated(itemName, 1);
  }, [resolveProductByItemName, isScaleFeatureEnabled, isSoldByWeight, openScaleModal, updateProdutoAnimated]);
  
  const handleDecrement = useCallback((itemName: string) => {
    updateProdutoAnimated(itemName, -1);
  }, [updateProdutoAnimated]);

  // Open adicionais picker for porcoes — always show picker
  const handlePorcaoIncrement = useCallback((itemName: string) => {
    const porcoes = cardapio?.porcoes || [];
    const product = porcoes.find(p => p.name === itemName);
    if (product) {
      if (isScaleFeatureEnabled && isSoldByWeight(product)) {
        openScaleModal(product);
        return;
      }
      setAdicionaisPickerProduct(product as Product & { price: number });
    } else {
      updateProdutoAnimated(itemName, 1);
    }
  }, [cardapio?.porcoes, isScaleFeatureEnabled, isSoldByWeight, openScaleModal, updateProdutoAnimated]);
  
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
    const componentDiagnostics = {
      LicenseGate: typeof LicenseGate,
      NewOrderHeaderForm: typeof NewOrderHeaderForm,
      NewOrderListFooter: typeof NewOrderListFooter,
      NewOrderCartFooter: typeof NewOrderCartFooter,
      PizzaProductCard: typeof PizzaProductCard,
      PizzaBuilderModal: typeof PizzaBuilderModal,
      AdicionaisPickerModal: typeof AdicionaisPickerModal,
      StatusBar: typeof StatusBar,
    };

    console.log('🧪 [NovoPedidoScreen] Component diagnostics:', componentDiagnostics);

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
    return <StandardRow item={item as Product} produtos={produtos} onIncrement={section.type === 'porcoes' ? handlePorcaoIncrement : handleIncrement} onDecrement={handleDecrement} type={section.type} temperos={temperosComidas} />;
  }, [produtos, temperosCaldos, temperosComidas, variacoesEspetinho, handleIncrement, handleDecrement, handlePorcaoIncrement]);

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
    <LicenseGate>
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
        style={[styles.sectionList, { marginBottom: footerHeight }]}
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
        onSubmit={handleSubmitAndContinue}
        isSubmitting={isSubmitting}
        onHeightChange={setFooterHeight}
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

      {adicionaisPickerProduct && (
        <AdicionaisPickerModal
          visible={!!adicionaisPickerProduct}
          onClose={() => setAdicionaisPickerProduct(null)}
          onConfirm={(selectedAdicionais: SelectedAdicional[]) => {
            addPorcaoWithAdicionais(
              adicionaisPickerProduct.name,
              adicionaisPickerProduct.price || 0,
              selectedAdicionais
            );
            setAdicionaisPickerProduct(null);
          }}
          product={{
            id: adicionaisPickerProduct.id,
            name: adicionaisPickerProduct.name,
            price: adicionaisPickerProduct.price || 0,
          }}
          companyId={user?.companyId || ''}
          adicionais={adicionaisMap[adicionaisPickerProduct.id] || []}
        />
      )}

      <Modal
        animationType="slide"
        transparent
        visible={Boolean(weightedProductTarget)}
        onRequestClose={closeScaleModal}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.scaleModalTitle}>Pesagem assistida</Text>
            <Text style={styles.scaleModalSubtitle}>
              {weightedProductTarget ? weightedProductTarget.name : ''}
            </Text>

            {isSelfServiceScaleFeatureEnabled && (
              <View style={styles.scaleModeCard}>
                <Text style={styles.scaleModeTitle}>Fluxo operacional desta pesagem</Text>
                <View style={styles.scaleModeRow}>
                  <TouchableOpacity
                    style={[styles.scaleModeChip, !selfServiceScaleModeEnabled && styles.scaleModeChipActive]}
                    onPress={() => {
                      setSelfServiceScaleModeEnabled(false);
                      disableSelfServiceScaleFlow();
                    }}
                  >
                    <Text style={[styles.scaleModeChipText, !selfServiceScaleModeEnabled && styles.scaleModeChipTextActive]}>Pedido padrao</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.scaleModeChip, selfServiceScaleModeEnabled && styles.scaleModeChipActive]}
                    onPress={() => {
                      setSelfServiceScaleModeEnabled(true);
                      enableSelfServiceScaleFlow({ servicePoint: scaleServicePoint, paymentMode: selfServiceScalePaymentMode });
                    }}
                  >
                    <Text style={[styles.scaleModeChipText, selfServiceScaleModeEnabled && styles.scaleModeChipTextActive]}>Self-service</Text>
                  </TouchableOpacity>
                </View>

                {selfServiceScaleModeEnabled && (
                  <View style={styles.scaleModeRow}>
                    <TouchableOpacity
                      style={[styles.scaleModeChip, selfServiceScalePaymentMode === 'deferred' && styles.scaleModeChipActive]}
                      onPress={() => {
                        setSelfServiceScalePaymentMode('deferred');
                        enableSelfServiceScaleFlow({ servicePoint: scaleServicePoint, paymentMode: 'deferred' });
                      }}
                    >
                      <Text style={[styles.scaleModeChipText, selfServiceScalePaymentMode === 'deferred' && styles.scaleModeChipTextActive]}>Comanda pendente</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.scaleModeChip, selfServiceScalePaymentMode === 'immediate' && styles.scaleModeChipActive]}
                      onPress={() => {
                        setSelfServiceScalePaymentMode('immediate');
                        enableSelfServiceScaleFlow({ servicePoint: scaleServicePoint, paymentMode: 'immediate' });
                      }}
                    >
                      <Text style={[styles.scaleModeChipText, selfServiceScalePaymentMode === 'immediate' && styles.scaleModeChipTextActive]}>Pagar no posto</Text>
                    </TouchableOpacity>
                  </View>
                )}

                <Text style={styles.scaleModeHint}>
                  {selfServiceScaleModeEnabled
                    ? `Origem self-service ativa em ${scaleServicePoint}.`
                    : 'Mantem o fluxo legado e nao classifica a pesagem como self-service.'}
                </Text>
              </View>
            )}

            <BalancaDisplay
              status={scaleStatus}
              lastResult={scaleLastResult}
              isReading={scaleIsReading}
              isPolling={scaleIsPolling}
              onCaptureCurrentWeight={() => {
                void captureCurrentWeight();
              }}
              onCaptureStableWeight={() => {
                void captureStableWeight();
              }}
              onStartPolling={() => {
                startPolling(1200, 3000);
              }}
              onStopPolling={stopPolling}
              onApplyTare={() => {
                void applyTare();
              }}
              onUseManualFallback={() => {
                setManualFallbackVisible(true);
              }}
            />

            {manualFallbackVisible && (
              <View style={styles.scaleManualWrapper}>
                <Text style={styles.scaleManualHint}>Fallback manual supervisionado (kg)</Text>
                <TextInput
                  style={styles.scaleManualInput}
                  keyboardType="decimal-pad"
                  placeholder="Ex: 0,532"
                  value={manualWeightKg}
                  onChangeText={setManualWeightKg}
                />
                <TouchableOpacity style={styles.scaleSecondaryActionBtn} onPress={confirmManualWeight}>
                  <Text style={styles.scaleSecondaryActionBtnText}>Confirmar peso manual</Text>
                </TouchableOpacity>
              </View>
            )}

            <View style={styles.scaleActionRow}>
              <TouchableOpacity style={styles.scaleCancelBtn} onPress={closeScaleModal}>
                <Text style={styles.scaleCancelBtnText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.scaleConfirmBtn} onPress={confirmAutomaticWeight}>
                <Text style={styles.scaleConfirmBtnText}>Confirmar leitura estavel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <StatusBar style="dark" />
    </KeyboardAvoidingView>
    </LicenseGate>
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
  listContent: { padding: 20, paddingBottom: 24 },
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
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  scaleModalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 4,
  },
  scaleModalSubtitle: {
    fontSize: 13,
    color: colors.textSecondary,
    marginBottom: 12,
  },
  scaleModeCard: {
    borderWidth: 1,
    borderColor: '#D7E3F4',
    backgroundColor: '#F7FAFE',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    gap: 10,
  },
  scaleModeTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
  },
  scaleModeRow: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  scaleModeChip: {
    borderWidth: 1,
    borderColor: '#B7C8DE',
    backgroundColor: '#FFFFFF',
    borderRadius: 999,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  scaleModeChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  scaleModeChipText: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '600',
  },
  scaleModeChipTextActive: {
    color: colors.white,
  },
  scaleModeHint: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  scaleManualWrapper: {
    marginTop: 12,
    gap: 8,
  },
  scaleManualHint: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  scaleManualInput: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: colors.text,
  },
  scaleSecondaryActionBtn: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
    backgroundColor: colors.surfaceMuted,
  },
  scaleSecondaryActionBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.text,
  },
  scaleActionRow: {
    marginTop: 14,
    flexDirection: 'row',
    gap: 8,
  },
  scaleCancelBtn: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
    backgroundColor: colors.white,
  },
  scaleCancelBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.text,
  },
  scaleConfirmBtn: {
    flex: 1,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
    backgroundColor: colors.primary,
  },
  scaleConfirmBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.white,
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
