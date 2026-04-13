import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, TextInput } from 'react-native';
import type { ScaleReading, ScaleStatus } from '../types';

type ScaleSimulatorSnapshot = {
  rawGrams: number;
  netGrams: number;
  tareGrams: number;
  status: ScaleStatus;
  toledoString: string;
  updatedAt: string;
};

type ScaleSimulatorApi = {
  getSnapshot: () => ScaleSimulatorSnapshot;
  applyTare: () => ScaleSimulatorSnapshot;
};

declare global {
  interface Window {
    __DEV_SCALE_SIMULATOR__?: ScaleSimulatorApi;
  }
}

function toToledo(grams: number): string {
  const kg = (grams / 1000).toFixed(3).padStart(7, ' ');
  return `P:${kg}kg\r\n`;
}

function formatTimestamp(d: Date): string {
  return d.toTimeString().slice(0, 8);
}

interface Props {
  onReading?: (reading: ScaleReading) => void;
}

export default function ScaleSimulator({ onReading }: Props) {
  const [rawGrams, setRawGrams] = useState(0);
  const [rawInput, setRawInput] = useState('0');
  const [tare, setTare] = useState(0);
  const [log, setLog] = useState<ScaleReading[]>([]);
  const [status, setStatus] = useState<ScaleStatus>('stable');
  const instabilidadeRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const rawGramsRef = useRef(0);
  const tareRef = useRef(0);
  const statusRef = useRef<ScaleStatus>('stable');

  const netGrams = Math.max(0, rawGrams - tare);

  const buildSnapshot = useCallback((currentRaw: number, currentTare: number, currentStatus: ScaleStatus): ScaleSimulatorSnapshot => {
    const currentNet = Math.max(0, currentRaw - currentTare);
    return {
      rawGrams: currentRaw,
      netGrams: currentNet,
      tareGrams: currentTare,
      status: currentStatus,
      toledoString: toToledo(currentNet),
      updatedAt: new Date().toISOString(),
    };
  }, []);

  const syncRefs = useCallback((currentRaw: number, currentTare: number, currentStatus: ScaleStatus) => {
    rawGramsRef.current = currentRaw;
    tareRef.current = currentTare;
    statusRef.current = currentStatus;
  }, []);

  function addReading(raw: number, currentTare: number, st: ScaleStatus) {
    const net = Math.max(0, raw - currentTare);
    syncRefs(raw, currentTare, st);
    const reading: ScaleReading = {
      timestamp: new Date(),
      rawGrams: raw,
      netGrams: net,
      tare: currentTare,
      status: st,
      toledoString: toToledo(net),
    };
    setLog(prev => [...prev, reading]);
    onReading?.(reading);
    return reading;
  }

  const applyRawGrams = useCallback((value: number) => {
    const g = Math.max(0, Math.min(30000, Math.round(value)));
    setRawGrams(g);
    setRawInput(String(g));
    addReading(g, tare, 'stable');
    setStatus('stable');
  }, [tare, syncRefs]);

  const handleRawInputChange = useCallback((value: string) => {
    const sanitized = value.replace(/[^\d]/g, '');
    setRawInput(sanitized);
    if (sanitized.length === 0) {
      setRawGrams(0);
      return;
    }

    const parsed = Number.parseInt(sanitized, 10);
    if (Number.isFinite(parsed)) {
      applyRawGrams(parsed);
    }
  }, [applyRawGrams]);

  function tarar() {
    stopInstabilidade();
    setTare(rawGrams);
    setStatus('tared');
    syncRefs(rawGrams, rawGrams, 'tared');
    const reading: ScaleReading = {
      timestamp: new Date(),
      rawGrams,
      netGrams: 0,
      tare: rawGrams,
      status: 'tared',
      toledoString: toToledo(0),
    };
    setLog(prev => [...prev, reading]);
    onReading?.(reading);
  }

  function pesoAleatorio() {
    stopInstabilidade();
    const g = Math.floor(Math.random() * 15000 + 100);
    applyRawGrams(g);
  }

  function stopInstabilidade() {
    if (instabilidadeRef.current) {
      clearInterval(instabilidadeRef.current);
      instabilidadeRef.current = null;
    }
  }

  function toggleInstabilidade() {
    if (instabilidadeRef.current) {
      stopInstabilidade();
      setStatus('stable');
      syncRefs(rawGramsRef.current, tareRef.current, 'stable');
      return;
    }
    const base = rawGrams || 1000;
    setStatus('unstable');
    syncRefs(rawGramsRef.current, tareRef.current, 'unstable');
    instabilidadeRef.current = setInterval(() => {
      const noise = Math.floor((Math.random() - 0.5) * 200);
      const g = Math.max(0, base + noise);
      setRawGrams(g);
      setRawInput(String(g));
      addReading(g, tare, 'unstable');
    }, 800);
  }

  useEffect(() => {
    syncRefs(rawGrams, tare, status);
  }, [rawGrams, tare, status, syncRefs]);

  useEffect(() => {
    if (typeof window === 'undefined' || !__DEV__) {
      return;
    }

    window.__DEV_SCALE_SIMULATOR__ = {
      getSnapshot: () => buildSnapshot(rawGramsRef.current, tareRef.current, statusRef.current),
      applyTare: () => {
        stopInstabilidade();
        const nextRaw = rawGramsRef.current;
        setTare(nextRaw);
        setStatus('tared');
        syncRefs(nextRaw, nextRaw, 'tared');
        const reading: ScaleReading = {
          timestamp: new Date(),
          rawGrams: nextRaw,
          netGrams: 0,
          tare: nextRaw,
          status: 'tared',
          toledoString: toToledo(0),
        };
        setLog(prev => [...prev, reading]);
        onReading?.(reading);
        return buildSnapshot(nextRaw, nextRaw, 'tared');
      },
    };

    return () => {
      delete window.__DEV_SCALE_SIMULATOR__;
    };
  }, [buildSnapshot, onReading, syncRefs]);

  useEffect(() => () => stopInstabilidade(), []);

  const statusColor = status === 'stable' ? '#3B6D11'
    : status === 'tared' ? '#854F0B'
    : status === 'unstable' ? '#A32D2D'
    : '#888';

  const statusLabel = status === 'stable' ? 'estável'
    : status === 'tared' ? 'tarado'
    : status === 'unstable' ? 'instável'
    : 'zero';

  return (
    <View style={styles.panel}>
      <View style={styles.panelHeader}>
        <View style={[styles.dot, { backgroundColor: status === 'unstable' ? '#E24B4A' : '#639922' }]} />
        <Text style={styles.panelTitle}>Balança USB — protocolo Toledo</Text>
        <View style={[styles.badge, { backgroundColor: status === 'unstable' ? '#FCEBEB' : status === 'tared' ? '#FAEEDA' : '#EAF3DE' }]}>
          <Text style={[styles.badgeText, { color: statusColor }]}>{statusLabel}</Text>
        </View>
      </View>

      <View style={styles.weightDisplay}>
        <Text style={styles.weightValue}>{(netGrams / 1000).toFixed(3)}</Text>
        <Text style={styles.weightUnit}> kg</Text>
      </View>
      {tare > 0 && (
        <Text style={styles.tareLabel}>tara: {(tare / 1000).toFixed(3)} kg subtraído</Text>
      )}

      <View style={styles.sliderRow}>
        <Text style={styles.sliderLabel}>Peso bruto</Text>
        <TextInput
          value={rawInput}
          onChangeText={handleRawInputChange}
          keyboardType="numeric"
          style={styles.input}
          placeholder="0"
          maxLength={5}
        />
        <Text style={styles.sliderVal}>{rawGrams} g</Text>
      </View>

      <View style={styles.quickAdjustRow}>
        <TouchableOpacity style={styles.quickAdjustButton} onPress={() => applyRawGrams(rawGrams + 50)}>
          <Text style={styles.quickAdjustText}>+50 g</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.quickAdjustButton} onPress={() => applyRawGrams(rawGrams + 250)}>
          <Text style={styles.quickAdjustText}>+250 g</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.quickAdjustButton} onPress={() => applyRawGrams(rawGrams + 1000)}>
          <Text style={styles.quickAdjustText}>+1 kg</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.quickAdjustButton} onPress={() => applyRawGrams(Math.max(0, rawGrams - 250))}>
          <Text style={styles.quickAdjustText}>-250 g</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.btnRow}>
        <TouchableOpacity style={[styles.btn, styles.btnInfo]} onPress={tarar}>
          <Text style={[styles.btnText, { color: '#0C447C' }]}>⊙ Tarar</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.btn} onPress={pesoAleatorio}>
          <Text style={styles.btnText}>↻ Aleatório</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.btn, instabilidadeRef.current ? styles.btnDanger : styles.btnWarn]}
          onPress={toggleInstabilidade}
        >
          <Text style={[styles.btnText, { color: instabilidadeRef.current ? '#791F1F' : '#633806' }]}>
            {instabilidadeRef.current ? '■ Parar' : '~ Instável'}
          </Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.logTitle}>log serial (Toledo)</Text>
      <ScrollView style={styles.log} contentContainerStyle={{ gap: 4 }}>
        {log.length === 0 && (
          <Text style={styles.logInfo}>Balança pronta.</Text>
        )}
        {[...log].reverse().map((r, i) => {
          const color = r.status === 'unstable' ? '#854F0B' : r.status === 'tared' ? '#185FA5' : '#3B6D11';
          const prefix = r.status === 'unstable' ? '[INSTÁVEL] ' : r.status === 'tared' ? '[TARA] ' : '';
          return (
            <View key={i} style={styles.logEntry}>
              <Text style={styles.logTime}>{formatTimestamp(r.timestamp)}</Text>
              <Text style={[styles.logMsg, { color }]}>{prefix}{r.toledoString.trim()}</Text>
            </View>
          );
        })}
      </ScrollView>

      <TouchableOpacity onPress={() => { setLog([]); setTare(0); setStatus('stable'); syncRefs(rawGramsRef.current, 0, 'stable'); stopInstabilidade(); }}>
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
  weightDisplay: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'center', paddingVertical: 16 },
  weightValue: { fontSize: 42, fontWeight: '500', fontFamily: 'monospace', letterSpacing: 2 },
  weightUnit: { fontSize: 18, color: '#888' },
  tareLabel: { fontSize: 12, color: '#888', textAlign: 'center', marginBottom: 8 },
  sliderRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 },
  sliderLabel: { fontSize: 13, color: '#888', minWidth: 75 },
  input: {
    flex: 1,
    minHeight: 40,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#D3D1C7',
    paddingHorizontal: 12,
    fontSize: 14,
    color: '#222',
    backgroundColor: '#FAFAF7',
  },
  sliderVal: { fontSize: 13, fontWeight: '500', minWidth: 52, textAlign: 'right' },
  quickAdjustRow: { flexDirection: 'row', gap: 8, marginBottom: 12, flexWrap: 'wrap' },
  quickAdjustButton: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 0.5,
    borderColor: 'rgba(0,0,0,0.12)',
    backgroundColor: '#F2F5F8',
  },
  quickAdjustText: { fontSize: 12, fontWeight: '500', color: '#345' },
  btnRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  btn: { flex: 1, paddingVertical: 8, borderRadius: 8, borderWidth: 0.5, borderColor: 'rgba(0,0,0,0.15)', alignItems: 'center' },
  btnInfo: { borderColor: '#185FA5', backgroundColor: '#E6F1FB' },
  btnWarn: { borderColor: '#854F0B', backgroundColor: '#FAEEDA' },
  btnDanger: { borderColor: '#A32D2D', backgroundColor: '#FCEBEB' },
  btnText: { fontSize: 13, fontWeight: '500', color: '#444' },
  logTitle: { fontSize: 11, color: '#888', marginBottom: 6 },
  log: { backgroundColor: '#F5F5F0', borderRadius: 8, padding: 10, maxHeight: 160 },
  logEntry: { flexDirection: 'row', gap: 8 },
  logTime: { fontSize: 11, color: '#aaa', fontFamily: 'monospace' },
  logMsg: { fontSize: 11, fontFamily: 'monospace', flex: 1 },
  logInfo: { fontSize: 11, color: '#185FA5', fontFamily: 'monospace' },
  clearBtn: { fontSize: 12, color: '#888', textAlign: 'right', marginTop: 8 },
});
