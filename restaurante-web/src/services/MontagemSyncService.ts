import { supabase } from '../config/SupabaseConfig';
import offlineQueueService from './OfflineQueueService';
import { isRetryableError } from '../utils/errors';

interface PersistMontagemToggleItemsParams {
  orderId: string;
  companyId?: string;
  payloadItems: any[];
  updatedAt: string;
  checked: boolean;
  targetUiKeys: string[];
  mutationIds: string[];
}

interface PersistMontagemToggleItemsResult {
  queued: boolean;
  queueOperationId?: string;
}

const OPERATION_TYPE = 'MONTAGEM_TOGGLE_ITEMS';

const executeMontagemToggleItems = async (payload: PersistMontagemToggleItemsParams) => {
  const { error } = await supabase
    .from('orders')
    .update({ items_with_status: payload.payloadItems, updated_at: payload.updatedAt })
    .eq('id', payload.orderId)
    .eq('company_id', payload.companyId);

  if (error) {
    throw new Error(`Supabase erro: ${error.message}`);
  }
};

offlineQueueService.registerOperationHandler(OPERATION_TYPE, executeMontagemToggleItems);

export async function persistMontagemToggleItems(
  params: PersistMontagemToggleItemsParams
): Promise<PersistMontagemToggleItemsResult> {
  const idempotencyKey = `${OPERATION_TYPE}:${params.orderId}:${params.mutationIds.join(',')}`;
  const operation = () => executeMontagemToggleItems(params);

  if (!offlineQueueService.getIsOnline()) {
    const queueOperationId = await offlineQueueService.enqueue(OPERATION_TYPE, operation, params, idempotencyKey);
    return { queued: true, queueOperationId };
  }

  try {
    await operation();
    return { queued: false };
  } catch (error: any) {
    if (isRetryableError(error) || error?.message?.includes('Network request failed') || error?.message?.includes('fetch')) {
      const queueOperationId = await offlineQueueService.enqueue(OPERATION_TYPE, operation, params, idempotencyKey);
      return { queued: true, queueOperationId };
    }

    throw error;
  }
}

export type { PersistMontagemToggleItemsParams, PersistMontagemToggleItemsResult };