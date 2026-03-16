import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import PrinterService from '../services/PrinterService';
import { useResponsive } from '../hooks/useResponsive';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../context/AuthContext';
import { colors } from '../theme/colors';
interface Props {
  navigation: any;
}

export default function PrinterConfigScreen({ navigation }: Props) {
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const { isTablet, horizontalPadding } = useResponsive();
  const [printers, setPrinters] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [connected, setConnected] = useState(false);
  const [selectedPrinter, setSelectedPrinter] = useState<any>(null);
  const [printerWidth, setPrinterWidth] = useState(48); // 80mm padrão

  useEffect(() => {
    initializeService();
  }, []);

  const initializeService = async () => {
    await PrinterService.initialize();
    const status = PrinterService.getStatus();
    setConnected(status.connected);
    setSelectedPrinter(status.printer);
    setPrinterWidth(status.width);
  };

  const handleScanPrinters = async () => {
    if (!PrinterService.isAvailable()) {
      Alert.alert(
        'Não disponível',
        'Impressão Bluetooth só funciona no app mobile (Android/iOS).'
      );
      return;
    }

    setLoading(true);
    try {
      const foundPrinters = await PrinterService.listPrinters();
      setPrinters(foundPrinters);

      if (foundPrinters.length === 0) {
        Alert.alert(
          'Nenhuma impressora',
          'Nenhuma impressora encontrada.\n\nVerifique:\n- Bluetooth ativado\n- Impressora ligada\n- Pareamento feito'
        );
      }
    } finally {
      setLoading(false);
    }
  };

  const handleConnect = async (printer: any) => {
    setLoading(true);
    try {
      const success = await PrinterService.connect(printer, printerWidth);
      if (success) {
        setConnected(true);
        setSelectedPrinter(printer);
        Alert.alert('Sucesso', `Conectado com ${printer.name}`);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleDisconnect = async () => {
    await PrinterService.disconnect();
    setConnected(false);
    setSelectedPrinter(null);
    Alert.alert('Desconectado', 'Impressora desconectada');
  };

  const handleTestPrint = async () => {
    const success = await PrinterService.printTest();
    if (success) {
      Alert.alert('Sucesso', 'Teste de impressão enviado!');
    }
  };

  /*
  const toggleWidth = () => {
    setPrinterWidth(prev => prev === 48 ? 32 : 48);
  };
  */

  const renderHeader = () => (
    <View style={[styles.header, { paddingTop: Math.max(insets.top, 20) }]}>
      <View style={styles.headerLeft} />
      <View style={styles.headerCenter}>
        <View style={styles.headerTitleRow}>
          <Ionicons name="print-outline" size={24} color={colors.white} style={styles.headerIcon} />
          <Text style={styles.headerTitle}>Configurar Impressora</Text>
        </View>
        {!!user && <Text style={styles.userInfo}>Operador: {user.nome || user.email}</Text>}
      </View>
      <View style={styles.headerRight}>
        <TouchableOpacity style={styles.logoutBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back-outline" size={24} color={colors.white} />
        </TouchableOpacity>
      </View>
    </View>
  );

  if (!PrinterService.isAvailable()) {
    return (
      <View style={styles.container}>
        {renderHeader()}
        <View style={styles.unavailableContainer}>
          <Text style={styles.unavailableText}>⚠️</Text>
          <Text style={styles.unavailableTitle}>Não Disponível na Web</Text>
          <Text style={styles.unavailableSubtext}>
            A impressão via Bluetooth só funciona no app mobile (Android/iOS).
          </Text>
          <Text style={styles.unavailableSubtext}>
            Use a versão mobile para configurar a impressora.
          </Text>
        </View>
        <StatusBar style="light" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {renderHeader()}
      <ScrollView style={styles.content} contentContainerStyle={{ 
        paddingBottom: 100,
        paddingHorizontal: horizontalPadding,
      }}>
        {/* Status da Conexão */}
        <View style={styles.statusCard}>
          <Text style={styles.cardTitle}>Status da Conexão</Text>
          {connected && selectedPrinter ? (
            <View>
              <Text style={styles.connectedText}>✅ Conectado</Text>
              <Text style={styles.printerName}>{selectedPrinter.name}</Text>
              <Text style={styles.printerDetail}>
                Largura: {printerWidth === 48 ? '80mm (48 chars)' : '58mm (32 chars)'}
              </Text>
              <TouchableOpacity style={styles.disconnectBtn} onPress={handleDisconnect}>
                <Text style={styles.disconnectBtnText}>Desconectar</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <Text style={styles.disconnectedText}>❌ Desconectado</Text>
          )}
        </View>

        {/* Configuração de Largura */}
        <View style={[styles.card, {
          maxWidth: isTablet ? 500 : '100%',
          alignSelf: 'center',
          width: '100%',
        }]}>
          <Text style={styles.cardTitle}>Largura do Papel</Text>
          <View style={[styles.widthOptions, {
            maxWidth: isTablet ? 400 : '100%',
          }]}>
            <TouchableOpacity
              style={[styles.widthButton, printerWidth === 48 && styles.widthButtonActive, {
                maxWidth: isTablet ? 180 : '100%',
              }]}
              onPress={() => setPrinterWidth(48)}
            >
              <Text style={[styles.widthButtonText, printerWidth === 48 && styles.widthButtonTextActive]}>
                80mm
              </Text>
              <Text style={styles.widthButtonSubtext}>48 caracteres</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.widthButton, printerWidth === 32 && styles.widthButtonActive, {
                maxWidth: isTablet ? 180 : '100%',
              }]}
              onPress={() => setPrinterWidth(32)}
            >
              <Text style={[styles.widthButtonText, printerWidth === 32 && styles.widthButtonTextActive]}>
                58mm
              </Text>
              <Text style={styles.widthButtonSubtext}>32 caracteres</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Botão Buscar Impressoras */}
        <TouchableOpacity
          style={styles.scanButton}
          onPress={handleScanPrinters}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color={colors.white} />
          ) : (
            <Text style={styles.scanButtonText}>🔍 Buscar Impressoras</Text>
          )}
        </TouchableOpacity>

        {/* Lista de Impressoras */}
        {printers.length > 0 && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Impressoras Disponíveis</Text>
            {printers.map((printer, index) => (
              <TouchableOpacity
                key={index}
                style={styles.printerItem}
                onPress={() => handleConnect(printer)}
                disabled={loading}
              >
                <View style={styles.printerInfo}>
                  <Text style={styles.printerItemName}>{printer.name || 'Sem nome'}</Text>
                  <Text style={styles.printerItemAddress}>{printer.target}</Text>
                </View>
                <Text style={styles.connectArrow}>→</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Botão Teste */}
        {connected && (
          <TouchableOpacity
            style={styles.testButton}
            onPress={handleTestPrint}
            disabled={loading}
          >
            <Text style={styles.testButtonText}>🖨️ Imprimir Teste</Text>
          </TouchableOpacity>
        )}

        {/* Instruções */}
        <View style={styles.instructionsCard}>
          <Text style={styles.instructionsTitle}>📋 Como Configurar:</Text>
          <Text style={styles.instructionText}>1. Ligue a impressora</Text>
          <Text style={styles.instructionText}>2. Ative o Bluetooth do celular</Text>
          <Text style={styles.instructionText}>3. Pareie a impressora (Config. do Android)</Text>
          <Text style={styles.instructionText}>4. Clique em &quot;Buscar Impressoras&quot;</Text>
          <Text style={styles.instructionText}>5. Selecione sua impressora</Text>
          <Text style={styles.instructionText}>6. Faça um teste de impressão</Text>
        </View>
      </ScrollView>

      <StatusBar style="light" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: { backgroundColor: colors.primary, minHeight: 92, paddingBottom: 15, paddingHorizontal: 20, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderBottomLeftRadius: 20, borderBottomRightRadius: 20, zIndex: 10, elevation: 8, shadowColor: colors.shadow, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 6 },
  headerLeft: { flex: 1 },
  headerCenter: { flex: 2, alignItems: 'center', justifyContent: 'center' },
  headerRight: { flex: 1, alignItems: 'flex-end', justifyContent: 'center' },
  headerTitleRow: { flexDirection: 'row', alignItems: 'center' },
  headerIcon: { marginRight: 8 },
  headerTitle: { color: colors.white, fontSize: 20, fontWeight: 'bold', textAlign: 'center' },
  userInfo: { fontSize: 12, color: colors.userInfo, fontWeight: '600', marginTop: 4, textAlign: 'center' },
  logoutBtn: { paddingHorizontal: 10, paddingVertical: 8, borderRadius: 12, backgroundColor: colors.logoutBg },
  content: {
    flex: 1,
    padding: 20,
  },
  statusCard: {
    backgroundColor: colors.white,
    borderRadius: 15,
    padding: 20,
    marginBottom: 15,
    borderWidth: 2,
    borderColor: colors.secondary,
  },
  card: {
    backgroundColor: colors.white,
    borderRadius: 15,
    padding: 20,
    marginBottom: 15,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.primary,
    marginBottom: 15,
  },
  connectedText: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.success,
    marginBottom: 8,
  },
  disconnectedText: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.danger,
  },
  printerName: {
    fontSize: 16,
    color: colors.text,
    marginBottom: 4,
  },
  printerDetail: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 15,
  },
  disconnectBtn: {
    backgroundColor: colors.danger,
    padding: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  disconnectBtnText: {
    color: colors.white,
    fontSize: 14,
    fontWeight: '600',
  },
  widthOptions: {
    flexDirection: 'row',
    gap: 10,
  },
  widthButton: {
    flex: 1,
    backgroundColor: colors.surfaceMuted,
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  widthButtonActive: {
    backgroundColor: colors.warningSurface,
    borderColor: colors.secondary,
  },
  widthButtonText: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  widthButtonTextActive: {
    color: colors.primary,
  },
  widthButtonSubtext: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 4,
  },
  scanButton: {
    backgroundColor: colors.secondary,
    padding: 18,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 15,
  },
  scanButtonText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: '700',
  },
  printerItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 15,
    backgroundColor: colors.surfaceMuted,
    borderRadius: 10,
    marginBottom: 10,
  },
  printerInfo: {
    flex: 1,
  },
  printerItemName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 4,
  },
  printerItemAddress: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  connectArrow: {
    fontSize: 24,
    color: colors.primary,
  },
  testButton: {
    backgroundColor: colors.success,
    padding: 18,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 15,
  },
  testButtonText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: '700',
  },
  instructionsCard: {
    backgroundColor: colors.warningSurface,
    borderRadius: 15,
    padding: 20,
    marginBottom: 30,
  },
  instructionsTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.primary,
    marginBottom: 15,
  },
  instructionText: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 8,
    paddingLeft: 10,
  },
  unavailableContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  unavailableText: {
    fontSize: 64,
    marginBottom: 20,
  },
  unavailableTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.primary,
    marginBottom: 15,
    textAlign: 'center',
  },
  unavailableSubtext: {
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: 10,
  },
});
