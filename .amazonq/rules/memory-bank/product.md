# Product Overview

## Purpose
Monorepo for a full-stack restaurant management SaaS ecosystem. Provides POS (Point of Sale), kitchen/assembly management, delivery, table/comanda management, billing, and backoffice operations for restaurant businesses in Brazil.

## Value Proposition
End-to-end restaurant operations platform: from order taking (balcão, mesa, delivery, pizza) through kitchen workflow, payment processing (including TEF/maquininha integration), to SaaS billing and administrative backoffice — all multi-tenant on Supabase.

## Key Features
- **POS (PDV)**: Order creation for counter (balcão), table (mesa), delivery, and pizza flows
- **Kitchen & Assembly**: Real-time kitchen screen (CozinhaScreen) and assembly screen (MontagemScreen) with live order updates
- **Table/Comanda Management**: Table map, comanda lifecycle, consolidation, transfer, and split payment
- **Delivery**: Delivery pipeline with route management, occurrence tracking, WhatsApp integration
- **Payment Processing**: TEF/maquininha (card machine) integration, PIX, split payments, cash register (caixa) open/close
- **Menu Management**: Product catalog, adicionais (extras), pizza builder, stock/inventory, public menu (QR code)
- **SaaS Billing**: Subscription management, plan configuration, invoicing, MercadoPago integration, webhook reconciliation
- **Backoffice (Ops)**: Customer lifecycle, MRR/churn metrics, audit trails, observability, rate limiting
- **Scale/Balance Integration**: USB serial bridge for weighing scales (balança) in self-service flows
- **Internationalization**: i18n with pt/en locales
- **Security**: MFA, biometric auth, LGPD compliance, RLS, Snyk scanning, audit logging

## Target Users
- Restaurant owners and managers (admin/gerente roles)
- Waiters/operators (garçom role)
- Kitchen staff
- Delivery drivers
- End customers (public menu)

## Subprojects
| Subproject | Purpose |
|---|---|
| `restaurante-app` | Mobile app (React Native + Expo) for Android/iOS |
| `restaurante-web` | Web POS app (Expo Web) + E2E tests |
| `restaurante-ops` | Backoffice SaaS server (Node.js/TypeScript on Railway) |
| `restaurante-site` | Marketing/landing site (Next.js + Tailwind) |
| `database-backup` | Supabase migrations, Edge Functions, backup/restore scripts |
| `balanca-bridge` | USB serial bridge for weighing scales |
| `docs` | Cross-cutting documentation (security, design system, billing, observability) |
