import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';

const QUEUE_KEY = '@offline_queue';

class OfflineQueueService {
    /**
     * Adiciona uma tarefa à fila.
     * @param {string} type - Tipo da tarefa (ex: 'STOCK_DEDUCTION')
     * @param {object} payload - Dados necessários para execução
     */
    async addTask(type, payload) {
        try {
            const currentQueue = await this.getQueue();
            const newTask = {
                id: Date.now().toString() + Math.random().toString().slice(2, 5),
                type,
                payload,
                createdAt: Date.now(),
                retryCount: 0
            };
            const newQueue = [...currentQueue, newTask];
            await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(newQueue));
            console.log(`[OfflineQueue] Tarefa adicionada: ${type} (${newTask.id})`);
        } catch (error) {
            console.error('[OfflineQueue] Erro ao adicionar tarefa:', error);
        }
    }

    async getQueue() {
        try {
            const json = await AsyncStorage.getItem(QUEUE_KEY);
            return json ? JSON.parse(json) : [];
        } catch (error) {
            return [];
        }
    }

    async removeTask(taskId) {
        try {
            const currentQueue = await this.getQueue();
            const newQueue = currentQueue.filter(t => t.id !== taskId);
            await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(newQueue));
        } catch (error) {
            console.error('[OfflineQueue] Erro ao remover tarefa:', error);
        }
    }

    /**
     * Processa a fila de tarefas pendentes.
     * Deve ser chamado quando houver conexão ou periodicamente.
     */
    async processQueue() {
        const state = await NetInfo.fetch();
        if (!state.isConnected) {
            console.log('[OfflineQueue] Sem conexão, ignorando processamento.');
            return;
        }

        const queue = await this.getQueue();
        if (queue.length === 0) return;

        console.log(`[OfflineQueue] Processando ${queue.length} tarefas...`);

        // Evitar dependência circular importando aqui dentro (Lazy import pattern se necessário, 
        // mas em RN services geralmente são singletons ou módulos estáticos. 
        // Vou usar require inline ou importar no topo se a ordem permitir).
        // Para simplificar, vou assumir import no topo e lidar com a lógica de execução.

        // IMPORTANTE: InventoryService deve ser importado aqui.
        // Como InventoryService pode importar OfflineQueueService, cuidado.
        // Melhor padrão: Registrador de handlers.

        for (const task of queue) {
            try {
                await this.executeTask(task);
                await this.removeTask(task.id);
                console.log(`[OfflineQueue] Tarefa ${task.id} executada com sucesso.`);
            } catch (error) {
                console.error(`[OfflineQueue] Falha na tarefa ${task.id}:`, error);
                // Opcional: incrementar retryCount e remover se excessivo
            }
        }
    }

    async executeTask(task) {
        switch (task.type) {
            case 'STOCK_DEDUCTION':
                // Lazy require para evitar ciclo de importação
                const InventoryService = require('./InventoryService').default;
                await InventoryService.processStockDeduction(task.payload.companyId, task.payload.orderItems, true);
                // true = isRetry (para não loopear de volta pra fila se falhar de novo, ou talvez queira)
                // Se falhar aqui (rede), vai cair no catch do processQueue e tentar de novo depois.
                // Importante: processStockDeduction NÃO deve chamar addTask se isRetry=true e o erro for de rede.
                break;

            default:
                console.warn(`[OfflineQueue] Tipo de tarefa desconhecido: ${task.type}`);
                break;
        }
    }
}

export default new OfflineQueueService();
