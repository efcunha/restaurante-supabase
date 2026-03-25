/**
 * BillingContext — restaurante-web
 *
 * Web-side mirror of restaurante-app/src/context/BillingContext.tsx
 * Provides the current subscription state for the authenticated company.
 *
 * Enforcement rule:
 *   - Login is NEVER blocked.
 *   - canOperate is FALSE only for 'suspended' / 'cancelled' or expired windows.
 *   - During grace_period / past_due, canOperate respects the DB time window.
 *
 * Data source: Supabase RPC get_company_subscription_state(company_id)
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
  | null;

export interface SubscriptionState {
  subscriptionId: string | null;
  status: SubscriptionStatus;
  trialEndsAt: Date | null;
  currentPeriodStart: Date | null;
  currentPeriodEnd: Date | null;
  gracePeriodEnd: Date | null;
  planAmount: number;
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
  planAmount: 0,
  canOperate: true,
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
  const billingForceBlock = isFeatureEnabled('billing_forceBlock');

  const fetchSubscriptionState = useCallback(async (companyId: string) => {
    try {
      const { data, error } = await supabase.rpc('get_company_subscription_state', {
        p_company_id: companyId,
      });

      if (error) {
        console.warn('[BillingContext] RPC error:', error.message);
        setSubscription({ ...DEFAULT_STATE, status: 'trialing', canOperate: true });
        return;
      }

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
        planAmount: row.plan_amount ?? 0,
        canOperate: Boolean(row.can_operate),
      });
    } catch (e: any) {
      console.error('[BillingContext] Unexpected error:', e?.message ?? e);
      setSubscription({ ...DEFAULT_STATE, status: 'trialing', canOperate: true });
    }
  }, []);

  const reloadSubscription = useCallback(async () => {
    if (!billingEnabled) return;
    if (billingForceBlock) {
      setSubscription({
        ...DEFAULT_STATE,
        status: 'suspended',
        canOperate: false,
      });
      setLoadingBilling(false);
      return;
    }
    const companyId = user?.companyId;
    if (!companyId) return;
    setLoadingBilling(true);
    await fetchSubscriptionState(companyId);
    setLoadingBilling(false);
  }, [user?.companyId, billingEnabled, billingForceBlock, fetchSubscriptionState]);

  useEffect(() => {
    if (!billingEnabled) {
      setSubscription({ ...DEFAULT_STATE, status: 'trialing', canOperate: true });
      setLoadingBilling(false);
      return;
    }

    if (billingForceBlock) {
      setSubscription({
        ...DEFAULT_STATE,
        status: 'suspended',
        canOperate: false,
      });
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
  }, [user?.companyId, billingEnabled, billingForceBlock, fetchSubscriptionState]);

  return (
    <BillingContext.Provider value={{ subscription, loadingBilling, reloadSubscription }}>
      {children}
    </BillingContext.Provider>
  );
};
