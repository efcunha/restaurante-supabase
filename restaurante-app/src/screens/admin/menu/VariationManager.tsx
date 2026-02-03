
import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, Modal, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Product } from '../../../types';

interface VariacaoItemProps {
  variacao: Product; // Or partial
  onSalvar: (produto: Product, novoPreco: string, novoNome: string) => void;
}

function VariacaoItem({ variacao, onSalvar }: VariacaoItemProps) {
  const [editando, setEditando] = useState(false);
  const [novoPreco, setNovoPreco] = useState(variacao.price ? variacao.price.toString() : '0');
  const [novoNome, setNovoNome] = useState(variacao.name);

  const handleSalvar = () => {
    onSalvar(variacao, novoPreco, novoNome);
    setEditando(false);
  };

  return (
    <View style={styles.itemRow}>
      {editando ? (
        <View style={{ flex: 1, flexDirection: 'row', gap: 5 }}>
          <TextInput
            style={[styles.inputSmall, { flex: 2 }]}
            value={novoNome}
            onChangeText={setNovoNome}
          />
          <TextInput
            style={[styles.inputSmall, { flex: 1 }]}
            value={novoPreco}
            onChangeText={setNovoPreco}
            keyboardType="numeric"
          />
          <TouchableOpacity onPress={handleSalvar}>
            <Ionicons name="checkmark-circle" size={28} color="green" />
          </TouchableOpacity>
        </View>
      ) : (
        <>
          <Text style={styles.itemText}>{variacao.name} - R$ {Number(variacao.price).toFixed(2)}</Text>
          <TouchableOpacity onPress={() => setEditando(true)}>
            <Ionicons name="pencil" size={20} color="#444" />
          </TouchableOpacity>
        </>
      )}
    </View>
  );
}

interface VariationManagerProps {
  visible: boolean;
  onClose: () => void;
  variations: Product[];
  onSaveVariation: (produto: Product, novoPreco: string, novoNome: string) => void;
  onOpenStock: (produto: Product) => void;
}

export default function VariationManager({
  visible,
  onClose,
  variations,
  onSaveVariation,
  onOpenStock
}: VariationManagerProps) {

  return (
    <Modal visible={visible} animationType="slide" transparent={true}>
      <View style={styles.overlay}>
        <View style={styles.content}>
           <View style={styles.header}>
             <Text style={styles.title}>✏️ Editar Variações</Text>
             <TouchableOpacity onPress={onClose}><Text style={styles.close}>✕</Text></TouchableOpacity>
           </View>

           <ScrollView style={styles.list}>
              {variations.map(variacao => (
                <View key={variacao.id} style={styles.variacaoContainer}>
                  <VariacaoItem
                    variacao={variacao}
                    onSalvar={onSaveVariation}
                  />
                  {/* Stock specific to variation */}
                  <TouchableOpacity
                    style={styles.miniStockBtn}
                    onPress={() => onOpenStock(variacao)}
                  >
                    <Text style={styles.miniStockText}>📦 Ficha Técnica ({variacao.inventoryItems?.length || 0} itens)</Text>
                  </TouchableOpacity>
                </View>
              ))}
           </ScrollView>

           <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
               <Text style={styles.closeBtnText}>FECHAR</Text>
           </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
    overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 20 },
    content: { backgroundColor: '#FFF', width: '100%', maxWidth: 500, borderRadius: 20, padding: 20, maxHeight: '80%' },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
    title: { fontSize: 20, fontWeight: 'bold', color: '#8B2F2F' },
    close: { fontSize: 24, color: '#999', padding: 5 },
    list: { marginBottom: 15 },
    variacaoContainer: { marginBottom: 15, borderBottomWidth: 1, borderColor: '#eee', paddingBottom: 10 },
    itemRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 },
    itemText: { fontSize: 16, color: '#333' },
    inputSmall: { borderWidth: 1, borderColor: '#ccc', borderRadius: 5, padding: 5, fontSize: 14 },
    miniStockBtn: { backgroundColor: '#eee', padding: 8, borderRadius: 6, alignItems: 'center', alignSelf: 'flex-start' },
    miniStockText: { fontSize: 12, color: '#555', fontWeight: 'bold' },
    closeBtn: { backgroundColor: '#8B2F2F', padding: 12, borderRadius: 10, alignItems: 'center' },
    closeBtnText: { color: '#FFF', fontWeight: 'bold' }
});
