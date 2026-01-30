import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, View, SectionList, TouchableOpacity, TextInput, ActivityIndicator, LayoutAnimation, Platform, UIManager } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import React, { memo, useCallback } from 'react';
import BackgroundPattern from '../components/BackgroundPattern';
import { useNovoPedido } from '../hooks/useNovoPedido';
import { colors } from '../theme/colors';

if (Platform.OS === 'android') {
  if (UIManager.setLayoutAnimationEnabledExperimental) {
    UIManager.setLayoutAnimationEnabledExperimental(true);
  }
}

const QuantityButton = memo(({ onPress, text }) => (
  <TouchableOpacity style={styles.quantityBtn} onPress={onPress}>
    <Text style={styles.quantityBtnText}>{text}</Text>
  </TouchableOpacity>
));
QuantityButton.displayName = 'QuantityButton';

const QuantityControl = memo(({ value, onIncrement, onDecrement }) => (
  <View style={styles.quantityControl}>
    <QuantityButton onPress={onDecrement} text="−" />
    <Text style={styles.quantityValue}>{value}</Text>
    <QuantityButton onPress={onIncrement} text="+" />
  </View>
));
QuantityControl.displayName = 'QuantityControl';

const SelectedItem = memo(({ item, price, onRemove }) => (
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

const ProdutoItem = memo(({ item }) => {
  return (
    <View style={styles.produtoContainer}>
      <Text>{item.name}</Text>
    </View>
  );
});
ProdutoItem.displayName = 'ProdutoItem';

// Helper to render complex Caldo rows which are not just 1:1 with cardapio items
const CaldoRow = memo(({ caldoBase, cardapioCaldos, produtos, updateProduto, temperos }) => {
  const item300 = cardapioCaldos.find(c => c.name.includes(caldoBase) && c.name.match(/300\s*ml/i));
  const item180 = cardapioCaldos.find(c => c.name.includes(caldoBase) && c.name.match(/180\s*ml/i));

  if (!item300 && !item180) return null;

  const renderTemperos = (sizeLabel) => (
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
          onInc={() => updateProduto(nome, 1)}
          onDec={() => updateProduto(nome, -1)}
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
          <Text style={styles.sizeTitle}>📏 300ml - R$ {item300.price.toFixed(2)}</Text>
          {renderTemperos('300ml')}
        </>
      )}

      {/* 180ml Section */}
      {item180 && (
        <>
          <Text style={styles.sizeTitle}>📏 180ml - R$ {item180.price.toFixed(2)}</Text>
          {renderTemperos('180ml')}
        </>
      )}
    </View>
  );
});
CaldoRow.displayName = 'CaldoRow';

// Helper for other items (Comidas/Bebidas/Porcoes)
const StandardRow = memo(({ item, produtos, updateProduto, type, temperos }) => {
  const isComida = type === 'comidas';


  if (isComida) {
    return (
      <View style={styles.standardCard}>
        <View style={styles.produtoRow}>
          <View style={styles.produtoInfo}>
            <Text style={styles.produtoName}>{item.name}</Text>
            <Text style={styles.produtoPrice}>R$ {item.price.toFixed(2)}</Text>
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

          return (
            <VariationRow
              key={suffix}
              label={label}
              qty={produtos[`${item.name} ${suffix}`] || 0}
              color={color}
              onInc={() => updateProduto(`${item.name} ${suffix}`, 1)}
              onDec={() => updateProduto(`${item.name} ${suffix}`, -1)}
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
        <Text style={styles.verticalPrice}>R$ {item.price.toFixed(2)}</Text>

        <View style={styles.quantityControl}>
          <TouchableOpacity style={[styles.roundBtn, { backgroundColor: colors.danger }]} onPress={() => updateProduto(item.name, -1)}>
            <Text style={styles.roundBtnText}>−</Text>
          </TouchableOpacity>
          <Text style={styles.qtyText}>{qty}</Text>
          <TouchableOpacity style={[styles.roundBtn, { backgroundColor: colors.success }]} onPress={() => updateProduto(item.name, 1)}>
            <Text style={styles.roundBtnText}>+</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
});
StandardRow.displayName = 'StandardRow';

// Helper for Espetinhos (Simples/Especiais) with dynamic variations
const EspetinhoRow = memo(({ baseName, cardapioEspetinhos, produtos, updateProduto, variacoes = [] }) => {
  // 1. Map available variations to actual products
  const itensVariaveis = variacoes.map(variacao => {
    // Try to find exact match "Nome Variação"
    const produto = cardapioEspetinhos.find(p => p.name === `${baseName} ${variacao}`);
    return {
      label: variacao,
      produto: produto
    };
  }).filter(item => item.produto); // Filter only existing products

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
            price={item.produto.price}
            qty={qty}
            color={color}
            onInc={() => updateProduto(item.produto.name, 1)}
            onDec={() => updateProduto(item.produto.name, -1)}
            last={idx === itensVariaveis.length - 1}
          />
        );
      })}
    </View>
  );
});
EspetinhoRow.displayName = 'EspetinhoRow';

