/**
 * Payment Validation Service
 * 
 * Serviço para validar mudanças no status de pagamento (isPago).
 * Usa Cloud Function para validação server-side e criação de audit trail.
 */

import { getFunctions, httpsCallable } from 'firebase/functions';
import { doc, updateDoc, getDoc } from 'firebase/firestore';
import { db } from '../config/firebaseConfig';

export interface PaymentChangeResult {
  success: boolean;
  orderId: string;
  isPago: boolean;
  paymentRecordCreated: boolean;
  error?: string;
}

export interface PaymentValidationError extends Error {
  code: string;
  details?: any;
}

/**
 * Valida e atualiza status de pagamento de um pedido
 * 
 * @param orderId - ID do pedido
 * @param companyId - ID da empresa
 * @param isPago - Novo status de pagamento
 * @param useServerValidation - Se true, usa Cloud Function para validação (padrão: true)
 * @returns Resultado da operação
 */
export async function updatePaymentStatus(
  orderId: string,
  companyId: string,
  isPago: boolean,
  useServerValidation: boolean = true
): Promise<PaymentChangeResult> {
  try {
    // Busca valor atual do pedido
    const orderRef = doc(db, `companies/${companyId}/pedidos`, orderId);
    const orderDoc = await getDoc(orderRef);

    if (!orderDoc.exists()) {
      throw createPaymentError(
        'not-found',
        `Pedido não encontrado: ${orderId}`
      );
    }

    const orderData = orderDoc.data();
    const currentIsPago = orderData?.isPago || false;

    // Se valor não mudou, retorna sucesso sem fazer nada
    if (currentIsPago === isPago) {
      return {
        success: true,
        orderId,
        isPago,
        paymentRecordCreated: false
      };
    }

    // Se usar validação server-side (recomendado)
    if (useServerValidation) {
      return await updatePaymentStatusServerSide(
        orderId,
        companyId,
        isPago,
        currentIsPago
      );
    }

    // Fallback: atualização direta (não recomendado - sem validação de role)
    console.warn('[PaymentValidation] Atualizando isPago sem validação server-side');
    
    await updateDoc(orderRef, {
      isPago,
      lastModifiedAt: new Date()
    });

    return {
      success: true,
      orderId,
      isPago,
      paymentRecordCreated: false
    };

  } catch (error: any) {
    console.error('[PaymentValidation] Erro ao atualizar status de pagamento:', error);
    
    return {
      success: false,
      orderId,
      isPago,
      paymentRecordCreated: false,
      error: getErrorMessage(error)
    };
  }
}

/**
 * Atualiza status de pagamento usando Cloud Function para validação
 */
async function updatePaymentStatusServerSide(
  orderId: string,
  companyId: string,
  isPago: boolean,
  previousValue: boolean
): Promise<PaymentChangeResult> {
  try {
    const functions = getFunctions();
    const validatePaymentChange = httpsCallable(functions, 'validatePaymentChange');

    const result = await validatePaymentChange({
      orderId,
      companyId,
      isPago,
      previousValue
    });

    const data = result.data as any;

    return {
      success: data.success,
      orderId: data.orderId,
      isPago: data.isPago,
      paymentRecordCreated: data.paymentRecordCreated || false
    };

  } catch (error: any) {
    console.error('[PaymentValidation] Erro na validação server-side:', error);
    
    // Trata erros específicos da Cloud Function
    if (error.code === 'permission-denied') {
      throw createPaymentError(
        'permission-denied',
        'Você não tem permissão para modificar o status de pagamento. Apenas administradores e gerentes podem realizar esta ação.',
        error
      );
    }

    if (error.code === 'failed-precondition') {
      throw createPaymentError(
        'stale-data',
        'O pedido foi modificado por outro usuário. Por favor, recarregue e tente novamente.',
        error
      );
    }

    if (error.code === 'unauthenticated') {
      throw createPaymentError(
        'unauthenticated',
        'Você precisa estar autenticado para modificar o status de pagamento.',
        error
      );
    }

    // Erro genérico
    throw createPaymentError(
      'unknown',
      'Erro ao validar mudança de pagamento. Tente novamente.',
      error
    );
  }
}

/**
 * Busca registros de pagamento de um pedido
 */
export async function getPaymentRecords(
  orderId: string,
  companyId: string
): Promise<any[]> {
  try {
    const { collection, query, where, getDocs } = await import('firebase/firestore');
    
    const paymentsRef = collection(db, `companies/${companyId}/payments`);
    const q = query(paymentsRef, where('orderId', '==', orderId));
    const snapshot = await getDocs(q);

    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

  } catch (error) {
    console.error('[PaymentValidation] Erro ao buscar registros de pagamento:', error);
    return [];
  }
}

/**
 * Verifica se um pedido tem registro de pagamento imutável
 */
export async function hasImmutablePaymentRecord(
  orderId: string,
  companyId: string
): Promise<boolean> {
  const records = await getPaymentRecords(orderId, companyId);
  return records.some(record => record.immutable === true);
}

/**
 * Busca audit logs de mudanças de pagamento de um pedido
 */
export async function getPaymentAuditLogs(
  orderId: string,
  companyId: string
): Promise<any[]> {
  try {
    const { collection, query, where, getDocs, orderBy } = await import('firebase/firestore');
    
    const auditRef = collection(db, 'audit');
    const q = query(
      auditRef,
      where('resourceId', '==', orderId),
      where('companyId', '==', companyId),
      where('eventType', '==', 'order.payment_changed'),
      orderBy('timestamp', 'desc')
    );
    
    const snapshot = await getDocs(q);

    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

  } catch (error) {
    console.error('[PaymentValidation] Erro ao buscar audit logs:', error);
    return [];
  }
}

/**
 * Cria erro customizado de validação de pagamento
 */
function createPaymentError(
  code: string,
  message: string,
  originalError?: any
): PaymentValidationError {
  const error = new Error(message) as PaymentValidationError;
  error.name = 'PaymentValidationError';
  error.code = code;
  error.details = originalError;
  return error;
}

/**
 * Extrai mensagem de erro user-friendly
 */
function getErrorMessage(error: any): string {
  if (error instanceof Error) {
    return error.message;
  }
  
  if (error.code) {
    const messages: Record<string, string> = {
      'permission-denied': 'Você não tem permissão para modificar o status de pagamento.',
      'unauthenticated': 'Você precisa estar autenticado.',
      'not-found': 'Pedido não encontrado.',
      'failed-precondition': 'O pedido foi modificado. Recarregue e tente novamente.',
      'stale-data': 'Dados desatualizados. Recarregue e tente novamente.'
    };
    
    return messages[error.code] || 'Erro ao atualizar status de pagamento.';
  }
  
  return 'Erro desconhecido ao atualizar status de pagamento.';
}

/**
 * Valida se usuário tem permissão para modificar isPago
 * (baseado em custom claims)
 */
export function canModifyPaymentStatus(userRole?: string): boolean {
  if (!userRole) {
    return false;
  }
  
  return ['admin', 'manager'].includes(userRole.toLowerCase());
}
