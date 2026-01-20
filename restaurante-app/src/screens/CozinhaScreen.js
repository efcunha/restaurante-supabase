import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { useState, useEffect } from 'react';
import { useOrders } from '../context/OrderContext.firestore';
import { useAuth } from '../context/AuthContext';
import BackgroundPattern from '../components/BackgroundPattern';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../config/firebaseConfig';
import { getLocalDateKey } from '../utils/dateUtils';
import { exitApp } from '../utils/appUtils';

export default function CozinhaScreen() {
  const { user, logout } = useAuth();
  const [allOrders, setAllOrders] = useState([]);
  
  useEffect(() => {
    const today = getLocalDateKey();
    const qPedidos = query(
      collection(db, 'pedidos'),
      where('dateKey', '==', today)
    );
    
    const unsubscribe = onSnapshot(qPedidos, (snapshot) => {
      const pedidos = [];
      snapshot.forEach(doc => {
        pedidos.push({ id: doc.id, ...doc.data() });
      });
      setAllOrders(pedidos);
    }, (error) => {
      console.error('Erro ao ouvir pedidos:', error);
    });
    
    return () => unsubscribe();
  }, []);
  
  const ordersRaw = allOrders.filter(order => order.status === 'montagem');
  
  const bebidas = ['refrigerante', 'refri', 'água', 'agua', 'suco', 'cerveja', 'coca', 'pepsi', 'guaraná', 'guarana', 'sprite'];
  const seenItemIds = new Set();
  
  const allValidItems = [];
  
  ordersRaw.forEach(order => {
    if (!order.itemsWithStatus || order.itemsWithStatus.length === 0) return;
    
    order.itemsWithStatus.forEach(item => {
      const isBebida = bebidas.some(bebida => item.name.toLowerCase().includes(bebida));
      if (item.status !== 'pronto' && !item.checked && !seenItemIds.has(item.id) && !isBebida) {
        seenItemIds.add(item.id);
        allValidItems.push({
          ...item,
          comandaNumber: order.comandaNumber
        });
      }
    });
  });

  const extrairQuantidade = (itemText) => {
    const match = itemText.match(/^(\d+)\s*x?\s*/);
    return match ? parseInt(match[1], 10) : 1;
  };

  const extrairNome = (itemText) => {
    return itemText.replace(/^\d+\s*x?\s*/, '').trim();
  };

  const caldosPendentes = allValidItems.map(item => ({
    id: item.id,
    nome: extrairNome(item.name),
    quantidade: extrairQuantidade(item.name),
    comanda: item.comandaNumber,
    nomeCompleto: item.name
  }));

  const agruparPorTipo = () => {
    const grupos = {};
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
        quantidade: caldo.quantidade
      });
    });
    return Object.values(grupos).sort((a, b) => a.nome.localeCompare(b.nome));
  };

  const grupos = agruparPorTipo();

  return (
    <View style={styles.container}>
      <BackgroundPattern />
      
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.headerTitle}>🍲 Cozinha</Text>
          {user && <Text style={styles.userInfo}>{user.nome || user.email}</Text>}
        </View>
        <TouchableOpacity style={styles.logoutBtn} onPress={exitApp}>
          <Text style={styles.logoutText}>Sair</Text>
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
                  {grupo.comandas.map((cmd, i) => (
                    <View key={i} style={styles.comandaItem}>
                      <Text style={styles.comandaNumero}>#{cmd.numero}</Text>
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
  },
  headerLeft: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFF',
  },
  userInfo: {
    fontSize: 12,
    color: '#FFD7A8',
    marginTop: 4,
  },
  logoutBtn: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  logoutText: {
    color: '#FFF',
    fontWeight: '600',
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
