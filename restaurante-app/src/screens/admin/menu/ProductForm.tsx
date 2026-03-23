
import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, Modal, StyleSheet, Alert, ActivityIndicator, Switch } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ProductFormData, ProductFormProps } from './types';
import { useAuth } from '../../../context/AuthContext';
import { colors } from '../../../theme/colors';
import { isEspetinhoCategorySlug } from '../../../utils/menuCategories';
export default function ProductForm({
  visible,
  onClose,
  onSave,
  initialData,
  categories,
  pizzaConfig,
  isLoading,
  onOpenStock,
  variationNames
}: ProductFormProps) {
    const { user } = useAuth();
  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [category, setCategory] = useState('');
  const [pizzaPrices, setPizzaPrices] = useState<Record<string, string>>({});

  // Espetinho Logic
  const [createVariations, setCreateVariations] = useState(false);
  const [espetinhoPrices, setEspetinhoPrices] = useState<Record<string, string>>({});
  
  const effectiveVariationNames = variationNames || ['Simples', 'com Arroz', 'com Macaxeira', 'Completo'];

  useEffect(() => {
    if (visible && initialData) {
      setName(initialData.name);
      setPrice(initialData.price ? initialData.price.toString() : '0');
      setCategory(initialData.category);
      if (initialData.category === 'pizza' && initialData.prices) {
          const formatted: Record<string, string> = {};
          Object.keys(initialData.prices).forEach(k => {
              formatted[k] = initialData.prices![k].toString();
          });
          setPizzaPrices(formatted);
      } else {
          setPizzaPrices({});
      }
      setCreateVariations(false); // Edit mode doesn't support batch creation re-trigger easily
    } else if (visible) {
        // Reset for new creation
        setName('');
        setPrice('');
        setCategory(categories[0]?.value || '');
        setPizzaPrices({});
        setCreateVariations(false);
        setEspetinhoPrices({});
    }
  }, [visible, initialData, categories]);

  const handleSave = async () => {
      if (!name.trim()) return Alert.alert('Atenção', 'Nome é obrigatório');

      const data: ProductFormData = {
          id: initialData?.id,
          name: name.trim(),
          price: 0,
          category,
          createVariations: createVariations,
          variationNames: effectiveVariationNames
      };

      if (category === 'pizza') {
          // Validate pizza prices
          const pricesMap: Record<string, number> = {};
          Object.keys(pizzaPrices).forEach(key => {
              const val = parseFloat(pizzaPrices[key]?.replace(',', '.') || '0');
              if (val > 0) pricesMap[key] = val;
          });
          
          if (Object.keys(pricesMap).length === 0) {
             return Alert.alert('Atenção', 'Preencha pelo menos um preço');
          }
          data.prices = pricesMap;
    } else if (createVariations && isEspetinhoCategorySlug(category)) {
          const pricesMap: Record<string, number> = {};
          let allFilled = true;
          effectiveVariationNames.forEach(v => {
              const p = espetinhoPrices[v];
              if (!p) allFilled = false;
              else pricesMap[v] = parseFloat(p.replace(',', '.'));
          });

          if (!allFilled) return Alert.alert('Atenção', 'Preencha todos os preços das variações');
          data.espetinhoPrices = pricesMap;
      } else {
          const val = parseFloat(price.replace(',', '.') || '0');
          if (isNaN(val)) return Alert.alert('Atenção', 'Preço inválido');
          data.price = val;
      }

      await onSave(data);
  };

    const isEspetinho = isEspetinhoCategorySlug(category);

  return (
    <Modal visible={visible} animationType="slide" transparent={true}>
      <View style={styles.overlay}>
        <View style={styles.content}>
           <View style={styles.header}>
                         <View style={styles.headerTop}>
                             <View style={styles.headerLeft} />
                             <View style={styles.headerCenter}>
                                 <View style={styles.titleRow}>
                                     <Ionicons
                                         name={initialData ? 'create-outline' : 'add-circle-outline'}
                                         size={22}
                                         color={colors.primary}
                                         style={styles.titleIcon}
                                     />
                                     <Text style={styles.title}>{initialData ? 'Editar Produto' : 'Novo Produto'}</Text>
                                 </View>
                             </View>
                             <View style={styles.headerRight}>
                                 <TouchableOpacity onPress={onClose}><Text style={styles.close}>✕</Text></TouchableOpacity>
                             </View>
                         </View>
                         {!!user && <Text style={styles.userInfo}>Operador: {user.nome || user.email}</Text>}
           </View>

           <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.label}>Nome:</Text>
              <TextInput 
                style={styles.input} 
                value={name} 
                onChangeText={setName} 
                placeholder="Nome do Produto" 
                placeholderTextColor={colors.textSecondary}
              />

              <Text style={styles.label}>Categoria:</Text>
              <View style={styles.catContainer}>
                 {categories.map(cat => (
                     <TouchableOpacity
                        key={cat.value}
                        style={[styles.catBtn, category === cat.value && styles.catBtnActive]}
                        onPress={() => setCategory(cat.value)}
                     >
                                <Text style={[styles.catText, category === cat.value && styles.catTextActive]}>{cat.label}</Text>
                     </TouchableOpacity>
                 ))}
              </View>

              {category === 'pizza' ? (
                  <View style={{ marginBottom: 15 }}>
                      <Text style={styles.label}>Preços por Tamanho:</Text>
                      <View style={styles.grid}>
                        {pizzaConfig?.sizes?.map(size => (
                            <View key={size.name} style={styles.gridItem}>
                                <Text style={styles.smallLabel}>{size.name}</Text>
                                <TextInput
                                  style={styles.inputCenter}
                                  value={pizzaPrices[size.name] || ''}
                                  onChangeText={t => setPizzaPrices(prev => ({ ...prev, [size.name]: t }))}
                                  keyboardType="numeric"
                                  placeholder="0.00"
                                  placeholderTextColor={colors.textSecondary}
                                />
                            </View>
                        ))}
                      </View>
                  </View>
              ) : isEspetinho && !initialData ? (
                  /* ESPETINHO: LOGIC FOR NEW PRODUCTS ONLY */
                  <View style={{ marginBottom: 15 }}>
                      <View style={styles.switchContainer}>
                          <Text style={styles.label}>Criar variações automaticamente?</Text>
                          <Switch 
                            value={createVariations} 
                            onValueChange={setCreateVariations}
                                                        trackColor={{ false: colors.disabled, true: colors.primary }}
                          />
                      </View>

                      {createVariations ? (
                          <View style={styles.grid}>
                             {effectiveVariationNames.map(v => (
                                 <View key={v} style={styles.gridItem}>
                                    <Text style={styles.smallLabel}>{v}</Text>
                                    <TextInput
                                        style={styles.inputCenter}
                                        value={espetinhoPrices[v] || ''}
                                        onChangeText={t => setEspetinhoPrices(prev => ({ ...prev, [v]: t }))}
                                        keyboardType="numeric"
                                        placeholder="0.00"
                                    />
                                 </View>
                             ))}
                          </View>
                      ) : (
                          <View>
                            <Text style={styles.label}>Preço:</Text>
                            <TextInput
                                style={styles.input}
                                value={price}
                                onChangeText={setPrice}
                                keyboardType="numeric"
                                placeholder="0.00"
                                placeholderTextColor={colors.textSecondary}
                            />
                        </View>
                      )}
                  </View>
              ) : (
                  <View>
                      <Text style={styles.label}>Preço:</Text>
                      <TextInput
                        style={styles.input}
                        value={price}
                        onChangeText={setPrice}
                        keyboardType="numeric"
                        placeholder="0.00"
                        placeholderTextColor={colors.textSecondary}
                      />
                  </View>
              )}

               {initialData && onOpenStock && (
                   <TouchableOpacity style={styles.stockBtn} onPress={() => onOpenStock(initialData)}>
                       <Text style={styles.stockText}>📦 Configurar Ficha Técnica / Estoque</Text>
                   </TouchableOpacity>
               )}

               <TouchableOpacity style={styles.saveBtn} onPress={handleSave} disabled={isLoading}>
                   {isLoading ? <ActivityIndicator color={colors.white} /> : <Text style={styles.saveText}>SALVAR DADOS</Text>}
               </TouchableOpacity>
           </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
    overlay: { flex: 1, backgroundColor: colors.overlay, justifyContent: 'center', alignItems: 'center', padding: 20 },
    content: { backgroundColor: colors.white, width: '100%', maxWidth: 400, borderRadius: 20, padding: 20, maxHeight: '90%', shadowColor: colors.shadow, elevation: 10 },
    header: { marginBottom: 20 },
    headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    headerLeft: { flex: 1 },
    headerCenter: { flex: 2, alignItems: 'center' },
    headerRight: { flex: 1, alignItems: 'flex-end' },
    titleRow: { flexDirection: 'row', alignItems: 'center' },
    titleIcon: { marginRight: 8 },
    title: { fontSize: 20, fontWeight: 'bold', color: colors.primary },
    close: { fontSize: 24, color: colors.textSecondary, padding: 5 },
    userInfo: { marginTop: 4, fontSize: 12, color: colors.textSecondary, fontWeight: '600', textAlign: 'center' },
    label: { fontSize: 14, fontWeight: '600', color: colors.textSecondary, marginBottom: 8, marginLeft: 4 },
    input: { backgroundColor: colors.background, borderRadius: 12, padding: 15, fontSize: 16, color: colors.text, marginBottom: 15 },
    catContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 15 },
    catBtn: { paddingVertical: 8, paddingHorizontal: 16, borderRadius: 20, backgroundColor: colors.background, borderWidth: 2, borderColor: colors.secondary },
    catBtnActive: { backgroundColor: colors.secondary, borderColor: colors.primary },
    catText: { fontSize: 13, fontWeight: '600', color: colors.textSecondary },
    catTextActive: { color: colors.text },
    grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
    gridItem: { width: '47%', marginBottom: 10 },
    smallLabel: { fontSize: 12, color: colors.primary, marginBottom: 5, fontWeight: 'bold' },
    inputCenter: { backgroundColor: colors.background, borderRadius: 8, padding: 12, fontSize: 16, textAlign: 'center', borderWidth: 1, borderColor: colors.secondary },
    stockBtn: { backgroundColor: colors.text, padding: 12, borderRadius: 10, alignItems: 'center', marginBottom: 15 },
    stockText: { color: colors.white, fontWeight: 'bold' },
    saveBtn: { backgroundColor: colors.primary, padding: 15, borderRadius: 12, alignItems: 'center', marginTop: 10 },
    saveText: { color: colors.white, fontWeight: 'bold', fontSize: 16 },
    switchContainer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 }
});
