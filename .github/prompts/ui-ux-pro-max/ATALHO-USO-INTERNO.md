# Atalho Interno - UI/UX Pro Max

Guia rapido para o time usar o workflow de UI/UX no `restaurante-app` e `restaurante-web`.

Pack completo do time: `.github/skills/ui-ux-pro-max/PACK-EXECUCAO-UIUX.md`
Índice de onboarding: `.github/skills/ui-ux-pro-max/ONBOARDING-UIUX.md`

## 1) No Copilot Chat (recomendado)

Use sempre com contexto de arquivo + pedido claro.

### Web - tela real
```text
#file:D:\restaurante-supabase\.github\agent-skills\skills\restaurante-supabase\SKILL.md
#file:.github/skills/ui-ux-pro-max/PROMPT.md
#file:restaurante-web/src/screens/DeliveryScreen.tsx

/ui-ux-pro-max melhorar a UX da DeliveryScreen para reduzir abandono no checkout mobile, mantendo regras de acessibilidade e sem quebrar fluxos atuais
```

### App - tela real
```text
#file:D:\restaurante-supabase\.github\agent-skills\skills\restaurante-supabase\SKILL.md
#file:.github/skills/ui-ux-pro-max/PROMPT.md
#file:restaurante-app/src/screens/NovoPedidoScreen.tsx

/ui-ux-pro-max redesenhar a NovoPedidoScreen para acelerar pedido de balcao com foco em toque, legibilidade e fluxo de 1 mao
```

## 2) Via terminal (scripts do workflow)

Executar na raiz do repositorio.

### Gerar recomendacao para web
```bash
python .github/skills/ui-ux-pro-max/scripts/search.py "restaurante-web DeliveryScreen checkout mobile-first para pedidos de entrega" --design-system -p "Restaurante Web Delivery" --format markdown
```

### Gerar recomendacao para app
```bash
python .github/skills/ui-ux-pro-max/scripts/search.py "restaurante-app NovoPedidoScreen fluxo rapido de balcao com usabilidade mobile" --design-system -p "Restaurante App Novo Pedido" --format markdown
```

### Persistir Design System (Master + Override)
```bash
python .github/skills/ui-ux-pro-max/scripts/search.py "restaurante-web DeliveryScreen checkout mobile-first" --design-system --persist --page "delivery-screen" -p "Restaurante Web Delivery"
```

## 3) Checklist de uso interno

- Sempre incluir `SKILL.md` do projeto no contexto antes do pedido de UI/UX.
- Para telas existentes, pedir melhoria incremental (evitar rewrite total sem necessidade).
- Exigir saida com: problema UX, proposta visual, impacto esperado, riscos e testes.
- Validar mobile e desktop quando for fluxo web.
- Validar acessibilidade (contraste, foco, alvos de toque, reduced-motion).

## 4) Modelo rapido para qualquer tela

```text
#file:D:\restaurante-supabase\.github\agent-skills\skills\restaurante-supabase\SKILL.md
#file:.github/skills/ui-ux-pro-max/PROMPT.md
#file:<caminho-da-tela>

/ui-ux-pro-max melhorar esta tela para <objetivo-de-negocio>, mantendo comportamento atual, com foco em <metrica/ux>, e entregar plano + componentes + criterios de aceite
```
