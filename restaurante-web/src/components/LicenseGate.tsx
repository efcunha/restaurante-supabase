/**
 * LicenseGate — restaurante-web
 *
 * Web mirror of restaurante-app/src/components/LicenseGate.tsx
 * Wraps screens that require an active subscription to operate.
 * Uses React Native for Web primitives (same as rest of restaurante-web).
 *
 * Rules: identical to app — see app LicenseGate for full rationale.
 */
import React, { ReactNode } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Linking,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useBilling, SubscriptionStatus } from '../context/BillingContext';
import { isFeatureEnabled } from '../config/featureFlags';
import { colors } from '../theme/colors';

interface LicenseGateProps {
  children: ReactNode;
  isBillingScreen?: boolean;
}

// ---------------------------------------------------------------------------
// Status display helpers
// ---------------------------------------------------------------------------
const STATUS_LABEL: Record<NonNullable<SubscriptionStatus>, string> = {
  trialing: 'Período de teste',
  active: 'Assinatura ativa',
  past_due: 'Pagamento pendente',
  grace_period: 'Período de tolerância',
  suspended: 'Conta suspensa',
  reactivated: 'Conta reativada',
  cancelled: 'Assinatura cancelada',
};

const STATUS_ICON: Record<NonNullable<SubscriptionStatus>, string> = {
  trialing: 'time-outline',
  active: 'checkmark-circle-outline',
  past_due: 'alert-circle-outline',
  grace_period: 'hourglass-outline',
  suspended: 'ban-outline',
  reactivated: 'refresh-circle-outline',
  cancelled: 'close-circle-outline',
};

function getBlockingMessage(status: SubscriptionStatus): string {
  switch (status) {
    case 'suspended':
      return 'Sua conta está suspensa por falta de pagamento.\nRegularize sua assinatura para retomar o acesso às operações.';
    case 'cancelled':
      return 'Sua assinatura foi cancelada.\nEntre em contato com o suporte para reativar.';
    case 'grace_period':
      return 'Estamos no período de tolerância após a falha no pagamento.\nRegularize agora para não perder o acesso.';
    case 'past_due':
      return 'Houve uma falha no pagamento. Regularize sua assinatura para continuar operando.';
    default:
      return 'Acesso operacional temporariamente bloqueado. Regularize sua assinatura.';
  }
}

function formatDate(date: Date | null): string {
  if (!date) return '';
  return date.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    timeZone: 'America/Sao_Paulo',
  });
}

// ---------------------------------------------------------------------------
// Blocking overlay
// ---------------------------------------------------------------------------
interface BlockingOverlayProps {
  status: SubscriptionStatus;
  gracePeriodEnd: Date | null;
  currentPeriodEnd: Date | null;
}

