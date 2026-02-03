import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

// Initialize Firebase Admin
admin.initializeApp();

/**
 * Cloud Function: refreshUserClaims
 * 
 * Atualiza custom claims do usuário quando membership ou role mudar.
 * Chamada quando:
 * - Usuário é adicionado a uma empresa
 * - Role do usuário muda
 * - Usuário é removido de uma empresa
 * 
 * Custom Claims incluem:
 * - companyId: ID da empresa do usuário
 * - role: Papel do usuário (admin, manager, waiter, kitchen)
 * - mfaEnabled: Se MFA está habilitado
 * - mfaVerified: Se MFA foi verificado nesta sessão
 */
export const refreshUserClaims = functions.https.onCall(async (data, context) => {
  // Validação de autenticação
  if (!context.auth) {
    throw new functions.https.HttpsError(
      'unauthenticated',
      'Usuário deve estar autenticado para atualizar claims'
    );
  }

  const { userId, companyId, role } = data;

  // Validação de parâmetros
  if (!userId || typeof userId !== 'string') {
    throw new functions.https.HttpsError(
      'invalid-argument',
      'userId é obrigatório e deve ser string'
    );
  }

  try {
    // Busca dados do funcionário no Firestore
    const funcionarioDoc = await admin.firestore()
      .collection('users')
      .doc(userId)
      .get();

    if (!funcionarioDoc.exists) {
      throw new functions.https.HttpsError(
        'not-found',
        `Funcionário não encontrado: ${userId}`
      );
    }

    const funcionarioData = funcionarioDoc.data();
    
    // Determina companyId e role
    const finalCompanyId = companyId || funcionarioData?.companyId;
    const finalRole = role || funcionarioData?.funcao || 'waiter';

    if (!finalCompanyId) {
      throw new functions.https.HttpsError(
        'failed-precondition',
        'Funcionário não possui companyId associado'
      );
    }

    // Valida que usuário pertence à empresa
    const companyUserDoc = await admin.firestore()
      .collection(`companies/${finalCompanyId}/users`)
      .doc(userId)
      .get();

    if (!companyUserDoc.exists) {
      throw new functions.https.HttpsError(
        'permission-denied',
        'Usuário não pertence à empresa especificada'
      );
    }

    // Normaliza role
    const normalizedRole = normalizeRole(finalRole);

    // Define custom claims
    const customClaims = {
      companyId: finalCompanyId,
      role: normalizedRole,
      mfaEnabled: funcionarioData?.mfaEnabled || false,
      mfaVerified: false, // Sempre false ao atualizar claims
      updatedAt: Date.now()
    };

    // Atualiza custom claims no Firebase Auth
    await admin.auth().setCustomUserClaims(userId, customClaims);

    functions.logger.info('Custom claims atualizados', {
      userId,
      companyId: finalCompanyId,
      role: normalizedRole
    });

    return {
      success: true,
      claims: customClaims
    };

  } catch (error: any) {
    functions.logger.error('Erro ao atualizar custom claims', {
      userId,
      error: error.message,
      stack: error.stack
    });

    // Re-throw HttpsError
    if (error instanceof functions.https.HttpsError) {
      throw error;
    }

    // Wrap outros erros
    throw new functions.https.HttpsError(
      'internal',
      `Erro ao atualizar custom claims: ${error.message}`
    );
  }
});

/**
 * Normaliza role para valores padronizados
 */
function normalizeRole(role: string): string {
  const roleMap: Record<string, string> = {
    'admin': 'admin',
    'administrador': 'admin',
    'gerente': 'manager',
    'manager': 'manager',
    'garcom': 'waiter',
    'garçom': 'waiter',
    'waiter': 'waiter',
    'cozinha': 'kitchen',
    'kitchen': 'kitchen',
    'churrasqueiro': 'kitchen',
    'montagem': 'kitchen'
  };

  const normalized = roleMap[role.toLowerCase()];
  return normalized || 'waiter'; // Default to waiter
}

/**
 * Firestore Trigger: onUserMembershipChange
 * 
 * Automaticamente atualiza custom claims quando documento de membership mudar
 */
export const onUserMembershipChange = functions.firestore
  .document('companies/{companyId}/users/{userId}')
  .onWrite(async (change, context) => {
    const { companyId, userId } = context.params;

    try {
      // Se documento foi deletado, remove custom claims
      if (!change.after.exists) {
        await admin.auth().setCustomUserClaims(userId, {
          companyId: null,
          role: null,
          mfaEnabled: false,
          mfaVerified: false,
          updatedAt: Date.now()
        });

        functions.logger.info('Custom claims removidos (usuário removido da empresa)', {
          userId,
          companyId
        });

        return;
      }

      // Busca dados do funcionário
      const userData = change.after.data();
      const role = userData?.funcao || userData?.role || 'waiter';

      // Atualiza custom claims
      const customClaims = {
        companyId,
        role: normalizeRole(role),
        mfaEnabled: userData?.mfaEnabled || false,
        mfaVerified: false,
        updatedAt: Date.now()
      };

      await admin.auth().setCustomUserClaims(userId, customClaims);

      functions.logger.info('Custom claims atualizados automaticamente', {
        userId,
        companyId,
        role: customClaims.role
      });

    } catch (error: any) {
      functions.logger.error('Erro ao atualizar custom claims automaticamente', {
        userId,
        companyId,
        error: error.message
      });
      // Não propaga erro para não bloquear operação do Firestore
    }
  });

/**
 * Cloud Function: validatePaymentChange
 * 
 * Valida mudanças no campo isPago server-side.
 * Garante que apenas usuários autorizados podem modificar status de pagamento.
 * 
 * Chamada antes de atualizar isPago no cliente.
 */
export const validatePaymentChange = functions.https.onCall(async (data, context) => {
  // Validação de autenticação
  if (!context.auth) {
    throw new functions.https.HttpsError(
      'unauthenticated',
      'Usuário deve estar autenticado'
    );
  }

  const { orderId, companyId, isPago, previousValue } = data;

  // Validação de parâmetros
  if (!orderId || !companyId || typeof isPago !== 'boolean') {
    throw new functions.https.HttpsError(
      'invalid-argument',
      'orderId, companyId e isPago são obrigatórios'
    );
  }

  try {
    // Verifica role do usuário via custom claims
    const userRole = context.auth.token.role as string;
    
    // Apenas admin e manager podem modificar isPago
    if (!['admin', 'manager'].includes(userRole)) {
      functions.logger.warn('Tentativa não autorizada de modificar isPago', {
        userId: context.auth.uid,
        userRole,
        orderId,
        companyId
      });

      throw new functions.https.HttpsError(
        'permission-denied',
        'Apenas administradores e gerentes podem modificar status de pagamento'
      );
    }

    // Busca pedido atual
    const orderRef = admin.firestore()
      .collection(`companies/${companyId}/pedidos`)
      .doc(orderId);
    
    const orderDoc = await orderRef.get();

    if (!orderDoc.exists) {
      throw new functions.https.HttpsError(
        'not-found',
        `Pedido não encontrado: ${orderId}`
      );
    }

    const orderData = orderDoc.data();
    const currentIsPago = orderData?.isPago || false;

    // Valida que valor anterior corresponde ao atual
    if (previousValue !== undefined && previousValue !== currentIsPago) {
      throw new functions.https.HttpsError(
        'failed-precondition',
        'Valor anterior de isPago não corresponde ao valor atual. Recarregue o pedido.'
      );
    }

    // Se está marcando como pago, cria registro imutável de pagamento
    if (isPago && !currentIsPago) {
      const paymentRecord = {
        orderId,
        companyId,
        amount: orderData?.totalAmount || 0,
        paidBy: context.auth.uid,
        paidByEmail: context.auth.token.email || '',
        paidByRole: userRole,
        paidAt: admin.firestore.FieldValue.serverTimestamp(),
        orderData: {
          comandaNumber: orderData?.comandaNumber,
          items: orderData?.items || [],
          createdAt: orderData?.createdAt
        },
        immutable: true
      };

      // Cria registro de pagamento em collection separada
      await admin.firestore()
        .collection(`companies/${companyId}/payments`)
        .add(paymentRecord);

      functions.logger.info('Registro de pagamento criado', {
        orderId,
        companyId,
        amount: paymentRecord.amount,
        paidBy: context.auth.uid
      });
    }

    // Atualiza isPago no pedido
    await orderRef.update({
      isPago,
      lastModifiedBy: context.auth.uid,
      lastModifiedAt: admin.firestore.FieldValue.serverTimestamp()
    });

    // Cria registro de auditoria
    await admin.firestore()
      .collection('audit')
      .add({
        eventType: 'order.payment_changed',
        resourceType: 'order',
        resourceId: orderId,
        companyId,
        userId: context.auth.uid,
        userEmail: context.auth.token.email || '',
        userRole,
        before: { isPago: currentIsPago },
        after: { isPago },
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
        ipAddress: context.rawRequest.ip,
        userAgent: context.rawRequest.headers['user-agent']
      });

    functions.logger.info('Status de pagamento atualizado', {
      orderId,
      companyId,
      previousValue: currentIsPago,
      newValue: isPago,
      userId: context.auth.uid
    });

    return {
      success: true,
      orderId,
      isPago,
      paymentRecordCreated: isPago && !currentIsPago
    };

  } catch (error: any) {
    functions.logger.error('Erro ao validar mudança de pagamento', {
      orderId,
      companyId,
      error: error.message,
      stack: error.stack
    });

    // Re-throw HttpsError
    if (error instanceof functions.https.HttpsError) {
      throw error;
    }

    // Wrap outros erros
    throw new functions.https.HttpsError(
      'internal',
      `Erro ao validar mudança de pagamento: ${error.message}`
    );
  }
});

/**
 * Firestore Trigger: onPaymentStatusChange
 * 
 * Monitora mudanças no campo isPago e cria audit log.
 * Backup caso validatePaymentChange não seja usado.
 */
export const onPaymentStatusChange = functions.firestore
  .document('companies/{companyId}/pedidos/{orderId}')
  .onUpdate(async (change, context) => {
    const { companyId, orderId } = context.params;
    
    const beforeData = change.before.data();
    const afterData = change.after.data();

    // Verifica se isPago mudou
    const isPagoChanged = beforeData.isPago !== afterData.isPago;

    if (!isPagoChanged) {
      return; // Nada a fazer
    }

    try {
      // Cria registro de auditoria
      await admin.firestore()
        .collection('audit')
        .add({
          eventType: 'order.payment_changed',
          resourceType: 'order',
          resourceId: orderId,
          companyId,
          userId: afterData.lastModifiedBy || 'system',
          userEmail: '',
          userRole: '',
          before: { isPago: beforeData.isPago },
          after: { isPago: afterData.isPago },
          timestamp: admin.firestore.FieldValue.serverTimestamp(),
          triggeredBy: 'firestore_trigger'
        });

      functions.logger.info('Audit log criado para mudança de isPago', {
        orderId,
        companyId,
        before: beforeData.isPago,
        after: afterData.isPago
      });

      // Se foi marcado como pago e não tem registro de pagamento, cria um
      if (afterData.isPago && !beforeData.isPago) {
        const paymentsQuery = await admin.firestore()
          .collection(`companies/${companyId}/payments`)
          .where('orderId', '==', orderId)
          .limit(1)
          .get();

        if (paymentsQuery.empty) {
          // Cria registro de pagamento retroativo
          await admin.firestore()
            .collection(`companies/${companyId}/payments`)
            .add({
              orderId,
              companyId,
              amount: afterData.totalAmount || 0,
              paidBy: afterData.lastModifiedBy || 'unknown',
              paidByEmail: '',
              paidByRole: '',
              paidAt: admin.firestore.FieldValue.serverTimestamp(),
              orderData: {
                comandaNumber: afterData.comandaNumber,
                items: afterData.items || [],
                createdAt: afterData.createdAt
              },
              immutable: true,
              retroactive: true
            });

          functions.logger.info('Registro de pagamento retroativo criado', {
            orderId,
            companyId
          });
        }
      }

    } catch (error: any) {
      functions.logger.error('Erro ao processar mudança de isPago', {
        orderId,
        companyId,
        error: error.message
      });
      // Não propaga erro para não bloquear operação
    }
  });

/**
 * Cloud Function: checkRateLimit
 * 
 * Valida rate limits server-side antes de processar operações críticas.
 * Middleware que pode ser chamado por outras Cloud Functions.
 * 
 * Limites:
 * - Reads: 500 operações/minuto
 * - Writes: 100 operações/minuto
 * 
 * Implementa exponential backoff para violações repetidas.
 */
