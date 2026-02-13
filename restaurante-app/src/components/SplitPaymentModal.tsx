import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Platform,
  Alert,
  ActivityIndicator
} from 'react-native';
import { Order, OrderItem } from '../types/models';
import { calcularPrecoItem } from '../utils/orderCalculator';
import { useMenu } from '../hooks/useMenu';

interface SplitPaymentModalProps {
  visible: boolean;
  onClose: () => void;
  onConfirmPayment: (valor: number, paidItemsIds?: string[]) => void;
  totalAmount: number;
  orders: Order[];
  initialMode?: SplitMode;
}

type SplitMode = 'pessoas' | 'itens';

export default function SplitPaymentModal({
  visible,
  onClose,
  onConfirmPayment,
  totalAmount,
  orders,
  initialMode = 'pessoas'
}: SplitPaymentModalProps) {
  const [mode, setMode] = useState<SplitMode>(initialMode);
  
  // Hook de Menu para preços dinâmicos
  const { allItems: menuItems, loading: loadingMenu } = useMenu();

  // States for "Por Pessoas"
  const [numPessoas, setNumPessoas] = useState('2');
  const [valorPorPessoa, setValorPorPessoa] = useState(0);

  // States for "Por Itens"
  const [selectedItemIds, setSelectedItemIds] = useState<string[]>([]);
  const [totalSelected, setTotalSelected] = useState(0);
  const [allItems, setAllItems] = useState<(OrderItem & { orderId: string, uniqueId: string, paid?: boolean })[]>([]);

  useEffect(() => {
    if (visible) {
      if (initialMode) setMode(initialMode);
      // Reset selections when opening to prevent stale styling
      setSelectedItemIds([]);
      setTotalSelected(0);
      
      calculatePessoas();
      // Carregar itens dependentemente do menu estar carregado
      if (!loadingMenu) {
          loadItems();
      }
    }
  }, [visible, totalAmount, numPessoas, orders, initialMode, loadingMenu, menuItems]);

  const calculatePessoas = () => {
    const n = parseInt(numPessoas) || 1;
    if (n > 0) {
      setValorPorPessoa(totalAmount / n);
    }
  };

  const loadItems = () => {
    const items: (OrderItem & { orderId: string, uniqueId: string, paid?: boolean })[] = [];
    orders.forEach(order => {
      
      if (order.itemsWithStatus && order.itemsWithStatus.length > 0) {
        order.itemsWithStatus.forEach(item => {
          // @ts-ignore
          let parsedPrice = item.price || item.unitPrice || 0;
          
          // Se não tem preço explícito ou é zero, tentar calcular pelo nome usando o menu dinâmico
          if ((!parsedPrice || parsedPrice === 0) && (item.name || item.productId)) {
             // @ts-ignore
             const nomeItem = item.name || item.productId;
             // Passamos o menuItems (dinâmico) para a função de cálculo
             const calc = calcularPrecoItem(nomeItem, menuItems);
             parsedPrice = calc.precoUnitario;
          }

          let displayName = item.name || item.productId || 'Item sem nome';
          let qty = 1;
                
          // 1. Check if we have explicit quantity from data model (New Way)
          // @ts-ignore - quantity added to interface recently
          if (item.quantity && typeof item.quantity === 'number' && item.quantity > 0) {
              qty = item.quantity;
          }
          
          // 2. Fallback: Parse from name if quantity is 1 (Legacy/Error recovery)
          if (qty === 1) {
              const calcName = calcularPrecoItem(displayName, menuItems);
              if (calcName.quantidade > 1) {
                  qty = calcName.quantidade;
              }
          }

          // Clean name for display (remove "2x " prefix)
          if (qty > 1) {
              displayName = displayName.replace(/^\d+x?\s*/, '').trim();
          }

          // Determine how many are paid
          const paidQty = item.paid_quantity || (item.paid ? qty : 0);

          for (let i = 0; i < qty; i++) {
             const isUnitPaid = i < paidQty;
             
             let uniqueId = item.id;
             let displayLabel = displayName;

             if (qty > 1) {
                uniqueId = `${item.id}_split_${i}`; // Unique ID for split item
                displayLabel = `${displayName} (${i + 1}/${qty})`;
             } else {
                uniqueId = item.id || `${order.id}-${Math.random()}`;
             }

             items.push({
               ...item,
               orderId: order.id,
               uniqueId: uniqueId,
               price: parsedPrice,
               unitPrice: parsedPrice,
               // @ts-ignore
               name: displayLabel,
               quantity: 1, // Visualmente é 1 unidade
               paid: isUnitPaid
             });
          }
        });
      } else if (Array.isArray(order.items)) {
         // LEGACY SUPPORT (String array)
         // Itens legados geralmente são strings únicas "2x Chopp"
         // Dificil explodir sem parsing complexo. Mantemos comportamento 'por linha'
         order.items.forEach((itemParam: any, idx) => {
             let name = '';
             let price = 0;
             let qtyLegacy = 1;
             
             if (typeof itemParam === 'string') {
                 name = itemParam;
                 const calc = calcularPrecoItem(itemParam, menuItems); 
                 price = calc.precoUnitario; 
                 qtyLegacy = calc.quantidade;
             } else {
                 name = itemParam.name;
                 price = itemParam.unitPrice || itemParam.price || 0;
                 if ((!price || price === 0) && name) {
                    const calc = calcularPrecoItem(name, menuItems);
                    price = calc.precoUnitario;
                 }
                 qtyLegacy = itemParam.quantity || 1;
             }
             
             // CORREÇÃO: Explodir itens legados também para permitir seleção individual
             for (let i = 0; i < qtyLegacy; i++) {
                 let displayName = name;
                 // Remover a quantidade do nome se vier do string parsing (ex: "2x Chopp")
                 // O calcularPrecoItem já retorna nomeCompleto sem o "2x", mas aqui estamos usando "name = itemParam" direto no if string
                 // Vamos corrigir isso p/ usar o nome limpo se for string
                 
                 if (typeof itemParam === 'string') {
                      const calc = calcularPrecoItem(itemParam, menuItems);
                      displayName = calc.nomeCompleto;
                 }

                  const baseId = `${order.id}-comanda-${order.comandaNumber || 'temp'}-item-${idx}`; 
                 let uniqueId = baseId;

                 if (qtyLegacy > 1) {
                     displayName = `${displayName} (${i + 1}/${qtyLegacy})`;
                     uniqueId = `${baseId}_split_${i}`;
                 }

                 items.push({
                   id: baseId,
                   productId: 'unknown',
                   quantity: 1, // Visualmente é 1 unidade
                   subtotal: price,
                   name: displayName,
                   unitPrice: price,
                   orderId: order.id,
                   uniqueId: uniqueId,
                   paid: false // Legacy items start as unpaid
                 });
             }
         });
      }
    });
    setAllItems(items);
  };

  const toggleItemSelection = (id: string, price: number) => {
    const isSelected = selectedItemIds.includes(id);
    if (isSelected) {
      setSelectedItemIds(prev => prev.filter(i => i !== id));
      setTotalSelected(prev => Math.max(0, prev - price));
    } else {
      setSelectedItemIds(prev => [...prev, id]);
      setTotalSelected(prev => prev + price);
    }
  };

  const handleConfirm = () => {
    if (mode === 'pessoas') {
      onConfirmPayment(valorPorPessoa);
    } else {
      onConfirmPayment(totalSelected, selectedItemIds);
    }
    // Não fechamos automaticamente para permitir múltiplos pagamentos, ou fechamos?
    // O fluxo sugere: Pagar -> Processar -> Atualizar Saldo -> Modar fecha ou mantem aberta?
    // Vamos manter a modal aberta ou fechar dependendo da UX.
    // O PagamentoScreen vai processar e atualizar o saldo.
    // Melhor fechar a modal para o usuário ver o feedback de sucesso na tela de trás e reabrir se quiser.
    onClose();
  };
  
  const formatMoney = (val: number) => {
    return val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.container}>
          <View style={styles.header}>
            <Text style={styles.title}>Dividir Conta (Rateio)</Text>
            <TouchableOpacity onPress={onClose}>
              <Text style={styles.closeBtn}>✕</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.tabs}>
            <TouchableOpacity 
              style={[styles.tab, mode === 'pessoas' && styles.activeTab]}
              onPress={() => setMode('pessoas')}
            >
              <Text style={[styles.tabText, mode === 'pessoas' && styles.activeTabText]}>
                Por Pessoas
              </Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.tab, mode === 'itens' && styles.activeTab]}
              onPress={() => setMode('itens')}
            >
              <Text style={[styles.tabText, mode === 'itens' && styles.activeTabText]}>
                Por Itens
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.content}>
            {mode === 'pessoas' ? (
              <View style={styles.pessoasContainer}>
                <Text style={styles.label}>Total Restante: {formatMoney(totalAmount)}</Text>
                
                <View style={styles.inputRow}>
                  <Text style={styles.inputText}>Dividir em </Text>
                  <TextInput
                    style={styles.numberInput}
                    value={numPessoas}
                    onChangeText={setNumPessoas}
                    keyboardType="number-pad"
                    maxLength={2}
                  />
                  <Text style={styles.inputText}> pessoas</Text>
                </View>

                <View style={styles.resultBox}>
                  <Text style={styles.resultLabel}>Valor por pessoa:</Text>
                  <Text style={styles.resultValue}>{formatMoney(valorPorPessoa)}</Text>
                </View>
                
                <Text style={styles.hint}>
                  Ao confirmar, o valor de uma parcela será preenchido para pagamento.
                </Text>
              </View>
            ) : (
              <View style={styles.itensContainer}>
                 <Text style={styles.label}>Selecione os itens para pagar:</Text>
                 <ScrollView style={styles.itemsList}>
                   {allItems.map((item) => {
                     const isSelected = selectedItemIds.includes(item.uniqueId);
                     const isPaid = item.paid;
                     
                     return (
                       <TouchableOpacity
                         key={item.uniqueId}
                         style={[
                           styles.itemRow, 
                           isSelected && styles.selectedItemRow,
                           isPaid && styles.paidItemRow
                         ]}
                         onPress={() => !isPaid && toggleItemSelection(item.uniqueId, item.unitPrice || 0)}
                         disabled={!!isPaid}
                       >
                         <View style={styles.checkbox}>
                           {isSelected && <Text style={styles.checkmark}>✓</Text>}
                           {isPaid && <Text style={styles.checkmark}>P</Text>}
                         </View>
                         <View style={{flex: 1}}>
                            <Text style={[styles.itemName, isPaid && styles.paidText]}>
                              {item.name}
                            </Text>
                         </View>
                         <Text style={[styles.itemPrice, isPaid && styles.paidText]}>
                           {formatMoney(item.unitPrice || 0)}
                         </Text>
                       </TouchableOpacity>
                     );
                   })}
                   {allItems.length === 0 && (
                     <Text style={styles.emptyText}>Nenhum item detalhado encontrado.</Text>
                   )}
                 </ScrollView>
                 
                 <View style={styles.footerTotal}>
                   <Text style={styles.footerLabel}>Selecionado:</Text>
                   <Text style={styles.footerValue}>{formatMoney(totalSelected)}</Text>
                 </View>
              </View>
            )}
          </View>

          <TouchableOpacity style={styles.confirmBtn} onPress={handleConfirm}>
            <Text style={styles.confirmBtnText}>
              {mode === 'pessoas' 
                ? `Pagar Parcela (${formatMoney(valorPorPessoa)})`
                : `Pagar Seleção (${formatMoney(totalSelected)})`
              }
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20
  },
  container: {
    width: '100%',
    maxWidth: 450,
    backgroundColor: '#FFF',
    borderRadius: 16,
    overflow: 'hidden',
    maxHeight: '85%', // Reduced slightly to ensure it fits with padding
    display: 'flex',
    flexDirection: 'column'
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#8B2F2F',
    flexShrink: 0
  },
  title: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: 'bold'
  },
  closeBtn: {
    color: '#FFF',
    fontSize: 20,
    fontWeight: 'bold',
    padding: 5
  },
  tabs: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#EEE',
    flexShrink: 0
  },
  tab: {
    flex: 1,
    paddingVertical: 14,
    alignItems: 'center',
    backgroundColor: '#F9F9F9'
  },
  activeTab: {
    backgroundColor: '#FFF',
    borderBottomWidth: 2,
    borderBottomColor: '#8B2F2F'
  },
  tabText: {
    color: '#666',
    fontWeight: '600'
  },
  activeTabText: {
    color: '#8B2F2F'
  },
  content: {
    padding: 20,
    flex: 1, // Crucial for taking available space
    display: 'flex',
    flexDirection: 'column'
  },
  pessoasContainer: {
    alignItems: 'center',
    marginVertical: 20
  },
  label: {
    fontSize: 16,
    color: '#333',
    marginBottom: 15,
    fontWeight: '500'
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20
  },
  inputText: {
    fontSize: 18,
    color: '#333'
  },
  numberInput: {
    borderWidth: 1,
    borderColor: '#CCC',
    borderRadius: 8,
    padding: 10,
    width: 60,
    textAlign: 'center',
    fontSize: 18,
    fontWeight: 'bold',
    marginHorizontal: 10
  },
  resultBox: {
    backgroundColor: '#F5F1E8',
    padding: 20,
    borderRadius: 12,
    width: '100%',
    alignItems: 'center',
    marginBottom: 15
  },
  resultLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 5
  },
  resultValue: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#8B2F2F'
  },
  hint: {
    fontSize: 12,
    color: '#888',
    textAlign: 'center'
  },
  itensContainer: {
    flex: 1, // Take all space in content
    display: 'flex',
    flexDirection: 'column'
  },
  itemsList: {
    flex: 1, // Allow ScrollView to fill space and scroll
    marginVertical: 10
    // Removed maxHeight
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#EEE'
  },
  selectedItemRow: {
    backgroundColor: '#FFF3CD'
  },
  paidItemRow: {
    backgroundColor: '#F0F0F0',
    opacity: 0.6
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: '#8B2F2F',
    marginRight: 12,
    justifyContent: 'center',
    alignItems: 'center'
  },
  checkmark: {
    color: '#8B2F2F',
    fontWeight: 'bold',
    fontSize: 16
  },
  itemName: {
    fontSize: 15,
    color: '#333'
  },
  itemPrice: {
    fontSize: 15,
    fontWeight: '600',
    color: '#333'
  },
  paidText: {
    textDecorationLine: 'line-through',
    color: '#999'
  },
  emptyText: {
    textAlign: 'center',
    color: '#999',
    marginTop: 20,
    fontStyle: 'italic'
  },
  footerTotal: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 15,
    paddingTop: 15,
    borderTopWidth: 1,
    borderTopColor: '#EEE',
    flexShrink: 0
  },
  footerLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333'
  },
  footerValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#4CAF50'
  },
  confirmBtn: {
    backgroundColor: '#4CAF50',
    padding: 16,
    alignItems: 'center',
    margin: 20,
    borderRadius: 12,
    flexShrink: 0
  },
  confirmBtnText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: 'bold'
  }
});
