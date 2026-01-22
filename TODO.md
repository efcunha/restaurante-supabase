# TODO.md - Sistema Multi-Empresa (SaaS)

**Última atualização:** 22/01/2026 15:15
**Status do Projeto:** ✅ SaaS v3.0 Completo (Segurança + Multi-Inquilino)

---

## ✅ CONCLUÍDO (Fase 3: Security & Polish)

### Segurança e Multi-Inquilino (v3.0) - 22/01/2026

- [x] Implementar `firestore.rules` com validação de `companyId`.
- [x] Garantir isolamento total de dados entre empresas.
- [x] Atualizar `AuthContext` para carregar dados da empresa.
- [x] Criar fluxo de cadastro de nova empresa (RegisterCompanyScreen).
- [x] Migrar coleções para sub-coleções (`companies/{id}/...`).

### Personalização e Polimento

- [x] **PDFs Dinâmicos:** Recibos agora mostram Nome e CNPJ da empresa real.
- [x] **Edição de Empresa:** Admin pode alterar dados da empresa pelo app.
- [x] **Toast Notifications:** Substituídos alertas nativos por Toasts elegantes.
- [x] **Correção de Cardápio:** Categoria "Outros" agora aparece e ordena corretamente.
- [x] **Role Refactor:** "Churrasqueiro" renomeado para "Cozinheiro(a)" em todo o sistema.
- [x] **Acesso Restrito:** Garçom agora vê apenas "Novo Pedido" e "Comandas".

---

## ✅ CONCLUÍDO (Fases Anteriores)

### Funcionalidades Core (v2.x)

- [x] Sistema de Cancelamento com motivo e auditoria.
- [x] Cálculo Dinâmico de Preços no Firestore.
- [x] Seleção de Tamanhos (300ml/180ml) para Caldos.
- [x] Impressão de Comprovantes (Integração PrinterService).
- [x] Layout Otimizado para Bebidas.

---

## 📝 BACKLOG (Futuro)

### Melhorias SaaS

- [ ] **Planos de Assinatura:** Integração com Stripe/Asaas para cobrança mensal.
- [ ] **Limites por Plano:** Restringir número de usuários ou pedidos por plano.
- [ ] **Dashboard Super-Admin:** Painel para ver todas as empresas cadastradas.

### Funcionalidades App

- [ ] **Modo Offline Real:** Sincronização robusta quando a internet voltar (atualmente leitura é cacheada).
- [ ] **Gráficos Avançados:** Relatórios financeiros com curvas de tendência.
- [ ] **Estoque:** Controle de baixa automática de ingredientes.

### Técnico

- [ ] **Testes E2E:** Automatizar fluxo de "Registro -> Pedido -> Pagamento" com Detox.
- [ ] **CI/CD:** Deploy automático na Play Store.

---

## 🔧 MANUTENÇÃO RECOMENDADA

1. **Backup:** Exportar dados do Firestore semanalmente.
2. **Logs:** Monitorar log de erros no console do Google Cloud.
3. **Billing:** Acompanhar uso do Firebase (especialmente leituras do Firestore).

---

**Nota:** O sistema atingiu a maturidade para operação comercial em modelo SaaS.
