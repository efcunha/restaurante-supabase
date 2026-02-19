import React, { useEffect, useState } from 'react';
import NetInfo from '@react-native-community/netinfo';
import { offlineQueueService } from '../services/OfflineQueueService';
import { AppState } from 'react-native';

const OfflineQueueManager = () => {
    const [initialized, setInitialized] = useState(false);

    useEffect(() => {
        let mounted = true;

        // Inicializa o serviço
        const initService = async () => {
            try {
                await offlineQueueService.initialize();
                if (mounted) {
                    setInitialized(true);
                }
            } catch (error) {
                console.error('[QueueManager] Erro ao inicializar serviço:', error);
            }
        };

        initService();

        return () => {
            mounted = false;
            // Cleanup do serviço ao desmontar
            offlineQueueService.shutdown().catch(console.error);
        };
    }, []);

    useEffect(() => {
        if (!initialized) {
            return;
        }

        // Tenta processar ao montar (após inicialização)
        offlineQueueService.processQueue().catch(console.error);

        // Listener de Rede
        const unsubscribeNet = NetInfo.addEventListener(state => {
            if (state.isConnected) {
                // console.log('[QueueManager] Conectado. Processando fila...');
                offlineQueueService.processQueue().catch(console.error);
            }
        });

        // Listener de AppState (Foreground)
        const subscriptionApp = AppState.addEventListener('change', nextAppState => {
            if (nextAppState === 'active') {
                // console.log('[QueueManager] App em primeiro plano. Processando fila...');
                offlineQueueService.processQueue().catch(console.error);
            }
        });

        return () => {
            unsubscribeNet();
            subscriptionApp.remove();
        };
    }, [initialized]);

    return null; // Componente invisível
};

export default OfflineQueueManager;
