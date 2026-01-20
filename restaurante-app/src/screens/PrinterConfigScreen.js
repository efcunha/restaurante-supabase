import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Platform
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import PrinterService from '../services/PrinterService';
import BackgroundPattern from '../components/BackgroundPattern';

export default function PrinterConfigScreen({ navigation }) {
  const [printers, setPrinters] = useState([]);
  const [loading, setLoading] = useState(false);
  const [connected, setConnected] = useState(false);
  const [selectedPrinter, setSelectedPrinter] = useState(null);
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

  const handleConnect = async (printer) => {
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

  const toggleWidth = () => {
    setPrinterWidth(prev => prev === 48 ? 32 : 48);
  };

  if (!PrinterService.isAvailable()) {
    return (
      <View style={styles.container}>
        <BackgroundPattern />
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Text style={styles.backButtonText}>← Voltar</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Configurar Impressora</Text>
        </View>
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
      <BackgroundPattern />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Text style={styles.backButtonText}>← Voltar</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Configurar Impressora</Text>
      </View>

      <ScrollView style={styles.content}>
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
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Largura do Papel</Text>
          <View style={styles.widthOptions}>
            <TouchableOpacity
              style={[styles.widthButton, printerWidth === 48 && styles.widthButtonActive]}
              onPress={() => setPrinterWidth(48)}
            >
              <Text style={[styles.widthButtonText, printerWidth === 48 && styles.widthButtonTextActive]}>
                80mm
              </Text>
              <Text style={styles.widthButtonSubtext}>48 caracteres</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.widthButton, printerWidth === 32 && styles.widthButtonActive]}
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
            <ActivityIndicator color="#FFFFFF" />
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
          <Text style={styles.instructionText}>4. Clique em "Buscar Impressoras"</Text>
          <Text style={styles.instructionText}>5. Selecione sua impressora</Text>
          <Text style={styles.instructionText}>6. Faça um teste de impressão</Text>
        </View>
      </ScrollView>

      <StatusBar style="light" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F1E8',
  },
  header: {
    backgroundColor: '#8B2F2F',
    paddingTop: 50,
    paddingBottom: 20,
    paddingHorizontal: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 15,
    elevation: 8,
  },
  backButton: {
    marginBottom: 10,
  },
  backButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
  },
  headerTitle: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: '600',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  statusCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 15,
    padding: 20,
    marginBottom: 15,
    borderWidth: 2,
    borderColor: '#E5B84A',
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 15,
    padding: 20,
    marginBottom: 15,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#8B2F2F',
    marginBottom: 15,
  },
  connectedText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#27AE60',
    marginBottom: 8,
  },
  disconnectedText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#E74C3C',
  },
  printerName: {
    fontSize: 16,
    color: '#2C2C2C',
    marginBottom: 4,
  },
  printerDetail: {
    fontSize: 14,
    color: '#666',
    marginBottom: 15,
  },
  disconnectBtn: {
    backgroundColor: '#E74C3C',
    padding: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  disconnectBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  widthOptions: {
    flexDirection: 'row',
    gap: 10,
  },
  widthButton: {
    flex: 1,
    backgroundColor: '#F0F0F0',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  widthButtonActive: {
    backgroundColor: '#FFF3E0',
    borderColor: '#E5B84A',
  },
  widthButtonText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#666',
  },
  widthButtonTextActive: {
    color: '#8B2F2F',
  },
  widthButtonSubtext: {
    fontSize: 12,
    color: '#999',
    marginTop: 4,
  },
  scanButton: {
    backgroundColor: '#E5B84A',
    padding: 18,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 15,
  },
  scanButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  printerItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 15,
    backgroundColor: '#F9F9F9',
    borderRadius: 10,
    marginBottom: 10,
  },
  printerInfo: {
    flex: 1,
  },
  printerItemName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2C2C2C',
    marginBottom: 4,
  },
  printerItemAddress: {
    fontSize: 12,
    color: '#999',
  },
  connectArrow: {
    fontSize: 24,
    color: '#8B2F2F',
  },
  testButton: {
    backgroundColor: '#27AE60',
    padding: 18,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 15,
  },
  testButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  instructionsCard: {
    backgroundColor: '#FFF3E0',
    borderRadius: 15,
    padding: 20,
    marginBottom: 30,
  },
  instructionsTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#8B2F2F',
    marginBottom: 15,
  },
  instructionText: {
    fontSize: 14,
    color: '#666',
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
    color: '#8B2F2F',
    marginBottom: 15,
    textAlign: 'center',
  },
  unavailableSubtext: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 10,
  },
});
