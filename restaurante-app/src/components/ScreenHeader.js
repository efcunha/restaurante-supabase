import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useAuth } from '../context/AuthContext';

/**
 * Header compartilhado para todas as telas
 * Exibe nome do usuário logado e botão de sair
 */
export default function ScreenHeader({ title, onBack = null }) {
  const { user, logout } = useAuth();

  return (
    <View style={styles.header}>
      {onBack && (
        <TouchableOpacity onPress={onBack} style={styles.backBtn}>
          <Text style={styles.backBtnText}>← Voltar</Text>
        </TouchableOpacity>
      )}
      
      <View style={styles.headerCenter}>
        <Text style={styles.headerTitle}>{title}</Text>
        {user?.nome && (
          <Text style={styles.userInfo}>{user.nome}</Text>
        )}
      </View>
      
      <TouchableOpacity onPress={logout} style={styles.sairBtn}>
        <Text style={styles.sairBtnText}>Sair</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    backgroundColor: '#8B2F2F',
    paddingTop: 40,
    paddingBottom: 15,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  backBtn: {
    padding: 5,
  },
  backBtnText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: 'bold',
  },
  userInfo: {
    color: '#E5B84A',
    fontSize: 12,
    marginTop: 2,
    fontWeight: '600',
  },
  sairBtn: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 8,
  },
  sairBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
});
