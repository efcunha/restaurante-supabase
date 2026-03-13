import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, View, TouchableOpacity, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
// @ts-ignore

// @ts-ignore
import OrderService from '../services/OrderService';
import { supabase } from '../config/SupabaseConfig';
// @ts-ignore
import { getLocalDateKey } from '../utils/dateUtils';
import { confirmLogout } from '../utils/appUtils';
import OptimizedFlatList from '../components/OptimizedFlatList';

export default function CozinhaScreen() {
  const { user, logout } = useAuth();
  const [allOrders, setAllOrders] = useState<any[]>([]);

  useEffect(() => {
    // @ts-ignore
    if (!user?.companyId) return;
    const today = getLocalDateKey();

    // Initial fetch
    const fetchOrders = async () => {
      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .eq('company_id', user.companyId)
        .eq('date_key', today);

      if (!error && data) {
        // Map snake_case to camelCase
        const mappedOrders = data.map(order => ({
          ...order,
          itemsWithStatus: order.items_with_status || [],
          comandaNumber: order.comanda_number,
          mesa: (order.table_number && order.table_number !== 0) ? order.table_number.toString() : '',
          comandaStatus: order.comanda_status // ✅ Mapear comanda_status
        }));
        setAllOrders(mappedOrders);
      }
    };

    fetchOrders();

    // Subscribe to real-time changes
    const channel = supabase
      .channel(`orders-cozinha-${user.companyId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'orders',
          filter: `company_id=eq.${user.companyId}`
        },
        (payload) => {
          console.log('[Cozinha] 🔄 Recebeu atualização:', payload);
          fetchOrders();
        }
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [user]);

  const ordersRaw = allOrders.filter(order => {
    // Filtrar apenas pedidos em preparing
    if (order.status !== 'preparing') return false;
    
    // ✅ PROTEÇÃO: Se o pedido tem comandaStatus='cancelada', não mostrar
    if (order.comandaStatus === 'cancelada') {
      console.log('[Cozinha] 🚫 Pedido filtrado (comanda cancelada):', order.id);
      return false;
    }
    
    return true;
  });

  // DEBUG: Verificar nomes chegando na cozinha
  useEffect(() => {
    if (ordersRaw.length > 0) {
       // Log sampling to avoid spam
       const sample = ordersRaw.slice(0, 3);
       console.log(`[Cozinha] 🔍 Visualizando ${ordersRaw.length} pedidos. Amostra de itens:`);
       sample.forEach(o => {
          o.itemsWithStatus?.forEach((i: any) => {
             if (i.name.includes('+')) {
                 console.log(`  🍕 ITEM COM EXTRA: "${i.name}"`);
             }
          });
       });
    }
  }, [ordersRaw]);

  const seenItemIds = new Set();

  const allValidItems: any[] = [];

  ordersRaw.forEach(order => {
    if (!order.itemsWithStatus || order.itemsWithStatus.length === 0) return;

    order.itemsWithStatus.forEach((item: any) => {
      // Filtragem dinâmica:
      // 1. Se tiver categoria, checa se é de cozinha
      // 2. Fallback: Se não tiver categoria (legacy), checa nome usando OrderService
      const isKitchenItem = item.category
        ? OrderService.isKitchenCategory(item.category, item.name)
        : OrderService.extractBebidas([item.name]).length === 0;

      // ✅ CORREÇÃO: Verificar AMBOS status e checked
      const shouldShow = item.status !== 'pronto' && item.checked !== true && !seenItemIds.has(item.id) && isKitchenItem;

      if (shouldShow) {
        seenItemIds.add(item.id);
        allValidItems.push({
          ...item,
          comandaNumber: order.comandaNumber,
          mesa: order.mesa, // ✅ Propagar mesa
          observations: order.observations // ✅ Propagar observações do pedido
        });
      }
    });
  });

  const extrairQuantidade = (itemText: string) => {
    const match = itemText.match(/^(\d+)\s*x?\s*/);
    return match ? parseInt(match[1], 10) : 1;
  };

  const extrairNome = (itemText: string) => {
    return itemText.replace(/^\d+\s*x?\s*/, '').trim();
  };

  const caldosPendentes = allValidItems.map(item => ({
    id: item.id,
    nome: extrairNome(item.name),
    quantidade: extrairQuantidade(item.name),
    comanda: item.comandaNumber,
    mesa: item.mesa || '', // ✅ Mapear mesa
    observations: item.observations, // ✅ Mapear observações
    nomeCompleto: item.name
  }));

  const agruparPorTipo = () => {
    const grupos: any = {};
    caldosPendentes.forEach(caldo => {
      if (!grupos[caldo.nome]) {
        grupos[caldo.nome] = {
          nome: caldo.nome,
          total: 0,
          comandas: []
        };
      }
      grupos[caldo.nome].total += caldo.quantidade;
      
      // Agrupar tags por Mesa (se houver), senão por Número da Comanda
      const groupKey = caldo.mesa && caldo.mesa.trim() !== '' ? caldo.mesa : caldo.comanda;
      
      const existingEntry = grupos[caldo.nome].comandas.find((c: any) => 
        (caldo.mesa && caldo.mesa.trim() !== '' ? c.mesa === caldo.mesa : c.numero === caldo.comanda)
      );

      if (existingEntry) {
        existingEntry.quantidade += caldo.quantidade;
        if (caldo.observations && !existingEntry.observacoes?.includes(caldo.observations)) {
           existingEntry.observacoes = existingEntry.observacoes 
              ? `${existingEntry.observacoes} | ${caldo.observations}`
              : caldo.observations;
        }
        // Se entrou um novo número de comanda para a mesma mesa, registrar para referência
        const comandaStr = String(caldo.comanda);
        if (caldo.comanda && !String(existingEntry.allComandas || '').includes(comandaStr)) {
          existingEntry.allComandas = existingEntry.allComandas 
            ? `${existingEntry.allComandas}, ${comandaStr}` 
            : comandaStr;
        }
      } else {
        grupos[caldo.nome].comandas.push({
          id: `${caldo.nome}-${groupKey}`,
          numero: caldo.comanda,
          mesa: caldo.mesa,
          quantidade: caldo.quantidade,
          observacoes: caldo.observations,
          allComandas: String(caldo.comanda || '') // Sempre string para garantir .includes funcionará
        });
      }
    });

    // Option to sort comandas numerically inside each group
    Object.values(grupos).forEach((g: any) => {
       g.comandas.sort((a: any, b: any) => {
          const numA = parseInt(a.numero) || 0;
          const numB = parseInt(b.numero) || 0;
          return numA - numB;
       });
    });

    return Object.values(grupos).sort((a: any, b: any) => a.nome.localeCompare(b.nome));
  };

  // @ts-ignore
  const grupos: any[] = useMemo(() => agruparPorTipo(), [caldosPendentes]);

  const renderGrupoItem = useCallback(({ item: grupo }: { item: any }) => {
    // Parse Extras from Name: "Pizza ... + Borda: ..."
    const parts = grupo.nome.split(' + ');
    const mainName = parts[0];
    const extras = parts.length > 1 ? parts.slice(1).join(' + ') : null;

    return (
      <View style={styles.grupoCard}>
        <View style={styles.grupoHeader}>
          <View style={{ flex: 1, marginRight: 8 }}>
            <Text style={styles.grupoNome}>{mainName}</Text>
            {extras && (
              <Text style={styles.grupoExtras}>
                + {extras}
              </Text>
            )}
          </View>
          <View style={styles.totalBadge}>
            <Text style={styles.totalText}>{grupo.total}x</Text>
          </View>
        </View>
        <View style={styles.comandasList}>
          {grupo.comandas.map((cmd: any, i: number) => {
            const hasMesa = !!cmd.mesa && cmd.mesa.trim() !== '';
            const isMultiComanda = cmd.allComandas && String(cmd.allComandas).includes(',');
            
            return (
              <View key={i} style={styles.comandaItem}>
                <Text style={styles.comandaNumero}>
                  {hasMesa ? `Mesa ${cmd.mesa}` : `#${cmd.numero}`}
                </Text>
                
                {hasMesa && (
                  <Text style={[styles.comandaNumero, { fontSize: 12, opacity: 0.7 }]}>
                    {isMultiComanda ? ` (C: ${cmd.allComandas})` : ` (#${cmd.numero})`}
                  </Text>
                )}

                {!!cmd.observacoes && (
                  <Text style={styles.comandaObs}>
                    📝 {cmd.observacoes}
                  </Text>
                )}
                <Text style={styles.comandaQtd}>{cmd.quantidade}x</Text>
              </View>
            );
          })}
        </View>
      </View>
    );
  }, []);

  const keyExtractor = useCallback((item: any, index: number) => `${item.nome}-${index}`, []);

  const ListEmptyComponent = useCallback(() => (
    <View style={styles.emptyState}>
      <Text style={styles.emptyIcon}>🍲</Text>
      <Text style={styles.emptyText}>Nenhum pedido na cozinha</Text>
      <Text style={styles.emptySubtext}>Os pedidos aparecerão aqui automaticamente</Text>
    </View>
  ), []);

  const ListHeaderComponent = useCallback(() => (
    grupos.length > 0 ? <Text style={styles.resumoTitle}>📋 Resumo de Pedidos</Text> : <View />
  ), [grupos.length]);

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
            <Ionicons name="restaurant-outline" size={24} color="#FFF" style={{ marginRight: 8 }} />
            <Text style={styles.headerTitle}>Cozinha</Text>
          </View>
        </View>
        <TouchableOpacity style={styles.logoutBtn} onPress={() => confirmLogout(logout)}>
          <Ionicons name="log-out-outline" size={24} color="#FFF" />
        </TouchableOpacity>
      </View>

      <OptimizedFlatList
        data={grupos}
        renderItem={renderGrupoItem}
        keyExtractor={keyExtractor}
        ListEmptyComponent={ListEmptyComponent}
        ListHeaderComponent={ListHeaderComponent}
        contentContainerStyle={styles.listContainer}
        itemHeight={120}
        initialNumToRender={10}
        maxToRenderPerBatch={10}
        windowSize={5}
      />

      <StatusBar style="dark" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5DC',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 50,
    paddingBottom: 15,
    backgroundColor: '#8B2F2F',
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    elevation: 8,
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
    color: '#B45309', // Using the gold color found in other files or just keeping similar tone
    fontWeight: '600',
  },
  logoutBtn: {
    flex: 1,
    alignItems: 'flex-end',
    justifyContent: 'center',
    padding: 5,
  },
  listContainer: {
    padding: 20,
    paddingBottom: 20,
  },
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
  resumoTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#8B2F2F',
    marginBottom: 15,
  },
  grupoCard: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  grupoHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E0D8C8',
  },
  grupoNome: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    flex: 1,
  },
  totalBadge: {
    backgroundColor: '#8B2F2F',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  totalText: {
    color: '#FFF',
    fontWeight: 'bold',
    fontSize: 16,
  },
  grupoExtras: {
    fontSize: 14,
    color: '#D32F2F', // Red color for visibility
    fontWeight: 'bold',
    marginTop: 4,
    fontStyle: 'italic',
    backgroundColor: '#FFF5F5',
    padding: 4,
    borderRadius: 4,
    alignSelf: 'flex-start'
  },
  comandasList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  comandaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F1E8',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 6,
  },
  comandaNumero: {
    fontSize: 14,
    fontWeight: '600',
    color: '#8B2F2F',
  },
  comandaQtd: {
    fontSize: 14,
    color: '#666',
  },
  comandaObs: {
    fontSize: 12,
    color: '#E65100', // Orange for visibility
    fontStyle: 'italic',
    marginLeft: 4,
    flexShrink: 1 // Allow text to wrap if too long
  },
});
