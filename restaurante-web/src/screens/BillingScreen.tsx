import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Image, KeyboardAvoidingView, Linking, Modal, Platform, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { Ionicons } from '@expo/vector-icons';
import { ScreenScaffold } from '../layouts/ScreenScaffold';
import { useAuth } from '../context/AuthContext';
import { useBilling } from '../context/BillingContext';
import {
  BillingInvoice,
  BillingPaymentMethod,
  BillingProviderStatus,
  CardInput,
  getBillingProviderStatus,
  listBillingInvoices,
  listBillingPaymentMethods,
  requestBillingPixFallback,
  saveCardToken,
  startBillingCheckout,
  tokenizeCardWithMp,
} from '../services/BillingService';
import { colors } from '../theme/colors';

interface BillingScreenProps {
  onClose?: () => void;
}

const statusLabels: Record<string, string> = {
  trialing: 'Período de teste',
  active: 'Assinatura ativa',
  past_due: 'Pagamento pendente',
  grace_period: 'Período de tolerância',
  suspended: 'Conta suspensa',
  reactivated: 'Conta reativada',
  cancelled: 'Assinatura cancelada',
};

function formatCurrency(cents: number) {
  return (cents / 100).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  });
}

function formatDate(date?: string | Date | null) {
  if (!date) {
    return '-';
  }

  return new Date(date).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    timeZone: 'America/Sao_Paulo',
  });
}

function formatDateTime(date?: string | Date | null) {
  if (!date) {
    return '-';
  }

  return new Date(date).toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'America/Sao_Paulo',
  });
}

function getMethodLabel(method: BillingPaymentMethod) {
  if (method.type === 'pix') {
    return 'Pix';
  }

  const brand = method.brand ? method.brand.toUpperCase() : 'Cartão';
  const lastFour = method.last_four ? ` •••• ${method.last_four}` : '';
  return `${brand}${lastFour}`;
}

function getInvoiceStatusLabel(status: BillingInvoice['status']) {
  switch (status) {
    case 'paid':
      return 'Pago';
    case 'failed':
      return 'Falhou';
    case 'cancelled':
      return 'Cancelado';
    default:
      return 'Pendente';
  }
}

function getActivePixInvoice(invoices: BillingInvoice[]) {
  const now = Date.now();

  return invoices.find((invoice) => {
    if (invoice.status !== 'pending' || invoice.payment_method_type !== 'pix' || !invoice.pix_qr_code_text) {
      return false;
    }

    if (!invoice.pix_expires_at) {
      return true;
    }

    const expiresAt = new Date(invoice.pix_expires_at).getTime();
    return Number.isNaN(expiresAt) || expiresAt > now;
  }) || null;
}

