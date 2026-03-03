import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Modal, TextInput, Alert, ScrollView, ActivityIndicator, KeyboardAvoidingView, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { supabase } from '../config/SupabaseConfig';
import { useAuth } from '../context/AuthContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { confirmLogout } from '../utils/appUtils';

export default function ReservasScreen() {
  const { user, logout } = useAuth();
  const [reservas, setReservas] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const insets = useSafeAreaInsets();
  const [modalVisible, setModalVisible] = useState(false);
  const [filtro, setFiltro] = useState('Todos');
  
  const STATUS_OPTIONS = ['Todos', 'Pendente', 'Confirmada', 'Concluida', 'Cancelada'];
  
  // Form State
  const [nome, setNome] = useState('');
  const [telefone, setTelefone] = useState('');
  const [dataHora, setDataHora] = useState('');
  const [pessoas, setPessoas] = useState('2');
  const [observacoes, setObservacoes] = useState('');

  const carregarReservas = async () => {
    if (!user?.companyId) return;
    
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('agendamentos')
        .select('*')
        .eq('company_id', user.companyId)
        .order('data_hora_reserva', { ascending: true });
        
      if (error) throw error;
      setReservas(data || []);
    } catch (error) {
      console.error('Erro ao carregar reservas:', error);
      Alert.alert('Erro', 'Não foi possível carregar as reservas.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    carregarReservas();
    
    if (!user?.companyId) return;

    // Subscribe to changes
    const channel = supabase
      .channel('agendamentos_changes')
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'agendamentos',
        filter: `company_id=eq.${user.companyId}`
      }, () => {
        carregarReservas();
      })
      .subscribe();
      
    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const salvarReserva = async () => {
    if (!nome || !dataHora || !pessoas) {
      Alert.alert('Atenção', 'Preencha nome, data/hora e quantidade de pessoas.');
      return;
    }
    
    try {
      const { error } = await supabase.from('agendamentos').insert({
        company_id: user?.companyId,
        nome_cliente: nome,
        telefone_cliente: telefone,
        data_hora_reserva: new Date(dataHora).toISOString(),
        quantidade_pessoas: parseInt(pessoas, 10),
        observacoes: observacoes,
        created_by: user?.uid || user?.id
      });
      
      if (error) throw error;
      
      Alert.alert('Sucesso', 'Reserva criada com sucesso!');
      setModalVisible(false);
      resetForm();
    } catch (error) {
      console.error('Erro ao salvar reserva:', error);
      Alert.alert('Erro', 'Verifique a data (formato AAAA-MM-DDTHH:MM) e tente novamente.');
    }
  };
  
  const resetForm = () => {
    setNome('');
    setTelefone('');
    // Propor uma data padrão
    const tzoffset = (new Date()).getTimezoneOffset() * 60000;
    const localISOTime = (new Date(Date.now() - tzoffset)).toISOString().slice(0, 16);
    setDataHora(localISOTime);
    setPessoas('2');
    setObservacoes('');
  };

  const alterarStatus = async (id: string, novoStatus: string) => {
    try {
      const { error } = await supabase
        .from('agendamentos')
        .update({ status: novoStatus })
        .eq('id', id);
        
      if (error) throw error;
    } catch (error) {
      console.error('Erro ao atualizar status:', error);
      Alert.alert('Erro', 'Não foi possível atualizar a reserva.');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmada': return colors.success;
      case 'cancelada': return colors.danger;
      case 'concluida': return '#2196F3';
      case 'pendente': default: return colors.warning;
    }
  };

  const renderItem = ({ item }: { item: any }) => (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <Text style={styles.clienteNome}>{item.nome_cliente}</Text>
        <View style={[styles.badge, { backgroundColor: getStatusColor(item.status) }]}>
          <Text style={styles.badgeText}>{item.status.toUpperCase()}</Text>
        </View>
      </View>
      
      <Text style={styles.info}>🕥 {new Date(item.data_hora_reserva).toLocaleString('pt-BR')}</Text>
      <Text style={styles.info}>👥 {item.quantidade_pessoas} pessoas</Text>
      {!!item.telefone_cliente && <Text style={styles.info}>📞 {item.telefone_cliente}</Text>}
      {!!item.observacoes && <Text style={styles.info}>📝 {item.observacoes}</Text>}
      
      <View style={styles.actions}>
        {item.status === 'pendente' && (
          <TouchableOpacity style={[styles.btnAction, { backgroundColor: colors.success }]} onPress={() => alterarStatus(item.id, 'confirmada')}>
            <Text style={styles.btnActionText}>Confirmar</Text>
          </TouchableOpacity>
        )}
        {(item.status === 'confirmada' || item.status === 'pendente') && (
          <TouchableOpacity style={[styles.btnAction, { backgroundColor: colors.danger }]} onPress={() => alterarStatus(item.id, 'cancelada')}>
            <Text style={styles.btnActionText}>Cancelar</Text>
          </TouchableOpacity>
        )}
        {item.status === 'confirmada' && (
           <TouchableOpacity style={[styles.btnAction, { backgroundColor: '#2196F3' }]} onPress={() => alterarStatus(item.id, 'concluida')}>
           <Text style={styles.btnActionText}>Check-in</Text>
         </TouchableOpacity>
        )}
      </View>
    </View>
  );

  const reservasFiltradas = reservas.filter(
    (r) => filtro === 'Todos' || (r.status || '').toLowerCase() === filtro.toLowerCase()
  );

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: Math.max(insets.top, 20) }]}>
        <View style={styles.headerLeft}>
          {user && (
            <View>
              <Text style={styles.userInfoLabel}>Olá,</Text>
              <Text style={styles.userInfo}>{user.nome || user.email}</Text>
            </View>
          )}
        </View>
        <View style={styles.headerCenter}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Ionicons name="calendar-outline" size={24} color="#FFF" style={{ marginRight: 8 }} />
            <Text style={styles.headerTitle}>Reservas</Text>
          </View>
        </View>
        <TouchableOpacity style={styles.logoutBtn} onPress={() => confirmLogout(logout)}>
          <Ionicons name="log-out-outline" size={24} color="#FFF" />
        </TouchableOpacity>
      </View>

      <View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterContainer}>
          {STATUS_OPTIONS.map((status) => (
            <TouchableOpacity 
              key={status} 
              style={[styles.filterButton, filtro === status && styles.filterButtonActive]}
              onPress={() => setFiltro(status)}
            >
              <Text style={[styles.filterText, filtro === status && styles.filterTextActive]}>
                {status}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 50 }} />
      ) : (
        <FlatList
          data={reservasFiltradas}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={{ padding: 20, paddingBottom: 100 }}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Text style={styles.emptyIcon}>📅</Text>
              <Text style={styles.emptyText}>Nenhuma reserva</Text>
              <Text style={styles.emptySubtext}>As reservas aparecerão aqui automaticamente</Text>
            </View>
          }
        />
      )}

      <TouchableOpacity style={styles.fab} onPress={() => { resetForm(); setModalVisible(true); }}>
        <Ionicons name="add" size={24} color="#FFF" />
      </TouchableOpacity>

      <Modal visible={modalVisible} animationType="slide" transparent>
        <KeyboardAvoidingView 
          style={styles.modalOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View style={styles.modalContainer}>
            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Nova Reserva</Text>
                <TouchableOpacity onPress={() => setModalVisible(false)}>
                  <Ionicons name="close" size={24} color="#333" />
                </TouchableOpacity>
              </View>
              
              <Text style={styles.label}>Nome do Cliente *</Text>
              <TextInput style={styles.input} value={nome} onChangeText={setNome} placeholder="Ex: João Silva" />
              
              <Text style={styles.label}>Telefone (WhatsApp)</Text>
              <TextInput style={styles.input} value={telefone} onChangeText={setTelefone} placeholder="Ex: 5511999999999" keyboardType="phone-pad" />
              
              <Text style={styles.label}>Data e Hora * (Ex: 2026-05-20T20:00)</Text>
              <TextInput style={styles.input} value={dataHora} onChangeText={setDataHora} placeholder="AAAA-MM-DDTHH:MM" />
              
              <Text style={styles.label}>Quantidade de Pessoas *</Text>
              <TextInput style={styles.input} value={pessoas} onChangeText={setPessoas} keyboardType="numeric" />
              
              <Text style={styles.label}>Observações</Text>
              <TextInput style={[styles.input, { height: 80 }]} value={observacoes} onChangeText={setObservacoes} multiline placeholder="Cadeira de bebê, aniversário, etc." />

              <TouchableOpacity style={styles.btnSave} onPress={salvarReserva}>
                <Text style={styles.btnSaveText}>Salvar Reserva</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F5DC' },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 15,
    backgroundColor: '#8B2F2F',
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 4.65,
    zIndex: 10,
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
    color: '#FFF',
    textAlign: 'center',
  },
  userInfoLabel: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 10,
  },
  userInfo: {
    fontSize: 12,
    color: '#E5B84A', // Using the gold color found in other files or just keeping similar tone
    fontWeight: '600',
  },
  logoutBtn: {
    flex: 1,
    alignItems: 'flex-end',
    justifyContent: 'center',
    padding: 5,
  },
  filterContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0'
  },
  filterButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#F5F5F5',
    marginRight: 10,
    borderWidth: 1,
    borderColor: '#E0E0E0'
  },
  filterButtonActive: {
    backgroundColor: '#8B2F2F',
    borderColor: '#8B2F2F'
  },
  filterText: {
    color: '#666',
    fontWeight: '600'
  },
  filterTextActive: {
    color: '#FFF'
  },
  card: {
    backgroundColor: '#FFF', borderRadius: 8, padding: 15, marginBottom: 15,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 2, elevation: 2,
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  clienteNome: { fontSize: 18, fontWeight: 'bold', color: '#333' },
  badge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12 },
  badgeText: { color: '#FFF', fontSize: 12, fontWeight: 'bold' },
  info: { fontSize: 14, color: '#666', marginBottom: 5 },
  actions: { flexDirection: 'row', marginTop: 15, gap: 10 },
  btnAction: { paddingVertical: 8, paddingHorizontal: 12, borderRadius: 6, flex: 1, alignItems: 'center' },
  btnActionText: { color: '#FFF', fontWeight: 'bold' },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
  },
  emptyIcon: {
    fontSize: 80,
    marginBottom: 20,
  },
  emptyText: {
    fontSize: 20,
    fontWeight: '600',
    color: '#8B2F2F',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#999',
  },
  fab: {
    position: 'absolute', bottom: 30, right: 30, width: 56, height: 56,
    borderRadius: 28, backgroundColor: colors.primary, justifyContent: 'center', alignItems: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 4, elevation: 8,
  },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 20 },
  modalContainer: { backgroundColor: '#FFF', borderRadius: 12, padding: 20, maxHeight: '80%', width: '100%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalTitle: { fontSize: 18, fontWeight: 'bold' },
  label: { fontSize: 14, fontWeight: '600', color: '#444', marginBottom: 5 },
  input: { borderWidth: 1, borderColor: '#DDD', borderRadius: 6, padding: 10, marginBottom: 15, backgroundColor: '#F9F9F9' },
  btnSave: { backgroundColor: colors.primary, padding: 15, borderRadius: 6, alignItems: 'center', marginTop: 10 },
  btnSaveText: { color: '#FFF', fontWeight: 'bold', fontSize: 16 }
});