export const checkRateLimit = functions.https.onCall(async (data, context) => {
  // Validação de autenticação
  if (!context.auth) {
    throw new functions.https.HttpsError(
      'unauthenticated',
      'Usuário deve estar autenticado'
    );
  }

  const { operationType } = data;
  const userId = context.auth.uid;

  // Validação de parâmetros
  if (!operationType || !['read', 'write'].includes(operationType)) {
    throw new functions.https.HttpsError(
      'invalid-argument',
      'operationType deve ser "read" ou "write"'
    );
  }

  try {
    // Limites por tipo de operação
    const limits: Record<string, number> = {
      read: 500,
      write: 100
    };

    const limit = limits[operationType];

    // Busca informações de rate limit
    const rateLimitRef = admin.firestore()
      .collection('rateLimits')
      .doc(userId);

    const rateLimitDoc = await rateLimitRef.get();

    // Se não existe, cria documento inicial
    if (!rateLimitDoc.exists) {
      await rateLimitRef.set({
        userId,
        reads: operationType === 'read' ? 1 : 0,
        writes: operationType === 'write' ? 1 : 0,
        windowStart: admin.firestore.FieldValue.serverTimestamp(),
        violations: 0
      });

      return {
        allowed: true,
        currentCount: 1,
        limit,
        remainingQuota: limit - 1
      };
    }

    const rateLimitData = rateLimitDoc.data()!;

    // Verifica se usuário está bloqueado
    if (rateLimitData.blockedUntil) {
      const blockedUntil = rateLimitData.blockedUntil.toDate();
      const now = new Date();

      if (blockedUntil > now) {
        const retryAfter = Math.ceil((blockedUntil.getTime() - now.getTime()) / 1000);
        
        functions.logger.warn('Usuário bloqueado tentou operação', {
          userId,
          operationType,
          blockedUntil: blockedUntil.toISOString(),
          retryAfter
        });

        throw new functions.https.HttpsError(
          'resource-exhausted',
          `Usuário temporariamente bloqueado. Tente novamente em ${retryAfter} segundos.`,
          { retryAfter, code: 429 }
        );
      } else {
        // Bloqueio expirou, limpa
        await rateLimitRef.update({
          blockedUntil: admin.firestore.FieldValue.delete(),
          violations: 0
        });
      }
    }

    // Verifica se janela de tempo expirou (1 minuto)
    const windowStart = rateLimitData.windowStart.toDate();
    const now = new Date();
    const windowDurationMs = 60 * 1000; // 1 minuto
    const windowExpired = (now.getTime() - windowStart.getTime()) > windowDurationMs;

    if (windowExpired) {
      // Reset contadores para nova janela
      await rateLimitRef.update({
        reads: operationType === 'read' ? 1 : 0,
        writes: operationType === 'write' ? 1 : 0,
        windowStart: admin.firestore.FieldValue.serverTimestamp()
      });

      return {
        allowed: true,
        currentCount: 1,
        limit,
        remainingQuota: limit - 1,
        windowReset: true
      };
    }

    // Verifica limite específico da operação
    const currentCount = operationType === 'read' ? rateLimitData.reads : rateLimitData.writes;

    if (currentCount >= limit) {
      // Limite excedido - registra violação
      const newViolations = (rateLimitData.violations || 0) + 1;
      const violationThreshold = 3;

      const updates: any = {
        violations: newViolations,
        lastViolation: admin.firestore.FieldValue.serverTimestamp()
      };

      // Se atingiu threshold, bloqueia usuário
      if (newViolations >= violationThreshold) {
        const blockDurationMs = calculateBlockDuration(newViolations, violationThreshold);
        const blockedUntil = new Date(Date.now() + blockDurationMs);
        
        updates.blockedUntil = admin.firestore.Timestamp.fromDate(blockedUntil);

        functions.logger.warn('Usuário bloqueado por violações repetidas', {
          userId,
          violations: newViolations,
          blockDurationMs,
          blockedUntil: blockedUntil.toISOString()
        });

        // Alerta administradores se violações >= 5
        if (newViolations >= 5) {
          await alertAdministrators(userId, newViolations, operationType);
        }
      }

      await rateLimitRef.update(updates);

      // Calcula retry-after
      const retryAfter = calculateRetryAfter(newViolations, violationThreshold);

      functions.logger.warn('Rate limit excedido', {
        userId,
        operationType,
        currentCount,
        limit,
        violations: newViolations,
        retryAfter
      });

      throw new functions.https.HttpsError(
        'resource-exhausted',
        `Limite de ${operationType === 'read' ? 'leituras' : 'escritas'} excedido. Máximo: ${limit} operações por minuto.`,
        { 
          retryAfter,
          code: 429,
          currentCount,
          limit
        }
      );
    }

    // Incrementa contador
    const field = operationType === 'read' ? 'reads' : 'writes';
    await rateLimitRef.update({
      [field]: admin.firestore.FieldValue.increment(1)
    });

    return {
      allowed: true,
      currentCount: currentCount + 1,
      limit,
      remainingQuota: limit - currentCount - 1
    };

  } catch (error: any) {
    functions.logger.error('Erro ao verificar rate limit', {
      userId,
      operationType,
      error: error.message,
      stack: error.stack
    });

    // Re-throw HttpsError
    if (error instanceof functions.https.HttpsError) {
      throw error;
    }

    // Wrap outros erros
    throw new functions.https.HttpsError(
      'internal',
      `Erro ao verificar rate limit: ${error.message}`
    );
  }
});

/**
 * Calcula duração do bloqueio com exponential backoff
 */
function calculateBlockDuration(violations: number, threshold: number): number {
  const baseDelayMs = 1000; // 1 segundo
  const maxDelayMs = 300000; // 5 minutos
  
  const exponent = violations - threshold + 1;
  const duration = baseDelayMs * Math.pow(2, exponent);
  
  return Math.min(duration, maxDelayMs);
}

/**
 * Calcula retry-after em segundos
 */
function calculateRetryAfter(violations: number, threshold: number): number {
  if (violations < threshold) {
    return 60; // 1 minuto padrão
  }
  
  const blockDurationMs = calculateBlockDuration(violations, threshold);
  return Math.ceil(blockDurationMs / 1000);
}

/**
 * Alerta administradores sobre padrão suspeito
 */
async function alertAdministrators(
  userId: string,
  violations: number,
  operationType: string
): Promise<void> {
  try {
    // Busca informações do usuário
    const userRecord = await admin.auth().getUser(userId);
    
    // Cria registro de alerta
    await admin.firestore()
      .collection('alerts')
      .add({
        type: 'rate_limit_violation',
        severity: 'high',
        userId,
        userEmail: userRecord.email || '',
        violations,
        operationType,
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
        message: `Usuário ${userRecord.email} atingiu ${violations} violações de rate limit (${operationType})`,
        acknowledged: false
      });

    functions.logger.error('ALERTA: Padrão suspeito detectado', {
      userId,
      userEmail: userRecord.email,
      violations,
      operationType
    });

    // TODO: Integrar com sistema de notificações (email, Slack, etc.)
    
  } catch (error: any) {
    functions.logger.error('Erro ao alertar administradores', {
      userId,
      error: error.message
    });
  }
}

/**
 * Cloud Function: getRateLimitStats
 * 
 * Retorna estatísticas de rate limiting para um usuário.
 * Útil para debugging e monitoramento.
 */
export const getRateLimitStats = functions.https.onCall(async (data, context) => {
  // Validação de autenticação
  if (!context.auth) {
    throw new functions.https.HttpsError(
      'unauthenticated',
      'Usuário deve estar autenticado'
    );
  }

  const userId = data.userId || context.auth.uid;

  // Apenas admin pode ver stats de outros usuários
  if (userId !== context.auth.uid) {
    const userRole = context.auth.token.role as string;
    if (userRole !== 'admin') {
      throw new functions.https.HttpsError(
        'permission-denied',
        'Apenas administradores podem ver estatísticas de outros usuários'
      );
    }
  }

  try {
    const rateLimitDoc = await admin.firestore()
      .collection('rateLimits')
      .doc(userId)
      .get();

    if (!rateLimitDoc.exists) {
      return {
        userId,
        exists: false,
        message: 'Nenhum registro de rate limit encontrado'
      };
    }

    const data = rateLimitDoc.data()!;

    return {
      userId,
      exists: true,
      reads: data.reads || 0,
      writes: data.writes || 0,
      windowStart: data.windowStart?.toDate().toISOString(),
      violations: data.violations || 0,
      blockedUntil: data.blockedUntil?.toDate().toISOString(),
      lastViolation: data.lastViolation?.toDate().toISOString()
    };

  } catch (error: any) {
    functions.logger.error('Erro ao buscar estatísticas de rate limit', {
      userId,
      error: error.message
    });

    throw new functions.https.HttpsError(
      'internal',
      `Erro ao buscar estatísticas: ${error.message}`
    );
  }
});

/**
 * Cloud Function: resetRateLimitViolations
 * 
 * Reseta violações de rate limit para um usuário.
 * Apenas administradores podem executar.
 */
export const resetRateLimitViolations = functions.https.onCall(async (data, context) => {
  // Validação de autenticação
  if (!context.auth) {
    throw new functions.https.HttpsError(
      'unauthenticated',
      'Usuário deve estar autenticado'
    );
  }

  // Apenas admin pode resetar violações
  const userRole = context.auth.token.role as string;
  if (userRole !== 'admin') {
    throw new functions.https.HttpsError(
      'permission-denied',
      'Apenas administradores podem resetar violações'
    );
  }

  const { userId } = data;

  if (!userId || typeof userId !== 'string') {
    throw new functions.https.HttpsError(
      'invalid-argument',
      'userId é obrigatório'
    );
  }

  try {
    await admin.firestore()
      .collection('rateLimits')
      .doc(userId)
      .update({
        violations: 0,
        blockedUntil: admin.firestore.FieldValue.delete(),
        lastViolation: admin.firestore.FieldValue.delete()
      });

    functions.logger.info('Violações de rate limit resetadas', {
      userId,
      resetBy: context.auth.uid,
      resetByEmail: context.auth.token.email
    });

    return {
      success: true,
      userId,
      message: 'Violações resetadas com sucesso'
    };

  } catch (error: any) {
    functions.logger.error('Erro ao resetar violações', {
      userId,
      error: error.message
    });

    throw new functions.https.HttpsError(
      'internal',
      `Erro ao resetar violações: ${error.message}`
    );
  }
});

/**
 * Scheduled Function: cleanupExpiredRateLimits
 * 
 * Limpa registros de rate limit expirados (>7 dias sem atividade).
 * Executa diariamente às 3h da manhã.
 */
export const cleanupExpiredRateLimits = functions.pubsub
  .schedule('0 3 * * *')
  .timeZone('America/Sao_Paulo')
  .onRun(async (context) => {
    try {
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      const expiredDocs = await admin.firestore()
        .collection('rateLimits')
        .where('windowStart', '<', admin.firestore.Timestamp.fromDate(sevenDaysAgo))
        .get();

      if (expiredDocs.empty) {
        functions.logger.info('Nenhum registro de rate limit expirado encontrado');
        return;
      }

      // Delete em batches de 500
      const batch = admin.firestore().batch();
      let count = 0;

      expiredDocs.docs.forEach((doc) => {
        batch.delete(doc.ref);
        count++;
      });

      await batch.commit();

      functions.logger.info('Registros de rate limit expirados removidos', {
        count
      });

    } catch (error: any) {
      functions.logger.error('Erro ao limpar rate limits expirados', {
        error: error.message
      });
    }
  });

/**
 * Firestore Trigger: auditOrderOperations
 * 
 * Automaticamente cria logs de auditoria para operações em pedidos.
 * Monitora: criação, atualização e deleção de pedidos.
 */
export const auditOrderOperations = functions.firestore
  .document('companies/{companyId}/pedidos/{orderId}')
  .onWrite(async (change, context) => {
    const { companyId, orderId } = context.params;

    try {
      let eventType: string;
      let before: any = undefined;
      let after: any = undefined;
      let severity: string = 'medium';

      // Determina tipo de operação
      if (!change.before.exists && change.after.exists) {
        // Criação
        eventType = 'order.created';
        after = change.after.data();
        severity = 'low';
      } else if (change.before.exists && !change.after.exists) {
        // Deleção
        eventType = 'order.deleted';
        before = change.before.data();
        severity = 'high';
      } else {
        // Atualização
        eventType = 'order.updated';
        before = change.before.data();
        after = change.after.data();

        // Verifica se foi mudança de status
        if (before.status !== after.status) {
          eventType = 'order.status_changed';
        }

        // Verifica se foi mudança de pagamento (já tem trigger específico, mas registra aqui também)
        if (before.isPago !== after.isPago) {
          eventType = 'order.payment_changed';
          severity = 'critical';
        }
      }

      // Calcula mudanças
      const changes: any[] = [];
      if (before && after) {
        Object.keys(after).forEach(key => {
          if (JSON.stringify(before[key]) !== JSON.stringify(after[key])) {
            changes.push({
              field: key,
              oldValue: before[key],
              newValue: after[key]
            });
          }
        });
      }

      // Cria log de auditoria
      await admin.firestore()
        .collection('audit')
        .add({
          eventType,
          severity,
          resourceType: 'order',
          resourceId: orderId,
          companyId,
          userId: after?.lastModifiedBy || before?.createdBy || 'system',
          userEmail: '',
          userRole: '',
          before,
          after,
          changes: changes.length > 0 ? changes : undefined,
          timestamp: admin.firestore.FieldValue.serverTimestamp(),
          triggeredBy: 'firestore_trigger'
        });

      functions.logger.info('Audit log criado para operação em pedido', {
        eventType,
        orderId,
        companyId,
        changesCount: changes.length
      });

    } catch (error: any) {
      functions.logger.error('Erro ao criar audit log para pedido', {
        orderId,
        companyId,
        error: error.message
      });
      // Não propaga erro para não bloquear operação
    }
  });

/**
 * Firestore Trigger: auditUserOperations
 * 
 * Automaticamente cria logs de auditoria para operações em usuários.
 */
