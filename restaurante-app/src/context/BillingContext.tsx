/**
 * BillingContext — restaurante-app
 *
 * Provides the current subscription state for the authenticated company.
 * This context is mounted inside AuthProvider and consumes useAuth() to
 * get the companyId once the user is loaded.
 *
 * Enforcement rule:
 *   - Login is NEVER blocked (only operational flows).
 *   - canOperate is FALSE only when status is 'suspended' or 'cancelled'.
 *   - During grace_period and past_due, canOperate respects the time window.
 *
 * Data source: Supabase RPC get_company_subscription_state(company_id)
 * This is read-only from the client; writes go through the webhook/Edge Function.
 */
import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  ReactNode,
} from 'react';
import { supabase } from '../config/SupabaseConfig';
import { useAuth } from './AuthContext';
import { isFeatureEnabled } from '../config/featureFlags';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
export type SubscriptionStatus =
  | 'trialing'
  | 'active'
  | 'past_due'
  | 'grace_period'
  | 'suspended'
  | 'reactivated'
  | 'cancelled'
  | null; // null = not yet loaded

export interface SubscriptionState {
  subscriptionId: string | null;
  status: SubscriptionStatus;
  trialEndsAt: Date | null;
  currentPeriodStart: Date | null;
  currentPeriodEnd: Date | null;
  gracePeriodEnd: Date | null;
  planAmount: number;   // centavos (14900 = R$149,00)
  canOperate: boolean;
}

interface BillingContextType {
  subscription: SubscriptionState;
  loadingBilling: boolean;
  reloadSubscription: () => Promise<void>;
}

// ---------------------------------------------------------------------------
// Defaults
// ---------------------------------------------------------------------------
const DEFAULT_STATE: SubscriptionState = {
  subscriptionId: null,
  status: null,
  trialEndsAt: null,
  currentPeriodStart: null,
  currentPeriodEnd: null,
  gracePeriodEnd: null,
  planAmount: 14900,
  canOperate: true, // fail-open while loading; LicenseGate checks loadingBilling
};

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------
const BillingContext = createContext<BillingContextType>({
  subscription: DEFAULT_STATE,
  loadingBilling: true,
  reloadSubscription: async () => {},
});

export const useBilling = (): BillingContextType => useContext(BillingContext);

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------
interface BillingProviderProps {
  children: ReactNode;
}

export const BillingProvider: React.FC<BillingProviderProps> = ({ children }) => {
  const { user } = useAuth();
  const [subscription, setSubscription] = useState<SubscriptionState>(DEFAULT_STATE);
  const [loadingBilling, setLoadingBilling] = useState<boolean>(true);

  const billingEnabled = isFeatureEnabled('billing_enabled');

  const fetchSubscriptionState = useCallback(async (companyId: string) => {
    try {
      const { data, error } = await supabase.rpc('get_company_subscription_state', {
        p_company_id: companyId,
      });

      if (error) {
        console.warn('[BillingContext] RPC error:', error.message);
        // On error, fail-open: allow operation rather than blocking everyone
        setSubscription({ ...DEFAULT_STATE, status: 'trialing', canOperate: true });
        return;
      }

      // RPC returns an array with one row
      const row = Array.isArray(data) ? data[0] : data;
      if (!row) {
        setSubscription({ ...DEFAULT_STATE, status: 'trialing', canOperate: true });
        return;
      }

      setSubscription({
        subscriptionId: row.subscription_id ?? null,
        status: (row.status as SubscriptionStatus) ?? 'trialing',
        trialEndsAt: row.trial_ends_at ? new Date(row.trial_ends_at) : null,
        currentPeriodStart: row.current_period_start ? new Date(row.current_period_start) : null,
        currentPeriodEnd: row.current_period_end ? new Date(row.current_period_end) : null,
        gracePeriodEnd: row.grace_period_end ? new Date(row.grace_period_end) : null,
        planAmount: row.plan_amount ?? 14900,
        canOperate: Boolean(row.can_operate),
      });
    } catch (e: any) {
      console.error('[BillingContext] Unexpected error:', e?.message ?? e);
      setSubscription({ ...DEFAULT_STATE, status: 'trialing', canOperate: true });
    }
  }, []);

  const reloadSubscription = useCallback(async () => {
    if (!billingEnabled) return;
    const companyId = user?.companyId;
    if (!companyId) return;
    setLoadingBilling(true);
    await fetchSubscriptionState(companyId);
    setLoadingBilling(false);
  }, [user?.companyId, billingEnabled, fetchSubscriptionState]);

  useEffect(() => {
    if (!billingEnabled) {
      // Billing not active: always allow, stop loading
      setSubscription({ ...DEFAULT_STATE, status: 'trialing', canOperate: true });
      setLoadingBilling(false);
      return;
    }

    const companyId = user?.companyId;
    if (!companyId) {
      setLoadingBilling(false);
      return;
    }

    setLoadingBilling(true);
    fetchSubscriptionState(companyId).finally(() => setLoadingBilling(false));
  }, [user?.companyId, billingEnabled, fetchSubscriptionState]);

  return (
    <BillingContext.Provider value={{ subscription, loadingBilling, reloadSubscription }}>
      {children}
    </BillingContext.Provider>
  );
};
