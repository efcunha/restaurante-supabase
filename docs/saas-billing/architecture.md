# Billing Architecture

## Product Boundaries

### Operational products

- `restaurante-app`: POS mobile operations
- `restaurante-web`: POS web operations

Responsibilities kept here:

- Show subscription state
- Show billing entry points
- Allow the company admin to start billing regularization
- Display invoices and saved payment methods
- Block operations when subscription rules require it

### Future backoffice product

- `restaurante-ops`: customer lifecycle, contracts, support, SaaS metrics, reconciliation, and operational alerts

Responsibilities kept out of app/web:

- Multi-company customer list
- Contract management
- Churn and usage metrics
- Manual financial interventions
- Support tooling and auditing console

## Data Flow

1. Signup creates company + profile + `subscriptions` row in `trialing`.
2. BillingScreen reads `subscriptions`, `payment_methods`, and `invoices` through RLS-safe reads.
3. Client actions call Edge Functions.
4. Edge Functions validate admin role, use service role for mutations, and talk to Mercado Pago.
5. Webhooks reconcile local billing tables and operational access state.

## Security Model

- Client reads only its own company data.
- Client never inserts or updates `payment_methods`, `subscriptions`, `invoices`, or `billing_audit_log` directly.
- Edge Functions must validate:
  - authenticated user
  - admin role
  - resolved `company_id`
- `companies.is_test = true` remains exempt from billing enforcement.