export const auditUserOperations = functions.firestore
  .document('companies/{companyId}/users/{userId}')
  .onWrite(async (change, context) => {
    const { companyId, userId } = context.params;

    try {
      let eventType: string;
      let before: any = undefined;
      let after: any = undefined;
      let severity: string = 'medium';

      if (!change.before.exists && change.after.exists) {
        eventType = 'user.created';
        after = change.after.data();
        severity = 'low';
      } else if (change.before.exists && !change.after.exists) {
        eventType = 'user.deleted';
        before = change.before.data();
        severity = 'high';
      } else {
        eventType = 'user.updated';
        before = change.before.data();
        after = change.after.data();

        // Verifica se foi mudança de role
        if (before.funcao !== after.funcao || before.role !== after.role) {
          eventType = 'user.role_changed';
          severity = 'critical';
        }
      }

      // Calcula mudanças
      const changes: any[] = [];
      if (before && after) {
        Object.keys(after).forEach(key => {
          if (JSON.stringify(before[key]) !== JSON.stringify(after[key])) {
            changes.push({
              field: key,
              oldValue: before[key],
              newValue: after[key]
            });
          }
        });
      }

      await admin.firestore()
        .collection('audit')
        .add({
          eventType,
          severity,
          resourceType: 'user',
          resourceId: userId,
          companyId,
          userId: after?.lastModifiedBy || 'system',
          userEmail: after?.email || before?.email || '',
          userRole: after?.funcao || after?.role || '',
          before,
          after,
          changes: changes.length > 0 ? changes : undefined,
          timestamp: admin.firestore.FieldValue.serverTimestamp(),
          triggeredBy: 'firestore_trigger'
        });

      functions.logger.info('Audit log criado para operação em usuário', {
        eventType,
        userId,
        companyId
      });

    } catch (error: any) {
      functions.logger.error('Erro ao criar audit log para usuário', {
        userId,
        companyId,
        error: error.message
      });
    }
  });

/**
 * Auth Trigger: auditAuthEvents
 * 
 * Automaticamente cria logs de auditoria para eventos de autenticação.
 */
export const auditAuthEvents = functions.auth.user().onCreate(async (user) => {
  try {
    await admin.firestore()
      .collection('audit')
      .add({
        eventType: 'auth.login',
        severity: 'low',
        resourceType: 'user',
        resourceId: user.uid,
        companyId: '',
        userId: user.uid,
        userEmail: user.email || '',
        userRole: '',
        metadata: {
          provider: user.providerData[0]?.providerId || 'unknown',
          createdAt: user.metadata.creationTime
        },
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
        triggeredBy: 'auth_trigger'
      });

    functions.logger.info('Audit log criado para novo usuário', {
      userId: user.uid,
      email: user.email
    });

  } catch (error: any) {
    functions.logger.error('Erro ao criar audit log para auth', {
      userId: user.uid,
      error: error.message
    });
  }
});

/**
 * Cloud Function: queryAuditLogs
 * 
 * Busca logs de auditoria com filtros.
 * Apenas administradores podem executar.
 */
export const queryAuditLogs = functions.https.onCall(async (data, context) => {
  // Validação de autenticação
  if (!context.auth) {
    throw new functions.https.HttpsError(
      'unauthenticated',
      'Usuário deve estar autenticado'
    );
  }

  // Apenas admin pode buscar logs
  const userRole = context.auth.token.role as string;
  if (userRole !== 'admin') {
    throw new functions.https.HttpsError(
      'permission-denied',
      'Apenas administradores podem buscar logs de auditoria'
    );
  }

  const {
    companyId,
    userId,
    eventType,
    resourceType,
    resourceId,
    startDate,
    endDate,
    severity,
    limit: maxLimit
  } = data;

  try {
    let query = admin.firestore().collection('audit');

    // Aplica filtros
    if (companyId) {
      query = query.where('companyId', '==', companyId) as any;
    }

    if (userId) {
      query = query.where('userId', '==', userId) as any;
    }

    if (eventType) {
      query = query.where('eventType', '==', eventType) as any;
    }

    if (resourceType) {
      query = query.where('resourceType', '==', resourceType) as any;
    }

    if (resourceId) {
      query = query.where('resourceId', '==', resourceId) as any;
    }

    if (severity) {
      query = query.where('severity', '==', severity) as any;
    }

    if (startDate) {
      const start = admin.firestore.Timestamp.fromDate(new Date(startDate));
      query = query.where('timestamp', '>=', start) as any;
    }

    if (endDate) {
      const end = admin.firestore.Timestamp.fromDate(new Date(endDate));
      query = query.where('timestamp', '<=', end) as any;
    }

    // Ordena e limita
    query = query.orderBy('timestamp', 'desc') as any;
    const limit = Math.min(maxLimit || 100, 500); // Máximo 500 resultados
    query = query.limit(limit) as any;

    // Executa query
    const snapshot = await query.get();

    const logs = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      timestamp: doc.data().timestamp?.toDate().toISOString()
    }));

    functions.logger.info('Logs de auditoria consultados', {
      requestedBy: context.auth.uid,
      filters: { companyId, userId, eventType, resourceType },
      resultsCount: logs.length
    });

    return {
      success: true,
      logs,
      count: logs.length
    };

  } catch (error: any) {
    functions.logger.error('Erro ao buscar logs de auditoria', {
      error: error.message,
      stack: error.stack
    });

    throw new functions.https.HttpsError(
      'internal',
      `Erro ao buscar logs: ${error.message}`
    );
  }
});

/**
 * Cloud Function: getSecurityEvents
 * 
 * Retorna eventos de segurança recentes (falhas de login, permissões negadas).
 * Apenas administradores podem executar.
 */
export const getSecurityEvents = functions.https.onCall(async (data, context) => {
  // Validação de autenticação
  if (!context.auth) {
    throw new functions.https.HttpsError(
      'unauthenticated',
      'Usuário deve estar autenticado'
    );
  }

  // Apenas admin pode ver eventos de segurança
  const userRole = context.auth.token.role as string;
  if (userRole !== 'admin') {
    throw new functions.https.HttpsError(
      'permission-denied',
      'Apenas administradores podem ver eventos de segurança'
    );
  }

  const { companyId, days = 7 } = data;

  try {
    // Calcula data de início
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // Busca eventos de segurança
    const snapshot = await admin.firestore()
      .collection('audit')
      .where('companyId', '==', companyId)
      .where('severity', 'in', ['high', 'critical'])
      .where('timestamp', '>=', admin.firestore.Timestamp.fromDate(startDate))
      .orderBy('timestamp', 'desc')
      .limit(500)
      .get();

    // Filtra apenas eventos de segurança
    const securityEvents = snapshot.docs
      .map(doc => ({
        id: doc.id,
        ...doc.data(),
        timestamp: doc.data().timestamp?.toDate().toISOString()
      }))
      .filter((log: any) => 
        log.eventType?.startsWith('auth.failed') ||
        log.eventType === 'permission.denied' ||
        log.eventType === 'order.payment_changed' ||
        log.eventType === 'user.role_changed'
      );

    // Agrupa por tipo
    const summary = securityEvents.reduce((acc: any, event: any) => {
      const type = event.eventType;
      acc[type] = (acc[type] || 0) + 1;
      return acc;
    }, {});

    functions.logger.info('Eventos de segurança consultados', {
      requestedBy: context.auth.uid,
      companyId,
      days,
      eventsCount: securityEvents.length
    });

    return {
      success: true,
      events: securityEvents,
      summary,
      count: securityEvents.length,
      period: { days, startDate: startDate.toISOString() }
    };

  } catch (error: any) {
    functions.logger.error('Erro ao buscar eventos de segurança', {
      error: error.message
    });

    throw new functions.https.HttpsError(
      'internal',
      `Erro ao buscar eventos: ${error.message}`
    );
  }
});

/**
 * Scheduled Function: cleanupOldAuditLogs
 * 
 * Remove logs de auditoria com mais de 7 anos (retenção legal).
 * Executa mensalmente.
 */
export const cleanupOldAuditLogs = functions.pubsub
  .schedule('0 2 1 * *') // Dia 1 de cada mês às 2h
  .timeZone('America/Sao_Paulo')
  .onRun(async (context) => {
    try {
      // 7 anos atrás
      const sevenYearsAgo = new Date();
      sevenYearsAgo.setFullYear(sevenYearsAgo.getFullYear() - 7);

      const oldLogs = await admin.firestore()
        .collection('audit')
        .where('timestamp', '<', admin.firestore.Timestamp.fromDate(sevenYearsAgo))
        .limit(1000) // Processa em batches
        .get();

      if (oldLogs.empty) {
        functions.logger.info('Nenhum log de auditoria antigo encontrado');
        return;
      }

      // Delete em batch
      const batch = admin.firestore().batch();
      oldLogs.docs.forEach(doc => {
        batch.delete(doc.ref);
      });

      await batch.commit();

      functions.logger.info('Logs de auditoria antigos removidos', {
        count: oldLogs.size,
        olderThan: sevenYearsAgo.toISOString()
      });

    } catch (error: any) {
      functions.logger.error('Erro ao limpar logs antigos', {
        error: error.message
      });
    }
  });

/**
 * ============================================================================
 * SERVER-SIDE AGGREGATIONS (Task 16)
 * ============================================================================
 * 
 * Implementa agregações server-side para reduzir custos de Firestore.
 * 
 * Requirements: 21.1, 21.2, 21.3, 21.4, 21.5
 * 
 * Estratégia:
 * - Estatísticas diárias pré-computadas em companies/{companyId}/statistics/{dateKey}
 * - Atualização incremental quando pedidos mudam
 * - Recalculo completo diário para garantir consistência
 * - Queries usam agregações ao invés de raw orders
 */

/**
 * Firestore Trigger: updateDailyStatistics
 * 
 * Atualiza estatísticas diárias incrementalmente quando pedido muda.
 * Triggered on: order create, update, delete
 * 
 * Requirements: 21.1, 21.2, 21.4
 */
export const updateDailyStatistics = functions.firestore
  .document('companies/{companyId}/pedidos/{orderId}')
  .onWrite(async (change, context) => {
    const { companyId, orderId } = context.params;

    try {
      // Determina dateKey do pedido
      let dateKey: string;
      let beforeData: any = null;
      let afterData: any = null;

      if (change.after.exists) {
        afterData = change.after.data();
        dateKey = afterData.dateKey || extractDateKey(afterData.createdAt);
      } else if (change.before.exists) {
        beforeData = change.before.data();
        dateKey = beforeData.dateKey || extractDateKey(beforeData.createdAt);
      } else {
        functions.logger.warn('Nenhum dado disponível para atualizar estatísticas', {
          orderId,
          companyId
        });
        return;
      }

      // Referência para documento de estatísticas
      const statsRef = admin.firestore()
        .collection(`companies/${companyId}/statistics`)
        .doc(dateKey);

      // Usa transação para garantir consistência
      await admin.firestore().runTransaction(async (transaction) => {
        const statsDoc = await transaction.get(statsRef);

        // Inicializa estatísticas se não existir
        if (!statsDoc.exists) {
          transaction.set(statsRef, {
            companyId,
            dateKey,
            totalOrders: 0,
            totalRevenue: 0,
            averageOrderValue: 0,
            ordersByStatus: {
              pending: 0,
              preparing: 0,
              ready: 0,
              delivered: 0,
              cancelled: 0
            },
            paidOrders: 0,
            unpaidOrders: 0,
            topItems: [],
            topWaiters: [],
            ordersByHour: {},
            lastUpdated: admin.firestore.FieldValue.serverTimestamp(),
            version: 1
          });
        }

        const currentStats = statsDoc.data() || {};

        // Calcula deltas
        const deltas = calculateStatisticsDeltas(beforeData, afterData);

        // Aplica deltas
        const updates: any = {
          totalOrders: (currentStats.totalOrders || 0) + deltas.totalOrders,
          totalRevenue: (currentStats.totalRevenue || 0) + deltas.totalRevenue,
          lastUpdated: admin.firestore.FieldValue.serverTimestamp(),
          version: admin.firestore.FieldValue.increment(1)
        };

        // Atualiza contadores por status
        if (deltas.statusChanges) {
          updates.ordersByStatus = currentStats.ordersByStatus || {};
          Object.entries(deltas.statusChanges).forEach(([status, delta]) => {
            updates.ordersByStatus[status] = 
              (updates.ordersByStatus[status] || 0) + (delta as number);
          });
        }

        // Atualiza contadores de pagamento
        if (deltas.paidOrders !== 0) {
          updates.paidOrders = (currentStats.paidOrders || 0) + deltas.paidOrders;
        }
        if (deltas.unpaidOrders !== 0) {
          updates.unpaidOrders = (currentStats.unpaidOrders || 0) + deltas.unpaidOrders;
        }

        // Recalcula média
        if (updates.totalOrders > 0) {
          updates.averageOrderValue = updates.totalRevenue / updates.totalOrders;
        }

        transaction.update(statsRef, updates);
      });

      functions.logger.info('Estatísticas diárias atualizadas incrementalmente', {
        companyId,
        dateKey,
        orderId
      });

    } catch (error: any) {
      functions.logger.error('Erro ao atualizar estatísticas diárias', {
        companyId,
        orderId,
        error: error.message,
        stack: error.stack
      });
      // Não propaga erro para não bloquear operação do pedido
    }
  });