function BlockingOverlay({ status, gracePeriodEnd, currentPeriodEnd }: BlockingOverlayProps) {
  const label = status ? STATUS_LABEL[status] : 'Bloqueado';
  const icon = status ? STATUS_ICON[status] : 'ban-outline';
  const message = getBlockingMessage(status);

  const resolveDate = status === 'grace_period' ? gracePeriodEnd
    : status === 'past_due' ? currentPeriodEnd
    : null;

  const handleOpenBillingContact = () => {
    Linking.openURL('mailto:suporte@restaurante.app?subject=Regularizar+assinatura').catch(() => {});
  };

  return (
    <View style={styles.overlayRoot}>
      <ScrollView contentContainerStyle={styles.overlayContent}>
        <View style={styles.card}>
          <View style={styles.iconWrapper}>
            <Ionicons name={icon as any} size={52} color={colors.danger} />
          </View>

          <Text style={styles.overlayTitle}>{label}</Text>

          <Text style={styles.overlayMessage}>{message}</Text>

          {resolveDate && (
            <View style={styles.deadlineBadge}>
              <Ionicons name="calendar-outline" size={16} color={colors.warning} />
              <Text style={styles.deadlineText}>
                Prazo: {formatDate(resolveDate)}
              </Text>
            </View>
          )}

          <View style={styles.ctaSection}>
            <Text style={styles.ctaTitle}>Como regularizar</Text>

            <View style={styles.ctaCard}>
              <Ionicons name="card-outline" size={20} color={colors.primary} />
              <View style={styles.ctaTextBlock}>
                <Text style={styles.ctaMethod}>Cartão de crédito</Text>
                <Text style={styles.ctaDesc}>
                  Acesse as configurações de assinatura no menu superior.
                </Text>
              </View>
            </View>

            <View style={styles.ctaCard}>
              <Ionicons name="qr-code-outline" size={20} color={colors.primary} />
              <View style={styles.ctaTextBlock}>
                <Text style={styles.ctaMethod}>Pix</Text>
                <Text style={styles.ctaDesc}>
                  Gere um QR Code Pix nas configurações de assinatura.
                </Text>
              </View>
            </View>
          </View>

          <TouchableOpacity style={styles.supportBtn} onPress={handleOpenBillingContact}>
            <Ionicons name="headset-outline" size={18} color={colors.primary} />
            <Text style={styles.supportBtnText}>Falar com suporte</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

// ---------------------------------------------------------------------------
// LicenseGate
// ---------------------------------------------------------------------------
export function LicenseGate({ children, isBillingScreen = false }: LicenseGateProps) {
  const billingEnabled = isFeatureEnabled('billing_enabled');
  const gateEnabled = isFeatureEnabled('billing_licenseGate');
  const { subscription, loadingBilling } = useBilling();

  if (isBillingScreen || !billingEnabled || !gateEnabled) {
    return <>{children}</>;
  }

  if (loadingBilling || subscription.status === null) {
    return <>{children}</>;
  }

  if (subscription.canOperate) {
    return <>{children}</>;
  }

  return (
    <BlockingOverlay
      status={subscription.status}
      gracePeriodEnd={subscription.gracePeriodEnd}
      currentPeriodEnd={subscription.currentPeriodEnd}
    />
  );
}

export default LicenseGate;

// ---------------------------------------------------------------------------
// TrialBanner
// ---------------------------------------------------------------------------
export function TrialBanner() {
  const billingEnabled = isFeatureEnabled('billing_enabled');
  const { subscription, loadingBilling } = useBilling();

  if (!billingEnabled || loadingBilling) return null;
  if (subscription.status !== 'trialing' || !subscription.trialEndsAt) return null;

  const now = new Date();
  const daysLeft = Math.ceil(
    (subscription.trialEndsAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
  );

  if (daysLeft <= 0) return null;

  const isUrgent = daysLeft <= 7;

  return (
    <View style={[styles.trialBanner, isUrgent && styles.trialBannerUrgent]}>
      <Ionicons
        name="time-outline"
        size={14}
        color={isUrgent ? colors.danger : colors.warning}
      />
      <Text style={[styles.trialBannerText, isUrgent && styles.trialBannerTextUrgent]}>
        {daysLeft === 1
          ? 'Último dia de teste! Adicione um cartão para continuar.'
          : `${daysLeft} dias restantes no período de teste.`}
      </Text>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------
const styles = StyleSheet.create({
  overlayRoot: {
    flex: 1,
    backgroundColor: '#F3F4F6',
  },
  overlayContent: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  card: {
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: 40,
    maxWidth: 480,
    width: '100%',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  iconWrapper: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: colors.dangerSurface,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  overlayTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.text,
    textAlign: 'center',
    marginBottom: 12,
  },
  overlayMessage: {
    fontSize: 15,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 20,
  },
  deadlineBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.warningSurface,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    marginBottom: 28,
  },
  deadlineText: {
    fontSize: 13,
    color: colors.warning,
    fontWeight: '600',
  },
  ctaSection: {
    width: '100%',
    marginBottom: 24,
  },
  ctaTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 12,
  },
  ctaCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    padding: 14,
    marginBottom: 10,
    width: '100%',
  },
  ctaTextBlock: {
    flex: 1,
  },
  ctaMethod: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 2,
  },
  ctaDesc: {
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 18,
  },
  supportBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  supportBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.primary,
  },
  trialBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.warningSurface,
    paddingHorizontal: 16,
    paddingVertical: 6,
  },
  trialBannerUrgent: {
    backgroundColor: colors.dangerSurface,
  },
  trialBannerText: {
    fontSize: 12,
    color: colors.warning,
    fontWeight: '500',
    flex: 1,
  },
  trialBannerTextUrgent: {
    color: colors.danger,
  },
});
