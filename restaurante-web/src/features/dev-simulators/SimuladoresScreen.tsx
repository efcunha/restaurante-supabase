import React from 'react';
import { ScrollView, View, Text, StyleSheet, Platform } from 'react-native';
import CardTerminalSimulator from './components/CardTerminalSimulator';
import ScaleSimulator from './components/ScaleSimulator';
import type { CardTransaction } from './types';
import type { ScaleReading } from './types';

/**
 * SimuladoresScreen
 *
 * Rota: /dev/simuladores
 * Acesso: apenas quando EXPO_PUBLIC_FEATURE_DEV_SIMULATORS=true
 * Proteção: não registrar esta rota em produção (ver AppNavigator)
 *
 * Uso:
 *   navigation.navigate('DevSimuladores')
 */
export default function SimuladoresScreen() {
  function handleCardTransaction(tx: CardTransaction) {
    if (__DEV__) {
      console.log('[SIM:CARD]', tx);
    }
  }

  function handleScaleReading(reading: ScaleReading) {
    if (__DEV__) {
      console.log('[SIM:SCALE]', reading.toledoString.trim());
    }
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
    >
      <View style={styles.header}>
        <View style={styles.devBadge}>
          <Text style={styles.devBadgeText}>DEV ONLY</Text>
        </View>
        <Text style={styles.title}>Simuladores de Hardware</Text>
        <Text style={styles.subtitle}>
          Nenhuma transação real é gerada. Dados ficam apenas em memória.
        </Text>
      </View>

      <CardTerminalSimulator onTransaction={handleCardTransaction} />
      <ScaleSimulator onReading={handleScaleReading} />

      <Text style={styles.footer}>
        Para desativar esta rota, remova EXPO_PUBLIC_FEATURE_DEV_SIMULATORS do .env.local
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F0',
  },
  content: {
    padding: 16,
    paddingBottom: 40,
  },
  header: {
    marginBottom: 20,
  },
  devBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#FAEEDA',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
    marginBottom: 8,
  },
  devBadgeText: {
    fontSize: 11,
    fontWeight: '500',
    color: '#633806',
    letterSpacing: 0.5,
  },
  title: {
    fontSize: 20,
    fontWeight: '500',
    color: '#2C2C2A',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 13,
    color: '#888780',
    lineHeight: 18,
  },
  footer: {
    fontSize: 11,
    color: '#B4B2A9',
    textAlign: 'center',
    marginTop: 8,
  },
});
