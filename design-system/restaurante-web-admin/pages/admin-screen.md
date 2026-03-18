# Admin Screen Page Overrides

> **PROJECT:** Restaurante Web Admin
> **Generated:** 2026-03-18 18:42:01
> **Page Type:** Dashboard / Data View

> ⚠️ **IMPORTANT:** Rules in this file **override** the Master file (`design-system/MASTER.md`).
> Only deviations from the Master are documented here. For all other rules, refer to the Master.

---

## Page-Specific Rules

### Layout Overrides

- **Desktop Layout:** grid de cards com 2-4 colunas conforme largura disponivel
- **Tablet Layout:** 2 colunas com priorizacao de blocos criticos no topo
- **Primary Flow Sections:** 1) Indicadores operacionais, 2) Atalhos de acao, 3) Gestao (pedidos/estoque/caixa), 4) Configuracoes
- **Navigation Rule:** qualquer tarefa critica deve estar a no maximo 2 cliques

### Spacing Overrides

- **Section Gaps:** usar `--space-lg` entre blocos principais
- **Card Content:** usar `--space-md` interno para manter leitura rapida
- **Dense Rows:** em listas internas, usar espacamento compacto sem perder legibilidade

### Typography Overrides

- **Card Titles:** peso 600 para diferenciar acao principal
- **Secondary Info:** texto auxiliar com contraste AA e tamanho menor
- **Status Labels:** curto e objetivo (sem frases longas)

### Color Overrides

- **Status Strategy:**
- **Operacao normal:** neutro com destaque leve
- **Atencao necessaria:** alerta visual moderado
- **Bloqueio/erro critico:** erro de alto contraste
- **Sucesso de acao admin:** feedback positivo curto

### Component Overrides

- Usar cards de acao com icone, titulo, descricao curta e CTA explicito
- Usar bloco de indicadores com legenda clara (nao somente cor)
- Usar skeleton em carregamento inicial e fallback acionavel em erro
- Evitar carrossel para acoes operacionais; priorizar grid estavel

---

## Page-Specific Components

- **AdminPriorityCard:** acao critica com CTA primario
- **AdminOpsStatsRow:** indicadores de operacao com estados
- **AdminQuickActionsGrid:** atalhos frequentes por dominio
- **AdminSectionStatusBanner:** loading/erro/vazio por secao

---

## Recommendations

- Priorizar tarefas de maior frequencia no primeiro viewport
- Garantir que cada card indique claramente o resultado esperado da acao
- Padronizar estados para reduzir duvida operacional
- Validar responsividade em 768, 1024, 1366 e 1440
- Garantir navegacao por teclado e foco visivel em todos os atalhos