export default function BillingScreen({ onClose }: BillingScreenProps) {
  const { user } = useAuth();
  const { subscription, loadingBilling, reloadSubscription } = useBilling();
  const [paymentMethods, setPaymentMethods] = useState<BillingPaymentMethod[]>([]);
  const [invoices, setInvoices] = useState<BillingInvoice[]>([]);
  const [providerStatus, setProviderStatus] = useState<BillingProviderStatus | null>(null);
  const [loadingData, setLoadingData] = useState(true);
  const [actionLoading, setActionLoading] = useState<'checkout' | 'pix' | null>(null);

  // Card form modal
  const [showCardModal, setShowCardModal] = useState(false);
  const [pendingPublicKey, setPendingPublicKey] = useState<string | null>(null);
  const [cardForm, setCardForm] = useState<CardInput>({
    cardNumber: '',
    expiryMonth: '',
    expiryYear: '',
    cvv: '',
    cardholderName: '',
  });

  const companyId = user?.companyId;
  const hasPaymentMethod = paymentMethods.length > 0;
  const activePixInvoice = useMemo(() => getActivePixInvoice(invoices), [invoices]);

  const daysLeft = useMemo(() => {
    if (!subscription.trialEndsAt) {
      return null;
    }

    const delta = subscription.trialEndsAt.getTime() - Date.now();
    return Math.max(0, Math.ceil(delta / (1000 * 60 * 60 * 24)));
  }, [subscription.trialEndsAt]);

  const loadData = useCallback(async () => {
    if (!companyId) {
      setPaymentMethods([]);
      setInvoices([]);
      setProviderStatus(null);
      setLoadingData(false);
      return;
    }

    setLoadingData(true);

    try {
      const [methodsData, invoicesData, providerData] = await Promise.all([
        listBillingPaymentMethods(companyId),
        listBillingInvoices(companyId),
        getBillingProviderStatus(companyId),
      ]);

      setPaymentMethods(methodsData);
      setInvoices(invoicesData);
      setProviderStatus(providerData);
    } catch (error) {
      Alert.alert('Cobrança', error instanceof Error ? error.message : 'Falha ao carregar dados de cobrança.');
    } finally {
      setLoadingData(false);
    }
  }, [companyId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleRefresh = useCallback(async () => {
    await reloadSubscription();
    await loadData();
  }, [loadData, reloadSubscription]);

  const handleStartCheckout = useCallback(async () => {
    if (!companyId) {
      return;
    }

    setActionLoading('checkout');
    try {
      const result = await startBillingCheckout(companyId);

      if (result.status === 'ready_for_tokenization' && result.publicKey) {
        setPendingPublicKey(result.publicKey);
        setCardForm({ cardNumber: '', expiryMonth: '', expiryYear: '', cvv: '', cardholderName: '' });
        setShowCardModal(true);
        return;
      }

      if (result.checkoutUrl) {
        await Linking.openURL(result.checkoutUrl);
      }

      Alert.alert('Cobrança', result.message);
      await handleRefresh();
    } catch (error) {
      Alert.alert('Cobrança', error instanceof Error ? error.message : 'Falha ao iniciar o cadastro do método de pagamento.');
    } finally {
      setActionLoading(null);
    }
  }, [companyId, handleRefresh]);

  const handleSaveCard = useCallback(async () => {
    if (!companyId || !pendingPublicKey) {
      return;
    }

    const { cardNumber, expiryMonth, expiryYear, cvv, cardholderName } = cardForm;
    const digits = cardNumber.replace(/\s/g, '');

    if (digits.length < 13 || digits.length > 19) {
      Alert.alert('Cartão', 'Número do cartão inválido.');
      return;
    }

    const month = parseInt(expiryMonth, 10);
    if (!month || month < 1 || month > 12) {
      Alert.alert('Cartão', 'Mês de validade inválido (01-12).');
      return;
    }

    if (!expiryYear || expiryYear.length < 2) {
      Alert.alert('Cartão', 'Ano de validade inválido.');
      return;
    }

    if (cvv.length < 3) {
      Alert.alert('Cartão', 'CVV inválido.');
      return;
    }

    if (!cardholderName.trim()) {
      Alert.alert('Cartão', 'Informe o nome impresso no cartão.');
      return;
    }

    setActionLoading('checkout');
    try {
      const token = await tokenizeCardWithMp(pendingPublicKey, cardForm);
      const result = await saveCardToken(companyId, token);

      setShowCardModal(false);
      setPendingPublicKey(null);

      const cardLabel = result.card
        ? ` (${(result.card as { brand?: string }).brand?.toUpperCase() || 'Cartão'} •••• ${(result.card as { lastFour?: string }).lastFour || ''})`
        : '';

      Alert.alert('Cartão salvo', `Cartão cadastrado com sucesso${cardLabel}.`);
      await handleRefresh();
    } catch (error) {
      Alert.alert('Erro no cartão', error instanceof Error ? error.message : 'Falha ao salvar o cartão.');
    } finally {
      setActionLoading(null);
    }
  }, [companyId, pendingPublicKey, cardForm, handleRefresh]);

  const handlePixFallback = useCallback(async () => {
    if (!companyId) {
      return;
    }

    setActionLoading('pix');
    try {
      const result = await requestBillingPixFallback(companyId);
      const pixSummary = result.pixQrCodeText
        ? `\n\nPix disponível até ${formatDateTime(result.pixExpiresAt)}.`
        : '';
      Alert.alert('Regularização via Pix', result.message + pixSummary + (result.nextStep ? `\n\nPróximo passo: ${result.nextStep}` : ''));
      await handleRefresh();
    } catch (error) {
      Alert.alert('Cobrança', error instanceof Error ? error.message : 'Falha ao iniciar a regularização via Pix.');
    } finally {
      setActionLoading(null);
    }
  }, [companyId, handleRefresh]);

  const handleCopyPixCode = useCallback(async () => {
    if (!activePixInvoice?.pix_qr_code_text) {
      return;
    }

    try {
      await Clipboard.setStringAsync(activePixInvoice.pix_qr_code_text);
      Alert.alert('Pix copiado', 'O código copia e cola foi enviado para a área de transferência.');
    } catch (error) {
      Alert.alert('Pix', error instanceof Error ? error.message : 'Falha ao copiar o código Pix.');
    }
  }, [activePixInvoice]);

  const statusLabel = statusLabels[subscription.status || 'trialing'] || 'Assinatura';
  const subtitle = user ? `Empresa ${user.company?.id || user.companyId || ''}` : 'Assinatura e regularização';

  return (
    <ScreenScaffold
      title="Assinatura e Cobrança"
      subtitle={subtitle}
      titleIcon={<Ionicons name="card-outline" size={22} color={colors.white} />}
      leftAction={onClose ? { label: 'Voltar', onPress: onClose } : undefined}
      scroll
      contentContainerStyle={styles.contentContainer}
    >
      {/* Card tokenization modal */}
      <Modal
        visible={showCardModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => { setShowCardModal(false); setPendingPublicKey(null); }}
      >
        <KeyboardAvoidingView
          style={styles.modalContainer}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Cadastrar cartão</Text>
            <TouchableOpacity onPress={() => { setShowCardModal(false); setPendingPublicKey(null); }}>
              <Ionicons name="close" size={24} color={colors.text} />
            </TouchableOpacity>
          </View>

          <Text style={styles.modalSubtitle}>
            Os dados do cartão são enviados diretamente ao Mercado Pago — nunca armazenamos número completo nem CVV.
          </Text>

          <View style={styles.formField}>
            <Text style={styles.fieldLabel}>Número do cartão</Text>
            <TextInput
              style={styles.fieldInput}
              placeholder="0000 0000 0000 0000"
              keyboardType="number-pad"
              maxLength={19}
              value={cardForm.cardNumber}
              onChangeText={(v) => {
                const digits = v.replace(/\D/g, '').slice(0, 16);
                const formatted = digits.replace(/(\d{4})(?=\d)/g, '$1 ').trim();
                setCardForm((prev) => ({ ...prev, cardNumber: formatted }));
              }}
            />
          </View>

          <View style={styles.formRow}>
            <View style={[styles.formField, { flex: 1 }]}>
              <Text style={styles.fieldLabel}>Mês</Text>
              <TextInput
                style={styles.fieldInput}
                placeholder="MM"
                keyboardType="number-pad"
                maxLength={2}
                value={cardForm.expiryMonth}
                onChangeText={(v) => setCardForm((prev) => ({ ...prev, expiryMonth: v.replace(/\D/g, '') }))}
              />
            </View>
            <View style={[styles.formField, { flex: 1 }]}>
              <Text style={styles.fieldLabel}>Ano</Text>
              <TextInput
                style={styles.fieldInput}
                placeholder="AA"
                keyboardType="number-pad"
                maxLength={4}
                value={cardForm.expiryYear}
                onChangeText={(v) => setCardForm((prev) => ({ ...prev, expiryYear: v.replace(/\D/g, '') }))}
              />
            </View>
            <View style={[styles.formField, { flex: 1 }]}>
              <Text style={styles.fieldLabel}>CVV</Text>
              <TextInput
                style={styles.fieldInput}
                placeholder="000"
                keyboardType="number-pad"
                maxLength={4}
                secureTextEntry
                value={cardForm.cvv}
                onChangeText={(v) => setCardForm((prev) => ({ ...prev, cvv: v.replace(/\D/g, '') }))}
              />
            </View>
          </View>

          <View style={styles.formField}>
            <Text style={styles.fieldLabel}>Nome no cartão</Text>
            <TextInput
              style={styles.fieldInput}
              placeholder="NOME SOBRENOME"
              autoCapitalize="characters"
              value={cardForm.cardholderName}
              onChangeText={(v) => setCardForm((prev) => ({ ...prev, cardholderName: v }))}
            />
          </View>

          <TouchableOpacity
            style={[styles.primaryButton, actionLoading === 'checkout' && styles.buttonDisabled]}
            onPress={handleSaveCard}
            disabled={actionLoading !== null}
          >
            {actionLoading === 'checkout' ? (
              <ActivityIndicator color={colors.white} size="small" />
            ) : (
              <>
                <Ionicons name="checkmark-circle-outline" size={18} color={colors.white} />
                <Text style={styles.primaryButtonText}>Confirmar e salvar cartão</Text>
              </>
            )}
          </TouchableOpacity>
        </KeyboardAvoidingView>
      </Modal>

      <View style={styles.heroCard}>
        <View style={styles.heroHeader}>
          <View>
            <Text style={styles.eyebrow}>Plano atual</Text>
            <Text style={styles.heroTitle}>{statusLabel}</Text>
          </View>
          <View style={styles.statusPill}>
            <Text style={styles.statusPillText}>{formatCurrency(subscription.planAmount)}</Text>
          </View>
        </View>

        <Text style={styles.heroMessage}>
          O cadastro da empresa continua com trial de 30 dias. A regularização do método de pagamento precisa ser concluída antes do vencimento para evitar bloqueio operacional.
        </Text>

        <View style={styles.heroMetaRow}>
          <View style={styles.heroMetric}>
            <Text style={styles.metricLabel}>Trial até</Text>
            <Text style={styles.metricValue}>{formatDate(subscription.trialEndsAt)}</Text>
          </View>
          <View style={styles.heroMetric}>
            <Text style={styles.metricLabel}>Período atual</Text>
            <Text style={styles.metricValue}>{formatDate(subscription.currentPeriodEnd)}</Text>
          </View>
          <View style={styles.heroMetric}>
            <Text style={styles.metricLabel}>Dias restantes</Text>
            <Text style={styles.metricValue}>{daysLeft === null ? '-' : String(daysLeft)}</Text>
          </View>
        </View>
      </View>

      {!hasPaymentMethod && !loadingData && (
        <View style={styles.warningCard}>
          <Ionicons name="alert-circle-outline" size={18} color={colors.warning} />
          <Text style={styles.warningText}>
            Nenhum método de pagamento salvo. O método se torna obrigatório antes do fim do trial.
          </Text>
        </View>
      )}

      <View style={styles.actionRow}>
        <TouchableOpacity
          style={[styles.primaryButton, actionLoading === 'checkout' && styles.buttonDisabled]}
          onPress={handleStartCheckout}
          disabled={actionLoading !== null || loadingBilling}
        >
          {actionLoading === 'checkout' ? (
            <ActivityIndicator color={colors.white} size="small" />
          ) : (
            <>
              <Ionicons name="card-outline" size={18} color={colors.white} />
              <Text style={styles.primaryButtonText}>Cadastrar cartão</Text>
            </>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.secondaryButton, actionLoading === 'pix' && styles.buttonDisabled]}
          onPress={handlePixFallback}
          disabled={actionLoading !== null || loadingBilling}
        >
          {actionLoading === 'pix' ? (
            <ActivityIndicator color={colors.primary} size="small" />
          ) : (
            <>
              <Ionicons name="qr-code-outline" size={18} color={colors.primary} />
              <Text style={styles.secondaryButtonText}>Solicitar Pix</Text>
            </>
          )}
        </TouchableOpacity>
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Provider Mercado Pago</Text>
        {loadingData && !providerStatus ? (
          <ActivityIndicator color={colors.primary} />
        ) : (
          <>
            <Text style={styles.providerMessage}>{providerStatus?.message || 'Status indisponível.'}</Text>
            <View style={styles.providerGrid}>
              <View style={styles.providerBadge}><Text style={styles.providerBadgeLabel}>Public key</Text><Text style={styles.providerBadgeValue}>{providerStatus?.publicKeyConfigured ? 'OK' : 'Pendente'}</Text></View>
              <View style={styles.providerBadge}><Text style={styles.providerBadgeLabel}>Access token</Text><Text style={styles.providerBadgeValue}>{providerStatus?.accessTokenConfigured ? 'OK' : 'Pendente'}</Text></View>
              <View style={styles.providerBadge}><Text style={styles.providerBadgeLabel}>Webhook</Text><Text style={styles.providerBadgeValue}>{providerStatus?.webhookSecretConfigured ? 'OK' : 'Pendente'}</Text></View>
              <View style={styles.providerBadge}><Text style={styles.providerBadgeLabel}>Método salvo</Text><Text style={styles.providerBadgeValue}>{providerStatus?.hasPaymentMethod ? 'Sim' : 'Não'}</Text></View>
            </View>
          </>
        )}
      </View>

      {activePixInvoice && (
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Pix em aberto</Text>
          <Text style={styles.providerMessage}>
            Use este QR code para regularizar a assinatura. O código expira em {formatDateTime(activePixInvoice.pix_expires_at)}.
          </Text>
          {activePixInvoice.pix_qr_code ? (
            <View style={styles.pixQrWrapper}>
              <Image
                source={{ uri: `data:image/png;base64,${activePixInvoice.pix_qr_code}` }}
                style={styles.pixQrImage}
                resizeMode="contain"
              />
            </View>
          ) : null}
          <Text style={styles.pixLabel}>Copia e cola</Text>
          <Text style={styles.pixCode}>{activePixInvoice.pix_qr_code_text}</Text>
          <TouchableOpacity style={styles.pixCopyButton} onPress={handleCopyPixCode}>
            <Ionicons name="copy-outline" size={16} color={colors.primary} />
            <Text style={styles.pixCopyButtonText}>Copiar código Pix</Text>
          </TouchableOpacity>
        </View>
      )}

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Métodos cadastrados</Text>
        {loadingData ? (
          <ActivityIndicator color={colors.primary} />
        ) : paymentMethods.length === 0 ? (
          <Text style={styles.emptyState}>Nenhum método cadastrado ainda.</Text>
        ) : (
          paymentMethods.map((method) => (
            <View key={method.id} style={styles.listRow}>
              <View>
                <Text style={styles.listTitle}>{getMethodLabel(method)}</Text>
                <Text style={styles.listSubtitle}>
                  {method.type === 'card'
                    ? `Validade ${String(method.expiry_month || '').padStart(2, '0')}/${method.expiry_year || '--'}`
                    : 'Regularização por Pix'}
                </Text>
              </View>
              {method.is_default && <Text style={styles.defaultBadge}>Padrão</Text>}
            </View>
          ))
        )}
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Últimas cobranças</Text>
        {loadingData ? (
          <ActivityIndicator color={colors.primary} />
        ) : invoices.length === 0 ? (
          <Text style={styles.emptyState}>Nenhuma cobrança registrada ainda.</Text>
        ) : (
          invoices.map((invoice) => (
            <View key={invoice.id} style={styles.invoiceRow}>
              <View style={styles.invoiceMain}>
                <Text style={styles.listTitle}>{formatCurrency(invoice.amount)}</Text>
                <Text style={styles.listSubtitle}>Vencimento {formatDate(invoice.due_date)}</Text>
                {invoice.payment_method_type === 'pix' && invoice.pix_expires_at ? (
                  <Text style={styles.invoiceDetail}>Expira em {formatDateTime(invoice.pix_expires_at)}</Text>
                ) : null}
              </View>
              <View style={styles.invoiceMeta}>
                <Text style={styles.invoiceStatus}>{getInvoiceStatusLabel(invoice.status)}</Text>
                <Text style={styles.invoiceMethod}>{invoice.payment_method_type === 'pix' ? 'Pix' : invoice.payment_method_type === 'card' ? 'Cartão' : 'A definir'}</Text>
              </View>
            </View>
          ))
        )}
      </View>

      <TouchableOpacity style={styles.refreshLink} onPress={handleRefresh}>
        <Ionicons name="refresh-outline" size={16} color={colors.primary} />
        <Text style={styles.refreshLinkText}>Atualizar dados de assinatura</Text>
      </TouchableOpacity>
    </ScreenScaffold>
  );
}

const styles = StyleSheet.create({
  contentContainer: {
    padding: 20,
    gap: 16,
  },
  heroCard: {
    backgroundColor: '#F6F9FB',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 20,
  },
  heroHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    gap: 12,
  },
  eyebrow: {
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    color: colors.textSecondary,
    marginBottom: 4,
  },
  heroTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: colors.text,
  },
  statusPill: {
    backgroundColor: colors.primary,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  statusPillText: {
    color: colors.white,
    fontWeight: '700',
  },
  heroMessage: {
    fontSize: 15,
    lineHeight: 22,
    color: colors.text,
    marginBottom: 16,
  },
  heroMetaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  heroMetric: {
    minWidth: 140,
    backgroundColor: colors.white,
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  metricLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: 6,
  },
  metricValue: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
  },
  warningCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: colors.warningSurface,
    borderRadius: 14,
    padding: 14,
  },
  warningText: {
    flex: 1,
    color: colors.text,
    lineHeight: 20,
  },
  actionRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  primaryButton: {
    minHeight: 48,
    borderRadius: 14,
    backgroundColor: colors.primary,
    paddingHorizontal: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    minWidth: 220,
  },
  primaryButtonText: {
    color: colors.white,
    fontWeight: '700',
    fontSize: 15,
  },
  secondaryButton: {
    minHeight: 48,
    borderRadius: 14,
    backgroundColor: colors.white,
    paddingHorizontal: 18,
    borderWidth: 1,
    borderColor: colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    minWidth: 220,
  },
  secondaryButtonText: {
    color: colors.primary,
    fontWeight: '700',
    fontSize: 15,
  },
  buttonDisabled: {
    opacity: 0.65,
  },
  card: {
    backgroundColor: colors.white,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.text,
    marginBottom: 12,
  },
  providerMessage: {
    color: colors.textSecondary,
    lineHeight: 20,
    marginBottom: 12,
  },
  providerGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  providerBadge: {
    minWidth: 140,
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 12,
  },
  providerBadgeLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: 4,
  },
  providerBadgeValue: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
  },
  emptyState: {
    color: colors.textSecondary,
    lineHeight: 20,
  },
  listRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  listTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
  },
  listSubtitle: {
    marginTop: 4,
    color: colors.textSecondary,
  },
  defaultBadge: {
    color: colors.success,
    fontWeight: '700',
  },
  invoiceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    gap: 12,
  },
  invoiceMain: {
    flex: 1,
  },
  invoiceMeta: {
    alignItems: 'flex-end',
    gap: 4,
  },
  invoiceStatus: {
    fontWeight: '700',
    color: colors.text,
  },
  invoiceMethod: {
    color: colors.textSecondary,
  },
  invoiceDetail: {
    marginTop: 4,
    color: colors.textSecondary,
    fontSize: 12,
  },
  pixQrWrapper: {
    alignSelf: 'center',
    backgroundColor: colors.white,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 12,
    marginBottom: 16,
  },
  pixQrImage: {
    width: 220,
    height: 220,
  },
  pixLabel: {
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    color: colors.textSecondary,
    marginBottom: 8,
  },
  pixCode: {
    fontSize: 13,
    lineHeight: 20,
    color: colors.text,
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 12,
  },
  pixCopyButton: {
    marginTop: 12,
    alignSelf: 'flex-start',
    minHeight: 40,
    borderRadius: 12,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.white,
  },
  pixCopyButtonText: {
    color: colors.primary,
    fontWeight: '700',
  },
  refreshLink: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 8,
  },
  refreshLinkText: {
    color: colors.primary,
    fontWeight: '700',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: colors.white,
    padding: 24,
    gap: 16,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.text,
  },
  modalSubtitle: {
    fontSize: 14,
    lineHeight: 20,
    color: colors.textSecondary,
  },
  formField: {
    gap: 6,
  },
  formRow: {
    flexDirection: 'row',
    gap: 12,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.text,
  },
  fieldInput: {
    height: 48,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: 14,
    fontSize: 15,
    color: colors.text,
    backgroundColor: '#FAFAFA',
  },
});