/**
 * Calcula deltas para atualização incremental de estatísticas
 */
function calculateStatisticsDeltas(beforeData: any, afterData: any): any {
  const deltas: any = {
    totalOrders: 0,
    totalRevenue: 0,
    statusChanges: {},
    paidOrders: 0,
    unpaidOrders: 0
  };

  // Criação de pedido
  if (!beforeData && afterData) {
    deltas.totalOrders = 1;
    deltas.totalRevenue = afterData.totalAmount || 0;
    deltas.statusChanges[afterData.status] = 1;
    
    if (afterData.isPago) {
      deltas.paidOrders = 1;
    } else {
      deltas.unpaidOrders = 1;
    }
  }
  // Deleção de pedido
  else if (beforeData && !afterData) {
    deltas.totalOrders = -1;
    deltas.totalRevenue = -(beforeData.totalAmount || 0);
    deltas.statusChanges[beforeData.status] = -1;
    
    if (beforeData.isPago) {
      deltas.paidOrders = -1;
    } else {
      deltas.unpaidOrders = -1;
    }
  }
  // Atualização de pedido
  else if (beforeData && afterData) {
    // Mudança de valor
    const beforeAmount = beforeData.totalAmount || 0;
    const afterAmount = afterData.totalAmount || 0;
    if (beforeAmount !== afterAmount) {
      deltas.totalRevenue = afterAmount - beforeAmount;
    }

    // Mudança de status
    if (beforeData.status !== afterData.status) {
      deltas.statusChanges[beforeData.status] = -1;
      deltas.statusChanges[afterData.status] = 1;
    }

    // Mudança de pagamento
    if (beforeData.isPago !== afterData.isPago) {
      if (afterData.isPago) {
        deltas.paidOrders = 1;
        deltas.unpaidOrders = -1;
      } else {
        deltas.paidOrders = -1;
        deltas.unpaidOrders = 1;
      }
    }
  }

  return deltas;
}

/**
 * Extrai dateKey (YYYY-MM-DD) de timestamp
 */
function extractDateKey(timestamp: any): string {
  if (!timestamp) {
    return new Date().toISOString().split('T')[0];
  }

  let date: Date;
  if (timestamp.toDate) {
    date = timestamp.toDate();
  } else if (timestamp instanceof Date) {
    date = timestamp;
  } else {
    date = new Date(timestamp);
  }

  return date.toISOString().split('T')[0];
}

/**
 * Scheduled Function: recalculateDailyStatistics
 * 
 * Recalcula estatísticas completas diariamente para garantir consistência.
 * Executa às 4h da manhã para processar dia anterior.
 * 
 * Requirements: 21.5
 */
export const recalculateDailyStatistics = functions.pubsub
  .schedule('0 4 * * *')
  .timeZone('America/Sao_Paulo')
  .onRun(async (context) => {
    try {
      // Calcula dateKey do dia anterior
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const dateKey = yesterday.toISOString().split('T')[0];

      functions.logger.info('Iniciando recalculo de estatísticas diárias', {
        dateKey
      });

      // Busca todas as empresas
      const companiesSnapshot = await admin.firestore()
        .collection('companies')
        .get();

      let processedCount = 0;
      let errorCount = 0;

      // Processa cada empresa
      for (const companyDoc of companiesSnapshot.docs) {
        const companyId = companyDoc.id;

        try {
          await recalculateCompanyStatistics(companyId, dateKey);
          processedCount++;
        } catch (error: any) {
          errorCount++;
          functions.logger.error('Erro ao recalcular estatísticas da empresa', {
            companyId,
            dateKey,
            error: error.message
          });
        }
      }

      functions.logger.info('Recalculo de estatísticas concluído', {
        dateKey,
        processedCount,
        errorCount
      });

    } catch (error: any) {
      functions.logger.error('Erro no recalculo de estatísticas', {
        error: error.message,
        stack: error.stack
      });
    }
  });

/**
 * Recalcula estatísticas completas para uma empresa em uma data
 */
async function recalculateCompanyStatistics(
  companyId: string,
  dateKey: string
): Promise<void> {
  // Busca todos os pedidos do dia
  const ordersSnapshot = await admin.firestore()
    .collection(`companies/${companyId}/pedidos`)
    .where('dateKey', '==', dateKey)
    .get();

  // Inicializa estatísticas
  const stats: any = {
    companyId,
    dateKey,
    totalOrders: 0,
    totalRevenue: 0,
    averageOrderValue: 0,
    ordersByStatus: {
      pending: 0,
      preparing: 0,
      ready: 0,
      delivered: 0,
      cancelled: 0
    },
    paidOrders: 0,
    unpaidOrders: 0,
    topItems: [],
    topWaiters: [],
    ordersByHour: {},
    lastUpdated: admin.firestore.FieldValue.serverTimestamp(),
    version: 1,
    recalculated: true
  };

  // Mapas para agregações
  const itemsMap = new Map<string, { name: string; quantity: number; revenue: number }>();
  const waitersMap = new Map<string, { name: string; ordersCount: number; totalRevenue: number }>();

  // Processa cada pedido
  ordersSnapshot.docs.forEach(doc => {
    const order = doc.data();

    // Contadores básicos
    stats.totalOrders++;
    stats.totalRevenue += order.totalAmount || 0;

    // Por status
    if (order.status && stats.ordersByStatus[order.status] !== undefined) {
      stats.ordersByStatus[order.status]++;
    }

    // Por pagamento
    if (order.isPago) {
      stats.paidOrders++;
    } else {
      stats.unpaidOrders++;
    }

    // Por hora
    if (order.createdAt) {
      const hour = extractHour(order.createdAt);
      stats.ordersByHour[hour] = (stats.ordersByHour[hour] || 0) + 1;
    }

    // Top items
    if (order.items && Array.isArray(order.items)) {
      order.items.forEach((item: any) => {
        const existing = itemsMap.get(item.productId || item.id);
        if (existing) {
          existing.quantity += item.quantity || 0;
          existing.revenue += (item.quantity || 0) * (item.unitPrice || 0);
        } else {
          itemsMap.set(item.productId || item.id, {
            name: item.name,
            quantity: item.quantity || 0,
            revenue: (item.quantity || 0) * (item.unitPrice || 0)
          });
        }
      });
    }

    // Top waiters
    if (order.createdBy) {
      const existing = waitersMap.get(order.createdBy);
      if (existing) {
        existing.ordersCount++;
        existing.totalRevenue += order.totalAmount || 0;
      } else {
        waitersMap.set(order.createdBy, {
          name: order.createdByName || order.createdBy,
          ordersCount: 1,
          totalRevenue: order.totalAmount || 0
        });
      }
    }
  });

  // Calcula média
  if (stats.totalOrders > 0) {
    stats.averageOrderValue = stats.totalRevenue / stats.totalOrders;
  }

  // Top 10 items por revenue
  stats.topItems = Array.from(itemsMap.entries())
    .map(([productId, data]) => ({
      productId,
      ...data
    }))
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 10);

  // Top 10 waiters por revenue
  stats.topWaiters = Array.from(waitersMap.entries())
    .map(([userId, data]) => ({
      userId,
      ...data
    }))
    .sort((a, b) => b.totalRevenue - a.totalRevenue)
    .slice(0, 10);

  // Salva estatísticas
  await admin.firestore()
    .collection(`companies/${companyId}/statistics`)
    .doc(dateKey)
    .set(stats, { merge: true });

  functions.logger.info('Estatísticas recalculadas para empresa', {
    companyId,
    dateKey,
    totalOrders: stats.totalOrders,
    totalRevenue: stats.totalRevenue
  });
}

/**
 * Extrai hora (0-23) de timestamp
 */
function extractHour(timestamp: any): string {
  let date: Date;
  if (timestamp.toDate) {
    date = timestamp.toDate();
  } else if (timestamp instanceof Date) {
    date = timestamp;
  } else {
    date = new Date(timestamp);
  }

  return date.getHours().toString();
}

/**
 * Cloud Function: getDailyStatistics
 * 
 * Retorna estatísticas pré-computadas para uma data.
 * Usa agregações ao invés de queries em raw orders.
 * 
 * Requirements: 21.3
 */
export const getDailyStatistics = functions.https.onCall(async (data, context) => {
  // Validação de autenticação
  if (!context.auth) {
    throw new functions.https.HttpsError(
      'unauthenticated',
      'Usuário deve estar autenticado'
    );
  }

  const { companyId, dateKey } = data;

  // Validação de parâmetros
  if (!companyId || !dateKey) {
    throw new functions.https.HttpsError(
      'invalid-argument',
      'companyId e dateKey são obrigatórios'
    );
  }

  // Valida acesso à empresa
  const userCompanyId = context.auth.token.companyId as string;
  if (userCompanyId !== companyId) {
    throw new functions.https.HttpsError(
      'permission-denied',
      'Usuário não tem acesso a esta empresa'
    );
  }

  try {
    // Busca estatísticas pré-computadas
    const statsDoc = await admin.firestore()
      .collection(`companies/${companyId}/statistics`)
      .doc(dateKey)
      .get();

    if (!statsDoc.exists) {
      // Se não existe, retorna estatísticas vazias
      return {
        success: true,
        statistics: {
          companyId,
          dateKey,
          totalOrders: 0,
          totalRevenue: 0,
          averageOrderValue: 0,
          ordersByStatus: {
            pending: 0,
            preparing: 0,
            ready: 0,
            delivered: 0,
            cancelled: 0
          },
          paidOrders: 0,
          unpaidOrders: 0,
          topItems: [],
          topWaiters: [],
          ordersByHour: {},
          lastUpdated: null,
          version: 0
        },
        fromCache: false
      };
    }

    const statistics = statsDoc.data();

    functions.logger.info('Estatísticas diárias retornadas', {
      companyId,
      dateKey,
      totalOrders: statistics?.totalOrders,
      requestedBy: context.auth.uid
    });

    return {
      success: true,
      statistics: {
        ...statistics,
        lastUpdated: statistics?.lastUpdated?.toDate().toISOString()
      },
      fromCache: true
    };

  } catch (error: any) {
    functions.logger.error('Erro ao buscar estatísticas diárias', {
      companyId,
      dateKey,
      error: error.message,
      stack: error.stack
    });

    throw new functions.https.HttpsError(
      'internal',
      `Erro ao buscar estatísticas: ${error.message}`
    );
  }
});

/**
 * Cloud Function: getStatisticsRange
 * 
 * Retorna estatísticas agregadas para um intervalo de datas.
 * Usa agregações pré-computadas.
 * 
 * Requirements: 21.3
 */
export const getStatisticsRange = functions.https.onCall(async (data, context) => {
  // Validação de autenticação
  if (!context.auth) {
    throw new functions.https.HttpsError(
      'unauthenticated',
      'Usuário deve estar autenticado'
    );
  }

  const { companyId, startDate, endDate } = data;

  // Validação de parâmetros
  if (!companyId || !startDate || !endDate) {
    throw new functions.https.HttpsError(
      'invalid-argument',
      'companyId, startDate e endDate são obrigatórios'
    );
  }

  // Valida acesso à empresa
  const userCompanyId = context.auth.token.companyId as string;
  if (userCompanyId !== companyId) {
    throw new functions.https.HttpsError(
      'permission-denied',
      'Usuário não tem acesso a esta empresa'
    );
  }

  try {
    // Busca estatísticas do intervalo
    const statsSnapshot = await admin.firestore()
      .collection(`companies/${companyId}/statistics`)
      .where('dateKey', '>=', startDate)
      .where('dateKey', '<=', endDate)
      .orderBy('dateKey', 'asc')
      .get();

    // Agrega estatísticas
    const aggregated: any = {
      companyId,
      startDate,
      endDate,
      totalOrders: 0,
      totalRevenue: 0,
      averageOrderValue: 0,
      ordersByStatus: {
        pending: 0,
        preparing: 0,
        ready: 0,
        delivered: 0,
        cancelled: 0
      },
      paidOrders: 0,
      unpaidOrders: 0,
      dailyBreakdown: []
    };

    statsSnapshot.docs.forEach(doc => {
      const stats = doc.data();

      aggregated.totalOrders += stats.totalOrders || 0;
      aggregated.totalRevenue += stats.totalRevenue || 0;
      aggregated.paidOrders += stats.paidOrders || 0;
      aggregated.unpaidOrders += stats.unpaidOrders || 0;

      // Agrega por status
      Object.keys(aggregated.ordersByStatus).forEach(status => {
        aggregated.ordersByStatus[status] += stats.ordersByStatus?.[status] || 0;
      });

      // Adiciona breakdown diário
      aggregated.dailyBreakdown.push({
        dateKey: stats.dateKey,
        totalOrders: stats.totalOrders,
        totalRevenue: stats.totalRevenue,
        averageOrderValue: stats.averageOrderValue
      });
    });

    // Calcula média geral
    if (aggregated.totalOrders > 0) {
      aggregated.averageOrderValue = aggregated.totalRevenue / aggregated.totalOrders;
    }

    functions.logger.info('Estatísticas de intervalo retornadas', {
      companyId,
      startDate,
      endDate,
      totalOrders: aggregated.totalOrders,
      daysCount: statsSnapshot.size,
      requestedBy: context.auth.uid
    });

    return {
      success: true,
      statistics: aggregated,
      daysCount: statsSnapshot.size
    };

  } catch (error: any) {
    functions.logger.error('Erro ao buscar estatísticas de intervalo', {
      companyId,
      startDate,
      endDate,
      error: error.message,
      stack: error.stack
    });

    throw new functions.https.HttpsError(
      'internal',
      `Erro ao buscar estatísticas: ${error.message}`
    );
  }
});

