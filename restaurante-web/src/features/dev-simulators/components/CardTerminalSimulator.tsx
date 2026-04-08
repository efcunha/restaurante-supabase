import React, { useState, useCallback } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import type { CardTransaction, CardPaymentMethod, CardPaymentResult } from '../types';

const DECLINE_REASONS = [
  'saldo insuficiente',
  'cartão bloqueado',
  'senha incorreta',
  'limite excedido',
];

function genNSU(): string {
  return String(Math.floor(Math.random() * 900000 + 100000));
}

function formatTimestamp(d: Date): string {
  return d.toTimeString().slice(0, 8);
}

interface Props {
  onTransaction?: (tx: CardTransaction) => void;
}

export default function CardTerminalSimulator({ onTransaction }: Props) {
  const [amount, setAmount] = useState('R$ 42,50');
  const [method, setMethod] = useState<CardPaymentMethod>('Crédito');
  const [log, setLog] = useState<CardTransaction[]>([]);
  const [lastResult, setLastResult] = useState<CardPaymentResult | null>(null);

  const methods: CardPaymentMethod[] = ['Crédito', 'Débito', 'PIX'];

  const counts = {
    approved: log.filter(t => t.result === 'approved').length,
    declined: log.filter(t => t.result === 'declined').length,
    timeout: log.filter(t => t.result === 'timeout').length,
  };

  const simulate = useCallback((result: CardPaymentResult) => {
    const tx: CardTransaction = {
      id: String(Date.now()),
      timestamp: new Date(),
      method,
      amount,
      result,
      nsu: result === 'approved' ? genNSU() : undefined,
      reason:
        result === 'declined'
          ? DECLINE_REASONS[Math.floor(Math.random() * DECLINE_REASONS.length)]
          : result === 'timeout'
          ? 'sem resposta da operadora após 30s'
          : undefined,
    };
    setLog(prev => [...prev, tx]);
    setLastResult(result);
    onTransaction?.(tx);
    setTimeout(() => setLastResult(null), 2500);
  }, [amount, method, onTransaction]);

  const statusColor = lastResult === 'approved' ? '#3B6D11'
    : lastResult === 'declined' ? '#A32D2D'
    : lastResult === 'timeout' ? '#854F0B'
    : '#888780';

  const statusLabel = lastResult === 'approved' ? 'APROVADO'
    : lastResult === 'declined' ? 'RECUSADO'
    : lastResult === 'timeout' ? 'TIMEOUT'
    : 'aguardando';

  return (
    <View style={styles.panel}>
      <View style={styles.panelHeader}>
        <View style={[styles.dot, { backgroundColor: lastResult === 'declined' || lastResult === 'timeout' ? '#E24B4A' : '#639922' }]} />
        <Text style={styles.panelTitle}>Maquininha de cartão</Text>
        <View style={[styles.badge, { backgroundColor: lastResult === 'approved' ? '#EAF3DE' : lastResult ? '#FCEBEB' : '#F1EFE8' }]}>
          <Text style={[styles.badgeText, { color: statusColor }]}>{statusLabel}</Text>
        </View>
      </View>

      <View style={styles.metricRow}>
        {[
          { label: 'aprovadas', value: counts.approved, color: '#3B6D11' },
          { label: 'recusadas', value: counts.declined, color: '#A32D2D' },
          { label: 'timeouts', value: counts.timeout, color: '#854F0B' },
        ].map(m => (
          <View key={m.label} style={styles.metric}>
            <Text style={styles.metricLabel}>{m.label}</Text>
            <Text style={[styles.metricValue, { color: m.color }]}>{m.value}</Text>
          </View>
        ))}
      </View>

      <View style={styles.inputRow}>
        <TextInput
          style={styles.input}
          value={amount}
          onChangeText={setAmount}
          placeholder="R$ 0,00"
        />
        <View style={styles.methodRow}>
          {methods.map(m => (
            <TouchableOpacity
              key={m}
              style={[styles.methodBtn, method === m && styles.methodBtnActive]}
              onPress={() => setMethod(m)}
            >
              <Text style={[styles.methodBtnText, method === m && styles.methodBtnTextActive]}>{m}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <View style={styles.btnRow}>
        <TouchableOpacity style={[styles.btn, styles.btnSuccess]} onPress={() => simulate('approved')}>
          <Text style={[styles.btnText, { color: '#27500A' }]}>✓ Aprovar</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.btn, styles.btnDanger]} onPress={() => simulate('declined')}>
          <Text style={[styles.btnText, { color: '#791F1F' }]}>✕ Recusar</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.btn, styles.btnWarn]} onPress={() => simulate('timeout')}>
          <Text style={[styles.btnText, { color: '#633806' }]}>⏱ Timeout</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.logTitle}>log de transações</Text>
      <ScrollView style={styles.log} contentContainerStyle={{ gap: 4 }}>
        {log.length === 0 && (
          <Text style={styles.logInfo}>Simulador pronto.</Text>
        )}
        {[...log].reverse().map(tx => {
          const color = tx.result === 'approved' ? '#3B6D11' : tx.result === 'declined' ? '#A32D2D' : '#854F0B';
          const label = tx.result === 'approved'
            ? `[${tx.method}] ${tx.amount} → APROVADO | NSU:${tx.nsu}`
            : tx.result === 'declined'
            ? `[${tx.method}] ${tx.amount} → RECUSADO — ${tx.reason}`
            : `[${tx.method}] ${tx.amount} → TIMEOUT — ${tx.reason}`;
          return (
            <View key={tx.id} style={styles.logEntry}>
              <Text style={styles.logTime}>{formatTimestamp(tx.timestamp)}</Text>
              <Text style={[styles.logMsg, { color }]}>{label}</Text>
            </View>
          );
        })}
      </ScrollView>

      <TouchableOpacity onPress={() => setLog([])}>
        <Text style={styles.clearBtn}>limpar log</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  panel: { backgroundColor: '#fff', borderRadius: 12, borderWidth: 0.5, borderColor: 'rgba(0,0,0,0.12)', padding: 16, marginBottom: 16 },
  panelHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  panelTitle: { fontSize: 13, fontWeight: '500', color: '#444', flex: 1 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  badge: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 8 },
  badgeText: { fontSize: 11, fontWeight: '500' },
  metricRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  metric: { flex: 1, backgroundColor: '#F5F5F0', borderRadius: 8, padding: 10 },
  metricLabel: { fontSize: 11, color: '#888', marginBottom: 2 },
  metricValue: { fontSize: 20, fontWeight: '500' },
  inputRow: { marginBottom: 10, gap: 8 },
  input: { borderWidth: 0.5, borderColor: 'rgba(0,0,0,0.2)', borderRadius: 8, padding: 8, fontSize: 14, fontFamily: 'monospace', backgroundColor: '#F9F9F7' },
  methodRow: { flexDirection: 'row', gap: 6 },
  methodBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, borderWidth: 0.5, borderColor: 'rgba(0,0,0,0.15)' },
  methodBtnActive: { backgroundColor: '#E6F1FB', borderColor: '#185FA5' },
  methodBtnText: { fontSize: 13, color: '#555' },
  methodBtnTextActive: { color: '#0C447C', fontWeight: '500' },
  btnRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  btn: { flex: 1, paddingVertical: 8, borderRadius: 8, borderWidth: 0.5, alignItems: 'center' },
  btnSuccess: { borderColor: '#3B6D11', backgroundColor: '#EAF3DE' },
  btnDanger: { borderColor: '#A32D2D', backgroundColor: '#FCEBEB' },
  btnWarn: { borderColor: '#854F0B', backgroundColor: '#FAEEDA' },
  btnText: { fontSize: 13, fontWeight: '500' },
  logTitle: { fontSize: 11, color: '#888', marginBottom: 6 },
  log: { backgroundColor: '#F5F5F0', borderRadius: 8, padding: 10, maxHeight: 160 },
  logEntry: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  logTime: { fontSize: 11, color: '#aaa', fontFamily: 'monospace' },
  logMsg: { fontSize: 11, fontFamily: 'monospace', flex: 1 },
  logInfo: { fontSize: 11, color: '#185FA5', fontFamily: 'monospace' },
  clearBtn: { fontSize: 12, color: '#888', textAlign: 'right', marginTop: 8 },
});
