import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Alert, StyleSheet } from 'react-native';
import { collection, doc, getDoc, setDoc, deleteDoc, getDocs, updateDoc, addDoc } from 'firebase/firestore';
import { db } from '../config/firebaseConfig';

const novoCardapio = [
  // Espetinhos - R$ 12,00 cada
  { nome: 'Carne', preco: 12.00, categoria: 'espetinho', ativo: true },
  { nome: 'Frango', preco: 12.00, categoria: 'espetinho', ativo: true },
  { nome: 'Frango com Bacon', preco: 12.00, categoria: 'espetinho', ativo: true },
  { nome: 'Calabresa', preco: 12.00, categoria: 'espetinho', ativo: true },
  { nome: 'Coração', preco: 12.00, categoria: 'espetinho', ativo: true },
  { nome: 'Medalhão', preco: 12.00, categoria: 'espetinho', ativo: true },
  { nome: 'Salsichão', preco: 12.00, categoria: 'espetinho', ativo: true },
  { nome: 'Pão de Alho', preco: 12.00, categoria: 'espetinho', ativo: true },

  // Espetinhos Especiais
  { nome: 'Carneiro', preco: 15.00, categoria: 'espetinho', ativo: true },
  { nome: 'Cupim', preco: 18.00, categoria: 'espetinho', ativo: true },
  { nome: 'Picanha', preco: 20.00, categoria: 'espetinho', ativo: true },

  // Bebidas
  { nome: 'Refrigerante Lata', preco: 7.00, categoria: 'bebida', ativo: true },
  { nome: 'Refrigerante 1L', preco: 10.00, categoria: 'bebida', ativo: true },
  { nome: 'Água Mineral', preco: 4.00, categoria: 'bebida', ativo: true },
  { nome: 'Água com Gás', preco: 4.00, categoria: 'bebida', ativo: true },
  { nome: 'Suco', preco: 6.00, categoria: 'bebida', ativo: true }
];

export default function UpdateCardapioScreen() {
  const [loading, setLoading] = useState(false);

  const atualizarCardapio = async () => {
    setLoading(true);
    try {
      // 1. Limpar produtos existentes
      const produtosRef = collection(db, 'produtos');
      const snapshot = await getDocs(produtosRef);

      for (const docSnap of snapshot.docs) {
        await deleteDoc(doc(db, 'produtos', docSnap.id));
      }

      // 2. Adicionar novos produtos
      for (const produto of novoCardapio) {
        const docRef = doc(collection(db, 'produtos'));
        await setDoc(docRef, produto);
      }

      Alert.alert('Sucesso!', `Cardápio atualizado com ${novoCardapio.length} produtos`);
    } catch (error: any) {
      console.error('❌ Erro ao atualizar cardápio:', error);
      Alert.alert('Erro', 'Falha ao atualizar cardápio: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Atualizar Cardápio</Text>
      <Text style={styles.subtitle}>Espeto</Text>

      <View style={styles.info}>
        <Text style={styles.infoText}>Esta ação irá:</Text>
        <Text style={styles.infoItem}>• Remover todos os produtos antigos</Text>
        <Text style={styles.infoItem}>• Adicionar {novoCardapio.length} novos produtos</Text>
        <Text style={styles.infoItem}>• Atualizar preços conforme cardápio real</Text>
      </View>

      <TouchableOpacity
        style={[styles.button, loading && styles.buttonDisabled]}
        onPress={atualizarCardapio}
        disabled={loading}
      >
        <Text style={styles.buttonText}>
          {loading ? 'Atualizando...' : 'ATUALIZAR CARDÁPIO'}
        </Text>
      </TouchableOpacity>

      <View style={styles.preview}>
        <Text style={styles.previewTitle}>Produtos que serão adicionados:</Text>
        {novoCardapio.map((produto, index) => (
          <Text key={index} style={styles.previewItem}>
            {produto.nome} - R$ {produto.preco.toFixed(2)} ({produto.categoria})
          </Text>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#F5F1E8',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#8B2F2F',
    textAlign: 'center',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 30,
  },
  info: {
    backgroundColor: '#FFF',
    padding: 20,
    borderRadius: 10,
    marginBottom: 20,
  },
  infoText: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  infoItem: {
    fontSize: 14,
    marginBottom: 5,
    color: '#666',
  },
  button: {
    backgroundColor: '#8B2F2F',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
    marginBottom: 20,
  },
  buttonDisabled: {
    backgroundColor: '#ccc',
  },
  buttonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  preview: {
    backgroundColor: '#FFF',
    padding: 15,
    borderRadius: 10,
    maxHeight: 200,
  },
  previewTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  previewItem: {
    fontSize: 12,
    marginBottom: 3,
    color: '#666',
  },
});
