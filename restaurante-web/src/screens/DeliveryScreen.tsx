import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, View, SectionList, ScrollView, TouchableOpacity, TextInput, ActivityIndicator, LayoutAnimation, Platform, UIManager, SectionListRenderItem, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import React, { memo, useCallback, useState, useMemo, useRef } from 'react';

import { useNovoPedido } from '../hooks/useNovoPedido';
import { usePerformanceMonitor } from '../hooks/usePerformanceMonitor';
import { Button } from '../ui';
import { useFocusEffect } from '@react-navigation/native';
import PizzaBuilderModal from '../components/PizzaBuilderModal';
import { Product } from '../types';
import { KeyboardAvoidingView } from 'react-native';
import supabaseOrderService from '../services/supabase/SupabaseOrderService';
import OrderService from '../services/OrderService';
import { supabase } from '../config/SupabaseConfig';
import { ScreenScaffold } from '../layouts/ScreenScaffold';
import { NewOrderListFooter, PizzaProductCard } from '../features/new-order';
import { DeliveryOrderForm, DeliverySubmitFooter } from '../features/delivery';
import { isFeatureEnabled } from '../config/featureFlags';
import { colors } from '../theme/colors';
if (Platform.OS === 'android') {
  if (UIManager.setLayoutAnimationEnabledExperimental) {
    UIManager.setLayoutAnimationEnabledExperimental(true);
  }
}

const toTestId = (value: string) =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

const QuantityButton = memo(({ onPress, text }: { onPress: () => void, text: string }) => (
  <TouchableOpacity style={styles.quantityBtn} onPress={onPress}>
    <Text style={styles.quantityBtnText}>{text}</Text>
  </TouchableOpacity>
));
QuantityButton.displayName = 'QuantityButton';

const PizzaRow = memo(({ item, onPress }: { item: Product, onPress: (item: Product) => void }) => {
  return (
    <View style={styles.productCardWrapper}>
      <PizzaProductCard item={item} onPress={onPress} />
    </View>
  );
});
PizzaRow.displayName = 'PizzaRow';

const areCaldoPropsEqual = (prev: any, next: any) => {
  if (prev.caldoBase !== next.caldoBase) return false;
  const sizes = ['300ml', '180ml'];
  for (const size of sizes) {
      for (const tempero of prev.temperos) {
          const key = `${prev.caldoBase} ${size} (${tempero})`;
          if (prev.produtos[key] !== next.produtos[key]) return false;
      }
  }
  return true;
};

