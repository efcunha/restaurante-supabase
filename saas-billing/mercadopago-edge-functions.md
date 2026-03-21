# Mercado Pago Edge Functions

## Secrets

- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `MERCADOPAGO_ACCESS_TOKEN`
- `MERCADOPAGO_PUBLIC_KEY`
- `MERCADOPAGO_WEBHOOK_SECRET`

## Functions Introduced Now

### `billing-provider-status`

Purpose:

- validate the authenticated admin
- inspect provider configuration
- summarize subscription linkage
- expose readiness for the BillingScreen

### `billing-create-checkout`

Purpose:

- validate the authenticated admin
- log the checkout/card-setup request
- return the Mercado Pago public key when configured
- establish the backend contract that the client will use for tokenization setup

Current limitation:

- card tokenization is not completed yet in the client flow
- this function returns readiness metadata and audit trace, not a production checkout URL

### `billing-create-pix-fallback`

Purpose:

- validate the authenticated admin
- register the intent to regularize through Pix
- expose provider readiness and the next backend step

Current limitation:

- Pix charge emission is not completed yet in provider integration

## Next Backend Steps

1. Add Mercado Pago customer upsert flow
2. Add tokenized card setup persistence into `payment_methods`
3. Add recurring subscription creation and update of `subscriptions.mp_*`
4. Add Pix invoice generation and persistence into `invoices`
5. Add webhook endpoint for payment and subscription events
