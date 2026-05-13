
import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, Modal, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Product } from '../../../types';
import { colors } from '../../../theme/colors';
import { DataListItem } from '../../../ui/DataListItem';
import { FieldRow } from '../../../ui/FieldRow';
import { FormSection } from '../../../ui/FormSection';
import { StateView } from '../../../ui/StateView';
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
          <View style={{ flex: 2 }}>
            <FieldRow label="Nome" required>
              <TextInput
                style={styles.inputSmall}
                value={novoNome}
                onChangeText={setNovoNome}
                accessibilityLabel="Nome da variacao"
                autoFocus
              />
            </FieldRow>
          </View>
          <View style={{ flex: 1 }}>
            <FieldRow label="Preco" required>
              <TextInput
                style={styles.inputSmall}
                value={novoPreco}
                onChangeText={setNovoPreco}
                keyboardType="numeric"
                accessibilityLabel="Preco da variacao"
              />
            </FieldRow>
          </View>
          <TouchableOpacity onPress={handleSalvar} accessibilityRole="button" accessibilityLabel="Salvar variacao">
            <Ionicons name="checkmark-circle" size={28} color="green" />
          </TouchableOpacity>
        </View>
      ) : (
        <>
          <DataListItem
            title={variacao.name}
            subtitle={`R$ ${Number(variacao.price).toFixed(2)}`}
            status={variacao.active === false ? 'warning' : 'default'}
          />
          <TouchableOpacity onPress={() => setEditando(true)} accessibilityRole="button" accessibilityLabel={`Editar variacao ${variacao.name}`}>
            <Ionicons name="pencil" size={20} color={colors.text} />
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
    <Modal visible={visible} animationType="slide" transparent={true} onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.content} accessibilityViewIsModal accessibilityLabel="Modal de edicao de variacoes">
           <View style={styles.header}>
             <Text style={styles.title}>✏️ Editar Variações</Text>
             <TouchableOpacity
               onPress={onClose}
               accessibilityRole="button"
               accessibilityLabel="Fechar modal de variacoes"
             >
               <Text style={styles.close}>✕</Text>
             </TouchableOpacity>
           </View>

           <FormSection title="Variacoes" description="Edite nome, preco e acesse a ficha tecnica de cada variacao.">
             <ScrollView style={styles.list}>
                {variations.length === 0 ? (
                  <StateView state="empty" message="Nenhuma variacao encontrada." />
                ) : (
                  variations.map(variacao => (
                    <View key={variacao.id} style={styles.variacaoContainer}>
                      <VariacaoItem
                        variacao={variacao}
                        onSalvar={onSaveVariation}
                      />
                      <TouchableOpacity
                        style={styles.miniStockBtn}
                        onPress={() => onOpenStock(variacao)}
                        accessibilityRole="button"
                        accessibilityLabel={`Abrir ficha tecnica da variacao ${variacao.name}`}
                      >
                        <Text style={styles.miniStockText}>📦 Ficha Tecnica ({variacao.inventoryItems?.length || 0} itens)</Text>
                      </TouchableOpacity>
                    </View>
                  ))
                )}
             </ScrollView>
           </FormSection>

           <TouchableOpacity
             style={styles.closeBtn}
             onPress={onClose}
             accessibilityRole="button"
             accessibilityLabel="Fechar edicao de variacoes"
           >
               <Text style={styles.closeBtnText}>FECHAR</Text>
           </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
    overlay: { flex: 1, backgroundColor: colors.overlay, justifyContent: 'center', alignItems: 'center', padding: 20 },
    content: { backgroundColor: colors.white, width: '100%', maxWidth: 500, borderRadius: 20, padding: 20, maxHeight: '80%' },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
    title: { fontSize: 20, fontWeight: 'bold', color: colors.primary },
    close: { fontSize: 24, color: colors.textSecondary, padding: 5 },
    list: { marginBottom: 15 },
    variacaoContainer: { marginBottom: 15, borderBottomWidth: 1, borderColor: colors.border, paddingBottom: 10 },
    itemRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 },
    inputSmall: { borderWidth: 1, borderColor: colors.border, borderRadius: 5, padding: 5, fontSize: 14, color: colors.text },
    miniStockBtn: { backgroundColor: colors.surfaceMuted, padding: 8, borderRadius: 6, alignItems: 'center', alignSelf: 'flex-start' },
    miniStockText: { fontSize: 12, color: colors.textSecondary, fontWeight: 'bold' },
    closeBtn: { backgroundColor: colors.primary, padding: 12, borderRadius: 10, alignItems: 'center' },
    closeBtnText: { color: colors.white, fontWeight: 'bold' }
});
