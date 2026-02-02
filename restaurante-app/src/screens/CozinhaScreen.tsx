import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
// @ts-ignore
import BackgroundPattern from '../components/BackgroundPattern';
// @ts-ignore
import OrderService from '../services/OrderService';
import { query, where, onSnapshot } from 'firebase/firestore';
// @ts-ignore
import { getCompanyCollection } from '../utils/firestoreUtils';
// @ts-ignore
import { getLocalDateKey } from '../utils/dateUtils';
import { confirmLogout } from '../utils/appUtils';

export default function CozinhaScreen() {
  const { user, logout } = useAuth();
  const [allOrders, setAllOrders] = useState<any[]>([]);

  useEffect(() => {
    // @ts-ignore
    if (!user?.companyId) return;
    const today = getLocalDateKey();
    const qPedidos = query(
      // @ts-ignore
      getCompanyCollection(user.companyId, 'pedidos'),
      where('dateKey', '==', today)
    );

    const unsubscribe = onSnapshot(qPedidos, (snapshot) => {
      const pedidos: any[] = [];
      snapshot.forEach(doc => {
        pedidos.push({ id: doc.id, ...doc.data() });
      });
      setAllOrders(pedidos);
    }, (error) => {
      console.error('Erro ao ouvir pedidos:', error);
    });

    return () => unsubscribe();
  }, [user]);

  // ✅ FILTRO SEGURO: Excluir pedidos de comandas canceladas usando comandaStatus do pedido
  const ordersRaw = allOrders.filter(order => {
    // Filtrar apenas pedidos em montagem
    if (order.status !== 'montagem') return false;
    
    // ✅ PROTEÇÃO: Se o pedido tem comandaStatus='cancelada', não mostrar
    if (order.comandaStatus === 'cancelada') {
      console.log('[Cozinha] 🚫 Pedido filtrado (comanda cancelada):', order.id);
      return false;
    }
    
    return true;
  });


  const seenItemIds = new Set();

  const allValidItems: any[] = [];

  ordersRaw.forEach(order => {
    if (!order.itemsWithStatus || order.itemsWithStatus.length === 0) return;

    order.itemsWithStatus.forEach((item: any) => {
      // Filtragem dinâmica:
      // 1. Se tiver categoria, checa se é de cozinha
      // 2. Fallback: Se não tiver categoria (legacy), checa nome usando OrderService
      const isKitchenItem = item.category
        ? OrderService.isKitchenCategory(item.category)
        : OrderService.extractBebidas([item.name]).length === 0;

      if (item.status !== 'pronto' && !item.checked && !seenItemIds.has(item.id) && isKitchenItem) {
        seenItemIds.add(item.id);
        allValidItems.push({
          ...item,
          comandaNumber: order.comandaNumber,
          mesa: order.mesa // ✅ Propagar mesa
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
      grupos[caldo.nome].comandas.push({
        numero: caldo.comanda,
        mesa: caldo.mesa,
        quantidade: caldo.quantidade
      });
    });
    return Object.values(grupos).sort((a: any, b: any) => a.nome.localeCompare(b.nome));
  };

  // @ts-ignore
  const grupos: any[] = agruparPorTipo();

  return (
    <View style={styles.container}>
      <BackgroundPattern />

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
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Ionicons name="restaurant-outline" size={24} color="#FFF" />
            <Text style={styles.headerTitle}>Cozinha</Text>
          </View>
        </View>
        <TouchableOpacity style={styles.logoutBtn} onPress={() => confirmLogout(logout)}>
          <Ionicons name="log-out-outline" size={24} color="#FFF" />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content}>
        {grupos.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>🍲</Text>
            <Text style={styles.emptyText}>Nenhum pedido na cozinha</Text>
            <Text style={styles.emptySubtext}>Os pedidos aparecerão aqui automaticamente</Text>
          </View>
        ) : (
          <View style={styles.listContainer}>
            <Text style={styles.resumoTitle}>📋 Resumo de Pedidos</Text>
            {grupos.map((grupo, idx) => (
              <View key={idx} style={styles.grupoCard}>
                <View style={styles.grupoHeader}>
                  <Text style={styles.grupoNome}>{grupo.nome}</Text>
                  <View style={styles.totalBadge}>
                    <Text style={styles.totalText}>{grupo.total}x</Text>
                  </View>
                </View>
                <View style={styles.comandasList}>
                  {grupo.comandas.map((cmd: any, i: number) => (
                    <View key={i} style={styles.comandaItem}>
                      <Text style={styles.comandaNumero}>#{cmd.numero}</Text>
                      {cmd.mesa ? <Text style={styles.comandaNumero}> (Mesa {cmd.mesa})</Text> : null}
                      <Text style={styles.comandaQtd}>{cmd.quantidade}x</Text>
                    </View>
                  ))}
                </View>
              </View>
            ))}
          </View>
        )}
      </ScrollView>

      <StatusBar style="dark" />
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
    color: '#E5B84A', // Using the gold color found in other files or just keeping similar tone
    fontWeight: '600',
  },
  logoutBtn: {
    flex: 1,
    alignItems: 'flex-end',
    justifyContent: 'center',
    padding: 5,
  },
  content: {
    flex: 1,
    padding: 20,
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
  listContainer: {
    paddingBottom: 20,
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
});