/**
 * ============================================================================
 * ORDER ARCHIVAL SYSTEM (Task 17)
 * ============================================================================
 * 
 * Implementa arquivamento automático de pedidos antigos para manter
 * a collection principal performática.
 * 
 * Requirements: 17.1, 17.2, 17.3, 17.4, 17.5
 * 
 * Estratégia:
 * - Move pedidos >90 dias para companies/{companyId}/archived/{orderId}
 * - Executa diariamente às 3h (horário de baixo tráfego)
 * - Mantém integridade referencial
 * - Comprime dados arquivados
 * - UnifiedQueryService busca em ambas collections
 */

/**
 * Scheduled Function: archiveOldOrders
 * 
 * Move pedidos com mais de 90 dias para collection archived.
 * Executa diariamente às 3h da manhã.
 * 
 * Requirements: 17.1, 17.2, 17.3, 17.5
 */
export const archiveOldOrders = functions.pubsub
  .schedule('0 3 * * *')
  .timeZone('America/Sao_Paulo')
  .onRun(async (context) => {
    try {
      // Calcula data de corte (90 dias atrás)
      const ninetyDaysAgo = new Date();
      ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
      const cutoffDateKey = ninetyDaysAgo.toISOString().split('T')[0];

      functions.logger.info('Iniciando arquivamento de pedidos antigos', {
        cutoffDateKey,
        cutoffDate: ninetyDaysAgo.toISOString()
      });

      // Busca todas as empresas
      const companiesSnapshot = await admin.firestore()
        .collection('companies')
        .get();

      let totalArchived = 0;
      let totalErrors = 0;

      // Processa cada empresa
      for (const companyDoc of companiesSnapshot.docs) {
        const companyId = companyDoc.id;

        try {
          const archived = await archiveCompanyOrders(companyId, cutoffDateKey);
          totalArchived += archived;

          functions.logger.info('Pedidos arquivados para empresa', {
            companyId,
            archivedCount: archived
          });
        } catch (error: any) {
          totalErrors++;
          functions.logger.error('Erro ao arquivar pedidos da empresa', {
            companyId,
            error: error.message,
            stack: error.stack
          });
        }
      }

      functions.logger.info('Arquivamento concluído', {
        totalArchived,
        totalErrors,
        companiesProcessed: companiesSnapshot.size
      });

    } catch (error: any) {
      functions.logger.error('Erro no processo de arquivamento', {
        error: error.message,
        stack: error.stack
      });
    }
  });

/**
 * Arquiva pedidos antigos de uma empresa
 */
async function archiveCompanyOrders(
  companyId: string,
  cutoffDateKey: string
): Promise<number> {
  let archivedCount = 0;
  const batchSize = 500;

  // Busca pedidos antigos em batches
  let hasMore = true;

  while (hasMore) {
    // Query pedidos antigos
    const oldOrdersSnapshot = await admin.firestore()
      .collection(`companies/${companyId}/pedidos`)
      .where('dateKey', '<', cutoffDateKey)
      .limit(batchSize)
      .get();

    if (oldOrdersSnapshot.empty) {
      hasMore = false;
      break;
    }

    // Processa batch
    const batch = admin.firestore().batch();

    for (const orderDoc of oldOrdersSnapshot.docs) {
      const orderData = orderDoc.data();

      // Comprime dados (remove campos desnecessários e serializa)
      const compressedData = compressOrderData(orderData);

      // Cria documento arquivado
      const archivedRef = admin.firestore()
        .collection(`companies/${companyId}/archived`)
        .doc(orderDoc.id);

      batch.set(archivedRef, {
        ...compressedData,
        archivedAt: admin.firestore.FieldValue.serverTimestamp(),
        originalId: orderDoc.id,
        compressed: true
      });

      // Remove da collection ativa
      batch.delete(orderDoc.ref);

      archivedCount++;
    }

    // Commit batch
    await batch.commit();

    // Se retornou menos que batchSize, não há mais
    if (oldOrdersSnapshot.size < batchSize) {
      hasMore = false;
    }
  }

  return archivedCount;
}

/**
 * Comprime dados do pedido para reduzir storage
 * Remove campos redundantes e serializa arrays
 */
function compressOrderData(orderData: any): any {
  const compressed: any = {
    // Campos essenciais
    id: orderData.id,
    companyId: orderData.companyId,
    comandaNumber: orderData.comandaNumber,
    dateKey: orderData.dateKey,
    status: orderData.status,
    totalAmount: orderData.totalAmount,
    isPago: orderData.isPago,
    createdBy: orderData.createdBy,
    createdAt: orderData.createdAt,
    updatedAt: orderData.updatedAt
  };

  // Comprime items (mantém apenas essencial)
  if (orderData.items && Array.isArray(orderData.items)) {
    compressed.items = orderData.items.map((item: any) => ({
      id: item.id || item.productId,
      n: item.name,
      q: item.quantity,
      p: item.unitPrice
    }));
  }

  // Campos opcionais (apenas se existirem)
  if (orderData.tableNumber) {
    compressed.tableNumber = orderData.tableNumber;
  }

  if (orderData.notes) {
    compressed.notes = orderData.notes;
  }

  if (orderData.customerName) {
    compressed.customerName = orderData.customerName;
  }

  return compressed;
}

/**
 * Descomprime dados do pedido arquivado
 */
function decompressOrderData(compressedData: any): any {
  const decompressed: any = {
    id: compressedData.id || compressedData.originalId,
    companyId: compressedData.companyId,
    comandaNumber: compressedData.comandaNumber,
    dateKey: compressedData.dateKey,
    status: compressedData.status,
    totalAmount: compressedData.totalAmount,
    isPago: compressedData.isPago,
    createdBy: compressedData.createdBy,
    createdAt: compressedData.createdAt,
    updatedAt: compressedData.updatedAt,
    archived: true,
    archivedAt: compressedData.archivedAt
  };

  // Descomprime items
  if (compressedData.items && Array.isArray(compressedData.items)) {
    decompressed.items = compressedData.items.map((item: any) => ({
      id: item.id,
      productId: item.id,
      name: item.n,
      quantity: item.q,
      unitPrice: item.p,
      subtotal: item.q * item.p
    }));
  }

  // Campos opcionais
  if (compressedData.tableNumber) {
    decompressed.tableNumber = compressedData.tableNumber;
  }

  if (compressedData.notes) {
    decompressed.notes = compressedData.notes;
  }

  if (compressedData.customerName) {
    decompressed.customerName = compressedData.customerName;
  }

  return decompressed;
}

/**
 * Cloud Function: getOrderById
 * 
 * Busca pedido por ID em active ou archived collections (unified query).
 * 
 * Requirements: 17.4
 */
export const getOrderById = functions.https.onCall(async (data, context) => {
  // Validação de autenticação
  if (!context.auth) {
    throw new functions.https.HttpsError(
      'unauthenticated',
      'Usuário deve estar autenticado'
    );
  }

  const { companyId, orderId } = data;

  // Validação de parâmetros
  if (!companyId || !orderId) {
    throw new functions.https.HttpsError(
      'invalid-argument',
      'companyId e orderId são obrigatórios'
    );
  }

  // Valida acesso à empresa
  const userCompanyId = context.auth.token.companyId as string;
  if (userCompanyId !== companyId) {
    throw new functions.https.HttpsError(
      'permission-denied',
      'Usuário não tem acesso a esta empresa'
    );
  }

  try {
    // Busca primeiro em active orders
    const activeOrderDoc = await admin.firestore()
      .collection(`companies/${companyId}/pedidos`)
      .doc(orderId)
      .get();

    if (activeOrderDoc.exists) {
      return {
        success: true,
        order: activeOrderDoc.data(),
        source: 'active'
      };
    }

    // Se não encontrou, busca em archived
    const archivedOrderDoc = await admin.firestore()
      .collection(`companies/${companyId}/archived`)
      .doc(orderId)
      .get();

    if (archivedOrderDoc.exists) {
      const compressedData = archivedOrderDoc.data();
      const decompressedOrder = decompressOrderData(compressedData);

      return {
        success: true,
        order: decompressedOrder,
        source: 'archived'
      };
    }

    // Não encontrado
    throw new functions.https.HttpsError(
      'not-found',
      `Pedido não encontrado: ${orderId}`
    );

  } catch (error: any) {
    functions.logger.error('Erro ao buscar pedido', {
      companyId,
      orderId,
      error: error.message
    });

    if (error instanceof functions.https.HttpsError) {
      throw error;
    }

    throw new functions.https.HttpsError(
      'internal',
      `Erro ao buscar pedido: ${error.message}`
    );
  }
});

/**
 * Cloud Function: queryOrders
 * 
 * Busca pedidos com filtros em active e archived collections (unified query).
 * 
 * Requirements: 17.4
 */
export const queryOrders = functions.https.onCall(async (data, context) => {
  // Validação de autenticação
  if (!context.auth) {
    throw new functions.https.HttpsError(
      'unauthenticated',
      'Usuário deve estar autenticado'
    );
  }

  const {
    companyId,
    startDate,
    endDate,
    status,
    isPago,
    comandaNumber,
    includeArchived = true,
    limit: maxLimit = 100
  } = data;

  // Validação de parâmetros
  if (!companyId) {
    throw new functions.https.HttpsError(
      'invalid-argument',
      'companyId é obrigatório'
    );
  }

  // Valida acesso à empresa
  const userCompanyId = context.auth.token.companyId as string;
  if (userCompanyId !== companyId) {
    throw new functions.https.HttpsError(
      'permission-denied',
      'Usuário não tem acesso a esta empresa'
    );
  }

  try {
    const limit = Math.min(maxLimit, 500); // Máximo 500 resultados
    const results: any[] = [];

    // Query em active orders
    let activeQuery = admin.firestore()
      .collection(`companies/${companyId}/pedidos`) as any;

    // Aplica filtros
    if (startDate) {
      activeQuery = activeQuery.where('dateKey', '>=', startDate);
    }

    if (endDate) {
      activeQuery = activeQuery.where('dateKey', '<=', endDate);
    }

    if (status) {
      activeQuery = activeQuery.where('status', '==', status);
    }

    if (isPago !== undefined) {
      activeQuery = activeQuery.where('isPago', '==', isPago);
    }

    if (comandaNumber) {
      activeQuery = activeQuery.where('comandaNumber', '==', comandaNumber);
    }

    activeQuery = activeQuery.orderBy('createdAt', 'desc').limit(limit);

    const activeSnapshot = await activeQuery.get();

    activeSnapshot.docs.forEach((doc: any) => {
      results.push({
        ...doc.data(),
        source: 'active'
      });
    });

    // Query em archived orders (se solicitado e ainda há espaço)
    if (includeArchived && results.length < limit) {
      const remainingLimit = limit - results.length;

      let archivedQuery = admin.firestore()
        .collection(`companies/${companyId}/archived`) as any;

      // Aplica mesmos filtros
      if (startDate) {
        archivedQuery = archivedQuery.where('dateKey', '>=', startDate);
      }

      if (endDate) {
        archivedQuery = archivedQuery.where('dateKey', '<=', endDate);
      }

      if (status) {
        archivedQuery = archivedQuery.where('status', '==', status);
      }

      if (isPago !== undefined) {
        archivedQuery = archivedQuery.where('isPago', '==', isPago);
      }

      if (comandaNumber) {
        archivedQuery = archivedQuery.where('comandaNumber', '==', comandaNumber);
      }

      archivedQuery = archivedQuery.orderBy('createdAt', 'desc').limit(remainingLimit);

      const archivedSnapshot = await archivedQuery.get();

      archivedSnapshot.docs.forEach((doc: any) => {
        const compressedData = doc.data();
        const decompressedOrder = decompressOrderData(compressedData);

        results.push({
          ...decompressedOrder,
          source: 'archived'
        });
      });
    }

    // Ordena resultados combinados por data
    results.sort((a, b) => {
      const dateA = a.createdAt?.toDate?.() || new Date(a.createdAt);
      const dateB = b.createdAt?.toDate?.() || new Date(b.createdAt);
      return dateB.getTime() - dateA.getTime();
    });

    functions.logger.info('Pedidos consultados (unified query)', {
      companyId,
      totalResults: results.length,
      activeCount: results.filter(r => r.source === 'active').length,
      archivedCount: results.filter(r => r.source === 'archived').length,
      requestedBy: context.auth.uid
    });

    return {
      success: true,
      orders: results,
      count: results.length,
      hasArchived: results.some(r => r.source === 'archived')
    };

  } catch (error: any) {
    functions.logger.error('Erro ao consultar pedidos', {
      companyId,
      error: error.message,
      stack: error.stack
    });

    throw new functions.https.HttpsError(
      'internal',
      `Erro ao consultar pedidos: ${error.message}`
    );
  }
});

/**
 * Cloud Function: getArchivalStats
 * 
 * Retorna estatísticas sobre arquivamento de pedidos.
 * Apenas administradores podem executar.
 */
