/**
 * ExtrasConfigScreen - Pizza Extras Configuration
 * 
 * Allows administrators to configure pizza extras:
 * - Borda Recheada (Stuffed Crust) options
 * - Adicionais (Additional Toppings) options
 * 
 * Requirements: 11.1, 11.2, 11.3, 11.4, 11.5, 11.6
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Modal,
  TextInput,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../config/SupabaseConfig';
import { Extra, ExtraType } from '../types/models';
import BackgroundPattern from '../components/BackgroundPattern';

interface ExtrasConfigScreenProps {
  onClose: () => void;
}

export default function ExtrasConfigScreen({ onClose }: ExtrasConfigScreenProps) {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'borda' | 'adicional'>('borda');
  const [bordas, setBordas] = useState<Extra[]>([]);
  const [adicionais, setAdicionais] = useState<Extra[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingExtra, setEditingExtra] = useState<Extra | null>(null);

  // Form state
  const [formName, setFormName] = useState('');
  const [formPrice, setFormPrice] = useState('');

  useEffect(() => {
    loadExtras();
  }, []);

  const loadExtras = async () => {
    if (!user?.companyId) return;

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('pizza_extras')
        .select('*')
        .eq('company_id', user.companyId)
        .eq('active', true)
        .order('name', { ascending: true });

      if (error) throw error;

      const extras = (data || []).map(item => ({
        id: item.id,
        companyId: item.company_id,
        type: item.type as ExtraType,
        name: item.name,
        price: item.price,
        active: item.active,
        createdAt: new Date(item.created_at),
        updatedAt: item.updated_at ? new Date(item.updated_at) : undefined,
      }));

      setBordas(extras.filter(e => e.type === 'borda'));
      setAdicionais(extras.filter(e => e.type === 'adicional'));
    } catch (error) {
      console.error('Error loading extras:', error);
      Alert.alert('Erro', 'Falha ao carregar extras');
    } finally {
      setLoading(false);
    }
  };

  const openAddModal = (type: ExtraType) => {
    setActiveTab(type);
    setEditingExtra(null);
    setFormName('');
    setFormPrice(type === 'borda' ? '7.00' : '5.00'); // Default prices
    setShowAddModal(true);
  };

  const openEditModal = (extra: Extra) => {
    setEditingExtra(extra);
    setFormName(extra.name);
    setFormPrice(extra.price.toFixed(2));
    setShowAddModal(true);
  };

  const closeModal = () => {
    setShowAddModal(false);
    setEditingExtra(null);
    setFormName('');
    setFormPrice('');
  };

  const validateForm = (): boolean => {
    if (!formName.trim()) {
      Alert.alert('Erro', 'Digite o nome do extra');
      return false;
    }

    const price = parseFloat(formPrice);
    if (isNaN(price) || price <= 0) {
      Alert.alert('Erro', 'Digite um preço válido');
      return false;
    }

    return true;
  };

  const saveExtra = async () => {
    if (!validateForm() || !user?.companyId) return;

    try {
      const price = parseFloat(formPrice);
      const type = editingExtra?.type || activeTab;

      if (editingExtra) {
        // Update existing extra
        const { error } = await supabase
          .from('pizza_extras')
          .update({
            name: formName.trim(),
            price: price,
            updated_at: new Date().toISOString(),
          })
          .eq('id', editingExtra.id);

        if (error) throw error;
        Alert.alert('Sucesso', 'Extra atualizado com sucesso');
      } else {
        // Create new extra
        const { error } = await supabase
          .from('pizza_extras')
          .insert({
            company_id: user.companyId,
            type: type,
            name: formName.trim(),
            price: price,
            active: true,
            created_at: new Date().toISOString(),
          });

        if (error) throw error;
        Alert.alert('Sucesso', 'Extra criado com sucesso');
      }

      closeModal();
      loadExtras();
    } catch (error) {
      console.error('Error saving extra:', error);
      Alert.alert('Erro', 'Falha ao salvar extra');
    }
  };

  const deleteExtra = async (extra: Extra) => {
    Alert.alert(
      'Confirmar Exclusão',
      `Deseja realmente excluir "${extra.name}"?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Excluir',
          style: 'destructive',
          onPress: async () => {
            try {
              // Soft delete by setting active = false
              const { error } = await supabase
                .from('pizza_extras')
                .update({ active: false, updated_at: new Date().toISOString() })
                .eq('id', extra.id);

              if (error) throw error;
              Alert.alert('Sucesso', 'Extra excluído com sucesso');
              loadExtras();
            } catch (error) {
              console.error('Error deleting extra:', error);
              Alert.alert('Erro', 'Falha ao excluir extra');
            }
          },
        },
      ]
    );
  };

  const renderExtraItem = (extra: Extra) => (
    <View key={extra.id} style={styles.extraItem}>
      <View style={styles.extraInfo}>
        <Text style={styles.extraName}>{extra.name}</Text>
        <Text style={styles.extraPrice}>R$ {extra.price.toFixed(2).replace('.', ',')}</Text>
      </View>
      <View style={styles.extraActions}>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => openEditModal(extra)}
        >
          <Ionicons name="pencil" size={20} color="#8B2F2F" />
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => deleteExtra(extra)}
        >
          <Ionicons name="trash" size={20} color="#D32F2F" />
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <BackgroundPattern />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={onClose} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#FFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Configurar Extras</Text>
        <View style={styles.headerRight} />
      </View>

      {/* Tabs */}
      <View style={styles.tabs}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'borda' && styles.tabActive]}
          onPress={() => setActiveTab('borda')}
        >
          <Text style={[styles.tabText, activeTab === 'borda' && styles.tabTextActive]}>
            Bordas Recheadas
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'adicional' && styles.tabActive]}
          onPress={() => setActiveTab('adicional')}
        >
          <Text style={[styles.tabText, activeTab === 'adicional' && styles.tabTextActive]}>
            Adicionais
          </Text>
        </TouchableOpacity>
      </View>

      {/* Content */}
      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#8B2F2F" />
            <Text style={styles.loadingText}>Carregando extras...</Text>
          </View>
        ) : (
          <>
            {activeTab === 'borda' && (
              <>
                {bordas.length === 0 ? (
                  <View style={styles.emptyContainer}>
                    <Text style={styles.emptyText}>Nenhuma borda recheada cadastrada</Text>
                    <Text style={styles.emptySubtext}>
                      Adicione opções de bordas recheadas para seus clientes
                    </Text>
                  </View>
                ) : (
                  bordas.map(renderExtraItem)
                )}
              </>
            )}

            {activeTab === 'adicional' && (
              <>
                {adicionais.length === 0 ? (
                  <View style={styles.emptyContainer}>
                    <Text style={styles.emptyText}>Nenhum adicional cadastrado</Text>
                    <Text style={styles.emptySubtext}>
                      Adicione opções de ingredientes extras para seus clientes
                    </Text>
                  </View>
                ) : (
                  adicionais.map(renderExtraItem)
                )}
              </>
            )}
          </>
        )}
      </ScrollView>

      {/* Add Button */}
      <TouchableOpacity
        style={styles.addButton}
        onPress={() => openAddModal(activeTab)}
      >
        <Ionicons name="add" size={24} color="#FFF" />
        <Text style={styles.addButtonText}>
          Adicionar {activeTab === 'borda' ? 'Borda' : 'Adicional'}
        </Text>
      </TouchableOpacity>

      {/* Add/Edit Modal */}
      <Modal
        visible={showAddModal}
        animationType="slide"
        transparent={true}
        onRequestClose={closeModal}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {editingExtra ? 'Editar' : 'Adicionar'}{' '}
                {(editingExtra?.type || activeTab) === 'borda' ? 'Borda' : 'Adicional'}
              </Text>
              <TouchableOpacity onPress={closeModal}>
                <Ionicons name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>

            <View style={styles.modalContent}>
              <Text style={styles.label}>Nome</Text>
              <TextInput
                style={styles.input}
                value={formName}
                onChangeText={setFormName}
                placeholder="Ex: Catupiry, Cheddar, Bacon..."
                placeholderTextColor="#999"
              />

              <Text style={styles.label}>Preço (R$)</Text>
              <TextInput
                style={styles.input}
                value={formPrice}
                onChangeText={setFormPrice}
                placeholder="0.00"
                placeholderTextColor="#999"
                keyboardType="decimal-pad"
              />

              <View style={styles.modalActions}>
                <TouchableOpacity
                  style={[styles.modalButton, styles.cancelButton]}
                  onPress={closeModal}
                >
                  <Text style={styles.cancelButtonText}>Cancelar</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modalButton, styles.saveButton]}
                  onPress={saveExtra}
                >
                  <Text style={styles.saveButtonText}>Salvar</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F1E8',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#8B2F2F',
    paddingHorizontal: 16,
    paddingVertical: 16,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFF',
  },
  headerRight: {
    width: 40,
  },
  tabs: {
    flexDirection: 'row',
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E0D8C8',
  },
  tab: {
    flex: 1,
    paddingVertical: 16,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabActive: {
    borderBottomColor: '#8B2F2F',
  },
  tabText: {
    fontSize: 16,
    color: '#666',
  },
  tabTextActive: {
    color: '#8B2F2F',
    fontWeight: 'bold',
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 100,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#666',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#666',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
  },
  extraItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FFF',
    padding: 16,
    borderRadius: 8,
    marginBottom: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1.41,
  },
  extraInfo: {
    flex: 1,
  },
  extraName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  extraPrice: {
    fontSize: 14,
    color: '#8B2F2F',
    fontWeight: '600',
  },
  extraActions: {
    flexDirection: 'row',
    gap: 12,
  },
  actionButton: {
    padding: 8,
  },
  addButton: {
    position: 'absolute',
    bottom: 20,
    left: 20,
    right: 20,
    backgroundColor: '#8B2F2F',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 8,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  addButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    width: '90%',
    maxWidth: 400,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E0D8C8',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  modalContent: {
    padding: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#F5F1E8',
    borderWidth: 1,
    borderColor: '#E0D8C8',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#333',
    marginBottom: 16,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#E0D8C8',
  },
  cancelButtonText: {
    color: '#666',
    fontSize: 16,
    fontWeight: '600',
  },
  saveButton: {
    backgroundColor: '#8B2F2F',
  },
  saveButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