const StackedVariationRow = ({ name, price, qty, color, onInc, onDec, last }) => (
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
);

const VariationRow = ({ label, qty, color, onInc, onDec, last, forceOneLine = false }) => (
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
);

const HeaderComponent = memo(({ clientName, setClientName, mesa, setMesa }) => (
  <View style={styles.headerForm}>
    <View style={{ flexDirection: 'row', gap: 10 }}>
      {/* Campo Nome do Cliente */}
      <View style={{ flex: 1 }}>
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
));
HeaderComponent.displayName = 'HeaderComponent';

const FooterComponent = memo(({ selectedItems, onRemoveItem }) => (
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


export default function NovoPedidoScreen() {
  const {
    user,
    loadingCardapio,
    cardapio,
    produtos,
    clientName,
    setClientName,
    mesa,
    setMesa,
    updateProduto,
    total,
    selectedItems,
    handleRemoveItem,
    handleSubmit,
    isSubmitting,
    handleLogout, // Logout handler
    temperosCaldos = ['Cebolinha e Coentro', 'Cebolinha', 'Sem Nada'],
    temperosComidas = ['Cebolinha e Coentro', 'Cebolinha', 'Sem Nada'],
    variacoesEspetinho = ['Simples', 'com Arroz', 'com Macaxeira', 'Completo']
  } = useNovoPedido();

  // Prepare sections for SectionList (Must be before conditional return)
  const sections = React.useMemo(() => {
    const sectionsData = [];

    // Caldos: Aggregate by base name
    if (cardapio.caldos?.length > 0) {
      const caldosUnicos = [...new Set(cardapio.caldos.map(c => c.name.replace(/\s*\(?\s*(300|180)\s*ml\s*\)?/gi, '').trim()))];
      sectionsData.push({
        title: '🍲 Caldos',
        data: caldosUnicos,
        type: 'caldos',
        original: cardapio.caldos
      });
    }

    // Espetinhos Simples
    if (cardapio.espetinhosSimples?.length > 0) {
      const baseNames = [...new Set(cardapio.espetinhosSimples.map(p => {
        let name = p.name;
        variacoesEspetinho.forEach(v => {
          name = name.replace(` ${v}`, '');
        });
        return name.trim();
      }))];
      sectionsData.push({
        title: '🔥 Espetinhos Simples',
        data: baseNames,
        type: 'espetinhos-simples',
        original: cardapio.espetinhosSimples
      });
    }

    // Espetinhos Especiais
    if (cardapio.espetinhosEspeciais?.length > 0) {
      const baseNames = [...new Set(cardapio.espetinhosEspeciais.map(p => {
        let name = p.name;
        variacoesEspetinho.forEach(v => {
          name = name.replace(` ${v}`, '');
        });
        return name.trim();
      }))];
      sectionsData.push({
        title: '🌟 Espetinhos Especiais',
        data: baseNames,
        type: 'espetinhos-especiais',
        original: cardapio.espetinhosEspeciais
      });
    }

    if (cardapio.comidas?.length > 0) {
      sectionsData.push({ title: '🍽️ Comidas', data: cardapio.comidas, type: 'comidas' });
    }

    if (cardapio.porcoes?.length > 0) {
      sectionsData.push({ title: '🍟 Porções', data: cardapio.porcoes, type: 'porcoes' });
    }

    if (cardapio.outros?.length > 0) {
      sectionsData.push({ title: '📦 Outros', data: cardapio.outros, type: 'outros' });
    }

    if (cardapio.bebidas?.length > 0) {
      sectionsData.push({ title: '🥤 Bebidas', data: cardapio.bebidas, type: 'bebidas' });
    }

    return sectionsData;
  }, [cardapio]);

  // Wrappers for animation
  const updateProdutoAnimated = useCallback((...args) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    updateProduto(...args);
  }, [updateProduto]);

  const handleRemoveItemAnimated = useCallback((...args) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.spring); // Spring for deletion feeling
    handleRemoveItem(...args);
  }, [handleRemoveItem]);

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



  const renderSectionHeader = ({ section: { title } }) => (
    <Text style={styles.sectionTitle}>{title}</Text>
  );

  const renderItem = ({ item, section }) => {
    if (section.type === 'caldos') {
      return <CaldoRow caldoBase={item} cardapioCaldos={section.original} produtos={produtos} updateProduto={updateProdutoAnimated} temperos={temperosCaldos} />;
    }
    if (section.type === 'espetinhos-simples' || section.type === 'espetinhos-especiais') {
      return (
        <EspetinhoRow
          baseName={item}
          cardapioEspetinhos={section.original}
          produtos={produtos}
          updateProduto={updateProdutoAnimated}
          variacoes={variacoesEspetinho}
        />
      );
    }
    return <StandardRow item={item} produtos={produtos} updateProduto={updateProdutoAnimated} type={section.type} temperos={temperosComidas} />;
  };

  return (
    <View style={styles.container}>
      <BackgroundPattern />

      <View style={styles.header}>
        <View style={styles.headerLeft}>
          {user && (
            <View>
              <Text style={styles.userInfoLabel}>Olá,</Text>
              <Text style={styles.userInfo}>{user.nome || user.email}</Text>
            </View>
          )}
        </View>
        <View style={styles.headerCenter}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Ionicons name="add-circle-outline" size={26} color={colors.white} />
            <Text style={styles.headerTitle}>Novo Pedido</Text>
          </View>
        </View>
        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
          <Ionicons name="log-out-outline" size={24} color={colors.white} />
        </TouchableOpacity>
      </View>

      <SectionList
        sections={sections}
        renderItem={renderItem}
        renderSectionHeader={renderSectionHeader}
        keyExtractor={(item) => item.name || item}
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={<HeaderComponent clientName={clientName} setClientName={setClientName} mesa={mesa} setMesa={setMesa} />}
        ListFooterComponent={<FooterComponent selectedItems={selectedItems} onRemoveItem={handleRemoveItemAnimated} />}
        stickySectionHeadersEnabled={false}
        initialNumToRender={12}
        windowSize={5}
        maxToRenderPerBatch={10}
        updateCellsBatchingPeriod={50}
        removeClippedSubviews={Platform.OS === 'android'}
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
          <Text style={styles.submitBtnText}>
            {isSubmitting ? 'Criando...' : 'Criar Pedido'}
          </Text>
        </TouchableOpacity>
      </View>

      <StatusBar style="dark" />
    </View>
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
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: colors.primary, marginTop: 20, marginBottom: 12 },

  // Card Styles
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
  variationRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 6 },
  variationLabelBtn: { flex: 1, padding: 10, borderRadius: 8 },
  variationLabelText: { color: colors.shadow, fontSize: 16, fontWeight: '700', textAlign: 'center' },

  // NEW STYLES FOR STACKED VARIATION
  stackedRowContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 8,
  },
  stackedInfoCard: {
    flex: 1,
    padding: 12,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    // Background color applied inline to this card
  },
  variationControlsOutside: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },

  stackedNameText: {
    color: colors.white,
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 4,
    textShadowColor: 'rgba(0,0,0,0.3)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  stackedPriceText: {
    color: colors.white,
    fontSize: 17,
    fontWeight: 'bold',
    textAlign: 'center',
  },

  variationControls: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  roundBtn: { width: 32, height: 32, borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
  roundBtnText: { color: colors.white, fontSize: 18, fontWeight: 'bold' },
  qtyText: { fontSize: 16, fontWeight: 'bold', minWidth: 24, textAlign: 'center' },

  produtoRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  produtoInfo: { flex: 1 },
  produtoPrice: { fontSize: 17, fontWeight: '700', color: colors.primary, textAlign: 'center' },

  quantityControl: { flexDirection: 'row', alignItems: 'center', gap: 10 },

  // List Footer
  listFooter: { marginTop: 20 },
  selectedItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: colors.white, borderRadius: 8, padding: 12, marginBottom: 8 },
  selectedItemInfo: { flex: 1 },
  selectedItemName: { fontSize: 16, color: colors.state }, // Typo in colors? No, colors.text maybe?
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

  priceLegend: { fontSize: 13, color: colors.textSecondary, textAlign: 'center', marginBottom: 12 }
});
