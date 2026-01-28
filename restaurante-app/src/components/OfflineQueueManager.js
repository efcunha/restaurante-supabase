import React, { useEffect } from 'react';
import NetInfo from '@react-native-community/netinfo';
import OfflineQueueService from '../services/OfflineQueueService';
import { AppState } from 'react-native';

const OfflineQueueManager = () => {
    useEffect(() => {
        // Tenta processar ao montar
        OfflineQueueService.processQueue();

        // Listener de Rede
        const unsubscribeNet = NetInfo.addEventListener(state => {
            if (state.isConnected) {
                // console.log('[QueueManager] Conectado. Processando fila...');
                OfflineQueueService.processQueue();
            }
        });

        // Listener de AppState (Foreground)
        const subscriptionApp = AppState.addEventListener('change', nextAppState => {
            if (nextAppState === 'active') {
                // console.log('[QueueManager] App em primeiro plano. Processando fila...');
                OfflineQueueService.processQueue();
            }
        });

        return () => {
            unsubscribeNet();
            subscriptionApp.remove();
        };
    }, []);

    return null; // Componente invisível
};

export default OfflineQueueManager;
