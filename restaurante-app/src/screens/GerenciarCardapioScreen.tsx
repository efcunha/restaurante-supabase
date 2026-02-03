
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Alert, ActivityIndicator, Platform, TouchableOpacity } from 'react-native';
import { doc, getDoc, getDocs, setDoc, updateDoc, writeBatch, addDoc, collection } from 'firebase/firestore';
import { db } from '../config/firebaseConfig';
import { useAuth } from '../context/AuthContext';
import { getCompanyCollection, getCompanyDoc } from '../utils/firestoreUtils';
import { Product, PizzaConfig, PizzaSize } from '../types';
import { Ionicons } from '@expo/vector-icons';

// Sub-components
import ProductList from './admin/menu/ProductList';
import ProductForm from './admin/menu/ProductForm';
import VariationManager from './admin/menu/VariationManager';
import StockManager from './admin/menu/StockManager';
import MenuSettings from './admin/menu/MenuSettings';
import { ProductFormData, StockItem } from './admin/menu/types';

export default function GerenciarCardapioScreen({ onClose }: { onClose?: () => void }) {
  const { user } = useAuth();
  
  // DATA
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [stockItems, setStockItems] = useState<StockItem[]>([]);
  
  // CONFIG
  const [pizzaConfig, setPizzaConfig] = useState<PizzaConfig>({ sizes: [] });
  const [caldosList, setCaldosList] = useState<string[]>([]);
  const [espetinhoVariations, setEspetinhoVariations] = useState<string[]>(['Simples', 'com Arroz', 'com Macaxeira', 'Completo']);
  
  // MODALS
  const [showProductForm, setShowProductForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [showVariations, setShowVariations] = useState(false);
  const [selectedVariations, setSelectedVariations] = useState<Product[]>([]);
  const [showStock, setShowStock] = useState(false);
  const [stockProduct, setStockProduct] = useState<Product | null>(null);
  const [showSettings, setShowSettings] = useState(false);

  // CATEGORIES
  const categories = [
    { label: 'Caldos', value: 'caldo' },
    { label: 'Espetinhos (Simples)', value: 'espetinho-simples' },
    { label: 'Espetinhos (Especial)', value: 'espetinho-especial' },
    { label: 'Jantinhas', value: 'jantinha' },
    { label: 'Pizzas', value: 'pizza' },
    { label: 'Comidas', value: 'comida' },
    { label: 'Bebidas', value: 'bebida' },
    { label: 'Porções', value: 'porcao' }
  ];

  useEffect(() => {
     loadData();
  }, [user]);

  const loadData = async () => {
     if (!user?.companyId) return;
     try {
       setLoading(true);
       
       // 1. Config
       const configRef = doc(db, 'companies', user.companyId, 'settings', 'cardapio_config');
       const configSnap = await getDoc(configRef);
       if (configSnap.exists()) {
           const data = configSnap.data();
           if(data.pizzaConfig) setPizzaConfig(data.pizzaConfig);
           if(data.temperosCaldos) setCaldosList(data.temperosCaldos);
           if(data.variacoesEspetinho) setEspetinhoVariations(data.variacoesEspetinho);
       } else {
           // Defaults
           const defaultPizza = { sizes: [{ name: 'Média', maxFlavors: 2, active: true }, { name: 'Grande', maxFlavors: 3, active: true }] };
           setPizzaConfig(defaultPizza);
       }
       
       // 2. Products
       const prodRef = getCompanyCollection(user.companyId, 'cardapio');
       const prodSnap = await getDocs(prodRef);
       const loadedProds: Product[] = [];
       prodSnap.forEach(d => loadedProds.push({ id: d.id, ...d.data() } as Product));
       setProducts(loadedProds);
       
       // 3. Stock Items (Lazy loading preferred, but loading here for simplicity)
       // Keeping simple for now, maybe load on open stock modal
     } catch (e) {
         console.error(e);
         Alert.alert('Erro', 'Falha ao carregar dados');
     } finally {
         setLoading(false);
     }
  };

  const loadStockItems = async () => {
     if (stockItems.length > 0) return;
     if (!user?.companyId) return;
     try {
         const ref = getCompanyCollection(user.companyId, 'inventory'); // Assuming inventory collection
         const snap = await getDocs(ref);
         const items: StockItem[] = [];
         snap.forEach(d => items.push({ id: d.id, ...d.data() } as any));
         setStockItems(items);
     } catch(e) { console.error(e); }
  };

  // --- ACTIONS ---

  const handleSaveProduct = async (data: ProductFormData) => {
     if (!user?.companyId) return;
     try {
         setLoading(true);
         
         if (data.createVariations && data.espetinhoPrices) {
             // BATCH CREATION (Espetinho)
             const batch = writeBatch(db);
             Object.entries(data.espetinhoPrices).forEach(([nameSuffix, price]) => {
                 const docRef = doc(collection(db, 'companies', user.companyId!, 'cardapio'));
                 batch.set(docRef, {
                     name: `${data.name} ${nameSuffix}`,
                     price: price,
                     category: data.category,
                     active: true,
                     createdAt: Date.now()
                 });
             });
             await batch.commit();
         } else if (data.id) {
             // UPDATE
             const ref = getCompanyDoc(user.companyId, 'cardapio', data.id);
             const update: any = { name: data.name, category: data.category };
             if (data.category === 'pizza' && data.prices) {
                 update.prices = data.prices;
                 update.price = 0; // Pizza base price often 0 if sizes used
             } else {
                 update.price = data.price;
             }
             await updateDoc(ref, update);
         } else {
             // CREATE SINGLE
             const ref = getCompanyCollection(user.companyId, 'cardapio');
             const newProd: any = {
                 name: data.name,
                 category: data.category,
                 active: true,
                 createdAt: Date.now()
             };
             if (data.category === 'pizza' && data.prices) {
                 newProd.prices = data.prices;
                 newProd.price = 0;
             } else {
                 newProd.price = data.price;
             }
             await addDoc(ref, newProd);
         }
         
         setShowProductForm(false);
         await loadData(); // Reload
         Alert.alert('Sucesso', 'Produto salvo!');
     } catch (e) {
         Alert.alert('Erro', 'Falha ao salvar produto');
         console.error(e);
     } finally {
         setLoading(false);
     }
  };

  const handleEdit = (productNameBase: string) => {
     // Find the "base" product to edit
     // If it's a grouped product (like Espetinho variations), we technically can't edit the "group" easily if they are separate docs.
     // The original code separated them.
     // For "Pizza" it's one doc.
     // For normal products it's one doc.
     
     // Logic: Find first product with this base name?
     // Actually, if it's a variation group, we should probably invoke "Variation Manager".
     // But the "Edit" button in UI was generic.
     
     // Let's implement logic: 
     // If single product -> Edit Product Form.
     // If group -> Check if logic allows group editing. Original file allowed "Editar" on a group which opened "abrirVariacoes".
     
     const group = products.filter(p => p.name.startsWith(productNameBase)); // Very naive matching
     // Better matching logic needed or reuse logic from List.
     
     // REUSE LOGIC FROM LIST:
     // ProductList passes "productName" which is the base name.
     // We need to find the variations.
     const variations = products.filter(p => {
        const base = p.name.replace(/\s*\(.*\)\s*$/, '').trim(); // Remove suffix if pattern matches
        // But really we rely on the list having grouped them correctly.
        // Let's try to match exact name first.
        return p.name === productNameBase; 
     });
     
     if (variations.length === 1) {
         setEditingProduct(variations[0]);
         setShowProductForm(true);
     } else {
         // It's a group or we failed to find it.
         // If we passed the base name, we probably want to edit the variations.
         // Let's look for products starting with this name.
         const group = products.filter(p => p.name.includes(productNameBase));
         if (group.length > 0) {
             setSelectedVariations(group);
             setShowVariations(true);
         }
     }
  };

  const handleDelete = async (variations: Product[]) => {
      Alert.alert('Confirmar', `Excluir ${variations.length} produtos?`, [
          { text: 'Cancelar' },
          { text: 'Excluir', style: 'destructive', onPress: async () => {
              setLoading(true);
              try {
                  const batch = writeBatch(db);
                  variations.forEach(v => {
                      if (!v.id || !user?.companyId) return;
                      const ref = getCompanyDoc(user.companyId, 'cardapio', v.id);
                      batch.delete(ref);
                  });
                  await batch.commit();
                  loadData();
              } catch (e) { Alert.alert('Erro', 'Falha ao excluir'); }
              finally { setLoading(false); }
          }}
      ]);
  };

  const handleToggleStatus = async (variations: Product[], currentStatus: boolean) => {
      try {
          // Flatten actions but better to batch
          const batch = writeBatch(db);
          variations.forEach(v => {
               if(!v.id || !user?.companyId) return;
               const ref = getCompanyDoc(user.companyId, 'cardapio', v.id);
               batch.update(ref, { active: !currentStatus });
          });
          await batch.commit();
          loadData();
      } catch (e) { console.error(e); }
  };

  const handleManageStock = async (product: Product) => {
      await loadStockItems();
      setStockProduct(product);
      setShowStock(true);
  };

  const handleStockAdd = async (stockId: string, qty: number, unit: string) => {
      if (!stockProduct || !user?.companyId) return;
      // stockId lookup
      const item = stockItems.find(i => i.id === stockId);
      const newItem = {
          id: stockId, // inventory ID
          nome: item?.nome || 'Item',
          qt: qty,
          un: unit
      };
      
      const currentItems = stockProduct.inventoryItems || [];
      const updated = [...currentItems, newItem];
      
      const ref = getCompanyDoc(user.companyId, 'cardapio', stockProduct.id);
      await updateDoc(ref, { inventoryItems: updated });
      
      // Update local state to reflect change immediately in modal
      setStockProduct({ ...stockProduct, inventoryItems: updated });
      // Update main list
      setProducts(prev => prev.map(p => p.id === stockProduct.id ? { ...p, inventoryItems: updated } : p));
  };

  const handleStockRemove = async (ingId: string) => {
      if (!stockProduct || !user?.companyId) return;
      const currentItems = stockProduct.inventoryItems || [];
      const updated = currentItems.filter(i => i.id !== ingId);
      
      const ref = getCompanyDoc(user.companyId, 'cardapio', stockProduct.id);
      await updateDoc(ref, { inventoryItems: updated });
      
      setStockProduct({ ...stockProduct, inventoryItems: updated });
      setProducts(prev => prev.map(p => p.id === stockProduct.id ? { ...p, inventoryItems: updated } : p));
  };
  
  const handleSaveVariation = async (prod: Product, price: string, name: string) => {
      if (!user?.companyId || !prod.id) return;
      const newPrice = parseFloat(price.replace(',', '.'));
      const ref = getCompanyDoc(user.companyId, 'cardapio', prod.id);
      await updateDoc(ref, { name: name, price: newPrice });
      loadData();
  };

  const handleSaveSettings = async (listas: any) => {
      if (!user?.companyId) return;
      const ref = doc(db, 'companies', user.companyId, 'settings', 'cardapio_config');
      await setDoc(ref, {
          temperosCaldos: listas.caldos
      }, { merge: true });
      if(listas.caldos) setCaldosList(listas.caldos);
  };
  
  const handleSavePizzaSizes = async (sizes: PizzaSize[]) => {
      if (!user?.companyId) return;
      const newConfig = { ...pizzaConfig, sizes };
      const ref = doc(db, 'companies', user.companyId, 'settings', 'cardapio_config');
      await setDoc(ref, { pizzaConfig: newConfig }, { merge: true });
      setPizzaConfig(newConfig);
  };

  return (
    <View style={styles.container}>
      {/* HEADER */}
      <View style={styles.header}>
         <ActivityIndicator animating={loading} color="#FFF" style={{position: 'absolute', right: 20}} />
         <Text style={styles.headerText}>📋 Gerenciar Cardápio</Text>
         {onClose && (
             <TouchableOpacity 
                style={{position: 'absolute', left: 20, padding: 10}}
                onPress={onClose}
             >
                <Ionicons name="arrow-back" size={28} color="#FFF" />
             </TouchableOpacity>
         )}
         <TouchableOpacity 
            style={{position: 'absolute', right: 60, backgroundColor: '#FFCC00', padding: 5, borderRadius: 5}}
            onPress={() => {
                const runReset = async () => {
                        setLoading(true);
                        try {
                            const batch = writeBatch(db);
                            products.forEach(p => {
                                if (p.id && user?.companyId) {
                                    const ref = getCompanyDoc(user.companyId, 'cardapio', p.id);
                                    batch.update(ref, { active: false });
                                }
                            });
                            await batch.commit();
                            await loadData();
                            if (Platform.OS === 'web') {
                                window.alert('Sucesso: Todos os itens foram desativados.');
                            } else {
                                Alert.alert('Sucesso', 'Todos os itens foram desativados.');
                            }
                        } catch (e) {
                            console.error(e);
                            if (Platform.OS === 'web') {
                                window.alert('Erro: Falha ao zerar.');
                            } else {
                                Alert.alert('Erro', 'Falha ao zerar.');
                            }
                        } finally {
                            setLoading(false);
                        }
                };

                if (Platform.OS === 'web') {
                    if (window.confirm('Zerar Cardápio: Isso vai desativar TODOS os itens do banco de dados. Tem certeza?')) {
                        runReset();
                    }
                } else {
                    Alert.alert('Zerar Cardápio', 'Isso vai desativar TODOS os itens do banco de dados. Tem certeza?', [
                        { text: 'Cancelar' },
                        { text: 'SIM, ZERAR TUDO', onPress: runReset }
                    ]);
                }
            }}
         >
            <Text style={{fontWeight: 'bold', fontSize: 10}}>ZERAR (WEB FIX)</Text>
         </TouchableOpacity>
      </View>

      <View style={styles.content}>
          <View style={styles.topActions}>
              <View style={{flexDirection: 'row', gap: 10}}>
                <ActivityIndicator style={{display: loading ? 'flex' : 'none'}} />
                <ActivityIndicator style={{display: 'none'}} />
              </View>
              <View style={{flexDirection: 'row', gap: 10}}>
                   <Text style={styles.link} onPress={() => setShowSettings(true)}>⚙️ Configurações</Text>
                   <Text style={[styles.link, {color: '#8B2F2F', fontWeight: 'bold'}]} onPress={() => { setEditingProduct(null); setShowProductForm(true); }}>+ Novo Produto</Text>
              </View>
          </View>
          
          <ProductList
             products={products}
             categories={categories}
             isLoading={loading}
             onEdit={handleEdit}
             onDelete={handleDelete}
             onManageStock={handleManageStock}
             onToggleStatus={handleToggleStatus}
          />
      </View>

      {/* MODALS */}
      <ProductForm 
         visible={showProductForm} 
         onClose={() => setShowProductForm(false)} 
         onSave={handleSaveProduct}
         initialData={editingProduct}
         categories={categories}
         pizzaConfig={pizzaConfig}
         isLoading={loading}
         onOpenStock={handleManageStock}
         variationNames={espetinhoVariations}
      />
      
      <VariationManager
         visible={showVariations} 
         onClose={() => setShowVariations(false)}
         variations={selectedVariations}
         onSaveVariation={handleSaveVariation}
         onOpenStock={handleManageStock}
      />
      
      <StockManager
         visible={showStock}
         onClose={() => setShowStock(false)}
         product={stockProduct}
         stockItems={stockItems}
         onAddIngredient={handleStockAdd}
         onRemoveIngredient={handleStockRemove}
      />
      
      <MenuSettings
         visible={showSettings}
         onClose={() => setShowSettings(false)}
         pizzaConfig={pizzaConfig}
         caldosList={caldosList}
         onSaveListas={handleSaveSettings}
         onSavePizzaSizes={handleSavePizzaSizes}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F1E8' },
  header: { 
      backgroundColor: '#8B2F2F', paddingVertical: 15, paddingTop: Platform.OS === 'ios' ? 50 : 20, 
      alignItems: 'center', justifyContent: 'center', borderBottomLeftRadius: 20, borderBottomRightRadius: 20 
  },
  headerText: { color: '#FFF', fontSize: 20, fontWeight: 'bold' },
  content: { flex: 1, padding: 20 },
  topActions: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 },
  link: { fontSize: 16, color: '#666' }
});
