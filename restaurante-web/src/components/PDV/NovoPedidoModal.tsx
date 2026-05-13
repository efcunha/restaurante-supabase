import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, TextInput, ActivityIndicator, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../config/SupabaseConfig';
import { useAuth } from '../../context/AuthContext';
import supabaseOrderService from '../../services/supabase/SupabaseOrderService';
import { colors } from '../../theme/colors';
interface ItemCart {
  id: string;
  name: string;
  price: number;
  quantity: number;
  observations?: string;
  category?: string;
}

interface NovoPedidoModalProps {
  onClose: () => void;
}

export default function NovoPedidoModal({ onClose }: NovoPedidoModalProps) {
  const { user } = useAuth();
  const [checkoutFooterHeight, setCheckoutFooterHeight] = useState(156);

  // Delivery Form
  const [clientName, setClientName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [deliveryFee, setDeliveryFee] = useState<string>('0');
  
  // Local Form Removido (Foco Delivery)
  
  // Catalog & Cart
  const [searchText, setSearchText] = useState('');
  const [products, setProducts] = useState<any[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [cart, setCart] = useState<ItemCart[]>([]);
  
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    loadProducts();
  }, []);

  const loadProducts = async () => {
    if (!user?.companyId) return;
    setLoadingProducts(true);
    try {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('company_id', user.companyId)
        .eq('active', true)
        .order('category')
        .order('name');
        
      if (error) throw error;
      setProducts(data || []);
    } catch (err) {
      console.error('Erro ao carregar produtos no PDV:', err);
    } finally {
      setLoadingProducts(false);
    }
  };

  const filteredProducts = useMemo(() => {
    if (!searchText) return products;
    return products.filter(p => 
      p.name.toLowerCase().includes(searchText.toLowerCase()) || 
      (p.category && p.category.toLowerCase().includes(searchText.toLowerCase()))
    );
  }, [products, searchText]);

  const addToCart = (product: any) => {
    setCart(prev => {
      let existingIndex = -1;
      for (let i = 0; i < prev.length; i++) {
        if (prev[i].id === product.id) {
          existingIndex = i;
          break;
        }
      }
      
      if (existingIndex > -1) {
        return prev.map((item, index) => index === existingIndex ? { ...item, quantity: item.quantity + 1 } : item);
      }
      return [...prev, {
        id: product.id,
        name: product.name,
        price: product.price || 0,
        quantity: 1,
        category: product.category
      }];
    });
  };

  const removeFromCart = (id: string) => {
    setCart(prev => prev.filter(i => i.id !== id));
  };

  const updateQuantity = (id: string, delta: number) => {
    setCart(prev => prev.map(i => {
      if (i.id === id) {
        const newQ = i.quantity + delta;
        return newQ > 0 ? { ...i, quantity: newQ } : i;
      }
      return i;
    }));
  };

  const subtotal = useMemo(() => {
    return cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  }, [cart]);

  const total = useMemo(() => {
    const fee = parseFloat(deliveryFee.replace(',', '.')) || 0;
    return subtotal + fee;
  }, [subtotal, deliveryFee]);

  const handleSubmit = async () => {
    if (cart.length === 0) {
      Alert.alert('Atenção', 'Adicione itens ao pedido.');
      return;
    }
    
    if (!clientName) {
       Alert.alert('Atenção', 'Nome do cliente é obrigatório para Delivery.');
       return;
    }

    if (!user || !user.companyId) {
       Alert.alert('Atenção', 'Sessão inválida. Faça login novamente.');
       return;
    }

    setIsSubmitting(true);
    try {
      // Build order matching the SupabaseOrderService structure
      const parsedItems = cart.map(item => `${item.quantity}x ${item.name}`).join('\n');
      const itemsWithStatus = cart.map(item => ({
        id: item.id,
        name: item.name,
        quantity: item.quantity,
        status: 'preparing',
        price: item.price
      }));

      const priceMap = cart.reduce((acc, item) => {
        acc[item.name] = item.price;
        return acc;
      }, {} as Record<string, number>);

      const finalFee = parseFloat(deliveryFee.replace(',', '.')) || 0;

      const newOrder = {
        client: clientName,
        items: parsedItems,
        itemsWithStatus: itemsWithStatus,
        priceMap: priceMap,
        totalPrice: total,
        status: 'preparing',
        createdBy: user?.id,
        // Delivery Specifics Trava
        orderType: 'delivery',
        customerPhone: customerPhone,
        deliveryAddress: deliveryAddress,
        deliveryFee: finalFee,
      };

      await supabaseOrderService.saveOrder(user.companyId, newOrder as any);

      Alert.alert('Sucesso', 'Pedido lançado com sucesso!');
      onClose();
    } catch (err) {
      console.error('Erro ao lançar pedido PDV:', err);
      Alert.alert('Erro', 'Não foi possível lançar o pedido.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
          <Ionicons name="close" size={28} color={colors.white} />
        </TouchableOpacity>
        <Text style={styles.title}>Lançamento de Delivery</Text>
      </View>

      <View style={styles.content}>
        {/* === LEFT PANEL: BROWSER === */}
        <View style={styles.leftPanel}>
          <View style={styles.searchBar}>
            <Ionicons name="search" size={20} color={colors.textSecondary} style={{ marginRight: 10 }} />
            <TextInput 
              style={styles.searchInput}
              placeholder="Buscar produtos pelo nome ou categoria..."
              value={searchText}
              onChangeText={setSearchText}
            />
          </View>

          {loadingProducts ? (
            <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 50 }} />
          ) : (
            <ScrollView contentContainerStyle={styles.productsGrid}>
              {filteredProducts.map(product => (
                <TouchableOpacity 
                  key={product.id} 
                  style={styles.productCard}
                  onPress={() => addToCart(product)}
                >
                  <Text style={styles.productName} numberOfLines={2}>{product.name}</Text>
                  <Text style={styles.productPrice}>R$ {(product.price || 0).toFixed(2)}</Text>
                  <View style={styles.addButton}>
                    <Ionicons name="add" size={20} color={colors.white} />
                  </View>
                </TouchableOpacity>
              ))}
              {filteredProducts.length === 0 && (
                <Text style={styles.emptyText}>Nenhum produto encontrado.</Text>
              )}
            </ScrollView>
          )}
        </View>

        {/* === RIGHT PANEL: CART & CHECKOUT === */}
        <View style={styles.rightPanel}>
          <ScrollView
            style={[styles.cartContainer, { marginBottom: checkoutFooterHeight }]}
            contentContainerStyle={styles.cartContent}
          >
            {/* INFORMAÇÕES DO CLIENTE */}
            <View style={styles.formSection}>
              <TextInput style={styles.input} placeholder="Nome do Cliente *" value={clientName} onChangeText={setClientName} />
              <TextInput style={styles.input} placeholder="Telefone" value={customerPhone} onChangeText={setCustomerPhone} keyboardType="phone-pad" />
              <TextInput style={[styles.input, { height: 60 }]} placeholder="Endereço Completo" value={deliveryAddress} onChangeText={setDeliveryAddress} multiline />
              <View style={styles.feeRow}>
                <Text style={styles.feeLabel}>Taxa de Entrega (R$):</Text>
                <TextInput style={styles.feeInput} value={deliveryFee} onChangeText={setDeliveryFee} keyboardType="numeric" />
              </View>
            </View>

            {/* ITENS DO CARRINHO */}
            <View style={styles.cartItemsHeader}>
              <Text style={styles.cartItemsTitle}>Comanda ({cart.length} itens)</Text>
            </View>
            
            {cart.map(item => (
              <View key={item.id} style={styles.cartItemRow}>
                <View style={styles.cartItemInfo}>
                  <Text style={styles.cartItemName}>{item.name}</Text>
                  <Text style={styles.cartItemPrice}>R$ {(item.price * item.quantity).toFixed(2)}</Text>
                </View>
                <View style={styles.cartItemControls}>
                  <TouchableOpacity onPress={() => updateQuantity(item.id, -1)} style={styles.qtyBtn}>
                    <Ionicons name="remove" size={16} color={colors.white} />
                  </TouchableOpacity>
                  <Text style={styles.qtyText}>{item.quantity}</Text>
                  <TouchableOpacity onPress={() => updateQuantity(item.id, 1)} style={styles.qtyBtn}>
                    <Ionicons name="add" size={16} color={colors.white} />
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => removeFromCart(item.id)} style={[styles.qtyBtn, { backgroundColor: colors.danger, marginLeft: 15 }]}>
                    <Ionicons name="trash" size={16} color={colors.white} />
                  </TouchableOpacity>
                </View>
              </View>
            ))}
            
            {cart.length === 0 && (
              <Text style={styles.emptyCart}>Carrinho vazio. Adicione itens.</Text>
            )}
          </ScrollView>

          {/* TOTAL E SUBMIT */}
          <View
            style={styles.checkoutFooter}
            onLayout={(event) => setCheckoutFooterHeight(event.nativeEvent.layout.height)}
          >
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Subtotal:</Text>
              <Text style={styles.totalValue}>R$ {subtotal.toFixed(2)}</Text>
            </View>
            <View style={styles.totalRow}>
              <Text style={styles.totalLabelBig}>TOTAL FINAL:</Text>
              <Text style={styles.totalValueBig}>R$ {total.toFixed(2)}</Text>
            </View>
            <TouchableOpacity 
              style={[styles.submitBtn, (isSubmitting || cart.length === 0) && styles.submitBtnDisabled]}
              onPress={handleSubmit}
              disabled={isSubmitting || cart.length === 0}
            >
              {isSubmitting ? (
                 <ActivityIndicator color={colors.white} />
              ) : (
                <Text style={styles.submitBtnText}>LANÇAR PEDIDO</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    backgroundColor: colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    paddingTop: 45,
    elevation: 4,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
  },
  title: {
    color: colors.white,
    fontSize: 22,
    fontWeight: '700',
    marginLeft: 15,
  },
  closeBtn: {
    padding: 5,
  },
  content: {
    flex: 1,
    flexDirection: 'row', // Side-by-side on Web/Tablet
  },
  // PANEL LEFT
  leftPanel: {
    flex: 2,
    padding: 15,
    borderRightWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceMuted,
    borderRadius: 10,
    paddingHorizontal: 15,
    paddingVertical: 12,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: colors.border,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
  },
  productsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-start',
    gap: 10,
    paddingBottom: 20,
  },
  productCard: {
    width: '31%', // Fits 3 in a row
    minWidth: 150,
    backgroundColor: colors.white,
    borderRadius: 12,
    padding: 15,
    marginBottom: 10,
    marginRight: '2%',
    borderWidth: 1,
    borderColor: colors.secondary,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    elevation: 2,
    justifyContent: 'space-between',
  },
  productName: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 10,
    minHeight: 40,
  },
  productPrice: {
    fontSize: 16,
    color: colors.primary,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  addButton: {
    backgroundColor: colors.success,
    alignSelf: 'flex-end',
    borderRadius: 20,
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: 'center',
    width: '100%',
    marginTop: 40,
  },
  // PANEL RIGHT
  rightPanel: {
    flex: 1,
    minWidth: 350,
    backgroundColor: colors.background,
    display: 'flex',
    flexDirection: 'column',
  },
  typeSelector: {
    flexDirection: 'row',
    padding: 15,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  typeBtn: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    marginHorizontal: 5,
  },
  typeBtnActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  typeBtnText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  typeBtnTextActive: {
    color: colors.white,
  },
  cartContainer: {
    flex: 1,
    padding: 15,
  },
  cartContent: {
    paddingBottom: 20,
  },
  formSection: {
    marginBottom: 20,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  input: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    padding: 12,
    marginBottom: 10,
    fontSize: 15,
  },
  localFormRow: {
    flexDirection: 'row',
  },
  feeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 5,
  },
  feeLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
  },
  feeInput: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    padding: 10,
    width: 100,
    textAlign: 'right',
  },
  cartItemsHeader: {
    marginBottom: 15,
  },
  cartItemsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text,
  },
  cartItemRow: {
    backgroundColor: colors.white,
    padding: 12,
    borderRadius: 8,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cartItemInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  cartItemName: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
    flex: 1,
  },
  cartItemPrice: {
    fontSize: 15,
    fontWeight: 'bold',
    color: colors.primary,
  },
  cartItemControls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  qtyBtn: {
    backgroundColor: colors.textSecondary,
    width: 30,
    height: 30,
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
  },
  qtyText: {
    fontSize: 16,
    fontWeight: 'bold',
    marginHorizontal: 15,
    minWidth: 20,
    textAlign: 'center',
  },
  emptyCart: {
    textAlign: 'center',
    color: colors.textSecondary,
    marginTop: 20,
    fontStyle: 'italic',
  },
  checkoutFooter: {
    backgroundColor: colors.white,
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    elevation: 10,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  totalLabel: {
    fontSize: 16,
    color: colors.textSecondary,
  },
  totalValue: {
    fontSize: 16,
    fontWeight: '600',
  },
  totalLabelBig: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text,
  },
  totalValueBig: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.primary,
  },
  submitBtn: {
    backgroundColor: colors.success,
    padding: 16,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 15,
  },
  submitBtnDisabled: {
    backgroundColor: colors.disabled,
  },
  submitBtnText: {
    color: colors.white,
    fontSize: 18,
    fontWeight: 'bold',
    letterSpacing: 1,
  }
});