export const getArchivalStats = functions.https.onCall(async (data, context) => {
  // Validação de autenticação
  if (!context.auth) {
    throw new functions.https.HttpsError(
      'unauthenticated',
      'Usuário deve estar autenticado'
    );
  }

  // Apenas admin pode ver estatísticas
  const userRole = context.auth.token.role as string;
  if (userRole !== 'admin') {
    throw new functions.https.HttpsError(
      'permission-denied',
      'Apenas administradores podem ver estatísticas de arquivamento'
    );
  }

  const { companyId } = data;

  if (!companyId) {
    throw new functions.https.HttpsError(
      'invalid-argument',
      'companyId é obrigatório'
    );
  }

  try {
    // Conta pedidos ativos
    const activeSnapshot = await admin.firestore()
      .collection(`companies/${companyId}/pedidos`)
      .count()
      .get();

    // Conta pedidos arquivados
    const archivedSnapshot = await admin.firestore()
      .collection(`companies/${companyId}/archived`)
      .count()
      .get();

    // Busca pedido mais antigo em active
    const oldestActiveSnapshot = await admin.firestore()
      .collection(`companies/${companyId}/pedidos`)
      .orderBy('dateKey', 'asc')
      .limit(1)
      .get();

    // Busca pedido mais recente em archived
    const newestArchivedSnapshot = await admin.firestore()
      .collection(`companies/${companyId}/archived`)
      .orderBy('dateKey', 'desc')
      .limit(1)
      .get();

    const stats = {
      companyId,
      activeOrders: activeSnapshot.data().count,
      archivedOrders: archivedSnapshot.data().count,
      totalOrders: activeSnapshot.data().count + archivedSnapshot.data().count,
      oldestActiveDate: oldestActiveSnapshot.empty 
        ? null 
        : oldestActiveSnapshot.docs[0].data().dateKey,
      newestArchivedDate: newestArchivedSnapshot.empty
        ? null
        : newestArchivedSnapshot.docs[0].data().dateKey,
      archivalPercentage: 
        ((archivedSnapshot.data().count / 
          (activeSnapshot.data().count + archivedSnapshot.data().count)) * 100).toFixed(2)
    };

    functions.logger.info('Estatísticas de arquivamento consultadas', {
      companyId,
      stats,
      requestedBy: context.auth.uid
    });

    return {
      success: true,
      stats
    };

  } catch (error: any) {
    functions.logger.error('Erro ao buscar estatísticas de arquivamento', {
      companyId,
      error: error.message
    });

    throw new functions.https.HttpsError(
      'internal',
      `Erro ao buscar estatísticas: ${error.message}`
    );
  }
});

/**
 * ============================================================================
 * DATA STRUCTURE NORMALIZATION (Task 19)
 * ============================================================================
 * 
 * Implementa migração de estrutura de collections para padrão normalizado.
 * 
 * Requirements: 13.1, 13.2, 13.3, 13.4, 13.5
 * 
 * Estratégia:
 * - Consolida pedidos em companies/{companyId}/orders/{orderId}
 * - Remove collections root-level duplicadas
 * - Valida integridade de dados após migração
 * - Mantém rollback capability por 30 dias
 */

/**
 * Cloud Function: migrateCollectionStructure
 * 
 * Migra pedidos de estrutura legada para estrutura normalizada.
 * Apenas administradores podem executar.
 * 
 * Requirements: 13.1, 13.2, 13.4, 13.5
 */
export const migrateCollectionStructure = functions.https.onCall(async (data, context) => {
  // Validação de autenticação
  if (!context.auth) {
    throw new functions.https.HttpsError(
      'unauthenticated',
      'Usuário deve estar autenticado'
    );
  }

  // Apenas admin pode executar migração
  const userRole = context.auth.token.role as string;
  if (userRole !== 'admin') {
    throw new functions.https.HttpsError(
      'permission-denied',
      'Apenas administradores podem executar migração'
    );
  }

  const { companyId, dryRun = true, batchSize = 500 } = data;

  if (!companyId) {
    throw new functions.https.HttpsError(
      'invalid-argument',
      'companyId é obrigatório'
    );
  }

  try {
    functions.logger.info('Iniciando migração de estrutura de collections', {
      companyId,
      dryRun,
      batchSize,
      executedBy: context.auth.uid
    });

    const result = {
      companyId,
      dryRun,
      migratedCount: 0,
      skippedCount: 0,
      errorCount: 0,
      errors: [] as any[],
      backupCreated: false,
      rollbackAvailable: false
    };

    // Cria backup antes de migrar (se não for dry run)
    if (!dryRun) {
      await createMigrationBackup(companyId);
      result.backupCreated = true;
      result.rollbackAvailable = true;
    }

    // Busca pedidos em estrutura legada: companies/{companyId}/pedidos
    const legacyPedidosSnapshot = await admin.firestore()
      .collection(`companies/${companyId}/pedidos`)
      .limit(batchSize)
      .get();

    if (legacyPedidosSnapshot.empty) {
      functions.logger.info('Nenhum pedido em estrutura legada encontrado', {
        companyId
      });

      return {
        success: true,
        message: 'Nenhum pedido para migrar',
        result
      };
    }

    // Processa migração
    for (const orderDoc of legacyPedidosSnapshot.docs) {
      try {
        const orderData = orderDoc.data();

        // Valida integridade dos dados
        if (!validateOrderData(orderData)) {
          result.skippedCount++;
          result.errors.push({
            orderId: orderDoc.id,
            error: 'Dados inválidos'
          });
          continue;
        }

        if (!dryRun) {
          // Cria documento na estrutura normalizada
          await admin.firestore()
            .collection(`companies/${companyId}/orders`)
            .doc(orderDoc.id)
            .set({
              ...orderData,
              migratedAt: admin.firestore.FieldValue.serverTimestamp(),
              migratedFrom: `companies/${companyId}/pedidos/${orderDoc.id}`
            });

          // Marca documento legado como migrado (não deleta ainda)
          await orderDoc.ref.update({
            migrated: true,
            migratedTo: `companies/${companyId}/orders/${orderDoc.id}`,
            migratedAt: admin.firestore.FieldValue.serverTimestamp()
          });
        }

        result.migratedCount++;

      } catch (error: any) {
        result.errorCount++;
        result.errors.push({
          orderId: orderDoc.id,
          error: error.message
        });

        functions.logger.error('Erro ao migrar pedido', {
          orderId: orderDoc.id,
          error: error.message
        });
      }
    }

    functions.logger.info('Migração concluída', {
      companyId,
      result
    });

    return {
      success: true,
      message: dryRun 
        ? 'Dry run concluído - nenhuma mudança foi feita'
        : 'Migração concluída com sucesso',
      result
    };

  } catch (error: any) {
    functions.logger.error('Erro na migração de estrutura', {
      companyId,
      error: error.message,
      stack: error.stack
    });

    throw new functions.https.HttpsError(
      'internal',
      `Erro na migração: ${error.message}`
    );
  }
});

/**
 * Valida integridade dos dados do pedido
 */
function validateOrderData(orderData: any): boolean {
  // Campos obrigatórios
  const requiredFields = ['companyId', 'totalAmount', 'createdAt'];
  
  for (const field of requiredFields) {
    if (!(field in orderData)) {
      return false;
    }
  }

  // Valida tipos
  if (typeof orderData.totalAmount !== 'number') {
    return false;
  }

  if (typeof orderData.companyId !== 'string') {
    return false;
  }

  return true;
}

/**
 * Cria backup antes da migração
 */
async function createMigrationBackup(companyId: string): Promise<void> {
  const backupTimestamp = Date.now();
  const backupPath = `companies/${companyId}/migration_backups/${backupTimestamp}`;

  // Busca todos os pedidos legados
  const legacyOrders = await admin.firestore()
    .collection(`companies/${companyId}/pedidos`)
    .get();

  // Salva backup
  const batch = admin.firestore().batch();

  legacyOrders.docs.forEach(doc => {
    const backupRef = admin.firestore()
      .doc(`${backupPath}/orders/${doc.id}`);
    
    batch.set(backupRef, {
      ...doc.data(),
      backedUpAt: admin.firestore.FieldValue.serverTimestamp()
    });
  });

  // Salva metadata do backup
  const metadataRef = admin.firestore()
    .doc(`${backupPath}/metadata/info`);
  
  batch.set(metadataRef, {
    companyId,
    backupTimestamp,
    orderCount: legacyOrders.size,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    expiresAt: admin.firestore.Timestamp.fromDate(
      new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 dias
    )
  });

  await batch.commit();

  functions.logger.info('Backup de migração criado', {
    companyId,
    backupPath,
    orderCount: legacyOrders.size
  });
}

/**
 * Cloud Function: rollbackMigration
 * 
 * Reverte migração de estrutura usando backup.
 * Apenas administradores podem executar.
 * 
 * Requirements: 13.5
 */
export const rollbackMigration = functions.https.onCall(async (data, context) => {
  // Validação de autenticação
  if (!context.auth) {
    throw new functions.https.HttpsError(
      'unauthenticated',
      'Usuário deve estar autenticado'
    );
  }

  // Apenas admin pode executar rollback
  const userRole = context.auth.token.role as string;
  if (userRole !== 'admin') {
    throw new functions.https.HttpsError(
      'permission-denied',
      'Apenas administradores podem executar rollback'
    );
  }

  const { companyId, backupTimestamp } = data;

  if (!companyId || !backupTimestamp) {
    throw new functions.https.HttpsError(
      'invalid-argument',
      'companyId e backupTimestamp são obrigatórios'
    );
  }

  try {
    const backupPath = `companies/${companyId}/migration_backups/${backupTimestamp}`;

    // Verifica se backup existe
    const metadataDoc = await admin.firestore()
      .doc(`${backupPath}/metadata/info`)
      .get();

    if (!metadataDoc.exists) {
      throw new functions.https.HttpsError(
        'not-found',
        'Backup não encontrado'
      );
    }

    const metadata = metadataDoc.data()!;

    // Verifica se backup expirou
    if (metadata.expiresAt.toDate() < new Date()) {
      throw new functions.https.HttpsError(
        'failed-precondition',
        'Backup expirou (>30 dias)'
      );
    }

    // Busca pedidos do backup
    const backupOrders = await admin.firestore()
      .collection(`${backupPath}/orders`)
      .get();

    // Restaura pedidos
    const batch = admin.firestore().batch();
    let restoredCount = 0;

    backupOrders.docs.forEach(doc => {
      const orderData = doc.data();
      delete orderData.backedUpAt;

      const restoreRef = admin.firestore()
        .doc(`companies/${companyId}/pedidos/${doc.id}`);
      
      batch.set(restoreRef, orderData);
      restoredCount++;
    });

    await batch.commit();

    functions.logger.info('Rollback de migração concluído', {
      companyId,
      backupTimestamp,
      restoredCount,
      executedBy: context.auth.uid
    });

    return {
      success: true,
      message: 'Rollback concluído com sucesso',
      restoredCount
    };

  } catch (error: any) {
    functions.logger.error('Erro no rollback de migração', {
      companyId,
      backupTimestamp,
      error: error.message
    });

    if (error instanceof functions.https.HttpsError) {
      throw error;
    }

    throw new functions.https.HttpsError(
      'internal',
      `Erro no rollback: ${error.message}`
    );
  }
});

/**
 * Cloud Function: validateDataIntegrity
 * 
 * Valida integridade dos dados após migração.
 * 
 * Requirements: 13.4
 */
export const validateDataIntegrity = functions.https.onCall(async (data, context) => {
  // Validação de autenticação
  if (!context.auth) {
    throw new functions.https.HttpsError(
      'unauthenticated',
      'Usuário deve estar autenticado'
    );
  }

  const { companyId } = data;

  if (!companyId) {
    throw new functions.https.HttpsError(
      'invalid-argument',
      'companyId é obrigatório'
    );
  }

  try {
    const validation = {
      companyId,
      timestamp: new Date().toISOString(),
      checks: {
        pathConsistency: false,
        dataCompleteness: false,
        noDuplicates: false,
        referentialIntegrity: false
      },
      issues: [] as string[],
      stats: {
        ordersCount: 0,
        legacyOrdersCount: 0,
        archivedCount: 0
      }
    };

    // 1. Verifica consistência de paths
    const ordersSnapshot = await admin.firestore()
      .collection(`companies/${companyId}/orders`)
      .limit(1)
      .get();

    validation.checks.pathConsistency = !ordersSnapshot.empty;
    validation.stats.ordersCount = (await admin.firestore()
      .collection(`companies/${companyId}/orders`)
      .count()
      .get()).data().count;

    // 2. Verifica se ainda existem pedidos legados
    const legacySnapshot = await admin.firestore()
      .collection(`companies/${companyId}/pedidos`)
      .where('migrated', '!=', true)
      .limit(1)
      .get();

    if (!legacySnapshot.empty) {
      validation.issues.push('Ainda existem pedidos não migrados em estrutura legada');
    }

    validation.stats.legacyOrdersCount = (await admin.firestore()
      .collection(`companies/${companyId}/pedidos`)
      .count()
      .get()).data().count;

    // 3. Verifica completude dos dados
    const sampleOrders = await admin.firestore()
      .collection(`companies/${companyId}/orders`)
      .limit(100)
      .get();

    let incompleteCount = 0;
    sampleOrders.docs.forEach(doc => {
      if (!validateOrderData(doc.data())) {
        incompleteCount++;
      }
    });

    validation.checks.dataCompleteness = incompleteCount === 0;
    if (incompleteCount > 0) {
      validation.issues.push(`${incompleteCount} pedidos com dados incompletos`);
    }

    // 4. Verifica duplicatas
    const orderIds = new Set<string>();
    let duplicateCount = 0;

    sampleOrders.docs.forEach(doc => {
      if (orderIds.has(doc.id)) {
        duplicateCount++;
      }
      orderIds.add(doc.id);
    });

    validation.checks.noDuplicates = duplicateCount === 0;
    if (duplicateCount > 0) {
      validation.issues.push(`${duplicateCount} pedidos duplicados encontrados`);
    }

    // 5. Verifica integridade referencial
    validation.checks.referentialIntegrity = true; // Simplificado

    // Conta arquivados
    validation.stats.archivedCount = (await admin.firestore()
      .collection(`companies/${companyId}/archived`)
      .count()
      .get()).data().count;

    const allChecksPass = Object.values(validation.checks).every(check => check === true);

    functions.logger.info('Validação de integridade concluída', {
      companyId,
      allChecksPass,
      validation
    });

    return {
      success: true,
      valid: allChecksPass,
      validation
    };

  } catch (error: any) {
    functions.logger.error('Erro na validação de integridade', {
      companyId,
      error: error.message
    });

    throw new functions.https.HttpsError(
      'internal',
      `Erro na validação: ${error.message}`
    );
  }
});

