import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Modal, TextInput, Alert, ScrollView, ActivityIndicator, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { supabase } from '../config/SupabaseConfig';
import { useAuth } from '../context/AuthContext';

export default function ReservasScreen({ navigation: _navigation }: any) {
  const { user, logout } = useAuth();
  const [reservas, setReservas] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [filterStatus, setFilterStatus] = useState<string | null>(null); // null = Todos
  
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
      let query = supabase
        .from('agendamentos')
        .select('*')
        .eq('company_id', user.companyId)
        .order('data_hora_reserva', { ascending: true });
        
      if (filterStatus) {
        query = query.eq('status', filterStatus);
      }

      const { data, error } = await query;
        
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
  }, [filterStatus]);

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
        created_by: user?.uid || user?.id,
        status: 'pendente'
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
      
      Alert.alert('Sucesso', `Reserva atualizada para ${novoStatus}.`);
    } catch (error) {
      console.error('Erro ao atualizar status:', error);
      Alert.alert('Erro', 'Não foi possível atualizar a reserva.');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmada': return colors.success;
      case 'cancelada': return colors.danger;
      case 'concluida': return '#2196F3'; // Azul para finalizadas
      case 'pendente': default: return colors.warning;
    }
  };

  const renderFiltros = () => (
    <View style={styles.filtroContainer}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filtroScroll}>
        {['Todos', 'pendente', 'confirmada', 'concluida', 'cancelada'].map((status) => {
          const isSelected = (status === 'Todos' && !filterStatus) || filterStatus === status;
          return (
            <TouchableOpacity 
              key={status}
              style={[styles.filtroBtn, isSelected && styles.filtroBtnSelected]}
              onPress={() => setFilterStatus(status === 'Todos' ? null : status)}
            >
              <Text style={[styles.filtroBtnText, isSelected && styles.filtroBtnTextSelected]}>
                {status.charAt(0).toUpperCase() + status.slice(1)}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );

  const renderItem = ({ item }: { item: any }) => (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={styles.clientInfo}>
          <Text style={styles.clienteNome}>{item.nome_cliente}</Text>
          <Text style={styles.infoHighlight}>👥 {item.quantidade_pessoas} pessoas</Text>
        </View>
        <View style={[styles.badge, { backgroundColor: getStatusColor(item.status) }]}>
          <Text style={styles.badgeText}>{item.status.toUpperCase()}</Text>
        </View>
      </View>
      
      <View style={styles.cardBody}>
        <View style={styles.infoRow}>
          <Ionicons name="time-outline" size={18} color="#666" />
          <Text style={styles.info}> {new Date(item.data_hora_reserva).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}</Text>
        </View>
        
        {!!item.telefone_cliente && (
          <View style={styles.infoRow}>
            <Ionicons name="call-outline" size={18} color="#666" />
            <Text style={styles.info}> {item.telefone_cliente}</Text>
          </View>
        )}
        
        {!!item.observacoes && (
          <View style={styles.infoRow}>
            <Ionicons name="document-text-outline" size={18} color="#666" />
            <Text style={styles.info}> {item.observacoes}</Text>
          </View>
        )}
      </View>
      
      <View style={styles.actions}>
        {item.status === 'pendente' && (
          <TouchableOpacity style={[styles.btnAction, { backgroundColor: colors.success }]} onPress={() => alterarStatus(item.id, 'confirmada')}>
            <Ionicons name="checkmark-circle-outline" size={18} color="#FFF" style={styles.btnIcon} />
            <Text style={styles.btnActionText}>Confirmar</Text>
          </TouchableOpacity>
        )}
        {(item.status === 'confirmada' || item.status === 'pendente') && (
          <TouchableOpacity style={[styles.btnAction, { backgroundColor: colors.danger }]} onPress={() => alterarStatus(item.id, 'cancelada')}>
            <Ionicons name="close-circle-outline" size={18} color="#FFF" style={styles.btnIcon} />
            <Text style={styles.btnActionText}>Cancelar</Text>
          </TouchableOpacity>
        )}
        {item.status === 'confirmada' && (
           <TouchableOpacity style={[styles.btnAction, { backgroundColor: '#2196F3' }]} onPress={() => alterarStatus(item.id, 'concluida')}>
             <Ionicons name="log-in-outline" size={18} color="#FFF" style={styles.btnIcon} />
             <Text style={styles.btnActionText}>Check-in</Text>
         </TouchableOpacity>
        )}
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
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
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Ionicons name="calendar-outline" size={24} color="#FFF" style={{ marginRight: 8 }} />
            <Text style={styles.headerTitle}>Agendamentos & Reservas</Text>
          </View>
        </View>
        <View style={styles.headerRight}>
          <TouchableOpacity style={styles.logoutBtn} onPress={logout}>
            <Ionicons name="log-out-outline" size={24} color="#FFF" />
          </TouchableOpacity>
        </View>
      </View>

      {renderFiltros()}

      {loading ? (
        <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 50 }} />
      ) : (
        <FlatList
          data={reservas}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.listContainer}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="calendar-outline" size={64} color="#DDD" />
              <Text style={styles.empty}>Nenhuma reserva encontrada nesta visualização.</Text>
            </View>
          }
        />
      )}

      <TouchableOpacity style={styles.fab} onPress={() => { resetForm(); setModalVisible(true); }}>
        <Ionicons name="add" size={28} color="#FFF" />
      </TouchableOpacity>

      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <ScrollView contentContainerStyle={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Nova Reserva</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)} style={styles.closeBtn}>
                <Ionicons name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>
            
            <View style={styles.formGroup}>
              <Text style={styles.label}>Nome do Cliente *</Text>
              <TextInput style={styles.input} value={nome} onChangeText={setNome} placeholder="Ex: João Silva" placeholderTextColor="#aaa" />
            </View>
            
            <View style={styles.formGroup}>
              <Text style={styles.label}>Telefone (WhatsApp)</Text>
              <TextInput style={styles.input} value={telefone} onChangeText={setTelefone} placeholder="Ex: 5511999999999" keyboardType="phone-pad" placeholderTextColor="#aaa" />
              <Text style={styles.hintText}>O cliente será notificado das mudanças por este número</Text>
            </View>
            
            <View style={styles.formGroup}>
              <Text style={styles.label}>Data e Hora * (Ex: 2026-05-20T20:00)</Text>
              <TextInput style={styles.input} value={dataHora} onChangeText={setDataHora} placeholder="AAAA-MM-DDTHH:MM" placeholderTextColor="#aaa" />
            </View>
            
            <View style={styles.formGroup}>
              <Text style={styles.label}>Quantidade de Pessoas *</Text>
              <TextInput style={styles.input} value={pessoas} onChangeText={setPessoas} keyboardType="numeric" placeholderTextColor="#aaa" />
            </View>
            
            <View style={styles.formGroup}>
              <Text style={styles.label}>Observações (Opcional)</Text>
              <TextInput style={[styles.input, { height: 90, textAlignVertical: 'top' }]} value={observacoes} onChangeText={setObservacoes} multiline placeholder="Cadeira de bebê, aniversário, alergias, etc." placeholderTextColor="#aaa" />
            </View>

            <TouchableOpacity style={styles.btnSave} onPress={salvarReserva}>
              <Text style={styles.btnSaveText}>Confirmar e Salvar Reserva</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F5DC' },
  header: {
    paddingTop: Platform.OS === 'ios' ? 50 : 20, 
    paddingHorizontal: 20, 
    paddingBottom: 15,
    backgroundColor: '#8B2F2F',
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    zIndex: 10,
    ...Platform.select({
      web: { boxShadow: '0px 4px 15px rgba(0, 0, 0, 0.2)' as any },
      default: { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 15, elevation: 8 }
    }),
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
  headerRight: {
     flex: 1,
     alignItems: 'flex-end',
     justifyContent: 'center',
  },
  logoutBtn: {
    padding: 5,
  },
  headerTitle: { color: '#FFFFFF', fontSize: 20, fontWeight: 'bold', textAlign: 'center' },
  userInfoLabel: { color: 'rgba(255,255,255,0.7)', fontSize: 10 },
  userInfo: { color: '#B45309', fontSize: 12, fontWeight: '600' },
  // Filtros
  filtroContainer: { backgroundColor: '#FFF', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#EEE' },
  filtroScroll: { paddingHorizontal: 15, gap: 10 },
  filtroBtn: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: '#F0F0F0', borderWidth: 1, borderColor: '#E0E0E0' },
  filtroBtnSelected: { backgroundColor: colors.primary, borderColor: colors.primary },
  filtroBtnText: { color: '#666', fontWeight: '600', fontSize: 13 },
  filtroBtnTextSelected: { color: '#FFF' },
  
  listContainer: { padding: 15, paddingBottom: 100 },
  
  // Cards
  card: {
    backgroundColor: '#FFF', borderRadius: 12, padding: 16, marginBottom: 15,
    borderWidth: 1, borderColor: '#F0F0F0',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2,
    ...(Platform.OS === 'web' ? {
       maxWidth: 800, marginHorizontal: 'auto', width: '100%'
    } : {})
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12, borderBottomWidth: 1, borderBottomColor: '#F5F5F5', paddingBottom: 10 },
  clientInfo: { flex: 1 },
  clienteNome: { fontSize: 18, fontWeight: 'bold', color: '#2C3E50', marginBottom: 4 },
  infoHighlight: { fontSize: 14, fontWeight: '600', color: colors.primary },
  badge: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20 },
  badgeText: { color: '#FFF', fontSize: 11, fontWeight: 'bold', letterSpacing: 0.5 },
  
  cardBody: { marginBottom: 15 },
  infoRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  info: { fontSize: 14, color: '#555', marginLeft: 4 },
  
  actions: { flexDirection: 'row', gap: 10, justifyContent: 'flex-end', borderTopWidth: 1, borderTopColor: '#F5F5F5', paddingTop: 12 },
  btnAction: { flexDirection: 'row', paddingVertical: 10, paddingHorizontal: 16, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  btnIcon: { marginRight: 6 },
  btnActionText: { color: '#FFF', fontWeight: 'bold', fontSize: 14 },
  
  emptyContainer: { alignItems: 'center', justifyContent: 'center', marginTop: 80 },
  empty: { textAlign: 'center', marginTop: 15, color: '#999', fontSize: 16 },
  
  fab: {
    position: 'absolute', bottom: 30, right: 30, width: 60, height: 60,
    borderRadius: 30, backgroundColor: colors.primary, justifyContent: 'center', alignItems: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 5, elevation: 8,
  },
  
  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', padding: Platform.OS === 'web' ? 0 : 20, alignItems: 'center' },
  modalContent: { backgroundColor: '#FFF', borderRadius: 16, padding: 25, width: '100%', maxWidth: 500, ...(Platform.OS === 'web' ? { marginVertical: 'auto' } : { maxHeight: '90%' }) },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 25, borderBottomWidth: 1, borderBottomColor: '#EEE', paddingBottom: 15 },
  modalTitle: { fontSize: 22, fontWeight: 'bold', color: '#2C3E50' },
  closeBtn: { padding: 5 },
  
  formGroup: { marginBottom: 16 },
  label: { fontSize: 14, fontWeight: '600', color: '#34495E', marginBottom: 8 },
  input: { borderWidth: 1, borderColor: '#DCE1E6', borderRadius: 8, padding: 12, backgroundColor: '#F8F9FA', fontSize: 15, color: '#2C3E50' },
  hintText: { fontSize: 12, color: '#888', marginTop: 4 },
  
  btnSave: { backgroundColor: colors.primary, padding: 16, borderRadius: 10, alignItems: 'center', marginTop: 15, shadowColor: colors.primary, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.2, shadowRadius: 3, elevation: 3 },
  btnSaveText: { color: '#FFF', fontWeight: 'bold', fontSize: 16, letterSpacing: 0.5 }
});

