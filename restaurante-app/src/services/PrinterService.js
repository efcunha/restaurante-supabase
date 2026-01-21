/**
 * PrinterService - Serviço universal de impressão térmica ESC/POS
 * Compatível com qualquer impressora térmica Bluetooth (58mm ou 80mm)
 * Marcas suportadas: Elgin, Bematech, Epson, Daruma, etc.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { Alert, Platform } from 'react-native';

// Importar biblioteca de impressão (apenas no mobile)
let EscPosPrinter = null;
if (Platform.OS !== 'web') {
  try {
    EscPosPrinter = require('react-native-esc-pos-printer');
  } catch (error) {
    // Usar mock como fallback
    EscPosPrinter = require('./PrinterService.mock').default;
  }
} else {
  // Web sempre usa mock
  EscPosPrinter = require('./PrinterService.mock').default;
}

const PRINTER_CONFIG_KEY = '@printer_config';

class PrinterService {
  constructor() {
    this.connectedPrinter = null;
    this.printerWidth = 48; // 80mm = 48 caracteres, 58mm = 32 caracteres
    this.initialized = false;
  }

  /**
   * Inicializa o serviço (carrega configuração salva)
   */
  async initialize() {
    if (this.initialized) return;
    
    try {
      const config = await AsyncStorage.getItem(PRINTER_CONFIG_KEY);
      if (config) {
        const { printer, width } = JSON.parse(config);
        // Não definir connectedPrinter aqui, pois não está conectado de fato
        // Apenas guardar config para uso futuro se necessário
        this.savedConfig = { printer, width };
      }
      this.initialized = true;
    } catch (error) {
      console.log('Erro ao ler config da impressora:', error);
    }
  }

  /**
   * Tenta conectar automaticamente na última impressora salva
   */
  async autoConnect() {
    if (!this.initialized) await this.initialize();
    
    if (this.savedConfig && this.isAvailable()) {
      console.log('🔄 Tentando reconexão automática com impressora:', this.savedConfig.printer.name);
      return await this.connect(this.savedConfig.printer, this.savedConfig.width);
    }
    return false;
  }

  /**
   * Verifica se está disponível apenas em ambiente nativo
   */
  isAvailable() {
    return Platform.OS !== 'web' && EscPosPrinter !== null && EscPosPrinter !== undefined;
  }

  /**
   * Lista impressoras Bluetooth disponíveis
   */
  async listPrinters() {
    if (!this.isAvailable()) {
      Alert.alert('Não disponível', 'Impressão via Bluetooth só funciona no app mobile.');
      return [];
    }

    try {
      const printers = await EscPosPrinter.discover();
      return printers || [];
    } catch (error) {
      Alert.alert('Erro', 'Não foi possível buscar impressoras. Ative o Bluetooth.');
      return [];
    }
  }

  /**
   * Conecta com uma impressora
   */
  async connect(printer, width = 48) {
    if (!this.isAvailable()) {
      Alert.alert('Não disponível', 'Impressão via Bluetooth só funciona no app mobile.');
      return false;
    }

    try {
      await EscPosPrinter.connect(printer.target);
      
      this.connectedPrinter = printer;
      this.printerWidth = width;
      
      // Salvar configuração
      await AsyncStorage.setItem(PRINTER_CONFIG_KEY, JSON.stringify({ printer, width }));
      
      return true;
    } catch (error) {
      Alert.alert('Erro', 'Não foi possível conectar com a impressora.');
      return false;
    }
  }

  /**
   * Desconecta da impressora
   */
  async disconnect() {
    try {
      if (this.connectedPrinter && this.isAvailable()) {
        await EscPosPrinter.disconnect();
      }
      this.connectedPrinter = null;
    } catch (error) {
    }
  }

  /**
   * Imprime teste de conexão
   */
  async printTest() {
    if (!this.connectedPrinter) {
      Alert.alert('Sem impressora', 'Conecte-se a uma impressora primeiro.');
      return false;
    }

    try {
      const centerText = (text) => {
        const padding = Math.floor((this.printerWidth - text.length) / 2);
        return ' '.repeat(Math.max(0, padding)) + text;
      };

      const line = '='.repeat(this.printerWidth);

      await EscPosPrinter.printText(line + '\n');
      await EscPosPrinter.printText(centerText('TESTE DE IMPRESSÃO') + '\n', {
        fontType: 1,
        widthTimes: 1,
        heightTimes: 1
      });
      await EscPosPrinter.printText(line + '\n');
      await EscPosPrinter.printText(centerText('ESPETO') + '\n');
      await EscPosPrinter.printText(centerText('Impressora conectada!') + '\n');
      await EscPosPrinter.printText('\n');
      await EscPosPrinter.printText(centerText(`Largura: ${this.printerWidth} caracteres`) + '\n');
      await EscPosPrinter.printText(centerText(new Date().toLocaleString('pt-BR')) + '\n');
      await EscPosPrinter.printText(line + '\n');
      await EscPosPrinter.printText('\n\n\n');
      await EscPosPrinter.cutPaper();

      return true;
    } catch (error) {
      Alert.alert('Erro', 'Falha ao imprimir. Verifique a conexão.');
      return false;
    }
  }

  /**
   * Imprime comanda completa
   */
  async printComanda(comandaData) {
    if (!this.isAvailable()) {
      Alert.alert('Não disponível', 'Impressão via Bluetooth só funciona no app mobile (Android/iOS).');
      return false;
    }
    
    if (!this.connectedPrinter) {
      Alert.alert('Sem impressora', 'Conecte-se a uma impressora primeiro.');
      return false;
    }

    try {
      const centerText = (text) => {
        const padding = Math.floor((this.printerWidth - text.length) / 2);
        return ' '.repeat(Math.max(0, padding)) + text;
      };

      const line = '='.repeat(this.printerWidth);
      const dashes = '-'.repeat(this.printerWidth);

      // Cabeçalho
      await EscPosPrinter.printText(line + '\n');
      await EscPosPrinter.printText(centerText('ESPETO') + '\n', {
        fontType: 1,
        widthTimes: 1,
        heightTimes: 1
      });
      await EscPosPrinter.printText(line + '\n');
      
      // Informações da comanda
      await EscPosPrinter.printText(`Comanda: ${comandaData.comandaNumber || '?'}`, {
        fontType: 1
      });
      await EscPosPrinter.printText(`        ${comandaData.horarioCriacao || ''}\n`);
      
      if (comandaData.cliente) {
        await EscPosPrinter.printText(`Cliente: ${comandaData.cliente}\n`);
      }
      
      if (comandaData.criadoPor) {
        await EscPosPrinter.printText(`Criado por: ${comandaData.criadoPor}\n`);
      }
      
      await EscPosPrinter.printText(line + '\n');
      await EscPosPrinter.printText(centerText('ITENS CONSUMIDOS') + '\n');
      await EscPosPrinter.printText(line + '\n');

      // Itens
      for (const item of comandaData.itens || []) {
        // Nome do item
        await EscPosPrinter.printText(`${item.quantidade || 1}x ${item.nome}\n`);
        
        // Observação (se houver)
        if (item.observacao) {
          await EscPosPrinter.printText(`   (${item.observacao})\n`);
        }
        
        // Valor alinhado à direita
        const valorStr = `R$ ${item.valor.toFixed(2)}`;
        const spaces = ' '.repeat(this.printerWidth - valorStr.length);
        await EscPosPrinter.printText(spaces + valorStr + '\n');
        
        await EscPosPrinter.printText(dashes + '\n');
      }

      // Totais
      await EscPosPrinter.printText(line + '\n');
      
      const totalConsumido = `R$ ${(comandaData.totalConsumido || 0).toFixed(2)}`;
      const totalPago = `R$ ${(comandaData.totalPago || 0).toFixed(2)}`;
      const saldo = `R$ ${(comandaData.saldoAberto || 0).toFixed(2)}`;
      
      await EscPosPrinter.printText('TOTAL CONSUMIDO:' + ' '.repeat(this.printerWidth - 16 - totalConsumido.length) + totalConsumido + '\n', {
        fontType: 1
      });
      await EscPosPrinter.printText('TOTAL PAGO:' + ' '.repeat(this.printerWidth - 11 - totalPago.length) + totalPago + '\n');
      await EscPosPrinter.printText('SALDO DEVEDOR:' + ' '.repeat(this.printerWidth - 14 - saldo.length) + saldo + '\n', {
        fontType: 1
      });
      
      await EscPosPrinter.printText(line + '\n');
      await EscPosPrinter.printText(centerText('Obrigado e Volte Sempre!') + '\n');
      await EscPosPrinter.printText(line + '\n');
      await EscPosPrinter.printText('\n\n\n');
      
      // Cortar papel
      await EscPosPrinter.cutPaper();

      return true;
    } catch (error) {
      Alert.alert('Erro', 'Falha ao imprimir comanda. Verifique a conexão.');
      return false;
    }
  }

  /**
   * Imprime pedido individual (para cozinha)
   */
  async printPedido(pedidoData) {
    if (!this.connectedPrinter) {
      Alert.alert('Sem impressora', 'Conecte-se a uma impressora primeiro.');
      return false;
    }

    try {
      const centerText = (text) => {
        const padding = Math.floor((this.printerWidth - text.length) / 2);
        return ' '.repeat(Math.max(0, padding)) + text;
      };

      const line = '='.repeat(this.printerWidth);

      // Cabeçalho
      await EscPosPrinter.printText(line + '\n');
      await EscPosPrinter.printText(centerText('PEDIDO - COZINHA') + '\n', {
        fontType: 1,
        widthTimes: 2,
        heightTimes: 2
      });
      await EscPosPrinter.printText(line + '\n');
      
      // Informações
      await EscPosPrinter.printText(`Comanda: ${pedidoData.comandaNumber || '?'}\n`, {
        fontType: 1,
        widthTimes: 1,
        heightTimes: 1
      });
      await EscPosPrinter.printText(`Horario: ${pedidoData.horarioCriacao || ''}\n`);
      await EscPosPrinter.printText(`Cliente: ${pedidoData.cliente || 'N/A'}\n`);
      await EscPosPrinter.printText(line + '\n');

      // Itens
      for (const item of pedidoData.itens || []) {
        await EscPosPrinter.printText(`${item.quantidade || 1}x ${item.nome}\n`, {
          fontType: 1,
          widthTimes: 1,
          heightTimes: 1
        });
        
        if (item.observacao) {
          await EscPosPrinter.printText(`   OBS: ${item.observacao}\n`);
        }
        await EscPosPrinter.printText('\n');
      }

      await EscPosPrinter.printText(line + '\n');
      await EscPosPrinter.printText('\n\n\n');
      await EscPosPrinter.cutPaper();

      return true;
    } catch (error) {
      Alert.alert('Erro', 'Falha ao imprimir pedido. Verifique a conexão.');
      return false;
    }
  }

  /**
   * Retorna status da impressora
   */
  getStatus() {
    return {
      connected: this.connectedPrinter !== null,
      printer: this.connectedPrinter,
      width: this.printerWidth,
      available: this.isAvailable()
    };
  }
}

export default new PrinterService();
