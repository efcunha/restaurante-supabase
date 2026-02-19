import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../config/SupabaseConfig';

export default function DebugAuth() {
  const [debugInfo, setDebugInfo] = useState('');

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        const asyncData = await AsyncStorage.getAllKeys();
        
        const info = `
Supabase User: ${user ? 'EXISTE' : 'NULL'}
UID: ${user?.id || 'N/A'}
Email: ${user?.email || 'N/A'}
AsyncStorage Keys: ${asyncData.length}
Keys: ${asyncData.join(', ')}
        `;
        
        setDebugInfo(info);
      } catch (error) {
        setDebugInfo(`Erro: ${error.message}`);
      }
    };

    checkAuth();
  }, []);

  const forceLogout = async () => {
    try {
      await supabase.auth.signOut();
      await AsyncStorage.clear();
      Alert.alert('Sucesso', 'Logout forçado realizado');
    } catch (error) {
      Alert.alert('Erro', error.message);
    }
  };

  return (
    <View style={{ flex: 1, padding: 20, backgroundColor: 'white' }}>
      <Text style={{ fontSize: 16, marginBottom: 20 }}>DEBUG AUTH</Text>
      <Text style={{ fontSize: 12, marginBottom: 20 }}>{debugInfo}</Text>
      <TouchableOpacity 
        onPress={forceLogout}
        style={{ backgroundColor: 'red', padding: 15, borderRadius: 5 }}
      >
        <Text style={{ color: 'white', textAlign: 'center' }}>FORÇAR LOGOUT</Text>
      </TouchableOpacity>
    </View>
  );
}