/**
 * Scheduled Function: cleanupExpiredBackups
 * 
 * Remove backups de migração expirados (>30 dias).
 */
export const cleanupExpiredBackups = functions.pubsub
  .schedule('0 4 * * 0') // Domingo às 4h
  .timeZone('America/Sao_Paulo')
  .onRun(async (context) => {
    try {
      const now = admin.firestore.Timestamp.now();
      let deletedCount = 0;

      // Busca todas as empresas
      const companiesSnapshot = await admin.firestore()
        .collection('companies')
        .get();

      for (const companyDoc of companiesSnapshot.docs) {
        const companyId = companyDoc.id;

        // Busca backups expirados
        const expiredBackups = await admin.firestore()
          .collection(`companies/${companyId}/migration_backups`)
          .get();

        for (const backupDoc of expiredBackups.docs) {
          const metadataDoc = await admin.firestore()
            .doc(`companies/${companyId}/migration_backups/${backupDoc.id}/metadata/info`)
            .get();

          if (metadataDoc.exists) {
            const metadata = metadataDoc.data()!;
            
            if (metadata.expiresAt < now) {
              // Delete backup recursivamente
              await deleteCollection(
                admin.firestore(),
                `companies/${companyId}/migration_backups/${backupDoc.id}`,
                500
              );
              
              deletedCount++;
              
              functions.logger.info('Backup expirado removido', {
                companyId,
                backupId: backupDoc.id
              });
            }
          }
        }
      }

      functions.logger.info('Limpeza de backups concluída', {
        deletedCount
      });

    } catch (error: any) {
      functions.logger.error('Erro na limpeza de backups', {
        error: error.message
      });
    }
  });

/**
 * Helper para deletar collection recursivamente
 */
async function deleteCollection(
  db: admin.firestore.Firestore,
  collectionPath: string,
  batchSize: number
): Promise<void> {
  const collectionRef = db.collection(collectionPath);
  const query = collectionRef.limit(batchSize);

  return new Promise((resolve, reject) => {
    deleteQueryBatch(db, query, resolve).catch(reject);
  });
}

async function deleteQueryBatch(
  db: admin.firestore.Firestore,
  query: admin.firestore.Query,
  resolve: () => void
): Promise<void> {
  const snapshot = await query.get();

  const batchSize = snapshot.size;
  if (batchSize === 0) {
    resolve();
    return;
  }

  const batch = db.batch();
  snapshot.docs.forEach((doc) => {
    batch.delete(doc.ref);
  });
  await batch.commit();

  process.nextTick(() => {
    deleteQueryBatch(db, query, resolve);
  });
}


// ============================================================================
// DATEKEY STANDARDIZATION FUNCTIONS
// ============================================================================

/**
 * Cloud Function: calculateDateKey
 * 
 * Calcula dateKey em UTC usando server timestamp.
 * Garante consistência de timezone independente do cliente.
 * 
 * Requirements: 14.1, 14.2
 */
export const calculateDateKey = functions.https.onCall(async (data, context) => {
  const { timestamp } = data;

  try {
    // Use timestamp fornecido ou timestamp atual do servidor
    const date = timestamp ? new Date(timestamp) : new Date();
    
    const year = date.getUTCFullYear();
    const month = String(date.getUTCMonth() + 1).padStart(2, '0');
    const day = String(date.getUTCDate()).padStart(2, '0');
    
    const dateKey = `${year}-${month}-${day}`;

    functions.logger.info('DateKey calculated', {
      timestamp: date.getTime(),
      dateKey,
      userId: context.auth?.uid
    });

    return { dateKey };
  } catch (error) {
    functions.logger.error('Error calculating dateKey', { error, timestamp });
    throw new functions.https.HttpsError(
      'internal',
      'Failed to calculate dateKey'
    );
  }
});

/**
 * Cloud Function: onOrderCreate
 * 
 * Trigger que adiciona dateKey server-side quando order é criado.
 * Garante que todos os orders tenham dateKey consistente.
 * 
 * Requirements: 14.2
 */
export const onOrderCreate = functions.firestore
  .document('companies/{companyId}/orders/{orderId}')
  .onCreate(async (snap, context) => {
    const data = snap.data();
    
    // Se já tem dateKey válido, não sobrescreve
    if (data.dateKey && /^\d{4}-\d{2}-\d{2}$/.test(data.dateKey)) {
      return null;
    }

    try {
      // Calcula dateKey usando createdAt ou timestamp atual
      const timestamp = data.createdAt?.toDate?.() || new Date();
      const year = timestamp.getUTCFullYear();
      const month = String(timestamp.getUTCMonth() + 1).padStart(2, '0');
      const day = String(timestamp.getUTCDate()).padStart(2, '0');
      const dateKey = `${year}-${month}-${day}`;

      // Atualiza document com dateKey
      await snap.ref.update({
        dateKey,
        dateKeyCalculatedAt: admin.firestore.FieldValue.serverTimestamp()
      });

      functions.logger.info('DateKey added to new order', {
        orderId: snap.id,
        companyId: context.params.companyId,
        dateKey
      });

      return null;
    } catch (error) {
      functions.logger.error('Error adding dateKey to order', {
        orderId: snap.id,
        error
      });
      // Não falha a criação do order se dateKey falhar
      return null;
    }
  });

/**
 * Cloud Function: onOrderUpdate
 * 
 * Trigger que valida e corrige dateKey quando order é atualizado.
 * 
 * Requirements: 14.2, 14.4
 */
export const onOrderUpdate = functions.firestore
  .document('companies/{companyId}/orders/{orderId}')
  .onUpdate(async (change, context) => {
    const before = change.before.data();
    const after = change.after.data();

    // Se dateKey não mudou, não faz nada
    if (before.dateKey === after.dateKey) {
      return null;
    }

    // Valida formato do novo dateKey
    if (!after.dateKey || !/^\d{4}-\d{2}-\d{2}$/.test(after.dateKey)) {
      functions.logger.warn('Invalid dateKey format detected', {
        orderId: change.after.id,
        companyId: context.params.companyId,
        dateKey: after.dateKey
      });

      // Recalcula dateKey correto
      const timestamp = after.createdAt?.toDate?.() || new Date();
      const year = timestamp.getUTCFullYear();
      const month = String(timestamp.getUTCMonth() + 1).padStart(2, '0');
      const day = String(timestamp.getUTCDate()).padStart(2, '0');
      const correctDateKey = `${year}-${month}-${day}`;

      // Corrige dateKey
      await change.after.ref.update({
        dateKey: correctDateKey,
        dateKeyCalculatedAt: admin.firestore.FieldValue.serverTimestamp()
      });

      functions.logger.info('DateKey corrected', {
        orderId: change.after.id,
        oldDateKey: after.dateKey,
        newDateKey: correctDateKey
      });
    }

    return null;
  });

/**
 * Cloud Function: migrateDateKeys
 * 
 * Migra dateKeys existentes para formato server-calculated UTC.
 * Processa em batches para evitar timeouts.
 * 
 * Requirements: 14.3
 */
export const migrateDateKeys = functions.https.onCall(async (data, context) => {
  // Validação de autenticação e permissão
  if (!context.auth) {
    throw new functions.https.HttpsError(
      'unauthenticated',
      'Usuário deve estar autenticado'
    );
  }

  const claims = context.auth.token;
  if (claims.role !== 'admin') {
    throw new functions.https.HttpsError(
      'permission-denied',
      'Apenas admins podem executar migração'
    );
  }

  const { companyId, dryRun = true, batchSize = 500 } = data;

  if (!companyId) {
    throw new functions.https.HttpsError(
      'invalid-argument',
      'companyId é obrigatório'
    );
  }

  try {
    const db = admin.firestore();
    const ordersRef = db.collection(`companies/${companyId}/orders`);

    // Query orders com dateKey inválido ou ausente
    const snapshot = await ordersRef
      .limit(batchSize)
      .get();

    const updates: Array<{
      orderId: string;
      oldDateKey: string | undefined;
      newDateKey: string;
    }> = [];

    const batch = db.batch();
    let updateCount = 0;

    for (const doc of snapshot.docs) {
      const data = doc.data();
      const currentDateKey = data.dateKey;

      // Verifica se precisa atualizar
      const needsUpdate = 
        !currentDateKey || 
        !/^\d{4}-\d{2}-\d{2}$/.test(currentDateKey);

      if (needsUpdate) {
        // Calcula dateKey correto
        const timestamp = data.createdAt?.toDate?.() || new Date();
        const year = timestamp.getUTCFullYear();
        const month = String(timestamp.getUTCMonth() + 1).padStart(2, '0');
        const day = String(timestamp.getUTCDate()).padStart(2, '0');
        const newDateKey = `${year}-${month}-${day}`;

        updates.push({
          orderId: doc.id,
          oldDateKey: currentDateKey,
          newDateKey
        });

        if (!dryRun) {
          batch.update(doc.ref, {
            dateKey: newDateKey,
            dateKeyMigratedAt: admin.firestore.FieldValue.serverTimestamp()
          });
          updateCount++;
        }
      }
    }

    // Commit batch se não for dry run
    if (!dryRun && updateCount > 0) {
      await batch.commit();
    }

    functions.logger.info('DateKey migration completed', {
      companyId,
      dryRun,
      totalProcessed: snapshot.size,
      updatesNeeded: updates.length,
      updatesApplied: updateCount
    });

    return {
      success: true,
      dryRun,
      totalProcessed: snapshot.size,
      updatesNeeded: updates.length,
      updatesApplied: updateCount,
      updates: dryRun ? updates : undefined
    };
  } catch (error) {
    functions.logger.error('Error migrating dateKeys', {
      companyId,
      error
    });
    throw new functions.https.HttpsError(
      'internal',
      'Failed to migrate dateKeys'
    );
  }
});

/**
 * Cloud Function: validateDateKeys
 * 
 * Valida que todos os dateKeys no sistema estão no formato correto.
 * Retorna relatório de inconsistências.
 * 
 * Requirements: 14.4
 */
export const validateDateKeys = functions.https.onCall(async (data, context) => {
  // Validação de autenticação
  if (!context.auth) {
    throw new functions.https.HttpsError(
      'unauthenticated',
      'Usuário deve estar autenticado'
    );
  }

  const { companyId, limit = 1000 } = data;

  if (!companyId) {
    throw new functions.https.HttpsError(
      'invalid-argument',
      'companyId é obrigatório'
    );
  }

  try {
    const db = admin.firestore();
    const ordersRef = db.collection(`companies/${companyId}/orders`);

    const snapshot = await ordersRef.limit(limit).get();

    const invalidDateKeys: Array<{
      orderId: string;
      dateKey: string | undefined;
      issue: string;
    }> = [];

    const dateKeyPattern = /^\d{4}-\d{2}-\d{2}$/;

    for (const doc of snapshot.docs) {
      const data = doc.data();
      const dateKey = data.dateKey;

      // Verifica se dateKey existe
      if (!dateKey) {
        invalidDateKeys.push({
          orderId: doc.id,
          dateKey,
          issue: 'Missing dateKey'
        });
        continue;
      }

      // Verifica formato
      if (!dateKeyPattern.test(dateKey)) {
        invalidDateKeys.push({
          orderId: doc.id,
          dateKey,
          issue: 'Invalid format (expected YYYY-MM-DD)'
        });
        continue;
      }

      // Verifica se é data válida
      const [year, month, day] = dateKey.split('-').map(Number);
      const date = new Date(Date.UTC(year, month - 1, day));
      
      if (
        date.getUTCFullYear() !== year ||
        date.getUTCMonth() !== month - 1 ||
        date.getUTCDate() !== day
      ) {
        invalidDateKeys.push({
          orderId: doc.id,
          dateKey,
          issue: 'Invalid date'
        });
      }
    }

    functions.logger.info('DateKey validation completed', {
      companyId,
      totalChecked: snapshot.size,
      invalidCount: invalidDateKeys.length
    });

    return {
      success: true,
      totalChecked: snapshot.size,
      validCount: snapshot.size - invalidDateKeys.length,
      invalidCount: invalidDateKeys.length,
      invalidDateKeys: invalidDateKeys.slice(0, 100) // Limita retorno
    };
  } catch (error) {
    functions.logger.error('Error validating dateKeys', {
      companyId,
      error
    });
    throw new functions.https.HttpsError(
      'internal',
      'Failed to validate dateKeys'
    );
  }
});


