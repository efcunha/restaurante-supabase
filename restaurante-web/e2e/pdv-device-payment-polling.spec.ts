import { test, expect } from '@playwright/test';
import { pollDevicePaymentUntilFinal } from '../src/features/pdv/hooks/devicePaymentPolling';
import type { DevicePaymentResult } from '../src/features/pdv/types';

test.describe('PDV maquininha polling', () => {
  test('processing -> approved', async () => {
    let nowMs = 0;
    const statuses: DevicePaymentResult[] = [
      {
        status: 'processing',
        transactionId: 'tx-1',
        providerPaymentId: 'pay-1',
        message: 'Aguardando terminal',
      },
      {
        status: 'approved',
        transactionId: 'tx-1',
        providerPaymentId: 'pay-1',
        authCode: 'AUTH-123',
        message: 'Pagamento aprovado',
      },
    ];

    const updates: DevicePaymentResult[] = [];
    let index = 0;

    const result = await pollDevicePaymentUntilFinal(statuses[0], {
      pollingIntervalMs: 200,
      pollingTimeoutMs: 2000,
      now: () => nowMs,
      sleep: async (ms) => {
        nowMs += ms;
      },
      getStatus: async () => {
        index += 1;
        return statuses[index] ?? statuses[statuses.length - 1];
      },
      onUpdate: (status) => updates.push(status),
    });

    expect(result.status).toBe('approved');
    expect(result.transactionId).toBe('tx-1');
    expect(updates.map((status) => status.status)).toEqual(['approved']);
  });

  test('processing -> declined', async () => {
    let nowMs = 0;
    const statuses: DevicePaymentResult[] = [
      {
        status: 'processing',
        transactionId: 'tx-2',
        providerPaymentId: 'pay-2',
        message: 'Aguardando terminal',
      },
      {
        status: 'declined',
        transactionId: 'tx-2',
        providerPaymentId: 'pay-2',
        message: 'Pagamento recusado',
      },
    ];

    let index = 0;

    const result = await pollDevicePaymentUntilFinal(statuses[0], {
      pollingIntervalMs: 200,
      pollingTimeoutMs: 2000,
      now: () => nowMs,
      sleep: async (ms) => {
        nowMs += ms;
      },
      getStatus: async () => {
        index += 1;
        return statuses[index] ?? statuses[statuses.length - 1];
      },
    });

    expect(result.status).toBe('declined');
    expect(result.providerPaymentId).toBe('pay-2');
  });

  test('processing -> timeout', async () => {
    let nowMs = 0;

    const result = await pollDevicePaymentUntilFinal(
      {
        status: 'processing',
        transactionId: 'tx-3',
        providerPaymentId: 'pay-3',
        message: 'Aguardando terminal',
      },
      {
        pollingIntervalMs: 500,
        pollingTimeoutMs: 1200,
        now: () => nowMs,
        sleep: async (ms) => {
          nowMs += ms;
        },
        getStatus: async () => ({
          status: 'processing',
          transactionId: 'tx-3',
          providerPaymentId: 'pay-3',
          message: 'Ainda processando',
        }),
      },
    );

    expect(result.status).toBe('timeout');
    expect(result.transactionId).toBe('tx-3');
    expect(result.providerPaymentId).toBe('pay-3');
  });
});