const CaldoRow = memo(({ caldoBase, cardapioCaldos, produtos, onIncrement, onDecrement, temperos }: any) => {
  const item300 = useMemo(() => cardapioCaldos.find((c: any) => c.name.includes(caldoBase) && c.name.match(/300\s*ml/i)), [cardapioCaldos, caldoBase]);
  const item180 = useMemo(() => cardapioCaldos.find((c: any) => c.name.includes(caldoBase) && c.name.match(/180\s*ml/i)), [cardapioCaldos, caldoBase]);

  if (!item300 && !item180) return null;

  const renderTemperos = useCallback((sizeLabel: string) => (
    temperos.map((tempero: string, idx: number) => {
      const nome = `${caldoBase} ${sizeLabel} (${tempero})`;
      const qty = produtos[nome] || 0;
      const cor = idx === 0 ? colors.warning : idx === 1 ? colors.success : colors.disabled;
      
      let icone = '⚪';
      if (tempero.toLowerCase().includes('cebolinha') && tempero.toLowerCase().includes('coentro')) icone = '🌿';
      else if (tempero.toLowerCase().includes('cebolinha')) icone = '🧅';
      else if (tempero.toLowerCase().includes('sem nada')) icone = '⚪';
      else icone = '🔸';

      return (
        <VariationRow key={nome} label={`${icone} ${tempero}`} qty={qty} color={cor} onInc={onIncrement} onDec={onDecrement} itemKey={nome} last={idx === temperos.length - 1} />
      );
    })
  ), [caldoBase, temperos, onIncrement, onDecrement, produtos]);

  return (
    <View style={styles.caldoCard}>
      <Text style={styles.produtoName}>{caldoBase}</Text>
      {item300 && (
        <>
          <Text style={styles.sizeTitle}>📏 300ml - R$ {item300.price?.toFixed(2)}</Text>
          {renderTemperos('300ml')}
        </>
      )}
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

const areStandardPropsEqual = (prev: any, next: any) => {
  if (prev.item.name !== next.item.name) return false;
  if (prev.type !== next.type) return false;
  if (prev.type === 'comidas') {
    for (const t of prev.temperos) {
      if (prev.produtos[`${prev.item.name} (${t})`] !== next.produtos[`${prev.item.name} (${t})`]) return false;
    }
    return true;
  }
  return prev.produtos[prev.item.name] === next.produtos[next.item.name];
};

const StandardRow = memo(({ item, produtos, onIncrement, onDecrement, type, temperos }: any) => {
  if (type === 'comidas') {
    return (
      <View style={styles.standardCard}>
        <View style={styles.produtoRow}>
          <View style={styles.produtoInfo}>
            <Text style={styles.produtoName}>{item.name}</Text>
            <Text style={styles.produtoPrice}>R$ {item.price?.toFixed(2)}</Text>
          </View>
        </View>
        {temperos.map((t: string, idx: number) => {
          const suffix = `(${t})`;
          const color = idx === 0 ? colors.warning : idx === 1 ? colors.success : colors.disabled;
          let label = t;
          if (t.toLowerCase().includes('cebolinha') && t.toLowerCase().includes('coentro')) label = `🌿 ${t}`;
          else if (t.toLowerCase().includes('cebolinha')) label = `🧅 ${t}`;
          else if (t.toLowerCase().includes('sem nada')) label = `⚪ ${t}`;
          else label = `🔸 ${t}`;

          const itemName = `${item.name} ${suffix}`;
          return <VariationRow key={suffix} label={label} qty={produtos[itemName] || 0} color={color} onInc={onIncrement} onDec={onDecrement} itemKey={itemName} last={idx === temperos.length - 1} />;
        })}
      </View>
    );
  }

  const qty = produtos[item.name] || 0;
  const handleInc = useCallback(() => onIncrement(item.name), [onIncrement, item.name]);
  const handleDec = useCallback(() => onDecrement(item.name), [onDecrement, item.name]);

  return (
    <View style={styles.verticalCard}>
      <Text style={styles.verticalName}>{item.name}</Text>
      <View style={styles.verticalControlsRow}>
        <Text style={styles.verticalPrice}>R$ {item.price?.toFixed(2)}</Text>
        <View style={styles.quantityControl}>
          <TouchableOpacity style={[styles.roundBtn, { backgroundColor: colors.danger }]} onPress={handleDec}><Text style={styles.roundBtnText}>−</Text></TouchableOpacity>
          <Text style={styles.qtyText}>{qty}</Text>
          <TouchableOpacity testID={`delivery-inc-${toTestId(item.name)}`} style={[styles.roundBtn, { backgroundColor: colors.success }]} onPress={handleInc}><Text style={styles.roundBtnText}>+</Text></TouchableOpacity>
        </View>
      </View>
    </View>
  );
}, areStandardPropsEqual);
StandardRow.displayName = 'StandardRow';

const areEspetinhoPropsEqual = (prev: any, next: any) => {
  if (prev.baseName !== next.baseName) return false;
  if (prev.cardapioEspetinhos !== next.cardapioEspetinhos) return false;
  for (const v of prev.variacoes || []) {
      const targetName = `${prev.baseName} ${v}`.toLowerCase();
      const p = prev.cardapioEspetinhos.find((cp: any) => cp.name.toLowerCase() === targetName);
      if (p && prev.produtos[p.name] !== next.produtos[p.name]) return false;
  }
  return true;
};

const EspetinhoRow = memo(({ baseName, cardapioEspetinhos, produtos, onIncrement, onDecrement, variacoes = [] }: any) => {
  const itensVariaveis = useMemo(() => {
    return variacoes.map((variacao: string) => {
      const targetName = `${baseName} ${variacao}`.toLowerCase();
      const produto = cardapioEspetinhos.find((p: any) => p.name.toLowerCase() === targetName);
      return { label: variacao, produto: produto };
    }).filter((item: any) => !!item.produto);
  }, [baseName, cardapioEspetinhos, variacoes]);

  if (itensVariaveis.length === 0) return null;

  const rowColors = [colors.warning, colors.success, colors.disabled, colors.secondary, colors.primary]; 

  return (
    <View style={styles.caldoCard}>
      <Text style={styles.produtoName}>{baseName}</Text>
      {itensVariaveis.map((item: any, idx: number) => {
        const color = rowColors[idx % rowColors.length];
        const qty = produtos[item.produto.name] || 0;
        return <StackedVariationRow key={item.label} name={item.label} price={item.produto.price || 0} qty={qty} color={color} onInc={onIncrement} onDec={onDecrement} itemKey={item.produto.name} last={idx === itensVariaveis.length - 1} />;
      })}
    </View>
  );
}, areEspetinhoPropsEqual);
EspetinhoRow.displayName = 'EspetinhoRow';

const StackedVariationRow = memo(({ name, price, qty, color, onInc, onDec, itemKey, last }: any) => {
  const handleInc = useCallback(() => onInc(itemKey), [onInc, itemKey]);
  const handleDec = useCallback(() => onDec(itemKey), [onDec, itemKey]);
  return (
    <View style={[styles.stackedRowContainer, last && { marginBottom: 12 }]}>
      <TouchableOpacity style={[styles.stackedInfoCard, { backgroundColor: colors.surfaceMuted, borderLeftWidth: 4, borderLeftColor: color }]} onPress={handleInc} activeOpacity={0.8}>
        <Text style={styles.stackedNameText}>{name}</Text>
        <Text style={styles.stackedPriceText}>R$ {price.toFixed(2)}</Text>
      </TouchableOpacity>
      <View style={styles.variationControlsOutside}>
        <TouchableOpacity style={[styles.roundBtn, { backgroundColor: colors.danger }]} onPress={handleDec}><Text style={styles.roundBtnText}>−</Text></TouchableOpacity>
        <Text style={styles.qtyText}>{qty}</Text>
        <TouchableOpacity testID={`delivery-inc-${toTestId(itemKey)}`} style={[styles.roundBtn, { backgroundColor: colors.success }]} onPress={handleInc}><Text style={styles.roundBtnText}>+</Text></TouchableOpacity>
      </View>
    </View>
  );
});
StackedVariationRow.displayName = 'StackedVariationRow';

const VariationRow = memo(({ label, qty, color, onInc, onDec, itemKey, last, forceOneLine = false }: any) => {
  const handleInc = useCallback(() => onInc(itemKey), [onInc, itemKey]);
  const handleDec = useCallback(() => onDec(itemKey), [onDec, itemKey]);
  return (
    <View style={[styles.variationRow, last && { marginBottom: 12 }]}>
      <TouchableOpacity style={[styles.variationLabelBtn, { backgroundColor: colors.surfaceMuted, borderLeftWidth: 4, borderLeftColor: color }]} onPress={handleInc}>
        <Text style={styles.variationLabelText} numberOfLines={forceOneLine ? 1 : undefined} adjustsFontSizeToFit={forceOneLine} minimumFontScale={0.6}>{label}</Text>
      </TouchableOpacity>
      <View style={styles.variationControls}>
        <TouchableOpacity style={[styles.roundBtn, { backgroundColor: colors.danger }]} onPress={handleDec}><Text style={styles.roundBtnText}>−</Text></TouchableOpacity>
        <Text style={styles.qtyText}>{qty}</Text>
        <TouchableOpacity testID={`delivery-inc-${toTestId(itemKey)}`} style={[styles.roundBtn, { backgroundColor: colors.success }]} onPress={handleInc}><Text style={styles.roundBtnText}>+</Text></TouchableOpacity>
      </View>
    </View>
  );
});
VariationRow.displayName = 'VariationRow';


export default function DeliveryScreen() {
  const useUiNextDelivery = isFeatureEnabled('delivery_uiNext');
  const [showPizzaModal, setShowPizzaModal] = useState(false);
  const [selectedPizza, setSelectedPizza] = useState<Product | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Delivery Custom Fields
  const [customerPhone, setCustomerPhone] = useState('');
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [deliveryCep, setDeliveryCep] = useState('');
  const [deliveryFee, setDeliveryFee] = useState<string>('0');
  const [paymentMethod, setPaymentMethod] = useState<string>('dinheiro');
  const [changeFor, setChangeFor] = useState('');
  const [isSearchingCep, setIsSearchingCep] = useState(false);
  const [isSubmittingDelivery, setIsSubmittingDelivery] = useState(false);

  const { startMonitoring, stopMonitoring, logMetrics, isMonitoring } = usePerformanceMonitor();
  const {
    user, loadingCardapio, cardapio, produtos,
    clientName, setClientName,
    updateProduto, total, selectedItems, handleRemoveItem,
    handleLogout, temperosCaldos, temperosComidas, variacoesEspetinho, pizzaSubcategories, pizzaConfig, addPizzaToOrder,
    carregarCardapio, extras, resetForm
  } = useNovoPedido();

  useFocusEffect(
    useCallback(() => {
      carregarCardapio();
    }, [carregarCardapio])
  );

  const handleCepChange = async (text: string) => {
    setDeliveryCep(text);
    const cleanCep = text.replace(/\D/g, '');
    if (cleanCep.length === 8) {
      setIsSearchingCep(true);
      try {
        const res = await fetch(`https://viacep.com.br/ws/${cleanCep}/json/`);
        const data = await res.json();
        if (!data.erro) {
          setDeliveryAddress(`${data.logradouro}, Número, ${data.bairro}, ${data.localidade} - ${data.uf}`);
        }
      } catch (err) {
        console.error('Erro ao buscar CEP:', err);
      } finally {
        setIsSearchingCep(false);
      }
    }
  };

  const handlePhoneChange = async (text: string) => {
    setCustomerPhone(text);
    const cleanPhone = text.replace(/\D/g, '');
    if (cleanPhone.length >= 10 && user?.companyId) {
      try {
        const { data, error } = await supabase
          .from('clientes')
          .select('nome, endereco, cep')
          .eq('company_id', user.companyId)
          .eq('telefone', cleanPhone)
          .single();

        if (data && !error) {
          if (data.nome && !clientName) setClientName(data.nome);
          if (data.endereco && !deliveryAddress) setDeliveryAddress(data.endereco);
          if (data.cep && !deliveryCep) setDeliveryCep(data.cep);
        }
      } catch (err) {
        console.log('Cliente não encontrado ou erro na busca:', err);
      }
    }
  };
  const isSubmittingDeliveryRef = useRef(false);

  const finalTotal = useMemo(() => {
    const fee = parseFloat(deliveryFee.replace(',', '.')) || 0;
    return total + fee;
  }, [total, deliveryFee]);

  const handleDeliverySubmit = async () => {
    if (isSubmittingDeliveryRef.current) return;
    
    if (selectedItems.length === 0) {
      Alert.alert('Atenção', 'Adicione itens ao pedido.');
      return;
    }
    if (!clientName.trim()) {
      Alert.alert('Atenção', 'O nome do cliente é obrigatório para Delivery.');
      return;
    }
    if (!deliveryAddress.trim()) {
      Alert.alert('Atenção', 'O endereço completo é obrigatório para Delivery.');
      return;
    }
    if (!user || !user.companyId) {
      Alert.alert('Atenção', 'Sessão inválida. Faça login novamente.');
      return;
    }

    isSubmittingDeliveryRef.current = true;
    setIsSubmittingDelivery(true);
    try {
      const parsedItems = selectedItems.map(i => `${produtos[i.name] || 1}x ${i.name}`).join('\n');
      const priceMap: Record<string, number> = {};
      selectedItems.forEach(item => {
        priceMap[item.name] = item.price;
        // Se for pizza e tiver priceMap custom, usar (já está em selectedItems.price no unitário? No, priceMap precisa de chaves lowercase conforme OrderService)
        priceMap[item.name.toLowerCase()] = item.price;
      });

      const itemsWithStatus = OrderService.generateItemsWithStatus(
        selectedItems.map(i => i.text),
        `delivery-${Date.now()}`,
        '0',
        null, // categoryMap será inferido pelo OrderService se não passado, mas melhor passar se possível
        priceMap
      );

      const finalFee = parseFloat(deliveryFee.replace(',', '.')) || 0;
      
      const cleanPhone = customerPhone.replace(/\D/g, '');

      // 1. SILENT BACKGROUND CUSTOMER AUTO-SAVE
      if (cleanPhone.length >= 10) {
          const { data: existing } = await supabase
            .from('clientes')
            .select('id')
            .eq('company_id', user.companyId)
            .eq('telefone', cleanPhone)
            .single();

          if (!existing) {
              await supabase
                .from('clientes')
                .insert({
                    company_id: user.companyId,
                    telefone: cleanPhone,
                    nome: clientName,
                    endereco: deliveryAddress,
                    cep: deliveryCep
                });
          }
      }

      const notes = (paymentMethod === 'dinheiro' && changeFor) 
          ? `Troco para R$ ${changeFor}` 
          : '';

      const newOrder = {
        client: clientName,
        items: parsedItems,
        itemsWithStatus: itemsWithStatus,
        priceMap: priceMap,
        totalPrice: finalTotal,
        status: 'preparing',
        createdBy: user?.uid,
        orderType: 'delivery',
        customerPhone: customerPhone,
        deliveryAddress: deliveryAddress,
        deliveryFee: finalFee,
        payment_method: paymentMethod,
        notes: notes,
      };

      await supabaseOrderService.saveOrder(user.companyId, newOrder as any);

      Alert.alert('Sucesso', 'Pedido de delivery lançado com sucesso!');
      
      // Limpa Tudo Local
      resetForm();
      setCustomerPhone('');
      setDeliveryAddress('');
      setDeliveryCep('');
      setDeliveryFee('0');
      setPaymentMethod('dinheiro');
      setChangeFor('');
    } catch (err) {
      console.error('Erro ao lançar delivery:', err);
      Alert.alert('Erro', 'Não foi possível lançar o pedido.');
    } finally {
      setIsSubmittingDelivery(false);
      isSubmittingDeliveryRef.current = false;
    }
  };

  const sections = React.useMemo(() => {
    const sectionsData: any[] = [];
    const isActive = (item: Product) => item.active !== false;

    if (cardapio.pizzas && cardapio.pizzas.length > 0) {
      const uniquePizzas: Product[] = [];
      const seenNames = new Set<string>();
      cardapio.pizzas.forEach(p => {
        if (!isActive(p)) return;
        const n = p.name ? p.name.trim().toLowerCase() : '';
        if (n && !seenNames.has(n)) { seenNames.add(n); uniquePizzas.push(p); }
      });
      const configuredPizzaSubcategories = (pizzaSubcategories || [])
        .map((item) => (item || '').trim())
        .filter((item, index, arr) => item.length > 0 && arr.indexOf(item) === index);
      const categoryOrder = [...configuredPizzaSubcategories, 'Outras'];
      const catmap: Record<string, Product[]> = categoryOrder.reduce((acc, current) => {
        acc[current] = [];
        return acc;
      }, {} as Record<string, Product[]>);
      uniquePizzas.forEach(pizza => {
        const normalizedSubcategory = (pizza.subcategory || '').trim();
        const targetKey = normalizedSubcategory || 'Outras';
        if (!catmap[targetKey]) {
          catmap[targetKey] = [];
        }
        catmap[targetKey].push(pizza);
      });
      categoryOrder.forEach(cat => {
        if (catmap[cat].length > 0) sectionsData.push({ title: `🍕 PIZZAS ${cat.toUpperCase()}`, data: catmap[cat], type: 'pizzas-v2' });
      });
    }

    const isPizza = (name: string) => (cardapio.pizzas || []).some(p => p.name.trim().toLowerCase() === name.trim().toLowerCase());

    if (cardapio.caldos?.length > 0) {
      const activeCaldos = cardapio.caldos.filter(isActive);
      const caldosUnicos = [...new Set(activeCaldos.map(c => c.name.replace(/\s*\(?\s*(300|180)\s*ml\s*\)?/gi, '').trim()))];
      sectionsData.push({ title: '🍲 Caldos', data: caldosUnicos, type: 'caldos', original: activeCaldos });
    }

    if (cardapio.espetinhosSimples && cardapio.espetinhosSimples.length > 0) {
      const activeEspetinhos = cardapio.espetinhosSimples.filter(isActive);
      const baseNames = [...new Set(activeEspetinhos.map(p => {
        let name = p.name;
        variacoesEspetinho.forEach(v => { name = name.replace(new RegExp(` ${v}`, 'gi'), ''); });
        return name.trim();
      }))];
      sectionsData.push({ title: '🔥 Espetinhos Simples', data: baseNames, type: 'espetinhos-simples', original: activeEspetinhos });
    }

    if (cardapio.espetinhosEspeciais && cardapio.espetinhosEspeciais.length > 0) {
      const activeEspetinhos = cardapio.espetinhosEspeciais.filter(isActive);
      const baseNames = [...new Set(activeEspetinhos.map(p => {
        let name = p.name;
        variacoesEspetinho.forEach(v => { name = name.replace(new RegExp(` ${v}`, 'gi'), ''); });
        return name.trim();
      }))];
      sectionsData.push({ title: '🌟 Espetinhos Especiais', data: baseNames, type: 'espetinhos-especiais', original: activeEspetinhos });
    }

    if (cardapio.comidas?.length > 0) {
      const filteredComidas = cardapio.comidas.filter(c => !isPizza(c.name) && isActive(c));
      if (filteredComidas.length > 0) sectionsData.push({ title: '🍽️ Comidas', data: filteredComidas, type: 'comidas' });
    }

    if (cardapio.porcoes && cardapio.porcoes.length > 0) sectionsData.push({ title: '🍟 Porções', data: cardapio.porcoes.filter(isActive), type: 'porcoes' });
    if (cardapio.outros && cardapio.outros.length > 0) sectionsData.push({ title: '📦 Outros', data: cardapio.outros.filter(isActive), type: 'outros' });
    if (cardapio.bebidas && cardapio.bebidas.length > 0) sectionsData.push({ title: '🥤 Bebidas', data: cardapio.bebidas.filter(isActive), type: 'bebidas' });

    return sectionsData;
  }, [cardapio, variacoesEspetinho, pizzaSubcategories]);

  const filteredSections = React.useMemo(() => {
    if (!searchQuery.trim()) return sections;
    const query = searchQuery.toLowerCase().trim();
    return sections.map(section => {
      const filteredData = section.data.filter((item: any) => {
        if (typeof item === 'string') return item.toLowerCase().includes(query);
        return item.name?.toLowerCase().includes(query);
      });
      return { ...section, data: filteredData };
    }).filter(section => section.data.length > 0);
  }, [sections, searchQuery]);

  const updateProdutoAnimated = useCallback((itemName: string, delta: number) => { updateProduto(itemName, delta); }, [updateProduto]);
  const handleRemoveItemAnimated = useCallback((item: string) => { LayoutAnimation.configureNext(LayoutAnimation.Presets.spring); handleRemoveItem(item); }, [handleRemoveItem]);
  const handleIncrement = useCallback((itemName: string) => { updateProdutoAnimated(itemName, 1); }, [updateProdutoAnimated]);
  const handleDecrement = useCallback((itemName: string) => { updateProdutoAnimated(itemName, -1); }, [updateProdutoAnimated]);

  const keyExtractor = useCallback((item: any, index: number) => {
    if (typeof item === 'string') return item;
    return item.id ? String(item.id) : item.name || `item-${index}`;
  }, []);

  const handleScrollBeginDrag = useCallback(() => { if (!isMonitoring) startMonitoring(); }, [isMonitoring, startMonitoring]);
  const handleScrollEndDrag = useCallback(() => { if (isMonitoring) { stopMonitoring(); logMetrics(); } }, [isMonitoring, stopMonitoring, logMetrics]);

  const handlePizzaPress = useCallback((pizzaItem: Product) => { setSelectedPizza(pizzaItem); setShowPizzaModal(true); }, []);

  const renderItem = useCallback<SectionListRenderItem<any, any>>(({ item, section }) => {
    if (section.type === 'pizzas-v2') return <PizzaRow item={item} onPress={handlePizzaPress} />;
    if (section.type === 'caldos') return <CaldoRow caldoBase={item} cardapioCaldos={section.original || []} produtos={produtos} onIncrement={handleIncrement} onDecrement={handleDecrement} temperos={temperosCaldos} />;
    if (section.type === 'espetinhos-simples' || section.type === 'espetinhos-especiais') return <EspetinhoRow baseName={item} cardapioEspetinhos={section.original || []} produtos={produtos} onIncrement={handleIncrement} onDecrement={handleDecrement} variacoes={variacoesEspetinho} />;
    return <StandardRow item={item} produtos={produtos} onIncrement={handleIncrement} onDecrement={handleDecrement} type={section.type} temperos={temperosComidas} />;
  }, [produtos, temperosCaldos, temperosComidas, variacoesEspetinho, handleIncrement, handleDecrement]);

  if (loadingCardapio) {
    return (
      <View style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Carregando cardápio Delivery...</Text>
        </View>
      </View>
    );
  }

  const renderSectionHeader = ({ section: { title } }: any) => <Text style={styles.sectionTitle}>{title}</Text>;

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScreenScaffold
        title="Delivery Express"
        titleIcon={<Ionicons name="fast-food-outline" size={24} color={colors.white} />}
        subtitle={user ? `Operador: ${user.nome || user.email}` : 'Entregas'}
        bodyStyle={styles.scaffoldBody}
        footer={
          <DeliverySubmitFooter
            finalTotal={finalTotal}
            onSubmit={handleDeliverySubmit}
            isSubmitting={isSubmittingDelivery}
            disabled={isSubmittingDelivery || selectedItems.length === 0}
          />
        }
      >
        <View style={styles.twoColLayout}>
          <ScrollView style={styles.leftPanel} contentContainerStyle={styles.leftPanelContent} keyboardShouldPersistTaps="handled">
            <DeliveryOrderForm
              clientName={clientName}
              onChangeClientName={setClientName}
              customerPhone={customerPhone}
              onChangeCustomerPhone={handlePhoneChange}
              deliveryCep={deliveryCep}
              onChangeDeliveryCep={handleCepChange}
              isSearchingCep={isSearchingCep}
              deliveryAddress={deliveryAddress}
              onChangeDeliveryAddress={setDeliveryAddress}
              deliveryFee={deliveryFee}
              onChangeDeliveryFee={setDeliveryFee}
              paymentMethod={paymentMethod}
              onChangePaymentMethod={setPaymentMethod}
              changeFor={changeFor}
              onChangeChangeFor={setChangeFor}
            />
            <NewOrderListFooter selectedItems={selectedItems} onRemoveItem={handleRemoveItemAnimated} />
          </ScrollView>

          <View style={styles.rightPanel}>
            <View style={styles.searchContainer}>
              <Ionicons name="search" size={20} color={colors.textSecondary} style={styles.searchIcon} />
              <TextInput
                style={styles.searchInput}
                placeholder="Buscar no cardapio..."
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
              style={styles.rightPanelList}
              sections={filteredSections}
              renderItem={renderItem}
              renderSectionHeader={renderSectionHeader}
              keyExtractor={keyExtractor}
              contentContainerStyle={styles.listContent}
              stickySectionHeadersEnabled={false}
              initialNumToRender={10} maxToRenderPerBatch={10} windowSize={11}
              updateCellsBatchingPeriod={50} removeClippedSubviews={Platform.OS === 'android'}
              onScrollBeginDrag={handleScrollBeginDrag} onScrollEndDrag={handleScrollEndDrag} onMomentumScrollEnd={handleScrollEndDrag}
              onScrollToIndexFailed={() => {}} legacyImplementation={false} scrollEventThrottle={16}
            />
          </View>
        </View>
      </ScreenScaffold>

      <PizzaBuilderModal
        visible={showPizzaModal} onClose={() => { setShowPizzaModal(false); setSelectedPizza(null); }}
        onConfirm={addPizzaToOrder} sizes={pizzaConfig?.sizes} pizzas={cardapio.pizzas}
        /* @ts-ignore */
        initialFlavor={selectedPizza} extras={extras}
      />
      <StatusBar style="dark" />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  scaffoldBody: { flex: 1 },
  twoColLayout: { flex: 1, flexDirection: 'row' as const },
  leftPanel: { width: 380, borderRightWidth: 1, borderRightColor: colors.border, backgroundColor: colors.white },
  leftPanelContent: { padding: 16, gap: 0 },
  rightPanel: { flex: 1, flexDirection: 'column' as const },
  listContent: { padding: 20, paddingBottom: 120 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: colors.primary, marginTop: 20, marginBottom: 12 },
  quantityBtn: { backgroundColor: colors.primary, width: 32, height: 32, borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
  quantityBtnText: { color: colors.white, fontSize: 18, fontWeight: 'bold' },
  caldoCard: { backgroundColor: colors.white, borderRadius: 12, padding: 16, marginBottom: 12, elevation: 1 },
  standardCard: { backgroundColor: colors.white, borderRadius: 12, padding: 16, marginBottom: 12, elevation: 1 },
  verticalCard: { flexDirection: 'column', marginBottom: 12, backgroundColor: colors.white, padding: 16, borderRadius: 8, elevation: 1 },
  produtoName: { fontSize: 18, fontWeight: '700', color: colors.text, marginBottom: 4, textAlign: 'left' },
  sizeTitle: { fontSize: 17, fontWeight: '700', color: colors.primary, marginTop: 8, marginBottom: 4, textAlign: 'left' },
  verticalName: { fontSize: 18, fontWeight: '700', color: colors.text, marginBottom: 8, textAlign: 'left' },
  verticalControlsRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  verticalPrice: { fontSize: 17, fontWeight: '700', color: colors.primary },
  variationRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 10, backgroundColor: colors.surfaceMuted, borderRadius: 8, padding: 8 },
  variationLabelBtn: { flex: 1, padding: 8, borderRadius: 8, marginRight: 8, justifyContent: 'center' },
  variationLabelText: { color: colors.text, fontSize: 16, fontWeight: '700', textAlign: 'left' },
  stackedRowContainer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 8 },
  stackedInfoCard: { flex: 1, padding: 12, borderRadius: 10, justifyContent: 'center', alignItems: 'flex-start', marginRight: 12 },
  variationControlsOutside: { flexDirection: 'row', alignItems: 'center' },
  stackedNameText: { color: colors.text, fontSize: 18, fontWeight: 'bold', textAlign: 'left', marginBottom: 4 },
  productCardWrapper: { marginBottom: 12 },
  stackedPriceText: { color: colors.primary, fontSize: 17, fontWeight: 'bold', textAlign: 'left' },
  variationControls: { flexDirection: 'row', alignItems: 'center' },
  roundBtn: { width: 32, height: 32, borderRadius: 16, justifyContent: 'center', alignItems: 'center', marginHorizontal: 4 },
  roundBtnText: { color: colors.white, fontSize: 18, fontWeight: 'bold' },
  qtyText: { fontSize: 16, fontWeight: 'bold', minWidth: 24, textAlign: 'center' },
  produtoRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  produtoInfo: { flex: 1, marginRight: 12 },
  produtoPrice: { fontSize: 17, fontWeight: '700', color: colors.primary, textAlign: 'left', marginTop: 4 },
  quantityControl: { flexDirection: 'row', alignItems: 'center' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 12, fontSize: 16, color: colors.primary },
  searchContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.white, paddingHorizontal: 15, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.border },
  searchIcon: { marginRight: 8 },
  searchInput: { flex: 1, fontSize: 16, color: colors.text, paddingVertical: 8, outlineStyle: 'none' as any },
  searchClearBtn: { padding: 4 }
  ,
  rightPanelList: { flex: 1 },
});