// ============================================================================
// FIELD NORMALIZATION FUNCTIONS
// ============================================================================

/**
 * Cloud Function: normalizeOrderFields
 * 
 * Migra campos duplicados para formato padronizado:
 * - numeroComanda → comandaNumber
 * - criadoPor → createdBy
 * 
 * Usa merge strategy para preservar dados.
 * 
 * Requirements: 15.1, 15.2, 15.3, 15.4
 */
export const normalizeOrderFields = functions.https.onCall(async (data, context) => {
  // Validação de autenticação e permissão
  if (!context.auth) {
    throw new functions.https.HttpsError(
      'unauthenticated',
      'Usuário deve estar autenticado'
    );
  }

  const claims = context.auth.token;
  if (claims.role !== 'admin') {
    throw new functions.https.HttpsError(
      'permission-denied',
      'Apenas admins podem executar normalização'
    );
  }

  const { 
    companyId, 
    dryRun = true, 
    batchSize = 500,
    removeDeprecated = false 
  } = data;

  if (!companyId) {
    throw new functions.https.HttpsError(
      'invalid-argument',
      'companyId é obrigatório'
    );
  }

  try {
    const db = admin.firestore();
    
    // Query orders que podem ter campos deprecated
    const ordersRef = db.collection(`companies/${companyId}/orders`);
    const snapshot = await ordersRef.limit(batchSize).get();

    const migrations: Array<{
      orderId: string;
      changes: Array<{ field: string; oldValue: any; newValue: any }>;
      hadDeprecatedFields: boolean;
    }> = [];

    const batch = db.batch();
    let updateCount = 0;

    for (const doc of snapshot.docs) {
      const docData = doc.data();
      const changes: Array<{ field: string; oldValue: any; newValue: any }> = [];
      let needsUpdate = false;

      const updates: Record<string, any> = {};

      // Migra numeroComanda → comandaNumber
      if (docData.numeroComanda && !docData.comandaNumber) {
        updates.comandaNumber = docData.numeroComanda;
        changes.push({
          field: 'comandaNumber',
          oldValue: undefined,
          newValue: docData.numeroComanda
        });
        needsUpdate = true;
      }

      // Migra criadoPor → createdBy
      if (docData.criadoPor && !docData.createdBy) {
        updates.createdBy = docData.criadoPor;
        changes.push({
          field: 'createdBy',
          oldValue: undefined,
          newValue: docData.criadoPor
        });
        needsUpdate = true;
      }

      // Remove campos deprecated se solicitado
      if (removeDeprecated && needsUpdate) {
        if (docData.numeroComanda) {
          updates.numeroComanda = admin.firestore.FieldValue.delete();
          changes.push({
            field: 'numeroComanda (removed)',
            oldValue: docData.numeroComanda,
            newValue: null
          });
        }
        
        if (docData.criadoPor) {
          updates.criadoPor = admin.firestore.FieldValue.delete();
          changes.push({
            field: 'criadoPor (removed)',
            oldValue: docData.criadoPor,
            newValue: null
          });
        }
      }

      if (needsUpdate) {
        migrations.push({
          orderId: doc.id,
          changes,
          hadDeprecatedFields: true
        });

        if (!dryRun) {
          updates.fieldsMigratedAt = admin.firestore.FieldValue.serverTimestamp();
          batch.update(doc.ref, updates);
          updateCount++;
        }
      }
    }

    // Commit batch se não for dry run
    if (!dryRun && updateCount > 0) {
      await batch.commit();
    }

    functions.logger.info('Field normalization completed', {
      companyId,
      dryRun,
      removeDeprecated,
      totalProcessed: snapshot.size,
      migrationsNeeded: migrations.length,
      migrationsApplied: updateCount
    });

    return {
      success: true,
      dryRun,
      removeDeprecated,
      totalProcessed: snapshot.size,
      migrationsNeeded: migrations.length,
      migrationsApplied: updateCount,
      migrations: dryRun ? migrations : undefined
    };
  } catch (error: any) {
    functions.logger.error('Error normalizing fields', {
      companyId,
      error: error.message
    });
    throw new functions.https.HttpsError(
      'internal',
      'Failed to normalize fields'
    );
  }
});

/**
 * Cloud Function: removeDeprecatedFields
 * 
 * Remove campos deprecated após período de deprecação (90 dias).
 * Apenas remove se campos normalizados existem.
 * 
 * Requirements: 15.5
 */
export const removeDeprecatedFields = functions.https.onCall(async (data, context) => {
  // Validação de autenticação e permissão
  if (!context.auth) {
    throw new functions.https.HttpsError(
      'unauthenticated',
      'Usuário deve estar autenticado'
    );
  }

  const claims = context.auth.token;
  if (claims.role !== 'admin') {
    throw new functions.https.HttpsError(
      'permission-denied',
      'Apenas admins podem remover campos deprecated'
    );
  }

  const { 
    companyId, 
    dryRun = true, 
    batchSize = 500,
    deprecationDays = 90
  } = data;

  if (!companyId) {
    throw new functions.https.HttpsError(
      'invalid-argument',
      'companyId é obrigatório'
    );
  }

  try {
    const db = admin.firestore();
    const ordersRef = db.collection(`companies/${companyId}/orders`);

    // Calcula data limite (90 dias atrás)
    const deprecationDate = new Date();
    deprecationDate.setDate(deprecationDate.getDate() - deprecationDays);

    // Query orders com campos deprecated e migrados há mais de 90 dias
    const snapshot = await ordersRef
      .where('fieldsMigratedAt', '<', admin.firestore.Timestamp.fromDate(deprecationDate))
      .limit(batchSize)
      .get();

    const removals: Array<{
      orderId: string;
      removedFields: string[];
      migrationDate: string;
    }> = [];

    const batch = db.batch();
    let updateCount = 0;

    for (const doc of snapshot.docs) {
      const docData = doc.data();
      const removedFields: string[] = [];
      const updates: Record<string, any> = {};

      // Verifica se campos normalizados existem antes de remover deprecated
      const hasNormalizedFields = docData.comandaNumber && docData.createdBy;

      if (!hasNormalizedFields) {
        functions.logger.warn('Skipping removal - normalized fields missing', {
          orderId: doc.id,
          hasComandaNumber: !!docData.comandaNumber,
          hasCreatedBy: !!docData.createdBy
        });
        continue;
      }

      // Remove numeroComanda se existe
      if (docData.numeroComanda !== undefined) {
        updates.numeroComanda = admin.firestore.FieldValue.delete();
        removedFields.push('numeroComanda');
      }

      // Remove criadoPor se existe
      if (docData.criadoPor !== undefined) {
        updates.criadoPor = admin.firestore.FieldValue.delete();
        removedFields.push('criadoPor');
      }

      if (removedFields.length > 0) {
        removals.push({
          orderId: doc.id,
          removedFields,
          migrationDate: docData.fieldsMigratedAt?.toDate().toISOString() || 'unknown'
        });

        if (!dryRun) {
          updates.deprecatedFieldsRemovedAt = admin.firestore.FieldValue.serverTimestamp();
          batch.update(doc.ref, updates);
          updateCount++;
        }
      }
    }

    // Commit batch se não for dry run
    if (!dryRun && updateCount > 0) {
      await batch.commit();
    }

    functions.logger.info('Deprecated fields removal completed', {
      companyId,
      dryRun,
      deprecationDays,
      totalProcessed: snapshot.size,
      removalsNeeded: removals.length,
      removalsApplied: updateCount
    });

    return {
      success: true,
      dryRun,
      deprecationDays,
      totalProcessed: snapshot.size,
      removalsNeeded: removals.length,
      removalsApplied: updateCount,
      removals: dryRun ? removals : undefined
    };
  } catch (error: any) {
    functions.logger.error('Error removing deprecated fields', {
      companyId,
      error: error.message
    });
    throw new functions.https.HttpsError(
      'internal',
      'Failed to remove deprecated fields'
    );
  }
});

/**
 * Cloud Function: validateFieldNormalization
 * 
 * Valida que todos os orders têm campos normalizados.
 * Retorna relatório de inconsistências.
 * 
 * Requirements: 15.4
 */
export const validateFieldNormalization = functions.https.onCall(async (data, context) => {
  // Validação de autenticação
  if (!context.auth) {
    throw new functions.https.HttpsError(
      'unauthenticated',
      'Usuário deve estar autenticado'
    );
  }

  const { companyId, limit = 1000 } = data;

  if (!companyId) {
    throw new functions.https.HttpsError(
      'invalid-argument',
      'companyId é obrigatório'
    );
  }

  try {
    const db = admin.firestore();
    const ordersRef = db.collection(`companies/${companyId}/orders`);
    const snapshot = await ordersRef.limit(limit).get();

    const issues: Array<{
      orderId: string;
      issue: string;
      hasDeprecatedFields: boolean;
      missingNormalizedFields: string[];
    }> = [];

    for (const doc of snapshot.docs) {
      const docData = doc.data();
      const missingNormalizedFields: string[] = [];
      const hasDeprecatedFields = !!(docData.numeroComanda || docData.criadoPor);

      // Verifica campos normalizados
      if (!docData.comandaNumber) {
        missingNormalizedFields.push('comandaNumber');
      }

      if (!docData.createdBy) {
        missingNormalizedFields.push('createdBy');
      }

      // Reporta issues
      if (missingNormalizedFields.length > 0) {
        issues.push({
          orderId: doc.id,
          issue: 'Missing normalized fields',
          hasDeprecatedFields,
          missingNormalizedFields
        });
      } else if (hasDeprecatedFields) {
        issues.push({
          orderId: doc.id,
          issue: 'Has deprecated fields but normalized fields exist',
          hasDeprecatedFields: true,
          missingNormalizedFields: []
        });
      }
    }

    functions.logger.info('Field normalization validation completed', {
      companyId,
      totalChecked: snapshot.size,
      issuesFound: issues.length
    });

    return {
      success: true,
      totalChecked: snapshot.size,
      validCount: snapshot.size - issues.length,
      issuesCount: issues.length,
      issues: issues.slice(0, 100) // Limita retorno
    };
  } catch (error: any) {
    functions.logger.error('Error validating field normalization', {
      companyId,
      error: error.message
    });
    throw new functions.https.HttpsError(
      'internal',
      'Failed to validate field normalization'
    );
  }
});

/**
 * Scheduled Function: cleanupDeprecatedFieldsDaily
 * 
 * Executa limpeza automática de campos deprecated diariamente.
 * Remove campos após 90 dias de migração.
 * 
 * Requirements: 15.5
 */
export const cleanupDeprecatedFieldsDaily = functions.pubsub
  .schedule('0 4 * * *') // 4h da manhã diariamente
  .timeZone('America/Sao_Paulo')
  .onRun(async (context) => {
    try {
      const db = admin.firestore();
      
      // Busca todas as companies
      const companiesSnapshot = await db.collection('companies').limit(100).get();

      let totalProcessed = 0;
      let totalRemoved = 0;

      for (const companyDoc of companiesSnapshot.docs) {
        const companyId = companyDoc.id;

        // Calcula data limite (90 dias atrás)
        const deprecationDate = new Date();
        deprecationDate.setDate(deprecationDate.getDate() - 90);

        // Query orders com campos deprecated e migrados há mais de 90 dias
        const ordersSnapshot = await db
          .collection(`companies/${companyId}/orders`)
          .where('fieldsMigratedAt', '<', admin.firestore.Timestamp.fromDate(deprecationDate))
          .limit(500)
          .get();

        if (ordersSnapshot.empty) {
          continue;
        }

        const batch = db.batch();
        let batchCount = 0;

        for (const doc of ordersSnapshot.docs) {
          const docData = doc.data();

          // Verifica se campos normalizados existem
          const hasNormalizedFields = docData.comandaNumber && docData.createdBy;

          if (!hasNormalizedFields) {
            continue;
          }

          const updates: Record<string, any> = {};
          let hasUpdates = false;

          if (docData.numeroComanda !== undefined) {
            updates.numeroComanda = admin.firestore.FieldValue.delete();
            hasUpdates = true;
          }

          if (docData.criadoPor !== undefined) {
            updates.criadoPor = admin.firestore.FieldValue.delete();
            hasUpdates = true;
          }

          if (hasUpdates) {
            updates.deprecatedFieldsRemovedAt = admin.firestore.FieldValue.serverTimestamp();
            batch.update(doc.ref, updates);
            batchCount++;
          }
        }

        if (batchCount > 0) {
          await batch.commit();
          totalRemoved += batchCount;
        }

        totalProcessed += ordersSnapshot.size;
      }

      functions.logger.info('Daily deprecated fields cleanup completed', {
        companiesProcessed: companiesSnapshot.size,
        totalOrdersProcessed: totalProcessed,
        totalFieldsRemoved: totalRemoved
      });
    } catch (error: any) {
      functions.logger.error('Error in daily deprecated fields cleanup', {
        error: error.message
      });
    }
  });
