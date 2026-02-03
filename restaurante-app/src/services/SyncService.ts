
import NetInfo from '@react-native-community/netinfo';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { db } from '../config/firebaseConfig';
import { collection, addDoc, updateDoc, doc, setDoc } from 'firebase/firestore';

const QUEUE_KEY = 'OFFLINE_QUEUE';

interface QueueItem {
  id: string;
  type: 'ADD_ORDER' | 'UPDATE_ORDER' | 'CLOSE_COMANDA' | 'ADD_PAYMENT' | 'ADD_PAYMENT_TRANSACTION';
  payload: any;
  timestamp: number;
  retryCount: number;
}

import { runTransaction, getDocs, query, where, getDoc } from 'firebase/firestore';
import { getCompanyCollection, getCompanyDoc } from '../utils/firestoreUtils';
import CaixaService from './CaixaService';
import { Comanda } from '../types';

class SyncService {
  private isConnected: boolean = true;
  private queue: QueueItem[] = [];
  private isSyncing: boolean = false;
  private listeners: ((status: boolean) => void)[] = [];

  constructor() {
    this.init();
  }

  private async init() {
    // 1. Subscribe to network state
    NetInfo.addEventListener(state => {
      const wasConnected = this.isConnected;
      this.isConnected = !!state.isConnected;
      
      this.notifyListeners(this.isConnected);

      if (!wasConnected && this.isConnected) {
        console.log('🌐 [SyncService] Conexão restabelecida. Processando fila...');
        this.processQueue();
      }
    });

    // 2. Load queue from storage
    this.loadQueue();
  }

  // --- Public API ---

  public getIsConnected(): boolean {
    return this.isConnected;
  }

  public subscribe(callback: (status: boolean) => void) {
    this.listeners.push(callback);
    callback(this.isConnected);
    return () => {
      this.listeners = this.listeners.filter(l => l !== callback);
    };
  }

  public async addToQueue(type: QueueItem['type'], payload: any) {
    const item: QueueItem = {
      id: Date.now().toString() + Math.random().toString(36).substr(2, 5),
      type,
      payload,
      timestamp: Date.now(),
      retryCount: 0
    };

    this.queue.push(item);
    await this.persistQueue();
    console.log(`📥 [SyncService] Adicionado à fila: ${type} (${this.queue.length} pendentes)`);
    
    // Try to process immediately if connected (maybe it was just a blip)
    if (this.isConnected) {
        this.processQueue();
    }
  }

  // --- Internals ---

  private notifyListeners(status: boolean) {
    this.listeners.forEach(l => l(status));
  }

  private async loadQueue() {
    try {
      const json = await AsyncStorage.getItem(QUEUE_KEY);
      if (json) {
        this.queue = JSON.parse(json);
        console.log(`📂 [SyncService] Fila carregada com ${this.queue.length} itens.`);
      }
    } catch (e) {
      console.error('[SyncService] Erro ao carregar fila:', e);
    }
  }

  private async persistQueue() {
    try {
      await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(this.queue));
    } catch (e) {
      console.error('[SyncService] Erro ao salvar fila:', e);
    }
  }

  private async processQueue() {
    if (this.isSyncing || this.queue.length === 0 || !this.isConnected) return;

    this.isSyncing = true;
    console.log('🔄 [SyncService] Iniciando sincronização...');

    const queueSnapshot = [...this.queue];
    const remainingQueue: QueueItem[] = [];

    for (const item of queueSnapshot) {
      try {
        await this.executeOperation(item);
        console.log(`✅ [SyncService] Item processado: ${item.type}`);
      } catch (error) {
        console.error(`❌ [SyncService] Falha ao processar item ${item.type}:`, error);
        
        // Retry logic: keep in queue if retryCount < 3
        if (item.retryCount < 3) {
            item.retryCount++;
            remainingQueue.push(item);
        } else {
            console.warn(`💀 [SyncService] Item descartado após 3 falhas: ${item.type}`, item.payload);
            // Optional: Save to a "Dead Letter Queue" for manual inspection
        }
      }
    }

    this.queue = remainingQueue;
    await this.persistQueue();
    this.isSyncing = false;

    if (this.queue.length > 0 && this.isConnected) {
        // Retry remaining items after delay if still connected
        setTimeout(() => this.processQueue(), 5000);
    }
  }

  private async executeOperation(item: QueueItem) {
    const { type, payload } = item;

    switch (type) {
      case 'ADD_ORDER':
        // payload: { companyId, orderData }
        // We use setDoc if ID is provided, or addDoc
        if (payload.id) {
            const docRef = doc(db, 'companies', payload.companyId, 'pedidos', payload.id);
            await setDoc(docRef, payload.orderData);
        } else {
            const colRef = collection(db, 'companies', payload.companyId, 'pedidos');
            await addDoc(colRef, payload.orderData);
        }
        break;

      case 'UPDATE_ORDER':
        // payload: { companyId, orderId, updates }
        const updateRef = doc(db, 'companies', payload.companyId, 'pedidos', payload.orderId);
        await updateDoc(updateRef, payload.updates);
        break;
        
     case 'ADD_PAYMENT':
         // payload: { companyId, paymentData }
         const payRef = collection(db, 'companies', payload.companyId, 'pagamentos');
         await addDoc(payRef, payload.paymentData);
         break;

      default:
        throw new Error(`Operação desconhecida: ${type}`);
    }
  }
}

export default new SyncService();
